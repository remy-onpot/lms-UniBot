-- Migration: Core Flow Fix
-- Purpose: Restore OLD schema structure for Dashboard → Class → Course → Topics → Chat/Quizzes
-- Run this in your Supabase SQL editor or via migration tool

BEGIN;

-- ============================================================================
-- STEP 1: Fix classes table (add missing fields if needed)
-- ============================================================================
ALTER TABLE public.classes 
  ADD COLUMN IF NOT EXISTS program_name text,
  ADD COLUMN IF NOT EXISTS admission_year integer,
  ADD COLUMN IF NOT EXISTS graduation_year integer,
  ADD COLUMN IF NOT EXISTS current_level text DEFAULT '100'::text,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS course_count integer DEFAULT 6,
  ADD COLUMN IF NOT EXISTS access_price numeric DEFAULT 0.00;

-- ============================================================================
-- STEP 2: Fix courses table (instructor_id → lecturer_id)
-- ============================================================================
-- Add lecturer_id column
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS lecturer_id uuid;

-- Migrate data from instructor_id if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'courses' 
    AND column_name = 'instructor_id'
  ) THEN
    UPDATE public.courses 
    SET lecturer_id = instructor_id 
    WHERE lecturer_id IS NULL AND instructor_id IS NOT NULL;
  END IF;
END $$;

-- Add foreign key constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'courses_lecturer_id_fkey'
  ) THEN
    ALTER TABLE public.courses 
    ADD CONSTRAINT courses_lecturer_id_fkey 
    FOREIGN KEY (lecturer_id) REFERENCES public.users(id);
  END IF;
END $$;

-- Remove instructor_id column (commented out for safety - uncomment after verifying)
-- ALTER TABLE public.courses DROP COLUMN IF EXISTS instructor_id;

-- Ensure status field exists
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'::text;

-- ============================================================================
-- STEP 3: Fix class_enrollments (add has_paid)
-- ============================================================================
ALTER TABLE public.class_enrollments 
  ADD COLUMN IF NOT EXISTS has_paid boolean DEFAULT false;

-- Migrate from access_type if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'class_enrollments' 
    AND column_name = 'access_type'
  ) THEN
    UPDATE public.class_enrollments 
    SET has_paid = true 
    WHERE access_type IN ('semester_bundle', 'single_course', 'full_semester');
  END IF;
END $$;

-- Fix joined_at type and default
ALTER TABLE public.class_enrollments 
  ALTER COLUMN joined_at TYPE timestamp with time zone 
  USING joined_at::timestamptz;

ALTER TABLE public.class_enrollments 
  ALTER COLUMN joined_at SET DEFAULT timezone('utc'::text, now());

-- ============================================================================
-- STEP 4: Create questions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  quiz_id uuid,
  question_text text NOT NULL,
  options jsonb NOT NULL, -- Array stored as JSONB: ["Option A", "Option B", "Option C", "Option D"]
  correct_answer text NOT NULL,
  explanation text,
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);

-- ============================================================================
-- STEP 5: Fix quizzes table (CRITICAL - backup first!)
-- ============================================================================
-- Backup existing quizzes table if it exists and has wrong structure
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'quizzes'
  ) THEN
    -- Check if it has user_id (wrong structure - attempts table)
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'quizzes' 
      AND column_name = 'user_id'
    ) THEN
      -- Rename to backup
      ALTER TABLE public.quizzes RENAME TO quiz_attempts_backup;
      RAISE NOTICE 'Backed up old quizzes table to quiz_attempts_backup';
    END IF;
  END IF;
END $$;

-- Create proper quizzes table (definitions)
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  course_id uuid,
  topic_id uuid,
  title text NOT NULL,
  topic text,
  difficulty text DEFAULT 'Medium'::text,
  time_limit integer, -- Minutes (optional)
  CONSTRAINT quizzes_pkey PRIMARY KEY (id),
  CONSTRAINT quizzes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT quizzes_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.course_topics(id)
);

CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_topic_id ON public.quizzes(topic_id);

-- ============================================================================
-- STEP 6: Fix quiz_results table
-- ============================================================================
ALTER TABLE public.quiz_results 
  ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS correct_answers integer,
  ADD COLUMN IF NOT EXISTS student_answers jsonb;

-- Migrate created_at to submitted_at if needed
UPDATE public.quiz_results 
SET submitted_at = COALESCE(submitted_at, created_at) 
WHERE submitted_at IS NULL;

