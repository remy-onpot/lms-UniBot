'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase'; // Auth only
import { useParams, useRouter } from 'next/navigation';
import { getRouteParam } from '@/lib/route-utils';
import { QuizService } from '@/lib/services/quiz.service';
import { Quiz, Question } from '@/types';
import { QuizLecturerView } from '@/components/features/quiz/QuizLecturerView';
import { QuizPlayer } from '@/components/features/quiz/QuizPlayer';
import { QuizResultView } from '@/components/features/quiz/QuizResultView';

export default function QuizPage() {
  const params = useParams();
  const router = useRouter();
  const quizId = getRouteParam(params, 'quizId');

  // --- STATE ---
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // User Context
  const [role, setRole] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Student State
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [hasAttempted, setHasAttempted] = useState(false);
  const [previousScore, setPreviousScore] = useState<number | null>(null);
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    if (quizId) initQuiz();
  }, [quizId]);

  const initQuiz = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      setUserId(user.id);

      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      setRole(profile?.role || 'student');

      // 1. Fetch Quiz & Questions via Service
      const quizData = await QuizService.getById(quizId!);
      setQuiz(quizData);
      
      const questionsData = await QuizService.getQuestions(quizId!);
      setQuestions(questionsData);

      // 2. Student Logic
      if (profile?.role === 'student') {
        // Check previous attempt
        const result = await QuizService.getUserResult(quizId!, user.id);
        if (result) {
          setHasAttempted(true);
          setPreviousScore(result.score);
        }

        // Check Paywall Access
        // Logic: If owner is 'cohort_manager' (Rep), check database. Otherwise free.
        // @ts-ignore
        const ownerPlan = quizData?.courses?.classes?.users?.plan_tier;
        
        if (ownerPlan === 'cohort_manager') {
          const hasPaid = await QuizService.checkAccess(user.id, quizData.course_id);
          setHasAccess(hasPaid);
        } else {
          setHasAccess(true); // Free for standard lecturers
        }
      } else {
        setHasAccess(true); // Lecturers/Admins always have access
      }

    } catch (err: any) {
      console.error(err);
      setError("Failed to load quiz.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (role === 'lecturer') return alert('Lecturers cannot submit!');
    if (hasAttempted) return alert('Already completed!');
    if (!quiz || !userId) return;

    let correctCount = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) correctCount++;
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);
    setScore(finalScore);
    setSubmitted(true);

    try {
      await QuizService.submitAttempt(quiz.id, userId, finalScore, questions.length, correctCount);
    } catch (err: any) {
      alert("Error saving score: " + err.message);
    }
  };

  const handleUnlockResults = async () => {
    if(!quiz || !userId) return;
    if(confirm(`Unlock Results for ₵15? (Simulated)`)) {
      try {
        await QuizService.unlockResults(userId, quiz.course_id);
        setHasAccess(true);
        alert("Unlocked!");
      } catch (err: any) {
        alert("Payment Error: " + err.message);
      }
    }
  };

  if (error) return <div className="p-10 text-center text-red-500 font-bold">{error}</div>;
  if (loading || !quiz) return <div className="p-10 text-center">Loading Quiz...</div>;

  // 1. LECTURER VIEW
  if (role === 'lecturer') {
    return <QuizLecturerView quiz={quiz} questions={questions} onBack={() => router.back()} />;
  }

  // 2. RESULTS VIEW (Already attempted or just submitted)
  if (hasAttempted || submitted) {
    const displayScore = submitted ? score : (previousScore || 0);
    return <QuizResultView score={displayScore} hasAccess={hasAccess} courseId={quiz.course_id} onUnlock={handleUnlockResults} />;
  }

  // 3. STUDENT PLAYER VIEW
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