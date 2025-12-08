'use client';
import { useState } from 'react';
import { Plus, Trash2, Sliders, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface RubricCriteria {
  id: string;
  name: string;
  description: string;
  points: number;
  strictness: 'lenient' | 'normal' | 'strict';
}

interface RubricBuilderProps {
  value: RubricCriteria[];
  onChange: (criteria: RubricCriteria[]) => void;
  maxPoints: number;
}

export function RubricBuilder({ value, onChange, maxPoints }: RubricBuilderProps) {
  
  const currentTotal = value.reduce((sum, c) => sum + c.points, 0);
  const remaining = maxPoints - currentTotal;

  const addCriteria = () => {
    const newC: RubricCriteria = {
      id: Date.now().toString(),
      name: '',
      description: '',
      points: remaining > 0 ? remaining : 10,
      strictness: 'normal'
    };
    onChange([...value, newC]);
  };

  const updateCriteria = (id: string, updates: Partial<RubricCriteria>) => {
    onChange(value.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const removeCriteria = (id: string) => {
    onChange(value.filter(c => c.id !== id));
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
          <Sliders className="w-4 h-4" /> Grading Rubric
        </h4>
        <span className={`text-xs font-bold px-2 py-1 rounded ${
           remaining === 0 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
        }`}>
           {currentTotal} / {maxPoints} Points
        </span>
      </div>

      {value.length === 0 && (
         <div className="text-center py-6 text-slate-400 border-2 border-dashed border-slate-200 rounded-lg">
            <p className="text-xs">No criteria set. AI will grade generally.</p>
            <Button onClick={addCriteria} variant="ghost" size="sm" className="mt-2 text-indigo-600">
               + Add Criteria
            </Button>
         </div>
      )}

      <div className="space-y-3">
        {value.map((item) => (
          <div key={item.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm animate-in slide-in-from-left-2">
             <div className="flex gap-2 mb-2">
                <input 
                  placeholder="Criteria Name (e.g. Grammar)"
                  className="flex-1 bg-transparent border-b border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-indigo-500 px-1"
                  value={item.name}
                  onChange={(e) => updateCriteria(item.id, { name: e.target.value })}
                />
                <input 
                  type="number"
                  className="w-16 bg-slate-50 border border-slate-200 rounded text-sm text-center font-mono"
                  value={item.points}
                  onChange={(e) => updateCriteria(item.id, { points: parseInt(e.target.value) || 0 })}
                />
                <button onClick={() => removeCriteria(item.id)} className="text-slate-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
             </div>
             
             <div className="flex gap-2">
                <input 
                  placeholder="Description (e.g. Correct spelling and punctuation)"
                  className="flex-1 bg-slate-50 rounded px-2 py-1 text-xs text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  value={item.description}
                  onChange={(e) => updateCriteria(item.id, { description: e.target.value })}
                />
                <select 
                   className="bg-slate-50 rounded px-2 py-1 text-xs text-slate-600 border-none outline-none cursor-pointer hover:bg-slate-100"
                   value={item.strictness}
                   onChange={(e) => updateCriteria(item.id, { strictness: e.target.value as any })}
                >
                   <option value="lenient">Lenient</option>
                   <option value="normal">Normal</option>
                   <option value="strict">Strict</option>
                </select>
             </div>
          </div>
        ))}
      </div>
      
      {value.length > 0 && (
         <Button onClick={addCriteria} variant="outline" size="sm" className="w-full border-dashed text-slate-500">
           <Plus className="w-3 h-3 mr-2" /> Add Criterion
         </Button>
      )}
    </div>
  );
}