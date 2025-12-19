-- ============================================================================
-- NUCLEAR OPTION: Complete RLS Reset for Classes
-- This will completely disable RLS, test, then rebuild from scratch
-- ============================================================================

-- STEP 1: Completely disable RLS on both tables
ALTER TABLE public.classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.class_enrollments DISABLE ROW LEVEL SECURITY;

-- STEP 2: Drop ALL policies (force removal)
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'classes') 
    LOOP
        EXECUTE format('DROP POLICY %I ON public.classes', r.policyname);
    END LOOP;
END $$;

DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'class_enrollments') 
    LOOP
        EXECUTE format('DROP POLICY %I ON public.class_enrollments', r.policyname);
    END LOOP;
END $$;

-- STEP 3: Verify no policies exist
SELECT 'Remaining policies (should be empty):' as status;
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('classes', 'class_enrollments');

-- ============================================================================
-- NOW TEST YOUR APP - It should work with RLS disabled
-- Once confirmed, proceed to STEP 4 below
-- ============================================================================

-- STEP 4: Re-enable RLS with MINIMAL policies (uncomment after testing)
-- ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.class_enrollments ENABLE ROW LEVEL SECURITY;

-- STEP 5: Add ONLY INSERT policies first (simplest possible)
-- CREATE POLICY "minimal_insert_class" ON public.classes FOR INSERT TO authenticated WITH CHECK (auth.uid() = owner_id);
-- CREATE POLICY "minimal_insert_enrollment" ON public.class_enrollments FOR INSERT TO authenticated WITH CHECK (auth.uid() = student_id);

-- STEP 6: Add SELECT policies (test after each one)
-- CREATE POLICY "minimal_select_class" ON public.classes FOR SELECT TO authenticated USING (auth.uid() = owner_id);
-- CREATE POLICY "minimal_select_enrollment" ON public.class_enrollments FOR SELECT TO authenticated USING (auth.uid() = student_id);

-- STEP 7: Expand SELECT to include enrolled students (final step)
-- DROP POLICY "minimal_select_class" ON public.classes;
-- CREATE POLICY "select_owned_or_enrolled_class" ON public.classes FOR SELECT TO authenticated 
-- USING (
--   auth.uid() = owner_id 
--   OR EXISTS (
--     SELECT 1 FROM class_enrollments 
--     WHERE class_enrollments.class_id = classes.id 
--     AND class_enrollments.student_id = auth.uid()
--   )
-- );


