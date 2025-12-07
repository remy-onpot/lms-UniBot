'use client';
import { Button } from '@/components/ui/Button';
import { FocusTrap } from 'focus-trap-react';

interface CreateAssignmentModalProps {
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  processing: boolean;
  data: { title: string; description: string; total_points: number; due_date: string };
  onChange: (data: any) => void;
}

export default function CreateAssignmentModal({ onClose, onSubmit, processing, data, onChange }: CreateAssignmentModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="create-assign-title">
      <FocusTrap focusTrapOptions={{ initialFocus: '#assign-title', onDeactivate: onClose, clickOutsideDeactivates: true }}>
        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
          <h3 id="create-assign-title" className="text-xl font-bold mb-4 text-slate-900">Create Assignment</h3>
          <form onSubmit={onSubmit} className="space-y-4">
            <input 
              id="assign-title"
              aria-label="Assignment Title"
              placeholder="Title" 
              className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" 
              value={data.title} 
              onChange={e => onChange({...data, title: e.target.value})} 
              required 
            />
            <textarea 
              aria-label="Assignment Instructions"
              placeholder="Instructions" 
              className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 h-24 outline-none focus:ring-2 focus:ring-blue-500 resize-none" 
              value={data.description} 
              onChange={e => onChange({...data, description: e.target.value})} 
              required 
            />
            <div className="grid grid-cols-2 gap-2">
              <input 
                type="number" 
                aria-label="Points"
                placeholder="Points" 
                className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 outline-none" 
                value={data.total_points} 
                onChange={e => onChange({...data, total_points: parseInt(e.target.value)})} 
                required 
              />
              <input 
                type="date" 
                aria-label="Due Date"
                className="w-full bg-slate-50 border-none p-3 rounded-xl text-slate-900 outline-none" 
                value={data.due_date} 
                onChange={e => onChange({...data, due_date: e.target.value})} 
                required 
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" variant="primary" disabled={processing} className="flex-1">Create</Button>
            </div>
          </form>
        </div>
      </FocusTrap>
    </div>
  );
}