import { createClient } from '@/lib/supabase/server';
import { Assignment, AssignmentSubmission } from '@/types';

export class AssignmentService {
  
  static async submitAssignment(data: {
    assignmentId: string;
    studentId: string;
    contentText?: string;
    fileUrl?: string;
  }) {
    const supabase = await createClient();

    // 1. Validate Enrollment
    const { data: assignment, error: fetchError } = await supabase
      .from('assignments')
      .select('course_id, courses(class_id)')
      .eq('id', data.assignmentId)
      .single();

    if (fetchError || !assignment) throw new Error('Assignment not found');

    const classId = (assignment.courses as any)?.class_id;

    if (classId) {
      const { data: enrollment } = await supabase
        .from('class_enrollments')
        .select('status')
        .eq('class_id', classId)
        .eq('student_id', data.studentId)
        .eq('status', 'approved')
        .single();

      if (!enrollment) throw new Error('You are not enrolled in this class');
    }

    // 2. Upsert Submission
    const { data: submission, error } = await supabase
      .from('assignment_submissions')
      .upsert({
        assignment_id: data.assignmentId,
        student_id: data.studentId,
        content_text: data.contentText,
        file_url: data.fileUrl,
        status: 'pending_grading',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return submission as AssignmentSubmission;
  }

  static async gradeSubmission(submissionId: string, gradeData: {
    score: number;
    feedback: string;
    gradedBy: 'lecturer' | 'ai';
    aiBreakdown?: any;
  }) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('assignment_submissions')
      .update({
        score: gradeData.score,
        feedback: gradeData.feedback,
        // graded_by: gradeData.gradedBy, // Ensure this column exists in DB or map it
        // ai_breakdown: gradeData.aiBreakdown, // Ensure this column exists in DB or map it
        status: 'graded'
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  static async getSubmissions(assignmentId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('assignment_submissions')
      .select(`
        *,
        student:users(full_name, email, avatar_url, student_id_code)
      `)
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  static async getSubmission(submissionId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();
      
    if (error) throw error;
    return data as AssignmentSubmission;
  }

  static async delete(assignmentId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
    if (error) throw error;
  }
}