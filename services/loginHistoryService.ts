import { supabase, isSupabaseConfigured } from './authService';
import type { LoginHistoryEntry, UserLoginSummary } from '../types';

/**
 * Record a login event for the current user via Edge Function
 * This captures IP address, geolocation, and device info
 */
export const recordLogin = async (
  userId: string,
  loginMethod: 'email' | 'google' | 'apple' | 'github'
): Promise<void> => {
  if (!isSupabaseConfigured()) return;

  try {
    const { error } = await supabase.functions.invoke('record-login', {
      body: { userId, loginMethod },
    });

    if (error) {
      console.error('Error recording login:', error);
    }
  } catch (err) {
    console.error('Error recording login:', err);
  }
};

/**
 * Get login history for a specific user
 */
export const getUserLoginHistory = async (
  userId: string,
  limit: number = 20
): Promise<LoginHistoryEntry[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('login_history')
      .select('*')
      .eq('user_id', userId)
      .order('login_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching login history:', error);
      return [];
    }

    return (data || []).map(mapLoginHistoryRow);
  } catch (err) {
    console.error('Error fetching login history:', err);
    return [];
  }
};

/**
 * Get login summary for a user
 */
export const getUserLoginSummary = async (userId: string): Promise<UserLoginSummary | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    // Get summary using the database function
    const { data: summaryData, error: summaryError } = await supabase
      .rpc('get_user_login_summary', { target_user_id: userId });

    if (summaryError) {
      console.error('Error fetching login summary:', summaryError);
      return null;
    }

    const summary = summaryData?.[0];
    if (!summary) {
      return {
        totalLogins: 0,
        lastLoginAt: null,
        lastLoginLocation: null,
        devices: [],
        countries: [],
      };
    }

    // Get unique devices and countries from recent logins
    const { data: recentLogins } = await supabase
      .from('login_history')
      .select('device_type, country')
      .eq('user_id', userId)
      .eq('success', true)
      .order('login_at', { ascending: false })
      .limit(50);

    const devices = [...new Set((recentLogins || []).map(l => l.device_type).filter(Boolean))];
    const countries = [...new Set((recentLogins || []).map(l => l.country).filter(Boolean))];

    const lastLocation = summary.last_login_city && summary.last_login_country
      ? `${summary.last_login_city}, ${summary.last_login_country}`
      : summary.last_login_country || null;

    return {
      totalLogins: summary.total_logins || 0,
      lastLoginAt: summary.last_login_at || null,
      lastLoginLocation: lastLocation,
      devices,
      countries,
    };
  } catch (err) {
    console.error('Error fetching login summary:', err);
    return null;
  }
};

/**
 * Get all users with their login summaries (admin only)
 */
export const getAllUsersWithLoginSummary = async (): Promise<Array<{
  userId: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
  createdAt: string;
  loginSummary: UserLoginSummary | null;
}>> => {
  if (!isSupabaseConfigured()) return [];

  try {
    // Get all users
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, is_admin, created_at')
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('Error fetching users:', usersError);
      return [];
    }

    // Get login summaries for all users in parallel
    const usersWithSummaries = await Promise.all(
      (users || []).map(async (user) => {
        const loginSummary = await getUserLoginSummary(user.id);
        return {
          userId: user.id,
          email: user.email || '',
          fullName: user.full_name,
          avatarUrl: user.avatar_url,
          isAdmin: user.is_admin || false,
          createdAt: user.created_at,
          loginSummary,
        };
      })
    );

    return usersWithSummaries;
  } catch (err) {
    console.error('Error fetching users with login summary:', err);
    return [];
  }
};

/**
 * Map database row to LoginHistoryEntry
 */
function mapLoginHistoryRow(row: any): LoginHistoryEntry {
  return {
    id: row.id,
    userId: row.user_id,
    loginAt: row.login_at,
    ipAddress: row.ip_address,
    deviceType: row.device_type,
    browser: row.browser,
    os: row.os,
    country: row.country,
    city: row.city,
    loginMethod: row.login_method,
    success: row.success,
  };
}

/**
 * Format relative time for login display
 */
export const formatLoginTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

  return date.toLocaleDateString('en-NZ', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
};

/**
 * Format location string from login entry
 */
export const formatLoginLocation = (entry: LoginHistoryEntry): string => {
  if (entry.city && entry.country) {
    return `${entry.city}, ${entry.country}`;
  }
  return entry.country || entry.city || 'Unknown';
};
