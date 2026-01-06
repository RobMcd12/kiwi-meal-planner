-- Migration 041: Allow Admins to Delete Feedback
-- Adds RLS policy for admin feedback deletion

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Admins can delete feedback" ON public.feedback;

-- Allow admins to delete any feedback
CREATE POLICY "Admins can delete feedback" ON public.feedback
  FOR DELETE USING (public.is_admin_user(auth.uid()));
