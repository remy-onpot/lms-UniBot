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

export default function DailyQuizPage() {
  const router = useRouter();
  const face = useFace();
  const [step, setStep] = useState<'intro' | 'loading' | 'quiz' | 'result'>('intro');
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [xpEarned, setXpEarned] = useState(0);
  const [loadingMsg, setLoadingMsg] = useState('');

  // Limit Check
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

  const startDailyWorkout = async () => {
    setStep('loading');
    setLoadingMsg("Analyzing your learning progress...");
    face.pulse('thinking', 2000, { event: 'quiz_generation_start' });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user");
      
      // Log quiz start
      await FaceAnalyticsService.logQuizStart('daily-workout', 'Daily Personalized Quiz');

      // 1. Fetch User Interests
      const { data: profile } = await supabase
        .from('users')
        .select('interests')
        .eq('id', user.id)
        .single();

      // 2. Fetch Review Topics
      const reviewTopics = await CourseService.getReviewTopics(user.id);

      // 3. Create the "Smart Mix"
      let topicPool = [...(profile?.interests || [])];
      
      // If user has no interests and no course reviews, add defaults
      if (topicPool.length === 0 && reviewTopics.length === 0) {
        topicPool = ["Science", "History", "Technology", "Arts"];
      }

      if (reviewTopics.length > 0) {
        topicPool = [...topicPool, ...reviewTopics, ...reviewTopics];
      }

      // 4. Pick a Topic & Generate LONG Prompt
      let selectedTopic = "General Knowledge";
      let contextPrompt = "";

      if (topicPool.length > 0) {
        selectedTopic = topicPool[Math.floor(Math.random() * topicPool.length)];
        
        if (reviewTopics.includes(selectedTopic)) {
           setLoadingMsg(`Reviewing past lesson: ${selectedTopic}...`);
           // ✅ FIX: Long prompt (>50 chars)
           contextPrompt = `You are an expert tutor. Create a rigorous review quiz about the topic "${selectedTopic}". The user has studied this before, so the questions should challenge their retention and understanding of key concepts.`;
        } else {
           setLoadingMsg(`Generating fun questions about ${selectedTopic}...`);
           // ✅ FIX: Long prompt (>50 chars)
           contextPrompt = `You are a trivia master. Create a fun, engaging, and educational quiz regarding the topic "${selectedTopic}". The questions should be interesting facts that a general audience would enjoy learning about.`;
        }
      } else {
        setLoadingMsg("Generating brain teasers...");
        // ✅ FIX: Long prompt (>50 chars)
        contextPrompt = "You are a logic expert. Generate a general knowledge quiz focusing on logic, critical thinking, and reasoning skills. The questions should vary in difficulty to test the user's mental agility.";
      }

      // 5. Call AI
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText: contextPrompt, // Now guaranteed to be long enough
          topic: selectedTopic,
          difficulty: "Medium",
          numQuestions: 3,
          type: "Multiple Choice"
        })
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Quiz Gen Error:", err);
        throw new Error(err.error || "Failed to generate quiz");
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
      console.error(e);
      face.pulse('sad', 1500, { event: 'quiz_generation_error' });
      toast.error("AI is taking a break. Loading backup questions.");
      
      // Fallback questions
      setQuestions([
         { id: 1, text: "Which language runs in a web browser?", options: ["Java", "C", "Python", "JavaScript"], answer: "JavaScript" },
         { id: 2, text: "What does CPU stand for?", options: ["Central Process Unit", "Computer Personal Unit", "Central Processing Unit", "Central Processor Unit"], answer: "Central Processing Unit" },
         { id: 3, text: "The binary system uses which two numbers?", options: ["0 and 1", "1 and 2", "0 and 9", "1 and 10"], answer: "0 and 1" }
      ]);
      setStep('quiz');
    }
  };

  const handleAnswer = (option: string) => {
    if (option === questions[currentQIndex].answer) {
      setScore(s => s + 1);
      toast.success("Correct!");
    } else {
      toast.error("Incorrect");
    }
    
    if (currentQIndex + 1 < questions.length) {
      setCurrentQIndex(i => i + 1);
    } else {
      // Pass the *final* calculated score
      finishQuiz(option === questions[currentQIndex].answer ? score + 1 : score);
    }
  };

  const finishQuiz = async (finalScore: number) => {
    setLoadingMsg("Calculating XP...");
    setStep('loading');
    face.pulse('thinking', 1500, { event: 'scoring', score: finalScore });
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // ✅ Change activity to 'daily_quiz' to enforce daily limit logic
        const result = await GamificationService.recordActivity(
          user.id,
          'daily_quiz', // <--- This triggers the 3x/day limit
          finalScore,
          questions.length
        );
        setXpEarned(result.xpEarned ?? 0);
        
        // Log quiz completion with face reaction
        const scorePercentage = (finalScore / questions.length) * 100;
        if (scorePercentage >= 70) {
          face.pulse('happy', 1500, { event: 'quiz_success', score: finalScore, total: questions.length });
          await FaceAnalyticsService.logQuizComplete('daily-workout', finalScore, questions.length, result.xpEarned ?? 0);
        } else {
          face.pulse('sad', 1500, { event: 'quiz_low_score', score: finalScore, total: questions.length });
          await FaceAnalyticsService.logQuizComplete('daily-workout', finalScore, questions.length, result.xpEarned ?? 0);
        }
        
        setStep('result');
      }
    } catch (error: any) {
      face.pulse('sad', 1500, { event: 'quiz_completion_error' });
      toast.error(error.message);
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans flex flex-col items-center justify-center">
      
      <AnimatePresence mode="wait">
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
              Complete 3 questions to keep your streak alive. <br/>
              <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded mt-2 inline-block">Max 3 attempts/day</span>
            </p>
            <button onClick={startDailyWorkout} className="w-full py-4 bg-orange-500 text-white rounded-2xl font-bold text-lg shadow-lg hover:bg-orange-600 transition active:scale-95">
              Start Workout
            </button>
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
                <button key={i} onClick={() => handleAnswer(opt)} className="w-full p-4 bg-white rounded-xl border-2 border-slate-100 font-bold text-slate-600 hover:border-orange-400 hover:text-orange-600 hover:bg-orange-50 transition text-left">
                  {opt}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 'result' && (
          <motion.div key="result" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-8 rounded-3xl shadow-2xl max-w-md w-full text-center overflow-hidden relative">
             <div className="absolute top-0 left-0 w-full h-2 bg-linear-to-r from-green-400 to-blue-500"></div>
             <h2 className="text-2xl font-black text-slate-900 mb-2">Workout Complete!</h2>
             <p className="text-slate-500 mb-6">You got {score}/{questions.length} correct.</p>
             <div className="bg-slate-50 p-6 rounded-2xl mb-6 space-y-4 border border-slate-100">
                <div className="flex justify-between items-center">
                   <span className="text-slate-600 font-bold">XP Earned</span>
                   <span className="text-yellow-600 font-black">+{xpEarned} XP</span>
                </div>
             </div>
             <button onClick={() => router.push('/dashboard')} className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition">Back to Dashboard</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}