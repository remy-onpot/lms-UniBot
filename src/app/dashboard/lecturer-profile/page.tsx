'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { 
  Search, Archive, Plus, ShieldAlert, GraduationCap, AlertTriangle, 
  CreditCard, FileText, ChevronRight, LayoutDashboard, Crown, Loader2, Lock
} from 'lucide-react';
import { getPlanLimits } from '@/lib/constants'; 
import { ClassService, DashboardClass } from '@/lib/services/class.service';

import { StatsOverview } from '@/components/features/lecturer/StatsOverview';
import { ClassList } from '@/components/features/lecturer/ClassList';
import { UpgradeModal } from '@/components/features/lecturer/UpgradeModal';
import { OverLimitModal } from '@/components/features/lecturer/OverLimitModal';

export default function LecturerConsole() {
  const router = useRouter();
  
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  // Data State
  const [activeClasses, setActiveClasses] = useState<DashboardClass[]>([]);
  const [archivedClasses, setArchivedClasses] = useState<DashboardClass[]>([]);
  
  // Logic State
  const [limits, setLimits] = useState<any>({ max_classes: 1 });
  const [saasUsage, setSaasUsage] = useState(0);
  
  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  
  // Action Modals
  const [targetItem, setTargetItem] = useState<{id: string, name: string, action: 'delete' | 'archive'} | null>(null);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => { fetchLecturerData(); }, []);

  const fetchLecturerData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      const { data: userProfile } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (userProfile?.role !== 'lecturer') return router.push('/dashboard/profile');
      
      setProfile(userProfile);
      const userLimits = getPlanLimits(userProfile.role, userProfile.plan_tier, userProfile.is_course_rep);
      setLimits(userLimits);

      // 1. Fetch All Classes using the Service
      const allClasses = await ClassService.getDashboardClasses(user.id, userProfile.role, userProfile.is_course_rep);

      // 2. Separate Active vs Archived
      const active = allClasses.filter(c => c.status === 'active');
      const archived = allClasses.filter(c => c.status === 'archived');

      // 3. Calculate SaaS Usage (Only SaaS classes count towards limit)
      const currentSaasUsage = active.filter(c => c.type === 'saas').length;

      setMyClassesState(active, archived, currentSaasUsage);
    } catch (e) {
      toast.error("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  const setMyClassesState = (active: DashboardClass[], archived: DashboardClass[], usage: number) => {
    setActiveClasses(active);
    setArchivedClasses(archived);
    setSaasUsage(usage);
  };

  const handleCreateClick = () => {
    // Check limit against SaaS Usage only
    if (saasUsage >= limits.max_classes) {
      setShowUpgradeModal(true);
    } else {
      router.push('/dashboard/create-class');
    }
  };

  const handleAction = async () => {
    if (!targetItem || !profile) return;
    if (targetItem.action === 'delete' && confirmText !== targetItem.name) return toast.error("Name mismatch.");

    try {
      if (targetItem.action === 'archive') {
        await ClassService.archiveClass(targetItem.id, profile.id);
        toast.success("Archived.");
      } else {
        await ClassService.deleteClass(targetItem.id, profile.id);
        toast.success("Deleted permanently.");
      }
      setTargetItem(null); 
      setConfirmText(''); 
      fetchLecturerData(); // Refresh list
    } catch (e: any) { 
      toast.error(e.message); 
    }
  };

  const handleRestore = async (id: string) => {
    if (!profile) return;
    try {
      await ClassService.restoreClass(id, profile.id, profile);
      toast.success("Restored!");
      fetchLecturerData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  // Quick helper for OverLimitModal
  const handleQuickArchive = async (id: string) => {
    if (!profile) return;
    await ClassService.archiveClass(id, profile.id);
    await fetchLecturerData(); 
    toast.success("Class archived.");
  };

  const filteredActive = activeClasses.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredArchived = archivedClasses.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const isOverLimit = saasUsage > limits.max_classes;

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-600" />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      
      {/* --- OVER LIMIT ALERT --- */}
      <OverLimitModal activeClasses={activeClasses} limit={limits.max_classes} onArchive={handleQuickArchive} />

      {isOverLimit && (
        <div className="bg-red-600 text-white px-4 py-3 sticky top-0 z-50 shadow-lg flex justify-between items-center animate-in slide-in-from-top-full">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg"><AlertTriangle className="w-5 h-5 animate-pulse" /></div>
              <div>
                 <p className="font-black text-sm uppercase tracking-wide">Plan Limit Exceeded</p>
                 <p className="text-xs text-red-100">You have {saasUsage} active SaaS classes. Your limit is {limits.max_classes}.</p>
              </div>
            </div>
            <button onClick={() => setShowUpgradeModal(true)} className="text-xs bg-white text-red-600 font-bold px-3 py-1.5 rounded-lg shadow-sm hover:bg-red-50">
               Upgrade Now
            </button>
        </div>
      )}

      {/* --- HEADER --- */}
      <header className="bg-slate-900 border-b border-slate-800 pt-8 pb-16 px-4 md:px-8 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-600 rounded-full blur-[100px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
         
         <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
               <div>
                  <button onClick={() => router.back()} className="text-slate-400 hover:text-white transition flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-4">
                     <ChevronRight className="w-4 h-4 rotate-180" /> Back to Dashboard
                  </button>
                  <div className="flex items-center gap-4">
                     <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/10 shadow-xl">
                        <LayoutDashboard className="w-8 h-8 text-indigo-400" />
                     </div>
                     <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">Lecturer Console</h1>
                        <div className="flex items-center gap-3 mt-1 text-sm font-medium text-slate-400">
                           <span>{profile.full_name}</span>
                           <span className="w-1 h-1 bg-slate-600 rounded-full"></span>
                           <span className="text-indigo-400 uppercase flex items-center gap-1">
                              {profile.plan_tier === 'elite' && <Crown className="w-3 h-3 text-yellow-400 fill-yellow-400" />}
                              {profile.plan_tier} Plan
                           </span>
                           
                           {/* USAGE INDICATOR */}
                           <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full tracking-wider border ${
                             isOverLimit ? 'bg-red-500/20 text-red-300 border-red-500/50' : 'bg-green-500/20 text-green-300 border-green-500/50'
                           }`}>
                              Usage: {saasUsage} / {limits.max_classes}
                           </span>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="flex gap-2">
                  <Button onClick={() => router.push('/dashboard/lecturer-profile/records')} variant="outline" className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white">
                     <FileText className="w-4 h-4 mr-2"/> Records
                  </Button>
                  <Button onClick={() => router.push('/dashboard/billing')} variant="outline" className="bg-indigo-600 border-indigo-500 text-white hover:bg-indigo-500 hover:border-indigo-400 shadow-lg shadow-indigo-900/50">
                     <CreditCard className="w-4 h-4 mr-2"/> Billing
                  </Button>
               </div>
            </div>

            {/* Quick Stats Overlay */}
            <div className="mt-10 p-6 bg-white rounded-2xl border border-slate-200 shadow-xl flex flex-col md:flex-row gap-8">
               <StatsOverview activeClasses={activeClasses} archivedClasses={archivedClasses} />
            </div>
         </div>
      </header>

      {/* --- BODY --- */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 space-y-8">
        
        {/* Actions Bar */}
        <div className="flex flex-col md:flex-row gap-4 items-center">
           <button
             onClick={handleCreateClick}
             className="w-full md:w-auto px-8 py-4 bg-slate-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-slate-800 active:scale-95 transition-all"
           >
             {saasUsage >= limits.max_classes ? <Lock className="w-4 h-4 text-slate-400" /> : <Plus className="w-4 h-4" />}
             Create New Class
           </button>
           
           <div className="flex-1 w-full relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Search classes..." 
                className="w-full pl-12 pr-4 py-3.5 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none font-medium text-slate-900 bg-white transition-all focus:shadow-md"
              />
           </div>
           
           <button 
             onClick={() => setShowArchived(!showArchived)} 
             className={`px-6 py-3.5 rounded-xl font-bold border-2 transition-all flex items-center gap-2 ${
               showArchived ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
             }`}
           >
              <Archive className="w-4 h-4" /> {showArchived ? 'Hide Archives' : 'View Archives'}
           </button>
        </div>

        {/* Active Grid */}
        <div className={`space-y-6 p-6 rounded-3xl border-2 transition-all ${isOverLimit ? 'border-red-200 bg-red-50/20' : 'border-slate-100 bg-white shadow-sm'}`}>
           <div className="flex items-center gap-3 mb-4">
              <div className={`w-3 h-3 rounded-full ${isOverLimit ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
              <h2 className="text-xl font-black text-slate-900">Active Classes</h2>
              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold">{filteredActive.length}</span>
           </div>
           
           <ClassList 
             classes={filteredActive} 
             type="active" 
             onArchive={(id, name) => setTargetItem({ id, name, action: 'archive' })}
             onRestore={handleRestore}
             onDelete={(id, name) => setTargetItem({ id, name, action: 'delete' })}
           />
        </div>

        {/* Archived Grid */}
        {showArchived && (
           <div className="space-y-6 pt-8 border-t-2 border-slate-200 border-dashed">
              <div className="flex items-center gap-3 opacity-50">
                 <div className="w-3 h-3 bg-slate-400 rounded-full"></div>
                 <h2 className="text-xl font-black text-slate-900">Archived</h2>
              </div>
              <ClassList 
                classes={filteredArchived} 
                type="archived"
                onArchive={() => {}}
                onRestore={handleRestore}
                onDelete={(id, name) => setTargetItem({ id, name, action: 'delete' })}
              />
           </div>
        )}

      </div>

      {showUpgradeModal && <UpgradeModal plan={profile.plan_tier || 'free'} onClose={() => setShowUpgradeModal(false)} />}
      
      {targetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-slate-200 scale-100">
             <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm border ${
               targetItem.action === 'delete' ? 'bg-red-50 border-red-100 text-red-600' : 'bg-amber-50 border-amber-100 text-amber-600'
             }`}>
               {targetItem.action === 'delete' ? <ShieldAlert className="w-8 h-8" /> : <Archive className="w-8 h-8" />}
             </div>
             
             <h3 className="text-2xl font-black text-center mb-2 text-slate-900">
               {targetItem.action === 'delete' ? 'Delete Forever?' : 'Archive Class?'}
             </h3>
             <p className="text-center text-slate-500 mb-6 text-sm leading-relaxed px-4">
               {targetItem.action === 'delete' 
                 ? 'This action cannot be undone. All student grades and data will be permanently lost.' 
                 : 'This class will be moved to the archives. You can restore it later if needed.'}
             </p>
             
             {targetItem.action === 'delete' && (
               <div className="mb-6 bg-red-50 p-4 rounded-xl border border-red-100">
                 <p className="text-[10px] text-center text-red-500 font-bold mb-2 uppercase tracking-wide">Type "{targetItem.name}" to confirm</p>
                 <input 
                   className="w-full p-3 bg-white border border-red-200 rounded-lg font-bold text-center outline-none focus:ring-2 focus:ring-red-500 text-slate-900 placeholder:text-slate-300" 
                   placeholder={targetItem.name} 
                   onChange={e => setConfirmText(e.target.value)} 
                   autoFocus
                 />
               </div>
             )}

             <div className="flex gap-3">
               <Button onClick={() => setTargetItem(null)} variant="secondary" className="flex-1 py-3 h-auto text-sm">Cancel</Button>
               <Button 
                 onClick={handleAction} 
                 variant={targetItem.action === 'delete' ? 'danger' : 'primary'} 
                 className={`flex-1 py-3 h-auto text-sm font-bold ${targetItem.action === 'archive' ? 'bg-amber-500 hover:bg-amber-600 border-amber-600' : ''}`}
                 disabled={targetItem.action === 'delete' && confirmText !== targetItem.name}
               >
                 Confirm {targetItem.action === 'delete' ? 'Deletion' : 'Archive'}
               </Button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}