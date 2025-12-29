-- Kiwi Meal Planner Database Schema
-- Run this in the Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- User profiles (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User preferences (dietary restrictions, units)
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    dietary_restrictions TEXT DEFAULT '',
    likes TEXT DEFAULT '',
    dislikes TEXT DEFAULT '',
    unit_system TEXT CHECK (unit_system IN ('metric', 'imperial')) DEFAULT 'metric',
    temperature_scale TEXT CHECK (temperature_scale IN ('celsius', 'fahrenheit')) DEFAULT 'celsius',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Meal configuration (days, people count, meal types)
CREATE TABLE public.meal_configs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    days INTEGER DEFAULT 5 CHECK (days >= 1 AND days <= 7),
    people_count INTEGER DEFAULT 2 CHECK (people_count >= 1 AND people_count <= 12),
    include_breakfast BOOLEAN DEFAULT TRUE,
    include_lunch BOOLEAN DEFAULT TRUE,
    include_dinner BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Pantry items
CREATE TABLE public.pantry_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- Favorite meals
CREATE TABLE public.favorite_meals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    ingredients TEXT[] NOT NULL,
    instructions TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Meal plan history (stores full MealPlanResponse as JSONB)
CREATE TABLE public.meal_plan_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Shopping list checked items state
CREATE TABLE public.shopping_list_state (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_id UUID REFERENCES public.meal_plan_history(id) ON DELETE CASCADE,
    checked_items JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, plan_id)
);

-- Global image cache for AI-generated meal images
CREATE TABLE public.meal_image_cache (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    meal_name TEXT NOT NULL,
    meal_description TEXT NOT NULL,
    image_data TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(meal_name)
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorite_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_plan_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shopping_list_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_image_cache ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can only manage their own profile
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- User Preferences: Users can only manage their own preferences
CREATE POLICY "Users can manage own preferences" ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id);

-- Meal Configs: Users can only manage their own config
CREATE POLICY "Users can manage own config" ON public.meal_configs
    FOR ALL USING (auth.uid() = user_id);

-- Pantry Items: Users can only manage their own pantry
CREATE POLICY "Users can manage own pantry" ON public.pantry_items
    FOR ALL USING (auth.uid() = user_id);

-- Favorite Meals: Users can only manage their own favorites
CREATE POLICY "Users can manage own favorites" ON public.favorite_meals
    FOR ALL USING (auth.uid() = user_id);

-- Meal Plan History: Users can only manage their own history
CREATE POLICY "Users can manage own history" ON public.meal_plan_history
    FOR ALL USING (auth.uid() = user_id);

-- Shopping List State: Users can only manage their own state
CREATE POLICY "Users can manage own shopping state" ON public.shopping_list_state
    FOR ALL USING (auth.uid() = user_id);

-- Image Cache: Anyone can read, authenticated users can insert
CREATE POLICY "Anyone can read image cache" ON public.meal_image_cache
    FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert image cache" ON public.meal_image_cache
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ============================================
-- TRIGGERS & FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_configs_updated_at
    BEFORE UPDATE ON public.meal_configs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shopping_list_state_updated_at
    BEFORE UPDATE ON public.shopping_list_state
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Limit meal plan history to 5 entries per user
CREATE OR REPLACE FUNCTION limit_meal_plan_history()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM public.meal_plan_history
    WHERE id IN (
        SELECT id FROM public.meal_plan_history
        WHERE user_id = NEW.user_id
        ORDER BY created_at DESC
        OFFSET 5
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_history_limit
    AFTER INSERT ON public.meal_plan_history
    FOR EACH ROW
    EXECUTE FUNCTION limit_meal_plan_history();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================
-- INDEXES for performance
-- ============================================

CREATE INDEX idx_pantry_items_user_id ON public.pantry_items(user_id);
CREATE INDEX idx_favorite_meals_user_id ON public.favorite_meals(user_id);
CREATE INDEX idx_meal_plan_history_user_id ON public.meal_plan_history(user_id);
CREATE INDEX idx_meal_plan_history_created_at ON public.meal_plan_history(created_at DESC);
CREATE INDEX idx_meal_image_cache_meal_name ON public.meal_image_cache(meal_name);
