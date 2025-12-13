'use client';

import { useState, useRef, useEffect } from 'react';
import { AchievementWithStatus } from '@/lib/services/gamification.service';
import { Lock, RefreshCw, Filter, Award, CheckCircle2, Sparkles } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface AchievementsTabProps {
  achievements: AchievementWithStatus[];
  onRefresh: () => Promise<void> | void;
}

// 🖼️ Helper: Smart Icon Renderer
function BadgeIcon({ icon, earned }: { icon: string; earned: boolean }) {
  const isImagePath = icon?.includes('/') || icon?.startsWith('http');

  return (
    <div className={`w-14 h-14 shrink-0 rounded-2xl flex items-center justify-center text-3xl border-2 transition-all duration-500 relative overflow-hidden ${
        earned 
          ? 'bg-linear-to-br from-indigo-50 to-white border-indigo-200 shadow-lg shadow-indigo-100' 
          : 'bg-slate-50 border-slate-100 grayscale opacity-40'
    }`}>
      {earned && <div className="absolute inset-0 bg-yellow-400/10 animate-pulse rounded-2xl" />}

      {isImagePath ? (
        <img 
          src={icon} 
          alt="Badge" 
          className="w-10 h-10 object-contain z-10 drop-shadow-sm" 
          onError={(e) => {
             e.currentTarget.style.display = 'none';
             e.currentTarget.parentElement!.innerText = '🏆';
          }}
        />
      ) : (
        <span className="z-10 drop-shadow-sm">{icon || '🏆'}</span>
      )}
    </div>
  );
}

