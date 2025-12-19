# Migration Plan: Restore OLD Schema Structure

## Overview
This plan will help you migrate from the NEW schema back to the OLD schema structure (which your code expects) while fixing duplications.

## Pre-Migration Checklist

- [ ] Backup current database
- [ ] Review all data that needs to be preserved
- [ ] Test migration on staging environment first
- [ ] Document any custom data in NEW schema that needs migration

---

## Phase 1: Create Missing Tables

### 1.1 Core Missing Tables

#### `app_config`
```sql
CREATE TABLE IF NOT EXISTS public.app_config (
  key text NOT NULL,
  value jsonb NOT NULL,
  description text,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT app_config_pkey PRIMARY KEY (key)
);
```

#### `xp_config`
```sql
CREATE TABLE IF NOT EXISTS public.xp_config (
  activity_type text NOT NULL,
  base_xp integer NOT NULL DEFAULT 0,
  per_question_xp integer NOT NULL DEFAULT 0,
  daily_limit integer,
  duration_estimate integer DEFAULT 5,
  CONSTRAINT xp_config_pkey PRIMARY KEY (activity_type)
);

-- Migrate data from xp_rates if it exists
INSERT INTO public.xp_config (activity_type, base_xp, per_question_xp)
SELECT activity_type, base_xp, per_score_xp
FROM public.xp_rates
ON CONFLICT (activity_type) DO NOTHING;
```

#### `xp_history`
```sql
CREATE TABLE IF NOT EXISTS public.xp_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  action_type text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT xp_history_pkey PRIMARY KEY (id),
  CONSTRAINT xp_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
```

#### `ai_usage_logs`
```sql
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  university_id uuid,
  feature_used text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT ai_usage_logs_pkey PRIMARY KEY (id),
  CONSTRAINT ai_usage_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT ai_usage_logs_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id)
);
```

#### `announcement_reads`
```sql
CREATE TABLE IF NOT EXISTS public.announcement_reads (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  user_id uuid,
  announcement_id uuid,
  read_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT announcement_reads_pkey PRIMARY KEY (id),
  CONSTRAINT announcement_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT announcement_reads_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES public.class_announcements(id)
);
```

#### `class_instructors`
```sql
CREATE TABLE IF NOT EXISTS public.class_instructors (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  class_id uuid,
  lecturer_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT class_instructors_pkey PRIMARY KEY (id),
  CONSTRAINT class_instructors_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_instructors_lecturer_id_fkey FOREIGN KEY (lecturer_id) REFERENCES public.users(id)
);
```

#### `departments`
```sql
CREATE TABLE IF NOT EXISTS public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  university_id uuid,
  name text NOT NULL,
  code text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT departments_pkey PRIMARY KEY (id),
  CONSTRAINT departments_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id)
);
```

#### `university_announcements`
```sql
CREATE TABLE IF NOT EXISTS public.university_announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  university_id uuid,
  title text NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  author_id uuid,
  CONSTRAINT university_announcements_pkey PRIMARY KEY (id),
  CONSTRAINT university_announcements_university_id_fkey FOREIGN KEY (university_id) REFERENCES public.universities(id),
  CONSTRAINT university_announcements_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.users(id)
);
```

#### `face_events`
```sql
CREATE TABLE IF NOT EXISTS public.face_events (
  id bigint NOT NULL DEFAULT nextval('face_events_id_seq'::regclass),
  user_id uuid NOT NULL,
  event_type character varying NOT NULL,
  face_state character varying,
  metadata jsonb,
  created_at timestamp without time zone DEFAULT now(),
  updated_at timestamp without time zone DEFAULT now(),
  CONSTRAINT face_events_pkey PRIMARY KEY (id),
  CONSTRAINT face_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create sequence if it doesn't exist
CREATE SEQUENCE IF NOT EXISTS face_events_id_seq;
```

#### `request_logs`
```sql
CREATE TABLE IF NOT EXISTS public.request_logs (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  endpoint text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT request_logs_pkey PRIMARY KEY (id),
  CONSTRAINT request_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
```

#### `supplementary_materials`
```sql
CREATE TABLE IF NOT EXISTS public.supplementary_materials (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  course_id uuid NOT NULL,
  title text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  CONSTRAINT supplementary_materials_pkey PRIMARY KEY (id),
  CONSTRAINT supplementary_materials_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id)
);

-- Optional: Migrate from materials table where category = 'supplementary'
-- INSERT INTO public.supplementary_materials (course_id, title, file_url, file_type, created_at)
-- SELECT course_id, title, file_url, file_type, created_at
-- FROM public.materials
-- WHERE category = 'supplementary';
```

