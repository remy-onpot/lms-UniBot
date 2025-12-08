'use client';
import { useState } from 'react';
import { 
  Trophy, Flame, Zap, Crown, Flag, BookOpen, Target, 
  Sun, Moon, Calendar, FileText, GraduationCap, ShoppingBag, Lock, RefreshCw
} from 'lucide-react';
import { Achievement, GamificationService } from '@/lib/services/gamification.service';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface AchievementsTabProps {
  achievements: Achievement[];
  onRefresh: () => void; // ✅ Callback to reload parent data
}

const IconMap: Record<string, any> = {
  Flame, Zap, Crown, Flag, BookOpen, Target, 
  Sun, Moon, Calendar, FileText, GraduationCap, ShoppingBag
};

export function AchievementsTab({ achievements, onRefresh }: AchievementsTabProps) {
  const [syncing, setSyncing] = useState(false);
  
  const earnedCount = achievements.filter(a => a.earned_at).length;
  const totalCount = achievements.length;
  const progress = totalCount > 0 ? Math.round((earnedCount / totalCount) * 100) : 0;

  // 🔄 THE FIX: Manual Sync Trigger
  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // We trigger the check with a dummy context. 
      // The service looks at TOTAL counts (quizzes, streaks), so it will backfill automatically.
      const newUnlocks = await GamificationService.checkAndAwardAchievements(user.id, {
        type: 'streak_update' // Dummy type to trigger the count checks
      });

      if (newUnlocks.length > 0) {
        toast.success(`Synced! Unlocked ${newUnlocks.length} past achievements.`);
      } else {
        toast.info("Up to date. No new achievements found.");
      }
      
      onRefresh(); // Reload the UI to show the new badges (colorful!)
    } catch (e) {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Summary */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
         <div>
            <h3 className="text-xl font-black text-slate-900">Your Trophy Case</h3>
            <p className="text-slate-500 text-sm mt-1">{earnedCount} of {totalCount} Badges Unlocked</p>
         </div>
         
         <div className="flex items-center gap-4">
             {/* ✅ SYNC BUTTON */}
             <button 
               onClick={handleSync}
               disabled={syncing}
               className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold transition disabled:opacity-50"
               title="Check for missing badges"
             >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync History'}
             </button>

             <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-slate-100" />
                  <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="none" className="text-yellow-500 transition-all duration-1000 ease-out" 
                    strokeDasharray={176} 
                    strokeDashoffset={176 - (176 * progress) / 100} 
                  />
                </svg>
                <Trophy className="absolute w-6 h-6 text-yellow-500" />
             </div>
         </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {achievements.map((ach) => {
          const isUnlocked = !!ach.earned_at;
          const Icon = IconMap[ach.icon_name] || Trophy;

          return (
            <div 
              key={ach.id} 
              className={`relative p-5 rounded-2xl border-2 transition-all group ${
                isUnlocked 
                  ? 'bg-white border-slate-100 shadow-sm hover:border-yellow-200' 
                  : 'bg-slate-50 border-slate-100 opacity-60 grayscale hover:opacity-80'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                 <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                    isUnlocked ? 'bg-linear-to-br from-yellow-50 to-orange-50 text-orange-500' : 'bg-slate-200 text-slate-400'
                 }`}>
                    <Icon className="w-6 h-6" />
                 </div>
                 {isUnlocked ? (
                    <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
                       {new Date(ach.earned_at!).toLocaleDateString()}
                    </span>
                 ) : (
                    <Lock className="w-4 h-4 text-slate-300" />
                 )}
              </div>

              <h4 className="font-bold text-slate-900">{ach.name}</h4>
              <p className="text-xs text-slate-500 mt-1 leading-snug">{ach.description}</p>

              {isUnlocked && (
                 <div className="mt-3 inline-flex items-center gap-1 text-[10px] font-bold text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded">
                    <Zap className="w-3 h-3" /> +{ach.xp_reward} XP
                 </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}