export function AchievementsTab({ achievements, onRefresh }: AchievementsTabProps) {
  const [filter, setFilter] = useState<'all' | 'earned' | 'locked'>('all');
  
  // 🧠 SMART SYNC STATE
  const [isSyncing, setIsSyncing] = useState(false);
  const prevCountRef = useRef(0);

  // 1. The Trigger
  const handleSmartSync = async () => {
    if (isSyncing) return;
    
    // Snapshot current state
    const currentCount = achievements.filter(a => a.earned_at).length;
    prevCountRef.current = currentCount;
    
    setIsSyncing(true);
    
    // Trigger Parent Fetch
    // We wrap in try/catch to ensure we turn off the spinner even if API fails
    try {
      await onRefresh();
    } catch (e) {
      toast.error("Sync failed. Please try again.");
      setIsSyncing(false); 
    }
  };

  // 2. The Listener (Reacts when 'achievements' prop updates)
  useEffect(() => {
    if (!isSyncing) return;

    // Calculate Diff
    const newCount = achievements.filter(a => a.earned_at).length;
    const diff = newCount - prevCountRef.current;

    // We add a tiny artificial delay so the spinner doesn't flash too fast
    const timer = setTimeout(() => {
      if (diff > 0) {
        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-bold text-base">Uncovered {diff} New Badge{diff > 1 ? 's' : ''}! 🎉</span>
            <span className="text-xs opacity-90">Check your collection.</span>
          </div>, 
          { duration: 4000 }
        );
      } else {
        toast.info("Collection up to date", {
          description: "No new achievements found this time.",
          duration: 2000
        });
      }
      setIsSyncing(false);
    }, 600);

    return () => clearTimeout(timer);
  }, [achievements, isSyncing]);

  // --- STANDARD RENDER LOGIC ---

  const filtered = achievements.filter(a => {
    if (filter === 'earned') return !!a.earned_at;
    if (filter === 'locked') return !a.earned_at;
    return true;
  });

  const earnedCount = achievements.filter(a => a.earned_at).length;
  const progress = Math.round((earnedCount / achievements.length) * 100) || 0;

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in">
      
      {/* Header Stats */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center gap-6 justify-between relative overflow-hidden">
         {/* Background Decoration */}
         <div className="absolute right-0 top-0 w-32 h-32 bg-yellow-50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

         <div className="flex items-center gap-4 w-full md:w-auto relative z-10">
            <div className="w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center border-4 border-indigo-50 shadow-sm">
               <Award className="w-8 h-8" />
            </div>
            <div>
               <h3 className="text-2xl font-black text-slate-900">{earnedCount} / {achievements.length}</h3>
               <p className="text-sm font-bold text-slate-500">Badges Unlocked</p>
            </div>
         </div>

         {/* Progress Bar */}
         <div className="flex-1 w-full md:max-w-md relative z-10">
            <div className="flex justify-between text-xs font-bold text-slate-400 mb-2">
               <span>Collection Progress</span>
               <span>{progress}%</span>
            </div>
            <div className="h-4 bg-slate-100 rounded-full overflow-hidden border border-slate-200">
               <div 
                 className="h-full bg-linear-to-r from-indigo-500 to-purple-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]" 
                 style={{ width: `${progress}%` }}
               />
            </div>
         </div>
      </div>

      {/* Filter Bar & Smart Sync Button */}
      <div className="flex justify-between items-center sticky top-0 z-10 py-2 bg-slate-50/95 backdrop-blur-sm">
         <div className="flex gap-2 bg-white p-1.5 rounded-xl border border-slate-200 shadow-sm">
            {['all', 'earned', 'locked'].map((f) => (
               <button
                 key={f}
                 onClick={() => setFilter(f as any)}
                 className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-all ${
                    filter === f 
                    ? 'bg-slate-900 text-white shadow-md' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                 }`}
               >
                 {f}
               </button>
            ))}
         </div>

         <button 
           onClick={handleSmartSync} 
           disabled={isSyncing}
           className={`group relative p-3 bg-white border border-slate-200 rounded-xl transition-all shadow-sm active:scale-95 overflow-hidden ${isSyncing ? 'cursor-not-allowed' : 'hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600'}`}
           title="Check for new badges"
         >
            {isSyncing && <div className="absolute inset-0 bg-indigo-100/50 animate-pulse" />}
            <RefreshCw className={`w-4 h-4 relative z-10 ${isSyncing ? 'animate-spin text-indigo-600' : 'text-slate-500 group-hover:rotate-180 transition-transform duration-500 group-hover:text-indigo-600'}`} />
         </button>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-10">
        {filtered.map((ach) => {
          const isEarned = !!ach.earned_at;
          
          return (
            <div 
              key={ach.id} 
              className={`group relative p-4 rounded-2xl border-2 transition-all duration-300 flex items-center gap-4 ${
                 isEarned 
                 ? 'bg-white border-indigo-100 hover:border-indigo-300 hover:shadow-lg hover:-translate-y-0.5' 
                 : 'bg-slate-100/50 border-slate-200 hover:bg-slate-100'
              }`}
            >
               {/* Icon */}
               <BadgeIcon icon={ach.icon || '🏆'} earned={isEarned} />

               {/* Info */}
               <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-2">
                     <h4 className={`font-bold truncate ${isEarned ? 'text-slate-900' : 'text-slate-500'}`}>
                        {ach.name}
                     </h4>
                     {isEarned ? (
                        <div className="shrink-0 flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-200">
                           <CheckCircle2 className="w-3 h-3" />
                           {formatDistanceToNow(new Date(ach.earned_at!))} ago
                        </div>
                     ) : (
                        <Lock className="w-3 h-3 text-slate-300 shrink-0" />
                     )}
                  </div>
                  
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                     {ach.description}
                  </p>
                  
                  {/* Reward Pill */}
                  <div className="mt-3 flex items-center gap-2">
                     <span className={`text-[10px] font-black px-2.5 py-1 rounded-md border ${isEarned ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-200 text-slate-400 border-slate-300'}`}>
                        +{ach.xp_reward} XP
                     </span>
                     
                     {/* New Indicator (Optional visual flair for recently earned) */}
                     {isEarned && new Date(ach.earned_at!).getTime() > Date.now() - 60000 && (
                        <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 animate-pulse">
                           <Sparkles className="w-3 h-3" /> New!
                        </span>
                     )}
                  </div>
               </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
           <div className="col-span-full py-16 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
              <Filter className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No badges found in this category.</p>
              <button onClick={() => setFilter('all')} className="mt-4 text-indigo-600 font-bold text-xs hover:underline">
                 Clear Filter
              </button>
           </div>
        )}
      </div>
    </div>
  );
}