'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserProfile } from '@/types';
import { DashboardClass, ClassService } from '@/lib/services/class.service';
import { 
  Plus, Users, BookOpen, MoreVertical, Archive, 
  Trash2, RefreshCw, Calendar, ArrowRight, Settings 
} from 'lucide-react';
import { toast } from 'sonner';

interface LecturerDashboardProps {
  profile: UserProfile;
  classes: DashboardClass[]; // The 6 "Sessions"
  modules?: any[];           // The 1 "Unique Module" (Optional)
}

export function LecturerDashboard({ profile, classes, modules = [] }: LecturerDashboardProps) {
  const router = useRouter();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Local state for immediate UI updates before reload
  const [localClasses, setLocalClasses] = useState<DashboardClass[]>(classes);

  // Form State
  const [newClass, setNewClass] = useState({ title: '', code: '', description: '' });

  // --- ACTIONS ---

  const handleCreateClass = async () => {
    if (!newClass.title || !newClass.code) return toast.error("Title and Code are required");

    setIsSubmitting(true);
    try {
      // ✅ FIXED: Passing object instead of 3 arguments
      await ClassService.createClass({
        title: newClass.title,
        code: newClass.code,
        description: newClass.description,
        lecturer_id: profile.id
      });

      toast.success("Class created successfully!");
      setShowCreateModal(false);
      setNewClass({ title: '', code: '', description: '' });
      window.location.reload(); // Refresh to see new data
    } catch (error: any) {
      toast.error(error.message || "Failed to create class");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleArchive = async (classId: string) => {
    try {
      await ClassService.archiveClass(classId);
      toast.success("Class archived");
      setLocalClasses(prev => prev.map(c => c.id === classId ? { ...c, isArchived: true } : c));
    } catch (e) { toast.error("Failed to archive"); }
  };

  const handleRestore = async (classId: string) => {
    try {
      await ClassService.restoreClass(classId);
      toast.success("Class restored");
      setLocalClasses(prev => prev.map(c => c.id === classId ? { ...c, isArchived: false } : c));
    } catch (e) { toast.error("Failed to restore"); }
  };

  const handleDelete = async (classId: string) => {
    if (!confirm("Are you sure? This cannot be undone.")) return;
    try {
      // ✅ FIXED: Correct argument count
      await ClassService.deleteClass(classId);
      toast.success("Class deleted");
      setLocalClasses(prev => prev.filter(c => c.id !== classId));
    } catch (e) { toast.error("Failed to delete"); }
  };

  // --- DERIVED STATS ---
  const activeClasses = localClasses.filter(c => !c.isArchived);
  const archivedClasses = localClasses.filter(c => c.isArchived);
  const totalStudents = localClasses.reduce((sum, c) => sum + (c.studentCount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      
      {/* HEADER */}
      <div className="bg-white border-b border-slate-200 px-6 py-8 md:px-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-slate-900">Lecturer Dashboard</h1>
            <p className="text-slate-500 font-medium">Manage your courses, students, and content.</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="p-2.5 rounded-full bg-slate-100 hover:bg-slate-200 transition text-slate-600">
               <Settings className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200"
            >
              <Plus className="w-5 h-5" /> Create Class
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-10 py-8 space-y-8">
        
        {/* STATS ROW */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <StatCard 
            icon={<BookOpen className="w-6 h-6 text-indigo-600" />}
            label="Active Modules"
            value={modules.length} // ✅ Shows "1" Module correctly
            color="bg-indigo-50"
          />
          <StatCard 
            icon={<Calendar className="w-6 h-6 text-purple-600" />}
            label="Active Sessions"
            value={activeClasses.length} // ✅ Shows "6" Classes correctly
            color="bg-purple-50"
          />
          <StatCard 
            icon={<Users className="w-6 h-6 text-green-600" />}
            label="Total Students"
            value={totalStudents}
            color="bg-green-50"
          />
        </div>

        {/* ACTIVE CLASSES GRID */}
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" /> Active Sessions
          </h2>
          
          {activeClasses.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
              <p className="text-slate-500 font-medium">No active classes found.</p>
              <button onClick={() => setShowCreateModal(true)} className="text-indigo-600 font-bold mt-2 hover:underline">
                Create your first class
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {activeClasses.map((cls) => (
                <div 
                  key={cls.id} 
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group relative"
                >
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg text-xs font-bold font-mono">
                      {cls.code}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => handleArchive(cls.id)} className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-orange-500 transition" title="Archive">
                        <Archive className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(cls.id)} className="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-500 transition" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* ✅ FIXED: Use cls.title instead of cls.name */}
                  <h3 className="text-lg font-bold text-slate-900 mb-1 line-clamp-1">{cls.title}</h3>
                  <p className="text-sm text-slate-500 mb-4 line-clamp-2 min-h-[40px]">
                    {cls.description || "No description provided."}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                      <Users className="w-3.5 h-3.5" /> 
                      {cls.studentCount} Students
                    </div>
                    <button 
                      onClick={() => router.push(`/dashboard/courses/${cls.id}`)}
                      className="text-indigo-600 text-xs font-bold flex items-center gap-1 hover:gap-2 transition-all"
                    >
                      Manage <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ARCHIVED SECTION (Collapsible logic can be added, showing simple list for now) */}
        {archivedClasses.length > 0 && (
          <div className="pt-8 border-t border-slate-200">
            <h2 className="text-lg font-bold text-slate-500 mb-4 flex items-center gap-2">
              <Archive className="w-5 h-5" /> Archived Classes
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 opacity-75">
              {archivedClasses.map((cls) => (
                <div key={cls.id} className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
                  <div className="flex justify-between items-start mb-2">
                     <span className="text-xs font-bold text-slate-400">{cls.code}</span>
                     <button onClick={() => handleRestore(cls.id)} className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1">
                        <RefreshCw className="w-3 h-3" /> Restore
                     </button>
                  </div>
                  <h3 className="font-bold text-slate-700">{cls.title}</h3>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-4">
            <h3 className="text-2xl font-black text-slate-900 mb-6">Create New Class</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Class Name</label>
                <input 
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-medium"
                  placeholder="e.g. Introduction to Economics"
                  value={newClass.title}
                  onChange={e => setNewClass({...newClass, title: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Course Code</label>
                <input 
                  className="w-full h-12 px-4 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-medium font-mono uppercase"
                  placeholder="e.g. ECON101"
                  value={newClass.code}
                  onChange={e => setNewClass({...newClass, code: e.target.value.toUpperCase()})}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Description (Optional)</label>
                <textarea 
                  className="w-full p-4 rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none font-medium resize-none h-24"
                  placeholder="Brief description of the class..."
                  value={newClass.description}
                  onChange={e => setNewClass({...newClass, description: e.target.value})}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowCreateModal(false)}
                className="flex-1 h-12 font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreateClass}
                disabled={isSubmitting || !newClass.title || !newClass.code}
                className="flex-1 h-12 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Create Class'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple Stat Card Component
function StatCard({ icon, label, value, color }: { icon: any, label: string, value: number, color: string }) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-slate-900">{value}</p>
      </div>
    </div>
  );
}