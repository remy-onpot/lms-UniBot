# Database Refactor - Quick Reference Guide

## 🚨 Critical Issues (Fix First)

### 1. Missing Tables (Must Create)
- ✅ `chat_sessions` - Chat functionality broken
- ✅ `questions` - Quiz functionality broken  
- ✅ `class_announcements` - Announcements broken
- ✅ `notifications` - Notifications broken
- ⚠️ `user_progress` - Optional, can remove if not needed

### 2. Table Name Changes
- `quiz_history` → `daily_quizzes` (remove `quiz_type` filter)

### 3. Major Architecture Issue
- **`quizzes` table** - Current schema shows it as quiz attempts/results, not quiz definitions
- **Decision needed:** Create `quiz_definitions` table or refactor entire quiz system

## 📋 Field Changes Checklist

### `class_enrollments`
- ❌ Remove: `has_paid` field (doesn't exist in new schema)
- ✅ Update: `access_type` now includes `'trial'` option
- ✅ Keep: `id`, `student_id`, `class_id`, `joined_at`, `role`, `access_type`, `expires_at`

### `quiz_results`
- ❌ Remove: `correct_answers` field (store in `metadata` JSONB instead)
- ❌ Change: `submitted_at` → `created_at`
- ✅ Add: `course_id` when creating results

### `courses`
- ✅ New: `instructor_id` references `auth.users(id)` (not `public.users`)

## 🔄 Quick Find & Replace Guide

### Replace `quiz_history` with `daily_quizzes`
```bash
# Files to update:
- src/app/api/daily-quiz/start/route.ts
- src/lib/services/gamification.service.ts
- src/app/dashboard/daily-quiz/results/page.tsx
```

### Remove `has_paid` references
```bash
# Files to update:
- src/lib/services/billing.service.ts
- src/lib/services/quiz.service.ts
- src/app/api/payment/initialize/route.ts
- src/app/api/payment/webhook/route.ts
```

### Update `submitted_at` → `created_at` in quiz_results
```bash
# Files to update:
- src/app/api/submit-quiz/route.ts
- src/lib/services/quiz.service.ts
```

## 📝 Migration Script Template

```sql
-- Example: Create chat_sessions table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
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

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_material_id ON public.chat_sessions(material_id);
```

## 🎯 Priority Order

1. **Create missing tables** (chat_sessions, questions, class_announcements)
2. **Fix quiz architecture** (decide on approach, create quiz_definitions if needed)
3. **Update daily quiz** (quiz_history → daily_quizzes)
4. **Fix enrollments** (remove has_paid, update access_type)
5. **Update types** (TypeScript definitions)
6. **Test everything**

## ⚠️ Breaking Changes

- Quiz system will need significant refactoring
- Chat system requires new table
- Payment/enrollment logic needs updates
- Some API responses may change structure

## 📚 Related Files

- Full plan: `DATABASE_REFACTOR_PLAN.md`
- Schema reference: See user's provided schema
- Service files: `src/lib/services/*.ts`
- API routes: `src/app/api/**/*.ts`

