'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, useMotionValue, useSpring, useTransform, Variants } from 'framer-motion';
import { UserProfile, Class } from '@/types';
// ✅ FIXED: Import Server Actions instead of Service
import { createClassAction, archiveClassAction, updateClassAction } from '@/app/actions';
import { 
  Plus, Users, BookOpen, Archive, 
  Trash2, Layers, Calendar, ArrowRight, Settings
} from 'lucide-react';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
interface LecturerDashboardProps {
  profile: UserProfile;
  classes: Class[];
  modules?: any[];
}

const springConfig = { stiffness: 400, damping: 30 };

function TiltCard({ children, className, onClick }: { children: React.ReactNode, className?: string, onClick?: () => void }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseX = useSpring(x, springConfig);
  const mouseY = useSpring(y, springConfig);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], ["10deg", "-10deg"]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-10deg", "10deg"]);

  return (
    <motion.div
      style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - rect.left) / rect.width - 0.5);
        y.set((e.clientY - rect.top) / rect.height - 0.5);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-[20px] border border-white/10 shadow-lg hover:border-indigo-500/40 hover:shadow-[0_0_30px_rgba(99,102,241,0.15)] transition-all group ${className}`}
    >
      {children}
    </motion.div>
  );
}

function CyberButton({ onClick, icon: Icon, children, variant = 'primary', disabled = false }: any) {
  const baseStyles = "relative flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none";
  const variants = {
    primary: "bg-indigo-600 text-white shadow-[inset_0px_1px_0px_rgba(255,255,255,0.2),0px_4px_10px_rgba(79,70,229,0.4)] hover:bg-indigo-500",
    secondary: "bg-slate-800 text-slate-300 shadow-[inset_0px_1px_0px_rgba(255,255,255,0.05),0px_4px_10px_rgba(0,0,0,0.3)] hover:bg-slate-700",
    danger: "bg-red-900/20 text-red-400 border border-red-500/20 hover:bg-red-900/40"
  };

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyles} ${variants[variant as keyof typeof variants]}`}>
      {Icon && <Icon size={16} />}
      {children}
    </button>
  );
}

