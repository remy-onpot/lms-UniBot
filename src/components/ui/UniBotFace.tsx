'use client';
import { cn } from '@/lib/utils';
import { useFace } from './FaceProvider';
import { Eyes, Mouth, Eyebrows, BlinkKeyframes } from './FaceExpressions';

interface UniBotFaceProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  state?: 'idle' | 'thinking' | 'bouncing' | 'happy' | 'sad';
  className?: string;
}

export function UniBotFace({ size = 'md', state, className }: UniBotFaceProps) {
  // Prefer explicit prop, otherwise use context
  let ctxState: any = undefined;
  try {
    const ctx = useFace();
    ctxState = ctx.state;
  } catch (e) {
    ctxState = undefined;
  }
  const finalState = state ?? ctxState ?? 'idle';
  
  const sizeClasses = {
    sm: 'w-8 h-8',      // Chat avatar
    md: 'w-16 h-16',    // Card headers
    lg: 'w-32 h-32',    // Empty states
    xl: 'w-48 h-48',    // 404 / Hero
  };

  const sizePixels = {
    sm: 32,
    md: 64,
    lg: 128,
    xl: 192,
  };

  const animationClasses: Record<string, string> = {
    idle: '',
    thinking: 'animate-pulse',
    bouncing: 'animate-bounce',
    happy: 'animate-pulse',
    sad: '',
  };

  const borderClasses: Record<string, string> = {
    idle: 'border-slate-200',
    thinking: 'border-indigo-200',
    bouncing: 'border-yellow-300',
    happy: 'border-green-300',
    sad: 'border-red-300',
  };

  const textColors: Record<string, string> = {
    idle: 'text-slate-700',
    thinking: 'text-indigo-600',
    bouncing: 'text-yellow-600',
    happy: 'text-green-600',
    sad: 'text-red-600',
  };

  const mouthExpressions: Record<string, 'happy' | 'sad' | 'neutral' | 'thinking'> = {
    idle: 'neutral',
    thinking: 'thinking',
    bouncing: 'happy',
    happy: 'happy',
    sad: 'sad',
  };

  const pixelSize = sizePixels[size];

  return (
    <>
      <BlinkKeyframes />
      <div className={cn(
        "relative rounded-full overflow-hidden shadow-sm border-4 bg-linear-to-br from-slate-50 to-slate-100 flex items-center justify-center",
        borderClasses[finalState],
        sizeClasses[size],
        animationClasses[finalState],
        textColors[finalState],
        className
      )}>
        {/* SVG Face Container */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          {/* Eyebrows */}
          <div className="mb-1">
            <Eyebrows
              size={pixelSize * 0.6}
              expression={finalState as any}
              className="w-full"
            />
          </div>

          {/* Eyes */}
          <div className="mb-2">
            <Eyes
              size={pixelSize * 0.7}
              className={`w-full ${finalState !== 'sad' ? 'animate-blink' : ''}`}
            />
          </div>

          {/* Mouth */}
          <div>
            <Mouth
              size={pixelSize * 0.6}
              expression={mouthExpressions[finalState]}
              className="w-full"
            />
          </div>
        </div>
      </div>
    </>
  );
}