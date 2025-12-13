'use client';
import { useEffect, useRef } from 'react';
import { GamificationService } from '@/lib/services/gamification.service';

export function LoginTracker({ userId }: { userId: string }) {
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const recordLogin = async () => {
      const today = new Date().toDateString();
      const lastLogin = localStorage.getItem('last_login_date');

      // Only record once per day to prevent spamming the DB
      if (lastLogin !== today) {
        await GamificationService.recordActivity(userId, 'login');
        localStorage.setItem('last_login_date', today);
        console.log("✅ Daily Login Recorded");
      }
    };

    recordLogin();
  }, [userId]);

  return null; // It's invisible
}