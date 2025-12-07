'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { GamificationService } from '@/lib/services/gamification.service';
import { CourseService } from '@/lib/services/course.service';
import { FaceAnalyticsService } from '@/lib/services/face-analytics.service';
import { useFace } from '@/components/ui/FaceProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export default function DailyQuizPage() {
  const router = useRouter();
  const face = useFace();
  const [step, setStep] = useState<'intro' | 'loading' | 'quiz' | 'result'>('intro');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});

  // ... (Limit Check useEffect remains the same) ...
  useEffect(() => {
    const checkLimit = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const canPlay = await GamificationService.checkDailyLimit(user.id);
        if (!canPlay) {
          toast.error("You've reached your daily limit of 3 quizzes!");
          router.push('/dashboard');
        }
      }
    };
    checkLimit();
  }, [router]);

  // ✅ HELPER: Smart Matching Logic
  const isAnswerCorrect = (selectedOption: string, correctAnswer: string, index: number) => {
    if (!selectedOption || !correctAnswer) return false;
    
    // Normalize strings
    const cleanSelected = selectedOption.replace(/^[A-D][\)\.]\s*/, "").trim(); // Remove "A) " prefix
    const cleanCorrect = correctAnswer.replace(/^[A-D][\)\.]\s*/, "").trim();

    // 1. Exact Text Match (e.g. "Piano" == "Piano")
    if (cleanSelected.toLowerCase() === cleanCorrect.toLowerCase()) return true;
    
    // 2. Prefix Match (e.g. "C) Piano" matches "C")
    if (selectedOption.startsWith(correctAnswer + ")") || selectedOption.startsWith(correctAnswer + ".")) return true;

    // 3. Index/Letter Match (e.g. Option Index 2 ("C") matches Answer "C")
    const letterFromIndex = String.fromCharCode(65 + index); // 0=A, 1=B, 2=C
    if (correctAnswer === letterFromIndex) return true;

    return false;
  };

  const startDailyWorkout = async () => {
    setStep('loading');
    setLoadingMsg("Analyzing your learning progress...");
    face.pulse('thinking', 2000);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");
      
      await FaceAnalyticsService.logQuizStart('daily-workout', 'Daily Quiz');

      // Fetch Profile Interests & Course Topics
      const { data: profile } = await supabase.from('users').select('interests').eq('id', user.id).single();
      const reviewTopics = await CourseService.getReviewTopics(user.id);

      let topicPool = [...(profile?.interests || [])];
      if (topicPool.length === 0 && reviewTopics.length === 0) topicPool = ["General Knowledge", "Science", "Technology"];
      if (reviewTopics.length > 0) topicPool = [...topicPool, ...reviewTopics];

      let selectedTopic = topicPool[Math.floor(Math.random() * topicPool.length)] || "General Knowledge";
      
      // Prompt Logic
      let contextPrompt = `You are a trivia host. Create a fun, easy, and engaging quiz about "${selectedTopic}".`;
      if (reviewTopics.includes(selectedTopic)) {
           setLoadingMsg(`Reviewing: ${selectedTopic}...`);
           contextPrompt = `You are a supportive tutor. Create a beginner-friendly review quiz about "${selectedTopic}".`;
      } else {
           setLoadingMsg(`Generating quiz: ${selectedTopic}...`);
      }

      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: contextPrompt, 
          topic: selectedTopic,
          difficulty: "Easy",
          numQuestions: 3,
          type: "Multiple Choice"
        })
      });

      if (!res.ok) {
        if (res.status === 503 || res.status === 429) throw new Error("RATE_LIMIT");
        throw new Error("Failed to generate quiz");
      }
      
      const data = await res.json();
      const aiQuestions = data.quiz.map((q: any, i: number) => ({
        id: i,
        text: q.question,
        options: q.options,
        answer: q.correct_answer,
        explanation: q.explanation
      }));

      setQuestions(aiQuestions);
      setStep('quiz');

    } catch (e: any) {
      if (e.message === "RATE_LIMIT") toast.info("AI busy, loading backup quiz.");
      else console.error(e);
      
      setQuestions([
         { id: 1, text: "Which language runs in a web browser?", options: ["Java", "C", "Python", "JavaScript"], answer: "JavaScript", explanation: "JS is the language of the web." },
         { id: 2, text: "What does CPU stand for?", options: ["Central Process Unit", "Computer Personal Unit", "Central Processing Unit", "Central Processor Unit"], answer: "Central Processing Unit", explanation: "The brain of the computer." },
         { id: 3, text: "The binary system uses which two numbers?", options: ["0 and 1", "1 and 2", "0 and 9", "1 and 10"], answer: "0 and 1", explanation: "Base-2 system." }
      ]);
      setStep('quiz');
    }
  };

  const handleAnswer = (option: string, index: number) => {
    setUserAnswers(prev => ({ ...prev, [currentQIndex]: option }));

    const currentQ = questions[currentQIndex];
    // Use the smart helper
    const isCorrect = isAnswerCorrect(option, currentQ.answer, index);

    if (isCorrect) {
      setScore(s => s + 1);
      toast.success("Correct!");
    } else {
      toast.error("Incorrect");
    }
    
    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(i => i + 1);
    } else {
      finishQuiz(isCorrect ? score + 1 : score);
    }
  };

  const finishQuiz = async (finalScore: number) => {
    setLoadingMsg("Calculating Results...");
    setStep('loading');
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const result = await GamificationService.recordActivity(user.id, 'daily_quiz', finalScore, questions.length);
        setXpEarned(result.xpEarned ?? 0);
        
        if ((finalScore / questions.length) >= 0.7) face.pulse('happy', 2000);
        else face.pulse('sad', 2000);
        
        setStep('result');
      }
    } catch (error: any) {
      toast.error(error.message);
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans flex flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        
        {step === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -20 }} className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full text-center border border-slate-100">
            <div className="w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6 text-5xl shadow-inner">🔥</div>
            <h1 className="text-3xl font-black text-slate-900 mb-2">Daily Workout</h1>
            <p className="text-slate-500 mb-8">3 quick questions to keep your streak alive.</p>
            <button onClick={startDailyWorkout} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-orange-600 transition active:scale-95">Start Workout</button>
          </motion.div>
        )}

        {step === 'loading' && (
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center">
            <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="font-bold text-slate-600">{loadingMsg}</p>
          </motion.div>
        )}

        {step === 'quiz' && questions.length > 0 && (
          <motion.div key="quiz" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="w-full max-w-lg">
            <div className="flex justify-between mb-6 text-xs font-bold uppercase tracking-widest text-slate-400">
              <span>Question {currentQIndex + 1}/{questions.length}</span>
              <span>Streak Mode</span>
            </div>
            <div className="bg-white p-8 rounded-4xl shadow-lg border border-slate-100 mb-6">
              <h2 className="text-xl font-bold text-slate-900 leading-relaxed">{questions[currentQIndex].text}</h2>
            </div>
            <div className="space-y-3">
              {questions[currentQIndex].options.map((opt: string, i: number) => (
                // ✅ PASS INDEX (i) TO HANDLEANSWER
                <button key={i} onClick={() => handleAnswer(opt, i)} className="w-full p-4 bg-white rounded-xl border-2 border-slate-100 font-bold text-slate-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition text-left">
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'result' && (
          <motion.div key="result" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-2xl bg-white p-8 rounded-3xl shadow-xl border border-slate-100 max-h-[85vh] overflow-y-auto">
             <div className="text-center mb-8">
                <h2 className="text-3xl font-black text-slate-900 mb-2">Workout Complete!</h2>
                <div className="inline-flex items-center gap-2 bg-yellow-50 text-yellow-700 px-4 py-2 rounded-full font-bold border border-yellow-100">
                   <span>⚡ +{xpEarned} XP Earned</span>
                </div>
                <p className="text-slate-500 mt-2 font-medium">You scored {score}/{questions.length}</p>
             </div>

             <div className="space-y-6 mb-8">
               {questions.map((q, qIdx) => {
                 const userAnswer = userAnswers[qIdx];
                 // Find the index of the user's selected string in the options array
                 const selectedIndex = q.options.indexOf(userAnswer);
                 const isCorrect = isAnswerCorrect(userAnswer, q.answer, selectedIndex);
                 
                 return (
                   <div key={qIdx} className={`p-5 rounded-2xl border-2 ${isCorrect ? 'border-green-100 bg-green-50/30' : 'border-red-100 bg-red-50/30'}`}>
                      <div className="flex gap-3">
                         <div className={`mt-1 shrink-0 ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                            {isCorrect ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                         </div>
                         <div>
                            <p className="font-bold text-slate-900 mb-2">{q.text}</p>
                            
                            <div className="text-sm space-y-1">
                               <p className={`${isCorrect ? 'text-green-700' : 'text-red-600 line-through opacity-70'}`}>
                                 You selected: {userAnswer || "Skipped"}
                               </p>
                               {!isCorrect && (
                                 <p className="text-green-700 font-bold">Correct answer: {q.answer}</p>
                               )}
                            </div>

                            {q.explanation && (
                              <div className="mt-3 flex items-start gap-2 text-xs text-slate-500 bg-white/50 p-3 rounded-lg">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <p>{q.explanation}</p>
                              </div>
                            )}
                         </div>
                      </div>
                   </div>
                 );
               })}
             </div>

             <button onClick={() => router.push('/dashboard')} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition">Return to Dashboard</button>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}