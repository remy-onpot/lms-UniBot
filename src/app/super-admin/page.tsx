'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Pricing Constants for Revenue Calculation
const PRICE_TIERS = {
  starter: 0,
  pro: 300,
  elite: 600,
  cohort_manager: 0 // Assumed free until they sell content
};

const ACCESS_PRICES = {
  trial: 15, // Single course
  full_semester: 50 // Bundle
};

export default function SuperAdminDashboard() {
  const router = useRouter();
  
  // --- STATE ---
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'broadcast'>('overview');
  const [loading, setLoading] = useState(true);

  // Data Containers
  const [stats, setStats] = useState({
    revenue: 0,
    totalUsers: 0,
    activeSubs: 0,
    bannedUsers: 0
  });
  
  const [usersList, setUsersList] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Broadcast Form
  const [broadcast, setBroadcast] = useState({ title: '', message: '', type: 'info' });
  const [sending, setSending] = useState(false);

  // --- INITIAL LOAD ---
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push('/login');

      // Security Check: Verify Role in DB
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'super_admin') {
        return router.push('/dashboard'); 
      }

      setCurrentUser(user);
      fetchDashboardData();
    };
    init();
  }, [router]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // 1. Fetch Users for Management
      const { data: allUsers } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100); // Pagination recommended for production

      setUsersList(allUsers || []);

      // 2. Calculate Stats (Revenue & Counts)
      // Note: In a real app, use a SQL View or Edge Function for this math
      
      // A. Subscription Revenue (Lecturers)
      const { data: lecturers } = await supabase.from('users').select('plan_tier').eq('role', 'lecturer');
      let mrr = 0; // Monthly Recurring Revenue
      lecturers?.forEach((l: any) => {
        mrr += PRICE_TIERS[l.plan_tier as keyof typeof PRICE_TIERS] || 0;
      });

      // B. Content Revenue (Student One-offs)
      const { data: payments } = await supabase.from('student_course_access').select('access_type');
      let oneTimeRevenue = 0;
      payments?.forEach((p: any) => {
        oneTimeRevenue += ACCESS_PRICES[p.access_type as keyof typeof ACCESS_PRICES] || 0;
      });

      // C. Get Counts
      const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: bannedCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_banned', true); // Assuming you add is_banned column

      setStats({
        revenue: mrr + oneTimeRevenue,
        totalUsers: userCount || 0,
        activeSubs: lecturers?.length || 0,
        bannedUsers: bannedCount || 0
      });

    } catch (error) {
      console.error("Dashboard Load Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- ACTIONS ---

  // God Mode: Ban/Unban User
  const toggleBanStatus = async (userId: string, currentStatus: boolean) => {
    if(!confirm(`Are you sure you want to ${currentStatus ? 'UNBAN' : 'BAN'} this user?`)) return;

    // You need to add an 'is_banned' column to your users table for this to work
    const { error } = await supabase
      .from('users')
      .update({ is_banned: !currentStatus })
      .eq('id', userId);

    if (error) alert(error.message);
    else {
      // Refresh local state
      setUsersList(usersList.map(u => u.id === userId ? { ...u, is_banned: !currentStatus } : u));
    }
  };

  // Broadcast System
  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);

    // This requires a 'system_announcements' table
    const { error } = await supabase.from('system_announcements').insert([{
      title: broadcast.title,
      message: broadcast.message,
      type: broadcast.type,
      sent_by: currentUser.id
    }]);

    if (error) {
      alert("Failed to send: " + error.message);
    } else {
      alert("Broadcast Sent Successfully!");
      setBroadcast({ title: '', message: '', type: 'info' });
    }
    setSending(false);
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-bold text-slate-500">Loading Platform Data...</div>;

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* HEADER */}
      <nav className="bg-slate-900 text-white sticky top-0 z-20 shadow-xl">
        <div className="mx-auto max-w-7xl px-6 h-16 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚡</span>
            <span className="font-bold text-lg tracking-tight">Platform Admin</span>
          </div>
          <button onClick={() => supabase.auth.signOut().then(() => router.push('/login'))} className="text-xs bg-red-500/20 text-red-200 px-3 py-1.5 rounded hover:bg-red-600/30 transition">
            Log Out
          </button>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-6 py-8">
        
        {/* TABS */}
        <div className="flex gap-6 border-b border-gray-200 mb-8">
          {['overview', 'users', 'broadcast'].map(tab => (
            <button 
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`pb-3 text-sm font-bold capitalize transition-all ${activeTab === tab ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-800'}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* VIEW: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Revenue Card */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase">Est. Total Revenue</p>
                <p className="text-3xl font-bold text-green-600 mt-2">₵{stats.revenue.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-1">Subscriptions + Content</p>
              </div>

              {/* Users Card */}
              <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase">Total Users</p>
                <p className="text-3xl font-bold text-slate-900 mt-2">{stats.totalUsers}</p>
              </div>

               {/* Paid Accounts */}
               <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase">Active Subscriptions</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.activeSubs}</p>
                <p className="text-xs text-gray-400 mt-1">Pro/Elite Lecturers</p>
              </div>

               {/* Banned */}
               <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-xs font-bold text-gray-500 uppercase">Banned Users</p>
                <p className="text-3xl font-bold text-red-600 mt-2">{stats.bannedUsers}</p>
              </div>
            </div>

            {/* Recent Activity Mockup */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-bold text-lg mb-4">Live Platform Activity</h3>
              <div className="space-y-4">
                {[1,2,3].map(i => (
                  <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0">
                    <span className="text-gray-600">New payment processed for <span className="font-bold text-gray-900">Introduction to CS</span></span>
                    <span className="text-gray-400 text-xs">2 mins ago</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* VIEW: USER MANAGEMENT (GOD MODE) */}
        {activeTab === 'users' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
               <h3 className="font-bold text-lg text-gray-900">User Directory</h3>
               <input 
                 placeholder="Search by name or email..." 
                 className="px-4 py-2 border rounded-lg text-sm w-64 focus:ring-2 focus:ring-blue-500 outline-none"
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
               />
            </div>
            
            <table className="w-full text-left text-sm">
              <thead className="bg-white text-gray-500 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-bold">User</th>
                  <th className="px-6 py-4 font-bold">Role</th>
                  <th className="px-6 py-4 font-bold">Plan</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {usersList
                  .filter(u => 
                    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map(u => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="font-bold text-gray-900">{u.full_name || 'No Name'}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">{u.id}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                        u.role === 'lecturer' ? 'bg-purple-100 text-purple-700' :
                        u.role === 'super_admin' ? 'bg-black text-white' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600 capitalize">
                      {u.plan_tier || 'Free'}
                    </td>
                    <td className="px-6 py-4">
                       {u.is_banned ? (
                         <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">BANNED</span>
                       ) : (
                         <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">ACTIVE</span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {u.role !== 'super_admin' && (
                        <button 
                          onClick={() => toggleBanStatus(u.id, u.is_banned)}
                          className={`text-xs font-bold px-3 py-1.5 rounded transition ${
                            u.is_banned 
                              ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                              : 'bg-gray-100 text-red-600 hover:bg-red-100'
                          }`}
                        >
                          {u.is_banned ? 'Restore Access' : 'Ban User'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW: GLOBAL BROADCAST */}
        {activeTab === 'broadcast' && (
          <div className="max-w-2xl mx-auto">
             <div className="bg-blue-600 text-white p-8 rounded-t-xl">
               <h3 className="text-2xl font-bold">System Broadcast</h3>
               <p className="text-blue-100 opacity-90 mt-2">Send alerts to all {stats.totalUsers} active users.</p>
             </div>
             <form onSubmit={handleBroadcast} className="bg-white p-8 rounded-b-xl shadow-sm border border-gray-200 space-y-6">
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">Alert Level</label>
                   <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="type" checked={broadcast.type === 'info'} onChange={() => setBroadcast({...broadcast, type: 'info'})} />
                        <span className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">ℹ️ Info</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="type" checked={broadcast.type === 'warning'} onChange={() => setBroadcast({...broadcast, type: 'warning'})} />
                        <span className="text-sm bg-orange-100 text-orange-700 px-2 py-1 rounded font-bold">⚠️ Warning</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="type" checked={broadcast.type === 'critical'} onChange={() => setBroadcast({...broadcast, type: 'critical'})} />
                        <span className="text-sm bg-red-100 text-red-700 px-2 py-1 rounded font-bold">🔥 Critical</span>
                      </label>
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">Headline</label>
                   <input 
                      className="w-full border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. Scheduled Maintenance Tonight"
                      value={broadcast.title}
                      onChange={e => setBroadcast({...broadcast, title: e.target.value})}
                      required
                   />
                </div>

                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-2">Message Body</label>
                   <textarea 
                      className="w-full border p-3 rounded-lg h-32 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Enter the details of the announcement..."
                      value={broadcast.message}
                      onChange={e => setBroadcast({...broadcast, message: e.target.value})}
                      required
                   />
                </div>

                <button 
                  disabled={sending}
                  className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition shadow-lg disabled:opacity-50"
                >
                  {sending ? 'Broadcasting...' : 'Send Alert'}
                </button>
             </form>
          </div>
        )}

      </main>
    </div>
  );
}