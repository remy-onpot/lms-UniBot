'use client';
import { X, Crown, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useRouter } from 'next/navigation';

interface UpgradeModalProps {
  isOpen: boolean; // ✅ Added prop
  onClose: () => void;
}

export function UpgradeModal({ isOpen, onClose }: UpgradeModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden relative">
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition text-slate-500"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="bg-slate-900 p-8 text-center">
           <div className="w-16 h-16 bg-linear-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
              <Crown className="w-8 h-8 text-white" />
           </div>
           <h2 className="text-2xl font-black text-white">Unlock Unlimited Classes</h2>
           <p className="text-indigo-200 text-sm mt-2">
             You've reached the limit of your current plan. Upgrade to <strong>Pro</strong> to create more classes.
           </p>
        </div>

        <div className="p-8">
           <ul className="space-y-4 mb-8">
              <li className="flex items-center gap-3 text-sm text-slate-700">
                 <div className="p-1 bg-green-100 rounded-full"><Check className="w-3 h-3 text-green-600" /></div>
                 Create up to <strong>3 Active Classes</strong>
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-700">
                 <div className="p-1 bg-green-100 rounded-full"><Check className="w-3 h-3 text-green-600" /></div>
                 <strong>500 Student</strong> Capacity
              </li>
              <li className="flex items-center gap-3 text-sm text-slate-700">
                 <div className="p-1 bg-green-100 rounded-full"><Check className="w-3 h-3 text-green-600" /></div>
                 Advanced AI Grading Features
              </li>
           </ul>

           <Button 
             onClick={() => router.push('/dashboard/billing')}
             className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xl shadow-indigo-200"
           >
             View Upgrade Options
           </Button>
           
           <button onClick={onClose} className="w-full mt-4 text-xs font-bold text-slate-400 hover:text-slate-600">
             Maybe Later
           </button>
        </div>
      </div>
    </div>
  );
}