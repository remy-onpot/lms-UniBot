'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { UniBotMascot, MascotEmotion, MascotAction } from '@/components/ui/UniBotMascot';
import { ArrowLeft, Play, Clock, Zap, Brain, Flame } from 'lucide-react';
import { motion } from 'framer-motion';

export default function DailyQuizStart() {
  const router = useRouter();
  const [hovering, setHovering] = useState(false);
  const [launching, setLaunching] = useState(false);
  
  // Mascot Personality State
  const [emotion, setEmotion] = useState<MascotEmotion>('cool');
  const [action, setAction] = useState<MascotAction>('wave');

  // Entrance Animation
  useEffect(() => {
    setTimeout(() => {
        setAction('idle');
        setEmotion('happy');
    }, 1000);
  }, []);

  const handleStartHover = () => {
    if (launching) return;
    setHovering(true);
    setEmotion('surprised'); // "Oh? You ready?"
    setAction('none');
    
    // Quick switch to "Hyped" state
    setTimeout(() => {
        if (hovering) { 
            setEmotion('happy');
            setAction('dance'); // Excited bounce
        }
    }, 200);
  };

  const handleStartLeave = () => {
    if (launching) return;
    setHovering(false);
    setEmotion('cool');
    setAction('idle');
  };

  const handleStartClick = () => {
    setLaunching(true);
    setEmotion('cool');
    setAction('backflip'); // Victory flip before launch
    
    // Wait for flip animation before routing
    setTimeout(() => {
        router.push('/dashboard/daily-quiz/play');
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans relative overflow-hidden selection:bg-indigo-500/30">
      
      {/* --- CINEMATIC BACKGROUND --- */}
      {/* Deep Space Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950 pointer-events-none"></div>
      
      {/* Grid Floor */}
      <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center mask-[linear-gradient(180deg,white,rgba(255,255,255,0))] opacity-10 pointer-events-none"></div>

      {/* Floating Orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[128px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-[128px] animate-pulse delay-1000 pointer-events-none"></div>

      {/* --- MAIN GAME CARD --- */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-lg"
      >
        {/* Glass Container */}
        <div className="bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[3rem] p-8 md:p-12 text-center shadow-2xl shadow-indigo-500/10 relative overflow-hidden group/card">
            
            {/* Glossy Reflection */}
            <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent opacity-50 pointer-events-none"></div>

            {/* Back Button */}
            <button 
              onClick={() => router.back()} 
              className="absolute top-8 left-8 p-3 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-all z-20 group/back"
            >
               <ArrowLeft className="w-6 h-6 group-hover/back:-translate-x-1 transition-transform" />
            </button>

            {/* 🔥 STREAK BADGE (Floating) */}
            <div className="absolute top-8 right-8 animate-bounce delay-700">
               <div className="bg-orange-500/10 border border-orange-500/20 text-orange-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-orange-900/20">
                  <Flame className="w-3 h-3 fill-orange-500" /> Hot Streak
               </div>
            </div>

            {/* 🤖 MASCOT STAGE */}
            <div className="relative h-64 flex items-center justify-center mb-6">
                {/* Spotlight Effect */}
                <div className="absolute bottom-0 w-40 h-10 bg-black/40 blur-xl rounded-full scale-x-150"></div>
                
                <div 
                  className="transition-transform duration-500 ease-spring z-10"
                  style={{ transform: hovering || launching ? 'scale(1.15) translateY(-15px)' : 'scale(1)' }}
                >
                   <div className="relative w-64 h-64 drop-shadow-2xl">
                       <UniBotMascot 
                         size={256} 
                         emotion={emotion} 
                         action={action} 
                       />
                   </div>
                </div>
            </div>

            {/* TITLE BLOCK */}
            <div className="space-y-3 mb-10 relative z-10">
                <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter drop-shadow-lg">
                  Daily Workout
                </h1>
                <p className="text-indigo-200/80 font-medium text-lg">
                  Ready to flex your brain?
                </p>
            </div>

            {/* STATS ROW */}
            <div className="grid grid-cols-2 gap-4 mb-10 relative z-10">
               <div className="bg-slate-800/40 p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-1 group/stat hover:bg-slate-800/60 transition-colors">
                  <Clock className="w-6 h-6 text-blue-400 mb-1 group-hover/stat:scale-110 transition-transform" /> 
                  <span className="text-white font-bold text-lg">5 Mins</span>
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Time Limit</span>
               </div>
               <div className="bg-slate-800/40 p-4 rounded-3xl border border-white/5 flex flex-col items-center justify-center gap-1 group/stat hover:bg-slate-800/60 transition-colors">
                  <Zap className="w-6 h-6 text-yellow-400 mb-1 group-hover/stat:scale-110 transition-transform" /> 
                  <span className="text-white font-bold text-lg">+50 XP</span>
                  <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Reward</span>
               </div>
            </div>

            {/* 🚀 START BUTTON */}
            <button 
              onMouseEnter={handleStartHover}
              onMouseLeave={handleStartLeave}
              onClick={handleStartClick}
              disabled={launching}
              className="w-full relative group/btn overflow-hidden rounded-2xl bg-white text-slate-900 font-black text-xl py-5 shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)] hover:shadow-[0_0_60px_-15px_rgba(255,255,255,0.5)] transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
            >
               <span className="relative z-10 flex items-center justify-center gap-3">
                 {launching ? 'Launching...' : 'Start Quiz'} 
                 {!launching && <Play className="w-6 h-6 fill-slate-900 group-hover/btn:translate-x-1 transition-transform" />}
               </span>
               
               {/* Shine Animation */}
               <div className="absolute inset-0 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-1000 bg-linear-to-r from-transparent via-white/40 to-transparent skew-x-12"></div>
            </button>

            {/* Footer */}
            <div className="mt-8 flex items-center justify-center gap-2 opacity-40 hover:opacity-100 transition-opacity">
               <Brain className="w-4 h-4 text-white" />
               <span className="text-xs font-bold text-white uppercase tracking-widest">Powered by Gemini 2.5</span>
            </div>

        </div>
      </motion.div>
    </div>
  );
}