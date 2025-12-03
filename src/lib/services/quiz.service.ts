import { supabase } from '../supabase'; // ✅ Fixed relative path
import { Quiz, Question, QuizResult } from '../../types'; // ✅ Fixed relative path

export const QuizService = {
  
  async getById(quizId: string) {
    // Fetches quiz + nested course/class info for permission checks
    const { data, error } = await supabase
      .from('quizzes')
      .select('*, courses(id, classes(users(plan_tier)))') 
      .eq('id', quizId)
      .single();

    if (error) throw error;
    return data as Quiz;
  },

  async getQuestions(quizId: string) {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data as Question[];
  },

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

  async checkAccess(userId: string, courseId: string) {
    const { data } = await supabase
      .from('student_course_access')
      .select('id')
      .eq('student_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    
    return !!data;
  },

  async submitAttempt(quizId: string, userId: string, score: number, total: number, correct: number) {
    const { error } = await supabase.from('quiz_results').insert([{
      quiz_id: quizId,
      student_id: userId,
      score: score,
      total_questions: total,
      correct_answers: correct
    }]);

    if (error) throw error;
  },

  async unlockResults(userId: string, courseId: string) {
    const { error } = await supabase.from('student_course_access').insert({
      student_id: userId,
      course_id: courseId,
      access_type: 'trial'
    });
    
    if (error) throw error;
  },

  // For Gradebook
  async getGradebook(quizId: string) {
    const { data, error } = await supabase
      .from('quiz_results')
      .select(`
        *,
        users ( email, full_name )
      `)
      .eq('quiz_id', quizId)
      .order('submitted_at', { ascending: false });

    if (error) throw error;
    return data as QuizResult[];
  }
};