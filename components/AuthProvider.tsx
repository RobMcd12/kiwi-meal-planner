import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, onAuthStateChange, isSupabaseConfigured } from '../services/authService';
import { checkIsAdmin, isSuperAdmin } from '../services/adminService';

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

  // Function to check and update admin status
  const refreshAdminStatus = async () => {
    if (user) {
      const adminStatus = await checkIsAdmin(user.id, user.email ?? undefined);
      setIsAdmin(adminStatus);
    } else {
      setIsAdmin(false);
    }
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
      } else {
        setIsAdmin(false);
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
