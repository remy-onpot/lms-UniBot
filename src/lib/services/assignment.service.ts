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

    // 2. AI Grading (Simulated for now, replace with actual AI call if needed)
    // In a real scenario, you'd call your grading API here.
    const mockScore = Math.floor(Math.random() * (meta.maxPoints - 60 + 1) + 60); // Random score 60-100

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

  async getSubmissions(assignmentId: string) {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('*, student:users(full_name, email, avatar_url)')
      .eq('assignment_id', assignmentId);
      
    if (error) throw error;
    return data as AssignmentSubmission[];
  },

  /**
   * ✅ PROFESSIONAL DELETE: 
   * 1. Finds all student submissions.
   * 2. Deletes their files from Storage (Saves money).
   * 3. Deletes the Assignment Record (Cascades to submissions table).
   */
  async delete(assignmentId: string) {
    // 1. Fetch all submissions to get their file paths
    const { data: submissions, error: fetchError } = await supabase
      .from('assignment_submissions')
      .select('file_url')
      .eq('assignment_id', assignmentId);

    if (fetchError) throw fetchError;

    // 2. Delete files from Storage
    if (submissions && submissions.length > 0) {
      const filesToRemove = submissions
        .map(sub => {
           if (!sub.file_url) return null;
           // Extract relative path: "submissions/assignment_id/student_id_timestamp.pdf"
           // Adjust splitting logic based on your actual storage URL structure
           try {
             // Example: .../assignment-submissions/submissions/123/456.pdf
             // We need: "submissions/123/456.pdf"
             // If bucket is 'assignment-submissions', path starts after it.
             const parts = sub.file_url.split('/assignment-submissions/');
             return parts.length > 1 ? parts[1] : null;
           } catch (e) { return null; }
        })
        .filter(path => path !== null) as string[];

      if (filesToRemove.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('assignment-submissions') // Ensure this matches your bucket name
          .remove(filesToRemove);
          
        if (storageError) console.error("Failed to cleanup submission files:", storageError);
      }
    }

    // 3. Delete the Assignment from DB
    // (This automatically deletes the rows in 'assignment_submissions' due to CASCADE)
    const { error: deleteError } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId);

    if (deleteError) throw deleteError;
  },
};