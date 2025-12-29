import { supabase, isSupabaseConfigured } from './authService';

// Super admin email that always has admin access
const SUPER_ADMIN_EMAIL = 'rob@unicloud.co.nz';

export interface UserProfile {
  id: string;
  email: string;
  display_name: string | null;
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
      .select('id, email, display_name, avatar_url, is_admin, created_at')
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
