-- Migration: 004_schema_fixes.sql
-- Purpose: Fix critical schema issues identified in database audit
-- Run this in your Supabase SQL editor

BEGIN;

-- ============================================================================
-- SECTION A1: Fix Foreign Key References (auth.users -> public.users)
-- ============================================================================

-- 1. quiz_results: Change FK from auth.users to public.users
ALTER TABLE public.quiz_results 
  DROP CONSTRAINT IF EXISTS quiz_results_student_id_fkey;
  
ALTER TABLE public.quiz_results 
  ADD CONSTRAINT quiz_results_student_id_fkey 
  FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 2. daily_quizzes: Change FK from auth.users to public.users
ALTER TABLE public.daily_quizzes 
  DROP CONSTRAINT IF EXISTS quiz_history_user_id_fkey;
  
ALTER TABLE public.daily_quizzes 
  ADD CONSTRAINT daily_quizzes_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 3. enrollments: Change FK from auth.users to public.users
ALTER TABLE public.enrollments 
  DROP CONSTRAINT IF EXISTS enrollments_user_id_fkey;
  
ALTER TABLE public.enrollments 
  ADD CONSTRAINT enrollments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 4. user_achievements: Change FK from auth.users to public.users
ALTER TABLE public.user_achievements 
  DROP CONSTRAINT IF EXISTS user_achievements_user_id_fkey;
  
ALTER TABLE public.user_achievements 
  ADD CONSTRAINT user_achievements_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- 5. user_inventory: Change FK from auth.users to public.users
ALTER TABLE public.user_inventory 
  DROP CONSTRAINT IF EXISTS user_inventory_user_id_fkey;
  
ALTER TABLE public.user_inventory 
  ADD CONSTRAINT user_inventory_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- ============================================================================
-- SECTION A2: Add Missing FK on quiz_results.quiz_id
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'quiz_results_quiz_id_fkey'
  ) THEN
    ALTER TABLE public.quiz_results 
      ADD CONSTRAINT quiz_results_quiz_id_fkey 
      FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- SECTION A3: Enhance class_enrollments Table
-- NOTE: This table tracks CLASS MEMBERSHIP (who joined via access code)
-- The student_course_access table REMAINS for tracking PAID ACCESS
-- ============================================================================

-- Add columns for tracking payment status at class membership level
-- This allows quick checks like "did student pay for anything in this class?"
ALTER TABLE public.class_enrollments 
  ADD COLUMN IF NOT EXISTS access_type text DEFAULT 'free' 
    CHECK (access_type IN ('free', 'trial', 'single_course', 'semester_bundle', 'full_semester')),
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS payment_reference text,
  ADD COLUMN IF NOT EXISTS amount_paid integer;

-- Add default for id if missing
ALTER TABLE public.class_enrollments 
  ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Create unique constraint to prevent duplicate enrollments
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'class_enrollments_student_class_unique'
  ) THEN
    ALTER TABLE public.class_enrollments 
      ADD CONSTRAINT class_enrollments_student_class_unique 
      UNIQUE (student_id, class_id);
  END IF;
END $$;

-- ============================================================================
-- SECTION A6: Add Missing users Table Columns
-- ============================================================================

ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS phone_number text,
  ADD COLUMN IF NOT EXISTS last_login_date timestamp with time zone;

-- ============================================================================
-- SECTION B1: Add Performance Indexes
-- ============================================================================

-- Activity Logs (heavily queried for gamification)
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_activity_type ON public.activity_logs(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_type_date ON public.activity_logs(user_id, activity_type, created_at);

-- Class Enrollments (access checks)
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON public.class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_lookup ON public.class_enrollments(student_id, class_id);

-- Quiz Results (gradebook queries)
CREATE INDEX IF NOT EXISTS idx_quiz_results_student_id ON public.quiz_results(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_student ON public.quiz_results(quiz_id, student_id);

-- Assignment Submissions
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_student_id ON public.assignment_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_assignment_submissions_assignment_id ON public.assignment_submissions(assignment_id);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON public.transactions(user_id);

-- Materials
CREATE INDEX IF NOT EXISTS idx_materials_course_id ON public.materials(course_id);

-- Courses
CREATE INDEX IF NOT EXISTS idx_courses_class_id ON public.courses(class_id);
CREATE INDEX IF NOT EXISTS idx_courses_lecturer_id ON public.courses(lecturer_id);

-- Users (for lookups)
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ============================================================================
-- SECTION B2: Add Cascading Deletes for Data Integrity
-- ============================================================================

-- When a course is deleted, cascade to related tables
ALTER TABLE public.materials 
  DROP CONSTRAINT IF EXISTS materials_course_id_fkey;
ALTER TABLE public.materials 
  ADD CONSTRAINT materials_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.course_topics 
  DROP CONSTRAINT IF EXISTS course_topics_course_id_fkey;
ALTER TABLE public.course_topics 
  ADD CONSTRAINT course_topics_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.assignments 
  DROP CONSTRAINT IF EXISTS assignments_course_id_fkey;
ALTER TABLE public.assignments 
  ADD CONSTRAINT assignments_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

ALTER TABLE public.quizzes 
  DROP CONSTRAINT IF EXISTS quizzes_course_id_fkey;
ALTER TABLE public.quizzes 
  ADD CONSTRAINT quizzes_course_id_fkey 
  FOREIGN KEY (course_id) REFERENCES public.courses(id) ON DELETE CASCADE;

-- When a class is deleted, cascade to courses
ALTER TABLE public.courses 
  DROP CONSTRAINT IF EXISTS courses_class_id_fkey;
ALTER TABLE public.courses 
  ADD CONSTRAINT courses_class_id_fkey 
  FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;

-- When an assignment is deleted, cascade to submissions
ALTER TABLE public.assignment_submissions 
  DROP CONSTRAINT IF EXISTS assignment_submissions_assignment_id_fkey;
ALTER TABLE public.assignment_submissions 
  ADD CONSTRAINT assignment_submissions_assignment_id_fkey 
  FOREIGN KEY (assignment_id) REFERENCES public.assignments(id) ON DELETE CASCADE;

-- ============================================================================
-- SECTION B5: Create Helper Function for User Frames
-- ============================================================================

-- Function to get user's owned frames (computed from user_inventory)
CREATE OR REPLACE FUNCTION get_user_frames(p_user_id uuid)
RETURNS text[] AS $$
DECLARE
  frames text[];
BEGIN
  SELECT ARRAY_AGG(si.asset_value)
  INTO frames
  FROM public.user_inventory ui
  JOIN public.shop_items si ON si.id = ui.item_id
  WHERE ui.user_id = p_user_id AND si.type = 'frame';
  
  -- Always include 'default' frame
  RETURN COALESCE(frames, ARRAY[]::text[]) || ARRAY['default'];
END;
$$ LANGUAGE plpgsql STABLE;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify migration)
-- ============================================================================

-- Check FK constraints were updated
SELECT 
  tc.table_name, 
  tc.constraint_name, 
  ccu.table_name AS foreign_table
FROM information_schema.table_constraints tc
JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('quiz_results', 'daily_quizzes', 'enrollments', 'user_achievements', 'user_inventory')
  AND ccu.column_name = 'id';

-- Check indexes were created
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check class_enrollments has all columns
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'class_enrollments'
ORDER BY ordinal_position;
