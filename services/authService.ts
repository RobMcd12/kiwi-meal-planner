import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import type { AuthProvider } from '../types';

// Supabase configuration
// These are public keys - safe to include in client-side code
const SUPABASE_URL = 'https://wmpvawlyyaposeathxww.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndtcHZhd2x5eWFwb3NlYXRoeHd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5OTc5OTAsImV4cCI6MjA4MjU3Mzk5MH0.iEBUxX8a77rvYH6wyCuEHYrCzHC7PLkWY1amahzpC4U';

// Allow env vars to override hardcoded values (for different environments)
const supabaseUrl = (
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  SUPABASE_URL
) as string;

const supabaseAnonKey = (
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  SUPABASE_ANON_KEY
) as string;

// Check if we have valid Supabase configuration
const hasValidConfig = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  supabaseUrl.includes('.supabase.co')
);

// Only create real client if we have valid config, otherwise create a dummy
export const supabase: SupabaseClient = hasValidConfig
  ? createClient(supabaseUrl, supabaseAnonKey)
  : createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: { persistSession: false, autoRefreshToken: false }
    });

/**
 * Check if Supabase is properly configured
 */
export const isSupabaseConfigured = (): boolean => {
  return hasValidConfig;
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
  if (!isSupabaseConfigured()) return null;

  const { data: { user } } = await supabase.auth.getUser();
  return user;
};

/**
 * Get the current session
 */
export const getSession = async (): Promise<Session | null> => {
  if (!isSupabaseConfigured()) return null;

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
