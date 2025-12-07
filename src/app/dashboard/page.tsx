import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardClient from "./DashboardClient";
import { UserProfile } from "@/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  
  // 1. Fetch Auth Session Server-Side
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 2. Fetch Profile Data Server-Side
  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  // 3. Pass data to Client Component
  return <DashboardClient user={user} initialProfile={profile as UserProfile} />;
}