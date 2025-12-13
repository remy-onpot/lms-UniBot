'use client';
import { useEffect, useState, useRef, useId } from 'react';
import { cn } from '@/lib/utils';

export type MascotEmotion = 'idle' | 'happy' | 'sad' | 'cool' | 'shy' | 'thinking' | 'surprised' | 'sleeping' | 'deadpan' | 'tired';
export type MascotAction = 'idle' | 'none' | 'blink' | 'wave' | 'dance' | 'backflip' | 'fly' | 'run' | 'bounce';
export type MascotAccessory = 'none' | 'heart' | 'trophy' | 'fire';

interface UniBotMascotProps {
  size?: number;
  emotion?: MascotEmotion;
  action?: MascotAction;
  accessory?: MascotAccessory;
  className?: string;
  autoBlink?: boolean;
  interactive?: boolean; // ✅ Enable "Brain"
}

export function UniBotMascot({ 
  size = 120, 
  emotion = 'idle', 
  action = 'none',
  accessory = 'none',
  className,
  autoBlink = true,
  interactive = false
}: UniBotMascotProps) {
  const uniqueId = useId().replace(/:/g, ''); 
  
  // 🧠 THE BRAIN (Internal States)
  const [currentEmotion, setCurrentEmotion] = useState(emotion);
  const [internalAction, setInternalAction] = useState<MascotAction>('none');
  const [eyePosition, setEyePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync props to internal state
  useEffect(() => { setCurrentEmotion(emotion); }, [emotion]);
  useEffect(() => { 
    if (action !== 'none') {
       setInternalAction('none');
       requestAnimationFrame(() => requestAnimationFrame(() => setInternalAction(action)));
    }
  }, [action]);

  // 1. CURSOR TRACKING (Eyes follow mouse)
  useEffect(() => {
    if (!interactive) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      const maxMove = 6; 
      const dx = Math.min(Math.max((e.clientX - centerX) / 20, -maxMove), maxMove);
      const dy = Math.min(Math.max((e.clientY - centerY) / 20, -maxMove), maxMove);
      
      setEyePosition({ x: dx, y: dy });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [interactive]);

  // 2. RANDOM BEHAVIOR (Boredom)
  useEffect(() => {
    if (!interactive || action !== 'none') return;
    
    const boredomInterval = setInterval(() => {
       const rand = Math.random();
       // 30% chance to blink, 10% chance to look around randomly
       if (rand > 0.7) setInternalAction('blink');
       else if (rand > 0.9 && currentEmotion === 'idle') {
          setEyePosition({ x: (Math.random() - 0.5) * 10, y: (Math.random() - 0.5) * 5 });
          setTimeout(() => setEyePosition({ x: 0, y: 0 }), 1000);
       }
    }, 4000);

    return () => clearInterval(boredomInterval);
  }, [interactive, action, currentEmotion]);

  // 3. TAP REACTION
  const handleTap = () => {
    if (!interactive) return;
    const reactions: MascotEmotion[] = ['happy', 'surprised', 'cool', 'shy'];
    const randomReaction = reactions[Math.floor(Math.random() * reactions.length)];
    
    setCurrentEmotion(randomReaction);
    setInternalAction('bounce');
    
    setTimeout(() => {
       setCurrentEmotion(emotion); 
       setInternalAction('none');
    }, 1500);
  };

  const isHugging = accessory === 'heart';
  const isHoldingItem = accessory === 'trophy' || accessory === 'fire';

  return (
    <div 
      ref={containerRef}
      onClick={handleTap}
      className={cn("relative select-none perspective-500 transition-transform active:scale-95 cursor-pointer", className)}
      style={{ width: size, height: size }}
      aria-label={`UniBot is ${currentEmotion}`}
    >
      <svg 
        viewBox="0 0 200 200" 
        className={cn("w-full h-full overflow-visible transition-transform duration-500",
          internalAction === 'wave' && "animate-mascot-wave",
          internalAction === 'dance' && "animate-mascot-dance",
          internalAction === 'bounce' && "animate-bounce",
          internalAction === 'backflip' && "animate-mascot-3d-flip",
          internalAction === 'fly' && "animate-mascot-fly",
          internalAction === 'run' && "animate-mascot-run",
          (currentEmotion === 'sleeping' || currentEmotion === 'tired') && "animate-mascot-breathe"
        )}
      >
        <defs>
          <radialGradient id={`body-grad-${uniqueId}`} cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#6366F1" /><stop offset="50%" stopColor="#4F46E5" /><stop offset="100%" stopColor="#312E81" />
          </radialGradient>
          <linearGradient id={`screen-grad-${uniqueId}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1E1B4B" /><stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
          <filter id={`glow-${uniqueId}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/><feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>

        <ellipse cx="100" cy="180" rx="40" ry="6" fill="black" className="opacity-20 blur-sm animate-shadow-pulse" />

        <g className="origin-center">
          <path d="M 70 140 Q 100 155 130 140 L 120 160 Q 100 170 80 160 Z" fill={`url(#body-grad-${uniqueId})`} className="translate-y-1" />
          <rect x="40" y="40" width="120" height="100" rx="25" ry="25" fill={`url(#body-grad-${uniqueId})`} className="shadow-xl" />
          <path d="M 45 60 Q 45 45 60 45 L 140 45 Q 155 45 155 60" fill="none" stroke="white" strokeWidth="2" strokeOpacity="0.3" strokeLinecap="round"/>

          <rect x="50" y="50" width="100" height="80" rx="18" ry="18" fill={`url(#screen-grad-${uniqueId})`} stroke="#312E81" strokeWidth="2" />
          <path d="M 55 55 L 90 55 L 70 90 Z" fill="white" opacity="0.05" />

          {/* EYES (With Tracking) */}
          <g 
            style={{ transform: `translate(${eyePosition.x}px, ${eyePosition.y}px)` }}
            className={cn("transition-transform duration-75 ease-out origin-[100px_90px]", 
              (internalAction === 'blink' || currentEmotion === 'sleeping' || currentEmotion === 'shy' || currentEmotion === 'tired') ? "scale-y-[0.1]" : "scale-y-100"
            )}
            filter={`url(#glow-${uniqueId})`}
          >
            <ellipse cx="80" cy="85" rx={currentEmotion === 'surprised' || currentEmotion === 'deadpan' ? 10 : 8} ry={currentEmotion === 'surprised' || currentEmotion === 'deadpan' ? 14 : 10} fill={currentEmotion === 'sad' || currentEmotion === 'tired' ? '#60A5FA' : '#22D3EE'} />
            <ellipse cx="120" cy="85" rx={currentEmotion === 'surprised' || currentEmotion === 'deadpan' ? 10 : 8} ry={currentEmotion === 'surprised' || currentEmotion === 'deadpan' ? 14 : 10} fill={currentEmotion === 'sad' || currentEmotion === 'tired' ? '#60A5FA' : '#22D3EE'} />
          </g>

          {/* MOUTH */}
          <g fill="none" stroke={currentEmotion === 'sad' || currentEmotion === 'tired' ? '#60A5FA' : '#22D3EE'} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter={`url(#glow-${uniqueId})`} className="transition-opacity duration-300">
             <path d="M 85 105 Q 100 115 115 105" className={cn("transition-opacity", ['happy', 'idle', 'cool', 'wave', 'dance', 'bounce'].includes(currentEmotion) ? "opacity-100" : "opacity-0")} />
             <path d="M 85 115 Q 100 105 115 115" className={cn("transition-opacity", ['sad', 'tired'].includes(currentEmotion) ? "opacity-100" : "opacity-0")} />
             <line x1="85" y1="110" x2="115" y2="110" className={cn("transition-opacity", ['thinking', 'shy', 'deadpan'].includes(currentEmotion) ? "opacity-100" : "opacity-0")} />
             <ellipse cx="100" cy="110" rx="6" ry="8" className={cn("transition-opacity", currentEmotion === 'surprised' ? "opacity-100" : "opacity-0")} />
             <circle cx="100" cy="110" r="3" className={cn("transition-opacity", currentEmotion === 'sleeping' ? "opacity-100" : "opacity-0")} fill="#22D3EE" stroke="none" />
          </g>

          {/* HANDS (With Fingers) */}
          <defs><g id={`hand-shape-${uniqueId}`}><circle cx="0" cy="0" r="13" fill={`url(#body-grad-${uniqueId})`} /><circle cx="10" cy="-5" r="5" fill={`url(#body-grad-${uniqueId})`} /><circle cx="12" cy="3" r="5" fill={`url(#body-grad-${uniqueId})`} /><circle cx="8" cy="10" r="5" fill={`url(#body-grad-${uniqueId})`} /><ellipse cx="-8" cy="-5" rx="5" ry="7" transform="rotate(-30)" fill={`url(#body-grad-${uniqueId})`} /></g></defs>

          <g className={cn("transition-all duration-500", currentEmotion === 'shy' ? "translate-x-[30px] -translate-y-10" : "", isHugging ? "translate-x-[35px] -translate-y-2.5 rotate-[-20deg]" : "")} transform="translate(35, 110)">
             <g transform="scale(-1, 1)"><use href={`#hand-shape-${uniqueId}`} className="animate-float-slow" /></g>
          </g>

          <g className={cn("transition-all duration-500 origin-[165px_110px]", internalAction === 'wave' ? "animate-hand-wave" : "", currentEmotion === 'shy' ? "translate-x-[-30px] translate-y-[-50px]" : "", isHugging ? "translate-x-[-35px] -translate-y-2.5 rotate-20" : "", isHoldingItem ? "-translate-y-2.5" : "")} transform="translate(165, 110)">
              <use href={`#hand-shape-${uniqueId}`} className={internalAction === 'wave' ? '' : 'animate-float-delayed'} />
          </g>

          {/* ACCESSORIES */}
          <g className={cn("transition-all duration-300 origin-[100px_85px]", currentEmotion === 'cool' ? "scale-100 opacity-100" : "scale-0 opacity-0")}>
             <rect x="65" y="75" width="32" height="18" rx="4" fill="#111" /><rect x="103" y="75" width="32" height="18" rx="4" fill="#111" /><line x1="97" y1="84" x2="103" y2="84" stroke="#111" strokeWidth="3" /><path d="M 68 78 L 90 78 L 75 90 Z" fill="white" opacity="0.2" />
          </g>

          <g transform="translate(130, 35)" className={cn("transition-transform duration-500 origin-bottom", currentEmotion === 'happy' || internalAction === 'dance' ? "rotate-[-20deg] translate-y-[-5px]" : "rotate-0")}>
             <path d="M 0 10 L -25 0 L 0 -10 L 25 0 Z" fill="#312E81" /><rect x="-15" y="10" width="30" height="8" fill="#312E81" /><path d="M 0 0 L 20 15" stroke="#F59E0B" strokeWidth="2" /><circle cx="20" cy="15" r="3" fill="#F59E0B" />
          </g>

          {accessory === 'heart' && <g transform="translate(100, 110)" className="animate-pulse"><path d="M 0 -10 Q 15 -25 30 -10 Q 40 10 0 30 Q -40 10 -30 -10 Q -15 -25 0 -10" fill="#EF4444" stroke="#B91C1C" strokeWidth="2" /></g>}
          
          {accessory === 'trophy' && <g transform="translate(165, 95) rotate(10)" className="animate-float-delayed"><path d="M -15 0 L -10 20 L 10 20 L 15 0 Z" fill="#F59E0B" /><path d="M -15 0 Q -25 0 -25 10 Q -25 15 -15 10" fill="none" stroke="#F59E0B" strokeWidth="3" /><path d="M 15 0 Q 25 0 25 10 Q 25 15 15 10" fill="none" stroke="#F59E0B" strokeWidth="3" /><rect x="-10" y="20" width="20" height="5" fill="#B45309" /><rect x="-12" y="25" width="24" height="3" fill="#78350F" /></g>}
          
          {accessory === 'fire' && <g transform="translate(165, 90)"><path d="M 0 0 Q -10 -10 -5 -25 Q 0 -35 5 -25 Q 15 -15 0 0" fill="#F97316" className="animate-mascot-fire" /><path d="M 0 -5 Q -5 -12 -2 -20 Q 0 -25 2 -20 Q 7 -12 0 -5" fill="#FCD34D" className="animate-pulse" /></g>}

          {(currentEmotion === 'sleeping' || currentEmotion === 'tired') && <g className="animate-mascot-float opacity-70"><text x="140" y="40" fontSize="24" fontWeight="900" fill="#A5B4FC" style={{ fontFamily: 'sans-serif' }}>Z</text><text x="160" y="25" fontSize="16" fontWeight="900" fill="#A5B4FC" style={{ fontFamily: 'sans-serif' }}>z</text></g>}
        </g>
      </svg>
    </div>
  );
}