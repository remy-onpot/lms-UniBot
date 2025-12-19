import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Creates or updates the public.users record after signup
 * This should be called after email confirmation or on first login
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get role from auth metadata (set during signup)
    const authMetadata = user.user_metadata || {};
    const requestedRole = authMetadata.requested_role || authMetadata.role || 'student';
    const safeRole = requestedRole === 'ta' ? 'student' : requestedRole;
    const isCourseRep = authMetadata.is_course_rep || false;

    // Check if user record already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, role, onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    if (existingUser) {
      // User exists - update role if it's still default 'student' and we have a requested role
      if (existingUser.role === 'student' && safeRole !== 'student') {
        const { error: updateError } = await supabase
          .from('users')
          .update({ 
            role: safeRole,
            is_course_rep: isCourseRep,
            full_name: authMetadata.full_name || user.email?.split('@')[0] || 'User',
            email: user.email || ''
          })
          .eq('id', user.id);

        if (updateError) {
          console.error("Error updating user role:", updateError);
        }
      }
      
      return NextResponse.json({ 
        success: true, 
        user: existingUser,
        needsOnboarding: !existingUser.onboarding_completed 
      });
    }

    // Create new user record
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email || '',
        full_name: authMetadata.full_name || user.email?.split('@')[0] || 'User',
        role: safeRole,
        is_course_rep: isCourseRep,
        onboarding_completed: false,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating user:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      user: newUser,
      needsOnboarding: true 
    });

  } catch (error: any) {
    console.error("Create user error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

