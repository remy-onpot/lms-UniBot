import React from 'react';
import { useRouter } from 'next/navigation';
import { UniBotMascot, MascotEmotion, MascotAction } from '@/components/ui/UniBotMascot';
import { Lock } from 'lucide-react';

interface QuizResultViewProps {
  score: number;
  hasAccess: boolean;
  courseId: string;
  onUnlock: () => void;
}

export function QuizResultView({ score, hasAccess, courseId, onUnlock }: QuizResultViewProps) {
  const router = useRouter();

  // 🧠 SCORE LOGIC
  const getReaction = (): { emotion: MascotEmotion, action: MascotAction, text: string, color: string } => {
    if (score === 100) return { emotion: 'cool', action: 'backflip', text: 'PERFECT SCORE!', color: 'text-purple-600' };
    if (score >= 80) return { emotion: 'happy', action: 'dance', text: 'Amazing Job!', color: 'text-green-600' };
    if (score >= 60) return { emotion: 'happy', action: 'wave', text: 'Good Effort!', color: 'text-blue-600' };
    return { emotion: 'sad', action: 'none', text: 'Keep Practicing', color: 'text-orange-600' };
  };

  const reaction = getReaction();

  if (!hasAccess) {
    return (
      <div className="mx-auto max-w-2xl">
        <div className="bg-white rounded-3xl shadow-xl p-8 text-center border-2 border-orange-100">
          
          <div className="flex justify-center mb-6">
             {/* Shy Mascot for Paywall */}
             <UniBotMascot size={120} emotion="shy" action="none" className="opacity-80" />
          </div>

          <h1 className="text-2xl font-black text-slate-900 mb-2">Quiz Submitted!</h1>
          <p className="text-slate-500 mb-8">Your results are ready, but this content is locked.</p>
          
          <div className="bg-slate-50 p-6 rounded-2xl mb-6 relative overflow-hidden group cursor-pointer border border-slate-200" onClick={onUnlock}>
            <div className="filter blur-sm select-none opacity-50">
              <p className="text-xs text-slate-400 font-bold mb-1 uppercase tracking-wide">Your Score</p>
              <p className="text-5xl font-black text-slate-800">85%</p>
            </div>
            <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] transition-all group-hover:bg-white/40">
              <div className="bg-white p-4 rounded-xl shadow-xl text-center border border-slate-100 transform transition group-hover:scale-105">
                <Lock className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                <button className="px-6 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 shadow-lg">
                  Unlock for ₵15
                </button>
              </div>
            </div>
          </div>
          
          <button onClick={() => router.push(`/dashboard/courses/${courseId}`)} className="text-slate-400 text-sm hover:text-slate-700 font-bold transition">
            Return to Course
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="bg-white rounded-3xl shadow-2xl p-10 text-center relative overflow-hidden">
        
        {/* Background Effects */}
        {score >= 80 && (
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,rgba(255,255,0,0.15),transparent_70%)] animate-pulse"></div>
            </div>
        )}

        <div className="flex justify-center mb-8 relative z-10">
           <div className="relative">
              {/* Halo for Perfect Score */}
              {score === 100 && <div className="absolute inset-0 bg-yellow-400 rounded-full blur-3xl opacity-30 animate-pulse"></div>}
              
              <UniBotMascot 
                size={180} 
                emotion={reaction.emotion} 
                action={reaction.action} 
              />
           </div>
        </div>

        <h1 className={`text-4xl md:text-5xl font-black mb-3 ${reaction.color} tracking-tight relative z-10`}>
            {reaction.text}
        </h1>
        <p className="text-slate-500 font-medium mb-8 text-lg">You scored <span className="font-bold text-slate-900">{score}%</span> on this quiz.</p>

        <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto relative z-10">
           <button 
             onClick={() => window.location.reload()} 
             className="py-3.5 px-6 rounded-xl border-2 border-slate-200 font-bold text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition"
           >
             Retry
           </button>
           <button 
             onClick={() => router.push(`/dashboard/courses/${courseId}`)} 
             className="py-3.5 px-6 rounded-xl bg-slate-900 text-white font-bold hover:bg-slate-800 transition shadow-lg hover:shadow-xl transform active:scale-95"
           >
             Continue
           </button>
        </div>
      </div>
    </div>
  );
}