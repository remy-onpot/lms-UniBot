'use client';
import { useEffect, useState, useId } from 'react';
import { cn } from '@/lib/utils';

export type MascotEmotion =  'idle' |'happy' | 'sad' | 'cool' | 'shy' | 'thinking' | 'surprised' | 'sleeping';
export type MascotAction = 'idle' |'none' | 'blink' | 'wave' | 'dance' | 'backflip' | 'fly' | 'run';

interface UniBotMascotProps {
  size?: number;
  emotion?: MascotEmotion;
  action?: MascotAction;
  className?: string;
  autoBlink?: boolean;
}

export function UniBotMascot({ 
  size = 120, 
  emotion = 'idle', 
  action = 'none', 
  className,
  autoBlink = true 
}: UniBotMascotProps) {
  const uniqueId = useId().replace(/:/g, ''); 
  const [internalAction, setInternalAction] = useState<MascotAction>('none');

  useEffect(() => {
    if (action !== 'none') {
      setInternalAction('none');
      // Double RAF to ensure browser reflow allows animation restart
      requestAnimationFrame(() => requestAnimationFrame(() => setInternalAction(action)));
    }
  }, [action]);

  // Auto-blink
  useEffect(() => {
    if (!autoBlink || ['cool', 'sleeping', 'shy'].includes(emotion)) return;
    const interval = setInterval(() => {
      if (internalAction === 'none') {
        setInternalAction('blink');
        setTimeout(() => setInternalAction('none'), 300);
      }
    }, Math.random() * 3000 + 3000);
    return () => clearInterval(interval);
  }, [autoBlink, emotion, internalAction]);

  return (
    <div 
      className={cn("relative select-none perspective-500", className)} // Added perspective for 3D flips
      style={{ width: size, height: size }}
      aria-label={`UniBot is ${emotion}`}
    >
      <svg 
        viewBox="0 0 200 200" 
        className={cn("w-full h-full overflow-visible transition-transform duration-500",
          internalAction === 'wave' && "animate-mascot-wave",
          internalAction === 'dance' && "animate-mascot-dance",
          internalAction === 'backflip' && "animate-mascot-3d-flip", // ✅ REAL 3D FLIP
          internalAction === 'fly' && "animate-mascot-fly",
          internalAction === 'run' && "animate-mascot-run",
          emotion === 'sleeping' && "animate-mascot-breathe"
        )}
      >
        <defs>
          {/* 3D Body Gradient (Shiny Plastic) */}
          <radialGradient id={`body-grad-${uniqueId}`} cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#6366F1" /> {/* Lighter Indigo Highlight */}
            <stop offset="50%" stopColor="#4F46E5" /> {/* Base Indigo */}
            <stop offset="100%" stopColor="#312E81" /> {/* Dark Shadow */}
          </radialGradient>

          {/* Screen Gradient (Deep Glass) */}
          <linearGradient id={`screen-grad-${uniqueId}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1E1B4B" /> {/* Deep Navy */}
            <stop offset="100%" stopColor="#0F172A" /> {/* Almost Black */}
          </linearGradient>

          {/* Eye Glow */}
          <filter id={`glow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>

        {/* --- SHADOW (Grounding) --- */}
        <ellipse cx="100" cy="180" rx="40" ry="6" fill="black" className="opacity-20 blur-sm animate-shadow-pulse" />

        {/* --- MAIN CHARACTER GROUP --- */}
        <g className="origin-center">
          
          {/* 1. BODY (Torso) - Floating below head */}
          <path 
            d="M 70 140 Q 100 155 130 140 L 120 160 Q 100 170 80 160 Z" 
            fill={`url(#body-grad-${uniqueId})`}
            className="translate-y-1"
          />

          {/* 2. HEAD (The Monitor) */}
          <rect 
            x="40" y="40" width="120" height="100" rx="25" ry="25"
            fill={`url(#body-grad-${uniqueId})`}
            className="shadow-xl"
          />
          
          {/* Head Highlight (Rim Light) */}
          <path 
            d="M 45 60 Q 45 45 60 45 L 140 45 Q 155 45 155 60" 
            fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.3" strokeLinecap="round"
          />

          {/* 3. FACE SCREEN (Black Glass) */}
          <rect 
            x="50" y="50" width="100" height="80" rx="18" ry="18"
            fill={`url(#screen-grad-${uniqueId})`}
            stroke="#312E81" strokeWidth="2"
          />
          {/* Screen Glare (Reflection) */}
          <path d="M 55 55 L 90 55 L 70 90 Z" fill="white" opacity="0.05" />

          {/* 4. EYES (Glowing LEDs) */}
          <g 
            className={cn("transition-all duration-200 ease-spring origin-[100px_90px]", 
              (internalAction === 'blink' || emotion === 'sleeping' || emotion === 'shy') ? "scale-y-[0.1]" : "scale-y-100"
            )}
            filter={`url(#glow-${uniqueId})`}
          >
            {/* Left Eye */}
            <ellipse cx="80" cy="85" rx={emotion === 'surprised' ? 10 : 8} ry={emotion === 'surprised' ? 14 : 10} fill={emotion === 'sad' ? '#60A5FA' : '#22D3EE'} />
            {/* Right Eye */}
            <ellipse cx="120" cy="85" rx={emotion === 'surprised' ? 10 : 8} ry={emotion === 'surprised' ? 14 : 10} fill={emotion === 'sad' ? '#60A5FA' : '#22D3EE'} />
          </g>

          {/* 5. MOUTH (Digital Line) */}
          <g 
            fill="none" stroke={emotion === 'sad' ? '#60A5FA' : '#22D3EE'} 
            strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"
            filter={`url(#glow-${uniqueId})`}
            className="transition-opacity duration-300"
          >
             {/* Happy / Idle */}
             <path d="M 85 105 Q 100 115 115 105" className={cn("transition-opacity", ['happy', 'idle', 'cool', 'wave', 'dance'].includes(emotion) ? "opacity-100" : "opacity-0")} />
             {/* Sad */}
             <path d="M 85 115 Q 100 105 115 115" className={cn("transition-opacity", emotion === 'sad' ? "opacity-100" : "opacity-0")} />
             {/* Flat (Thinking) */}
             <line x1="85" y1="110" x2="115" y2="110" className={cn("transition-opacity", emotion === 'thinking' || emotion === 'shy' ? "opacity-100" : "opacity-0")} />
             {/* Open (Surprised) */}
             <ellipse cx="100" cy="110" rx="6" ry="8" className={cn("transition-opacity", emotion === 'surprised' ? "opacity-100" : "opacity-0")} />
             {/* Sleeping (Dot) */}
             <circle cx="100" cy="110" r="3" className={cn("transition-opacity", emotion === 'sleeping' ? "opacity-100" : "opacity-0")} fill="#22D3EE" stroke="none" />
          </g>

          {/* 6. HANDS (Floating Rayman Style) */}
          {/* Left Hand */}
          <g className={cn("transition-all duration-500", emotion === 'shy' ? "translate-x-[30px] -translate-y-10" : "translate-x-0 translate-y-0")}>
             <circle cx="35" cy="110" r="14" fill={`url(#body-grad-${uniqueId})`} className="animate-float-slow" />
          </g>
          {/* Right Hand */}
          <g className={cn("transition-all duration-500 origin-[165px_110px]", 
              internalAction === 'wave' ? "animate-hand-wave" : "",
              emotion === 'shy' ? "translate-x-[-30px] translate-y-[-50px]" : ""
          )}>
             <circle cx="165" cy="110" r="14" fill={`url(#body-grad-${uniqueId})`} className={internalAction === 'wave' ? '' : 'animate-float-delayed'} />
          </g>

          {/* 7. ACCESSORIES */}
          {/* Sunglasses (Cool) */}
          <g className={cn("transition-all duration-300 origin-[100px_85px]", emotion === 'cool' ? "scale-100 opacity-100" : "scale-0 opacity-0")}>
             <rect x="65" y="75" width="32" height="18" rx="4" fill="#111" />
             <rect x="103" y="75" width="32" height="18" rx="4" fill="#111" />
             <line x1="97" y1="84" x2="103" y2="84" stroke="#111" strokeWidth="3" />
             {/* Glare */}
             <path d="M 68 78 L 90 78 L 75 90 Z" fill="white" opacity="0.2" />
          </g>

          {/* Graduation Cap (Always on, tips when happy) */}
          <g 
            transform="translate(130, 35)" 
            className={cn("transition-transform duration-500 origin-bottom", emotion === 'happy' || internalAction === 'dance' ? "rotate-[-20deg] translate-y-[-5px]" : "rotate-0")}
          >
             <path d="M 0 10 L -25 0 L 0 -10 L 25 0 Z" fill="#312E81" />
             <rect x="-15" y="10" width="30" height="8" fill="#312E81" />
             {/* Tassel */}
             <path d="M 0 0 L 20 15" stroke="#F59E0B" strokeWidth="2" />
             <circle cx="20" cy="15" r="3" fill="#F59E0B" />
          </g>

          {/* Zzz Particles (Sleeping) */}
          {emotion === 'sleeping' && (
            <g className="animate-mascot-float opacity-70">
               <text x="140" y="40" fontSize="24" fontWeight="900" fill="#A5B4FC" style={{ fontFamily: 'sans-serif' }}>Z</text>
               <text x="160" y="25" fontSize="16" fontWeight="900" fill="#A5B4FC" style={{ fontFamily: 'sans-serif' }}>z</text>
            </g>
          )}

        </g>
      </svg>
    </div>
  );
}