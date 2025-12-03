import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Checks if a user has Super Admin privileges.
 * Verifies against the database role and an optional environment variable fallback.
 * * @param supabase - The Supabase client (Client or Server instance)
 * @param userId - The UUID of the user to check
 */
export async function isSuperAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('role, email')
    .eq('id', userId)
    .single();
  
  if (error || !data) return false;
  
  return data.role === 'super_admin' || 
         data.email === process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
}

/**
 * Checks if a user has permission to view a specific course (module).
 * Grants access if:
 * 1. User is the Lecturer/Owner of the course.
 * 2. User is Enrolled in the parent Class.
 * 3. User has purchased specific access (student_course_access table).
 * * @param supabase - The Supabase client (Client or Server instance)
 * @param userId - The UUID of the user
 * @param courseId - The UUID of the course module
 */
export async function canAccessCourse(supabase: SupabaseClient, userId: string, courseId: string): Promise<boolean> {
  // 1. Fetch Course Details (Owner & Parent Class)
  const { data: course, error } = await supabase
    .from('courses')
    .select('lecturer_id, class_id')
    .eq('id', courseId)
    .single();

  if (error || !course) return false;

  // ✅ Condition 1: Is Owner?
  if (course.lecturer_id === userId) return true;

  // ✅ Condition 2: Is Enrolled in Parent Class?
  if (course.class_id) {
    const { data: enrollment } = await supabase
      .from('class_enrollments')
      .select('id')
      .eq('student_id', userId)
      .eq('class_id', course.class_id)
      .single();

    if (enrollment) return true;
  }

  // ✅ Condition 3: Has Paid/Specific Access?
  const { data: access } = await supabase
    .from('student_course_access')
    .select('id')
    .eq('student_id', userId)
    .eq('course_id', courseId)
    .single();

  return !!access;
}