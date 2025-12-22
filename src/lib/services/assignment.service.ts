import { AssignmentSubmission } from '@/types';
import { Database } from '@/types/database.types';
import type { SupabaseClient } from '@supabase/supabase-js';

type DbSubmission = Database['public']['Tables']['assignment_submissions']['Row'];

export class AssignmentService {
  
  constructor(private supabase: SupabaseClient<Database>) {}

  // 🛡️ MAPPER (Private helper)
  private mapSubmission(row: DbSubmission): AssignmentSubmission {
    return {
      id: row.id,
      assignment_id: row.assignment_id,
      student_id: row.student_id,
      content_text: row.content_text || undefined, 
      file_url: row.file_url || undefined,
      score: row.score,
      feedback: row.feedback,
      status: (row.status as AssignmentSubmission['status']) || 'pending_grading',
      submitted_at: row.submitted_at || new Date().toISOString(),
      graded_by: (row.graded_by as 'lecturer' | 'ai') || null,
      ai_breakdown: row.ai_breakdown
    };
  }

  // ==========================================
  // 1. ASSIGNMENT MANAGEMENT
  // ==========================================

  /**
   * Creates a new assignment.
   */
  async createAssignment(assignmentData: {
    course_id: string;
    title: string;
    description: string;
    total_points: number;
    due_date: string;
    grading_config?: any;
  }) {
    const { data, error } = await this.supabase
      .from('assignments')
      .insert(assignmentData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Deletes an assignment.
   */
  async delete(assignmentId: string) {
    const { error } = await this.supabase.from('assignments').delete().eq('id', assignmentId);
    if (error) throw error;
  }

  // ==========================================
  // 2. DATA FETCHING (Gradebook & Lists)
  // ==========================================

  async getCourseAssignments(courseId: string) {
    const { data, error } = await this.supabase
      .from('assignments')
      .select('*')
      .eq('course_id', courseId)
      .order('due_date', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getCourseGradebook(courseId: string) {
    // 1. Get Assignments
    const { data: assignments, error: assignError } = await this.supabase
      .from('assignments')
      .select('id, title, total_points, due_date')
      .eq('course_id', courseId)
      .order('due_date', { ascending: true });

    if (assignError) throw assignError;

    if (!assignments || assignments.length === 0) {
      return { assignments: [], submissions: [] };
    }

    // 2. Get Submissions for these assignments
    const assignmentIds = assignments.map(a => a.id);
    const { data: submissions, error: subError } = await this.supabase
      .from('assignment_submissions')
      .select(`
        *,
        student:users (
          id, full_name, email, avatar_url
        )
      `)
      .in('assignment_id', assignmentIds);

    if (subError) throw subError;

    return { assignments, submissions: submissions || [] };
  }

  // ==========================================
  // 3. SUBMISSION HANDLING
  // ==========================================

  async submitAssignment(data: {
    assignmentId: string;
    studentId: string;
    contentText?: string;
    fileUrl?: string;
  }) {
    if (!data.contentText && !data.fileUrl) {
        throw new Error('Submission must contain either text or a file.');
    }

    // Validate Enrollment
    const { data: assignment, error: fetchError } = await this.supabase
      .from('assignments')
      .select('course_id, courses(class_id)')
      .eq('id', data.assignmentId)
      .single();

    if (fetchError || !assignment) throw new Error('Assignment not found');

    const classId = (assignment.courses as any)?.class_id;

    if (classId) {
      const { data: enrollment } = await this.supabase
        .from('class_enrollments')
        .select('status')
        .eq('class_id', classId)
        .eq('student_id', data.studentId)
        .eq('status', 'approved')
        .single();

      if (!enrollment) throw new Error('You are not enrolled in this class');
    }

    // Upsert Submission
    const { data: submission, error } = await this.supabase
      .from('assignment_submissions')
      .upsert({
        assignment_id: data.assignmentId,
        student_id: data.studentId,
        content_text: data.contentText || null,
        file_url: data.fileUrl || null,
        status: 'pending_grading',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;
    return this.mapSubmission(submission);
  }

  async gradeSubmission(submissionId: string, gradeData: {
    score: number;
    feedback: string;
    gradedBy: 'lecturer' | 'ai';
    aiBreakdown?: any;
  }) {
    const { data, error } = await this.supabase
      .from('assignment_submissions')
      .update({
        score: gradeData.score,
        feedback: gradeData.feedback,
        graded_by: gradeData.gradedBy,
        ai_breakdown: gradeData.aiBreakdown || null,
        status: 'graded'
      })
      .eq('id', submissionId)
      .select()
      .single();

    if (error) throw error;
    return this.mapSubmission(data);
  }

  async getSubmissions(assignmentId: string) {
    const { data, error } = await this.supabase
      .from('assignment_submissions')
      .select(`
        *,
        student:users(full_name, email, avatar_url, student_id_code)
      `)
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    
    return data.map(row => ({
      ...this.mapSubmission(row),
      student: row.student
    }));
  }

  async getSubmission(submissionId: string) {
    const { data, error } = await this.supabase
      .from('assignment_submissions')
      .select('*')
      .eq('id', submissionId)
      .single();
      
    if (error) throw error;
    return this.mapSubmission(data);
  }
}