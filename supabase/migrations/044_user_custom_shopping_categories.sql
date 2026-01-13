-- User Custom Shopping Categories
-- Allows users to create their own shopping list categories beyond the defaults

-- Create table for user custom shopping categories
CREATE TABLE IF NOT EXISTS user_custom_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Ensure unique category names per user
    UNIQUE(user_id, name)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_custom_categories_user_id ON user_custom_categories(user_id);

-- Enable RLS
ALTER TABLE user_custom_categories ENABLE ROW LEVEL SECURITY;

-- Users can read their own custom categories
CREATE POLICY "Users can read own custom categories"
    ON user_custom_categories FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

-- Users can create their own custom categories
CREATE POLICY "Users can create own custom categories"
    ON user_custom_categories FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can update their own custom categories
CREATE POLICY "Users can update own custom categories"
    ON user_custom_categories FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own custom categories
CREATE POLICY "Users can delete own custom categories"
    ON user_custom_categories FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- Super admins can view all categories (only if user_profiles exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        EXECUTE '
        CREATE POLICY "Super admins can view all custom categories"
            ON user_custom_categories FOR SELECT
            TO authenticated
            USING (
                EXISTS (
                    SELECT 1 FROM user_profiles
                    WHERE user_id = auth.uid()
                    AND is_super_admin = true
                )
            )';
    END IF;
END $$;
