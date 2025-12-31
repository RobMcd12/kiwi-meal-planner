import { supabase, isSupabaseConfigured } from './authService';
import type { LoginHistoryEntry, UserLoginSummary } from '../types';

/**
 * Parse user agent to extract basic device info
 */
function parseUserAgent(): { browser: string; os: string; deviceType: 'desktop' | 'mobile' | 'tablet' } {
  const ua = navigator.userAgent.toLowerCase();

  // Detect device type
  let deviceType: 'desktop' | 'mobile' | 'tablet' = 'desktop';
  if (/tablet|ipad|playbook|silk/i.test(ua)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|android.*mobile|windows phone|blackberry|opera mini|opera mobi/i.test(ua)) {
    deviceType = 'mobile';
  }

  // Detect browser
  let browser = 'Unknown';
  if (ua.includes('firefox')) browser = 'Firefox';
  else if (ua.includes('edg')) browser = 'Edge';
  else if (ua.includes('chrome') && !ua.includes('edg')) browser = 'Chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari';
  else if (ua.includes('opera') || ua.includes('opr')) browser = 'Opera';

  // Detect OS
  let os = 'Unknown';
  if (ua.includes('windows')) os = 'Windows';
  else if (ua.includes('mac os') || ua.includes('macos')) os = 'macOS';
  else if (ua.includes('linux') && !ua.includes('android')) os = 'Linux';
  else if (ua.includes('android')) os = 'Android';
  else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) os = 'iOS';

  return { browser, os, deviceType };
}

/**
 * Record a login event for the current user
 * First tries Edge Function for full data (IP, geolocation)
 * Falls back to direct insert if Edge Function unavailable
 */
export const recordLogin = async (
  userId: string,
  loginMethod: 'email' | 'google' | 'apple' | 'github'
): Promise<void> => {
  if (!isSupabaseConfigured()) return;

  try {
    // Try Edge Function first (for IP/geolocation)
    const { error: fnError } = await supabase.functions.invoke('record-login', {
      body: { userId, loginMethod },
    });

    // If Edge Function worked, we're done
    if (!fnError) {
      console.log('Login recorded via Edge Function');
      return;
    }

    console.warn('Edge Function failed, falling back to direct insert:', fnError.message);

    // Fallback: Insert directly into login_history (without IP/geolocation)
    const { browser, os, deviceType } = parseUserAgent();

    const { error: insertError } = await supabase
      .from('login_history')
      .insert({
        user_id: userId,
        user_agent: navigator.userAgent.substring(0, 500),
        device_type: deviceType,
        browser,
        os,
        login_method: loginMethod,
        success: true,
        // IP and geolocation will be null without Edge Function
      });

    if (insertError) {
      console.error('Error recording login (direct):', insertError);
    } else {
      console.log('Login recorded via direct insert');
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
    // Try to get summary using the database function first
    let summary: any = null;

    try {
      const { data: summaryData, error: summaryError } = await supabase
        .rpc('get_user_login_summary', { target_user_id: userId });

      if (!summaryError && summaryData?.[0]) {
        summary = summaryData[0];
      }
    } catch (rpcErr) {
      // RPC function might not exist yet, fall back to direct query
      console.warn('RPC get_user_login_summary not available, using direct query');
    }

    // If RPC failed or returned no data, query login_history directly
    if (!summary) {
      const { data: loginData, error: loginError } = await supabase
        .from('login_history')
        .select('login_at, city, country, device_type')
        .eq('user_id', userId)
        .eq('success', true)
        .order('login_at', { ascending: false })
        .limit(50);

      if (loginError) {
        // login_history table might not exist yet
        console.warn('login_history query failed:', loginError.message);
        return {
          totalLogins: 0,
          lastLoginAt: null,
          lastLoginLocation: null,
          devices: [],
          countries: [],
        };
      }

      if (!loginData || loginData.length === 0) {
        return {
          totalLogins: 0,
          lastLoginAt: null,
          lastLoginLocation: null,
          devices: [],
          countries: [],
        };
      }

      const lastLogin = loginData[0];
      const devices = [...new Set(loginData.map(l => l.device_type).filter(Boolean))];
      const countries = [...new Set(loginData.map(l => l.country).filter(Boolean))];
      const lastLocation = lastLogin.city && lastLogin.country
        ? `${lastLogin.city}, ${lastLogin.country}`
        : lastLogin.country || null;

      return {
        totalLogins: loginData.length,
        lastLoginAt: lastLogin.login_at || null,
        lastLoginLocation: lastLocation,
        devices,
        countries,
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
    // Get all users - try with all columns first, fallback to basic columns if some don't exist
    let users: any[] | null = null;
    let usersError: any = null;

    // Try full query first
    const fullResult = await supabase
      .from('profiles')
      .select('id, email, full_name, display_name, avatar_url, is_admin, created_at')
      .order('created_at', { ascending: false });

    if (fullResult.error) {
      console.warn('Full profiles query failed, trying basic query:', fullResult.error.message);

      // Fallback to basic columns that definitely exist
      const basicResult = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url, created_at')
        .order('created_at', { ascending: false });

      if (basicResult.error) {
        console.error('Error fetching users (basic):', basicResult.error);
        return [];
      }

      users = basicResult.data;
    } else {
      users = fullResult.data;
    }

    if (!users || users.length === 0) {
      console.log('No users found in profiles table');
      return [];
    }

    console.log(`Found ${users.length} users in profiles table`);

    // Get login summaries for all users in parallel
    const usersWithSummaries = await Promise.all(
      users.map(async (user) => {
        let loginSummary: UserLoginSummary | null = null;
        try {
          loginSummary = await getUserLoginSummary(user.id);
        } catch (err) {
          console.warn(`Failed to get login summary for user ${user.id}:`, err);
        }

        return {
          userId: user.id,
          email: user.email || '',
          fullName: user.full_name || user.display_name || null,
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
