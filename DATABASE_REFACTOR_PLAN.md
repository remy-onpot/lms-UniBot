# Database Refactor Plan

## Executive Summary
This document outlines a comprehensive refactor plan to align the application codebase with the new database schema. The refactor addresses table structure changes, missing tables, field name mismatches, and foreign key reference updates.

---

## Phase 1: Critical Missing Tables Analysis

### 1.1 Tables Referenced in Code but Missing from Schema

#### ❌ `chat_sessions` (CRITICAL)
**Status:** Referenced extensively but not in schema
**Impact:** Chat functionality completely broken
**Files Affected:**
- `src/lib/services/chat.service.ts` (all methods)
- `src/hooks/useAIChat.ts`
- `src/components/features/chat/ChatWindow.tsx`

**Solution Options:**
- **Option A (Recommended):** Create `chat_sessions` table in database
- **Option B:** Refactor to use `chat_messages` only (session_id as text, no separate table)

**Recommended Schema:**
```sql
CREATE TABLE public.chat_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL DEFAULT 'New Chat',
  material_id uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT chat_sessions_pkey PRIMARY KEY (id),
  CONSTRAINT chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT chat_sessions_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id)
);
```

#### ❌ `questions` (CRITICAL)
**Status:** Referenced extensively but not in schema
**Impact:** Quiz functionality completely broken
**Files Affected:**
- `src/app/api/submit-quiz/route.ts`
- `src/lib/services/quiz.service.ts`
- `src/app/dashboard/quiz/[quizId]/page.tsx`
- `src/components/features/course/modals/AIQuizModal.tsx`
- `src/components/features/course/modals/ManualQuizModal.tsx`

**Solution:** Create `questions` table
**Recommended Schema:**
```sql
CREATE TABLE public.questions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL,
  question_text text NOT NULL,
  options text[] NOT NULL,
  correct_answer text NOT NULL,
  explanation text,
  type text DEFAULT 'multiple_choice' CHECK (type = ANY (ARRAY['multiple_choice'::text, 'true_false'::text])),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT questions_pkey PRIMARY KEY (id),
  CONSTRAINT questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.quizzes(id) ON DELETE CASCADE
);
```

#### ❌ `class_announcements` (HIGH)
**Status:** Referenced but not in schema
**Impact:** Announcement feature broken
**Files Affected:**
- `src/lib/services/course.service.ts`
- `src/components/features/course/modals/AnnouncementModal.tsx`
- `src/components/providers/SyncProvider.tsx`

**Solution:** Create `class_announcements` table
**Recommended Schema:**
```sql
CREATE TABLE public.class_announcements (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  class_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT class_announcements_pkey PRIMARY KEY (id),
  CONSTRAINT class_announcements_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id),
  CONSTRAINT class_announcements_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
```

#### ❌ `notifications` (MEDIUM)
**Status:** Referenced but not in schema
**Impact:** Notification feature broken
**Files Affected:**
- `src/lib/services/notification.service.ts`

**Solution:** Create `notifications` table
**Recommended Schema:**
```sql
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  type text DEFAULT 'info' CHECK (type = ANY (ARRAY['info'::text, 'success'::text, 'warning'::text, 'error'::text])),
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
```

#### ❌ `user_progress` (LOW)
**Status:** Referenced in SyncProvider but not in schema
**Impact:** Offline progress tracking broken
**Files Affected:**
- `src/components/providers/SyncProvider.tsx`

**Solution:** Create `user_progress` table or remove feature
**Recommended Schema:**
```sql
CREATE TABLE public.user_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic_id uuid,
  material_id uuid,
  completed boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_progress_pkey PRIMARY KEY (id),
  CONSTRAINT user_progress_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT user_progress_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.course_topics(id),
  CONSTRAINT user_progress_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id)
);
```

---

## Phase 2: Table Structure Mismatches

### 2.1 `quizzes` Table - MAJOR RESTRUCTURE REQUIRED

**Current Code Assumptions:**
- `quizzes` has: `id`, `course_id`, `topic_id`, `title`, `topic`
- Links to `courses` via `course_id`

