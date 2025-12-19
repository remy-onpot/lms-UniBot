-- ============================================================================
-- EMERGENCY RLS FIX - Run this NOW in Supabase SQL Editor
-- This will immediately fix the infinite recursion on classes and class_enrollments
-- ============================================================================

-- Step 1: Drop ALL existing policies on classes (regardless of name)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'classes') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.classes', r.policyname);
    END LOOP;
END $$;

-- Step 2: Drop ALL existing policies on class_enrollments
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'class_enrollments') 
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.class_enrollments', r.policyname);
    END LOOP;
END $$;

-- Step 3: Create ONLY the safe policies

-- ============================================================================
-- CLASSES - Safe Policies
-- ============================================================================

CREATE POLICY "allow_insert_own_class"
ON public.classes
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "allow_select_owned_or_enrolled"
ON public.classes
FOR SELECT
TO authenticated
USING (
  auth.uid() = owner_id 
  OR EXISTS (
    SELECT 1 FROM class_enrollments 
    WHERE class_enrollments.class_id = classes.id 
    AND class_enrollments.student_id = auth.uid()
  )
);

CREATE POLICY "allow_update_own_class"
ON public.classes
FOR UPDATE
TO authenticated
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "allow_delete_own_class"
ON public.classes
FOR DELETE
TO authenticated
USING (auth.uid() = owner_id);

-- ============================================================================
-- CLASS_ENROLLMENTS - Safe Policies
-- ============================================================================

CREATE POLICY "allow_insert_own_enrollment"
ON public.class_enrollments
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = student_id);

CREATE POLICY "allow_select_own_or_class_owner"
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

CREATE POLICY "allow_update_by_class_owner"
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

CREATE POLICY "allow_delete_by_owner_or_self"
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

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  'Classes policies:' as info,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'classes'
UNION ALL
SELECT 
  'Enrollments policies:' as info,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'class_enrollments'
ORDER BY info, policyname;


