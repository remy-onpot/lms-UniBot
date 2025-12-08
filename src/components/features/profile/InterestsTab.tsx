'use client';
import { Target } from 'lucide-react';

interface Interest {
  name: string;
  emoji: string;
}

interface InterestsTabProps {
  availableInterests: Interest[];
  // ✅ FIX: Allow undefined and null to handle initial DB states safely
  selectedInterests: string[] | null | undefined; 
  onToggle: (interestName: string) => void;
}

export function InterestsTab({ availableInterests, selectedInterests, onToggle }: InterestsTabProps) {
  
  // Safe default: Ensure it's always an array
  const currentSelections = selectedInterests || [];

  return (
    <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-6">
        <h3 className="text-xl font-black text-slate-900 mb-2 flex items-center gap-2">
          <Target className="w-6 h-6 text-purple-600" /> Learning Interests
        </h3>
        <p className="text-slate-500 text-sm">Select topics that interest you to personalize your learning experience</p>
      </div>

      {availableInterests.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
             <Target className="w-8 h-8 text-slate-300" />
          </div>
          <p className="text-slate-900 font-bold">No interests available yet</p>
          <p className="text-sm text-slate-500 mt-2">Check back later for personalization options</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-3">
          {availableInterests.map((interest) => {
            const isSelected = currentSelections.includes(interest.name);
            return (
              <button
                key={interest.name}
                onClick={() => onToggle(interest.name)}
                className={`group relative overflow-hidden px-5 py-3 rounded-xl font-bold text-sm transition-all border-2 flex items-center gap-2 active:scale-95 ${
                  isSelected
                    ? 'border-indigo-500 bg-gradient-to-r from-indigo-50 to-purple-50 text-indigo-700 shadow-lg scale-[1.02]'
                    : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <span className="text-xl">{interest.emoji}</span>
                <span>{interest.name}</span>
                {isSelected && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 animate-pulse pointer-events-none"></div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}