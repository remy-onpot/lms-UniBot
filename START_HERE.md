# 🚀 Start Here - Core Flow Migration

## What We've Done

I've analyzed your codebase and created a **prioritized migration plan** to restore the OLD schema structure that your code expects. The focus is on getting the **core flow working first**: Dashboard → Class → Course → Topics → Chat/Quizzes.

## 📋 What You Need to Do

### Step 1: Run the Migration Script

I've created a ready-to-run SQL migration script:

**File:** `migrations/001_core_flow_fix.sql`

**How to run:**
1. Open your Supabase dashboard
2. Go to SQL Editor
3. Copy and paste the entire contents of `migrations/001_core_flow_fix.sql`
4. Run it

**OR** if you use a migration tool:
```bash
# Run the migration
psql -h your-db-host -U your-user -d your-db -f migrations/001_core_flow_fix.sql
```

### Step 2: Verify the Migration

After running the script, verify these critical changes:

```sql
-- 1. Check quizzes table is now definitions (not attempts)
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'quizzes';
-- Should see: course_id, topic_id, title, topic, difficulty
-- Should NOT see: user_id, score, started_at

-- 2. Check courses has lecturer_id
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'courses' AND column_name = 'lecturer_id';
-- Should return lecturer_id

-- 3. Check class_enrollments has has_paid
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'class_enrollments' AND column_name = 'has_paid';
-- Should return has_paid

-- 4. Check questions table exists
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'questions';
-- Should return 1

-- 5. Check chat_sessions exists
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'chat_sessions';
-- Should return 1
```

### Step 3: Test the Core Flow

After migration, test this flow:

1. **Dashboard**
   - [ ] Login as course rep
   - [ ] See dashboard loads without errors

2. **Class Creation**
   - [ ] Course rep can create a cohort class
   - [ ] Lecturer can create a SaaS class
   - [ ] Class appears on dashboard

3. **Course Creation**
   - [ ] Lecturer can create a course in a class
   - [ ] Course appears in class view

4. **Topic Creation**
   - [ ] Lecturer can create topics with week_number
   - [ ] Topic can link to material

5. **Quiz Creation**
   - [ ] Lecturer can create quiz for topic
   - [ ] Lecturer can add questions to quiz

6. **Student Flow**
   - [ ] Student can join class with access code
   - [ ] Student can see courses
   - [ ] Student can see topics
   - [ ] Student can take quiz
   - [ ] Student can chat about materials

## 📚 Documentation Files

I've created several documents to help you:

1. **`PHASE1_PRIORITIZED_MIGRATION.md`** ⭐ **START HERE**
   - Detailed step-by-step migration plan
   - Focused on core flow
   - Includes testing checklist

2. **`migrations/001_core_flow_fix.sql`** ⭐ **RUN THIS**
   - Ready-to-run SQL migration script
   - Safe (uses IF NOT EXISTS, checks before altering)
   - Includes verification queries

3. **`MIGRATION_QUICK_REFERENCE.md`**
   - Quick lookup guide
   - Key differences summary
   - Critical SQL snippets

4. **`SCHEMA_COMPARISON.md`**
   - Detailed comparison of OLD vs NEW schemas
   - Field-by-field differences
   - Missing tables analysis

5. **`MIGRATION_TO_OLD_SCHEMA.md`**
   - Complete migration plan (all phases)
   - Use after core flow works

## ⚠️ Important Notes

### Before Running Migration

1. **Backup your database!**
   ```sql
   -- In Supabase, use the backup feature or:
   pg_dump -h your-host -U your-user your-db > backup.sql
   ```

2. **The `quizzes` table will be backed up**
   - If your current `quizzes` table has the wrong structure (has `user_id`, `score`, etc.), it will be renamed to `quiz_attempts_backup`
   - You can restore it later if needed

3. **Test in staging first**
   - Don't run on production without testing
   - The script is safe (uses IF NOT EXISTS), but test first

### After Migration

1. **Update your code** (if needed)
   - Most code should work as-is since we're restoring the OLD schema
   - Check for any TypeScript errors
   - Test all flows

2. **Data Migration** (if needed)
   - If you had quiz definitions elsewhere, you may need to migrate them
   - If you had data in the old `quizzes` table, check `quiz_attempts_backup`

3. **Remove `instructor_id`** (after verifying)
   - The script adds `lecturer_id` but doesn't remove `instructor_id` (commented out for safety)
   - After verifying everything works, you can remove it:
   ```sql
   ALTER TABLE public.courses DROP COLUMN IF EXISTS instructor_id;
   ```

## 🐛 Troubleshooting

### If migration fails:

1. **Check error message** - The script uses transactions, so it should rollback on error
2. **Check if tables exist** - Some tables might already exist
3. **Check foreign keys** - Make sure referenced tables exist
4. **Check permissions** - Make sure you have ALTER TABLE permissions

### If code still doesn't work:

1. **Check TypeScript errors** - Run `npm run build` or `tsc --noEmit`
2. **Check console errors** - Look for database query errors
3. **Verify table structure** - Use the verification queries above
4. **Check RLS policies** - Make sure Row Level Security policies allow access

## 🎯 Next Steps (After Core Flow Works)

Once the core flow is working:

1. **Add remaining tables** (Phase 2)
   - `app_config`
   - `xp_config`, `xp_history`
   - `ai_usage_logs`
   - `announcement_reads`
   - `class_instructors`
   - `departments`
   - `university_announcements`
   - `face_events`
   - `request_logs`
   - `supplementary_materials`

2. **Fix remaining tables** (Phase 3)
   - `users` table (add missing fields)
   - `achievements` table
   - `activity_logs` table
   - `shop_items` table

3. **Remove duplicates** (Phase 4)
   - Remove `course_access` (use `student_course_access`)
   - Remove `xp_rates` (use `xp_config`)

See `MIGRATION_TO_OLD_SCHEMA.md` for the complete plan.

## 📞 Need Help?

If you encounter issues:

1. Check the error message
2. Review the relevant section in `PHASE1_PRIORITIZED_MIGRATION.md`
3. Check `SCHEMA_COMPARISON.md` for field differences
4. Verify your database structure matches what's expected

## ✅ Success Criteria

You'll know the migration worked when:

- ✅ Course rep can create a class
- ✅ Lecturer can create a course
- ✅ Lecturer can create topics with materials
- ✅ Lecturer can create quizzes with questions
- ✅ Student can join class and see content
- ✅ Student can take quizzes
- ✅ Student can chat about materials
- ✅ No TypeScript errors
- ✅ No database query errors in console

Good luck! 🚀

