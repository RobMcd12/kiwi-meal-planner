import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, onAuthStateChange, isSupabaseConfigured } from '../services/authService';
import { checkIsAdmin, isSuperAdmin, getUserForImpersonation } from '../services/adminService';
import { recordLogin } from '../services/loginHistoryService';

// Impersonated user type
export interface ImpersonatedUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  isAdmin: boolean;
}

// Capture URL state immediately at module load (before Supabase can modify it)
// This is used to detect if we're returning from an OAuth callback
const INITIAL_HASH = window.location.hash;
const INITIAL_CODE = new URLSearchParams(window.location.search).get('code');

// Check if this was an OAuth callback (using captured initial state)
// Note: We don't manually exchange the code - Supabase's detectSessionInUrl handles that
// This is just used to know we should wait for the auth state change
export const isOAuthCallback = (): boolean => {
  // Check for OAuth tokens in hash (implicit flow)
  if (INITIAL_HASH && (INITIAL_HASH.includes('access_token=') || INITIAL_HASH.includes('error='))) {
    return true;
  }

  // Check for PKCE code in query params
  if (INITIAL_CODE) {
    return true;
  }

  return false;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isConfigured: boolean;
  isAdmin: boolean;
  refreshAdminStatus: () => Promise<void>;
  // Impersonation
  impersonatedUser: ImpersonatedUser | null;
  isImpersonating: boolean;
  startImpersonation: (userId: string) => Promise<boolean>;
  stopImpersonation: () => void;
  effectiveUserId: string | null;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  isConfigured: false,
  isAdmin: false,
  refreshAdminStatus: async () => {},
  // Impersonation defaults
  impersonatedUser: null,
  isImpersonating: false,
  startImpersonation: async () => false,
  stopImpersonation: () => {},
  effectiveUserId: null,
});

interface AuthProviderProps {
  children: ReactNode;
}