-- Extract correct_answers from metadata if it exists
UPDATE public.quiz_results 
SET correct_answers = (metadata->>'correct_answers')::integer
WHERE correct_answers IS NULL 
  AND metadata IS NOT NULL 
  AND metadata ? 'correct_answers';

-- ============================================================================
-- STEP 7: Fix course_topics table
-- ============================================================================
ALTER TABLE public.course_topics 
  ADD COLUMN IF NOT EXISTS material_id uuid,
  ADD COLUMN IF NOT EXISTS start_page integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS end_page integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS learning_objectives text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS week_number integer,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'::text;

-- Add foreign key for material_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'course_topics_material_id_fkey'
  ) THEN
    ALTER TABLE public.course_topics 
    ADD CONSTRAINT course_topics_material_id_fkey 
    FOREIGN KEY (material_id) REFERENCES public.materials(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_course_topics_material_id ON public.course_topics(material_id);
CREATE INDEX IF NOT EXISTS idx_course_topics_course_id ON public.course_topics(course_id);

-- ============================================================================
-- STEP 8: Fix materials table
-- ============================================================================
ALTER TABLE public.materials 
  ADD COLUMN IF NOT EXISTS is_main_handout boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_text text;

-- Migrate from category if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'materials' 
    AND column_name = 'category'
  ) THEN
    UPDATE public.materials 
    SET is_main_handout = true 
    WHERE category = 'handout' AND is_main_handout = false;
  END IF;
END $$;

-- ============================================================================
-- STEP 9: Create chat_sessions table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text DEFAULT 'New Chat'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  material_id uuid,
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT chat_sessions_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id)
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_material_id ON public.chat_sessions(material_id);

-- ============================================================================
-- STEP 10: Fix chat_messages table
-- ============================================================================
ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS material_id uuid,
  ADD COLUMN IF NOT EXISTS topic_id uuid;

-- Add foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chat_messages_material_id_fkey'
  ) THEN
    ALTER TABLE public.chat_messages 
    ADD CONSTRAINT chat_messages_material_id_fkey 
    FOREIGN KEY (material_id) REFERENCES public.materials(id);
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'chat_messages_topic_id_fkey'
  ) THEN
    ALTER TABLE public.chat_messages 
    ADD CONSTRAINT chat_messages_topic_id_fkey 
    FOREIGN KEY (topic_id) REFERENCES public.course_topics(id);
  END IF;
END $$;

-- Migrate material_id from chat_sessions if session_id exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'chat_messages' 
    AND column_name = 'session_id'
  ) THEN
    UPDATE public.chat_messages cm
    SET material_id = cs.material_id
    FROM public.chat_sessions cs
    WHERE cm.session_id = cs.id::text 
      AND cm.material_id IS NULL 
      AND cs.material_id IS NOT NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_messages_material_id ON public.chat_messages(material_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_topic_id ON public.chat_messages(topic_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);

-- ============================================================================
-- STEP 11: Create class_announcements table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.class_announcements (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  class_id uuid,
  lecturer_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  CONSTRAINT class_announcements_pkey PRIMARY KEY (id),
  CONSTRAINT class_announcements_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_announcements_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_class_announcements_class_id ON public.class_announcements(class_id);

-- ============================================================================
-- STEP 12: Fix student_course_access table
-- ============================================================================
ALTER TABLE public.student_course_access 
  ALTER COLUMN access_type SET DEFAULT 'full_semester'::text,
  ALTER COLUMN expires_at SET DEFAULT (now() + '6 mons'::interval);

ALTER TABLE public.student_course_access 
  ADD COLUMN IF NOT EXISTS class_id uuid;

-- Add foreign key for class_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'student_course_access_class_id_fkey'
  ) THEN
    ALTER TABLE public.student_course_access 
    ADD CONSTRAINT student_course_access_class_id_fkey 
    FOREIGN KEY (class_id) REFERENCES public.classes(id);
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify migration)
-- ============================================================================

-- Check quizzes structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'quizzes' 
ORDER BY ordinal_position;

-- Check courses has lecturer_id
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'courses' 
  AND column_name IN ('lecturer_id', 'instructor_id')
ORDER BY ordinal_position;

-- Check class_enrollments has has_paid
SELECT column_name, data_type
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'class_enrollments' 
  AND column_name = 'has_paid';

-- Check all required tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'questions', 'chat_sessions', 'class_announcements'
  )
ORDER BY table_name;

