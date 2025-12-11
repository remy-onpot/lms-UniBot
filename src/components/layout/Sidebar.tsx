'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, User, Users, LogOut, Settings, Sparkles } from 'lucide-react';
import { UniBotFace } from '@/components/ui/UniBotFace';
import { cn } from '@/lib/utils';

interface SidebarProps {
  role: string;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const isLecturer = role === 'lecturer' || role === 'super_admin';
  const profileLink = isLecturer ? '/dashboard/lecturer-profile' : '/dashboard/profile';

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  const links = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: isLecturer ? 'My Classes' : 'My Courses', href: isLecturer ? '/dashboard/lecturer-profile' : '/dashboard/courses', icon: BookOpen },
    { name: 'AI Tutor', href: '/ai-assistant', icon: Sparkles },
    { name: 'Profile', href: profileLink, icon: isLecturer ? Users : User },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen fixed left-0 top-0 bg-white border-r border-slate-200 z-40">
      
      {/* Brand Header */}
      <div className="h-20 flex items-center px-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100">
             <UniBotFace size="sm" state="happy" autoBlink={false} />
          </div>
          <span className="font-black text-xl text-slate-900 tracking-tight">UniBot</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {links.map((link) => {
          const active = isActive(link.href);
          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all duration-200 group",
                active 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-200" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <link.icon className={cn("w-5 h-5", active ? "text-indigo-400" : "text-slate-400 group-hover:text-slate-600")} />
              {link.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer / User */}
      <div className="p-4 border-t border-slate-100">
        <Link 
          href={profileLink}
          className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition border border-transparent hover:border-slate-200"
        >
           <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <User className="w-5 h-5" />
           </div>
           <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate">My Account</p>
              <p className="text-[10px] font-medium text-slate-500 capitalize">{role}</p>
           </div>
           <Settings className="w-4 h-4 text-slate-400" />
        </Link>
      </div>
    </aside>
  );
}