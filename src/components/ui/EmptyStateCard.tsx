'use client';
import { Button } from '@/components/ui/Button';
import { UniBotMascot, MascotEmotion, MascotAction, MascotAccessory } from '@/components/ui/UniBotMascot';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  // New Mascot Props
  mascotEmotion?: MascotEmotion;
  mascotAction?: MascotAction;
  mascotAccessory?: MascotAccessory;
}

export function EmptyState({ 
  title, 
  description, 
  actionLabel, 
  onAction,
  mascotEmotion = 'deadpan', // Default to the funny straight face
  mascotAction = 'none',
  mascotAccessory = 'none'
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 bg-white border-2 border-dashed border-slate-200 rounded-3xl text-center group hover:border-indigo-200 transition-colors">
      
      {/* The Mascot Stage */}
      <div className="mb-6 transition-transform duration-300 group-hover:scale-110 group-hover:-translate-y-2">
         <UniBotMascot 
           size={100} 
           emotion={mascotEmotion} 
           action={mascotAction} 
           accessory={mascotAccessory}
         />
      </div>

      <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 max-w-xs mb-8 leading-relaxed font-medium">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button 
          onClick={onAction} 
          className="bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-200 px-8 py-3 rounded-xl font-bold"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}