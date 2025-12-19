-- ============================================================================
-- FINAL RLS FIX: No Recursion + Role-Based Security
-- ============================================================================

BEGIN;

-- Step 1: Drop ALL existing policies completely
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'classes') 
    LOOP
        EXECUTE format('DROP POLICY %I ON public.classes', r.policyname);
    END LOOP;
    
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'class_enrollments') 
    LOOP
        EXECUTE format('DROP POLICY %I ON public.class_enrollments', r.policyname);
    END LOOP;
END $$;

-- Step 2: Ensure RLS is enabled
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- CLASSES POLICIES
-- ============================================================================

-- INSERT: Only lecturers OR course reps can create classes
-- Uses JOIN to users table to check role (NO recursion to classes table!)
CREATE POLICY "lecturers_and_reps_can_create_classes" 
ON public.classes 
FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() = owner_id
  AND EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid()
    AND (
      users.role = 'lecturer'
      OR (users.role = 'student' AND users.is_course_rep = true)
    )
  )
);

-- SELECT: Simple ownership check ONLY (no cross-table queries to prevent recursion)
-- Students will see classes through class_enrollments queries, not through classes SELECT
CREATE POLICY "users_can_view_own_classes" 
ON public.classes 
FOR SELECT 
TO authenticated 
USING (auth.uid() = owner_id);

-- UPDATE: Only owners can update
CREATE POLICY "owners_can_update_classes" 
ON public.classes 
FOR UPDATE 
TO authenticated 
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

-- DELETE: Only owners can delete
CREATE POLICY "owners_can_delete_classes" 
ON public.classes 
FOR DELETE 
TO authenticated 
USING (auth.uid() = owner_id);

-- ============================================================================
-- CLASS_ENROLLMENTS POLICIES
-- ============================================================================

-- INSERT: Any authenticated user can enroll themselves
CREATE POLICY "users_can_enroll_themselves" 
ON public.class_enrollments 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = student_id);

-- SELECT: Users see their own enrollments OR enrollments in classes they own
-- This is SAFE because we query classes.owner_id, not other enrollment records
CREATE POLICY "users_can_view_relevant_enrollments" 
ON public.class_enrollments 
FOR SELECT 
TO authenticated 
USING (
  auth.uid() = student_id
  OR EXISTS (
    SELECT 1 FROM classes 
    WHERE classes.id = class_enrollments.class_id 
    AND classes.owner_id = auth.uid()
  )
);

-- UPDATE: Only class owners can update enrollments (approve/reject)
CREATE POLICY "owners_can_update_enrollments" 
ON public.class_enrollments 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM classes 
    WHERE classes.id = class_enrollments.class_id 
    AND classes.owner_id = auth.uid()
  )
);

-- DELETE: Users can unenroll themselves OR owners can remove students
CREATE POLICY "users_and_owners_can_delete_enrollments" 
ON public.class_enrollments 
FOR DELETE 
TO authenticated 
USING (
  auth.uid() = student_id
  OR EXISTS (
    SELECT 1 FROM classes 
    WHERE classes.id = class_enrollments.class_id 
    AND classes.owner_id = auth.uid()
  )
);

COMMIT;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check all policies
SELECT 
  tablename,
  policyname,
  cmd,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK'
    WHEN qual IS NOT NULL THEN 'Has USING'
    ELSE 'No conditions'
  END as policy_type
FROM pg_policies
WHERE schemaname = 'public' 
  AND tablename IN ('classes', 'class_enrollments')
ORDER BY tablename, cmd, policyname;

-- Test query to see if your user can create classes
-- Replace 'YOUR_USER_ID' with actual user ID
-- SELECT 
--   u.id,
--   u.email,
--   u.role,
--   u.is_course_rep,
--   CASE 
--     WHEN u.role = 'lecturer' THEN 'YES - Lecturer'
--     WHEN u.role = 'student' AND u.is_course_rep = true THEN 'YES - Course Rep'
--     ELSE 'NO - Not authorized'
--   END as can_create_class
-- FROM users u
-- WHERE u.id = auth.uid();


