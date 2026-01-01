import { supabase, isSupabaseConfigured } from './authService';

// Super admin email that always has admin access
const SUPER_ADMIN_EMAIL = 'rob@unicloud.co.nz';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}

/**
 * Check if a user is an admin (either super admin or database admin)
 */
export const checkIsAdmin = async (userId: string, email?: string): Promise<boolean> => {
  // Super admin always has access
  if (email === SUPER_ADMIN_EMAIL) {
    return true;
  }

  if (!isSupabaseConfigured()) {
    return false;
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
 * Check if an email is the super admin
 */
export const isSuperAdmin = (email?: string): boolean => {
  return email === SUPER_ADMIN_EMAIL;
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
    const { data, error } = await supabase
      .from('favorite_meals')
      .select(`
        id,
        name,
        description,
        image_url,
        source,
        is_public,
        user_id,
        created_at,
        profiles:user_id(email, full_name),
        recipe_videos(id, processing_status)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all recipes:', error);
      return [];
    }

    return (data || []).map((recipe: any) => ({
      id: recipe.id,
      name: recipe.name,
      description: recipe.description,
      imageUrl: recipe.image_url,
      source: recipe.source,
      isPublic: recipe.is_public ?? false,
      userId: recipe.user_id,
      userEmail: recipe.profiles?.email,
      userName: recipe.profiles?.full_name,
      hasVideo: recipe.recipe_videos && recipe.recipe_videos.length > 0,
      videoStatus: recipe.recipe_videos?.[0]?.processing_status,
      createdAt: recipe.created_at,
    }));
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
    const { data, error } = await supabase
      .from('saved_meal_plans')
      .select(`
        id,
        name,
        user_id,
        weekly_plan,
        created_at,
        profiles:user_id(email, full_name)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all meal plans:', error);
      return [];
    }

    return (data || []).map((plan: any) => {
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

      return {
        id: plan.id,
        name: plan.name,
        userId: plan.user_id,
        userEmail: plan.profiles?.email,
        userName: plan.profiles?.full_name,
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