const IMPERSONATION_STORAGE_KEY = 'kiwi_impersonated_user';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const isConfigured = isSupabaseConfigured();

  // Impersonation state
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(() => {
    // Initialize from sessionStorage if available
    try {
      const stored = sessionStorage.getItem(IMPERSONATION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  // Track if we've already recorded login for current browser session to avoid duplicates
  const loginRecordedRef = useRef<boolean>(false);

  // Function to check and update admin status
  const refreshAdminStatus = async () => {
    if (user) {
      const adminStatus = await checkIsAdmin(user.id, user.email ?? undefined);
      setIsAdmin(adminStatus);
    } else {
      setIsAdmin(false);
    }
  };

  // Impersonation methods
  const startImpersonation = async (userId: string): Promise<boolean> => {
    // Only admins can impersonate
    if (!isAdmin) {
      console.warn('Impersonation requires admin privileges');
      return false;
    }

    // Cannot impersonate self
    if (userId === user?.id) {
      console.warn('Cannot impersonate yourself');
      return false;
    }

    try {
      const userDetails = await getUserForImpersonation(userId);
      if (!userDetails) {
        console.error('Failed to fetch user details for impersonation');
        return false;
      }

      // Cannot impersonate other admins (security)
      if (userDetails.isAdmin) {
        console.warn('Cannot impersonate admin users');
        return false;
      }

      setImpersonatedUser(userDetails);
      sessionStorage.setItem(IMPERSONATION_STORAGE_KEY, JSON.stringify(userDetails));
      return true;
    } catch (error) {
      console.error('Error starting impersonation:', error);
      return false;
    }
  };

  const stopImpersonation = () => {
    setImpersonatedUser(null);
    sessionStorage.removeItem(IMPERSONATION_STORAGE_KEY);
  };

  // Clear impersonation if user logs out or is no longer admin
  useEffect(() => {
    if (!isAdmin && impersonatedUser) {
      stopImpersonation();
    }
  }, [isAdmin, impersonatedUser]);

  // Computed values
  const isImpersonating = !!impersonatedUser;
  const effectiveUserId = impersonatedUser?.id ?? user?.id ?? null;

  // Helper to detect login method from user data
  const detectLoginMethod = (user: User): 'email' | 'google' | 'apple' | 'github' => {
    const provider = user.app_metadata?.provider;
    if (provider === 'google') return 'google';
    if (provider === 'apple') return 'apple';
    if (provider === 'github') return 'github';
    return 'email';
  };

  // Check if we should record a login for this user
  // We use sessionStorage to track if login was recorded in this browser tab session
  // This prevents duplicate recordings when tokens refresh
  const shouldRecordLogin = (userId: string): boolean => {
    const storageKey = `login_recorded_${userId}`;
    const recorded = sessionStorage.getItem(storageKey);

    if (recorded) {
      return false; // Already recorded in this browser session
    }

    // Also check our ref for this component instance
    if (loginRecordedRef.current) {
      return false;
    }

    return true;
  };

  const markLoginRecorded = (userId: string) => {
    const storageKey = `login_recorded_${userId}`;
    sessionStorage.setItem(storageKey, 'true');
    loginRecordedRef.current = true;
  };

  // Record login when user signs in
  const handleLoginRecord = async (user: User) => {
    // Only record if we haven't recorded for this session
    if (!shouldRecordLogin(user.id)) {
      return;
    }

    markLoginRecorded(user.id);

    const loginMethod = detectLoginMethod(user);
    await recordLogin(user.id, loginMethod);
  };

  useEffect(() => {
    if (!isConfigured) {
      setLoading(false);
      return;
    }

    // Track if we're processing an OAuth callback
    // When detectSessionInUrl is true, Supabase automatically handles the code exchange
    // and fires onAuthStateChange when complete
    const processingOAuth = isOAuthCallback();

    // Subscribe to auth changes - this is triggered by Supabase after OAuth code exchange
    const unsubscribe = onAuthStateChange(async (newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      // Check admin status when auth changes
      if (newSession?.user) {
        const adminStatus = await checkIsAdmin(newSession.user.id, newSession.user.email ?? undefined);
        setIsAdmin(adminStatus);

        // Record login when user signs in (new session)
        handleLoginRecord(newSession.user);
      } else {
        setIsAdmin(false);
        // Clear the login recorded ref when user signs out
        loginRecordedRef.current = false;
      }

      // Always ensure loading is false after auth state change
      setLoading(false);
    });

    // Initialize auth - check for existing session
    // Note: For OAuth callbacks, Supabase's detectSessionInUrl automatically
    // exchanges the code and triggers onAuthStateChange, so we don't need
    // to manually call exchangeCodeForSession
    const initAuth = async () => {
      try {
        // If this is an OAuth callback, just wait for onAuthStateChange
        // Supabase will handle the code exchange automatically
        if (processingOAuth) {
          // Don't call getSession during OAuth callback as Supabase is processing
          // The onAuthStateChange callback will handle setting the session
          return;
        }

        // Normal session check (not OAuth callback)
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ?? null);

        // Check admin status for the user
        if (session?.user) {
          const adminStatus = await checkIsAdmin(session.user.id, session.user.email ?? undefined);
          setIsAdmin(adminStatus);

          // Record login for this session (only on fresh page load with existing session)
          handleLoginRecord(session.user);
        }
      } catch (error) {
        console.error('Error during auth init:', error);
      } finally {
        // Only set loading false if not processing OAuth
        // OAuth callback will set loading false in onAuthStateChange
        if (!processingOAuth) {
          setLoading(false);
        }
      }
    };

    initAuth();

    return () => {
      unsubscribe();
    };
  }, [isConfigured]);

  const value: AuthContextType = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    isConfigured,
    isAdmin,
    refreshAdminStatus,
    // Impersonation
    impersonatedUser,
    isImpersonating,
    startImpersonation,
    stopImpersonation,
    effectiveUserId,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to access auth context
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