---

## Phase 2: Fix Existing Table Structures

### 2.1 Fix `quizzes` Table (CRITICAL)

**Current Issue:** NEW schema has `quizzes` as attempts table, but code expects it as definitions table.

**Solution:** 
1. Rename current `quizzes` to `quiz_attempts` (if it has data)
2. Create new `quizzes` table with OLD structure
3. Migrate any attempt data

```sql
-- Step 1: Rename current quizzes if it has attempt data
ALTER TABLE public.quizzes RENAME TO quiz_attempts_old;

-- Step 2: Create proper quizzes table (definitions)
CREATE TABLE IF NOT EXISTS public.quizzes (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  course_id uuid,
  topic_id uuid,
  title text NOT NULL,
  topic text,
  difficulty text DEFAULT 'Medium'::text,
  CONSTRAINT quizzes_pkey PRIMARY KEY (id),
  CONSTRAINT quizzes_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT quizzes_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.course_topics(id)
);

-- Step 3: If you had quiz definitions elsewhere, migrate them
-- (This depends on your data structure)
```

### 2.2 Fix `quiz_results` Table

```sql
-- Add missing fields
ALTER TABLE public.quiz_results 
  ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  ADD COLUMN IF NOT EXISTS correct_answers integer,
  ADD COLUMN IF NOT EXISTS student_answers jsonb;

-- Migrate created_at to submitted_at if needed
UPDATE public.quiz_results 
SET submitted_at = created_at 
WHERE submitted_at IS NULL;

-- Extract correct_answers from metadata if it exists there
UPDATE public.quiz_results 
SET correct_answers = (metadata->>'correct_answers')::integer
WHERE correct_answers IS NULL AND metadata ? 'correct_answers';

-- Keep created_at for audit, but code will use submitted_at
```

### 2.3 Fix `class_enrollments` Table

```sql
-- Add has_paid field
ALTER TABLE public.class_enrollments 
  ADD COLUMN IF NOT EXISTS has_paid boolean DEFAULT false;

-- Migrate access_type to has_paid logic
-- If access_type is 'semester_bundle' or 'single_course', set has_paid = true
UPDATE public.class_enrollments 
SET has_paid = true 
WHERE access_type IN ('semester_bundle', 'single_course');

-- Remove role and access_type if they shouldn't be there (or keep if needed)
-- ALTER TABLE public.class_enrollments DROP COLUMN IF EXISTS role;
-- ALTER TABLE public.class_enrollments DROP COLUMN IF EXISTS access_type;
```

### 2.4 Fix `courses` Table

```sql
-- Add lecturer_id if it doesn't exist
ALTER TABLE public.courses 
  ADD COLUMN IF NOT EXISTS lecturer_id uuid;

-- Migrate from instructor_id if it exists
UPDATE public.courses 
SET lecturer_id = instructor_id 
WHERE lecturer_id IS NULL AND instructor_id IS NOT NULL;

-- Add foreign key
ALTER TABLE public.courses 
  ADD CONSTRAINT courses_lecturer_id_fkey 
  FOREIGN KEY (lecturer_id) REFERENCES public.users(id);

-- Remove instructor_id if it exists
ALTER TABLE public.courses DROP COLUMN IF EXISTS instructor_id;
```

### 2.5 Fix `course_topics` Table

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
```

### 2.6 Fix `chat_messages` Table

```sql
-- Add material_id and topic_id
ALTER TABLE public.chat_messages 
  ADD COLUMN IF NOT EXISTS material_id uuid,
  ADD COLUMN IF NOT EXISTS topic_id uuid;

-- Make material_id NOT NULL if needed (check your data first)
-- ALTER TABLE public.chat_messages ALTER COLUMN material_id SET NOT NULL;

-- Add foreign keys
ALTER TABLE public.chat_messages 
  ADD CONSTRAINT chat_messages_material_id_fkey 
  FOREIGN KEY (material_id) REFERENCES public.materials(id),
  ADD CONSTRAINT chat_messages_topic_id_fkey 
  FOREIGN KEY (topic_id) REFERENCES public.course_topics(id);

-- Migrate from session_id if you have that data
-- This depends on your chat_sessions structure
-- You might need to join chat_sessions to get material_id
UPDATE public.chat_messages cm
SET material_id = cs.material_id
FROM public.chat_sessions cs
WHERE cm.session_id = cs.id::text 
  AND cm.material_id IS NULL;

