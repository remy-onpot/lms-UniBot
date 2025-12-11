import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MobileNav } from "@/components/layout/MobileNav";
import { Sidebar } from "@/components/layout/Sidebar"; // ✅ New Component

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || 'student';

  return (
    <div className="min-h-screen bg-slate-50">
      
      {/* 🖥️ Desktop Sidebar (Hidden on Mobile) */}
      <Sidebar role={role} />

      {/* 📱 Mobile Bottom Nav (Hidden on Desktop) */}
      <MobileNav role={role} />

      {/* Layout Wrapper:
         md:pl-64 -> Pushes content right to make room for Sidebar on Desktop
         pb-24 -> Pushes content up to make room for Bottom Nav on Mobile
         md:pb-0 -> Removes bottom padding on Desktop
      */}
      <main className="transition-all duration-300 md:pl-64 pb-24 md:pb-0 min-h-screen">
        <div className="max-w-7xl mx-auto">
           {children}
        </div>
      </main>

    </div>
  );
}