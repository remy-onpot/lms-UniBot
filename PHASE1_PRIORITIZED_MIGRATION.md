# Phase 1: Prioritized Migration - Core Flow First

## Goal
Get the core flow working: **Dashboard → Class → Course → Topics → Chat/Quizzes**

## Critical Path Analysis

### Flow Requirements
1. **Dashboard** - User sees their classes (owned + enrolled)
2. **Class Creation** - Course rep/lecturer creates a class
3. **Course Creation** - Lecturer adds courses to class
4. **Topics** - Lecturer creates weekly topics with materials
5. **Chat** - Student chats about materials
6. **Quizzes** - Student takes quizzes on topics

### Current Blockers
- `quizzes` table is wrong structure (attempts vs definitions)
- `class_enrollments` missing `has_paid` 
- `courses` has `instructor_id` instead of `lecturer_id`
- `course_topics` missing `material_id`, `start_page`, `end_page`
- `chat_messages` missing `material_id`, `topic_id`
- Missing `questions` table

## Step-by-Step Migration (Priority Order)

### Step 1: Fix `classes` Table Structure ✅
**Status:** Already correct in OLD schema
**Action:** Verify structure matches OLD schema

```sql
-- Verify classes table has these fields:
-- id, name, description, access_code, lecturer_id, university_id, 
-- program_name, admission_year, graduation_year, current_level,
-- is_archived, course_count, status, type, access_price

-- If missing, add them:
ALTER TABLE public.classes 
  ADD COLUMN IF NOT EXISTS program_name text,
  ADD COLUMN IF NOT EXISTS admission_year integer,
  ADD COLUMN IF NOT EXISTS graduation_year integer,
  ADD COLUMN IF NOT EXISTS current_level text DEFAULT '100'::text,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS course_count integer DEFAULT 6,
  ADD COLUMN IF NOT EXISTS access_price numeric DEFAULT 0.00;
```

### Step 2: Fix `courses` Table (CRITICAL)
**Why:** Needed for course creation in classes

```sql
-- Change instructor_id to lecturer_id
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS lecturer_id uuid;

-- Migrate data if instructor_id exists
UPDATE public.courses 
SET lecturer_id = instructor_id 
WHERE lecturer_id IS NULL AND instructor_id IS NOT NULL;

-- Add foreign key
ALTER TABLE public.courses 
  ADD CONSTRAINT courses_lecturer_id_fkey 
  FOREIGN KEY (lecturer_id) REFERENCES public.users(id);

-- Remove instructor_id
ALTER TABLE public.courses DROP COLUMN IF EXISTS instructor_id;

-- Ensure status field exists
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'::text;
```

### Step 3: Fix `class_enrollments` (CRITICAL)
**Why:** Needed for students to join classes and payment tracking

```sql
-- Add has_paid field
ALTER TABLE public.class_enrollments 
  ADD COLUMN IF NOT EXISTS has_paid boolean DEFAULT false;

-- Migrate from access_type if it exists
UPDATE public.class_enrollments 
SET has_paid = true 
WHERE access_type IN ('semester_bundle', 'single_course', 'full_semester');

-- Ensure joined_at exists with correct type
ALTER TABLE public.class_enrollments 
  ALTER COLUMN joined_at TYPE timestamp with time zone 
  USING joined_at::timestamptz;

-- Set default if not exists
ALTER TABLE public.class_enrollments 
  ALTER COLUMN joined_at SET DEFAULT timezone('utc'::text, now());
```

### Step 4: Create `questions` Table (CRITICAL)
**Why:** Needed for quizzes to work

```sql
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
```

### Step 5: Fix `quizzes` Table (CRITICAL - MOST IMPORTANT)
**Why:** Currently structured as attempts, needs to be definitions

```sql
-- Step 1: Backup current quizzes table (rename it)
ALTER TABLE IF EXISTS public.quizzes RENAME TO quiz_attempts_backup;

-- Step 2: Create proper quizzes table (definitions)
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
```

### Step 6: Fix `quiz_results` Table
**Why:** Needed for storing quiz scores

```sql
-- Add missing fields
ALTER TABLE public.quiz_results 
  ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS correct_answers integer,
  ADD COLUMN IF NOT EXISTS student_answers jsonb;

-- Migrate created_at to submitted_at if needed
UPDATE public.quiz_results 
SET submitted_at = COALESCE(submitted_at, created_at) 
WHERE submitted_at IS NULL;

-- Extract correct_answers from metadata if it exists there
UPDATE public.quiz_results 
SET correct_answers = (metadata->>'correct_answers')::integer
WHERE correct_answers IS NULL AND metadata ? 'correct_answers';

-- Remove course_id if it shouldn't be there (or keep if you want it)
-- ALTER TABLE public.quiz_results DROP COLUMN IF EXISTS course_id;
```

### Step 7: Fix `course_topics` Table (CRITICAL)
**Why:** Needed for weekly topics with materials and page ranges

