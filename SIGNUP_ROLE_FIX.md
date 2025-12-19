# Signup & Role Assignment Fix

## Issues Fixed

### 1. Role Not Being Set in Database
**Problem:** Signup was storing role in `auth.users.user_metadata` but not creating `public.users` record with the role.

**Solution:** Multiple fallback mechanisms:
- ✅ Database trigger (recommended) - `migrations/002_create_user_trigger.sql`
- ✅ Auth callback creates user record
- ✅ Dashboard page creates user record if missing
- ✅ Login page creates user record if missing
- ✅ Onboarding page creates user record if missing

### 2. Onboarding Not Triggering
**Problem:** Dashboard wasn't checking `onboarding_completed` and redirecting.

**Solution:**
- ✅ Dashboard page now checks `onboarding_completed` and redirects to `/onboarding`
- ✅ Onboarding page creates user record if missing

## Files Modified

### 1. `src/app/auth/callback/route.ts`
- Creates/updates `public.users` record after email confirmation
- Extracts role from `auth.users.user_metadata`
- Redirects to onboarding if not completed

### 2. `src/app/dashboard/page.tsx`
- Creates user record if it doesn't exist
- Checks `onboarding_completed` and redirects to `/onboarding` if false

### 3. `src/app/login/page.tsx`
- Creates user record on login if it doesn't exist
- Extracts role from auth metadata

### 4. `src/app/onboarding/page.tsx`
- Creates user record if it doesn't exist
- Handles missing profile gracefully

### 5. `src/app/api/auth/create-user/route.ts` (NEW)
- API endpoint to create user record
- Can be called manually if needed

## Database Migration

### `migrations/002_create_user_trigger.sql` (NEW)
**Recommended:** Run this in Supabase SQL editor for automatic user creation.

This creates:
- `handle_new_user()` function - Creates user record on signup
- `on_auth_user_created` trigger - Fires when new user signs up
- `handle_user_metadata_update()` function - Updates role if changed
- `on_auth_user_metadata_updated` trigger - Fires when metadata changes

**Benefits:**
- Automatic - No code changes needed
- Reliable - Works even if code fails
- Secure - Uses SECURITY DEFINER for proper permissions

## How It Works Now

### Signup Flow:
1. User signs up → Role stored in `auth.users.user_metadata`
2. Email confirmation → Auth callback creates `public.users` record with role
3. First login → Dashboard checks onboarding, redirects if needed
4. Onboarding → User completes profile

### Fallback Mechanisms:
If trigger doesn't work:
- Auth callback creates user
- Dashboard creates user if missing
- Login creates user if missing
- Onboarding creates user if missing

## Testing Checklist

- [ ] Sign up as student → Role should be 'student'
- [ ] Sign up as lecturer → Role should be 'lecturer'
- [ ] Sign up as course rep → Role should be 'student', `is_course_rep` should be true
- [ ] After signup → Should redirect to onboarding
- [ ] After onboarding → Should redirect to dashboard
- [ ] Login after signup → Should create user record if missing
- [ ] Dashboard access → Should redirect to onboarding if not completed

## Next Steps

1. **Run the database trigger migration** (recommended):
   ```sql
   -- Run migrations/002_create_user_trigger.sql in Supabase SQL editor
   ```

2. **Test signup flow:**
   - Sign up as student
   - Sign up as lecturer
   - Sign up as course rep
   - Verify roles are set correctly
   - Verify onboarding triggers

3. **If trigger doesn't work:**
   - The code-based fallbacks will handle it
   - Check RLS policies allow user to insert their own record
   - Check that `user_role` enum type exists in database

## Troubleshooting

### User record not created:
- Check RLS policies on `public.users` table
- Check if `user_role` enum type exists
- Check database logs for errors
- Verify trigger is installed: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`

### Role always 'student':
- Check `auth.users.user_metadata` has `requested_role` or `role`
- Check trigger function is extracting role correctly
- Check enum type matches: `SELECT unnest(enum_range(NULL::user_role));`

### Onboarding not triggering:
- Check `onboarding_completed` field exists
- Check dashboard page redirect logic
- Check middleware isn't blocking redirect