-- Remove session_id if chat_sessions handles that
-- ALTER TABLE public.chat_messages DROP COLUMN IF EXISTS session_id;
```

### 2.7 Fix `materials` Table

```sql
-- Ensure is_main_handout exists
ALTER TABLE public.materials 
  ADD COLUMN IF NOT EXISTS is_main_handout boolean DEFAULT false;

-- Migrate from category if needed
UPDATE public.materials 
SET is_main_handout = true 
WHERE category = 'handout' AND is_main_handout = false;

-- Remove category if you're using supplementary_materials table instead
-- ALTER TABLE public.materials DROP COLUMN IF EXISTS category;
```

### 2.8 Fix `questions` Table

```sql
-- Change options from text[] to jsonb if needed
-- First, check current type
-- If it's text[], convert to jsonb
ALTER TABLE public.questions 
  ALTER COLUMN options TYPE jsonb 
  USING options::text::jsonb;

-- Or if it's already jsonb but stored differently, ensure it's array format
```

### 2.9 Fix `users` Table

```sql
-- Add missing fields
ALTER TABLE public.users 
  ADD COLUMN IF NOT EXISTS tier text DEFAULT 'starter'::text,
  ADD COLUMN IF NOT EXISTS ai_usage_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ta_invite_code text,
  ADD COLUMN IF NOT EXISTS course_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS streak_freezes integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS achievements jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS owned_frames text[] DEFAULT '{none}'::text[],
  ADD COLUMN IF NOT EXISTS student_id text;

-- Change last_activity_date from timestamp to date if needed
ALTER TABLE public.users 
  ALTER COLUMN last_activity_date TYPE date 
  USING last_activity_date::date;

-- Migrate student_id_code to student_id if needed
UPDATE public.users 
SET student_id = student_id_code 
WHERE student_id IS NULL AND student_id_code IS NOT NULL;
```

### 2.10 Fix `achievements` Table

```sql
-- Add missing fields
ALTER TABLE public.achievements 
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS icon_name text,
  ADD COLUMN IF NOT EXISTS category text;

-- Make code unique
CREATE UNIQUE INDEX IF NOT EXISTS achievements_code_key ON public.achievements(code);

-- Migrate icon to icon_name if needed
UPDATE public.achievements 
SET icon_name = icon 
WHERE icon_name IS NULL AND icon IS NOT NULL;
```

### 2.11 Fix `activity_logs` Table

```sql
-- Remove xp_earned and gems_earned if they exist (or keep if you want them)
-- ALTER TABLE public.activity_logs DROP COLUMN IF EXISTS xp_earned;
-- ALTER TABLE public.activity_logs DROP COLUMN IF EXISTS gems_earned;

-- Ensure metadata and score exist
ALTER TABLE public.activity_logs 
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS score integer DEFAULT 0;
```

### 2.12 Fix `shop_items` Table

```sql
-- Change type to category if needed
ALTER TABLE public.shop_items 
  RENAME COLUMN type TO category;

-- Or add category and migrate
-- ALTER TABLE public.shop_items ADD COLUMN IF NOT EXISTS category text;
-- UPDATE public.shop_items SET category = type WHERE category IS NULL;
```

### 2.13 Fix `student_course_access` Table

```sql
-- Ensure default values match OLD schema
ALTER TABLE public.student_course_access 
  ALTER COLUMN access_type SET DEFAULT 'full_semester'::text,
  ALTER COLUMN expires_at SET DEFAULT (now() + '6 mons'::interval);

-- Remove payment fields if not needed (or keep if you want them)
-- ALTER TABLE public.student_course_access DROP COLUMN IF EXISTS payment_reference;
-- ALTER TABLE public.student_course_access DROP COLUMN IF EXISTS amount_paid;
```

---

## Phase 3: Remove Duplicate Tables

### 3.1 Remove `course_access` (Use `student_course_access`)

```sql
-- First, migrate any data if needed
INSERT INTO public.student_course_access (student_id, course_id, class_id, access_type, expires_at, created_at)
SELECT student_id, course_id, class_id, access_type, expires_at, created_at
FROM public.course_access
ON CONFLICT DO NOTHING;

-- Then drop the duplicate table
DROP TABLE IF EXISTS public.course_access;
```

### 3.2 Remove `xp_rates` (Use `xp_config`)

```sql
-- Data should already be migrated in Phase 1.1
DROP TABLE IF EXISTS public.xp_rates;
```

### 3.3 Handle `enrollments` vs `class_enrollments`

**Decision needed:** 
- If `enrollments` is for course progress tracking, keep it
- If it's duplicate of `class_enrollments`, remove it

```sql
-- Option A: Keep enrollments for course progress
-- (No action needed)

