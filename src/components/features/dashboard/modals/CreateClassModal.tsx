'use client';
import { Button } from '../../../ui/Button';
import { useEffect, useRef } from 'react';

interface CreateClassModalProps {
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  data: { name: string; description: string };
  onChange: (data: { name: string; description: string }) => void;
}

export default function CreateClassModal({ onClose, onSubmit, loading, data, onChange }: CreateClassModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
    const handleEscape = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
        <h2 className="text-2xl font-bold mb-1 text-slate-900">Create Class</h2>
        <p className="text-slate-500 text-sm mb-6">Set up a new space for your students.</p>
        <form onSubmit={onSubmit} className="space-y-4">
            <input 
              ref={inputRef}
              placeholder="Class Name" 
              className="w-full bg-slate-50 border-none p-4 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-bold placeholder:font-normal" 
              value={data.name} 
              onChange={e => onChange({...data, name: e.target.value})} 
              required 
            />
            <textarea 
              placeholder="Description" 
              className="w-full bg-slate-50 border-none p-4 rounded-xl h-32 text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none" 
              value={data.description} 
              onChange={e => onChange({...data, description: e.target.value})} 
            />
            <div className="flex gap-3 pt-2">
                <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
                <Button type="submit" variant="primary" disabled={loading} className="flex-1">
                  {loading ? 'Creating...' : 'Create Class'}
                </Button>
            </div>
        </form>
      </div>
    </div>
  );
}