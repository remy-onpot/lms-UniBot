import { supabase } from '../supabase'; 
import { Quiz, Question, QuizResult, PublicQuestion } from '../../types'; 
import { GamificationService } from './gamification.service';

export const QuizService = {
  
  /**
   * Fetch Quiz Details (Title, Topic, etc.)
   */
  async getById(quizId: string) {
    const { data, error } = await supabase
      .from('quizzes')
      .select('*, courses(id, classes(users(plan_tier)))') 
      .eq('id', quizId)
      .single();

    if (error) throw error;
    return data as Quiz;
  },

  /**
   * 🛡️ SECURE: Fetches questions WITHOUT the correct answers.
   * Returns 'PublicQuestion[]' to prevent cheating via Network Tab.
   */
  async getQuestions(quizId: string) {
    const { data, error } = await supabase
      .from('questions')
      .select('id, quiz_id, question_text, options, type') 
      // ❌ Exclude 'correct_answer'
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as PublicQuestion[];
  },

  /**
   * Fetch a student's past attempt
   */
  async getUserResult(quizId: string, userId: string) {
    const { data, error } = await supabase
      .from('quiz_results')
      .select('*')
      .eq('quiz_id', quizId)
      .eq('student_id', userId)
      .maybeSingle();

    if (error) throw error;
    return data as QuizResult | null;
  },

  /**
   * 🔐 HYBRID ACCESS CHECK
   * Returns TRUE if student has Active Bundle OR Single Course Access
   */
  async checkAccess(userId: string, courseId: string) {
    const now = new Date().toISOString();

    // 1. Get Class ID (Required for Bundle Check)
    const { data: course } = await supabase
        .from('courses')
        .select('class_id')
        .eq('id', courseId)
        .single();
        
    if (!course) return false;

    // 2. CHECK BUNDLE (Super Access)
    // "Does this student own the semester bundle for this class?"
    const { data: bundle } = await supabase
      .from('class_enrollments')
      .select('id')
      .eq('student_id', userId)
      .eq('class_id', course.class_id)
      .eq('access_type', 'semester_bundle') 
      .eq('has_paid', true)
      .gt('expires_at', now)
      .maybeSingle();

    if (bundle) return true;

    // 3. CHECK SINGLE COURSE (Granular Access)
    // "Does this student own just this specific course?"
    const { data: single } = await supabase
      .from('student_course_access')
      .select('id')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .gt('expires_at', now)
      .maybeSingle();

    return !!single;
  },

  /**
   * 🚀 SECURE SUBMISSION
   * Sends answers to Server API for grading. Client NEVER calculates score.
   */
  async submitAttempt(quizId: string, userId: string, answers: Record<string, string>) {
    // Call the Secure API Route
    const response = await fetch('/api/submit-quiz', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId, answers })
    });

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Quiz submission failed");
    }
    
    // Returns: { score, feedback, resultId }
    const result = await response.json(); 

    // Optional: Trigger Gamification (Fire & Forget)
    GamificationService.recordActivity(userId, 'course_quiz', result.correctCount, result.totalQuestions)
        .catch(e => console.error("Gamification Error:", e));

    return result;
  },

  /**
   * Grant 24h/Trial access to results (e.g. "Pay to View Results")
   */
  async unlockResults(userId: string, courseId: string) {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7); // 7 Day Access

    const { error } = await supabase.from('student_course_access').upsert({
      student_id: userId,
      course_id: courseId,
      expires_at: expiry.toISOString()
    }, { onConflict: 'student_id, course_id' });
    
    if (error) throw error;
  },

  /**
   * For Lecturer Gradebook View
   */
  async getGradebook(quizId: string) {
    const { data, error } = await supabase
      .from('quiz_results')
      .select(`
        *,
        users ( email, full_name, avatar_url )
      `)
      .eq('quiz_id', quizId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data as QuizResult[];
  }
};