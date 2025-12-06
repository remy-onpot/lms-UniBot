'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../../lib/supabase';
import { useParams, useRouter } from 'next/navigation';
import { getRouteParam } from '../../../../lib/route-utils';
import { PRICING } from '@/lib/constants';
import { logger } from '@/lib/logger';
import dynamic from 'next/dynamic';

// ✅ Dynamic Imports
const QuizLecturerView = dynamic(() => import('../../../../components/features/quiz/QuizLecturerView').then(mod => mod.QuizLecturerView), {
  loading: () => <div className="p-10 text-center text-gray-400">Loading Lecturer View...</div>
});
const QuizPlayer = dynamic(() => import('../../../../components/features/quiz/QuizPlayer').then(mod => mod.QuizPlayer), {
  ssr: false, // Player is interactive, no need for SSR
  loading: () => <div className="p-10 text-center text-gray-400">Loading Quiz Player...</div>
});
const QuizResultView = dynamic(() => import('../../../../components/features/quiz/QuizResultView').then(mod => mod.QuizResultView), {
  loading: () => <div className="p-10 text-center text-gray-400">Loading Results...</div>
});

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = getRouteParam(params, 'quizId');

  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (!quizId) {
      setError('Invalid quiz ID');
      setLoading(false);
      return;
    }
    fetchQuiz();
  }, [quizId, router]);

  const fetchQuiz = async () => {
    if (!quizId) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');
    setUserId(user.id);

    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    setRole(profile?.role);

    const { data: quizData, error: quizError } = await supabase
      .from('quizzes')
      .select('*, courses(classes(users(plan_tier)))')
      .eq('id', quizId)
      .single();

    if (quizError) {
      logger.error('Quiz fetch error:', quizError);
      setError('Quiz not found');
      setLoading(false);
      return;
    }

    const { data: questionsData, error: questionsError } = await supabase
      .from('questions')
      .select('*')
      .eq('quiz_id', quizId)
      .order('created_at', { ascending: true });

    if (questionsError) logger.error('Questions fetch error:', questionsError);

    setQuiz(quizData);
    setQuestions(questionsData || []);

    if (profile?.role === 'student') {
      const { data: existingResult } = await supabase
        .from('quiz_results')
        .select('score')
        .eq('quiz_id', quizId)
        .eq('student_id', user.id)
        .single();

      if (existingResult) {
        setHasAttempted(true);
        setPreviousScore(existingResult.score);
      }
      
      const ownerPlan = quizData?.courses?.classes?.users?.plan_tier;
      if (ownerPlan === 'cohort_manager') {
        const { data: access } = await supabase.from('student_course_access').select('id').eq('student_id', user.id).eq('course_id', quizData.course_id).maybeSingle();
        setHasAccess(!!access);
      } else {
        setHasAccess(true);
      }
    } else {
      setHasAccess(true);
    }

    setLoading(false);
  };

  const handleSubmit = async () => {
    if (role === 'lecturer') return alert('Lecturers cannot submit quiz answers!');
    if (hasAttempted) return alert('You have already completed this quiz!');

    let correctCount = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) correctCount++;
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);
    setScore(finalScore);
    setSubmitted(true);

    try {
      const { error } = await supabase.from('quiz_results').insert([{
        quiz_id: quizId,
        student_id: userId,
        score: finalScore,
        total_questions: questions.length,
        correct_answers: correctCount
      }]);

      if (error) {
        logger.error('Error saving result:', error);
        alert('Error saving your score: ' + error.message);
      }
    } catch (error: any) {
      logger.error('Error:', error);
      alert('Failed to save score');
    }
  };

  const handleUnlockResults = async () => {
    if(confirm(`Unlock Results for ₵${PRICING.QUIZ_RESULTS_UNLOCK}? (Simulated)`)) {
      const { error } = await supabase.from('student_course_access').insert({
        student_id: userId,
        course_id: quiz.course_id,
        access_type: 'trial'
      });
      
      if (error) alert("Error: " + error.message);
      else {
        alert("Unlocked!");
        setHasAccess(true);
      }
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-red-200">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button onClick={() => router.back()} className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700">← Back</button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) return <div className="p-10 text-center">Loading Quiz...</div>;

  // 1. LECTURER VIEW
  if (role === 'lecturer') {
    return <QuizLecturerView quiz={quiz} questions={questions} onBack={() => router.back()} />;
  }

  // 2. RESULTS VIEW
  if (hasAttempted || submitted) {
    const displayScore = submitted ? score : (previousScore || 0);
    return (
        <QuizResultView 
            score={displayScore} 
            hasAccess={hasAccess} 
            courseId={quiz.course_id} 
            onUnlock={handleUnlockResults} 
        />
    );
  }

  // 3. PLAYER VIEW
  return (
    <QuizPlayer 
      quiz={quiz} 
      questions={questions} 
      answers={answers} 
      onAnswer={(qId, val) => setAnswers(prev => ({...prev, [qId]: val}))}
      onSubmit={handleSubmit}
      onBack={() => router.back()}
    />
  );
}