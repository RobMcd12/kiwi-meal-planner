import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { AuthProvider } from '../types';

// Supabase configuration - hardcoded for reliability
// These are public anon keys - safe to include in client-side code
const SUPABASE_URL = 'https://wmpvawlyyaposeathxww.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcHZhd2x5eWFwb3NlYXRoeHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTc5OTAsImV4cCI6MjA4MjU3Mzk5MH0.iEBUxX8a77rvYH6wyCuEHYrCzHC7PLkWY1amahzpC4U';

// Create Supabase client directly with hardcoded credentials
export const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

/**
 * Check if Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  // Always configured since we use hardcoded credentials
  return true;
};

/**
 * Sign in with OAuth provider (Google, Apple, GitHub)
 */
export const signInWithProvider = async (provider: AuthProvider): Promise<void> => {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured');
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) throw error;
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

/**
 * Get the current session
 */
export const getSession = async (): Promise<Session | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
};

/**
 * Subscribe to auth state changes
 */
export const onAuthStateChange = (
  callback: (session: Session | null) => void
): (() => void) => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      callback(session);
    }
  );

  return () => subscription.unsubscribe();
};

/**
 * Get user profile from database
 */
export const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) throw error;
  return data;
};

/**
 * Update user profile
 */
export const updateUserProfile = async (
  userId: string,
  updates: { display_name?: string; avatar_url?: string }
) => {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) throw error;
  return data;
};