**New Schema Reality:**
- `quizzes` has: `id`, `user_id`, `score`, `total_questions`, `started_at`, `completed_at`, `duration_seconds`, `topics_covered`, `metadata`, `created_at`
- This looks like a **quiz results/attempts table**, not a quiz definition table!

**Analysis:**
The new schema's `quizzes` table appears to be for storing quiz attempts/results, not quiz definitions. This is a fundamental architectural mismatch.

**Solution Options:**
1. **Option A (Recommended):** Rename new `quizzes` to `quiz_attempts` and create proper `quizzes` table
2. **Option B:** Create new table `quiz_definitions` and keep `quizzes` as attempts
3. **Option C:** Completely refactor to use `quizzes` as attempts only (major breaking change)

**Recommended Approach:**
Create a proper `quizzes` definition table:
```sql
CREATE TABLE public.quiz_definitions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL,
  topic_id uuid,
  title text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT quiz_definitions_pkey PRIMARY KEY (id),
  CONSTRAINT quiz_definitions_course_id_fkey FOREIGN KEY (course_id) REFERENCES public.courses(id),
  CONSTRAINT quiz_definitions_topic_id_fkey FOREIGN KEY (topic_id) REFERENCES public.course_topics(id),
  CONSTRAINT quiz_definitions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
```

Then rename current `quizzes` to `quiz_attempts` or keep both with different purposes.

**Files Requiring Refactor:**
- `src/lib/services/quiz.service.ts` (all methods)
- `src/app/api/submit-quiz/route.ts`
- `src/app/dashboard/quiz/[quizId]/page.tsx`
- `src/components/features/quiz/*.tsx`
- All quiz-related API routes

### 2.2 `quiz_history` → `daily_quizzes` Migration

**Current Code:**
- Uses `quiz_history` table with fields: `user_id`, `quiz_type`, `score`, `total_questions`, `started_at`, `completed_at`, `duration_seconds`, `topics_covered`, `metadata`

**New Schema:**
- `daily_quizzes` table with similar structure but no `quiz_type` field

**Solution:**
1. Update all references from `quiz_history` to `daily_quizzes`
2. Remove `quiz_type` filter (since `daily_quizzes` is specific to daily quizzes)
3. Update field mappings if needed

**Files to Update:**
- `src/app/api/daily-quiz/start/route.ts` (line 21)
- `src/lib/services/gamification.service.ts` (line 103)
- `src/app/dashboard/daily-quiz/results/page.tsx` (line 23)

### 2.3 `class_enrollments` Structure Changes

**Current Code Assumptions:**
- Has: `id`, `student_id`, `class_id`, `joined_at`, `has_paid`, `access_type`, `expires_at`
- Uses `has_paid` boolean field
- Uses `access_type` with values: `'semester_bundle'`, `'single_course'`

**New Schema Reality:**
- Has: `id`, `class_id`, `student_id`, `joined_at`, `role` (student/lecturer), `access_type` (trial/single_course/semester_bundle)
- No `has_paid` field
- `access_type` includes `'trial'` option

**Solution:**
1. Remove all `has_paid` references
2. Update `access_type` checks to include `'trial'`
3. Update enrollment creation logic to not set `has_paid`

**Files to Update:**
- `src/lib/services/billing.service.ts` (line 12-18)
- `src/lib/services/quiz.service.ts` (line 71-78)
- `src/app/api/payment/initialize/route.ts` (line 30-36, 154, 163)
- `src/app/api/payment/webhook/route.ts` (line 120-137)
- `src/app/dashboard/class/[classId]/students/page.tsx`
- `src/app/dashboard/lecturer-profile/records/page.tsx`

### 2.4 `courses` Table Changes

**Current Code:**
- Assumes `courses` links to `classes` via `class_id`
- May reference instructor via class lecturer

**New Schema:**
- Has `instructor_id` that references `auth.users(id)` directly
- Still has `class_id` for class relationship

