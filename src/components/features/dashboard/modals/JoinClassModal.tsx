'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { supabase } from '@/lib/supabase';
import { ClassService } from '@/lib/services/class.service';

interface JoinClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

export function JoinClassModal({ isOpen, onClose, userId, onSuccess }: JoinClassModalProps) {
  const [accessCode, setAccessCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ FIX 2: Instantiate Service
  const classService = new ClassService(supabase);

  if (!isOpen) return null;

  const handleJoin = async () => {
    if (!accessCode.trim()) return;

    setIsSubmitting(true);
    const toastId = toast.loading("Joining class...");

    try {
      // ✅ FIX 3: Use instance method
      await classService.joinClass(accessCode, userId);
      
      toast.success("Successfully joined class!", { id: toastId });
      setAccessCode('');
      
      onSuccess(); 
      onClose();

    } catch (error: any) {
      toast.error(error.message, { id: toastId });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in"
      onClick={() => !isSubmitting && onClose()}
    >
      <div 
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl animate-in slide-in-from-bottom-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-black text-slate-900">Join a Class</h3>
          <button 
            onClick={onClose}
            disabled={isSubmitting}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition disabled:opacity-50"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Input Area */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-bold text-slate-700 mb-2 block">Access Code</label>
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && !isSubmitting && handleJoin()}
              placeholder="e.g. CS-1234"
              disabled={isSubmitting}
              className="w-full h-14 px-4 text-center text-lg font-mono font-bold tracking-widest uppercase bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-indigo-500 focus:bg-white outline-none transition disabled:opacity-50"
              maxLength={20}
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-2 px-1">
              Enter the code provided by your lecturer.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 h-12 px-4 rounded-xl border-2 border-slate-200 text-slate-700 font-bold hover:bg-slate-50 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              disabled={isSubmitting || !accessCode.trim()}
              className="flex-1 h-12 px-4 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              {isSubmitting ? 'Joining...' : 'Join Class'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}