export default function LecturerDashboard({ profile, classes, modules = [] }: LecturerDashboardProps) {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [localClasses, setLocalClasses] = useState<Class[]>(classes);
  
  const [newClass, setNewClass] = useState({ title: '', code: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- ACTIONS ---
  const handleCreateClass = async () => {
    if (!newClass.title || !newClass.code) return toast.error("Required fields missing");
    setIsSubmitting(true);
    
    // ✅ FIXED: Calling Server Action
    const res = await createClassAction({
        name: newClass.title,
        access_code: newClass.code,
        type: 'cohort',
        owner_id: profile.id,
        lecturer_id: profile.id
    });

    if (res.success) {
      toast.success("Protocol Initialized");
      setShowCreateModal(false);
      setNewClass({ title: '', code: '' });
      // We rely on revalidatePath in the action, but can reload to force state sync
      window.location.reload(); 
    } else {
      toast.error(res.error || "Failed to create class");
    }
    setIsSubmitting(false);
  };

  const handleArchive = async (classId: string) => {
    // ✅ FIXED: Calling Server Action
    const res = await archiveClassAction(classId);
    if (res.success) {
        toast.success("Archived");
        setLocalClasses(prev => prev.map(c => c.id === classId ? { ...c, status: 'archived' } : c)); 
    } else {
        toast.error("Error archiving class");
    }
  };

  const handleRestore = async (classId: string) => {
    // ✅ FIXED: Calling Server Action
    const res = await updateClassAction(classId, { status: 'active' });
    if (res.success) {
        toast.success("Restored");
        setLocalClasses(prev => prev.map(c => c.id === classId ? { ...c, status: 'active' } : c));
    } else {
        toast.error("Error restoring class");
    }
  };

  const handleDelete = async (classId: string) => {
    if(!confirm("Are you sure? This action is irreversible.")) return;
    toast.info("Deletion logic to be implemented via Action");
  };

  const activeClasses = localClasses.filter(c => c.status === 'active');
  const archivedClasses = localClasses.filter(c => c.status === 'archived');
  const totalStudents = localClasses.reduce((sum, c) => sum + (c._count?.enrollments || 0), 0);

  const container: Variants = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };
  const item: Variants = {
    hidden: { opacity: 0, scale: 0.9 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 400, damping: 30 } }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-indigo-500/30 pb-20">
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.04] pointer-events-none z-50"></div>
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-indigo-900/10 via-black to-black pointer-events-none z-0"></div>

      <div className="relative z-10 max-w-[1400px] mx-auto p-8">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-end mb-10 pb-6 border-b border-white/5">
          <div>
            <div className="flex items-center gap-2 mb-2">
               <div className="px-2 py-0.5 rounded border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-[10px] font-bold tracking-widest uppercase">
                 Lecturer Node
               </div>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Overview</h1>
          </div>
          <div className="flex gap-4 mt-4 md:mt-0">
             <CyberButton variant="secondary" icon={Settings}>Settings</CyberButton>
             <CyberButton variant="primary" icon={Plus} onClick={() => setShowCreateModal(true)}>Initialize Class</CyberButton>
          </div>
        </header>

        {/* BENTO GRID */}
        <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 md:grid-cols-4 gap-6">
          
          {/* STATS (Vertical Stack) */}
          <motion.div variants={item} className="md:col-span-1 space-y-6">
             <TiltCard className="p-6 bg-gradient-to-br from-white/5 to-transparent">
                <div className="flex justify-between items-start mb-8">
                   <div className="p-3 rounded-lg bg-indigo-500/20 text-indigo-400"><Users size={20} /></div>
                   <span className="text-[10px] text-slate-500 font-mono">TOTAL_STUDENTS</span>
                </div>
                <div className="text-5xl font-black text-white">{totalStudents}</div>
             </TiltCard>

             <TiltCard className="p-6 bg-gradient-to-br from-white/5 to-transparent">
                <div className="flex justify-between items-start mb-8">
                   <div className="p-3 rounded-lg bg-purple-500/20 text-purple-400"><Layers size={20} /></div>
                   <span className="text-[10px] text-slate-500 font-mono">ACTIVE_MODULES</span>
                </div>
                <div className="text-5xl font-black text-white">{modules.length}</div>
             </TiltCard>
          </motion.div>

          {/* ACTIVE CLASSES (3 Cols Wide) */}
          <motion.div variants={item} className="md:col-span-3">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full content-start">
                {activeClasses.map(cls => (
                  <motion.div 
                    key={cls.id} 
                    whileHover={{ y: -5 }}
                    className="group relative h-64 bg-slate-900/50 border border-white/5 hover:border-indigo-500/50 rounded-2xl p-6 flex flex-col justify-between transition-all"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <span className="font-mono text-[10px] text-indigo-400 bg-indigo-950/50 px-2 py-1 rounded border border-indigo-500/20">
                          {cls.access_code}
                        </span>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => handleArchive(cls.id)} className="text-slate-500 hover:text-orange-400 transition" title="Archive">
                                <Archive size={14} />
                            </button>
                        </div>
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{cls.name}</h3>
                      <div className="h-1 w-10 bg-indigo-500 rounded-full" />
                    </div>

                    <div className="flex items-end justify-between">
                       <div className="text-xs text-slate-500">
                          <p className="flex items-center gap-2 mb-1"><Users size={12} /> {cls._count?.enrollments} Enrolled</p>
                          <p className="flex items-center gap-2"><BookOpen size={12} /> {cls._count?.courses} Modules</p>
                       </div>
                       <button 
                         onClick={() => router.push(`/dashboard/class/${cls.id}`)}
                         className="p-3 rounded-xl bg-white text-black hover:bg-indigo-400 transition-colors"
                       >
                         <ArrowRight size={18} />
                       </button>
                    </div>
                  </motion.div>
                ))}
                
                {/* Empty State / Add New */}
                <button 
                  onClick={() => setShowCreateModal(true)}
                  className="h-64 rounded-2xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-600 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all gap-4 group"
                >
                   <div className="p-4 rounded-full bg-slate-900 group-hover:bg-indigo-950 transition-colors">
                     <Plus size={24} />
                   </div>
                   <span className="text-xs font-bold uppercase tracking-widest">Deploy New Class</span>
                </button>
             </div>
          </motion.div>

          {/* ARCHIVED CLASSES SECTION */}
          {archivedClasses.length > 0 && (
            <motion.div variants={item} className="md:col-span-4 mt-8 pt-8 border-t border-white/5">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Archive size={16} /> Archived Protocols
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {archivedClasses.map(cls => (
                        <div key={cls.id} className="bg-slate-900/30 border border-white/5 p-4 rounded-xl flex justify-between items-center opacity-75 hover:opacity-100 transition-opacity">
                            <div>
                                <h4 className="font-bold text-slate-300 text-sm">{cls.name}</h4>
                                <span className="text-[10px] font-mono text-slate-600">{cls.access_code}</span>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => handleRestore(cls.id)} className="p-2 hover:bg-indigo-500/20 text-indigo-400 rounded transition" title="Restore">
                                    <RefreshCw size={14} />
                                </button>
                                <button onClick={() => handleDelete(cls.id)} className="p-2 hover:bg-red-500/20 text-red-400 rounded transition" title="Delete">
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </motion.div>
          )}

        </motion.div>
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0A0A0A] border border-white/10 p-8 rounded-3xl w-full max-w-md shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500" />
            <h2 className="text-2xl font-black text-white mb-6">Deploy Protocol</h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Class Designation</label>
                <input 
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-indigo-500 outline-none transition-colors mt-1"
                  placeholder="e.g. Advanced Cybersecurity"
                  value={newClass.title}
                  onChange={e => setNewClass({...newClass, title: e.target.value})}
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Access Code</label>
                <input 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white font-mono focus:border-indigo-500 outline-none transition-colors mt-1 uppercase"
                  placeholder="e.g. CS-404"
                  value={newClass.code}
                  onChange={e => setNewClass({...newClass, code: e.target.value.toUpperCase()})}
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button onClick={() => setShowCreateModal(false)} className="flex-1 py-3 font-bold text-slate-500 hover:text-white transition">Abort</button>
              <CyberButton onClick={handleCreateClass} disabled={isSubmitting}>
                {isSubmitting ? <span className="animate-pulse">Deploying...</span> : 'Initialize'}
              </CyberButton>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}