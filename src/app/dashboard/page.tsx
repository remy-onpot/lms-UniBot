import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { UserProfile } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // 1. Secure Session Check
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Pre-fetch Profile (Critical for Role-Based Routing)
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Edge case: User exists in Auth but not in DB (shouldn't happen with triggers)
    redirect("/login"); 
  }

  // 3. Hand off to Client (Efficiency: No waterfall)
  return <DashboardClient user={user} initialProfile={profile as UserProfile} />;
}