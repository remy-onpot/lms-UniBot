-- Migration: Auto-create public.users record on auth.users signup
-- Purpose: Automatically create user record with correct role when user signs up
-- Run this in your Supabase SQL editor

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role text;
  is_rep boolean;
  full_name_val text;
BEGIN
  -- Get values from metadata
  user_role := COALESCE(
    NEW.raw_user_meta_data->>'requested_role',
    NEW.raw_user_meta_data->>'role',
    'student'
  );
  
  -- Convert 'ta' to 'student'
  IF user_role = 'ta' THEN
    user_role := 'student';
  END IF;
  
  is_rep := COALESCE(
    (NEW.raw_user_meta_data->>'is_course_rep')::boolean,
    false
  );
  
  full_name_val := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    SPLIT_PART(NEW.email, '@', 1),
    'User'
  );

  -- Insert into public.users (with enum cast)
  INSERT INTO public.users (
    id,
    email,
    full_name,
    role,
    is_course_rep,
    onboarding_completed
  ) VALUES (
    NEW.id,
    NEW.email,
    full_name_val,
    user_role::user_role, -- Cast to enum type
    is_rep,
    false
  )
  ON CONFLICT (id) DO UPDATE
  SET
    -- Only update if role is still default 'student' and we have a better role
    role = CASE 
      WHEN public.users.role::text = 'student' AND user_role != 'student' 
      THEN user_role::user_role
      ELSE public.users.role
    END,
    is_course_rep = COALESCE(public.users.is_course_rep, is_rep),
    full_name = COALESCE(public.users.full_name, full_name_val),
    email = COALESCE(public.users.email, NEW.email);
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the auth signup
  RAISE WARNING 'Error creating user record: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to call function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Also handle updates to user_metadata (in case role is set later)
CREATE OR REPLACE FUNCTION public.handle_user_metadata_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if role changed in metadata
  IF (OLD.raw_user_meta_data->>'role' IS DISTINCT FROM NEW.raw_user_meta_data->>'role') OR
     (OLD.raw_user_meta_data->>'requested_role' IS DISTINCT FROM NEW.raw_user_meta_data->>'requested_role') THEN
    
    DECLARE
      user_role text;
      is_rep boolean;
    BEGIN
      user_role := COALESCE(
        NEW.raw_user_meta_data->>'requested_role',
        NEW.raw_user_meta_data->>'role',
        'student'
      );
      
      IF user_role = 'ta' THEN
        user_role := 'student';
      END IF;
      
      is_rep := COALESCE(
        (NEW.raw_user_meta_data->>'is_course_rep')::boolean,
        false
      );

      -- Update public.users if role is still 'student' and we have a better role
      UPDATE public.users
      SET
        role = CASE 
          WHEN role::text = 'student' AND user_role != 'student' 
          THEN user_role::user_role
          ELSE role
        END,
        is_course_rep = COALESCE(is_course_rep, is_rep)
      WHERE id = NEW.id;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for metadata updates
DROP TRIGGER IF EXISTS on_auth_user_metadata_updated ON auth.users;
CREATE TRIGGER on_auth_user_metadata_updated
  AFTER UPDATE OF raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_metadata_update();