**Solution:**
1. Update queries that need instructor info to use `instructor_id`
2. Ensure `instructor_id` is properly set when creating courses
3. Update foreign key references in code comments/types

**Files to Update:**
- `src/lib/services/course.service.ts` (create method)
- Any queries that join to get instructor information

### 2.5 `quiz_results` Field Mismatches

**Current Code:**
- Uses: `quiz_id`, `student_id`, `score`, `total_questions`, `correct_answers`, `submitted_at`

**New Schema:**
- Has: `id`, `student_id`, `score`, `total_questions`, `metadata`, `created_at`, `quiz_id`, `course_id`
- Missing `correct_answers` field
- Uses `created_at` instead of `submitted_at`

**Solution:**
1. Store `correct_answers` in `metadata` JSONB field
2. Update all references from `submitted_at` to `created_at`
3. Add `course_id` when creating quiz results

**Files to Update:**
- `src/app/api/submit-quiz/route.ts` (line 36-47)
- `src/lib/services/quiz.service.ts` (line 42-49)
- `src/app/dashboard/lecturer-profile/records/page.tsx` (line 134)

### 2.6 `enrollments` → `class_enrollments` + `student_course_access`

**Current Code:**
- Uses `enrollments` table with: `user_id`, `course_id`, `progress`, `enrolled_at`, `completed_at`

**New Schema:**
- No `enrollments` table
- Use `class_enrollments` for class membership
- Use `student_course_access` for course access
- Use `enrollments` table (wait, this exists in schema!)

**Re-check Schema:**
Looking at schema again, `enrollments` DOES exist:
```sql
CREATE TABLE public.enrollments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL,
  progress integer DEFAULT 0,
  enrolled_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone,
  ...
);
```

**Solution:**
- Keep using `enrollments` for course progress tracking
- Use `class_enrollments` for class membership
- Use `student_course_access` for payment-based access

**Files to Update:**
- `src/app/dashboard/page.tsx` (line 48) - Already uses `enrollments`, verify structure matches

---

## Phase 3: Field Name and Type Changes

### 3.1 Timestamp Field Standardization

**Issues:**
- Some tables use `created_at`, others use `submitted_at`, `enrolled_at`, etc.
- Mix of `timestamp with time zone` and `timestamp without time zone`

**Action Items:**
1. Standardize all timestamps to `timestamp with time zone`
2. Update code to use `created_at` consistently (or document which tables use which)
3. Update TypeScript types to reflect actual field names

### 3.2 Foreign Key Reference Updates

**Issues:**
- `courses.instructor_id` references `auth.users(id)` not `public.users(id)`
- Some tables reference `auth.users`, others `public.users`

**Solution:**
1. Update all queries that join on user IDs to use correct table
2. Ensure RLS policies account for `auth.users` vs `public.users`
3. Update TypeScript types to reflect correct relationships

**Files to Check:**
- All service files that join user data
- All API routes that query user information

### 3.3 Array and JSONB Field Handling

**Issues:**
- `interests` is `ARRAY` type (text[])
- `topics_covered` in `daily_quizzes` is `ARRAY` type
- Various `jsonb` fields need proper typing

**Solution:**
1. Ensure TypeScript types match actual database types
2. Update queries to handle arrays correctly
3. Add proper JSONB type definitions

---

## Phase 4: Implementation Plan

### Step 1: Create Missing Tables (Database Migration)
**Priority:** CRITICAL
**Estimated Time:** 2-4 hours

1. Create `chat_sessions` table
2. Create `questions` table
3. Create `class_announcements` table
4. Create `notifications` table
5. Create `user_progress` table (or remove feature)
6. Create `quiz_definitions` table (if going with Option A for quizzes)

**Migration Script Location:** `supabase/migrations/`

### Step 2: Fix Quiz System Architecture
**Priority:** CRITICAL
**Estimated Time:** 4-6 hours

1. Decide on quiz architecture (Option A, B, or C)
2. Create/rename quiz tables accordingly
3. Update all quiz-related service methods
4. Update all quiz API routes
5. Update all quiz UI components
6. Test quiz creation, taking, and grading

