'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Your Super Admin UID
const SUPER_ADMIN_UID = "fcfd6dc6-d875-411a-9735-6d82373cf3b1";

export default function SuperAdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [universities, setUniversities] = useState<any[]>([]);
  
  // Global Stats (Top Cards)
  const [globalStats, setGlobalStats] = useState({
    totalUniversities: 0,
    totalUsers: 0,
    totalClasses: 0,
  });

  // Modal & Selection States
  const [selectedUni, setSelectedUni] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'settings'>('overview');
  const [userFilter, setUserFilter] = useState<'all' | 'student' | 'lecturer' | 'university_admin'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // Loading States
  const [loading, setLoading] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);

  // Create Form State
  const [newUni, setNewUni] = useState({
    name: '',
    subdomain: '',
    tier: 'free',
    maxStudents: 50,
    maxCourses: 1,
    adminCode: '' 
  });

  const router = useRouter();

  // --- 1. INITIAL LOAD ---
  useEffect(() => {
    const checkAccess = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');
      
      const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
      const isSuper = user.id === SUPER_ADMIN_UID || profile?.role === 'super_admin';

      if (!isSuper) return router.push('/dashboard'); 

      setUser(user);
      fetchGlobalData();
    };
    checkAccess();
  }, [router]);

  const fetchGlobalData = async () => {
    try {
      // Get Universities
      const { data: unis } = await supabase.from('universities').select('*').order('created_at', { ascending: false });
      if (unis) setUniversities(unis);

      // Get Global Counts (Fast HEAD queries)
      const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: classCount } = await supabase.from('classes').select('*', { count: 'exact', head: true });

      setGlobalStats({
        totalUniversities: unis?.length || 0,
        totalUsers: userCount || 0,
        totalClasses: classCount || 0,
      });
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. DRILL-DOWN ACTIONS ---
  const openUniversity = async (uni: any) => {
    setSelectedUni(uni);
    setActiveTab('overview');
    setLoadingDetails(true);

    // Fetch details specific to THIS university
    try {
      const { data: users } = await supabase
        .from('users')
        .select('*')
        .eq('university_id', uni.id)
        .order('created_at', { ascending: false });

      const stats = {
        students: users?.filter(u => u.role === 'student').length || 0,
        lecturers: users?.filter(u => u.role === 'lecturer').length || 0,
        admins: users?.filter(u => u.role === 'university_admin').length || 0,
        total: users?.length || 0
      };

      setSelectedUni({ ...uni, users: users || [], stats });
    } catch (error) {
      console.error("Error details:", error);
    } finally {
      setLoadingDetails(false);
    }
  };

  // --- 3. CREATE / DELETE ACTIONS ---
  const generateCode = () => {
    const code = 'UNI-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    setNewUni(prev => ({ ...prev, adminCode: code }));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('universities').insert([{
        name: newUni.name,
        subdomain: newUni.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        tier: newUni.tier,
        max_students: newUni.maxStudents,
        max_courses: newUni.maxCourses,
        admin_uid: SUPER_ADMIN_UID,
        is_verified: true,
        admin_code: newUni.adminCode 
      }]);

      if (error) throw error;
      alert(`University Created! Admin Code: ${newUni.adminCode}`);
      setShowCreateModal(false);
      fetchGlobalData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleDelete = async () => {
    const confirmName = prompt(`TYPE "${selectedUni.name}" TO CONFIRM DELETION:`);
    if (confirmName !== selectedUni.name) return alert("Name did not match. Deletion cancelled.");

    const { error } = await supabase.from('universities').delete().eq('id', selectedUni.id);
    if (error) alert(error.message);
    else {
      setSelectedUni(null);
      fetchGlobalData();
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading Control Panel...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* TOP NAV */}
      <nav className="bg-slate-900 text-white sticky top-0 z-10 shadow-lg">
        <div className="mx-auto max-w-7xl px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎓</span>
            <span className="font-bold text-lg tracking-tight">SuperAdmin</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400 hidden sm:block">{user?.email}</span>
            <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-xs bg-red-500/20 hover:bg-red-500/40 text-red-200 px-3 py-1.5 rounded-lg font-bold transition">
              Log Out
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8 space-y-8">
        
        {/* 1. GLOBAL KPI CARDS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Total Universities', value: globalStats.totalUniversities, icon: '🏛️', color: 'blue' },
            { label: 'Total Users', value: globalStats.totalUsers, icon: '👥', color: 'green' },
            { label: 'Active Classes', value: globalStats.totalClasses, icon: '📚', color: 'purple' },
          ].map((stat, i) => (
            <div key={i} className={`bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between`}>
               <div>
                 <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
                 <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
               </div>
               <div className={`text-2xl bg-${stat.color}-50 p-3 rounded-lg`}>{stat.icon}</div>
            </div>
          ))}
        </div>

        {/* 2. UNIVERSITIES LIST */}
        <div>
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-bold text-gray-800">Universities</h2>
            <button 
              onClick={() => { generateCode(); setShowCreateModal(true); }} 
              className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 shadow-lg transition"
            >
              + New University
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {universities.map((uni) => (
              <div 
                key={uni.id} 
                onClick={() => openUniversity(uni)}
                className="group bg-white p-6 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md cursor-pointer transition-all relative overflow-hidden"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="h-10 w-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center text-xl">🏛️</div>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded ${uni.tier === 'enterprise' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                    {uni.tier}
                  </span>
                </div>
                <h3 className="font-bold text-gray-900 text-lg group-hover:text-blue-600 transition">{uni.name}</h3>
                <p className="text-xs text-gray-500 mt-1 font-mono">{uni.subdomain}.swish.com</p>
                <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-500">
                  <span>Limit: <strong>{uni.max_students}</strong> Students</span>
                  <span className="text-blue-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity">Manage →</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* --- DRILL DOWN MODAL --- */}
      {selectedUni && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{selectedUni.name}</h2>
                <div className="flex gap-3 mt-2 text-sm">
                  <span className="bg-white border px-2 py-0.5 rounded text-gray-500 font-mono text-xs">ID: {selectedUni.id.slice(0,8)}...</span>
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold font-mono text-xs">KEY: {selectedUni.admin_code}</span>
                </div>
              </div>
              <button onClick={() => setSelectedUni(null)} className="h-8 w-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 font-bold">×</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200 px-6">
              {['overview', 'users', 'settings'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab as any)}
                  className={`px-4 py-3 text-sm font-bold capitalize border-b-2 transition-colors ${
                    activeTab === tab ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 bg-white">
              {loadingDetails ? (
                <div className="flex justify-center py-20"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>
              ) : (
                <>
                  {/* TAB: OVERVIEW */}
                  {activeTab === 'overview' && (
                    <div className="grid grid-cols-4 gap-4">
                      <div className="bg-blue-50 p-4 rounded-xl text-center">
                        <div className="text-2xl font-bold text-blue-700">{selectedUni.stats?.students}</div>
                        <div className="text-xs font-bold text-blue-900/60 uppercase">Students</div>
                      </div>
                      <div className="bg-purple-50 p-4 rounded-xl text-center">
                        <div className="text-2xl font-bold text-purple-700">{selectedUni.stats?.lecturers}</div>
                        <div className="text-xs font-bold text-purple-900/60 uppercase">Lecturers</div>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-xl text-center">
                        <div className="text-2xl font-bold text-orange-700">{selectedUni.stats?.admins}</div>
                        <div className="text-xs font-bold text-orange-900/60 uppercase">Admins</div>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-xl text-center border border-gray-200">
                        <div className="text-2xl font-bold text-gray-700">{selectedUni.stats?.total} / {selectedUni.max_students}</div>
                        <div className="text-xs font-bold text-gray-500 uppercase">Capacity</div>
                      </div>
                    </div>
                  )}

                  {/* TAB: USERS */}
                  {activeTab === 'users' && (
                    <div className="space-y-4">
                      {/* Filter Bar */}
                      <div className="flex gap-2 pb-4 border-b border-gray-100">
                        {['all', 'student', 'lecturer', 'university_admin'].map((role) => (
                          <button
                            key={role}
                            onClick={() => setUserFilter(role as any)}
                            className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${
                              userFilter === role ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {role.replace('_', ' ')}
                          </button>
                        ))}
                      </div>

                      {/* Users Table */}
                      <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                          <tr>
                            <th className="p-3">Name</th>
                            <th className="p-3">Email</th>
                            <th className="p-3">Role</th>
                            <th className="p-3">Joined</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {selectedUni.users
                            .filter((u: any) => userFilter === 'all' || u.role === userFilter)
                            .map((u: any) => (
                            <tr key={u.id} className="hover:bg-gray-50">
                              <td className="p-3 font-medium text-gray-900">{u.full_name}</td>
                              <td className="p-3 text-gray-500">{u.email}</td>
                              <td className="p-3">
                                <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                  u.role === 'university_admin' ? 'bg-orange-100 text-orange-700' :
                                  u.role === 'lecturer' ? 'bg-purple-100 text-purple-700' : 
                                  'bg-blue-100 text-blue-700'
                                }`}>
                                  {u.role.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="p-3 text-gray-400">{new Date(u.created_at).toLocaleDateString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {selectedUni.users.length === 0 && <div className="text-center py-10 text-gray-400">No users found.</div>}
                    </div>
                  )}

                  {/* TAB: SETTINGS (Danger Zone) */}
                  {activeTab === 'settings' && (
                    <div className="pt-4">
                      <div className="border border-red-200 bg-red-50 rounded-xl p-6">
                        <h3 className="text-red-800 font-bold mb-2">Danger Zone</h3>
                        <p className="text-sm text-red-600 mb-4">Deleting this university will permanently remove all associated students, classes, and data. This action cannot be undone.</p>
                        <button 
                          onClick={handleDelete}
                          className="bg-white border border-red-300 text-red-600 px-4 py-2 rounded-lg font-bold text-sm hover:bg-red-600 hover:text-white transition"
                        >
                          Delete University
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
            <h2 className="mb-6 text-xl font-bold text-gray-900">Create New University</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Name</label>
                <input className="w-full border p-2 rounded" value={newUni.name} onChange={e => setNewUni({...newUni, name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Access Code</label>
                <div className="flex gap-2">
                    <input className="w-full border p-2 rounded bg-gray-100 font-mono text-center tracking-widest" value={newUni.adminCode} readOnly />
                    <button type="button" onClick={generateCode} className="text-sm text-blue-600 hover:underline">Regen</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Subdomain</label>
                    <input className="w-full border p-2 rounded" value={newUni.subdomain} onChange={e => setNewUni({...newUni, subdomain: e.target.value})} required />
                 </div>
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Max Students</label>
                    <input type="number" className="w-full border p-2 rounded" value={newUni.maxStudents} onChange={e => setNewUni({...newUni, maxStudents: parseInt(e.target.value)})} />
                 </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2 border rounded">Cancel</button>
                <button type="submit" className="flex-1 py-2 bg-indigo-600 text-white rounded font-bold">Create</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}