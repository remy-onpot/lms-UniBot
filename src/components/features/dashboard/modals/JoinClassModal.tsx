'use client';
import { Button } from '../../../ui/Button'; // ✅ Fixed casing and path
import { useEffect, useRef } from 'react';

interface JoinClassModalProps {
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  code: string;
  onChange: (code: string) => void;
}

export default function JoinClassModal({ onClose, onSubmit, loading, code, onChange }: JoinClassModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-bold mb-1 text-slate-900">Join Class</h2>
        <p className="text-slate-500 text-sm mb-6">Enter the access code shared by your lecturer.</p>
        <form onSubmit={onSubmit} className="space-y-4">
            <input 
              ref={inputRef}
              placeholder="XXX-0000" 
              className="w-full bg-slate-50 border-2 border-dashed border-slate-200 p-4 rounded-xl text-center font-mono text-2xl uppercase tracking-widest text-slate-900 focus:border-blue-500 outline-none" 
              value={code} 
              onChange={e => onChange(e.target.value)} 
              required 
            />
            <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                <Button type="submit" variant="primary" disabled={loading} className="flex-1 bg-slate-900 hover:bg-slate-800">
                  {loading ? 'Joining...' : 'Join Class'}
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
}