# Schema Comparison: OLD (Code Expects) vs NEW (Current Database)

## Tables Present in OLD but Missing/Changed in NEW

### ✅ Tables That Exist in Both (Need Field Comparison)
- `achievements` - Structure differs
- `activity_logs` - Structure differs  
- `assignment_submissions` - Structure differs
- `assignments` - Structure differs
- `chat_messages` - Structure differs
- `chat_sessions` - ✅ EXISTS in OLD, missing in NEW
- `class_announcements` - ✅ EXISTS in OLD, missing in NEW
- `class_enrollments` - Structure differs
- `classes` - Structure differs
- `course_topics` - Structure differs
- `courses` - Structure differs
- `interest_topics` - Structure differs
- `materials` - Structure differs
- `questions` - ✅ EXISTS in OLD, missing in NEW
- `quiz_results` - Structure differs
- `quizzes` - ✅ EXISTS in OLD, COMPLETELY DIFFERENT in NEW
- `shop_items` - Structure differs
- `student_course_access` - Structure differs
- `transactions` - Structure differs
- `universities` - Structure differs
- `user_achievements` - Structure differs
- `users` - Structure differs

### ❌ Tables in OLD but Missing in NEW
- `ai_usage_logs`
- `announcement_reads`
- `app_config`
- `class_instructors`
- `departments`
- `face_events`
- `request_logs`
- `supplementary_materials`
- `university_announcements`
- `xp_config`
- `xp_history`

### ❌ Tables in NEW but Not in OLD
- `course_access` (seems like duplicate of `student_course_access`)
- `daily_quizzes` (replaces `quiz_history` concept)
- `document_sections`
- `enrollments` (might be duplicate)
- `xp_rates` (similar to `xp_config`)

## Critical Field Differences

### `quizzes` Table - MAJOR DIFFERENCE
**OLD Schema (What Code Expects):**
```sql
- id, created_at
- course_id, topic_id
- title, topic, difficulty
```

**NEW Schema (Current):**
```sql
- id, user_id, score, total_questions
- started_at, completed_at, duration_seconds
- topics_covered, metadata, created_at
```

**Issue:** NEW schema's `quizzes` is actually a quiz attempts/results table, not quiz definitions!

### `quiz_results` Table
**OLD Schema:**
```sql
- submitted_at (not created_at)
- correct_answers (field exists)
- student_answers (jsonb)
```

**NEW Schema:**
```sql
- created_at (not submitted_at)
- metadata (jsonb) - correct_answers might be here
- course_id (new field)
```

### `class_enrollments` Table
**OLD Schema:**
```sql
- has_paid (boolean) ✅
- joined_at
- class_id, student_id
```

**NEW Schema:**
```sql
- role (student/lecturer) - NEW
- access_type (trial/single_course/semester_bundle) - NEW
- NO has_paid field ❌
```

### `courses` Table
**OLD Schema:**
```sql
- lecturer_id (references public.users)
```

**NEW Schema:**
```sql
- instructor_id (references auth.users) ❌
```

### `materials` Table
**OLD Schema:**
```sql
- is_main_handout (boolean)
- NO category field
```

**NEW Schema:**
```sql
- category (handout/supplementary/recording)
- is_main_handout (boolean) ✅
```

### `course_topics` Table
**OLD Schema:**
```sql
- material_id (references materials)
- start_page, end_page (integers)
- learning_objectives (array)
```

**NEW Schema:**
```sql
- NO material_id ❌
- NO start_page, end_page ❌
- NO learning_objectives ❌
```

### `questions` Table
**OLD Schema:**
```sql
- options (jsonb) - array stored as JSONB
```

**NEW Schema:**
```sql
- options (text[]) - array type
```

### `chat_messages` Table
**OLD Schema:**
```sql
- material_id (required, NOT NULL)
- topic_id (optional)
- NO session_id ❌
```

**NEW Schema:**
```sql
- session_id (text, required)
- user_id (optional)
- NO material_id ❌
- NO topic_id ❌
```

### `activity_logs` Table
**OLD Schema:**
```sql
- metadata (jsonb)
- score (integer)
- NO xp_earned, gems_earned ❌
```

**NEW Schema:**
```sql
- xp_earned, gems_earned (integers)
- metadata (jsonb) ✅
- score (integer) ✅
```

### `users` Table
**OLD Schema:**
```sql
- tier (text) - separate from plan_tier
- ai_usage_count
- ta_invite_code
- course_count
- streak_freezes
- last_activity_date (date, not timestamp)
- achievements (jsonb array)
- owned_frames (array)
- student_id (text)
```

