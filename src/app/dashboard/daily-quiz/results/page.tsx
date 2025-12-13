'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UniBotMascot } from '@/components/ui/UniBotMascot';
import { Button } from '@/components/ui/Button';
import { Trophy, Clock, Zap, ArrowRight, RotateCcw } from 'lucide-react';
import { motion } from 'framer-motion';

export default function QuizResultsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    const fetchResult = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // Get the MOST RECENT quiz result for this user
      const { data, error } = await supabase
        .from('quiz_history')
        .select('*')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !data) {
        // If no recent result, go back to dashboard
        router.push('/dashboard'); 
        return;
      }

      setResult(data);
      setLoading(false);
    };

    fetchResult();
  }, [router]);

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin text-indigo-600">Loading Results...</div></div>;

  const percentage = Math.round((result.score / result.total_questions) * 100);
  const isGoodScore = percentage >= 70;

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100"
      >
        {/* Header */}
        <div className={`pt-12 pb-8 px-8 text-center relative overflow-hidden ${isGoodScore ? 'bg-indigo-600' : 'bg-slate-800'}`}>
           <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
           
           <div className="relative z-10 flex justify-center mb-6">
              <div className="bg-white/20 backdrop-blur-md p-4 rounded-full shadow-lg">
                <UniBotMascot 
                  size={120} 
                  emotion={isGoodScore ? 'cool' : 'sad'} 
                  action={isGoodScore ? 'dance' : 'none'} 
                  accessory={isGoodScore ? 'trophy' : 'none'}
                />
              </div>
           </div>
           
           <h1 className="text-3xl font-black text-white mb-1">
             {isGoodScore ? 'Quiz Crushed!' : 'Good Effort!'}
           </h1>
           <p className="text-white/70 font-medium">
             {isGoodScore ? 'You are absolutely on fire today.' : 'Keep practicing, you will get there.'}
           </p>
        </div>

        {/* Stats Grid */}
        <div className="p-8">
           <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                 <Trophy className="w-6 h-6 text-yellow-500 mb-2" />
                 <p className="text-slate-400 text-xs font-bold uppercase">Score</p>
                 <p className="text-2xl font-black text-slate-900">{result.score}/{result.total_questions}</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col items-center text-center">
                 <Clock className="w-6 h-6 text-indigo-500 mb-2" />
                 <p className="text-slate-400 text-xs font-bold uppercase">Time</p>
                 <p className="text-2xl font-black text-slate-900">{result.duration_seconds}s</p>
              </div>
           </div>

           {/* Rewards */}
           <div className="bg-linear-to-r from-amber-50 to-orange-50 border border-amber-100 p-5 rounded-2xl flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm text-amber-500">
                 <Zap className="w-6 h-6 fill-amber-500" />
              </div>
              <div>
                 <p className="text-amber-800 font-bold text-sm">Rewards Earned</p>
                 <p className="text-slate-600 text-xs">
                    You earned <span className="font-bold text-slate-900">+{50 + (result.score * 10)} XP</span> and <span className="font-bold text-slate-900">10 Gems</span>.
                 </p>
              </div>
           </div>

           {/* Actions */}
           <div className="space-y-3">
              <Button onClick={() => router.push('/dashboard')} className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800">
                 Back to Dashboard
              </Button>
              <Button onClick={() => router.push('/dashboard/daily-quiz')} variant="ghost" className="w-full text-slate-500 font-bold">
                 <RotateCcw className="w-4 h-4 mr-2" /> Try Another
              </Button>
           </div>
        </div>
      </motion.div>
    </div>
  );
}