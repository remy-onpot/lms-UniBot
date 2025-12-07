import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MobileNav } from "@/components/layout/MobileNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Fetch User & Role securely on the server
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role || 'student';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Main Content Area - Add padding for bottom nav */}
      <div className="pb-20 md:pb-0">
        {children}
      </div>

      {/* Persistent Bottom Nav (Visible only on Mobile) */}
      <MobileNav role={role} />
    </div>
  );
}
