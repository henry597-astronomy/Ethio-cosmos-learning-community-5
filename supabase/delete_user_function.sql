-- Create RPC function to delete a user entirely from the system
-- This function:
-- 1. Deletes the user from auth.users (cascades to profiles and related data)
-- 2. Can only be called by the super admin (henokgirma648@gmail.com)
-- 3. Prevents deletion of the super admin themselves

CREATE OR REPLACE FUNCTION public.delete_user(user_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_email TEXT;
  caller_email TEXT;
  result JSON;
BEGIN
  -- Get the caller's email
  caller_email := auth.jwt() ->> 'email';
  
  -- Only allow super admin to delete users
  IF caller_email != 'henokgirma648@gmail.com' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only the super admin can delete users'
    );
  END IF;
  
  -- Get the target user's email
  SELECT email INTO target_email FROM auth.users WHERE id = user_id;
  
  IF target_email IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;
  
  -- Prevent deletion of the super admin themselves
  IF target_email = 'henokgirma648@gmail.com' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Cannot delete the super admin account'
    );
  END IF;
  
  -- Delete the user from auth.users (cascades to profiles and all related data)
  DELETE FROM auth.users WHERE id = user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'User deleted successfully',
    'deleted_user_email', target_email
  );
  
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object(
    'success', false,
    'message', 'Error deleting user: ' || SQLERRM
  );
END;
$$;

-- Grant execute permission to authenticated users (RLS will enforce super admin check)
GRANT EXECUTE ON FUNCTION public.delete_user(UUID) TO authenticated;
