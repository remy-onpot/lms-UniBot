'use client';
import { AlertTriangle, Archive, Crown } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { DashboardClass } from '@/lib/services/class.service';

interface OverLimitModalProps {
  isOpen: boolean; // ✅ Added
  activeClasses: DashboardClass[];
  limit: number;
  onArchive: (id: string) => void;
}

export function OverLimitModal({ isOpen, activeClasses, limit, onArchive }: OverLimitModalProps) {
  if (!isOpen) return null; // ✅ Logic to hide if false

  const excessCount = activeClasses.length - limit;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-amber-50 border-b border-amber-100 p-6 flex gap-4">
           <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
           </div>
           <div>
              <h3 className="text-lg font-bold text-slate-900">Plan Limit Reached</h3>
              <p className="text-sm text-slate-600 mt-1">
                You have <strong>{activeClasses.length}</strong> active classes, but your plan only allows <strong>{limit}</strong>.
              </p>
           </div>
        </div>

        <div className="p-6">
           <p className="text-sm font-medium text-slate-500 mb-4">
             Please archive {excessCount} class{excessCount > 1 ? 'es' : ''} to continue, or upgrade your plan.
           </p>
           
           <div className="space-y-2 max-h-60 overflow-y-auto border rounded-xl p-2 bg-slate-50">
              {activeClasses.map(cls => (
                 <div key={cls.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm">
                    <div>
                       <p className="font-bold text-sm text-slate-900">{cls.name}</p>
                       <p className="text-xs text-slate-500">{cls.studentCount || 0} Students</p>
                    </div>
                    <Button onClick={() => onArchive(cls.id)} size="sm" variant="outline" className="text-xs h-8 border-slate-300">
                       <Archive className="w-3 h-3 mr-1" /> Archive
                    </Button>
                 </div>
              ))}
           </div>

           <div className="mt-6 flex gap-3">
              <Button className="w-full bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                 <Crown className="w-4 h-4 mr-2" /> Upgrade Plan
              </Button>
           </div>
        </div>
      </div>
    </div>
  );
}