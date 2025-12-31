import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, onAuthStateChange, isSupabaseConfigured } from '../services/authService';
import { checkIsAdmin, isSuperAdmin } from '../services/adminService';
import { recordLogin } from '../services/loginHistoryService';

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
        setLoading(false);
      }
    };

    initAuth();

    // Subscribe to auth changes
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
    });

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
