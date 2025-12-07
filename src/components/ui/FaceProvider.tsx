"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { FaceAnalyticsService } from '@/lib/services/face-analytics.service';

export type FaceState = 'idle' | 'thinking' | 'bouncing' | 'happy' | 'sad';

interface FaceContextValue {
  state: FaceState;
  setState: (s: FaceState) => void;
  pulse: (s: FaceState, duration?: number, context?: Record<string, any>) => void;
}

// 1. Export the Context itself
export const FaceContext = createContext<FaceContextValue | undefined>(undefined);

export const FaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<FaceState>('idle');
  const timerRef = useRef<number | null>(null);

  const pulse = useCallback((s: FaceState, duration = 900, context?: Record<string, any>) => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setState(s);
    
    FaceAnalyticsService.logPulse(s, context).catch(e => {
      console.error('[FaceProvider] Failed to log pulse:', e);
    });
    
    timerRef.current = window.setTimeout(() => setState('idle'), duration);
  }, []);

  return (
    <FaceContext.Provider value={{ state, setState, pulse }}>
      {children}
    </FaceContext.Provider>
  );
};

export function useFace() {
  const ctx = useContext(FaceContext);
  if (!ctx) throw new Error('useFace must be used within FaceProvider');
  return ctx;
}