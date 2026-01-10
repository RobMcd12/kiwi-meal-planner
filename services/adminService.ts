import { supabase, isSupabaseConfigured } from './authService';

// SECURITY: Super admin email moved to Supabase secret (SUPER_ADMIN_EMAIL)
// Use checkIsSuperAdmin() Edge Function to verify super admin status

// Cache for super admin check (avoids repeated API calls)
let superAdminCache: { [userId: string]: { isSuperAdmin: boolean; timestamp: number } } = {};
const SUPER_ADMIN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}

/**
 * Check if a user is a super admin via Edge Function
 * SECURITY: Super admin email is stored server-side, not in client code
 */
export const checkIsSuperAdmin = async (userId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  // Check cache first
  const cached = superAdminCache[userId];
  if (cached && Date.now() - cached.timestamp < SUPER_ADMIN_CACHE_TTL) {
    return cached.isSuperAdmin;
  }

  try {
    const { data, error } = await supabase.functions.invoke('check-super-admin', {
      body: {},
    });

    if (error) {
      console.error('Error checking super admin status:', error);
      return false;
    }

    const isSuperAdmin = data?.isSuperAdmin === true;

    // Cache the result
    superAdminCache[userId] = { isSuperAdmin, timestamp: Date.now() };

    return isSuperAdmin;
  } catch (err) {
    console.error('Error checking super admin status:', err);
    return false;
  }
};

/**
 * Check if a user is an admin (either super admin or database admin)
 */
export const checkIsAdmin = async (userId: string, email?: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  // Check super admin status via Edge Function
  const isSuperAdmin = await checkIsSuperAdmin(userId);
  if (isSuperAdmin) {
    return true;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error checking admin status:', error);
      return false;
    }

    return data?.is_admin === true;
  } catch (err) {
    console.error('Error checking admin status:', err);
    return false;
  }
};

/**
 * Get all users with their admin status
 */
export const getAllUsers = async (): Promise<UserProfile[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, is_admin, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error('Error fetching users:', err);
    return [];
  }
};

/**
 * Set admin status for a user
 */
export const setUserAdminStatus = async (userId: string, isAdmin: boolean): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ is_admin: isAdmin })
      .eq('id', userId);

    if (error) {
      console.error('Error updating admin status:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error updating admin status:', err);
    return false;
  }
};

/**
 * Check if current user is super admin (async version using Edge Function)
 * SECURITY: Super admin check now goes through server-side validation
 */
export const isSuperAdmin = async (userId?: string): Promise<boolean> => {
  if (!userId) return false;
  return checkIsSuperAdmin(userId);
};

/**
 * Send password reset email to a user
 */
export const sendPasswordResetEmail = async (email: string): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
    });

    if (error) {
      console.error('Error sending password reset:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error sending password reset:', err);
    return { success: false, error: 'Failed to send password reset email' };
  }
};

/**
 * Create a new user via Edge Function (requires admin privileges)
 */
export const createUser = async (
  email: string,
  password: string,
  displayName: string,
  makeAdmin: boolean = false
): Promise<{ success: boolean; error?: string; userId?: string }> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Call the admin Edge Function to create user
    const { data, error } = await supabase.functions.invoke('admin-create-user', {
      body: { email, password, displayName, makeAdmin },
    });

    if (error) {
      console.error('Error creating user:', error);
      return { success: false, error: error.message };
    }

    if (data?.error) {
      return { success: false, error: data.error };
    }

    return { success: true, userId: data?.userId };
  } catch (err: any) {
    console.error('Error creating user:', err);
    return { success: false, error: err.message || 'Failed to create user' };
  }
};

/**
 * Delete a user (requires admin privileges)
 */
export const deleteUser = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  if (!isSupabaseConfigured()) {
    return { success: false, error: 'Supabase not configured' };
  }

  try {
    // Delete from profiles table first
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error('Error deleting profile:', profileError);
      return { success: false, error: profileError.message };
    }

    // Note: Deleting from auth.users requires Edge Function with service role
    // For now, we just delete the profile which effectively disables the user

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting user:', err);
    return { success: false, error: err.message || 'Failed to delete user' };
  }
};

/**
 * User details for impersonation
 */
export interface ImpersonatedUserDetails {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
}

/**
 * Get user details for impersonation (admin only)
 */
