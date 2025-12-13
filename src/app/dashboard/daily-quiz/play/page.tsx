'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { Check, X, ArrowRight, Clock, HelpCircle, Sparkles } from 'lucide-react';
import { UniBotMascot, MascotEmotion, MascotAction } from '@/components/ui/UniBotMascot';
import { GamificationService } from '@/lib/services/gamification.service';
import { supabase } from '@/lib/supabase'; 
import { Button } from '@/components/ui/Button';

export default function DailyQuizPlayPage() {
  const router = useRouter();
  
  // 🔒 PREVENT DOUBLE-FETCH (React Strict Mode Fix)
  const dataFetchedRef = useRef(false);

  // DATA STATE
  const [questions, setQuestions] = useState<any[]>([]);
  const [roundInfo, setRoundInfo] = useState({ round: 1, topic: 'General' });
  
  // UI STATE
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // GAMEPLAY STATE
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [startTime, setStartTime] = useState<number>(0);
  const [userId, setUserId] = useState<string | null>(null);

  // MASCOT STATE
  const [mascotEmotion, setMascotEmotion] = useState<MascotEmotion>('idle');
  const [mascotAction, setMascotAction] = useState<MascotAction>('none');

  // 1. INITIALIZE GAME
  useEffect(() => {
    // 🛑 STOP: If we already fetched data in this session, do nothing.
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;

    const init = async () => {
       const { data: { user } } = await supabase.auth.getUser();
       if (!user) return router.push('/login');
       setUserId(user.id);

       try {
         // Call API (Once per page load)
         const data = await GamificationService.getDailyQuestions();

         // HANDLE LIMIT REACHED
         if (data.error === 'LIMIT_REACHED') {
            toast.error("Daily Limit Reached!", {
               description: "You've completed all 3 rounds for today. Come back tomorrow!",
               duration: 5000,
            });
            router.replace('/dashboard/daily-quiz/results'); 
            return;
         }

         if (data.error || !data.questions || data.questions.length === 0) {
            throw new Error(data.error || "Failed to load");
         }

         // Success! Start the game
         setQuestions(data.questions);
         setRoundInfo({ round: data.round, topic: data.topic });
         setStartTime(Date.now());
         setLoading(false);

       } catch (e) {
         console.error(e);
         toast.error("Could not load quiz round. Try again later.");
         router.push('/dashboard');
       }
    };
    
    init();
  }, [router]);

  // 2. INTERACTION HANDLERS
  const handleSelect = (index: number) => {
    if (isAnswered) return;
    setSelectedOption(index);
    setMascotEmotion('thinking');
  };

  const handleSubmitAnswer = () => {
    if (selectedOption === null) return;
    setIsAnswered(true);
    
    const isCorrect = selectedOption === questions[currentQIndex].answer;
    
    if (isCorrect) {
      setScore(prev => prev + 1);
      setMascotEmotion('happy');
      setMascotAction('bounce');
    } else {
      setMascotEmotion('sad');
      setMascotAction('none');
    }
  };

  const handleNext = async () => {
    if (currentQIndex < questions.length - 1) {
      // Go to next question
      setCurrentQIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
      setMascotEmotion('idle');
      setMascotAction('none');
    } else {
      // Finish Quiz
      finishQuiz();
    }
  };

  const finishQuiz = async () => {
    if (!userId) return;
    setSubmitting(true);
    setMascotEmotion('cool');
    setMascotAction('dance');

    const completedAt = new Date();
    
    try {
      await GamificationService.submitQuizResult(userId, {
         score: score,
         totalQuestions: questions.length,
         startedAt: new Date(startTime),
         completedAt: completedAt,
         topics: [roundInfo.topic],
         round: roundInfo.round
      });

      toast.success(`Round ${roundInfo.round} Complete!`);
      router.push('/dashboard/daily-quiz/results');
    } catch (e) {
      toast.error("Failed to save results, but you did great!");
      router.push('/dashboard');
    } finally {
      setSubmitting(false);
    }
  };

  // LOADING STATE
  if (loading) return (
     <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
        <UniBotMascot size={120} emotion="thinking" action="idle" interactive={true} />
        <div className="flex flex-col items-center gap-2">
           <div className="h-2 w-32 bg-slate-200 rounded-full overflow-hidden">
              <div className="h-full w-1/2 bg-indigo-500 animate-progress-indeterminate" />
           </div>
           <p className="text-slate-500 font-bold text-sm animate-pulse">Contacting UniBot...</p>
        </div>
     </div>
  );

  const currentQuestion = questions[currentQIndex];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-80 bg-slate-900 rounded-b-[4rem] z-0 shadow-2xl" />
      
      <div className="w-full max-w-2xl relative z-10">
        
        {/* HEADER */}
        <div className="flex items-end justify-between mb-8 px-4">
           <div className="text-white">
              <div className="flex items-center gap-2 mb-2">
                 <span className="bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> Round {roundInfo.round} / 3
                 </span>
              </div>
              <h1 className="text-3xl font-black">{roundInfo.topic}</h1>
              <p className="text-slate-400 text-sm font-medium mt-1">Question {currentQIndex + 1} of {questions.length}</p>
           </div>
           
           {/* Mascot Stage */}
           <div className="bg-white p-2 rounded-3xl shadow-xl shadow-indigo-900/20 -mb-16 transition-transform duration-300 hover:scale-105 z-20">
              <div className="w-28 h-28 bg-indigo-50 rounded-2xl flex items-center justify-center overflow-hidden relative">
                 <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-white/50 to-transparent opacity-50" />
                 <UniBotMascot size={100} emotion={mascotEmotion} action={mascotAction} interactive={true} />
              </div>
           </div>
        </div>

        {/* QUIZ CARD */}
        <motion.div 
           key={currentQIndex}
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden mt-8"
        >
           {/* Progress Bar */}
           <div className="w-full h-3 bg-slate-100">
              <motion.div 
                className="h-full bg-linear-to-r from-indigo-500 to-purple-500" 
                initial={{ width: `${((currentQIndex) / questions.length) * 100}%` }}
                animate={{ width: `${((currentQIndex + 1) / questions.length) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
           </div>

           <div className="p-8 pt-12">
              <h2 className="text-xl font-bold text-slate-900 mb-8 leading-relaxed">
                 {currentQuestion.question}
              </h2>

              <div className="space-y-3">
                 {currentQuestion.options.map((option: string, idx: number) => {
                    // Logic for button styling
                    let btnClass = "bg-white border-2 border-slate-100 text-slate-600 hover:border-indigo-200 hover:bg-slate-50";
                    let markerClass = "bg-slate-100 text-slate-400 group-hover:bg-white";
                    let icon = null;

                    if (isAnswered) {
                       if (idx === currentQuestion.answer) {
                          btnClass = "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-lg shadow-emerald-100 ring-1 ring-emerald-500"; 
                          markerClass = "bg-emerald-200 text-emerald-700";
                          icon = <Check className="w-5 h-5 text-emerald-600" />;
                       } else if (idx === selectedOption) {
                          btnClass = "bg-red-50 border-red-400 text-red-800 opacity-80"; 
                          markerClass = "bg-red-200 text-red-700";
                          icon = <X className="w-5 h-5 text-red-500" />;
                       } else {
                          btnClass = "opacity-40 grayscale border-slate-100";
                       }
                    } else if (selectedOption === idx) {
                       btnClass = "border-indigo-600 bg-indigo-50 text-indigo-900 shadow-md ring-1 ring-indigo-600";
                       markerClass = "bg-indigo-600 text-white";
                    }

                    return (
                      <button
                        key={idx}
                        onClick={() => handleSelect(idx)}
                        disabled={isAnswered}
                        className={`w-full text-left p-4 rounded-2xl font-bold transition-all duration-200 flex items-center justify-between group ${btnClass}`}
                      >
                        <div className="flex items-center gap-4">
                           <span className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black transition-colors shrink-0 ${markerClass}`}>
                              {String.fromCharCode(65 + idx)}
                           </span>
                           <span className="text-sm">{option}</span>
                        </div>
                        {icon}
                      </button>
                    );
                 })}
              </div>
           </div>

           {/* Actions Footer */}
           <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider bg-white px-3 py-1 rounded-lg border border-slate-200">
                 <Clock className="w-3 h-3" />
                 <span>{Math.round((Date.now() - startTime) / 1000)}s</span>
              </div>

              {!isAnswered ? (
                 <Button 
                   onClick={handleSubmitAnswer} 
                   disabled={selectedOption === null} 
                   className="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-300 px-8 py-3 rounded-xl font-bold transition-all hover:-translate-y-0.5 active:translate-y-0"
                 >
                   Check Answer
                 </Button>
              ) : (
                 <Button 
                   onClick={handleNext} 
                   disabled={submitting} 
                   className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200 px-8 py-3 rounded-xl font-bold animate-in slide-in-from-right-4 fade-in"
                 >
                    {currentQIndex < questions.length - 1 ? 'Next' : 'Finish'} 
                    <ArrowRight className="w-4 h-4 ml-2" />
                 </Button>
              )}
           </div>
        </motion.div>
        
        {/* Helper Tip */}
        <p className="text-center mt-8 text-slate-400 text-xs font-medium flex items-center justify-center gap-2 opacity-60">
           <HelpCircle className="w-3 h-3" /> 
           <span>Correct answers boost your <span className="font-bold text-indigo-400">Gem Multiplier</span></span>
        </p>

      </div>
    </div>
  );
}