**NEW Schema:**
```sql
- plan_tier (enum)
- NO tier ❌
- NO ai_usage_count ❌
- NO ta_invite_code ❌
- NO course_count ❌
- NO streak_freezes ❌
- last_activity_date (timestamp)
- NO achievements field ❌
- NO owned_frames ❌
- student_id_code (text) - different name
```

### `achievements` Table
**OLD Schema:**
```sql
- code (text, unique)
- name, description
- icon_name
- category
- criteria (jsonb)
- xp_reward
```

**NEW Schema:**
```sql
- name (text, unique) - NO code ❌
- description
- icon (text) - different name
- NO category ❌
- criteria (jsonb) ✅
- xp_reward ✅
```

### `shop_items` Table
**OLD Schema:**
```sql
- category (frame/badge/theme)
```

**NEW Schema:**
```sql
- type (frame/accessory/theme/badge)
```

### `student_course_access` Table
**OLD Schema:**
```sql
- access_type (default 'full_semester')
- expires_at (default now() + 6 months)
- class_id
```

**NEW Schema:**
```sql
- access_type (single_course/semester_bundle)
- expires_at (timestamp)
- class_id ✅
- payment_reference, amount_paid (NEW)
```

## Missing Tables Analysis

### High Priority (Used in Code)
1. **`app_config`** - Used in `src/lib/config-service.ts`
2. **`supplementary_materials`** - Might be merged into `materials` with category
3. **`xp_config`** - Used for XP calculation
4. **`xp_history`** - Used for XP tracking

### Medium Priority (Feature Support)
5. **`ai_usage_logs`** - Analytics
6. **`announcement_reads`** - Read tracking
7. **`class_instructors`** - Multi-instructor support
8. **`departments`** - Organization
9. **`university_announcements`** - University-level announcements
10. **`face_events`** - Face detection (if used)
11. **`request_logs`** - API logging

## Duplication Issues to Fix

### 1. `course_access` vs `student_course_access`
- **NEW has both:** `course_access` and `student_course_access`
- **OLD has only:** `student_course_access`
- **Action:** Remove `course_access`, use only `student_course_access`

### 2. `enrollments` vs `class_enrollments`
- **NEW has both:** `enrollments` and `class_enrollments`
- **OLD has only:** `class_enrollments` (for class membership)
- **Note:** OLD might use `enrollments` for course progress (check code)
- **Action:** Determine if `enrollments` is needed for course progress tracking

### 3. `xp_rates` vs `xp_config`
- **NEW has:** `xp_rates`
- **OLD has:** `xp_config`
- **Action:** Use `xp_config` (more detailed), remove `xp_rates`

### 4. `daily_quizzes` vs Quiz System
- **NEW has:** `daily_quizzes` (quiz attempts)
- **OLD has:** `quizzes` (definitions) + `quiz_results` (attempts)
- **Action:** Keep OLD structure, `daily_quizzes` might be for a different feature

## Migration Strategy

### Phase 1: Restore Missing Tables
Create tables that exist in OLD but not in NEW:
- `app_config`
- `supplementary_materials` (or merge into materials)
- `xp_config`
- `xp_history`
- `ai_usage_logs`
- `announcement_reads`
- `class_instructors`
- `departments`
- `university_announcements`
- `face_events`
- `request_logs`

### Phase 2: Fix Table Structures
Update existing tables to match OLD schema:
- `quizzes` - Restore as definitions table
- `quiz_results` - Fix field names
- `class_enrollments` - Add `has_paid`
- `courses` - Change `instructor_id` to `lecturer_id`
- `course_topics` - Add `material_id`, `start_page`, `end_page`, `learning_objectives`
- `chat_messages` - Add `material_id`, `topic_id`, remove `session_id` dependency
- `materials` - Ensure `is_main_handout` exists
- `users` - Add missing fields
- `achievements` - Add `code`, `icon_name`, `category`
- `activity_logs` - Remove `xp_earned`, `gems_earned` (or keep if needed)

### Phase 3: Remove Duplicate Tables
- Remove `course_access` (use `student_course_access`)
- Remove `xp_rates` (use `xp_config`)
- Decide on `enrollments` vs `class_enrollments`

### Phase 4: Data Migration
- Migrate data from NEW structure to OLD structure
- Handle field name changes
- Handle data type conversions