```sql
-- Add missing fields
ALTER TABLE public.course_topics 
  ADD COLUMN IF NOT EXISTS material_id uuid,
  ADD COLUMN IF NOT EXISTS start_page integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS end_page integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS learning_objectives text[] DEFAULT '{}'::text[];

-- Add foreign key for material_id
ALTER TABLE public.course_topics 
  ADD CONSTRAINT course_topics_material_id_fkey 
  FOREIGN KEY (material_id) REFERENCES public.materials(id);

-- Ensure week_number exists
ALTER TABLE public.course_topics 
  ADD COLUMN IF NOT EXISTS week_number integer;

-- Ensure status exists
ALTER TABLE public.course_topics 
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'::text;

CREATE INDEX IF NOT EXISTS idx_course_topics_material_id ON public.course_topics(material_id);
CREATE INDEX IF NOT EXISTS idx_course_topics_course_id ON public.course_topics(course_id);
```

### Step 8: Fix `materials` Table
**Why:** Needed for PDFs and handouts

```sql
-- Ensure is_main_handout exists
ALTER TABLE public.materials 
  ADD COLUMN IF NOT EXISTS is_main_handout boolean DEFAULT false;

-- Migrate from category if it exists
UPDATE public.materials 
SET is_main_handout = true 
WHERE category = 'handout' AND is_main_handout = false;

-- Ensure content_text exists
ALTER TABLE public.materials 
  ADD COLUMN IF NOT EXISTS content_text text;
```

### Step 9: Fix `chat_sessions` Table
**Why:** Needed for chat functionality

```sql
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
```

### Step 10: Fix `chat_messages` Table
**Why:** Needed for chat messages linked to materials/topics

```sql
-- Add material_id and topic_id
ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS material_id uuid,
  ADD COLUMN IF NOT EXISTS topic_id uuid;

-- Make material_id NOT NULL if you want (check data first)
-- For now, keep it nullable to allow migration

-- Add foreign keys
ALTER TABLE public.chat_messages 
  ADD CONSTRAINT chat_messages_material_id_fkey 
  FOREIGN KEY (material_id) REFERENCES public.materials(id),
  ADD CONSTRAINT chat_messages_topic_id_fkey 
  FOREIGN KEY (topic_id) REFERENCES public.course_topics(id);

-- Migrate from session_id if chat_sessions has material_id
UPDATE public.chat_messages cm
SET material_id = cs.material_id
FROM public.chat_sessions cs
WHERE cm.session_id = cs.id::text 
  AND cm.material_id IS NULL 
  AND cs.material_id IS NOT NULL;

-- Update user_id to reference public.users (not auth.users)
-- First check if it references auth.users
-- If so, you may need to migrate or keep both references

CREATE INDEX IF NOT EXISTS idx_chat_messages_material_id ON public.chat_messages(material_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_topic_id ON public.chat_messages(topic_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
```

### Step 11: Create `class_announcements` Table
**Why:** Needed for class announcements

```sql
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
```

### Step 12: Fix `student_course_access` Table
**Why:** Needed for "Drug Dealer" payment model (Week 3+ access)

```sql
-- Ensure default values match OLD schema
ALTER TABLE public.student_course_access 
  ALTER COLUMN access_type SET DEFAULT 'full_semester'::text,
  ALTER COLUMN expires_at SET DEFAULT (now() + '6 mons'::interval);

-- Ensure class_id exists
ALTER TABLE public.student_course_access 
  ADD COLUMN IF NOT EXISTS class_id uuid;

-- Add foreign key if missing
ALTER TABLE public.student_course_access 
  ADD CONSTRAINT IF NOT EXISTS student_course_access_class_id_fkey 
  FOREIGN KEY (class_id) REFERENCES public.classes(id);
```

## Quick Migration Script (Run in Order)

