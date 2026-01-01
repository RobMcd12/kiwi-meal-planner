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
