import { useAuth } from '../components/AuthProvider';

interface EffectiveUser {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
}

interface UseEffectiveUserResult {
  /** The effective user ID - impersonated user's ID or actual user's ID */
  effectiveUserId: string | null;
  /** The effective user object with basic info */
  effectiveUser: EffectiveUser | null;
  /** Whether an admin is currently impersonating another user */
  isImpersonating: boolean;
  /** The actual authenticated user (never changes during impersonation) */
  realUser: ReturnType<typeof useAuth>['user'];
  /** The impersonated user details (null if not impersonating) */
  impersonatedUser: ReturnType<typeof useAuth>['impersonatedUser'];
}

/**
 * Hook that returns the "effective user" - either the impersonated user
 * (if an admin is impersonating) or the actual authenticated user.
 *
 * Use this hook in components that need to fetch user-specific data
 * to ensure they show the correct data during impersonation.
 *
 * @example
 * ```tsx
 * const { effectiveUserId, isImpersonating } = useEffectiveUser();
 *
 * useEffect(() => {
 *   if (effectiveUserId) {
 *     loadUserData(effectiveUserId);
 *   }
 * }, [effectiveUserId]);
 *
 * // Optionally show read-only indicator
 * if (isImpersonating) {
 *   // Show warning or disable edit buttons
 * }
 * ```
 */
export const useEffectiveUser = (): UseEffectiveUserResult => {
  const { user, impersonatedUser, isImpersonating, effectiveUserId } = useAuth();

  // Build the effective user object
  const effectiveUser: EffectiveUser | null = isImpersonating && impersonatedUser
    ? {
        id: impersonatedUser.id,
        email: impersonatedUser.email,
        fullName: impersonatedUser.fullName,
        avatarUrl: impersonatedUser.avatarUrl,
      }
    : user
    ? {
        id: user.id,
        email: user.email ?? '',
        fullName: user.user_metadata?.full_name ?? null,
        avatarUrl: user.user_metadata?.avatar_url ?? null,
      }
    : null;

  return {
    effectiveUserId,
    effectiveUser,
    isImpersonating,
    realUser: user,
    impersonatedUser,
  };
};

export default useEffectiveUser;