**Files:**
- `src/lib/services/quiz.service.ts` (complete rewrite)
- `src/app/api/submit-quiz/route.ts`
- `src/app/api/generate-quiz/route.ts`
- `src/app/dashboard/quiz/**/*.tsx`
- `src/components/features/quiz/*.tsx`

### Step 3: Update Daily Quiz System
**Priority:** HIGH
**Estimated Time:** 1-2 hours

1. Replace all `quiz_history` references with `daily_quizzes`
2. Remove `quiz_type` filters
3. Update field mappings
4. Test daily quiz flow

**Files:**
- `src/app/api/daily-quiz/start/route.ts`
- `src/lib/services/gamification.service.ts`
- `src/app/dashboard/daily-quiz/results/page.tsx`

### Step 4: Fix Class Enrollments
**Priority:** HIGH
**Estimated Time:** 2-3 hours

1. Remove all `has_paid` references
2. Update `access_type` logic to handle `'trial'`
3. Update enrollment creation/update logic
4. Test payment and enrollment flows

**Files:**
- `src/lib/services/billing.service.ts`
- `src/lib/services/quiz.service.ts` (checkAccess method)
- `src/app/api/payment/**/*.ts`
- `src/app/dashboard/class/**/*.tsx`

### Step 5: Fix Chat System
**Priority:** HIGH
**Estimated Time:** 2-3 hours

1. Create `chat_sessions` table (if not done in Step 1)
2. Update `ChatService` to use new table
3. Update `useAIChat` hook
4. Test chat creation, messaging, and history

**Files:**
- `src/lib/services/chat.service.ts`
- `src/hooks/useAIChat.ts`
- `src/components/features/chat/*.tsx`

### Step 6: Update Quiz Results
**Priority:** MEDIUM
**Estimated Time:** 1-2 hours

1. Store `correct_answers` in `metadata` JSONB
2. Update `submitted_at` → `created_at`
3. Add `course_id` to quiz result creation
4. Update all quiz result queries

**Files:**
- `src/app/api/submit-quiz/route.ts`
- `src/lib/services/quiz.service.ts`
- `src/app/dashboard/lecturer-profile/records/page.tsx`

### Step 7: Fix Announcements
**Priority:** MEDIUM
**Estimated Time:** 1 hour

1. Create `class_announcements` table (if not done in Step 1)
2. Update `CourseService.getAnnouncements`
3. Update announcement creation modals
4. Test announcement flow

**Files:**
- `src/lib/services/course.service.ts`
- `src/components/features/course/modals/AnnouncementModal.tsx`
- `src/components/providers/SyncProvider.tsx`

### Step 8: Fix Notifications
**Priority:** LOW
**Estimated Time:** 1 hour

1. Create `notifications` table (if not done in Step 1)
2. Update `NotificationService`
3. Test notification creation and retrieval

**Files:**
- `src/lib/services/notification.service.ts`

### Step 9: Update TypeScript Types
**Priority:** MEDIUM
**Estimated Time:** 2-3 hours

1. Update all type definitions in `src/types/index.ts`
2. Add types for new tables
3. Update field names in existing types
4. Fix all TypeScript errors

**Files:**
- `src/types/index.ts`
- All service files
- All component files using types

### Step 10: Testing & Validation
**Priority:** CRITICAL
**Estimated Time:** 4-6 hours

1. Test all CRUD operations for each table
2. Test payment and enrollment flows
3. Test quiz creation and taking
4. Test chat functionality
5. Test offline sync
6. Test all API routes
7. Fix any remaining bugs

---

## Phase 5: Code Refactoring Checklist

### Service Layer Updates
- [ ] `src/lib/services/class.service.ts` - Verify all queries match schema
- [ ] `src/lib/services/course.service.ts` - Fix announcements, verify structure
- [ ] `src/lib/services/assignment.service.ts` - Verify structure matches
- [ ] `src/lib/services/quiz.service.ts` - **MAJOR REWRITE** for new quiz architecture
- [ ] `src/lib/services/billing.service.ts` - Remove `has_paid`, fix `access_type`
- [ ] `src/lib/services/gamification.service.ts` - Fix `quiz_history` → `daily_quizzes`
- [ ] `src/lib/services/chat.service.ts` - **MAJOR UPDATE** for `chat_sessions`
- [ ] `src/lib/services/notification.service.ts` - Create notifications table support

