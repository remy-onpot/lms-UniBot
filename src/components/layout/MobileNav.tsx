'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Sparkles, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  role: string;
}

export function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname();
  const isLecturer = role === 'lecturer' || role === 'super_admin';

  // Smart Profile Link
  const profileLink = isLecturer ? '/dashboard/lecturer-profile' : '/dashboard/profile';

  const isActive = (path: string) => pathname === path;

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full h-16 bg-white border-t border-slate-200 md:hidden pb-safe safe-area-inset-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
      <div className={`grid h-full mx-auto max-w-lg relative ${isLecturer ? 'grid-cols-3' : 'grid-cols-4'}`}>
        
        {/* 1. Home Tab */}
        <Link
          href="/dashboard"
          className={cn(
            "inline-flex flex-col items-center justify-center px-5 hover:bg-slate-50 transition active:scale-95",
            isActive('/dashboard') ? "text-blue-600" : "text-slate-400"
          )}
        >
          <Home className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-bold">Home</span>
        </Link>

        {/* 2. Courses Tab (Students Only) */}
        {!isLecturer && (
          <Link
            href="/dashboard#my-courses" // ✅ FIX: Anchors to the course list
            className="inline-flex flex-col items-center justify-center px-5 hover:bg-slate-50 transition active:scale-95 text-slate-400"
          >
            <BookOpen className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-bold">Courses</span>
          </Link>
        )}

        {/* 3. AI Chat FAB (Floating Action Button) */}
        <div className="relative flex items-center justify-center">
            <Link
              href="/ai-assistant"
              className="absolute -top-6 flex items-center justify-center w-14 h-14 bg-linear-to-r from-indigo-600 to-purple-600 rounded-full shadow-lg shadow-indigo-200 border-4 border-white hover:scale-105 transition-transform active:scale-95"
            >
              <Sparkles className="w-6 h-6 text-white" />
            </Link>
            <span className="absolute bottom-1 text-[10px] font-bold text-indigo-600">AI Chat</span>
        </div>

        {/* 4. Profile Tab */}
        <Link
          href={profileLink}
          className={cn(
            "inline-flex flex-col items-center justify-center px-5 hover:bg-slate-50 transition active:scale-95",
            isActive(profileLink) ? "text-blue-600" : "text-slate-400"
          )}
        >
          {isLecturer ? <Users className="w-6 h-6 mb-1" /> : <User className="w-6 h-6 mb-1" />}
          <span className="text-[10px] font-bold">Profile</span>
        </Link>

      </div>
    </div>
  );
}