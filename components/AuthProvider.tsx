import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, onAuthStateChange, isSupabaseConfigured } from '../services/authService';
import { checkIsAdmin, isSuperAdmin } from '../services/adminService';
import { recordLogin } from '../services/loginHistoryService';

// Check if current URL is an OAuth callback that needs processing
const isOAuthCallback = (): boolean => {
  const hash = window.location.hash;
  const search = window.location.search;

  // Check for OAuth tokens in hash (implicit flow)
  if (hash && (hash.includes('access_token=') || hash.includes('error='))) {
    return true;
  }

  // Check for PKCE code in query params
  if (search && search.includes('code=')) {
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
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  isConfigured: false,
  isAdmin: false,
  refreshAdminStatus: async () => {},
});

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const isConfigured = isSupabaseConfigured();

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
    const processingOAuth = isOAuthCallback();
    let authStateReceived = false;

    // Subscribe to auth changes FIRST (before getSession)
    // This ensures we catch the SIGNED_IN event from OAuth callback processing
    const unsubscribe = onAuthStateChange(async (newSession) => {
      authStateReceived = true;
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

      // If we were processing OAuth, now we can set loading to false
      if (processingOAuth) {
        setLoading(false);
      }
    });

    // Get initial session
    const initAuth = async () => {
      try {
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
        console.error('Error getting session:', error);
      } finally {
        // Only set loading to false here if NOT processing OAuth
        // If processing OAuth, wait for the auth state change event
        if (!processingOAuth) {
          setLoading(false);
        } else {
          // If processing OAuth, set a timeout to avoid infinite loading
          // In case the OAuth callback fails silently
          setTimeout(() => {
            if (!authStateReceived) {
              console.log('OAuth callback timeout - no auth state received');
              setLoading(false);
            }
          }, 10000); // 10 second timeout
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
