'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, Sparkles, User, Users, GraduationCap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  role: string;
}

export function MobileNav({ role }: MobileNavProps) {
  const pathname = usePathname();
  const isLecturer = role === 'lecturer' || role === 'super_admin';
  const profileLink = isLecturer ? '/dashboard/lecturer-profile' : '/dashboard/profile';

  // Exact match for dashboard to prevent it lighting up on sub-pages unnecessarily
  const isActive = (path: string) => {
      if (path === '/dashboard' && pathname !== '/dashboard') return false;
      return pathname.startsWith(path);
  };

  return (
    <div className="fixed bottom-0 left-0 z-50 w-full md:hidden">
      
      {/* Floating Glass Container */}
      <div className="absolute bottom-0 w-full h-20 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 pb-safe shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
        <div className="grid h-full grid-cols-4 mx-auto max-w-md items-center">
          
          <NavLink 
            href="/dashboard" 
            active={isActive('/dashboard')} 
            icon={Home} 
            label="Home" 
          />

          <NavLink 
            href={isLecturer ? '/dashboard/lecturer-profile' : '/dashboard/courses'} 
            active={isActive(isLecturer ? '/dashboard/lecturer-profile' : '/dashboard/courses')} 
            icon={isLecturer ? GraduationCap : BookOpen} 
            label={isLecturer ? 'Classes' : 'Courses'} 
          />

          {/* Center FAB (Floating Action Button) - Overflows the bar */}
          <div className="relative -top-6 flex justify-center">
             <Link
                href="/ai-assistant"
                className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xl shadow-indigo-500/30 border-4 border-white active:scale-95 transition-transform"
             >
                <Sparkles className="w-6 h-6 text-indigo-400" />
             </Link>
             <span className="absolute -bottom-6 text-[10px] font-bold text-slate-500">AI Tutor</span>
          </div>

          <NavLink 
            href={profileLink} 
            active={isActive(profileLink)} 
            icon={isLecturer ? Users : User} 
            label="Profile" 
          />

        </div>
      </div>
    </div>
  );
}

function NavLink({ href, active, icon: Icon, label }: any) {
    return (
        <Link
          href={href}
          className="flex flex-col items-center justify-center gap-1 group"
        >
          <div className={cn(
              "p-1.5 rounded-xl transition-all duration-300",
              active ? "bg-indigo-50 text-indigo-600" : "text-slate-400 group-hover:text-slate-600"
          )}>
             <Icon className={cn("w-6 h-6", active && "fill-indigo-600/20")} />
          </div>
          <span className={cn(
              "text-[10px] font-bold transition-colors",
              active ? "text-indigo-600" : "text-slate-400"
          )}>
            {label}
          </span>
        </Link>
    );
}