-- Option B: Remove if duplicate
-- DROP TABLE IF EXISTS public.enrollments;
```

### 3.4 Handle `daily_quizzes`

**Decision needed:**
- If `daily_quizzes` is a separate feature, keep it
- If it should be part of quiz system, migrate to `quiz_results`

```sql
-- Option A: Keep as separate feature
-- (No action needed)

-- Option B: Migrate to quiz_results if it's the same
-- INSERT INTO public.quiz_results (student_id, score, total_questions, submitted_at, metadata)
-- SELECT user_id, score, total_questions, completed_at, 
--   jsonb_build_object('topics_covered', topics_covered, 'duration_seconds', duration_seconds, 'round', metadata->>'round')
-- FROM public.daily_quizzes
-- ON CONFLICT DO NOTHING;
```

---

## Phase 4: Create Missing Indexes

```sql
-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_material_id ON public.chat_sessions(material_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_material_id ON public.chat_messages(material_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_topic_id ON public.chat_messages(topic_id);
CREATE INDEX IF NOT EXISTS idx_questions_quiz_id ON public.questions(quiz_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_student_id ON public.quiz_results(student_id);
CREATE INDEX IF NOT EXISTS idx_quiz_results_quiz_id ON public.quiz_results(quiz_id);
CREATE INDEX IF NOT EXISTS idx_course_topics_material_id ON public.course_topics(material_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_student_id ON public.class_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_class_enrollments_class_id ON public.class_enrollments(class_id);
```

---

## Phase 5: Data Validation Queries

Run these to verify migration:

```sql
-- Check quizzes structure
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quizzes' 
ORDER BY ordinal_position;

-- Check quiz_results has correct fields
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'quiz_results' 
ORDER BY ordinal_position;

-- Check class_enrollments has has_paid
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'class_enrollments' 
ORDER BY ordinal_position;

-- Check courses has lecturer_id
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'courses' 
ORDER BY ordinal_position;

-- Check all required tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN (
    'app_config', 'xp_config', 'xp_history', 'ai_usage_logs',
    'announcement_reads', 'class_instructors', 'departments',
    'university_announcements', 'face_events', 'request_logs',
    'supplementary_materials', 'chat_sessions', 'questions',
    'class_announcements'
  )
ORDER BY table_name;
```

---

## Phase 6: Update Code (After Schema Migration)

### 6.1 Update Service Files

1. **`quiz.service.ts`** - Should now work with restored `quizzes` table
2. **`billing.service.ts`** - Use `has_paid` instead of `access_type` checks
3. **`chat.service.ts`** - Should work with `chat_sessions` and `chat_messages.material_id`
4. **`course.service.ts`** - Should work with `class_announcements`
5. **`gamification.service.ts`** - Use `xp_config` instead of `xp_rates`

### 6.2 Update API Routes

1. **`submit-quiz/route.ts`** - Use `submitted_at` and `correct_answers`
2. **`daily-quiz/start/route.ts`** - Keep using `daily_quizzes` if it's separate feature
3. **Payment routes** - Use `has_paid` in `class_enrollments`

### 6.3 Update Type Definitions

Update `src/types/index.ts` to match OLD schema structure.

---

## Rollback Plan

If something goes wrong:

1. **Database Rollback:**
   ```sql
   -- Restore from backup
   -- Or reverse migrations in reverse order
   ```

2. **Code Rollback:**
   - Use Git to revert code changes
   - Tag current version before migration

---

## Testing Checklist

After migration:

- [ ] Test quiz creation and taking
- [ ] Test chat functionality
- [ ] Test class enrollment and access
- [ ] Test payment flows
- [ ] Test course materials access
- [ ] Test announcements
- [ ] Test gamification (XP, achievements)
- [ ] Test offline sync
- [ ] Verify all API routes work
- [ ] Check for any TypeScript errors

---

## Estimated Time

- **Phase 1 (Missing Tables):** 1-2 hours
- **Phase 2 (Fix Structures):** 3-4 hours
- **Phase 3 (Remove Duplicates):** 30 minutes
- **Phase 4 (Indexes):** 15 minutes
- **Phase 5 (Validation):** 30 minutes
- **Phase 6 (Code Updates):** 2-3 hours
- **Testing:** 2-3 hours

**Total: 9-13 hours**

---

## Notes

- Test each phase before proceeding
- Keep backups at each phase
- Some data migrations may need custom logic based on your actual data
- Review each ALTER TABLE statement before running
- Consider downtime for production migrations

