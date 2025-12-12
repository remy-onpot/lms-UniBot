'use client';

import { useEffect, useState } from 'react';
import { UniBotMascot } from '@/components/ui/UniBotMascot';
import { Laptop, Monitor } from 'lucide-react';

interface MobileGuardProps {
  children: React.ReactNode;
  minWidth?: number; // Optional override (default 1024px)
}

export function MobileGuard({ children, minWidth = 1024 }: MobileGuardProps) {
  const [isRestricted, setIsRestricted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkScreen = () => {
      setIsRestricted(window.innerWidth < minWidth);
    };
    
    // Check initially and on resize
    checkScreen();
    window.addEventListener('resize', checkScreen);
    return () => window.removeEventListener('resize', checkScreen);
  }, [minWidth]);

  // Don't render anything during SSR to avoid hydration mismatch
  if (!mounted) return null;

  if (isRestricted) {
    return (
      <div className="flex flex-col items-center justify-center h-[70vh] p-8 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 animate-in fade-in">
        
        <div className="mb-8 transform scale-110 grayscale opacity-90 hover:grayscale-0 hover:opacity-100 transition-all duration-500">
           {/* 🥺 THE SAD MASCOT */}
           <UniBotMascot size={180} emotion="sad" action="idle" />
        </div>

        <h3 className="text-2xl font-black text-slate-900 mb-3">
          "My tiny hands can't work here..."
        </h3>
        
        <p className="text-slate-500 max-w-md mx-auto leading-relaxed mb-8">
          The <b>Virtual Lab</b> runs powerful engines like <i>CircuitJS</i> and <i>Python</i> that require a mouse and keyboard. 
          Please switch to a <b>Laptop</b> or <b>Desktop</b> for the full experience.
        </p>

        <div className="flex gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <span className="flex items-center gap-2">
            <Laptop className="w-5 h-5 text-slate-900" /> Laptop
          </span>
          <span className="flex items-center gap-2">
            <Monitor className="w-5 h-5 text-slate-900" /> Desktop
          </span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}