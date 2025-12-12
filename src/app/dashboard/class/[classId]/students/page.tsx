'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  ArrowLeft, Search, User, Mail, Calendar, 
  ShieldAlert, Crown 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/badge'; 
import { toast } from 'sonner';

export default function ClassStudentsPage() {
  const params = useParams();
  const router = useRouter();
  const classId = params?.classId as string;

  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState<any>(null);
  const [students, setStudents] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (classId) fetchData();
  }, [classId]);

  const fetchData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // 1. Fetch Class Details
      const { data: cls, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', classId)
        .single();
      
      if (classError) throw classError;
      setClassData(cls);

      // 2. Fetch ALL enrolled students from class_enrollments
      const { data: enrollments, error: rosterError } = await supabase
        .from('class_enrollments')
        .select(`
          id,
          joined_at,
          has_paid,
          student_id,
          student:users!student_id (
            id, full_name, email, student_id, phone_number, avatar_url
          )
        `)
        .eq('class_id', classId)
        .order('joined_at', { ascending: false });

      if (rosterError) throw rosterError;

      // 3. Check who has premium course access (paid students)
      const studentIds = enrollments?.map(e => e.student_id) || [];
      const { data: paidAccess } = await supabase
        .from('student_course_access')
        .select('student_id, access_type')
        .eq('class_id', classId)
        .in('student_id', studentIds);

      // 4. Merge payment data
      const paidMap = new Map(paidAccess?.map(p => [p.student_id, p.access_type]));
      
      const processedStudents = enrollments?.map(e => ({
        ...e,
        created_at: e.joined_at,
        access_type: paidMap.get(e.student_id) || (e.has_paid ? 'semester_bundle' : 'trial')
      })) || [];

      setStudents(processedStudents);

    } catch (error: any) {
      console.error("Roster Load Error:", error);
      toast.error("Could not load roster");
    } finally {
      setLoading(false);
    }
  };

  // Filter Logic
  const filteredStudents = students.filter(s => 
    s.student?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.student?.student_id?.includes(search) ||
    s.student?.email?.toLowerCase().includes(search)
  );

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-bold">Loading Roster...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* HEADER */}
      <header className="bg-slate-900 border-b border-slate-800 pt-8 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          <button 
            onClick={() => router.back()} 
            className="text-slate-400 hover:text-white transition flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Console
          </button>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-bold uppercase">
                  {classData?.access_code || 'CODE'}
                </span>
                <h1 className="text-3xl font-black text-white">{classData?.name}</h1>
              </div>
              <p className="text-slate-400 max-w-lg text-sm">{classData?.description || "Manage your student list and subscription status."}</p>
            </div>

            <div className="flex items-center gap-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
               <div className="text-right">
                 <p className="text-2xl font-black text-white leading-none">{students.length}</p>
                 <p className="text-[10px] uppercase font-bold text-slate-500 mt-1">Total Students</p>
               </div>
               <div className="h-8 w-px bg-slate-700"></div>
               <div className="text-right">
                 <p className="text-2xl font-black text-green-400 leading-none">
                   {students.filter(s => s.access_type === 'semester_bundle').length}
                 </p>
                 <p className="text-[10px] uppercase font-bold text-slate-500 mt-1">Paid Users</p>
               </div>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="max-w-6xl mx-auto px-6 -mt-8">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          
          {/* Toolbar */}
          <div className="p-4 border-b border-slate-100 flex gap-4 bg-white">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium"
                placeholder="Search by name, ID or email..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <Button variant="outline" className="hidden sm:flex">Export CSV</Button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-bold uppercase text-[11px] border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Student Name</th>
                  <th className="px-6 py-4">Student ID</th>
                  <th className="px-6 py-4">Contact</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredStudents.map((row) => (
                  <tr key={row.id} className="hover:bg-indigo-50/30 transition group">
                    
                    {/* Name & Avatar */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0 overflow-hidden">
                          {row.student?.avatar_url ? (
                            <img src={row.student.avatar_url} alt="av" className="w-full h-full object-cover" />
                          ) : (
                            row.student?.full_name?.[0] || <User className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900">{row.student?.full_name || 'Unknown'}</p>
                          <p className="text-xs text-slate-400 md:hidden">{row.student?.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* ID Badge */}
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded">
                        {row.student?.student_id || 'N/A'}
                      </span>
                    </td>

                    {/* Contact */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col text-xs text-slate-500">
                        <span className="flex items-center gap-1.5"><Mail className="w-3 h-3"/> {row.student?.email}</span>
                        {row.student?.phone_number && (
                          <span className="flex items-center gap-1.5 mt-1"><User className="w-3 h-3"/> {row.student.phone_number}</span>
                        )}
                      </div>
                    </td>

                    {/* Payment Status */}
                    <td className="px-6 py-4">
                      {row.access_type === 'semester_bundle' ? (
                        <Badge variant="success" className="gap-1">
                          <Crown className="w-3 h-3 fill-green-700" /> Paid
                        </Badge>
                      ) : (
                        <Badge variant="warning" className="gap-1">
                          <ShieldAlert className="w-3 h-3" /> Trial
                        </Badge>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 text-right text-slate-400 text-xs font-medium">
                      <div className="flex items-center justify-end gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(row.created_at).toLocaleDateString()}
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                      <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>No students found.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}