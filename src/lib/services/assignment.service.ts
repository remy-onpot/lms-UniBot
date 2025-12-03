import { supabase } from '@/lib/supabase';
import { extractTextFromPDF } from '@/lib/utils/pdf-utils';
import { AssignmentSubmission } from '@/types';

export const AssignmentService = {

  // 1. Create a new Assignment
  async create(courseId: string, data: { title: string; description: string; total_points: number; due_date: string }) {
    const { error } = await supabase
      .from('assignments')
      .insert([{ course_id: courseId, ...data }]);
    
    if (error) throw error;
  },

  // 2. Submit an Assignment (Handles Upload + AI Grading)
  async submit(
    assignmentId: string, 
    userId: string, 
    file: File, 
    assignmentDetails: { title: string; description: string; maxPoints: number }
  ) {
    // A. Check Attempts
    const { data: prev } = await supabase
      .from('assignment_submissions')
      .select('attempt_count')
      .eq('assignment_id', assignmentId)
      .eq('student_id', userId)
      .maybeSingle();
      
    const attempts = prev?.attempt_count || 0;
    if (attempts >= 2) throw new Error("Limit Reached: You have used all 2 attempts.");

    // B. Extract Text
    let text = "";
    if (file.type === 'application/pdf') {
      text = await extractTextFromPDF(file);
    } else {
      throw new Error("AI Grading only works with PDF files.");
    }

    if (!text || text.length < 50) {
      console.warn("Extracted text is too short or empty.");
    }

    // C. Upload File
    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    // Using a folder structure: course_id/assignments/user_id/timestamp_filename
    // Note: We don't have courseId passed here easily, so we use a general structure or pass it.
    // Ideally, pass courseId. For now, we use a generic path or the one you used before.
    const path = `assignments/${userId}/${Date.now()}_${cleanName}`;
    
    const { error: uploadError } = await supabase.storage
      .from('course-content')
      .upload(path, file);
      
    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('course-content')
      .getPublicUrl(path);

    // D. Call AI Grading API
    let aiResult = { score: 0, feedback: "Pending", is_ai_generated: false, breakdown: {} };
    
    if (text.length > 50) {
       const res = await fetch('/api/grade-assignment', { 
         method: 'POST', 
         body: JSON.stringify({ 
           assignmentTitle: assignmentDetails.title, 
           assignmentDescription: assignmentDetails.description, 
           studentText: text,
           maxPoints: assignmentDetails.maxPoints
         }) 
       });
       
       if (res.ok) {
           aiResult = await res.json();
       } else {
           console.error("AI Grading failed");
           // Fail gracefully, allow submission but mark feedback as pending
       }
    } else {
        aiResult.feedback = "Could not read document text (Scanned PDF?). Waiting for lecturer review.";
    }

    // E. Save Submission
    const { error: dbError } = await supabase.from('assignment_submissions').upsert({
      assignment_id: assignmentId, 
      student_id: userId, 
      file_url: publicUrl, 
      content_text: text, 
      ai_grade: aiResult.score, 
      ai_feedback: aiResult.feedback, 
      ai_is_detected: aiResult.is_ai_generated, 
      // @ts-ignore
      ai_breakdown: aiResult.breakdown, 
      attempt_count: attempts + 1
    }, { onConflict: 'assignment_id, student_id' });

    if (dbError) throw dbError;

    return aiResult;
  },

  // 3. Lecturer Override (Grade/Feedback)
  async updateGrade(submissionId: string, grade: number, feedback: string) {
    const { error } = await supabase
      .from('assignment_submissions')
      .update({ 
        lecturer_grade: grade, 
        lecturer_feedback: feedback 
      })
      .eq('id', submissionId);

    if (error) throw error;
  },

  // 4. Get Submissions for Lecturer View
  async getSubmissions(assignmentId: string) {
    const { data, error } = await supabase
      .from('assignment_submissions')
      .select('*, users(full_name, email)')
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data as AssignmentSubmission[];
  },

  // 5. Delete Assignment
  async delete(assignmentId: string) {
    const { error } = await supabase.from('assignments').delete().eq('id', assignmentId);
    if (error) throw error;
  }
};