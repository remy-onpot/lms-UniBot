'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { GamificationService } from '@/lib/services/gamification.service';
import { motion, AnimatePresence } from 'framer-motion';

export default function DailyQuizPage() {
  const router = useRouter();
  const [step, setStep] = useState<'intro' | 'loading' | 'quiz' | 'result'>('intro');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [streakResult, setStreakResult] = useState<any>(null);

  // 1. Generate the "Daily Workout"
  // Real implementation would fetch topics from the user's enrolled courses via CourseService
  // and then ask Gemini to generate questions based on those specific topics.
  // For this demo, we simulate the AI generation connection.
  const startDailyWorkout = async () => {
    setStep('loading');
    
    try {
      // Mocking AI generation latency
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In a real scenario, fetch this from /api/generate-quiz using a random topic from user's courses
      const mockQuestions = [
         { id: 1, text: "What is the primary function of mitochondria?", options: ["Energy production", "Protein synthesis", "Waste disposal", "Cell division"], answer: "Energy production" },
         { id: 2, text: "In programming, what does DRY stand for?", options: ["Don't Repeat Yourself", "Do Run Yearly", "Data Role Yield", "Document Rational Yield"], answer: "Don't Repeat Yourself" },
         { id: 3, text: "Which sorting algorithm has the best average case time complexity?", options: ["Merge Sort", "Bubble Sort", "Selection Sort", "Insertion Sort"], answer: "Merge Sort" }
      ];
      
      setQuestions(mockQuestions);
      setStep('quiz');
    } catch (e) {
      alert("Failed to generate workout. Try again.");
      setStep('intro');
    }
  };

  const handleAnswer = (option: string) => {
    if (option === questions[currentQIndex].answer) {
      setScore(s => s + 1);
    }
    
    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(i => i + 1);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    setStep('result');
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // ✅ This is where the Streak Magic happens
      const result = await GamificationService.recordActivity(user.id, 'quiz');
      setStreakResult(result);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans flex flex-col items-center justify-center">
      
      <AnimatePresence mode="wait">
        {/* INTRO SCREEN */}
        {step === 'intro' && (
          <motion.div 
            key="intro"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100"
          >
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl shadow-inner">
              🔥
            </div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Daily Workout</h1>
            <p className="text-slate-500 mb-8">
              Complete 3 questions to keep your streak alive and earn XP.
            </p>
            <button 
              onClick={startDailyWorkout}
              className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg shadow-orange-200 hover:bg-orange-600 transition transform active:scale-95"
            >
              Start Workout
            </button>
          </motion.div>
        )}

        {/* LOADING SCREEN */}
        {step === 'loading' && (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center"
          >
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="font-bold text-slate-600">AI is preparing your questions...</p>
          </motion.div>
        )}

        {/* QUIZ SCREEN */}
        {step === 'quiz' && (
          <motion.div 
            key="quiz"
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            className="w-full max-w-lg"
          >
            <div className="flex justify-between mb-6 text-xs font-bold uppercase tracking-widest text-slate-400">
              <span>Question {currentQIndex + 1}/{questions.length}</span>
              <span>Streak Mode</span>
            </div>

            <div className="bg-white p-8 rounded-4xl shadow-lg border border-slate-100 mb-6">
              <h2 className="text-xl font-bold text-slate-900 leading-relaxed">
                {questions[currentQIndex].text}
              </h2>
            </div>

            <div className="space-y-3">
              {questions[currentQIndex].options.map((opt: string, i: number) => (
                <button
                  key={i}
                  onClick={() => handleAnswer(opt)}
                  className="w-full p-4 bg-white rounded-xl border-2 border-slate-100 font-bold text-slate-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition text-left"
                >
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {/* RESULT SCREEN */}
        {step === 'result' && (
          <motion.div 
            key="result"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center overflow-hidden relative"
          >
             {/* Confetti or Decor */}
             <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-green-400 to-blue-500"></div>

             <h2 className="text-2xl font-black text-slate-900 mb-2">Workout Complete!</h2>
             <p className="text-slate-500 mb-6">You got {score}/{questions.length} correct.</p>

             <div className="bg-slate-50 p-6 rounded-2xl mb-6 space-y-4 border border-slate-100">
                <div className="flex justify-between items-center">
                   <span className="text-slate-600 font-bold">XP Earned</span>
                   <span className="text-yellow-600 font-black">+50 XP</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-slate-600 font-bold">Daily Streak</span>
                   <div className="flex items-center gap-2 text-orange-600 font-black">
                      <span>{streakResult?.newStreak || 1}</span>
                      <span>🔥</span>
                   </div>
                </div>
                {streakResult?.usedFreeze && (
                    <div className="text-xs text-blue-500 font-bold bg-blue-50 p-2 rounded">
                        🧊 Streak Freeze Used!
                    </div>
                )}
             </div>

             <button 
               onClick={() => router.push('/dashboard')}
               className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition"
             >
               Back to Dashboard
             </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}