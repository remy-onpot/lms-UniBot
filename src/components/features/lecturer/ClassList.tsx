import { Users, BookOpen, Archive, Trash2, Undo2, ShieldCheck, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ClassListProps {
  classes: any[];
  type: 'active' | 'archived';
  onArchive: (id: string, name: string) => void;
  onRestore: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}

export function ClassList({ classes, type, onArchive, onRestore, onDelete }: ClassListProps) {
  const router = useRouter();

  if (classes.length === 0) return null;

  return (
    <div className="space-y-4">
      {classes.map(cls => {
        // 🧠 UI LOGIC: Is this a "Protected" Cohort?
        const isCohort = cls.type === 'cohort';

        return (
          <div 
            key={cls.id} 
            className={`group relative p-5 md:p-6 rounded-2xl border-2 transition-all duration-300 ${
              type === 'active' 
                ? 'bg-white border-slate-100 hover:border-indigo-300 hover:shadow-xl' 
                : 'bg-slate-50/50 border-slate-200 opacity-80 hover:opacity-100'
            }`}
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              
              {/* Class Info */}
              <div className="flex-1 flex items-start gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md text-white font-black text-xl shrink-0 ${
                  isCohort ? 'bg-slate-900' : 'bg-linear-to-br from-indigo-500 to-blue-600'
                }`}>
                  {cls.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      {cls.name}
                    </h3>
                    {isCohort && (
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border border-slate-200">
                           <ShieldCheck className="w-3 h-3" /> COHORT
                        </span>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-3 mt-2 text-xs font-medium text-slate-500">
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded">
                        <Users className="w-3 h-3" /> {cls.studentCount || 0} Students
                    </span>
                    <span className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded font-mono text-slate-700">
                        {cls.access_code}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-2 w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-100">
                
                {/* Manage Button (Always Available) */}
                <button 
                  onClick={() => router.push(`/dashboard/class/${cls.id}`)}
                  className="flex-1 md:flex-initial px-5 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition shadow-lg"
                >
                  Manage
                </button>

                {/* Archive/Delete Actions (SaaS Only) */}
                {!isCohort && type === 'active' && (
                  <button 
                    onClick={() => onArchive(cls.id, cls.name)}
                    className="px-3 py-2.5 text-orange-500 hover:bg-orange-50 rounded-xl transition border border-transparent hover:border-orange-100"
                    title="Archive Class"
                  >
                    <Archive className="w-5 h-5" />
                  </button>
                )}

                {/* Locked Indicator for Cohorts */}
                {isCohort && (
                   <div className="flex items-center px-3 text-slate-400 text-xs font-bold" title="Cohorts cannot be archived by lecturers">
                      <Lock className="w-4 h-4 mr-1" /> Protected
                   </div>
                )}

                {!isCohort && type === 'archived' && (
                  <>
                    <button 
                      onClick={() => onRestore(cls.id)}
                      className="flex items-center gap-2 px-4 py-2.5 bg-green-50 text-green-600 border-2 border-green-200 rounded-xl font-bold text-sm hover:bg-green-100 transition"
                    >
                      <Undo2 className="w-4 h-4" /> Restore
                    </button>
                    <button 
                      onClick={() => onDelete(cls.id, cls.name)}
                      className="p-2.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}