'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Archive, Download, Users, FileSpreadsheet } from 'lucide-react';
import { ClassService } from '@/lib/services/class.service';
import { TranscriptService } from '@/lib/services/transcript.service';

export default function RecordsPage() {
  const router = useRouter();
  const [archived, setArchived] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [students, setStudents] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const data = await ClassService.getArchivedClasses(user.id);
      setArchived(data || []);
    };
    init();
  }, []);

  const handleSelectClass = async (classId: string) => {
    setSelectedClass(classId);
    const data = await TranscriptService.getClassGradebook(classId);
    setStudents(data);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <div className="flex items-center justify-between mb-8">
           <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 font-bold hover:text-slate-900 transition">
             <ChevronLeft className="w-4 h-4" /> Back to Console
           </button>
           <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
             <Archive className="w-6 h-6 text-orange-600" /> Historical Records
           </h1>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
           
           {/* Sidebar: Class List */}
           <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700">Archived Cohorts</div>
              <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                 {archived.map(cls => (
                    <button 
                      key={cls.id}
                      onClick={() => handleSelectClass(cls.id)}
                      className={`w-full text-left p-4 hover:bg-indigo-50 transition ${selectedClass === cls.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}
                    >
                       <p className="font-bold text-slate-900 text-sm">{cls.name}</p>
                       <p className="text-xs text-slate-500 mt-1">{new Date(cls.created_at).getFullYear()}</p>
                    </button>
                 ))}
                 {archived.length === 0 && <p className="p-8 text-center text-slate-400 text-sm">No archived classes.</p>}
              </div>
           </div>

           {/* Main: Gradebook View */}
           <div className="md:col-span-2">
              {selectedClass ? (
                 <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-6">
                       <div className="flex items-center gap-3">
                          <div className="p-3 bg-indigo-100 text-indigo-700 rounded-xl"><Users className="w-5 h-5"/></div>
                          <div>
                             <h3 className="font-bold text-lg text-slate-900">Final Gradebook</h3>
                             <p className="text-xs text-slate-500">{students.length} Students Enrolled</p>
                          </div>
                       </div>
                       <button className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 shadow-md">
                          <FileSpreadsheet className="w-4 h-4" /> Export CSV
                       </button>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-slate-200">
                       <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs">
                             <tr>
                                <th className="p-4">Student</th>
                                <th className="p-4">Final Grade</th>
                                <th className="p-4 text-right">Status</th>
                             </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                             {students.map((s, i) => (
                                <tr key={i}>
                                   <td className="p-4 font-medium text-slate-900">{s.full_name}</td>
                                   <td className="p-4 font-mono font-bold text-indigo-600">{s.finalGrade}%</td>
                                   <td className="p-4 text-right">
                                      <span className={`px-2 py-1 rounded text-xs font-bold ${s.finalGrade >= 50 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                         {s.finalGrade >= 50 ? 'Passed' : 'Failed'}
                                      </span>
                                   </td>
                                </tr>
                             ))}
                          </tbody>
                       </table>
                    </div>
                 </div>
              ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 p-10">
                    <Archive className="w-12 h-12 mb-4 opacity-20" />
                    <p>Select a cohort to view records.</p>
                 </div>
              )}
           </div>

        </div>
      </div>
    </div>
  );
}