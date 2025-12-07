import { UniBotFace } from './UniBotFace';
import { Button } from './Button';

interface EmptyStateCardProps {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}

export function EmptyStateCard({ title, description, actionLabel, onAction }: EmptyStateCardProps) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center bg-white border-2 border-dashed border-slate-200 rounded-3xl hover:border-indigo-200 transition-colors group">
      
      {/* The Animated Face */}
      <div className="mb-6 group-hover:scale-110 transition-transform duration-300">
        <UniBotFace size="lg" state="bouncing" />
      </div>

      <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-500 mb-8 max-w-sm leading-relaxed">{description}</p>

      <Button onClick={onAction} size="lg" className="shadow-xl shadow-indigo-100">
        {actionLabel}
      </Button>
    </div>
  );
}