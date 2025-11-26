'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function UniversityAdminDashboard() {
  const [university, setUniversity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'classes' | 'users' | 'broadcast'>('overview');

  // Data State
  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  const [departmentStats, setDepartmentStats] = useState<{[key: string]: number}>({});
  
  // Forms
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  // Inputs
  const [newDept, setNewDept] = useState({ name: '', code: '' });
  const [newClass, setNewClass] = useState({ 
    department_id: '', 
    program_name: '', 
    admission_year: new Date().getFullYear(), 
    duration: 4,
  });

  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push('/login');

    const { data: profile } = await supabase
      .from('users')
      .select('university_id, universities(*)')
      .eq('id', user.id)
      .single();

    if (profile?.universities) {
      setUniversity(profile.universities);
      const uniId = profile.university_id;

      // 1. Fetch Core Data
      const { data: depts } = await supabase.from('departments').select('*').eq('university_id', uniId).order('name');
      const { data: cls } = await supabase.from('classes').select('*, departments(name)').eq('university_id', uniId).eq('is_archived', false).order('created_at', { ascending: false });
      const { data: usrs } = await supabase.from('users').select('*').eq('university_id', uniId);
      // 4. AI Usage Stats
      const { data: usage } = await supabase.from('ai_usage_logs')
        .select('department, feature')
        .eq('university_id', uniId);
        
      // Group by Department
      const aiByDept: any = {};
      usage?.forEach(log => {
        aiByDept[log.department] = (aiByDept[log.department] || 0) + 1;
      });
      
      // Group by Feature
      const aiByFeature: any = {};
      usage?.forEach(log => {
        aiByFeature[log.feature] = (aiByFeature[log.feature] || 0) + 1;
      });
      setDepartments(depts || []);
      setClasses(cls || []);
      setUsers(usrs || []);

      // 2. Calculate Dept Stats
      const deptCounts: {[key: string]: number} = {};
      usrs?.forEach(u => {
        if (u.department) deptCounts[u.department] = (deptCounts[u.department] || 0) + 1;
      });
      setDepartmentStats(deptCounts);

      // 3. Analyze "At Risk" Students
      // Fetch scores for all students in this uni
      if (usrs?.length) {
        const { data: scores } = await supabase
          .from('quiz_results')
          .select('student_id, score')
          .in('student_id', usrs.map(u => u.id));

        if (scores) {
          const studentAvg: {[key: string]: {total: number, count: number}} = {};
          scores.forEach(s => {
            if(!studentAvg[s.student_id]) studentAvg[s.student_id] = {total: 0, count: 0};
            studentAvg[s.student_id].total += s.score;
            studentAvg[s.student_id].count++;
          });

          const risky = Object.keys(studentAvg)
            .map(id => ({
              id,
              avg: studentAvg[id].total / studentAvg[id].count,
              user: usrs.find(u => u.id === id)
            }))
            .filter(s => s.avg < 50); // Threshold for risk
          
          setAtRiskStudents(risky);
        }
      }
    }
    setLoading(false);
  };

  // --- ACTIONS ---

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('departments').insert([{ university_id: university.id, ...newDept }]);
    if (error) alert(error.message);
    else { setShowDeptModal(false); fetchData(); }
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    const gradYear = parseInt(newClass.admission_year.toString()) + parseInt(newClass.duration.toString());
    const className = `${newClass.program_name} (${newClass.admission_year}-${gradYear})`;
    const accessCode = newClass.program_name.substring(0,3).toUpperCase() + Math.floor(1000 + Math.random() * 9000);

    const { error } = await supabase.from('classes').insert([{
      name: className,
      description: `Cohort for ${newClass.program_name}`,
      access_code: accessCode,
      department_id: newClass.department_id,
      program_name: newClass.program_name,
      admission_year: newClass.admission_year,
      graduation_year: gradYear,
      university_id: university.id,
      current_level: '100'
    }]);

    if (error) alert(error.message);
    else {
      alert(`Cohort Created: ${className}\nCode: ${accessCode}`);
      setShowClassModal(false);
      fetchData();
    }
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSendingBroadcast(true);
    // Requires 'university_announcements' table (Added in previous SQL step)
    const { error } = await supabase.from('university_announcements').insert([{
        university_id: university.id,
        title: announcement.title,
        message: announcement.message,
        author_id: (await supabase.auth.getUser()).data.user?.id
    }]);

    if (error) alert("Failed to send: " + error.message);
    else {
        alert("Broadcast Sent to " + users.length + " users.");
        setAnnouncement({title: '', message: ''});
    }
    setSendingBroadcast(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-orange-100 rounded-lg flex items-center justify-center text-xl">🏛️</div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 leading-tight">{university?.name}</h1>
              <p className="text-xs text-gray-500 font-mono">ADMIN CONSOLE</p>
            </div>
          </div>
          <div className="hidden md:flex gap-4 text-xs items-center">
             <div className="bg-blue-50 px-3 py-1.5 rounded border border-blue-100">
                <span className="text-blue-600 font-bold mr-2">LECTURER KEY:</span>
                <span className="font-mono font-bold text-gray-800 select-all">{university?.lecturer_code}</span>
             </div>
             <button onClick={() => router.push('/login')} className="text-red-600 hover:text-red-800 font-bold border border-red-100 px-3 py-1.5 rounded hover:bg-red-50">Log Out</button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex border-b border-gray-200 mb-8 overflow-x-auto">
          {['overview', 'departments', 'classes', 'users', 'broadcast'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab as any)} className={`px-6 py-3 text-sm font-bold capitalize border-b-2 whitespace-nowrap transition-colors ${activeTab === tab ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          {/* OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                        <p className="text-gray-500 text-xs font-bold uppercase">Students</p>
                        <p className="text-3xl font-bold text-gray-900">{users.filter(u=>u.role==='student').length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-purple-500">
                        <p className="text-gray-500 text-xs font-bold uppercase">Lecturers</p>
                        <p className="text-3xl font-bold text-gray-900">{users.filter(u=>u.role==='lecturer').length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-orange-500">
                        <p className="text-gray-500 text-xs font-bold uppercase">Active Cohorts</p>
                        <p className="text-3xl font-bold text-gray-900">{classes.length}</p>
                    </div>
                    <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
                        <p className="text-gray-500 text-xs font-bold uppercase">At Risk</p>
                        <p className="text-3xl font-bold text-gray-900">{atRiskStudents.length}</p>
                    </div>
                </div>

                {atRiskStudents.length > 0 && (
                    <div className="bg-white border border-red-100 rounded-xl p-6 shadow-sm">
                        <h3 className="text-red-700 font-bold mb-4 flex items-center gap-2">⚠️ Students Needing Attention</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {atRiskStudents.map(s => (
                                <div key={s.id} className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-100">
                                    <div>
                                        <p className="font-bold text-gray-900 text-sm">{s.user?.full_name}</p>
                                        <p className="text-xs text-gray-500">{s.user?.email}</p>
                                    </div>
                                    <span className="text-xl font-bold text-red-600">{Math.round(s.avg)}%</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
          )}

          {/* DEPARTMENTS */}
          {activeTab === 'departments' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Departments</h2>
                <button onClick={() => setShowDeptModal(true)} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-bold hover:bg-gray-800">+ Add Dept</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {departments.map(d => (
                  <div key={d.id} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm">
                    <h3 className="font-bold text-lg">{d.name}</h3>
                    <p className="text-sm text-gray-500 font-mono mt-1">{d.code}</p>
                    <div className="mt-3 pt-3 border-t border-gray-50 text-xs text-gray-400">
                        {users.filter(u => u.department === d.name).length} Members
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CLASSES */}
          {activeTab === 'classes' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">Active Cohorts</h2>
                <button onClick={() => setShowClassModal(true)} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700 shadow-lg">+ Create Cohort</button>
              </div>
              <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="p-4 font-bold text-gray-600">Cohort Name</th>
                      <th className="p-4 font-bold text-gray-600">Department</th>
                      <th className="p-4 font-bold text-gray-600">Level</th>
                      <th className="p-4 font-bold text-gray-600">Access Code</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {classes.map(cls => (
                      <tr key={cls.id} className="hover:bg-gray-50">
                        <td className="p-4 font-medium text-gray-900">{cls.name}</td>
                        <td className="p-4 text-gray-600">{cls.departments?.name || '-'}</td>
                        <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-bold">L{cls.current_level}</span></td>
                        <td className="p-4 font-mono text-gray-500">{cls.access_code}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* BROADCAST */}
          {activeTab === 'broadcast' && (
            <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-200">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Campus Broadcast</h2>
                <p className="text-gray-500 mb-6">Send a notification to all {users.length} users in the university dashboard.</p>
                <form onSubmit={handleBroadcast} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Subject</label>
                        <input className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={announcement.title} onChange={e=>setAnnouncement({...announcement, title: e.target.value})} required />
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Message</label>
                        <textarea className="w-full border p-3 rounded-lg h-32 focus:ring-2 focus:ring-blue-500 outline-none resize-none" value={announcement.message} onChange={e=>setAnnouncement({...announcement, message: e.target.value})} required />
                    </div>
                    <button disabled={sendingBroadcast} className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 transition">
                        {sendingBroadcast ? 'Sending...' : 'Send Broadcast'}
                    </button>
                </form>
            </div>
          )}
        </div>
      </main>

      {/* MODALS */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-4">Add Department</h3>
            <form onSubmit={handleCreateDept} className="space-y-4">
              <input className="w-full border p-2 rounded" placeholder="Name" value={newDept.name} onChange={e => setNewDept({...newDept, name: e.target.value})} required />
              <input className="w-full border p-2 rounded" placeholder="Code" value={newDept.code} onChange={e => setNewDept({...newDept, code: e.target.value})} required />
              <div className="flex gap-2 pt-2"><button type="button" onClick={() => setShowDeptModal(false)} className="flex-1 py-2 border rounded">Cancel</button><button type="submit" className="flex-1 py-2 bg-gray-900 text-white rounded font-bold">Create</button></div>
            </form>
          </div>
        </div>
      )}

      {showClassModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold mb-6">Create Cohort</h3>
            <form onSubmit={handleCreateClass} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Department</label>
                <select className="w-full border p-2 rounded" value={newClass.department_id} onChange={e => setNewClass({...newClass, department_id: e.target.value})} required>
                  <option value="">Select...</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Program Name</label>
                <input className="w-full border p-2 rounded" placeholder="e.g. BSc Computer Science" value={newClass.program_name} onChange={e => setNewClass({...newClass, program_name: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Year</label><input type="number" className="w-full border p-2 rounded" value={newClass.admission_year} onChange={e => setNewClass({...newClass, admission_year: parseInt(e.target.value)})} required /></div>
                <div><label className="block text-xs font-bold text-gray-500 uppercase mb-1">Duration</label><select className="w-full border p-2 rounded" value={newClass.duration} onChange={e => setNewClass({...newClass, duration: parseInt(e.target.value)})}><option value={4}>4 Years</option><option value={3}>3 Years</option><option value={2}>2 Years</option></select></div>
              </div>
              <div className="flex gap-2 pt-4"><button type="button" onClick={() => setShowClassModal(false)} className="flex-1 py-2 border rounded">Cancel</button><button type="submit" className="flex-1 py-2 bg-orange-600 text-white rounded font-bold">Create</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}