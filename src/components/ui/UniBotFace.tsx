'use client';
import { useContext, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { FaceContext, FaceState } from './FaceProvider'; // ✅ Importing Type

interface UniBotFaceProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  state?: FaceState; // Optional override prop
  className?: string;
  autoBlink?: boolean;
}

export function UniBotFace({ size = 'md', state, className, autoBlink = true }: UniBotFaceProps) {
  // 1. Context Integration
  const faceContext = useContext(FaceContext);
  
  // Priority: explicit prop > global context > default 'idle'
  const activeState: FaceState = state || faceContext?.state || 'idle';

  // 2. Blinking Logic
  const [blink, setBlink] = useState(false);

  useEffect(() => {
    if (!autoBlink || activeState === 'sleeping') {
        setBlink(false);
        return;
    }

    const blinkLoop = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150);
      const nextBlink = Math.random() * 5000 + 3000;
      return setTimeout(blinkLoop, nextBlink);
    };
    
    const timer = blinkLoop();
    return () => clearTimeout(timer);
  }, [autoBlink, activeState]);

  // 3. Size Mappings
  const sizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
    '2xl': 'w-48 h-48',
    '3xl': 'w-64 h-64',
  };

  return (
    <svg 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "transition-all duration-500 ease-out select-none", 
        sizeMap[size], 
        className
      )}
      aria-label={`UniBot is ${activeState}`}
    >
      <defs>
        <linearGradient id="head-grad" x1="16" y1="20" x2="184" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" /> 
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
        
        <style>{`
          .mouth-idle { d: path('M 78 112 Q 100 124 122 112'); transition: d 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
          .mouth-happy { d: path('M 75 108 Q 100 135 125 108'); transition: d 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
          .mouth-sad { d: path('M 78 120 Q 100 105 122 120'); transition: d 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
          .mouth-talking { animation: talk 0.2s infinite alternate; }
          .cap-idle { transform: translate(145px, 35px) rotate(-15deg); transition: transform 0.5s ease-out; }
          .cap-happy { transform: translate(145px, 25px) rotate(-25deg) scale(1.1); transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1); }
          
          @keyframes talk {
            from { d: path('M 78 112 Q 100 122 122 112'); }
            to { d: path('M 80 110 Q 100 130 120 110'); }
          }
          @keyframes pulse-ring {
            0% { transform: scale(0.8); opacity: 0.5; }
            100% { transform: scale(1.5); opacity: 0; }
          }
        `}</style>
      </defs>

      {/* Body */}
      <rect x="16" y="20" rx="40" ry="40" width="168" height="160" fill="url(#head-grad)" className="shadow-sm" />
      <rect x="44" y="50" rx="24" ry="24" width="112" height="90" fill="white" />

      {/* Eyes */}
      <g style={{ 
          transformOrigin: '100px 86px',
          transform: blink || activeState === 'sleeping' ? 'scaleY(0.1)' : 'scaleY(1)', 
          transition: 'transform 0.15s ease-in-out' 
        }}>
        <circle cx="78" cy="86" r={activeState === 'happy' ? 8 : 7} fill="#1E1B4B" />
        <circle cx="122" cy="86" r={activeState === 'happy' ? 8 : 7} fill="#1E1B4B" />
      </g>

      {/* Mouth */}
      <path 
        className={
          activeState === 'talking' ? 'mouth-talking' : 
          activeState === 'happy' || activeState === 'bouncing' ? 'mouth-happy' : 
          activeState === 'sad' ? 'mouth-sad' :
          'mouth-idle'
        }
        stroke="#1E1B4B" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" 
      />

      {/* Cap */}
      <g className={activeState === 'happy' || activeState === 'bouncing' ? 'cap-happy' : 'cap-idle'}>
        <g transform="translate(-20, -10)">
           <path d="M0 10 L-25 0 L0 -10 L25 0 Z" fill="#1E1B4B" /> 
           <path d="M25 0 V15" stroke="#F59E0B" strokeWidth="2" /> 
           <circle cx="25" cy="18" r="3" fill="#F59E0B" /> 
           <path d="M-12 10 V14 Q0 18 12 14 V10" fill="#1E1B4B" /> 
        </g>
      </g>

      {/* Extras */}
      {activeState === 'thinking' && (
        <>
          <circle cx="160" cy="40" r="6" fill="#F43F5E" className="animate-pulse" />
          <circle cx="160" cy="40" r="10" stroke="#F43F5E" strokeWidth="2" style={{ animation: 'pulse-ring 1.5s infinite' }} />
        </>
      )}
      {activeState === 'sleeping' && (
        <g className="animate-bounce" style={{ animationDuration: '2s' }}>
          <text x="140" y="50" fontSize="24" fontWeight="bold" fill="#A5B4FC">Z</text>
          <text x="160" y="35" fontSize="18" fontWeight="bold" fill="#A5B4FC">z</text>
        </g>
      )}
    </svg>
  );
}