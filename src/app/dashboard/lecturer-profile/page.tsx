'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';
import { Trash2, Archive, Book, Users, LogOut, ShieldAlert, Undo2 } from 'lucide-react';

export default function LecturerProfile() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [myClasses, setMyClasses] = useState<any[]>([]);
  const [archivedClasses, setArchivedClasses] = useState<any[]>([]);
  
  // Modal State
  const [targetItem, setTargetItem] = useState<{id: string, name: string, type: 'class' | 'course', action: 'delete' | 'archive'} | null>(null);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    fetchLecturerData();
  }, []);

  const fetchLecturerData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    const { data: userProfile } = await supabase.from('users').select('*').eq('id', user.id).single();
    if (userProfile?.role !== 'lecturer') return router.push('/dashboard/profile');
    setProfile(userProfile);

    // Fetch Active Classes
    const { data: active } = await supabase.from('classes').select('*').eq('lecturer_id', user.id).eq('status', 'active');
    setMyClasses(active || []);

    // Fetch Archived Classes
    const { data: archived } = await supabase.from('classes').select('*').eq('lecturer_id', user.id).eq('status', 'archived');
    setArchivedClasses(archived || []);

    setLoading(false);
  };

  const handleAction = async () => {
    if (!targetItem) return;
    
    // Safety Check for Hard Delete
    if (targetItem.action === 'delete' && confirmText !== targetItem.name) {
      toast.error("Confirmation name does not match.");
      return;
    }

    try {
      if (targetItem.action === 'archive') {
        await supabase.from('classes').update({ status: 'archived' }).eq('id', targetItem.id);
        toast.success("Class archived successfully.");
      } else if (targetItem.action === 'delete') {
        // SQL CASCADE handles the cleanup of courses/topics/quizzes
        await supabase.from('classes').delete().eq('id', targetItem.id);
        toast.success("Class permanently deleted.");
      }
      
      setTargetItem(null);
      setConfirmText('');
      fetchLecturerData();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleRestore = async (id: string) => {
    await supabase.from('classes').update({ status: 'active' }).eq('id', id);
    toast.success("Class restored!");
    fetchLecturerData();
  };

  if (loading) return <div className="p-10 text-center">Loading Console...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
              <span className="bg-indigo-600 text-white p-2 rounded-lg text-2xl">🎓</span>
              Lecturer Console
            </h1>
            <p className="text-slate-500 mt-2">Manage your cohorts and content.</p>
          </div>
          <div className="flex gap-3">
             <Button onClick={() => router.push('/dashboard')} variant="outline">Student View</Button>
             <Button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} variant="danger" className="flex gap-2"><LogOut size={16}/> Logout</Button>
          </div>
        </div>

        {/* ACTIVE CLASSES */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2">
            <Users className="text-blue-600" /> Active Cohorts
          </h2>
          <div className="space-y-4">
            {myClasses.map(cls => (
              <div key={cls.id} className="p-5 border rounded-xl flex justify-between items-center hover:bg-slate-50 transition">
                <div>
                  <h3 className="font-bold text-lg text-slate-900">{cls.name}</h3>
                  <p className="text-sm text-slate-500 font-mono mt-1 bg-slate-100 px-2 py-0.5 rounded inline-block">Code: {cls.access_code}</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setTargetItem({ id: cls.id, name: cls.name, type: 'class', action: 'archive' })}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-orange-600 bg-orange-50 hover:bg-orange-100 rounded-lg transition"
                  >
                    <Archive size={16} /> Archive
                  </button>
                </div>
              </div>
            ))}
            {myClasses.length === 0 && <p className="text-slate-400 italic">No active classes.</p>}
          </div>
        </div>

        {/* ARCHIVED CLASSES */}
        {archivedClasses.length > 0 && (
          <div className="bg-slate-100 p-8 rounded-2xl border border-slate-200 opacity-80 hover:opacity-100 transition">
            <h2 className="text-xl font-bold text-slate-700 mb-6 flex items-center gap-2">
              <Archive className="text-slate-500" /> Archived Cohorts
            </h2>
            <div className="space-y-4">
              {archivedClasses.map(cls => (
                <div key={cls.id} className="p-5 bg-white border rounded-xl flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-slate-600">{cls.name}</h3>
                    <p className="text-xs text-slate-400">Archived</p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleRestore(cls.id)}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition"
                    >
                      <Undo2 size={16} /> Restore
                    </button>
                    <button 
                      onClick={() => setTargetItem({ id: cls.id, name: cls.name, type: 'class', action: 'delete' })}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition"
                    >
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CONFIRMATION MODAL */}
      {targetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl border-2 border-slate-100">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${targetItem.action === 'delete' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
              {targetItem.action === 'delete' ? <ShieldAlert size={32} /> : <Archive size={32} />}
            </div>
            
            <h3 className="text-2xl font-black text-center text-slate-900 mb-2">
              {targetItem.action === 'delete' ? 'Delete Forever?' : 'Archive Class?'}
            </h3>
            
            <p className="text-center text-slate-500 mb-6">
              {targetItem.action === 'delete' 
                ? "This will permanently remove all courses, quizzes, and student grades. This cannot be undone." 
                : "This will hide the class from your main view. Data is preserved."}
            </p>

            {targetItem.action === 'delete' && (
              <>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
                  Type <span className="text-slate-900 select-all">"{targetItem.name}"</span> to confirm:
                </label>
                <input 
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  className="w-full border-2 border-red-200 focus:border-red-500 outline-none p-3 rounded-xl font-bold text-slate-900 mb-6"
                  placeholder={targetItem.name}
                />
              </>
            )}

            <div className="flex gap-3">
              <button onClick={() => { setTargetItem(null); setConfirmText(''); }} className="flex-1 py-3 bg-slate-100 font-bold text-slate-600 rounded-xl hover:bg-slate-200">Cancel</button>
              <button 
                onClick={handleAction} 
                disabled={targetItem.action === 'delete' && confirmText !== targetItem.name}
                className={`flex-1 py-3 font-bold text-white rounded-xl transition disabled:opacity-50 ${targetItem.action === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}
              >
                {targetItem.action === 'delete' ? 'Delete' : 'Archive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}