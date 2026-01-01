-- Migration 016: Admin Action Logs
-- Tracks actions taken by admins while impersonating users

CREATE TABLE IF NOT EXISTS public.admin_action_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL, -- 'view', 'create', 'update', 'delete'
    resource_type TEXT NOT NULL, -- 'recipe', 'meal_plan', 'pantry_item', 'preference', etc.
    resource_id TEXT, -- Optional ID of the affected resource
    action_details JSONB, -- Additional context about the action
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.admin_action_logs ENABLE ROW LEVEL SECURITY;

-- Only admins can view logs
CREATE POLICY "Admins can view action logs" ON public.admin_action_logs
    FOR SELECT USING (
        public.is_admin_user(auth.uid())
    );

-- Admins can insert logs (when impersonating)
CREATE POLICY "Admins can insert action logs" ON public.admin_action_logs
    FOR INSERT WITH CHECK (
        public.is_admin_user(auth.uid())
        AND auth.uid() = admin_user_id
    );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_admin ON public.admin_action_logs(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_target ON public.admin_action_logs(target_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_created ON public.admin_action_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_action_logs_action ON public.admin_action_logs(action_type, resource_type);
