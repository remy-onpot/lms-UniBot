'use client';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

export type BotState = 'idle' | 'happy' | 'thinking' | 'talking' | 'sleeping';

interface UniBotLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  state?: BotState;
  className?: string;
}

export function UniBotLogo({ size = 'md', state = 'idle', className }: UniBotLogoProps) {
  const [blink, setBlink] = useState(false);

  // 🧠 Natural Blinking Engine
  useEffect(() => {
    const blinkLoop = () => {
      setBlink(true);
      setTimeout(() => setBlink(false), 150); // Close eyes for 150ms
      
      // Randomize next blink between 3s and 8s
      const nextBlink = Math.random() * 5000 + 3000;
      return setTimeout(blinkLoop, nextBlink);
    };
    
    const timer = blinkLoop();
    return () => clearTimeout(timer);
  }, []);

  const sizeMap = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
    '2xl': 'w-48 h-48',
  };

  return (
    <svg 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizeMap[size], "transition-all duration-300", className)}
      aria-label={`UniBot is ${state}`}
    >
      <defs>
        <linearGradient id="head-grad" x1="16" y1="20" x2="184" y2="180" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#6366F1" /> 
          <stop offset="100%" stopColor="#4F46E5" />
        </linearGradient>
        
        {/* Mouth Animations defined as CSS Classes below */}
        <style>{`
          .mouth-idle { d: path('M 78 112 Q 100 124 122 112'); transition: d 0.3s ease; }
          .mouth-happy { d: path('M 75 108 Q 100 135 125 108'); transition: d 0.3s ease; }
          .mouth-talking { animation: talk 0.3s infinite alternate; }
          .cap-happy { transform: translate(145px, 35px) rotate(-25deg) scale(1.1); }
          .cap-idle { transform: translate(145px, 35px) rotate(-15deg); }
          
          @keyframes talk {
            from { d: path('M 78 112 Q 100 124 122 112'); }
            to { d: path('M 82 115 Q 100 118 118 115'); }
          }
        `}</style>
      </defs>

      {/* Head */}
      <rect x="16" y="20" rx="40" ry="40" width="168" height="160" fill="url(#head-grad)" className="shadow-sm" />
      
      {/* Face Panel */}
      <rect x="44" y="50" rx="24" ry="24" width="112" height="90" fill="white" />

      {/* Eyes Container (Blinking) */}
      <g 
        // ✅ FIXED: Use style prop for transform-origin
        style={{ 
          transformOrigin: '100px 86px',
          transform: blink ? 'scaleY(0.1)' : 'scaleY(1)', 
          transition: 'transform 0.1s' 
        }}
      >
        <circle cx="78" cy="86" r="7" fill="#1E1B4B" />
        <circle cx="122" cy="86" r="7" fill="#1E1B4B" />
      </g>

      {/* Mouth (Dynamic State) */}
      <path 
        className={state === 'talking' ? 'mouth-talking' : state === 'happy' ? 'mouth-happy' : 'mouth-idle'}
        stroke="#1E1B4B" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Graduation Cap (Tips on Happy) */}
      <g 
        className={`transition-all duration-500 ease-spring ${state === 'happy' ? 'cap-happy' : 'cap-idle'}`}
      >
        <g transform="translate(-20, -10)">
           <path d="M0 10 L-25 0 L0 -10 L25 0 Z" fill="#1E1B4B" /> 
           <path d="M25 0 V15" stroke="#F59E0B" strokeWidth="2" /> 
           <circle cx="25" cy="18" r="3" fill="#F59E0B" /> 
           <path d="M-12 10 V14 Q0 18 12 14 V10" fill="#1E1B4B" /> 
        </g>
      </g>

      {/* Thinking Indicator (Pulse Overlay) */}
      {state === 'thinking' && (
        <circle cx="160" cy="40" r="8" fill="#F43F5E" className="animate-ping opacity-75" />
      )}
    </svg>
  );
}