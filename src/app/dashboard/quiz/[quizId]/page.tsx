'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useRouter } from 'next/navigation';

export default function QuizPage() {
  const params = useParams();
  const quizId = params?.quizId as string; 
  const router = useRouter();

  console.log('🔍 Quiz params:', params);
  console.log('🔍 Quiz ID:', quizId);

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
  
  // --- ACCESS STATE ---
  const [hasAccess, setHasAccess] = useState(false);

  useEffect(() => {
    const fetchQuiz = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      
      setUserId(user.id);

      // Get user role
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
      
      setRole(profile?.role);

      // Fetch quiz and questions
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*, courses(classes(users(plan_tier)))') // Fetch nested plan info
        .eq('id', quizId)
        .single();

      console.log('📝 Quiz data:', { quizData, quizError });

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('quiz_id', quizId)
        .order('created_at', { ascending: true });

      console.log('❓ Questions data:', { questionsData, questionsError, count: questionsData?.length });

      setQuiz(quizData);
      setQuestions(questionsData || []);

      // Check if student has already attempted this quiz
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
        
        // CHECK ACCESS
        // Logic: If owner is cohort_manager, check DB. Else free.
        const ownerPlan = quizData?.courses?.classes?.users?.plan_tier;
        
        if (ownerPlan === 'cohort_manager') {
            const { data: access } = await supabase
                .from('student_course_access')
                .select('id')
                .eq('student_id', user.id)
                .eq('course_id', quizData.course_id)
                .maybeSingle();
            setHasAccess(!!access);
        } else {
            setHasAccess(true);
        }

      } else {
          setHasAccess(true); // Lecturers always have access
      }

      setLoading(false);
    };

    fetchQuiz();
  }, [quizId, router]);

  const handleSubmit = async () => {
    if (role === 'lecturer') {
      alert('Lecturers cannot submit quiz answers!');
      return;
    }

    if (hasAttempted) {
      alert('You have already completed this quiz!');
      return;
    }

    let correctCount = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) correctCount++;
    });

    const finalScore = Math.round((correctCount / questions.length) * 100);
    setScore(finalScore);
    setSubmitted(true);

    // Save result to database
    try {
      const { error } = await supabase.from('quiz_results').insert([{
        quiz_id: quizId,
        student_id: userId,
        score: finalScore,
        total_questions: questions.length,
        correct_answers: correctCount
      }]);

      if (error) {
        console.error('Error saving result:', error);
        alert('Error saving your score: ' + error.message);
      }
    } catch (error: any) {
      console.error('Error:', error);
      alert('Failed to save score');
    }
  };

  // --- PAYMENT HANDLER (For Quiz Page Modal) ---
  const handleUnlockResults = async () => {
      if(confirm(`Unlock Results for ₵15? (Simulated)`)) {
          const { error } = await supabase.from('student_course_access').insert({
              student_id: userId,
              course_id: quiz.course_id,
              access_type: 'trial'
          });
          
          if (error) {
              alert("Error: " + error.message);
          } else {
              alert("Unlocked!");
              setHasAccess(true);
          }
      }
  };

  if (loading) return <div className="p-10 text-center">Loading Quiz...</div>;

  // LECTURER VIEW - Show all questions with answers
  if (role === 'lecturer') {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => router.back()}
            className="mb-4 text-sm text-gray-500 hover:text-gray-900"
          >
            ← Back
          </button>

          <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{quiz?.title}</h1>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-xs font-bold rounded">
                LECTURER VIEW
              </span>
            </div>
            <p className="text-gray-600">Topic: {quiz?.topic}</p>
            <p className="text-sm text-gray-500 mt-2">
              Total Questions: {questions.length}
            </p>
          </div>

          <div className="space-y-6">
            {questions.map((q, index) => (
              <div key={q.id} className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                <h3 className="font-bold text-gray-900 mb-4">
                  Question {index + 1}: {q.question_text}
                </h3>

                <div className="space-y-3 mb-4">
                  {q.options.map((option: string, i: number) => (
                    <div
                      key={i}
                      className={`p-3 rounded-lg border-2 ${
                        option === q.correct_answer
                          ? 'border-green-500 bg-green-50'
                          : 'border-gray-200 bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-gray-800">{option}</span>
                        {option === q.correct_answer && (
                          <span className="text-green-600 font-bold text-sm">✓ CORRECT</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {q.explanation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-xs font-bold text-blue-900 mb-1">EXPLANATION:</p>
                    <p className="text-sm text-blue-800">{q.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // STUDENT VIEW - Already attempted OR Submitted
  if (hasAttempted || submitted) {
      
    // 🔒 LOCKED VIEW (No Payment)
    if (!hasAccess) {
        return (
          <div className="min-h-screen bg-gray-50 p-8">
            <div className="mx-auto max-w-2xl">
              <div className="bg-white rounded-xl shadow-lg p-8 text-center border border-orange-200">
                <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-4xl">🔒</span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Quiz Submitted!</h1>
                <p className="text-gray-500 mb-6">
                  Your answers have been recorded and sent to your lecturer.
                </p>
                
                <div className="bg-gray-50 p-6 rounded-xl mb-6 relative overflow-hidden group cursor-pointer" onClick={handleUnlockResults}>
                  <div className="filter blur-sm select-none opacity-50 transition duration-300 group-hover:opacity-40">
                    <p className="text-sm text-gray-400 font-bold mb-2">Your Score</p>
                    <p className="text-4xl font-bold text-gray-800">85%</p>
                    <p className="mt-2 text-gray-500">Great job! You mastered the concepts of...</p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-white/90 p-4 rounded-lg shadow-lg text-center transform transition hover:scale-105">
                      <p className="font-bold text-gray-800 mb-2 text-sm">Score Hidden</p>
                      <button 
                        className="px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 shadow-lg"
                      >
                        Unlock Results (₵15)
                      </button>
                    </div>
                  </div>
                </div>
                
                <button onClick={() => router.push(`/dashboard/courses/${quiz.course_id}`)} className="text-gray-500 text-sm hover:text-gray-800 font-medium">
                    ← Back to Course
                </button>
              </div>
            </div>
          </div>
        );
    }

    // ✅ UNLOCKED VIEW (Paid)
    const displayScore = submitted ? score : previousScore;
    
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-2xl">
          <div className="bg-white rounded-xl shadow-lg p-8 text-center">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 ${
              (displayScore || 0) >= 70 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <span className="text-4xl">{(displayScore || 0) >= 70 ? '🎉' : '📚'}</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Quiz Complete!</h1>
            <p className="text-gray-600 mb-6">
              {(displayScore || 0) >= 70 ? 'Great job!' : 'Keep studying!'}
            </p>
            <div className={`border rounded-lg p-6 mb-6 ${
              (displayScore || 0) >= 70 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
            }`}>
              <p className={`text-sm font-bold mb-2 ${
                (displayScore || 0) >= 70 ? 'text-green-900' : 'text-red-900'
              }`}>Your Score</p>
              <p className={`text-4xl font-bold ${
                (displayScore || 0) >= 70 ? 'text-green-700' : 'text-red-700'
              }`}>{displayScore}%</p>
            </div>
            <button
              onClick={() => router.back()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
            >
              Back to Course
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STUDENT VIEW - Taking quiz
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <button
          onClick={() => router.back()}
          className="mb-4 text-sm text-gray-500 hover:text-gray-900"
        >
          ← Back
        </button>

        <div className="bg-white rounded-xl shadow-sm p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{quiz?.title}</h1>
          <p className="text-gray-600">Topic: {quiz?.topic}</p>
          <p className="text-sm text-gray-500 mt-2">
            Answer all questions and submit when ready
          </p>
        </div>

        <div className="space-y-6 mb-8">
          {questions.map((q, index) => (
            <div key={q.id} className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="font-bold text-gray-900 mb-4">
                Question {index + 1}: {q.question_text}
              </h3>

              <div className="space-y-3">
                {q.options.map((option: string, i: number) => (
                  <label
                    key={i}
                    className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition ${
                      answers[q.id] === option
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${q.id}`}
                      value={option}
                      checked={answers[q.id] === option}
                      onChange={() => setAnswers({ ...answers, [q.id]: option })}
                      className="mr-3"
                    />
                    <span className="text-gray-800">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length !== questions.length}
            className="px-8 py-3 bg-orange-600 text-white rounded-lg font-bold hover:bg-orange-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            Submit Quiz
          </button>
        </div>
      </div>
    </div>
  );
}