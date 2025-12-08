'use client';
import { 
  BookOpen, Clock, Zap, Calendar, CheckCircle2, Target, Trophy, 
  Flame, Crown, Flag, Sun, Moon, FileText, GraduationCap, ShoppingBag 
} from 'lucide-react';
import { Achievement } from '@/lib/services/gamification.service';

interface OverviewTabProps {
  currentXp: number;
  totalHours: number;
  totalDays: number;
  assignmentsCompleted: number;
  assignmentsTotal: number;
  quizzesCompleted: number;
  quizzesTotal: number;
  weeklyActivity: any[];
  achievements: Achievement[]; // ✅ NEW PROP
}

// Icon Map (Same as AchievementsTab for consistency)
const IconMap: Record<string, any> = {
  Flame, Zap, Crown, Flag, BookOpen, Target, 
  Sun, Moon, Calendar, FileText, GraduationCap, ShoppingBag
};

export function OverviewTab({ 
  currentXp, 
  totalHours, 
  totalDays, 
  assignmentsCompleted, 
  assignmentsTotal,
  quizzesCompleted,
  quizzesTotal,
  weeklyActivity,
  achievements // ✅ Received here
}: OverviewTabProps) {
  
  const assignmentRate = assignmentsTotal > 0 ? Math.round((assignmentsCompleted / assignmentsTotal) * 100) : 0;
  const quizRate = quizzesTotal > 0 ? Math.round((quizzesCompleted / quizzesTotal) * 100) : 0;

  // Chart Scale
  const maxMetric = weeklyActivity.length > 0 ? Math.max(...weeklyActivity.map(d => d.hours), 5) : 5;

  // ✅ LOGIC: Get 3 most recently earned achievements
  const recentBadges = achievements
    .filter(a => a.earned_at) // Only unlocked ones
    .sort((a, b) => new Date(b.earned_at!).getTime() - new Date(a.earned_at!).getTime()) // Newest first
    .slice(0, 3); // Take top 3

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* --- STAT CARDS --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
         {/* 1. Time Invested */}
         <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-green-200 transition">
            <div className="flex items-center gap-2 mb-2 text-slate-500">
               <Clock className="w-4 h-4 text-green-500" />
               <span className="text-[10px] font-bold uppercase tracking-wider">Time</span>
            </div>
            <p className="text-3xl font-black text-slate-900">{totalHours}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">Hours Active</p>
         </div>

         {/* 2. Assignments */}
         <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-200 transition">
            <div className="flex items-center gap-2 mb-2 text-slate-500">
               <BookOpen className="w-4 h-4 text-blue-500" />
               <span className="text-[10px] font-bold uppercase tracking-wider">Assignments</span>
            </div>
            <div className="flex items-end gap-1">
               <p className="text-3xl font-black text-slate-900">{assignmentsCompleted}</p>
               <span className="text-xs text-slate-400 mb-1">/ {assignmentsTotal}</span>
            </div>
            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
               <div className="h-full bg-blue-500" style={{ width: `${assignmentRate}%` }}></div>
            </div>
         </div>

         {/* 3. Quizzes */}
         <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-purple-200 transition">
            <div className="flex items-center gap-2 mb-2 text-slate-500">
               <Target className="w-4 h-4 text-purple-500" />
               <span className="text-[10px] font-bold uppercase tracking-wider">Quizzes</span>
            </div>
            <div className="flex items-end gap-1">
               <p className="text-3xl font-black text-slate-900">{quizzesCompleted}</p>
               <span className="text-xs text-slate-400 mb-1">/ {quizzesTotal}</span>
            </div>
             <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
               <div className="h-full bg-purple-500" style={{ width: `${quizRate}%` }}></div>
            </div>
         </div>

         {/* 4. Lifetime XP */}
         <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-yellow-200 transition">
            <div className="flex items-center gap-2 mb-2 text-slate-500">
               <Zap className="w-4 h-4 text-yellow-500" />
               <span className="text-[10px] font-bold uppercase tracking-wider">Total XP</span>
            </div>
            <p className="text-3xl font-black text-slate-900">{currentXp.toLocaleString()}</p>
            <p className="text-xs text-slate-400 mt-1 font-medium">{totalDays} Days Active</p>
         </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
          
          {/* --- ACTIVITY CHART --- */}
          <div className="md:col-span-2 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <div className="flex items-center justify-between mb-6">
                <div>
                   <h3 className="text-lg font-bold text-slate-900">Study Activity</h3>
                   <p className="text-xs text-slate-400">Hours spent learning this week</p>
                </div>
                <Calendar className="w-5 h-5 text-slate-300" />
             </div>
             {weeklyActivity.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                   <p className="text-sm font-medium">No activity recorded yet.</p>
                </div>
             ) : (
                <div className="flex items-end justify-between gap-3 h-48">
                   {weeklyActivity.map((day, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 group">
                         <div className="w-full bg-slate-50 rounded-t-xl relative flex items-end overflow-hidden h-full group-hover:bg-indigo-50/30 transition">
                            <div 
                              className="w-full bg-linear-to-t from-indigo-500 to-purple-500 rounded-t-xl transition-all duration-700 ease-out group-hover:from-indigo-600 group-hover:to-purple-600 relative"
                              style={{ height: `${(day.hours / maxMetric) * 100}%`, minHeight: day.hours > 0 ? '6px' : '0' }}
                            >
                               <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                                  <div className="bg-slate-900 text-white text-[10px] py-1 px-2 rounded-lg whitespace-nowrap font-bold">
                                     {day.hours.toFixed(1)} hrs
                                  </div>
                               </div>
                            </div>
                         </div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase">{day.day.substring(0,3)}</p>
                      </div>
                   ))}
                </div>
             )}
          </div>

          {/* --- RECENT ACHIEVEMENTS (DYNAMIC) --- */}
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
             <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Recent Unlocks</h3>
                <Trophy className="w-5 h-5 text-yellow-500" />
             </div>
             
             {recentBadges.length === 0 ? (
               <div className="flex-1 flex flex-col items-center justify-center text-center py-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                  <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center mb-2">
                     <Trophy className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-bold text-slate-500">No badges yet</p>
                  <p className="text-xs text-slate-400 mt-1">Complete quizzes to earn!</p>
               </div>
             ) : (
               <div className="space-y-3">
                  {recentBadges.map((ach) => {
                    const Icon = IconMap[ach.icon_name] || Trophy;
                    return (
                      <div key={ach.id} className="flex items-center gap-3 p-3 bg-yellow-50/50 rounded-xl border border-yellow-100 hover:border-yellow-200 transition">
                         <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-xl shadow-sm text-yellow-600">
                            <Icon className="w-5 h-5" />
                         </div>
                         <div>
                            <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{ach.name}</h4>
                            <p className="text-[10px] text-slate-500">Unlocked {new Date(ach.earned_at!).toLocaleDateString()}</p>
                         </div>
                      </div>
                    )
                  })}
               </div>
             )}
          </div>

      </div>
    </div>
  );
}