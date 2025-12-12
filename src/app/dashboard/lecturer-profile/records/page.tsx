'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { 
  ChevronLeft, Archive, Users, FileSpreadsheet, Search, 
  Calendar, History, Loader2, BookOpen, FileText, 
  ChevronRight, Lock, ArrowLeft, BarChart3, LayoutDashboard,
  Crown, ShieldAlert
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { UniBotMascot } from '@/components/ui/UniBotMascot';
import * as XLSX from 'xlsx';

// --- Types ---
interface StudentSummary {
  id: string;
  name: string;
  student_id: string;
  paid: boolean;
  avgAssign: number;
  avgQuiz: number;
  isProfileHidden?: boolean;
}

type ViewMode = 'summary' | 'list_quizzes' | 'list_assignments' | 'detail';

export default function RecordsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  
  // Navigation State
  const [classes, setClasses] = useState<any[]>([]); 
  const [selectedClass, setSelectedClass] = useState<any | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('summary');
  
  // Data State
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [assessments, setAssessments] = useState<any[]>([]); 
  const [currentAssessment, setCurrentAssessment] = useState<any | null>(null); 
  const [scores, setScores] = useState<Record<string, number>>({}); 
  
  const [search, setSearch] = useState('');

  // 1. Initial Load
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // Fetch Profile for Header
      const { data: userProfile } = await supabase.from('users').select('*').eq('id', user.id).single();
      setProfile(userProfile);

      // Fetch Classes (Matches your Dashboard logic)
      const { data } = await supabase
        .from('classes')
        .select('*, courses(id), student_course_access(count)')
        .eq('lecturer_id', user.id)
        .order('created_at', { ascending: false });

      setClasses(data || []);
      setLoading(false);
    };
    init();
  }, [router]);

  // 2. Select Class & Load Summary
  const handleSelectClass = async (cls: any) => {
    setSelectedClass(cls);
    setViewMode('summary');
    setDataLoading(true);

    try {
      // A. Get Roster
      const { data: roster } = await supabase
        .from('student_course_access')
        .select('student_id, access_type, student:users(id, full_name, student_id)')
        .eq('class_id', cls.id);

      // B. Get Course IDs
      const courseIds = cls.courses?.map((c: any) => c.id) || [];

      if (courseIds.length === 0) {
        setStudents(mapRosterToSummary(roster || [], [], []));
        setDataLoading(false);
        return;
      }

      // C. Robust Fetch Strategy
      const { data: assignList } = await supabase.from('assignments').select('id').in('course_id', courseIds);
      const assignIds = assignList?.map(a => a.id) || [];

      const { data: quizList } = await supabase.from('quizzes').select('id').in('course_id', courseIds);
      const quizIds = quizList?.map(q => q.id) || [];

      let allAssigns: any[] = [];
      if (assignIds.length > 0) {
        const { data } = await supabase
          .from('assignment_submissions')
          .select('student_id, lecturer_grade, ai_grade')
          .in('assignment_id', assignIds);
        allAssigns = data || [];
      }

      let allQuizResults: any[] = [];
      if (quizIds.length > 0) {
        const { data } = await supabase
          .from('quiz_results')
          .select('student_id, score')
          .in('quiz_id', quizIds);
        allQuizResults = data || [];
      }

      setStudents(mapRosterToSummary(roster || [], allAssigns, allQuizResults));

    } catch (e) {
      console.error(e);
      toast.error("Failed to load class data");
    } finally {
      setDataLoading(false);
    }
  };

  // Helper: Map Data
  const mapRosterToSummary = (roster: any[], assigns: any[], quizzes: any[]) => {
    return roster.map((r: any) => {
      const sid = r.student_id;
      const myAssigns = assigns.filter((a: any) => a.student_id === sid);
      const myQuizzes = quizzes.filter((q: any) => q.student_id === sid);

      const avgAssign = myAssigns.length 
        ? (myAssigns.reduce((sum: number, i: any) => sum + (i.lecturer_grade ?? i.ai_grade ?? 0), 0) / myAssigns.length) 
        : 0;
        
      const avgQuiz = myQuizzes.length 
        ? (myQuizzes.reduce((sum: number, i: any) => sum + (i.score || 0), 0) / myQuizzes.length) 
        : 0;

      return {
        id: sid,
        name: r.student?.full_name || 'Hidden Profile',
        student_id: r.student?.student_id || 'N/A',
        paid: r.access_type === 'semester_bundle',
        avgAssign: Math.round(avgAssign),
        avgQuiz: Math.round(avgQuiz),
        isProfileHidden: !r.student
      };
    });
  };

  // 3. Load List (Quizzes/Assignments)
  const handleViewList = async (type: 'quiz' | 'assignment') => {
    setDataLoading(true);
    try {
      const courseIds = selectedClass.courses?.map((c: any) => c.id) || [];
      const table = type === 'quiz' ? 'quizzes' : 'assignments';
      const { data } = await supabase
        .from(table)
        .select('id, title, created_at')
        .in('course_id', courseIds)
        .order('created_at', { ascending: false });

      setAssessments(data || []);
      setViewMode(type === 'quiz' ? 'list_quizzes' : 'list_assignments');
    } catch { toast.error("Load failed"); } 
    finally { setDataLoading(false); }
  };

  // 4. View Detail (Paywall Logic)
  const handleViewDetail = async (item: any, type: 'quiz' | 'assignment') => {
    setDataLoading(true);
    setCurrentAssessment({ ...item, type });
    try {
      const scoreMap: Record<string, number> = {};
      if (type === 'quiz') {
        const { data } = await supabase.from('quiz_results').select('student_id, score').eq('quiz_id', item.id);
        data?.forEach((r: any) => scoreMap[r.student_id] = r.score);
      } else {
        const { data } = await supabase.from('assignment_submissions').select('student_id, lecturer_grade, ai_grade').eq('assignment_id', item.id);
        data?.forEach((r: any) => scoreMap[r.student_id] = r.lecturer_grade ?? r.ai_grade ?? 0);
      }
      setScores(scoreMap);
      setViewMode('detail');
    } catch { toast.error("Load failed"); } 
    finally { setDataLoading(false); }
  };

  const handleExport = () => {
    if (!students.length) return;
    const data = students.map(s => ({
      "Name": s.name, "ID": s.student_id, "Status": s.paid ? "PAID" : "UNPAID", 
      "Quiz Avg": `${s.avgQuiz}%`, "Assign Avg": `${s.avgAssign}%`
    }));
    XLSX.utils.book_append_sheet(XLSX.utils.book_new(), XLSX.utils.json_to_sheet(data), "Summary");
    XLSX.writeFile(XLSX.utils.book_new(), `${selectedClass.name}_Records.xlsx`);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-10 h-10 animate-spin text-indigo-600"/></div>;

  const filteredStudents = students.filter(s => s.name.toLowerCase().includes(search.toLowerCase()) || s.student_id.includes(search));

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      
      {/* --- HEADER (Matches Dashboard) --- */}
      <header className="bg-slate-900 pt-10 pb-24 px-6 border-b border-slate-800 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600 rounded-full blur-[150px] opacity-20 -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
         
         <div className="max-w-7xl mx-auto relative z-10 flex justify-between items-center">
            <div>
               <button onClick={() => router.back()} className="text-slate-400 hover:text-white flex items-center gap-2 text-xs font-bold uppercase mb-4 transition-colors"><ChevronLeft className="w-4 h-4"/> Dashboard</button>
               <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                  <LayoutDashboard className="w-8 h-8 text-indigo-400" /> Master Records
               </h1>
               <p className="text-slate-400 mt-2 text-sm">Historical gradebooks & financial compliance.</p>
            </div>
            
            {/* Mascot */}
            <div className="hidden md:block relative w-24 h-24">
               <UniBotMascot size={100} emotion="happy" action="idle" />
            </div>
         </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-16 relative z-20">
        <div className="grid md:grid-cols-12 gap-6">
           
           {/* LEFT SIDEBAR: CLASS LIST */}
           <div className="md:col-span-4 lg:col-span-3 space-y-4">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                 <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 text-xs uppercase tracking-wide">
                    Select Cohort
                 </div>
                 <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
                    {classes.map(cls => (
                       <button 
                         key={cls.id}
                         onClick={() => handleSelectClass(cls)}
                         className={`w-full text-left p-4 hover:bg-indigo-50 transition border-l-4 group ${selectedClass?.id === cls.id ? 'bg-indigo-50 border-indigo-600' : 'border-transparent'}`}
                       >
                          <div className="flex justify-between items-start mb-1">
                             <p className={`font-bold text-sm ${selectedClass?.id === cls.id ? 'text-indigo-700' : 'text-slate-700'}`}>{cls.name}</p>
                             {cls.status === 'archived' && <Archive className="w-3 h-3 text-amber-400" />}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-400">
                             <Users className="w-3 h-3"/> {cls.student_course_access?.[0]?.count || 0} Students
                          </div>
                       </button>
                    ))}
                 </div>
              </div>
           </div>

           {/* RIGHT: DATA VIEW */}
           <div className="md:col-span-8 lg:col-span-9">
              {selectedClass ? (
                 <div className="bg-white rounded-2xl shadow-xl border border-slate-200 min-h-[600px] flex flex-col relative overflow-hidden">
                    {dataLoading && <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>}

                    {/* Toolbar */}
                    <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white sticky top-0 z-20">
                       <div>
                          <h2 className="text-xl font-bold text-slate-900">{selectedClass.name}</h2>
                          <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-1">
                             <span onClick={() => setViewMode('summary')} className={`cursor-pointer hover:text-indigo-600 ${viewMode === 'summary' ? 'text-indigo-600' : ''}`}>Summary</span>
                             {viewMode !== 'summary' && (
                                <>
                                  <ChevronRight className="w-3 h-3 text-slate-300"/>
                                  <span className="text-indigo-600 capitalize">{viewMode === 'detail' ? currentAssessment?.title : (viewMode.includes('quiz') ? 'Quizzes' : 'Assignments')}</span>
                                </>
                             )}
                          </div>
                       </div>
                       
                       {(viewMode === 'summary' || viewMode === 'detail') && (
                          <div className="flex gap-2">
                             <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input className="pl-9 pr-4 py-2 border rounded-lg text-sm w-40 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
                             </div>
                             {viewMode === 'summary' && <Button onClick={handleExport} variant="outline" className="text-green-600 border-green-200 hover:bg-green-50"><FileSpreadsheet className="w-4 h-4 mr-2" /> Export</Button>}
                          </div>
                       )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-auto bg-slate-50/50">
                       {viewMode === 'summary' && (
                          <>
                             <div className="grid grid-cols-2 gap-4 p-6">
                                <button onClick={() => handleViewList('quiz')} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-indigo-400 hover:shadow-md transition group text-left">
                                   <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg w-fit mb-3"><BookOpen className="w-6 h-6"/></div>
                                   <h3 className="font-bold text-slate-700 group-hover:text-indigo-700">View Quizzes</h3>
                                   <p className="text-xs text-slate-400 mt-1">Drill down into scores</p>
                                </button>
                                <button onClick={() => handleViewList('assignment')} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:border-purple-400 hover:shadow-md transition group text-left">
                                   <div className="p-3 bg-purple-50 text-purple-600 rounded-lg w-fit mb-3"><FileText className="w-6 h-6"/></div>
                                   <h3 className="font-bold text-slate-700 group-hover:text-purple-700">View Assignments</h3>
                                   <p className="text-xs text-slate-400 mt-1">Check submissions</p>
                                </button>
                             </div>
                             <div className="px-6 pb-6">
                                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                   <table className="w-full text-left text-sm">
                                      <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] border-b border-slate-200">
                                         <tr><th className="p-4">Student</th><th className="p-4">Status</th><th className="p-4">Quiz Avg</th><th className="p-4 text-right">Assign Avg</th></tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-50">
                                         {filteredStudents.map((s, i) => (
                                            <tr key={i} className="hover:bg-slate-50">
                                               <td className="p-4"><div className="font-bold text-slate-900">{s.name}</div><div className="text-xs text-slate-400">{s.student_id}</div></td>
                                               <td className="p-4">{s.paid ? <Badge variant="success">Paid</Badge> : <Badge variant="destructive">Unpaid</Badge>}</td>
                                               <td className="p-4 font-mono text-indigo-600">{s.avgQuiz}%</td>
                                               <td className="p-4 text-right font-mono text-purple-600">{s.avgAssign}%</td>
                                            </tr>
                                         ))}
                                      </tbody>
                                   </table>
                                </div>
                             </div>
                          </>
                       )}

                       {(viewMode === 'list_quizzes' || viewMode === 'list_assignments') && (
                          <div className="p-6 space-y-2">
                             <Button variant="ghost" onClick={() => setViewMode('summary')} className="mb-4 text-slate-400"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
                             {assessments.map(item => (
                                <button key={item.id} onClick={() => handleViewDetail(item, viewMode === 'list_quizzes' ? 'quiz' : 'assignment')} className="w-full bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center hover:border-indigo-400 transition group">
                                   <div className="text-left"><p className="font-bold text-slate-700 group-hover:text-indigo-700">{item.title}</p><p className="text-xs text-slate-400">{new Date(item.created_at).toLocaleDateString()}</p></div>
                                   <ChevronRight className="w-4 h-4 text-slate-300"/>
                                </button>
                             ))}
                             {assessments.length === 0 && <p className="text-center text-slate-400 mt-10">No items found.</p>}
                          </div>
                       )}

                       {viewMode === 'detail' && (
                          <div className="flex flex-col h-full">
                             <div className="px-6 py-2 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center"><span className="text-xs font-bold text-indigo-700 uppercase">Grading: {currentAssessment?.title}</span><Button variant="ghost" size="sm" onClick={() => setViewMode(currentAssessment.type === 'quiz' ? 'list_quizzes' : 'list_assignments')} className="text-indigo-400 hover:text-indigo-700 h-auto p-0">Change Item</Button></div>
                             <div className="flex-1 overflow-auto">
                                <table className="w-full text-left text-sm"><thead className="bg-white text-slate-500 font-bold uppercase text-[11px] sticky top-0 border-b border-slate-200"><tr><th className="p-4">Student</th><th className="p-4">Status</th><th className="p-4 text-right">Score</th></tr></thead>
                                   <tbody className="divide-y divide-slate-50 bg-white">
                                      {filteredStudents.map((s, i) => (
                                         <tr key={i} className="hover:bg-slate-50">
                                            <td className="p-4"><div className="font-medium text-slate-900">{s.name}</div><div className="text-xs text-slate-400">{s.student_id}</div></td>
                                            <td className="p-4">{s.paid ? <span className="text-xs font-bold text-green-600 flex items-center gap-1"><Users className="w-3 h-3"/> Active</span> : <span className="text-xs font-bold text-red-500 flex items-center gap-1"><Lock className="w-3 h-3"/> Unpaid</span>}</td>
                                            <td className="p-4 text-right">
                                               {s.paid ? (scores[s.id] !== undefined ? <span className={`font-mono font-bold ${scores[s.id] >= 50 ? 'text-indigo-600' : 'text-red-500'}`}>{scores[s.id]}/100</span> : <span className="text-slate-300">-</span>) : <div className="flex items-center justify-end gap-1 text-slate-300 select-none"><Lock className="w-3 h-3" /> LOCKED</div>}
                                            </td>
                                         </tr>
                                      ))}
                                   </tbody>
                                </table>
                             </div>
                          </div>
                       )}
                    </div>
                 </div>
              ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10"><BarChart3 className="w-16 h-16 opacity-10 mb-4" /><p>Select a cohort to access records.</p></div>
              )}
           </div>
        </div>
      </div>
    </div>
  );
}