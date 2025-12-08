'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Download, ChevronLeft, GraduationCap, Printer, ShieldCheck } from 'lucide-react';
import { TranscriptService, CourseGrade } from '@/lib/services/transcript.service';

export default function TranscriptPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  const [records, setRecords] = useState<CourseGrade[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      
      const { data } = await supabase.from('users').select('*').eq('id', user.id).single();
      setProfile(data);

      const dataRecords = await TranscriptService.getStudentTranscript(user.id);
      setRecords(dataRecords);
      setLoading(false);
    };
    init();
  }, [router]);

  // Calculate GPA (Simple 4.0 Scale)
  const calculateGPA = () => {
    if (records.length === 0) return 0.0;
    const totalPoints = records.reduce((acc, r) => {
        if (r.totalScore >= 80) return acc + 4.0;
        if (r.totalScore >= 70) return acc + 3.0;
        if (r.totalScore >= 60) return acc + 2.0;
        if (r.totalScore >= 50) return acc + 1.0;
        return acc;
    }, 0);
    return (totalPoints / records.length).toFixed(2);
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading Records...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans print:bg-white print:p-0">
      <div className="max-w-4xl mx-auto">
        
        {/* Actions (Hidden on Print) */}
        <div className="flex justify-between items-center mb-8 print:hidden">
           <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition">
             <ChevronLeft className="w-4 h-4" /> Back to Dashboard
           </button>
           <Button onClick={() => window.print()} variant="outline" className="flex gap-2">
             <Printer className="w-4 h-4" /> Print Transcript
           </Button>
        </div>

        {/* --- OFFICIAL TRANSCRIPT DOCUMENT --- */}
        <div className="bg-white p-12 rounded-none md:rounded shadow-xl print:shadow-none border border-slate-200">
           
           {/* Header */}
           <div className="flex justify-between items-start border-b-2 border-slate-900 pb-8 mb-8">
              <div className="flex items-center gap-4">
                 <div className="w-16 h-16 bg-slate-900 text-white flex items-center justify-center rounded-lg">
                    <GraduationCap className="w-8 h-8" />
                 </div>
                 <div>
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-widest">Official Transcript</h1>
                    <p className="text-slate-500 font-medium">UniBot Learning Platform</p>
                 </div>
              </div>
              <div className="text-right">
                 <p className="text-sm font-bold text-slate-900">{profile.full_name}</p>
                 <p className="text-sm text-slate-500">{profile.email}</p>
                 <p className="text-xs text-slate-400 mt-1">Generated: {new Date().toLocaleDateString()}</p>
              </div>
           </div>

           {/* Stats Row */}
           <div className="flex gap-12 mb-10">
              <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cumulative GPA</p>
                 <p className="text-4xl font-black text-slate-900">{calculateGPA()}</p>
              </div>
              <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Courses Taken</p>
                 <p className="text-4xl font-black text-slate-900">{records.length}</p>
              </div>
              <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</p>
                 <div className="flex items-center gap-2 mt-2">
                    <ShieldCheck className="w-5 h-5 text-green-600" />
                    <span className="font-bold text-green-700">Good Standing</span>
                 </div>
              </div>
           </div>

           {/* Grades Table */}
           <table className="w-full text-left border-collapse">
              <thead>
                 <tr className="border-b-2 border-slate-100">
                    <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Course</th>
                    <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Semester</th>
                    <th className="py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Credits</th>
                    <th className="py-4 text-right text-xs font-bold text-slate-400 uppercase tracking-wider">Grade</th>
                 </tr>
              </thead>
              <tbody className="text-sm text-slate-700 font-medium">
                 {records.map((r, i) => (
                    <tr key={i} className="border-b border-slate-50">
                       <td className="py-4 pr-4">
                          <p className="font-bold text-slate-900">{r.courseTitle}</p>
                          <p className="text-xs text-slate-400">{r.className}</p>
                       </td>
                       <td className="py-4">{r.semester}</td>
                       <td className="py-4">3.0</td>
                       <td className="py-4 text-right font-mono font-bold text-slate-900">
                          {r.totalScore}%
                       </td>
                    </tr>
                 ))}
                 {records.length === 0 && (
                    <tr>
                       <td colSpan={4} className="py-8 text-center text-slate-400 italic">No academic records found.</td>
                    </tr>
                 )}
              </tbody>
           </table>

           {/* Footer */}
           <div className="mt-16 pt-8 border-t border-slate-200 flex justify-between items-end">
              <div className="text-xs text-slate-400 max-w-sm">
                 This document is a system-generated transcript from UniBot. It does not require a physical signature.
                 <br/>Verify authenticity at unibot.app/verify
              </div>
              <div className="text-right">
                 <div className="h-10 w-32 bg-slate-100 mb-2"></div> {/* Fake Signature Line */}
                 <p className="text-xs font-bold text-slate-900 uppercase">Registrar</p>
              </div>
           </div>

        </div>
      </div>
    </div>
  );
}