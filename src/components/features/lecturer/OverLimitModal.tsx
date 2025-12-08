'use client';
import { AlertTriangle, Archive, CheckCircle, Lock } from 'lucide-react';

interface OverLimitModalProps {
  activeClasses: any[];
  limit: number;
  onArchive: (id: string) => void;
}

export function OverLimitModal({ activeClasses, limit, onArchive }: OverLimitModalProps) {
  const currentCount = activeClasses.length;
  const overage = currentCount - limit;
  const isCompliant = overage <= 0;

  // If compliant, don't show anything (Self-managing)
  if (isCompliant) return null;

  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative overflow-hidden border-2 border-red-100">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Lock className="w-10 h-10 text-red-600" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Console Locked</h2>
          <p className="text-slate-500 mt-2 text-sm">
            Your current plan (Limit: <b>{limit}</b>) cannot support <b>{currentCount}</b> active classes.
          </p>
        </div>

        {/* Status Bar */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-start gap-3">
          <div className="min-w-6 font-bold text-red-600">⚠️</div>
          <div className="text-sm text-red-800">
            <strong>Action Required:</strong> You must archive <b>{overage}</b> more {overage === 1 ? 'class' : 'classes'} to unlock your account.
          </div>
        </div>

        {/* Class List to Archive */}
        <div className="mb-2 text-xs font-bold text-slate-400 uppercase tracking-wider">Select classes to archive:</div>
        <div className="max-h-60 overflow-y-auto pr-2 space-y-3 mb-6 custom-scrollbar bg-slate-50 p-2 rounded-xl border border-slate-100">
          {activeClasses.map(cls => (
            <div key={cls.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-red-300 transition-colors">
              <div>
                <p className="font-bold text-slate-700 text-sm">{cls.name}</p>
                <p className="text-[10px] text-slate-400 font-mono">{cls.access_code}</p>
              </div>
              <button 
                onClick={() => onArchive(cls.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 rounded-lg text-xs font-bold transition-all border border-red-100"
              >
                <Archive className="w-3 h-3" /> Archive
              </button>
            </div>
          ))}
        </div>

        {/* Disabled Footer */}
        <div className="text-center border-t border-slate-100 pt-4">
           <button disabled className="w-full py-3 bg-slate-200 text-slate-400 font-bold rounded-xl cursor-not-allowed flex items-center justify-center gap-2">
             <Lock className="w-4 h-4" />
             Dashboard Access Restricted
           </button>
        </div>
      </div>
    </div>
  );
}