# Troubleshooting Guide

## Issue: `ta_invite_code` Column Error

**Error Message:**
```
Could not find the 'ta_invite_code' column of 'users' in the schema cache
```

**Solution:**
This error occurs because PostgREST (Supabase's API layer) has a cached schema that still references the `ta_invite_code` column. Even though we've removed all code references, the cache needs to be refreshed.

### Steps to Fix:

1. **Restart your Next.js dev server:**
   ```bash
   # Stop the server (Ctrl+C) and restart
   npm run dev
   # or
   pnpm dev
   ```

2. **Clear Supabase PostgREST schema cache:**
   - Go to your Supabase Dashboard
   - Navigate to **Settings** → **API**
   - Click **"Reload Schema"** or **"Refresh Schema Cache"**
   - Alternatively, you can run this in SQL Editor:
     ```sql
     NOTIFY pgrst, 'reload schema';
     ```

3. **Verify the code is correct:**
   - All references to `ta_invite_code` have been removed from:
     - `src/app/auth/callback/route.ts`
     - `src/app/dashboard/page.tsx`
     - `src/app/onboarding/page.tsx`
     - `src/app/login/page.tsx`
     - `src/app/api/auth/create-user/route.ts`
     - `migrations/002_create_user_trigger.sql`

4. **If error persists:**
   - Check browser console for any cached requests
   - Hard refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear browser cache

## Issue: 403 Forbidden on User Insert

**Error Message:**
```
POST https://tfxdquzxgvpcvuttglwt.supabase.co/rest/v1/users 403 (Forbidden)
```

**Solution:**
This is an RLS (Row Level Security) policy issue. Run the migration:

```sql
-- Run migrations/003_rls_policies.sql in Supabase SQL Editor
```

This creates policies that allow:
- Users to insert their own record
- Users to read their own record  
- Users to update their own record

## Issue: Watchpack Errors

**Error Messages:**
```
Watchpack Error (initial scan): Error: EINVAL: invalid argument, lstat 'C:\DumpStack.log.tmp'
Watchpack Error (initial scan): Error: EINVAL: invalid argument, lstat 'C:\hiberfil.sys'
```

**Solution:**
These are harmless warnings about Windows system files. They can be safely ignored. If they're annoying, you can add these files to your `.gitignore` or Next.js ignore patterns, but they don't affect functionality.

## Issue: Fetch Failed Errors

**Error Message:**
```
Error: fetch failed
GET /login?next=%2Fdashboard 500 in 3.3min
```

**Solution:**
This usually indicates:
1. Network connectivity issues
2. Supabase service temporarily unavailable
3. Timeout issues

**Steps:**
1. Check your internet connection
2. Verify Supabase is up: https://status.supabase.com
3. Check your `.env.local` file has correct Supabase credentials
4. Try again after a few minutes

## Quick Fix Checklist

- [ ] Restarted Next.js dev server
- [ ] Cleared PostgREST schema cache in Supabase
- [ ] Ran `migrations/003_rls_policies.sql`
- [ ] Hard refreshed browser
- [ ] Verified `.env.local` has correct Supabase credentials
- [ ] Checked Supabase status page












