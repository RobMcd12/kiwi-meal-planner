-- Migration: Rate Limiting Infrastructure
-- Purpose: Add rate limiting table for distributed API rate limiting

-- Create rate limit logs table
CREATE TABLE IF NOT EXISTS public.rate_limit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_key TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ip_address TEXT,
  endpoint TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_key_created
  ON public.rate_limit_logs(rate_key, created_at DESC);

-- Create index for cleanup queries
CREATE INDEX IF NOT EXISTS idx_rate_limit_logs_created
  ON public.rate_limit_logs(created_at);

-- Enable RLS
ALTER TABLE public.rate_limit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limit logs (Edge Functions)
CREATE POLICY "Service role can manage rate limit logs"
  ON public.rate_limit_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Create function to clean up old rate limit logs (older than 1 hour)
CREATE OR REPLACE FUNCTION public.cleanup_rate_limit_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.rate_limit_logs
  WHERE created_at < NOW() - INTERVAL '1 hour';
END;
$$;

-- Create a scheduled job to clean up old logs (if pg_cron is available)
-- Note: This requires pg_cron extension which may need to be enabled in Supabase dashboard
-- SELECT cron.schedule('cleanup-rate-limits', '*/15 * * * *', 'SELECT public.cleanup_rate_limit_logs()');

-- Add comment explaining the table
COMMENT ON TABLE public.rate_limit_logs IS 'Stores rate limit request logs for distributed rate limiting across Edge Functions';

-- Analytics consent tracking table
CREATE TABLE IF NOT EXISTS public.user_consents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consent_type TEXT NOT NULL,
  consented BOOLEAN NOT NULL DEFAULT false,
  consented_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, consent_type)
);

-- Index for user consent lookups
CREATE INDEX IF NOT EXISTS idx_user_consents_user_type
  ON public.user_consents(user_id, consent_type);

-- Enable RLS
ALTER TABLE public.user_consents ENABLE ROW LEVEL SECURITY;

-- Users can view and manage their own consents
CREATE POLICY "Users can view own consents"
  ON public.user_consents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own consents"
  ON public.user_consents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own consents"
  ON public.user_consents
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all consents for compliance reporting
CREATE POLICY "Admins can view all consents"
  ON public.user_consents
  FOR SELECT
  USING (public.is_admin_user(auth.uid()));

-- Add comment explaining the table
COMMENT ON TABLE public.user_consents IS 'Tracks user consent for analytics, marketing, and data processing';

-- Admin notification preferences table
CREATE TABLE IF NOT EXISTS public.admin_notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_on_impersonation BOOLEAN NOT NULL DEFAULT true,
  notify_on_user_signup BOOLEAN NOT NULL DEFAULT false,
  notify_on_subscription_change BOOLEAN NOT NULL DEFAULT true,
  notify_on_feedback BOOLEAN NOT NULL DEFAULT true,
  email_notifications BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(admin_user_id)
);

-- Enable RLS
ALTER TABLE public.admin_notification_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage their own notification settings
CREATE POLICY "Admins can manage own notification settings"
  ON public.admin_notification_settings
  FOR ALL
  USING (auth.uid() = admin_user_id AND public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = admin_user_id AND public.is_admin_user(auth.uid()));

-- Add comment explaining the table
COMMENT ON TABLE public.admin_notification_settings IS 'Stores admin notification preferences for various system events';

-- Admin notifications queue table
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for unread notifications
CREATE INDEX IF NOT EXISTS idx_admin_notifications_user_unread
  ON public.admin_notifications(admin_user_id, read, created_at DESC);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can view their own notifications
CREATE POLICY "Admins can view own notifications"
  ON public.admin_notifications
  FOR SELECT
  USING (auth.uid() = admin_user_id AND public.is_admin_user(auth.uid()));

-- Admins can update their own notifications (mark as read)
CREATE POLICY "Admins can update own notifications"
  ON public.admin_notifications
  FOR UPDATE
  USING (auth.uid() = admin_user_id AND public.is_admin_user(auth.uid()))
  WITH CHECK (auth.uid() = admin_user_id AND public.is_admin_user(auth.uid()));

-- Service role can insert notifications (from Edge Functions)
CREATE POLICY "Service role can insert notifications"
  ON public.admin_notifications
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Add comment explaining the table
COMMENT ON TABLE public.admin_notifications IS 'Queue for admin notifications about system events';
