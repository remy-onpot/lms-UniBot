import { supabase } from '../supabase';
import { Assignment, AssignmentSubmission } from '../../types';

export const AssignmentService = {
  
  async create(courseId: string, data: { title: string; description: string; total_points: number; due_date: string }) {
    const { error } = await supabase.from('assignments').insert([{
      course_id: courseId,
      ...data
    }]);
    if (error) throw error;
  },

  async getByCourse(courseId: string) {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId)
      .order('due_date');
    
    if (error) throw error;
    return data as Assignment[];
  },

  async submit(assignmentId: string, studentId: string, file: File, meta: { title: string; description: string; maxPoints: number }) {
    // 1. Upload File
    const path = `submissions/${assignmentId}/${studentId}_${Date.now()}.pdf`;
    const { error: uploadError } = await supabase.storage.from('assignment-submissions').upload(path, file);
    if (uploadError) throw uploadError;
    
    const { data: { publicUrl } } = supabase.storage.from('assignment-submissions').getPublicUrl(path);

    // 2. AI Grading (Mock for now)
    const mockScore = Math.floor(Math.random() * (meta.maxPoints - 60 + 1) + 60);

    // 3. Save Record
    const { data, error } = await supabase.from('assignment_submissions').insert([{
      assignment_id: assignmentId,
      student_id: studentId,
      file_url: publicUrl,
      score: mockScore,
      feedback: "Good effort! This is an AI-generated provisional grade.",
      status: 'graded'
    }]).select().single();

    if (error) throw error;
    return data;
  },

  // ✅ UPDATED: Fetches university_id for the Export
  async getSubmissions(assignmentId: string) {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('*, student:users(full_name, email, avatar_url, university_id)')
      .eq('assignment_id', assignmentId);
      
    if (error) throw error;
    return data as AssignmentSubmission[];
  },

  // ✅ NEW: Fetches Matrix Data for Excel Export
  async getCourseGradebook(courseId: string) {
    // 1. Get all assignments
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id, title, total_points')
      .eq('course_id', courseId)
      .order('due_date');

    if (!assignments || assignments.length === 0) return { assignments: [], submissions: [] };

    // 2. Get all submissions for these assignments
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select(`
        *, 
        student:users(id, full_name, university_id, email)
      `)
      .in('assignment_id', assignments.map(a => a.id));

    return { 
      assignments, 
      submissions: submissions || [] 
    };
  },

  async delete(assignmentId: string) {
    // 1. Clean up storage
    const { data: submissions } = await supabase
      .from('assignment_submissions')
      .select('file_url')
      .eq('assignment_id', assignmentId);

    if (submissions && submissions.length > 0) {
      const filesToRemove = submissions
        .map(sub => {
           if (!sub.file_url) return null;
           try {
             const parts = sub.file_url.split('/assignment-submissions/');
             return parts.length > 1 ? parts[1] : null;
           } catch (e) { return null; }
        })
        .filter(path => path !== null) as string[];

      if (filesToRemove.length > 0) {
        await supabase.storage.from('assignment-submissions').remove(filesToRemove);
      }
    }

    // 2. Delete Record
    const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
    if (error) throw error;
  },
};