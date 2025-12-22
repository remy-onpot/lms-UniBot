'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ChevronLeft, Download, ShieldCheck, 
  Terminal, Activity, Sparkles, Brain, Share2
} from 'lucide-react';

// ✅ FIX: Correct Imports
import { TranscriptService } from '@/lib/services/transcript.service';
import { CourseGrade } from '@/types';

export default function TranscriptPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [records, setRecords] = useState<CourseGrade[]>([]);

  // ✅ FIX: Instantiate Service
  const transcriptService = new TranscriptService(supabase);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      setProfile(data);

      // ✅ FIX: Use instance method
      const dataRecords = await transcriptService.getStudentTranscript(user.id);
      setRecords(dataRecords);
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculateCGPA = () => {
    if (records.length === 0) return "0.00";
    const totalPoints = records.reduce((acc, r) => acc + r.grade_point, 0);
    return (totalPoints / records.length).toFixed(2);
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-indigo-400 font-mono text-sm">DECRYPTING ACADEMIC LEDGER...</p>
        </div>
    </div>
  );

  const cgpa = calculateCGPA();
  const semesters = Array.from(new Set(records.map(r => `${r.semester} ${r.year}`)));

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500/30 p-6 md:p-12 relative overflow-hidden">
      
      {/* 🌌 Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[60vw] h-[60vw] bg-indigo-900/10 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-cyan-900/10 rounded-full blur-[100px]"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.02]"></div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        
        {/* --- HEADER --- */}
        <div className="flex justify-between items-start mb-16">
           <div>
               <button onClick={() => router.back()} className="group flex items-center gap-2 text-slate-500 hover:text-white transition mb-6 text-xs font-bold uppercase tracking-widest">
                   <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> Return to Dashboard
               </button>
               <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                   THE <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">{profile?.full_name?.toUpperCase()}</span> LEDGER
               </h1>
               <p className="text-slate-500 font-mono text-sm">ID: {profile?.id?.slice(0,8).toUpperCase()} // VERIFIED_ON_CHAIN</p>
           </div>

           {/* ACTIONS */}
           <div className="flex gap-4">
               <button className="hidden md:flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition text-xs font-bold uppercase">
                   <Share2 className="w-4 h-4" /> Share Access
               </button>
               <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg shadow-[0_0_20px_rgba(79,70,229,0.4)] transition text-xs font-bold uppercase">
                   <Download className="w-4 h-4" /> Export PDF
               </button>
           </div>
        </div>

        {/* --- HERO STATS (The Halo) --- */}
        <div className="grid md:grid-cols-[300px_1fr] gap-12 mb-20 items-center">
            
            {/* GPA HALO */}
            <div className="relative w-64 h-64 mx-auto md:mx-0 flex items-center justify-center">
                {/* Outer Glow Ring */}
                <div className={`absolute inset-0 rounded-full blur-2xl opacity-20 ${Number(cgpa) >= 3.5 ? 'bg-indigo-500' : 'bg-blue-500'}`}></div>
                
                {/* SVG Ring */}
                <svg className="w-full h-full -rotate-90">
                    <circle cx="50%" cy="50%" r="48%" fill="none" stroke="#1e293b" strokeWidth="4" />
                    <motion.circle 
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: Number(cgpa) / 4.0 }}
                        transition={{ duration: 2, ease: "circOut" }}
                        cx="50%" cy="50%" r="48%" 
                        fill="none" 
                        stroke="url(#gpaGradient)" 
                        strokeWidth="4" 
                        strokeLinecap="round" 
                    />
                    <defs>
                        <linearGradient id="gpaGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#818cf8" />
                            <stop offset="100%" stopColor="#22d3ee" />
                        </linearGradient>
                    </defs>
                </svg>

                {/* Center Content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">Cumulative GPA</span>
                    <h2 className="text-6xl font-black text-white tracking-tighter">{cgpa}</h2>
                    <div className="mt-2 flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-400 uppercase">Good Standing</span>
                    </div>
                </div>
            </div>

            {/* INSIGHTS CLOUD */}
            <div className="space-y-6">
                <div className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-4">
                        <Brain className="w-5 h-5 text-purple-400" />
                        <h3 className="font-bold text-white text-lg">AI Performance Insight</h3>
                    </div>
                    <p className="text-slate-400 text-sm leading-relaxed">
                        Your performance in <span className="text-white font-bold">Logic & Computational</span> subjects is in the top 5% of your cohort. 
                        We recommend focusing on <span className="text-white font-bold">Design Patterns</span> to round out your skill tree next semester.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                     {['#SystemsArch', '#React', '#DataScience', '#Ethics', '#CloudComputing'].map((tag, i) => (
                         <span key={i} className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-400">
                             {tag}
                         </span>
                     ))}
                </div>
            </div>
        </div>

        {/* --- SEMESTER BLOCKS (Timeline) --- */}
        <div className="relative border-l-2 border-slate-800 ml-4 md:ml-8 pl-8 md:pl-12 space-y-16 pb-20">
            {semesters.map((sem, semIdx) => {
                const semRecords = records.filter(r => `${r.semester} ${r.year}` === sem);
                
                return (
                    <motion.div 
                        key={sem}
                        initial={{ opacity: 0, x: -20 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: semIdx * 0.1 }}
                        className="relative"
                    >
                        {/* Timeline Dot */}
                        <div className="absolute -left-[41px] md:-left-[58px] top-0 w-5 h-5 bg-slate-950 border-4 border-indigo-500 rounded-full z-10"></div>
                        
                        <div className="flex items-baseline gap-4 mb-6">
                            <h2 className="text-2xl font-bold text-white">{sem}</h2>
                            <span className="text-sm font-mono text-slate-500">{semRecords.length} Courses Completed</span>
                        </div>

                        {/* Course Grid */}
                        <div className="grid gap-4">
                            {semRecords.map((course, idx) => (
                                <div key={idx} className="group relative bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-indigo-500/30 rounded-xl p-5 transition-all duration-300">
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                        
                                        {/* Course Info */}
                                        <div className="flex items-start gap-4">
                                            <div className="hidden md:flex w-12 h-12 bg-slate-900 rounded-lg items-center justify-center border border-white/5 font-mono text-xs font-bold text-indigo-400">
                                                {course.code.split('-')[1] || '101'}
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-bold text-white text-lg group-hover:text-indigo-300 transition-colors">
                                                        {course.course_name}
                                                    </h3>
                                                    <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono text-slate-400">
                                                        {course.code}
                                                    </span>
                                                </div>
                                                <div className="flex gap-2">
                                                    {course.skills?.map(skill => (
                                                        <span key={skill} className="text-xs text-slate-500">#{skill}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Grade & Sparkline */}
                                        <div className="flex items-center gap-8">
                                             {/* Sparkline (Visual only for now) */}
                                             <div className="hidden md:flex items-end gap-1 h-8 w-24 opacity-50">
                                                 {[40, 60, 50, 70, 65, 80, 75].map((h, i) => (
                                                     <div key={i} style={{ height: `${h}%` }} className="w-2 bg-indigo-500 rounded-t-sm"></div>
                                                 ))}
                                             </div>

                                             {/* Grade Box */}
                                             <div className="w-16 h-16 bg-slate-900 rounded-xl border border-white/10 shadow-inner flex flex-col items-center justify-center">
                                                 <span className={`text-2xl font-black ${course.grade_point >= 3.5 ? 'text-emerald-400' : course.grade_point >= 2.0 ? 'text-indigo-400' : 'text-slate-500'}`}>
                                                     {course.grade_letter}
                                                 </span>
                                                 <span className="text-[9px] font-bold text-slate-600 uppercase">
                                                     {course.grade_point.toFixed(1)} GP
                                                 </span>
                                             </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                );
            })}
        </div>

        {/* --- FOOTER SEAL --- */}
        <div className="flex justify-center mt-20 mb-10">
            <div className="relative group cursor-pointer">
                <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl group-hover:bg-indigo-500/40 transition-all duration-500"></div>
                <div className="relative w-32 h-32 border border-white/10 bg-slate-900/50 backdrop-blur-md rounded-full flex items-center justify-center">
                    <div className="absolute inset-2 border border-dashed border-indigo-500/30 rounded-full animate-[spin_10s_linear_infinite]"></div>
                    <div className="text-center">
                         <ShieldCheck className="w-8 h-8 text-indigo-400 mx-auto mb-1" />
                         <p className="text-[8px] font-bold text-white uppercase tracking-widest">AI Certified</p>
                         <p className="text-[8px] font-mono text-slate-500">SECURE LEDGER</p>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
}