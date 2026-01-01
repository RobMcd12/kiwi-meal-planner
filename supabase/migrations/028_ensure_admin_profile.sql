-- Migration 028: Ensure admin users have profiles
-- This fixes cases where profile creation failed during signup

-- Create a function to ensure all auth.users have a profile
-- and set the first user as admin if no admins exist
DO $$
DECLARE
    user_record RECORD;
    has_admin BOOLEAN;
BEGIN
    -- Check if any admin exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE is_admin = true) INTO has_admin;

    -- Loop through all auth users who don't have a profile
    FOR user_record IN
        SELECT au.id, au.email, au.raw_user_meta_data
        FROM auth.users au
        LEFT JOIN public.profiles p ON au.id = p.id
        WHERE p.id IS NULL
    LOOP
        -- Insert missing profile
        INSERT INTO public.profiles (id, email, display_name, is_admin)
        VALUES (
            user_record.id,
            user_record.email,
            COALESCE(
                user_record.raw_user_meta_data->>'full_name',
                user_record.raw_user_meta_data->>'name',
                split_part(user_record.email, '@', 1)
            ),
            -- Make the first user admin if no admins exist
            NOT has_admin
        );

        RAISE NOTICE 'Created profile for user: %', user_record.email;

        -- After first insert, we have an admin
        IF NOT has_admin THEN
            has_admin := true;
        END IF;
    END LOOP;
END $$;

-- Also ensure any users with profiles but not marked as admin get fixed
-- if they were supposed to be admin (e.g., the first user)
DO $$
DECLARE
    admin_count INTEGER;
    first_user_id UUID;
BEGIN
    -- Count admins
    SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE is_admin = true;

    -- If no admins, make the oldest user an admin
    IF admin_count = 0 THEN
        SELECT id INTO first_user_id
        FROM public.profiles
        ORDER BY created_at ASC
        LIMIT 1;

        IF first_user_id IS NOT NULL THEN
            UPDATE public.profiles SET is_admin = true WHERE id = first_user_id;
            RAISE NOTICE 'Set first user as admin: %', first_user_id;
        END IF;
    END IF;
END $$;
