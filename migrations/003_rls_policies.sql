-- Migration: RLS Policies for Users Table
-- Purpose: Allow authenticated users to insert, read, and update their own user record
-- Run this in your Supabase SQL editor

-- Enable RLS on users table (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can insert their own record" ON public.users;
DROP POLICY IF EXISTS "Users can read their own record" ON public.users;
DROP POLICY IF EXISTS "Users can update their own record" ON public.users;
DROP POLICY IF EXISTS "Users can read all users" ON public.users;

-- Policy: Allow users to insert their own record
CREATE POLICY "Users can insert their own record"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

-- Policy: Allow users to read their own record
CREATE POLICY "Users can read their own record"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Policy: Allow users to update their own record
CREATE POLICY "Users can update their own record"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Optional: Allow users to read other users' public info (for profiles, etc.)
-- Uncomment if you need this functionality
-- CREATE POLICY "Users can read all users"
-- ON public.users
-- FOR SELECT
-- TO authenticated
-- USING (true);