### API Route Updates
- [ ] `src/app/api/submit-quiz/route.ts` - Fix quiz results structure
- [ ] `src/app/api/daily-quiz/start/route.ts` - Fix `quiz_history` → `daily_quizzes`
- [ ] `src/app/api/generate-quiz/route.ts` - Verify quiz creation
- [ ] `src/app/api/payment/initialize/route.ts` - Fix enrollment logic
- [ ] `src/app/api/payment/webhook/route.ts` - Fix enrollment creation
- [ ] `src/app/api/grade-assignment/route.ts` - Verify structure
- [ ] `src/app/api/chat/route.ts` - Verify chat session handling

### Component Updates
- [ ] `src/app/dashboard/quiz/**/*.tsx` - Update for new quiz structure
- [ ] `src/app/dashboard/daily-quiz/**/*.tsx` - Fix `quiz_history` references
- [ ] `src/components/features/quiz/*.tsx` - Verify quiz display logic
- [ ] `src/components/features/course/modals/*.tsx` - Fix quiz/question creation
- [ ] `src/hooks/useAIChat.ts` - Fix `chat_sessions` references
- [ ] `src/components/providers/SyncProvider.tsx` - Fix offline sync for new schema

### Type Definitions
- [ ] `src/types/index.ts` - Update all type definitions
- [ ] Add types for new tables
- [ ] Fix field name mismatches
- [ ] Update relationship types

---

## Phase 6: Risk Assessment

### High Risk Areas
1. **Quiz System** - Complete architectural change required
2. **Chat System** - Missing core table
3. **Payment/Enrollment** - Complex logic changes
4. **Daily Quiz** - Table name change affects multiple files

### Medium Risk Areas
1. **Announcements** - Missing table but simple to add
2. **Notifications** - Missing table but simple to add
3. **Type Definitions** - Many updates needed but straightforward

### Low Risk Areas
1. **User Progress** - Optional feature, can be removed if needed
2. **Minor field name changes** - Easy to fix with find/replace

---

## Phase 7: Rollback Plan

If issues arise during refactoring:

1. **Database Rollback:**
   - Keep migration scripts reversible
   - Document all schema changes
   - Have backup of current schema

2. **Code Rollback:**
   - Use Git branches for each phase
   - Tag stable versions before major changes
   - Keep old code commented for reference

3. **Testing Strategy:**
   - Test each phase independently
   - Don't proceed to next phase until current is stable
   - Have staging environment for testing

---

## Estimated Total Time

- **Phase 1 (Missing Tables):** 2-4 hours
- **Phase 2 (Quiz Architecture):** 4-6 hours
- **Phase 3 (Daily Quiz):** 1-2 hours
- **Phase 4 (Enrollments):** 2-3 hours
- **Phase 5 (Chat):** 2-3 hours
- **Phase 6 (Quiz Results):** 1-2 hours
- **Phase 7 (Announcements):** 1 hour
- **Phase 8 (Notifications):** 1 hour
- **Phase 9 (Types):** 2-3 hours
- **Phase 10 (Testing):** 4-6 hours

**Total Estimated Time: 20-32 hours**

---

## Next Steps

1. **Review this plan** with the team
2. **Decide on quiz architecture** (Option A, B, or C)
3. **Create database migration scripts** for missing tables
4. **Start with Phase 1** (Critical missing tables)
5. **Proceed phase by phase** with testing after each
6. **Document all changes** as you go

---

## Notes

- This plan assumes the new schema is final and correct
- Some decisions (like quiz architecture) need to be made before starting
- Consider creating a staging branch for this refactor
- Test thoroughly after each phase before proceeding
- Keep the old schema documentation for reference

