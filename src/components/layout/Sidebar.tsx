'use client';

import { 
  BookOpen, LayoutDashboard, LogOut, 
  CreditCard, Store, Users
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { UniBotMascot } from '@/components/ui/UniBotMascot';

// Menu Items based on Role
const getMenu = (role: string) => [
  { 
    label: 'Overview', 
    icon: LayoutDashboard, 
    href: '/dashboard',
    active: true 
  },
  { 
    label: role === 'lecturer' ? 'My Classes' : 'My Courses', 
    icon: BookOpen, 
    href: role === 'lecturer' ? '/dashboard/lecturer-profile' : '/dashboard/courses',
    active: true 
  },
  ...(role === 'student' ? [{ 
    label: 'Marketplace', 
    icon: Store, 
    href: '/dashboard/shop',
    active: true 
  }] : []),
  { 
    label: 'Billing & Plans', 
    icon: CreditCard, 
    href: role === 'lecturer' ? '/dashboard/billing' : '/dashboard/student-billing',
    active: true 
  },
  { 
    label: 'Profile', 
    icon: Users, 
    href: '/dashboard/profile',
    active: true 
  },
];

export function Sidebar({ role = 'student' }: { role?: string }) {
  const pathname = usePathname();
  const menu = getMenu(role);

  return (
    <aside className="hidden md:flex flex-col w-64 h-screen bg-slate-900 text-slate-300 border-r border-slate-800 sticky top-0">
      
      {/* BRAND HEADER */}
      <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800/50">
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-900/50 overflow-hidden">
           {/* 🏆 FIX: Replaced deleted UniBotFace with the new Mascot */}
           <UniBotMascot variant="dashboard" size={35} />
        </div>
        <span className="text-lg font-bold tracking-tight text-white">UniBot<span className="text-indigo-500">.Pro</span></span>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 py-6 px-3 space-y-1">
        {menu.filter(item => item.active).map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive 
                  ? "bg-indigo-600/10 text-indigo-400 border border-indigo-500/20" 
                  : "hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-white")} />
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* FOOTER */}
      <div className="p-4 border-t border-slate-800">
        <form action="/auth/signout" method="post">
          <button className="flex items-center gap-3 px-4 py-2 w-full rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-800 hover:text-rose-400 transition-colors">
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </form>
        <div className="mt-4 text-[10px] text-center text-slate-600">
          v2.1.0 (Enterprise)
        </div>
      </div>
    </aside>
  );
}