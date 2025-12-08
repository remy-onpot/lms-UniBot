'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { 
  Search, Archive, Plus, Users, LogOut, ShieldAlert, GraduationCap, Lock, AlertTriangle, CreditCard, FileText
} from 'lucide-react';
import { getPlanLimits } from '@/lib/constants'; 

import { StatsOverview } from '@/components/features/lecturer/StatsOverview';
import { ClassList } from '@/components/features/lecturer/ClassList';
import { UpgradeModal } from '@/components/features/lecturer/UpgradeModal';
import { OverLimitModal } from '@/components/features/lecturer/OverLimitModal';

export default function LecturerProfile() {
  const router = useRouter();
  // ... (Keep existing state & useEffects identical) ...
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [archivedClasses, setArchivedClasses] = useState<any[]>([]);
  const [limits, setLimits] = useState<any>({ max_classes: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [targetItem, setTargetItem] = useState<{id: string, name: string, action: 'delete' | 'archive'} | null>(null);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => { fetchLecturerData(); }, []);

  const fetchLecturerData = async () => {
    // ... (Keep existing fetch logic) ...
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    const { data: userProfile } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (userProfile?.role !== 'lecturer') return router.push('/dashboard/profile');
    
    setProfile(userProfile);
    const userLimits = getPlanLimits(userProfile.role, userProfile.plan_tier, userProfile.is_course_rep);
    setLimits(userLimits);

    const { data: active } = await supabase.from('classes').select('*, courses(count)').eq('lecturer_id', user.id).eq('status', 'active');
    const { data: archived } = await supabase.from('classes').select('*').eq('lecturer_id', user.id).eq('status', 'archived');

    setMyClasses(active?.map(c => ({ ...c, course_count: c.courses[0]?.count || 0, studentCount: c.student_count || 0 })) || []);
    setArchivedClasses(archived || []);
    setLoading(false);
  };

  const handleCreateClick = () => {
    if (myClasses.length >= limits.max_classes) {
      if (limits.type === 'cohort') toast.error("Limit reached.");
      else setShowUpgradeModal(true);
    } else {
      router.push('/dashboard/create-class');
    }
  };

  const handleAction = async () => {
    if (!targetItem) return;
    if (targetItem.action === 'delete' && confirmText !== targetItem.name) return toast.error("Name mismatch.");

    try {
      if (targetItem.action === 'archive') {
        await supabase.from('classes').update({ status: 'archived' }).eq('id', targetItem.id);
        toast.success("Archived.");
      } else {
        await supabase.from('classes').delete().eq('id', targetItem.id);
        toast.success("Deleted.");
      }
      setTargetItem(null); setConfirmText(''); fetchLecturerData();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleRestore = async (id: string) => {
    if (myClasses.length >= limits.max_classes) return toast.error("Plan limit reached. Archive a class first.");
    await supabase.from('classes').update({ status: 'active' }).eq('id', id);
    toast.success("Restored!");
    fetchLecturerData();
  };

  const handleQuickArchive = async (id: string) => {
    await supabase.from('classes').update({ status: 'archived' }).eq('id', id);
    await fetchLecturerData(); 
    toast.success("Class archived.");
  };

  const filteredActive = myClasses.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredArchived = archivedClasses.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const isOverLimit = myClasses.length > limits.max_classes;

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50">
      
      <OverLimitModal activeClasses={myClasses} limit={limits.max_classes} onArchive={handleQuickArchive} />

      {isOverLimit && (
        <div className="bg-red-600 text-white px-4 py-3 sticky top-0 z-50 shadow-md flex justify-between items-center animate-in slide-in-from-top-full">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
              <p className="font-bold text-sm">Limit Exceeded! Active: {myClasses.length} / Limit: {limits.max_classes}</p>
            </div>
            <span className="text-xs bg-red-800 px-2 py-1 rounded">Archive {myClasses.length - limits.max_classes} class(es)</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-24">
        
        {/* Header */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-linear-to-br from-indigo-50 to-blue-50 rounded-full -mr-20 -mt-20 blur-3xl opacity-50"></div>
           
           <div className="relative flex flex-col md:flex-row justify-between gap-6">
              <div className="flex items-center gap-5">
                 <div className="w-16 h-16 bg-linear-to-br from-slate-800 to-slate-900 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0">
                    <GraduationCap className="w-8 h-8" />
                 </div>
                 <div>
                    <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Lecturer Console</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                       <span className="text-slate-500 font-medium">{profile.full_name}</span>
                       <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold uppercase rounded-full tracking-wider">
                          {profile.plan_tier?.replace('_', ' ') || 'Free Tier'}
                       </span>
                       <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full tracking-wider border ${
                         isOverLimit ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'
                       }`}>
                          Usage: {myClasses.length} / {limits.max_classes}
                       </span>
                    </div>
                 </div>
              </div>
              
              <div className="flex flex-wrap gap-3">
                 <Button onClick={() => router.push('/dashboard/lecturer-profile/records')} variant="outline" className="border-slate-300 gap-2">
                    <FileText className="w-4 h-4"/> Historical Records
                 </Button>
                 <Button onClick={() => router.push('/dashboard/billing')} variant="outline" className="border-slate-300 gap-2">
                    <CreditCard className="w-4 h-4"/> Billing
                 </Button>
                 <Button onClick={() => router.push('/dashboard')} variant="outline" className="border-slate-300">View as Student</Button>
                 <Button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} variant="danger" className="bg-red-50 text-red-600 border-red-100 hover:bg-red-100"><LogOut className="w-4 h-4" /></Button>
              </div>
           </div>

           <div className="mt-8 pt-8 border-t border-slate-100">
              <StatsOverview activeClasses={myClasses} archivedClasses={archivedClasses} />
           </div>
        </div>

        {/* Action Bar */}
        <div className="flex flex-col sm:flex-row gap-3">
           <button
             onClick={handleCreateClick}
             className="flex-1 group relative overflow-hidden bg-linear-to-r from-indigo-600 to-purple-600 p-4 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all flex items-center justify-center gap-2 text-white font-bold"
           >
             {myClasses.length >= limits.max_classes ? <Lock className="w-5 h-5 text-yellow-300" /> : <Plus className="w-5 h-5" />}
             Create New Class
           </button>
           
           <div className="relative flex-1">
              <Search className="absolute left-4 top-3.5 w-5 h-5 text-slate-400" />
              <input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Search..." 
                className="w-full pl-12 pr-4 py-4 rounded-xl border-2 border-slate-200 focus:border-indigo-500 outline-none font-medium text-slate-900 bg-white"
              />
           </div>
           
           <button onClick={() => setShowArchived(!showArchived)} className="px-6 py-4 bg-white border-2 border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2">
              <Archive className="w-5 h-5" /> {showArchived ? 'Hide' : 'Show'} Archived
           </button>
        </div>

        {/* Active Classes */}
        <div className={`space-y-6 p-6 rounded-3xl border-2 transition-colors ${isOverLimit ? 'border-red-200 bg-red-50/30' : 'border-transparent'}`}>
           <div className="flex items-center gap-2">
              <div className={`w-2 h-8 rounded-full ${isOverLimit ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
              <h2 className="text-xl font-black text-slate-900">Active Cohorts</h2>
           </div>
           
           <ClassList 
             classes={filteredActive} 
             type="active" 
             onArchive={(id, name) => setTargetItem({ id, name, action: 'archive' })}
             onRestore={handleRestore}
             onDelete={(id, name) => setTargetItem({ id, name, action: 'delete' })}
           />
        </div>

        {/* Archived Classes */}
        {showArchived && (
           <div className="space-y-6 pt-8 border-t-2 border-slate-200">
              <div className="flex items-center gap-2 opacity-50">
                 <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border-2 border-slate-100 animate-in zoom-in-95">
             <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md ${
               targetItem.action === 'delete' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
             }`}>
               {targetItem.action === 'delete' ? <ShieldAlert className="w-8 h-8" /> : <Archive className="w-8 h-8" />}
             </div>
             
             <h3 className="text-2xl font-black text-center mb-2 text-slate-900">
               {targetItem.action === 'delete' ? 'Delete Forever?' : 'Archive Class?'}
             </h3>
             <p className="text-center text-slate-500 mb-6 text-sm">
               {targetItem.action === 'delete' ? 'This cannot be undone. All grades will be lost.' : 'Class will be hidden but safe.'}
             </p>
             
             {targetItem.action === 'delete' && (
               <div className="mb-4">
                 <p className="text-xs text-center text-slate-400 font-bold mb-2 uppercase">Type "{targetItem.name}" to confirm</p>
                 <input 
                   className="w-full p-3 border-2 border-red-100 bg-red-50/50 rounded-xl font-bold text-center outline-none focus:border-red-500 text-slate-900" 
                   placeholder={targetItem.name} 
                   onChange={e => setConfirmText(e.target.value)} 
                   autoFocus
                 />
               </div>
             )}

             <div className="flex gap-3">
               <Button onClick={() => setTargetItem(null)} variant="secondary" className="flex-1 py-3 h-auto text-base">Cancel</Button>
               <Button 
                 onClick={handleAction} 
                 variant={targetItem.action === 'delete' ? 'danger' : 'primary'} 
                 className={`flex-1 py-3 h-auto text-base ${targetItem.action === 'archive' ? 'bg-orange-500 hover:bg-orange-600' : ''}`}
                 disabled={targetItem.action === 'delete' && confirmText !== targetItem.name}
               >
                 Confirm
               </Button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}