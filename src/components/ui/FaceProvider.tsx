'use client';
import { createContext, useContext, useState, useRef, useEffect, ReactNode } from 'react';

// ✅ SINGLE SOURCE OF TRUTH for all face states
export type FaceState = 'idle' | 'happy' | 'thinking' | 'talking' | 'sleeping' | 'sad' | 'bouncing';

interface FaceContextType {
  state: FaceState;
  setFace: (state: FaceState) => void;
  /**
   * Temporarily change the face state (e.g., for 2 seconds after login).
   * @param tempState The emotion to show
   * @param duration How long to show it (default 2000ms)
   * @param metadata Optional context for analytics/debugging (e.g., { event: 'login' })
   */
  pulse: (tempState: FaceState, duration?: number, metadata?: Record<string, any>) => void;
}

export const FaceContext = createContext<FaceContextType | undefined>(undefined);

export function FaceProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FaceState>('idle');
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousStateRef = useRef<FaceState>('idle');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const setFace = (newState: FaceState) => {
    // If we manually set a face, cancel any active pulse to prevent "jumping"
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState(newState);
    previousStateRef.current = newState;
  };

  const pulse = (tempState: FaceState, duration = 2000, metadata?: Record<string, any>) => {
    // Optional: Log the event for debugging
    if (metadata && process.env.NODE_ENV === 'development') {
      console.debug('🤖 Face Pulse:', tempState, metadata);
    }

    // 1. If already pulsing, clear the old revert timer
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // 2. Save current state (only if we are in a stable state)
    if (!timeoutRef.current) {
        previousStateRef.current = state;
    }

    // 3. Set the temporary emotion
    setState(tempState);

    // 4. Schedule the revert
    timeoutRef.current = setTimeout(() => {
      setState(previousStateRef.current);
      timeoutRef.current = null;
    }, duration);
  };

  return (
    <FaceContext.Provider value={{ state, setFace, pulse }}>
      {children}
    </FaceContext.Provider>
  );
}

// Hook for easy access
export const useFace = () => {
  const context = useContext(FaceContext);
  if (!context) {
    throw new Error('useFace must be used within a FaceProvider');
  }
  return context;
};