```sql
-- Run all steps above in sequence
-- This is a combined script for quick execution

BEGIN;

-- Step 1: Classes (verify structure)
ALTER TABLE public.classes 
  ADD COLUMN IF NOT EXISTS program_name text,
  ADD COLUMN IF NOT EXISTS admission_year integer,
  ADD COLUMN IF NOT EXISTS graduation_year integer,
  ADD COLUMN IF NOT EXISTS current_level text DEFAULT '100'::text,
  ADD COLUMN IF NOT EXISTS is_archived boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS course_count integer DEFAULT 6,
  ADD COLUMN IF NOT EXISTS access_price numeric DEFAULT 0.00;

-- Step 2: Courses
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS lecturer_id uuid;
UPDATE public.courses SET lecturer_id = instructor_id WHERE lecturer_id IS NULL AND instructor_id IS NOT NULL;
ALTER TABLE public.courses ADD CONSTRAINT courses_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public.users(id);
ALTER TABLE public.courses DROP COLUMN IF EXISTS instructor_id;
ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'::text;

-- Step 3: Class Enrollments
ALTER TABLE public.class_enrollments ADD COLUMN IF NOT EXISTS has_paid boolean DEFAULT false;
UPDATE public.class_enrollments SET has_paid = true WHERE access_type IN ('semester_bundle', 'single_course', 'full_semester');
ALTER TABLE public.class_enrollments ALTER COLUMN joined_at TYPE timestamp with time zone USING joined_at::timestamptz;
ALTER TABLE public.class_enrollments ALTER COLUMN joined_at SET DEFAULT timezone('utc'::text, now());

-- Step 4: Questions
CREATE TABLE IF NOT EXISTS public.questions (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  quiz_id uuid,
  question_text text NOT NULL,
  options jsonb NOT NULL,
  correct_answer text NOT NULL,
  explanation text,
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);

-- Step 5: Quizzes (CRITICAL - backup first!)
ALTER TABLE IF EXISTS public.quizzes RENAME TO quiz_attempts_backup;
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  course_id uuid,
  topic_id uuid,
  title text NOT NULL,
  topic text,
  difficulty text DEFAULT 'Medium'::text,
  time_limit integer,
  CONSTRAINT quizzes_pkey PRIMARY KEY (id),
  CONSTRAINT quizzes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT quizzes_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.course_topics(id)
);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON public.quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_topic_id ON public.quizzes(topic_id);

-- Step 6: Quiz Results
ALTER TABLE public.quiz_results 
  ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS correct_answers integer,
  ADD COLUMN IF NOT EXISTS student_answers jsonb;
UPDATE public.quiz_results SET submitted_at = COALESCE(submitted_at, created_at) WHERE submitted_at IS NULL;
UPDATE public.quiz_results SET correct_answers = (metadata->>'correct_answers')::integer WHERE correct_answers IS NULL AND metadata ? 'correct_answers';

-- Step 7: Course Topics
ALTER TABLE public.course_topics 
  ADD COLUMN IF NOT EXISTS material_id uuid,
  ADD COLUMN IF NOT EXISTS start_page integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS end_page integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS learning_objectives text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS week_number integer,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'active'::text;
ALTER TABLE public.course_topics ADD CONSTRAINT course_topics_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id);
CREATE INDEX IF NOT EXISTS idx_course_topics_material_id ON public.course_topics(material_id);
CREATE INDEX IF NOT EXISTS idx_course_topics_course_id ON public.course_topics(course_id);

-- Step 8: Materials
ALTER TABLE public.materials 
  ADD COLUMN IF NOT EXISTS is_main_handout boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS content_text text;
UPDATE public.materials SET is_main_handout = true WHERE category = 'handout' AND is_main_handout = false;

-- Step 9: Chat Sessions
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

-- Step 10: Chat Messages
ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS material_id uuid,
  ADD COLUMN IF NOT EXISTS topic_id uuid;
ALTER TABLE public.chat_messages 
  ADD CONSTRAINT chat_messages_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id),
  ADD CONSTRAINT chat_messages_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.course_topics(id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_material_id ON public.chat_messages(material_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_topic_id ON public.chat_messages(topic_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);

-- Step 11: Class Announcements
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

-- Step 12: Student Course Access
ALTER TABLE public.student_course_access 
  ALTER COLUMN access_type SET DEFAULT 'full_semester'::text,
  ALTER COLUMN expires_at SET DEFAULT (now() + '6 mons'::interval);
ALTER TABLE public.student_course_access ADD COLUMN IF NOT EXISTS class_id uuid;
ALTER TABLE public.student_course_access ADD CONSTRAINT IF NOT EXISTS student_course_access_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id);

COMMIT;
```

## Testing Checklist (After Migration)

### Class Creation Flow
- [ ] Course rep can create a cohort class
- [ ] Lecturer can create a SaaS class
- [ ] Class appears on dashboard
- [ ] Access code is generated

### Course Creation Flow
- [ ] Lecturer can create a course in a class
- [ ] Course appears in class view
- [ ] Course has lecturer_id set correctly

### Topic Creation Flow
- [ ] Lecturer can create topics with week_number
- [ ] Topic can have material_id linked
- [ ] Topic can have start_page and end_page
- [ ] Topic appears in course view

### Quiz Flow
- [ ] Lecturer can create a quiz for a topic
- [ ] Lecturer can add questions to quiz
- [ ] Student can see quiz
- [ ] Student can take quiz
- [ ] Quiz results are saved correctly

### Chat Flow
- [ ] Student can start chat session for a material
- [ ] Chat messages are linked to material_id
- [ ] Chat history loads correctly

### Enrollment Flow
- [ ] Student can join class with access code
- [ ] Enrollment has has_paid field
- [ ] Student appears in class roster

## Next Steps After Phase 1

Once core flow works:
1. Add remaining tables (app_config, xp_config, etc.)
2. Fix users table (add missing fields)
3. Fix achievements table
4. Remove duplicate tables
5. Add remaining indexes

## Rollback Plan

If something breaks:
```sql
-- Restore quizzes if needed
DROP TABLE IF EXISTS public.quizzes;
ALTER TABLE quiz_attempts_backup RENAME TO quizzes;

-- Remove added columns (be careful with data)
-- ALTER TABLE public.courses DROP COLUMN IF EXISTS lecturer_id;
-- etc.
```

