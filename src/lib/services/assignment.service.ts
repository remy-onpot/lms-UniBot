import { supabase } from '../supabase';
import { Assignment, AssignmentSubmission } from '../../types';

export const AssignmentService = {
  
  // --- READ METHODS ---

  async getByCourse(courseId: string) {
    const { data, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId)
      .order('due_date');
    
    if (error) throw error;
    return data as Assignment[];
  },

  async getMySubmission(assignmentId: string, studentId: string) {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', studentId)
      .maybeSingle();

    if (error) throw error;
    return data as AssignmentSubmission | null;
  },

  async getGradebook(courseId: string) {
     // 1. Get assignments
     const { data: assignments } = await supabase
       .from('assignments')
       .select('id, title, total_points')
       .eq('course_id', courseId)
       .order('due_date');

     if (!assignments?.length) return { assignments: [], submissions: [] };

     // 2. Get submissions
     const { data: submissions } = await supabase
       .from('assignment_submissions')
       .select(`*, student:users(id, full_name, email, university_id)`)
       .in('assignment_id', assignments.map(a => a.id));

     return { assignments, submissions: submissions || [] };
  },

  // --- WRITE METHODS (Secure) ---

  async create(courseId: string, data: { title: string; description: string; total_points: number; due_date: string }) {
    const { error } = await supabase.from('assignments').insert([{
      course_id: courseId,
      ...data
    }]);
    if (error) throw error;
  },

  async submit(assignmentId: string, studentId: string, file: File) {
    // 1. Upload File to Storage
    const fileExt = file.name.split('.').pop();
    const filePath = `${assignmentId}/${studentId}_${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('assignment-submissions')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('assignment-submissions')
      .getPublicUrl(filePath);

    // 2. Create Record (Status: PENDING)
    const { data, error } = await supabase
      .from('assignment_submissions')
      .insert({
        assignment_id: assignmentId,
        student_id: studentId,
        file_url: publicUrl,
        status: 'pending_grading', // UI shows "Grading in progress..."
        score: null,
        feedback: null,
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    // 3. Trigger AI Grading (Fire & Forget)
    // We don't wait for this to finish. The UI will poll or user checks back later.
    fetch('/api/grade-assignment', {
      method: 'POST',
      body: JSON.stringify({ 
          submissionId: data.id, 
          fileUrl: publicUrl, 
          assignmentId 
      }),
      headers: { 'Content-Type': 'application/json' }
    }).catch(err => console.error("Grading trigger failed:", err));

    return data;
  },

  async delete(assignmentId: string) {
     // Optional: cleanup storage logic here if needed
     const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
     if (error) throw error;
  }
};