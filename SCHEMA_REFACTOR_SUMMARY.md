# Database Schema Refactoring Summary

**Generated:** December 14, 2025  
**Status:** Ready for Review & Deployment

---

## 📋 Executive Summary

A comprehensive audit of the database schema and application code identified:
- **17 Critical Issues** requiring immediate attention
- **12 Performance Optimizations** recommended
- **8 Application Code Fixes** completed

All application code changes have been applied. Database migrations are staged in `migrations/004_schema_fixes.sql`.

---

## ✅ COMPLETED: Application Code Fixes

### 1. `src/types/index.ts`
| Change | Description |
|--------|-------------|
| `Achievement.title` → `Achievement.name` | Matches DB column |
| Added `Achievement.xp_reward` | Required for display |
| Added `Achievement.criteria` | Matches DB schema |
| `ShopItem.category` → `ShopItem.type` | Matches DB column |
| Added `ShopItem.metadata`, `ShopItem.is_active` | Matches DB schema |
| Removed `UserProfile.owned_frames` | Should be computed from `user_inventory` |
| Added `UserProfile.custom_university`, `department`, `student_id_code` | Matches DB schema |

### 2. `src/lib/services/transcript.service.ts`
| Change | Description |
|--------|-------------|
| Fixed `total_score` → `total_questions` | Correct column name |
| Fixed assignment query | Uses proper join through `assignments` table |

### 3. `src/lib/services/gamification.service.ts`
| Change | Description |
|--------|-------------|
| Re-export `Achievement` type | Components can import from this service |

### 4. `src/components/features/profile/AchievementsTab.tsx`
| Change | Description |
|--------|-------------|
| Fixed `ach.icon_name` → `ach.icon` | Matches DB column |

### 5. `src/components/features/profile/OverviewTab.tsx`
| Change | Description |
|--------|-------------|
| Fixed `ach.icon_name` → `ach.icon` | Matches DB column |

### 6. `src/app/dashboard/shop/page.tsx`
| Change | Description |
|--------|-------------|
| Removed `owned_frames` dependency | Now fetches from `user_inventory` table |
| Added `ownedItemIds` state | Tracks owned items properly |

---

## 🚨 PENDING: Database Migration

**File:** `migrations/004_schema_fixes.sql`

### Section A: Critical Fixes

| Issue | Fix | Status |
|-------|-----|--------|
| **A1: FK References** | Change 5 tables from `auth.users` to `public.users` FK | Ready |
| **A2: Missing FK** | Add `quiz_results.quiz_id` → `quizzes.id` FK | Ready |
| **A3: Access Tables** | Add missing columns to `class_enrollments` | Ready |
| **A6: Users Columns** | Add `phone_number`, `last_login_date` | Ready |

### Section B: Performance Optimizations

| Optimization | Tables Affected | Status |
|--------------|-----------------|--------|
| **B1: Indexes** | 13 new indexes across 8 tables | Ready |
| **B2: Cascading Deletes** | `materials`, `course_topics`, `assignments`, `quizzes`, `courses`, `assignment_submissions` | Ready |
| **B5: Helper Function** | `get_user_frames()` function | Ready |

---

## 📝 Migration Checklist

### Before Running Migration:

- [ ] Backup production database
- [ ] Test migration on staging environment
- [ ] Verify no active transactions during migration
- [ ] Inform team of potential 5-10 minute downtime

### Running the Migration:

```sql
-- Run in Supabase SQL Editor
\i migrations/004_schema_fixes.sql
```

### After Migration:

- [ ] Run verification queries (included in migration file)
- [ ] Test critical user flows:
  - [ ] User signup/login
  - [ ] Quiz submission and gradebook
  - [ ] Achievement unlock
  - [ ] Shop purchase
  - [ ] Class enrollment
- [ ] Monitor for errors in application logs
- [ ] Verify FK constraints are enforced

---

## ⚠️ Table Clarification: Access Control Model

### Tables to KEEP:

| Table | Purpose | Status |
|-------|---------|--------|
| `class_enrollments` | Tracks class membership (who joined via access code) | ✅ **Keep** |
| `student_course_access` | Tracks paid access (single course or semester bundle) | ✅ **Keep - Critical for monetization** |

### How they work together:

1. Student joins class via access code → `class_enrollments` record created (`has_paid = false`)
2. Student purchases access → `student_course_access` record created with:
   - `course_id` set for **single course** purchase
   - `class_id` set for **semester bundle** purchase (grants access to ALL courses)
3. Access checks query `student_course_access` to verify payment

### Tables to Deprecate (Optional - verify no data first):

```sql
-- Only drop if course_access has no unique data not in student_course_access
-- Check with: SELECT COUNT(*) FROM course_access;
DROP TABLE IF EXISTS public.course_access;

-- Backup tables can be dropped after verification
DROP TABLE IF EXISTS public.quizzes_backup_final;
DROP TABLE IF EXISTS public.quiz_attempts_backup;
```

### ❌ DO NOT DROP:
- `student_course_access` - This is your payment/access control table, actively used in 10+ locations

---

## 📊 Impact Analysis

### Low Risk Changes:
- Adding new indexes (non-blocking in PostgreSQL)
- Adding optional columns with defaults
- Creating helper functions

### Medium Risk Changes:
- Changing FK references (data must exist in target table)
- Adding cascade deletes (test carefully)

### High Risk Changes:
- Converting `session_id` from TEXT to UUID (migration A5 - **NOT INCLUDED** in current migration, requires manual data validation)

---

## 🔄 Deferred Changes

The following require additional planning:

### A4: Remove `instructor_id` from `courses`
- **Reason:** Need to verify all data migrated to `lecturer_id` first
- **Action:** Run verification query, then remove column manually

### A5: Fix `chat_messages.session_id` Type
- **Reason:** Requires data validation and potential cleanup
- **Action:** Analyze existing session_id values, clean invalid UUIDs, then migrate

---

## 📚 Reference: FK Relationship Diagram

```
auth.users (1)
     │
     ▼
public.users (1) ───────────────────────────────┐
     │                                          │
     ├─► activity_logs.user_id                  │
     ├─► class_enrollments.student_id           │
     ├─► quiz_results.student_id ◄──────────────┤
     ├─► user_achievements.user_id              │
     ├─► user_inventory.user_id                 │
     ├─► transactions.user_id                   │
     ├─► chat_sessions.user_id                  │
     └─► classes.lecturer_id                    │
              │                                 │
              ▼                                 │
         courses.class_id                       │
              │                                 │
              ├─► quizzes.course_id             │
              ├─► assignments.course_id         │
              ├─► materials.course_id           │
              └─► course_topics.course_id       │
                                                │
    quizzes.id ◄──────── quiz_results.quiz_id   │
         │               (NOW WITH FK) ─────────┘
         ▼
    questions.quiz_id
```

---

## ✉️ Questions?

Contact the database team before running migrations in production.