/**
 * Admin recipe type
 */
export interface AdminRecipe {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  source?: string;
  isPublic: boolean;
  userId: string;
  userEmail?: string;
  userName?: string;
  hasVideo: boolean;
  videoStatus?: string;
  createdAt: string;
}

/**
 * Get all recipes from all users (admin only)
 */
export const getAllRecipes = async (): Promise<AdminRecipe[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    // Fetch recipes
    const { data: recipes, error: recipesError } = await supabase
      .from('favorite_meals')
      .select('id, name, description, image_url, source, is_public, user_id, created_at')
      .order('created_at', { ascending: false });

    if (recipesError) {
      console.error('Error fetching all recipes:', recipesError);
      return [];
    }

    if (!recipes || recipes.length === 0) {
      return [];
    }

    // Get unique user IDs
    const userIds = [...new Set(recipes.map(r => r.user_id).filter(Boolean))];
    const recipeIds = recipes.map(r => r.id);

    // Fetch profiles for users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    // Fetch videos for recipes
    const { data: videos } = await supabase
      .from('recipe_videos')
      .select('id, meal_id, processing_status')
      .in('meal_id', recipeIds);

    // Create lookup maps
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));
    const videoMap = new Map((videos || []).map(v => [v.meal_id, v]));

    return recipes.map((recipe: any) => {
      const profile = profileMap.get(recipe.user_id);
      const video = videoMap.get(recipe.id);
      return {
        id: recipe.id,
        name: recipe.name,
        description: recipe.description,
        imageUrl: recipe.image_url,
        source: recipe.source,
        isPublic: recipe.is_public ?? false,
        userId: recipe.user_id,
        userEmail: profile?.email,
        userName: profile?.full_name,
        hasVideo: !!video,
        videoStatus: video?.processing_status,
        createdAt: recipe.created_at,
      };
    });
  } catch (err) {
    console.error('Error fetching all recipes:', err);
    return [];
  }
};

/**
 * Admin meal plan type
 */
export interface AdminMealPlan {
  id: string;
  name: string;
  userId: string;
  userEmail?: string;
  userName?: string;
  daysCount: number;
  mealsCount: number;
  createdAt: string;
}

/**
 * Get all meal plans from all users (admin only)
 */
export const getAllMealPlans = async (): Promise<AdminMealPlan[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    // Fetch meal plans
    const { data: mealPlans, error: plansError } = await supabase
      .from('saved_meal_plans')
      .select('id, name, user_id, weekly_plan, created_at')
      .order('created_at', { ascending: false });

    if (plansError) {
      console.error('Error fetching all meal plans:', plansError);
      return [];
    }

    if (!mealPlans || mealPlans.length === 0) {
      return [];
    }

    // Get unique user IDs
    const userIds = [...new Set(mealPlans.map(p => p.user_id).filter(Boolean))];

    // Fetch profiles for users
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds);

    // Create lookup map
    const profileMap = new Map((profiles || []).map(p => [p.id, p]));

    return mealPlans.map((plan: any) => {
      // Count days and meals from weekly_plan JSONB
      const weeklyPlan = plan.weekly_plan || {};
      const days = Object.keys(weeklyPlan);
      let mealsCount = 0;
      days.forEach(day => {
        const dayMeals = weeklyPlan[day];
        if (dayMeals) {
          mealsCount += Object.keys(dayMeals).filter(k => dayMeals[k]).length;
        }
      });

      const profile = profileMap.get(plan.user_id);
      return {
        id: plan.id,
        name: plan.name,
        userId: plan.user_id,
        userEmail: profile?.email,
        userName: profile?.full_name,
        daysCount: days.length,
        mealsCount,
        createdAt: plan.created_at,
      };
    });
  } catch (err) {
    console.error('Error fetching all meal plans:', err);
    return [];
  }
};

export const getUserForImpersonation = async (userId: string): Promise<ImpersonatedUserDetails | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, is_admin')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error fetching user for impersonation:', error);
      return null;
    }

    return {
      id: data.id,
      email: data.email || '',
      fullName: data.full_name,
      avatarUrl: data.avatar_url,
      isAdmin: data.is_admin ?? false,
    };
  } catch (err) {
    console.error('Error fetching user for impersonation:', err);
    return null;
  }
};
