import { supabase } from './authService';
import type { FeedbackItem, FeedbackType, FeedbackStatus } from '../types';

/**
 * Submit new feedback
 */
export const submitFeedback = async (
  userId: string,
  userName: string,
  userEmail: string | undefined,
  type: FeedbackType,
  subject: string,
  message: string,
  screenshot?: string
): Promise<FeedbackItem | null> => {
  const { data, error } = await supabase
    .from('feedback')
    .insert({
      user_id: userId,
      user_name: userName,
      user_email: userEmail,
      type,
      subject,
      message,
      screenshot,
      status: 'new',
      user_viewed_response: false,
    })
    .select()
    .single();

  if (error) {
    console.error('Error submitting feedback:', error);
    throw error;
  }

  return data;
};

/**
 * Get user's own feedback
 */
export const getMyFeedback = async (userId: string): Promise<FeedbackItem[]> => {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading feedback:', error);
    throw error;
  }

  return data || [];
};

/**
 * Get count of new responses for a user
 */
export const getNewResponseCount = async (userId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('feedback')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('admin_response', 'is', null)
    .eq('user_viewed_response', false);

  if (error) {
    console.error('Error getting response count:', error);
    return 0;
  }

  return count || 0;
};

/**
 * Mark a feedback response as viewed
 */
export const markFeedbackViewed = async (feedbackId: string): Promise<void> => {
  const { error } = await supabase
    .from('feedback')
    .update({ user_viewed_response: true })
    .eq('id', feedbackId);

  if (error) {
    console.error('Error marking feedback viewed:', error);
    throw error;
  }
};

// ============================================
// ADMIN FUNCTIONS
// ============================================

/**
 * Get all feedback (admin only)
 */
export const getAllFeedback = async (): Promise<FeedbackItem[]> => {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .order('status', { ascending: true }) // 'new' comes first alphabetically
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading all feedback:', error);
    throw error;
  }

  return data || [];
};

/**
 * Get count of new feedback (admin)
 */
export const getNewFeedbackCount = async (): Promise<number> => {
  const { count, error } = await supabase
    .from('feedback')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'new');

  if (error) {
    console.error('Error getting new feedback count:', error);
    return 0;
  }

  return count || 0;
};

/**
 * Respond to feedback (admin only)
 */
export const respondToFeedback = async (
  feedbackId: string,
  adminId: string,
  adminName: string,
  response: string,
  status: FeedbackStatus = 'reviewed'
): Promise<FeedbackItem | null> => {
  const { data, error } = await supabase
    .from('feedback')
    .update({
      admin_response: response,
      admin_responded_at: new Date().toISOString(),
      admin_responded_by: adminId,
      admin_name: adminName,
      status,
      user_viewed_response: false,
      updated_at: new Date().toISOString(),
    })
    .eq('id', feedbackId)
    .select()
    .single();

  if (error) {
    console.error('Error responding to feedback:', error);
    throw error;
  }

  return data;
};

/**
 * Update feedback status (admin only)
 */
export const updateFeedbackStatus = async (
  feedbackId: string,
  status: FeedbackStatus
): Promise<void> => {
  const { error } = await supabase
    .from('feedback')
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', feedbackId);

  if (error) {
    console.error('Error updating feedback status:', error);
    throw error;
  }
};
