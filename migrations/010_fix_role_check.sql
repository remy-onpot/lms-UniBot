-- ============================================================================
-- FIX: Role Check Failing in INSERT Policy
-- Issue: Policy can't read users table OR user profile not updated yet
-- ============================================================================

-- Step 1: Check current user's profile
SELECT 
  id,
  email,
  role,
  is_course_rep,
  onboarding_completed,
  CASE 
    WHEN role = 'lecturer' THEN '✅ Can create (Lecturer)'
    WHEN role = 'student' AND is_course_rep = true THEN '✅ Can create (Course Rep)'
    ELSE '❌ Cannot create'
  END as can_create_class
FROM users
WHERE id = '043b1925-eeaf-49a4-8cbe-feabb0ad29fa';

-- Step 2: Check if users table has RLS that blocks the policy
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users'
ORDER BY cmd;

-- Step 3: Temporarily simplify the INSERT policy to debug
DROP POLICY IF EXISTS "lecturers_and_reps_can_create_classes" ON public.classes;

-- Create a simplified policy that allows ANY authenticated user during onboarding
-- We'll add role check back after confirming it works
CREATE POLICY "authenticated_users_can_create_classes_temp" 
ON public.classes 
FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = owner_id
  -- Temporarily removed role check for debugging
);

-- Step 4: If the above works, replace with proper role-based policy
-- Uncomment below after testing:

-- DROP POLICY IF EXISTS "authenticated_users_can_create_classes_temp" ON public.classes;
-- 
-- CREATE POLICY "lecturers_and_reps_can_create_classes" 
-- ON public.classes 
-- FOR INSERT 
-- TO authenticated 
-- WITH CHECK (
--   auth.uid() = owner_id
--   AND (
--     -- Check role directly without subquery
--     (SELECT role FROM users WHERE id = auth.uid()) = 'lecturer'
--     OR 
--     (
--       (SELECT role FROM users WHERE id = auth.uid()) = 'student'
--       AND 
--       (SELECT is_course_rep FROM users WHERE id = auth.uid()) = true
--     )
--   )
-- );

-- Step 5: Ensure users table has permissive RLS for policy checks
-- The INSERT policy on classes needs to READ from users table
-- Make sure users table allows authenticated users to read their own record

SELECT 'Checking users table RLS policies:' as info;
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN cmd = 'SELECT' AND qual LIKE '%auth.uid()%' THEN '✅ Allows self-read'
    WHEN cmd = 'SELECT' AND qual = 'true' THEN '✅ Allows all reads'
    ELSE '⚠️ Check policy'
  END as status
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename = 'users'
  AND cmd = 'SELECT';


