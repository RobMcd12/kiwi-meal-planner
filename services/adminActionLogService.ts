import { supabase, isSupabaseConfigured } from './authService';

export type ActionType = 'view' | 'create' | 'update' | 'delete';
export type ResourceType =
  | 'recipe'
  | 'meal_plan'
  | 'pantry_item'
  | 'preference'
  | 'config'
  | 'shopping_list'
  | 'profile';

export interface AdminActionLog {
  id: string;
  adminUserId: string;
  targetUserId: string;
  actionType: ActionType;
  resourceType: ResourceType;
  resourceId?: string;
  actionDetails?: Record<string, unknown>;
  createdAt: string;
}

/**
 * Log an admin action taken while impersonating a user
 */
export const logAdminAction = async (
  adminUserId: string,
  targetUserId: string,
  actionType: ActionType,
  resourceType: ResourceType,
  resourceId?: string,
  actionDetails?: Record<string, unknown>
): Promise<void> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, skipping admin action log');
    return;
  }

  try {
    const { error } = await supabase
      .from('admin_action_logs')
      .insert({
        admin_user_id: adminUserId,
        target_user_id: targetUserId,
        action_type: actionType,
        resource_type: resourceType,
        resource_id: resourceId,
        action_details: actionDetails,
      });

    if (error) {
      console.error('Error logging admin action:', error);
    }
  } catch (err) {
    console.error('Error logging admin action:', err);
  }
};

/**
 * Get admin action logs for a specific target user
 */
export const getActionLogsForUser = async (
  targetUserId: string,
  limit: number = 50
): Promise<AdminActionLog[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('admin_action_logs')
      .select('*')
      .eq('target_user_id', targetUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching admin action logs:', error);
      return [];
    }

    return (data || []).map(log => ({
      id: log.id,
      adminUserId: log.admin_user_id,
      targetUserId: log.target_user_id,
      actionType: log.action_type,
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      actionDetails: log.action_details,
      createdAt: log.created_at,
    }));
  } catch (err) {
    console.error('Error fetching admin action logs:', err);
    return [];
  }
};

/**
 * Get all admin action logs (for admin dashboard)
 */
export const getAllActionLogs = async (limit: number = 100): Promise<AdminActionLog[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('admin_action_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching admin action logs:', error);
      return [];
    }

    return (data || []).map(log => ({
      id: log.id,
      adminUserId: log.admin_user_id,
      targetUserId: log.target_user_id,
      actionType: log.action_type,
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      actionDetails: log.action_details,
      createdAt: log.created_at,
    }));
  } catch (err) {
    console.error('Error fetching admin action logs:', err);
    return [];
  }
};

/**
 * Get action logs by admin user
 */
export const getActionLogsByAdmin = async (
  adminUserId: string,
  limit: number = 50
): Promise<AdminActionLog[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  try {
    const { data, error } = await supabase
      .from('admin_action_logs')
      .select('*')
      .eq('admin_user_id', adminUserId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching admin action logs:', error);
      return [];
    }

    return (data || []).map(log => ({
      id: log.id,
      adminUserId: log.admin_user_id,
      targetUserId: log.target_user_id,
      actionType: log.action_type,
      resourceType: log.resource_type,
      resourceId: log.resource_id,
      actionDetails: log.action_details,
      createdAt: log.created_at,
    }));
  } catch (err) {
    console.error('Error fetching admin action logs:', err);
    return [];
  }
};
