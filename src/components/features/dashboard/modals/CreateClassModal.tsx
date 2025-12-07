// src/components/features/dashboard/modals/CreateClassModal.tsx
'use client';
import { Button } from '../../../ui/Button';
import { FocusTrap } from 'focus-trap-react';

interface CreateClassModalProps {
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  data: { name: string; description: string };
  onChange: (data: { name: string; description: string }) => void;
}

export default function CreateClassModal({ onClose, onSubmit, loading, data, onChange }: CreateClassModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-class-title">
      <FocusTrap focusTrapOptions={{ initialFocus: '#class-name-input', onDeactivate: onClose, clickOutsideDeactivates: true }}>
        <div className="bg-white p-8 rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
          <h2 id="create-class-title" className="text-2xl font-bold mb-1 text-slate-900">Create Class</h2>
          <p className="text-slate-500 text-sm mb-6">Set up a new space for your students.</p>
          <form onSubmit={onSubmit} className="space-y-4">
              <input 
                id="class-name-input"
                aria-label="Class Name"
                placeholder="Class Name" 
                className="w-full bg-slate-50 border-none p-4 rounded-xl text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none font-bold placeholder:font-normal" 
                value={data.name} 
                onChange={e => onChange({...data, name: e.target.value})} 
                required 
              />
              <textarea 
                aria-label="Class Description"
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
      </FocusTrap>
    </div>
  );
}