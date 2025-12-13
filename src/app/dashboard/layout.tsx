import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar";
import { LoginTracker } from "@/components/features/gamification/LoginTracker";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Auth Check
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 2. Role Check (Needed for Sidebar/Nav customization)
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || 'student';

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* 🕵️ GAMIFICATION TRIGGER */}
      {/* This invisible component records the daily login for streaks & badges */}
      <LoginTracker userId={user.id} />

      {/* 🖥️ Desktop Sidebar */}
      <Sidebar role={role} />

      {/* 📱 Mobile Bottom Nav */}
      <MobileNav role={role} />

      {/* Main Content Area */}
      {/* md:pl-64 pushes content to the right on desktop to account for the fixed Sidebar */}
      <main className="transition-all duration-300 md:pl-64 pb-24 md:pb-0 min-h-screen">
        <div className="max-w-7xl mx-auto">
           {children}
        </div>
      </main>

    </div>
  );
}