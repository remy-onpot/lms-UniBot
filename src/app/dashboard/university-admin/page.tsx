'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { FocusTrap } from 'focus-trap-react';
import { 
  Building2, Users, GraduationCap, BarChart3, 
  Megaphone, Plus, Search, School 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { toast } from 'sonner';

export default function UniversityAdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'classes' | 'broadcast'>('overview');
  
  // Admin's Context
  const [adminProfile, setAdminProfile] = useState<any>(null);
  const [myUniversity, setMyUniversity] = useState<any>(null);

  // Data State
  const [stats, setStats] = useState({ totalStudents: 0, totalClasses: 0, totalDepts: 0 });
  const [departments, setDepartments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  
  // Modals
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [newDept, setNewDept] = useState({ name: '', code: '' });
  const [broadcast, setBroadcast] = useState({ title: '', message: '' });

  useEffect(() => {
    initDashboard();
  }, []);

  const initDashboard = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Get Admin Profile to find their University
      const { data: profile } = await supabase
        .from('users')
        .select('*, university:universities(*)')
        .eq('id', user.id)
        .single();

      if (!profile?.university_id) {
        setLoading(false);
        return; // Handle "No University Assigned" state if needed
      }

      setAdminProfile(profile);
      setMyUniversity(profile.university);

      // 2. Fetch University-Specific Data
      await Promise.all([
        fetchStats(profile.university_id),
        fetchDepartments(profile.university_id)
      ]);

    } catch (error) {
      console.error("Admin Load Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async (uniId: string) => {
    // Count Students
    const { count: studentCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('university_id', uniId)
      .eq('role', 'student');

    // Count Classes (assuming classes have university_id or linked via lecturer)
    // For MVP, we might need to link classes to universities explicitly if not done yet
    
    setStats(prev => ({ ...prev, totalStudents: studentCount || 0 }));
  };

  const fetchDepartments = async (uniId: string) => {
    const { data } = await supabase
      .from('departments') // Ensure this table exists
      .select('*')
      .eq('university_id', uniId);
    if (data) setDepartments(data);
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myUniversity?.id) return;

    const { error } = await supabase.from('departments').insert([{
      university_id: myUniversity.id,
      name: newDept.name,
      code: newDept.code
    }]);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Department Added");
      setShowDeptModal(false);
      setNewDept({ name: '', code: '' });
      fetchDepartments(myUniversity.id);
    }
  };

  if (loading) return <div className="flex h-screen items-center justify-center animate-pulse">Loading {myUniversity?.name || 'Dashboard'}...</div>;

  if (!myUniversity) return (
    <div className="flex h-screen items-center justify-center flex-col gap-4">
      <School className="w-12 h-12 text-slate-300" />
      <h3 className="text-xl font-bold text-slate-700">No University Assigned</h3>
      <p className="text-slate-500">Contact Super Admin to link your account to an institution.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* HEADER */}
        <header className="mb-8 flex justify-between items-end">
          <div>
            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md uppercase tracking-wider">
              {myUniversity.abbreviation} Admin
            </span>
            <h1 className="text-3xl font-bold text-slate-900 mt-2">{myUniversity.name}</h1>
            <p className="text-slate-500">Manage your institution's digital campus.</p>
          </div>
        </header>

        {/* TABS */}
        <div className="flex gap-2 border-b border-slate-200 mb-8 overflow-x-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'departments', label: 'Departments', icon: GraduationCap },
            { id: 'classes', label: 'Classes', icon: Users },
            { id: 'broadcast', label: 'Campus News', icon: Megaphone },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${
                activeTab === tab.id 
                  ? 'border-indigo-600 text-indigo-600' 
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* === OVERVIEW TAB === */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatsCard label="Total Students" value={stats.totalStudents} icon={Users} color="blue" />
            <StatsCard label="Departments" value={departments.length} icon={Building2} color="green" />
            <StatsCard label="Active Classes" value={stats.totalClasses} icon={GraduationCap} color="orange" />
          </div>
        )}

        {/* === DEPARTMENTS TAB === */}
        {activeTab === 'departments' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold text-slate-900">Faculties & Departments</h3>
              <Button onClick={() => setShowDeptModal(true)} className="bg-indigo-600">
                <Plus className="w-4 h-4 mr-2" /> Add Department
              </Button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.length === 0 ? (
                <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed text-slate-400">
                  No departments found. Add one to get started.
                </div>
              ) : (
                departments.map((dept) => (
                  <div key={dept.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition">
                    <h4 className="font-bold text-slate-900">{dept.name}</h4>
                    <p className="text-xs font-mono text-slate-500 mt-1">{dept.code}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

      </div>

      {/* --- MODALS --- */}
      {showDeptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <FocusTrap focusTrapOptions={{ initialFocus: '#dept-name', onDeactivate: () => setShowDeptModal(false) }}>
            <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-2xl">
              <h3 className="text-lg font-bold mb-4">Add Department</h3>
              <form onSubmit={handleCreateDept} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department Name</label>
                  <input 
                    id="dept-name"
                    className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    placeholder="e.g. Computer Science" 
                    value={newDept.name} 
                    onChange={e => setNewDept({...newDept, name: e.target.value})} 
                    required 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Code</label>
                  <input 
                    className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" 
                    placeholder="e.g. CS" 
                    value={newDept.code} 
                    onChange={e => setNewDept({...newDept, code: e.target.value})} 
                    required 
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="button" variant="secondary" onClick={() => setShowDeptModal(false)} className="flex-1">Cancel</Button>
                  <Button type="submit" className="flex-1 bg-indigo-600">Create</Button>
                </div>
              </form>
            </div>
          </FocusTrap>
        </div>
      )}
    </div>
  );
}

// Simple Card Component
function StatsCard({ label, value, icon: Icon, color }: any) {
  const colors: any = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    orange: "bg-orange-50 text-orange-600"
  };
  
  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-start">
      <div>
        <p className="text-slate-500 text-sm font-medium uppercase">{label}</p>
        <h3 className="text-3xl font-black text-slate-900 mt-2">{value}</h3>
      </div>
      <div className={`p-3 rounded-xl ${colors[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}