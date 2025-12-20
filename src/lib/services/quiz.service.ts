import { createClient } from '@/lib/supabase/server';
import { Quiz, Question, QuizResult } from '@/types';

export class QuizService {
  
  /**
   * Fetch a full quiz with questions (for taking the quiz)
   */
  static async getQuizById(quizId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('quizzes')
      .select(`
        *,
        questions (*)
      `)
      .eq('id', quizId)
      .single();

    if (error) throw error;
    return data as Quiz;
  }

  /**
   * Submit a quiz attempt and calculate score
   */
  static async submitQuiz(quizId: string, studentId: string, answers: Record<string, string>) {
    const supabase = await createClient();

    // 1. Fetch correct answers (Server-side validation)
    const { data: questions, error: qError } = await supabase
      .from('questions')
      .select('id, correct_answer')
      .eq('quiz_id', quizId);

    if (qError) throw qError;

    // 2. Calculate Score
    let correctCount = 0;
    questions.forEach(q => {
      if (answers[q.id] === q.correct_answer) {
        correctCount++;
      }
    });

    const score = Math.round((correctCount / questions.length) * 100);

    // 3. Save Result
    const { data: result, error: saveError } = await supabase
      .from('quiz_results')
      .insert({
        quiz_id: quizId,
        student_id: studentId,
        score: score,
        correct_answers: correctCount,
        total_questions: questions.length,
        student_answers: answers, // Store JSON of their answers
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (saveError) throw saveError;
    return result;
  }

  /**
   * Create a generated quiz (from AI or Manual)
   */
  static async createQuiz(data: {
    courseId: string;
    title: string;
    topic?: string;
    questions: {
      question_text: string;
      options: string[];
      correct_answer: string;
      explanation?: string;
    }[];
  }) {
    const supabase = await createClient();

    // 1. Create Quiz Header
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert({
        course_id: data.courseId,
        title: data.title,
        topic: data.topic
      })
      .select()
      .single();

    if (quizError) throw quizError;

    // 2. Create Questions
    const questionsToInsert = data.questions.map(q => ({
      quiz_id: quiz.id,
      question_text: q.question_text,
      options: q.options, // Stored as JSONB
      correct_answer: q.correct_answer,
      explanation: q.explanation
    }));

    const { error: questionsError } = await supabase
      .from('questions')
      .insert(questionsToInsert);

    if (questionsError) throw questionsError;

    return quiz;
  }

  /**
   * Get results for a quiz (Lecturer Gradebook)
   */
  static async getQuizResults(quizId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('quiz_results')
      .select(`
        *,
        student:users(full_name, email, student_id_code)
      `)
      .eq('quiz_id', quizId)
      .order('score', { ascending: false });

    if (error) throw error;
    return data;
  }
}