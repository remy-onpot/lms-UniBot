'use client';
import { useContext } from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { FaceContext, FaceState } from './FaceProvider'; 

interface UniBotFaceProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  state?: FaceState;
  className?: string;
}

export function UniBotFace({ size = 'md', state, className }: UniBotFaceProps) {
  // 1. Safe Context Access
  // We use the optional chaining or a default to prevent crashes if used outside Provider
  const faceContext = useContext(FaceContext);
  const finalState = state ?? faceContext?.state ?? 'idle';
  
  // 2. Size Mappings
  const sizeClasses = {
    sm: 'w-10 h-10',      
    md: 'w-20 h-20',    
    lg: 'w-32 h-32',    
    xl: 'w-48 h-48',    
  };

  // 3. Animation States (Applied to the image container)
  const animationClasses: Record<string, string> = {
    idle: '',
    thinking: 'animate-pulse duration-1000', // Slow pulse
    bouncing: 'animate-bounce',              // Up and down
    happy: 'animate-bounce',                 // Jump for joy
    sad: 'grayscale filter brightness-75',   // Go gray/dark
  };

  // 4. Border Colors based on state (optional visual flair)
  const borderClasses: Record<string, string> = {
    idle: 'border-white',
    thinking: 'border-indigo-400 shadow-indigo-200',
    bouncing: 'border-blue-400',
    happy: 'border-green-400 shadow-green-200',
    sad: 'border-slate-300',
  };

  return (
    <div 
      className={cn(
        "relative rounded-full overflow-hidden border-4 bg-white shadow-xl transition-all duration-300",
        sizeClasses[size],
        borderClasses[finalState],
        animationClasses[finalState],
        className
      )}
    >
      {/* ✅ Render the ACTUAL Logo 
         This assumes your image is square. If it's not, 'object-cover' handles the crop.
      */}
      <Image 
        src="/assets/unibot_face.jpg" 
        alt="UniBot"
        fill
        className="object-cover"
        priority={size === 'xl'} // Load fast for big versions
      />
      
      {/* Optional: Add a colored overlay tint for states */}
      {finalState === 'thinking' && (
        <div className="absolute inset-0 bg-indigo-500/20 animate-pulse pointer-events-none" />
      )}
    </div>
  );
}