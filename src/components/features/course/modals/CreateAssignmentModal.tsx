'use client';
import { useState } from 'react';

import { X, Loader2, Sparkles, BrainCircuit } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RubricBuilder, RubricCriteria } from '../RubricBuilder';

interface CreateAssignmentModalProps {
  onClose: () => void;
  onSubmit: (e: React.FormEvent, extendedData: any) => void;
  processing: boolean;
  data: any;
  onChange: (data: any) => void;
}

export default function CreateAssignmentModal({ onClose, onSubmit, processing, data, onChange }: CreateAssignmentModalProps) {
  
  const [rubric, setRubric] = useState<RubricCriteria[]>([]);
  const [aiPersona, setAiPersona] = useState('Professor');

  const handleSubmitInternal = (e: React.FormEvent) => {
     e.preventDefault(); // Ensure default form submission is prevented
     
     // Merge Rubric Data into submission
     const extendedData = {
        ...data,
        grading_config: {
           strictness: aiPersona, // 'Professor', 'TA', 'Reviewer'
           criteria: rubric
        }
     };
     onSubmit(e, extendedData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
           <div>
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                 <Sparkles className="w-5 h-5 text-indigo-600" />
                 Create Smart Assignment
              </h3>
              <p className="text-sm text-slate-500">Define tasks and let AI handle the grading.</p>
           </div>
           <button onClick={onClose}><X className="text-slate-400 hover:text-slate-600" /></button>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
           {/* Basic Info */}
           <div className="space-y-4">
              <input 
                 className="w-full text-lg font-bold placeholder:text-slate-300 border-none outline-none focus:ring-0 px-0" 
                 placeholder="Assignment Title" 
                 value={data.title}
                 onChange={e => onChange({...data, title: e.target.value})}
                 autoFocus
              />
              <textarea 
                 className="w-full h-24 resize-none border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                 placeholder="Instructions for students..."
                 value={data.description}
                 onChange={e => onChange({...data, description: e.target.value})}
              />
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Max Points</label>
                    <input 
                       type="number" 
                       className="w-full border border-slate-200 rounded-xl p-2 font-mono" 
                       value={data.total_points}
                       onChange={e => onChange({...data, total_points: parseInt(e.target.value)})}
                    />
                 </div>
                 <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Due Date</label>
                    <input 
                       type="date" 
                       className="w-full border border-slate-200 rounded-xl p-2" 
                       value={data.due_date}
                       onChange={e => onChange({...data, due_date: e.target.value})}
                    />
                 </div>
              </div>
           </div>

           {/* AI Configuration Section */}
           <div className="border-t border-slate-100 pt-6">
              <h4 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
                 <BrainCircuit className="w-4 h-4 text-purple-600" />
                 AI Grading Configuration
              </h4>
              
              <div className="mb-4">
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-2">AI Persona (Strictness)</label>
                 <div className="flex gap-2">
                    {['Supportive Tutor', 'Professor', 'Strict Examiner'].map(p => (
                       <button 
                         key={p} 
                         type="button"
                         onClick={() => setAiPersona(p)}
                         className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                            aiPersona === p 
                              ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm' 
                              : 'bg-white border-slate-200 text-slate-500 hover:border-purple-200'
                         }`}
                       >
                          {p}
                       </button>
                    ))}
                 </div>
              </div>

              {/* RUBRIC BUILDER */}
              <RubricBuilder 
                 value={rubric} 
                 onChange={setRubric} 
                 maxPoints={data.total_points} 
              />
           </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-2">
           <Button variant="secondary" onClick={onClose}>Cancel</Button>
           <Button 
             onClick={handleSubmitInternal} 
             disabled={processing} 
             className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200"
           >
             {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Assignment'}
           </Button>
        </div>

      </div>
    </div>
  );
}