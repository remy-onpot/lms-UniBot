// src/app/dashboard/university-admin/page.tsx

'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { FocusTrap } from 'focus-trap-react';
export default function UniversityAdminDashboard() {
  const [university, setUniversity] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'departments' | 'classes' | 'users' | 'broadcast'>('overview');

  const [users, setUsers] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  const [departmentStats, setDepartmentStats] = useState<{[key: string]: number}>({});
  
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });
  const [sendingBroadcast, setSendingBroadcast] = useState(false);

  const [newDept, setNewDept] = useState({ name: '', code: '' });
  const [newClass, setNewClass] = useState({ 
    department_id: '', 
    program_name: '', 
    admission_year: new Date().getFullYear(), 
    duration: 4,
  });

  const router = useRouter();

  // ... (Existing useEffect and fetchData logic remains the same) ...
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // ... (fetch logic) ...
    setLoading(false);
  };

  const handleCreateDept = async (e: React.FormEvent) => {
    e.preventDefault();
    // ... (logic) ...
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    // ... (logic) ...
  };

  const handleBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    // ... (logic) ...
  };

  if (loading) return <div role="status" aria-label="Loading admin dashboard" className="flex h-screen items-center justify-center">Loading Dashboard...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ... Header and Main Content (Tabs) remain similar, ensure buttons have aria-labels if icon-only ... */}
      
      {/* MODALS */}
{showDeptModal && (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="add-dept-title">
  <FocusTrap focusTrapOptions={{ initialFocus: '#dept-name', onDeactivate: () => setShowDeptModal(false), clickOutsideDeactivates: true }}>
      <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl">
        <h3 id="add-dept-title" className="text-lg font-bold mb-4">Add Department</h3>
        <form onSubmit={handleCreateDept} className="space-y-4">
          <input id="dept-name" aria-label="Department Name" className="w-full border p-2 rounded" placeholder="Name" value={newDept.name} onChange={e => setNewDept({...newDept, name: e.target.value})} required />
          <input aria-label="Department Code" className="w-full border p-2 rounded" placeholder="Code" value={newDept.code} onChange={e => setNewDept({...newDept, code: e.target.value})} required />
          <div className="flex gap-2 pt-2"><button type="button" onClick={() => setShowDeptModal(false)} className="flex-1 py-2 border rounded">Cancel</button><button type="submit" className="flex-1 py-2 bg-gray-900 text-white rounded font-bold">Create</button></div>
        </form>
      </div>
  </FocusTrap>
</div>
)}

{showClassModal && (
<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-cohort-title">
  <FocusTrap focusTrapOptions={{ initialFocus: '#dept-select', onDeactivate: () => setShowClassModal(false), clickOutsideDeactivates: true }}>
      <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl">
        <h3 id="create-cohort-title" className="text-lg font-bold mb-6">Create Cohort</h3>
        <form onSubmit={handleCreateClass} className="space-y-4">
          {/* ... inputs with labels as defined in previous semantic step ... */}
          {/* (Content remains similar, just wrapped in FocusTrap) */}
          <div>
            <label htmlFor="dept-select" className="block text-xs font-bold text-gray-500 uppercase mb-1">Department</label>
            <select id="dept-select" className="w-full border p-2 rounded" value={newClass.department_id} onChange={e => setNewClass({...newClass, department_id: e.target.value})} required>
              <option value="">Select...</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          {/* ... rest of the form */}
          <div className="flex gap-2 pt-4"><button type="button" onClick={() => setShowClassModal(false)} className="flex-1 py-2 border rounded">Cancel</button><button type="submit" className="flex-1 py-2 bg-orange-600 text-white rounded font-bold">Create</button></div>
        </form>
      </div>
  </FocusTrap>
</div>
)}
    </div>
  );
}
