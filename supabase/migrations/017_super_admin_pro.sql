-- Migration 017: Ensure Super Admin has permanent Pro access
-- This ensures rob@unicloud.co.nz always has Pro subscription

-- First, ensure the super admin has a profile row with correct data
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the user ID for the super admin from auth.users
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'rob@unicloud.co.nz';

    IF admin_user_id IS NOT NULL THEN
        -- Ensure profile exists with admin flag set
        INSERT INTO public.profiles (id, email, is_admin, full_name)
        VALUES (admin_user_id, 'rob@unicloud.co.nz', true, 'Rob McDonald')
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            is_admin = true;

        -- Ensure subscription record exists with permanent Pro
        INSERT INTO public.user_subscriptions (
            user_id,
            tier,
            status,
            admin_granted_pro,
            admin_grant_note
        )
        VALUES (
            admin_user_id,
            'pro',
            'active',
            true,
            'Super admin - permanent Pro access'
        )
        ON CONFLICT (user_id) DO UPDATE SET
            tier = 'pro',
            status = 'active',
            admin_granted_pro = true,
            admin_grant_expires_at = NULL,  -- NULL means permanent
            admin_grant_note = 'Super admin - permanent Pro access',
            updated_at = NOW();

        RAISE NOTICE 'Super admin % configured with permanent Pro access', admin_user_id;
    ELSE
        RAISE NOTICE 'Super admin user rob@unicloud.co.nz not found in auth.users';
    END IF;
END $$;

-- Also create a trigger to auto-grant Pro to super admin on signup
CREATE OR REPLACE FUNCTION public.handle_super_admin_subscription()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if this is the super admin
    IF NEW.email = 'rob@unicloud.co.nz' THEN
        -- Update their subscription to permanent Pro
        UPDATE public.user_subscriptions
        SET tier = 'pro',
            status = 'active',
            admin_granted_pro = true,
            admin_grant_expires_at = NULL,
            admin_grant_note = 'Super admin - permanent Pro access',
            updated_at = NOW()
        WHERE user_id = NEW.id;

        -- Also ensure is_admin flag is set in profiles
        UPDATE public.profiles
        SET is_admin = true
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_super_admin_created ON auth.users;

-- Create trigger for new user signup (runs after the subscription trigger)
CREATE TRIGGER on_super_admin_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_super_admin_subscription();
