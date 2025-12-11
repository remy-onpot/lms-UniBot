'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { UserProfile } from '@/types';
import { 
  Plus, Search, Archive, AlertTriangle, LayoutDashboard, Crown, 
  Lock, BookOpen, Users, Settings, FileText, CreditCard, ChevronRight
} from 'lucide-react';
import { getPlanLimits } from '@/lib/constants'; 
import { UniBotMascot } from '@/components/ui/UniBotMascot'; 
import { ClassService, DashboardClass } from '@/lib/services/class.service';
import { toast } from 'sonner';

import { StatsOverview } from '@/components/features/lecturer/StatsOverview';
import { ClassList } from '@/components/features/lecturer/ClassList';
import { UpgradeModal } from '@/components/features/lecturer/UpgradeModal';
import { OverLimitModal } from '@/components/features/lecturer/OverLimitModal';

interface LecturerDashboardProps {
  profile: UserProfile;
  classes: any[];
}

export function LecturerDashboard({ profile, classes }: LecturerDashboardProps) {
  const router = useRouter();
  
  // -- STATE --
  const [activeClasses, setActiveClasses] = useState<DashboardClass[]>([]);
  const [archivedClasses, setArchivedClasses] = useState<DashboardClass[]>([]);
  const [limits, setLimits] = useState<any>({ max_classes: 1 });
  const [saasUsage, setSaasUsage] = useState(0);
  
  const [search, setSearch] = useState('');
  const [viewArchived, setViewArchived] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  
  // -- INIT --
  useEffect(() => {
    // Process initial props
    const userLimits = getPlanLimits(profile.role, profile.plan_tier, profile.is_course_rep);
    setLimits(userLimits);

    const active = classes.filter(c => c.status === 'active');
    const archived = classes.filter(c => c.status === 'archived');
    
    setActiveClasses(active);
    setArchivedClasses(archived);
    
    // Usage only counts SaaS classes (Lecturer owned)
    setSaasUsage(active.filter(c => c.type === 'saas').length);
  }, [profile, classes]);

  const isOverLimit = saasUsage > limits.max_classes;

  // -- HANDLERS --

  const refreshData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const updated = await ClassService.getDashboardClasses(user.id, profile.role, profile.is_course_rep);
    
    const active = updated.filter((c: any) => c.status === 'active');
    const archived = updated.filter((c: any) => c.status === 'archived');
    setActiveClasses(active);
    setArchivedClasses(archived);
    setSaasUsage(active.filter((c: any) => c.type === 'saas').length);
  };

  const handleCreate = () => {
    if (saasUsage >= limits.max_classes) setShowUpgrade(true);
    else router.push('/dashboard/create-class');
  };

  const handleArchive = async (id: string, name: string) => {
    // 🛡️ SECURITY: Prevent archiving Cohorts
    const target = activeClasses.find(c => c.id === id);
    if (target?.type === 'cohort') {
        toast.error("Restricted: You cannot archive a University Cohort.");
        return;
    }

    try {
        await ClassService.archiveClass(id, profile.id);
        toast.success(`Archived ${name}`);
        refreshData();
    } catch (e: any) {
        toast.error(e.message || "Failed to archive");
    }
  };

  const handleRestore = async (id: string) => {
    // Check limits before restore
    if (saasUsage >= limits.max_classes) {
        toast.error("Plan limit reached. Cannot restore.");
        return;
    }
    try {
        await ClassService.restoreClass(id, profile.id, profile);
        toast.success("Class restored!");
        refreshData();
    } catch (e: any) {
        toast.error(e.message);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    // 🛡️ SECURITY: Prevent deleting Cohorts
    const target = archivedClasses.find(c => c.id === id);
    if (target?.type === 'cohort') {
        toast.error("Restricted: You cannot delete a University Cohort.");
        return;
    }

    if (!confirm(`Are you sure you want to permanently delete ${name}? This cannot be undone.`)) return;
    
    try {
        await ClassService.deleteClass(id, profile.id);
        toast.success("Class deleted permanently.");
        refreshData();
    } catch (e: any) {
        toast.error(e.message);
    }
  };

  // Filter
  const displayClasses = (viewArchived ? archivedClasses : activeClasses)
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      {/* 🔴 Alerts */}
      <OverLimitModal activeClasses={activeClasses} limit={limits.max_classes} onArchive={(id) => handleArchive(id, 'Class')} />
      
      {isOverLimit && (
        <div className="sticky top-0 z-50 bg-red-600 text-white px-4 py-3 shadow-md flex justify-between items-center animate-in slide-in-from-top-full">
           <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <div className="text-xs md:text-sm font-bold">
                 PLAN LIMIT EXCEEDED: {saasUsage}/{limits.max_classes} Classes. Please archive old classes.
              </div>
           </div>
           <button onClick={() => setShowUpgrade(true)} className="bg-white text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm hover:bg-red-50">
              Upgrade
           </button>
        </div>
      )}

      {/* 🚀 Header */}
      <header className="bg-slate-900 pt-10 pb-24 px-6 border-b border-slate-800 relative overflow-hidden">
         {/* Background Glow */}
         <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[150px] opacity-20 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>

         <div className="max-w-7xl mx-auto relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex-1">
               <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                  <LayoutDashboard className="w-8 h-8 text-indigo-400" /> 
                  Lecturer Console
               </h1>
               <div className="flex items-center gap-3 mt-2 text-sm font-medium text-slate-400">
                  <span>{profile.full_name}</span>
                  <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                  <span className="flex items-center gap-1 text-indigo-400 uppercase tracking-wider text-xs font-bold">
                     {profile.plan_tier === 'elite' && <Crown className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                     {profile.plan_tier} Plan
                  </span>
               </div>
               
               {/* Quick Buttons (Fully Functional) */}
               <div className="flex flex-wrap gap-3 mt-6">
                  <button 
                    onClick={() => router.push('/dashboard/profile')} 
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-bold border border-slate-700 hover:bg-slate-700 hover:text-white transition flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" /> Settings
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/lecturer-profile/records')}
                    className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-sm font-bold border border-slate-700 hover:bg-slate-700 hover:text-white transition flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> Records
                  </button>
                  <button 
                    onClick={() => router.push('/dashboard/billing')}
                    className="px-4 py-2 bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 rounded-xl text-sm font-bold hover:bg-indigo-600/30 transition flex items-center gap-2"
                  >
                    <CreditCard className="w-4 h-4" /> Billing
                  </button>
               </div>
            </div>

            {/* 🤖 MASCOT (Visible on Mobile & Desktop) */}
            <div className="relative w-32 h-32 md:w-40 md:h-40 self-end md:self-auto shrink-0 transition-transform hover:scale-105">
               <UniBotMascot 
                 size={160} 
                 emotion={isOverLimit ? 'sad' : 'cool'} 
                 action={isOverLimit ? 'none' : 'wave'} 
                 className="drop-shadow-2xl"
               />
            </div>
         </div>

         {/* Stats Cards (Floating) */}
         <div className="max-w-7xl mx-auto relative z-20 mt-8">
            <StatsOverview activeClasses={activeClasses} archivedClasses={archivedClasses} />
         </div>
      </header>

      {/* 📂 Main Content */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 space-y-8">
         
         {/* Filters Bar */}
         <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96 group">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
               <input 
                 value={search} 
                 onChange={(e) => setSearch(e.target.value)} 
                 placeholder="Search classes..." 
                 className="w-full pl-12 pr-4 py-3 bg-white border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 font-medium text-slate-700 transition-all shadow-sm"
               />
            </div>

            <div className="flex gap-3 w-full md:w-auto">
               <div className="flex bg-slate-200 p-1 rounded-xl">
                  <button 
                    onClick={() => setViewArchived(false)} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${!viewArchived ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Active
                  </button>
                  <button 
                    onClick={() => setViewArchived(true)} 
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewArchived ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Archived
                  </button>
               </div>
               <button 
                 onClick={handleCreate}
                 className="px-6 py-2 bg-slate-900 text-white rounded-xl text-sm font-bold shadow-lg hover:bg-slate-800 transition flex items-center gap-2 active:scale-95"
               >
                  {saasUsage >= limits.max_classes ? <Lock className="w-4 h-4 text-white/50" /> : <Plus className="w-4 h-4" />} 
                  Create
               </button>
            </div>
         </div>

         {/* Class Grid */}
         <div className={`
            bg-white rounded-3xl p-6 border-2 min-h-[300px]
            ${isOverLimit && !viewArchived ? 'border-red-100 bg-red-50/10' : 'border-slate-100'}
         `}>
            {displayClasses.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
                     {viewArchived ? <Archive className="w-8 h-8" /> : <BookOpen className="w-8 h-8" />}
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">No classes found</h3>
                  <p className="text-slate-500 text-sm">
                     {viewArchived ? "Archive is empty." : "Create your first class to get started."}
                  </p>
               </div>
            ) : (
               <ClassList 
                 classes={displayClasses} 
                 type={viewArchived ? 'archived' : 'active'}
                 onArchive={handleArchive} 
                 onRestore={handleRestore}
                 onDelete={handleDelete}
               />
            )}
         </div>
      </div>

      {showUpgrade && <UpgradeModal plan={profile.plan_tier} onClose={() => setShowUpgrade(false)} />}
    </div>
  );
}