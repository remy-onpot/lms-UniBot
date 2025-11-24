'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Your Super Admin UID
const SUPER_ADMIN_UID = "82711e72-9c6a-48b8-ac34-e47f379e4695";

export default function SuperAdminDashboard() {
  const [user, setUser] = useState<any>(null);
  const [universities, setUniversities] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalUniversities: 0,
    totalUsers: 0,
    totalClasses: 0,
    totalStudents: 0
  });
  const [loading, setLoading] = useState(true);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUni, setNewUni] = useState({
    name: '',
    subdomain: '',
    tier: 'free',
    maxStudents: 50,
    maxCourses: 1
  });

  const router = useRouter();

  const checkAccess = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user || user.id !== SUPER_ADMIN_UID) {
      // If not the super admin, kick them back to the regular dashboard
      return router.push('/dashboard'); 
    }

    setUser(user);
    fetchData();
  };

  const fetchData = async () => {
    const { data: unis } = await supabase.from('universities').select('*').order('created_at', { ascending: false });
    if (unis) setUniversities(unis);

    // Fetch counts
    const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
    const { count: classCount } = await supabase.from('classes').select('*', { count: 'exact', head: true });
    const { count: studentCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'student');

    setStats({
      totalUniversities: unis?.length || 0,
      totalUsers: userCount || 0,
      totalClasses: classCount || 0,
      totalStudents: studentCount || 0
    });

    setLoading(false);
  };
  
  useEffect(() => {
    checkAccess();
  }, [router]);

  const handleCreateUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('universities').insert([{
        name: newUni.name,
        subdomain: newUni.subdomain.toLowerCase().replace(/[^a-z0-9-]/g, ''),
        tier: newUni.tier,
        max_students: newUni.maxStudents,
        max_courses: newUni.maxCourses,
        admin_uid: SUPER_ADMIN_UID,
        is_verified: true
      }]);

      if (error) throw error;

      alert('University created successfully!');
      setShowCreateModal(false);
      setNewUni({ name: '', subdomain: '', tier: 'free', maxStudents: 50, maxCourses: 1 });
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteUniversity = async (id: string) => {
    if (!confirm('Are you sure? This will delete the university and potentially break linked accounts.')) return;
    try {
      const { error } = await supabase.from('universities').delete().eq('id', id);
      if (error) throw error;
      fetchData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div className="flex h-screen items-center justify-center">Loading Super Admin Panel...</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* SUPER ADMIN NAVBAR */}
      <nav className="bg-linear-to-r from-indigo-900 to-blue-800 shadow-lg sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-2xl">👑</span>
              <span className="text-xl font-bold text-white">Platform Control</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-indigo-100">{user?.email}</span>
              <button onClick={() => router.push('/dashboard')} className="text-sm text-white hover:text-indigo-200 border border-white/20 px-3 py-1 rounded">
                 View User App
              </button>
              <button onClick={handleLogout} className="text-sm font-bold text-white bg-red-500/20 hover:bg-red-500/40 px-3 py-1 rounded">
                 Log Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        
        {/* STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {[
            { label: 'Universities', value: stats.totalUniversities, icon: '🏫', color: 'blue' },
            { label: 'Total Users', value: stats.totalUsers, icon: '👥', color: 'green' },
            { label: 'Active Classes', value: stats.totalClasses, icon: '📚', color: 'purple' },
            { label: 'Students', value: stats.totalStudents, icon: '🎓', color: 'orange' },
          ].map((stat, i) => (
            <div key={i} className={`bg-white rounded-xl shadow-sm p-6 border-l-4 border-${stat.color}-500`}>
               <div className="flex justify-between items-center">
                 <div>
                   <p className="text-sm text-gray-500 font-bold uppercase">{stat.label}</p>
                   <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
                 </div>
                 <div className={`text-3xl bg-${stat.color}-50 p-3 rounded-full`}>{stat.icon}</div>
               </div>
            </div>
          ))}
        </div>

        {/* UNIVERSITY TABLE */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 flex justify-between items-center bg-gray-50/50">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Registered Universities</h2>
              <p className="text-gray-500 text-sm">Manage tenants and subscription tiers.</p>
            </div>
            <button onClick={() => setShowCreateModal(true)} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 shadow-lg transition hover:-translate-y-0.5">
              + Add University
            </button>
          </div>

          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Subdomain</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Tier</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Limits</th>
                <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {universities.map((uni) => (
                <tr key={uni.id} className="hover:bg-gray-50 transition">
                  <td className="px-6 py-4 font-medium text-gray-900">{uni.name}</td>
                  <td className="px-6 py-4 text-gray-600 font-mono text-sm">{uni.subdomain}.swish.com</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${uni.tier === 'enterprise' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                      {uni.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {uni.max_students} Students / {uni.max_courses} Courses
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => handleDeleteUniversity(uni.id)} className="text-red-500 hover:text-red-700 font-bold text-sm">Delete</button>
                  </td>
                </tr>
              ))}
              {universities.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-400">No universities found. Create one to get started.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-8 shadow-2xl">
            <h2 className="mb-6 text-xl font-bold text-gray-900">Create New University</h2>
            <form onSubmit={handleCreateUniversity} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">University Name</label>
                <input className="w-full border p-2 rounded" placeholder="e.g. University of Ghana" value={newUni.name} onChange={e => setNewUni({...newUni, name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Subdomain Identifier</label>
                <input className="w-full border p-2 rounded" placeholder="ug" value={newUni.subdomain} onChange={e => setNewUni({...newUni, subdomain: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">Plan Tier</label>
                    <select className="w-full border p-2 rounded" value={newUni.tier} onChange={e => setNewUni({...newUni, tier: e.target.value})}>
                        <option value="free">Free</option>
                        <option value="pro">Pro</option>
                        <option value="enterprise">Enterprise</option>
                    </select>
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