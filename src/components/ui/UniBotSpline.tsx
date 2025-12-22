'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';

// ⚡ 1. Optimized Lazy Load
// "ssr: false" is CRITICAL. It stops Next.js from trying to render 3D on the server.
const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
  loading: () => <SplinePlaceholder />,
});

// ⚡ 2. The "Instant" Placeholder
// This prevents the page from jumping (Layout Shift) while the 3D loads.
const SplinePlaceholder = () => (
  <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 rounded-2xl border border-slate-100 animate-pulse">
    <div className="flex flex-col items-center gap-2">
      {/* PRO TIP: Take a screenshot of your Spline robot and save it as 
         /public/assets/mascot-static.png. Use that here!
      */}
      <div className="w-32 h-32 bg-slate-200 rounded-full opacity-20 blur-xl" />
      <span className="text-xs font-medium text-slate-400">Waking up UniBot...</span>
    </div>
  </div>
);

interface UniBotSplineProps {
  sceneUrl: string; // Get this from Spline > Export > "Public URL"
  height?: string;
  className?: string;
}

export default function UniBotSpline({ sceneUrl, height = '500px', className }: UniBotSplineProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  return (
    // 🔒 Fixed container prevents layout shift
    <div className={`relative w-full overflow-hidden ${className}`} style={{ height }}>
      
      {/* The 3D Scene (Fades in smoothly) */}
      <div className={`transition-opacity duration-1000 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
        <Spline 
          scene={sceneUrl}
          onLoad={() => setIsLoaded(true)}
        />
      </div>

      {/* Persistent Placeholder until 3D is ready */}
      {!isLoaded && <SplinePlaceholder />}
    </div>
  );
}