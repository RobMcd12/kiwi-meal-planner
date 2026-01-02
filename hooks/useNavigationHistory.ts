import { useEffect, useCallback, useRef } from 'react';
import { AppStep } from '../types';

// Map AppStep to URL paths
const stepToPath: Record<AppStep, string> = {
  [AppStep.LANDING]: '/',
  [AppStep.AUTH]: '/auth',
  [AppStep.WELCOME]: '/home',
  [AppStep.CONFIG]: '/plan/config',
  [AppStep.PANTRY]: '/plan/pantry',
  [AppStep.PREFERENCES]: '/plan/preferences',
  [AppStep.RESULTS]: '/plan/results',
  [AppStep.FAVORITES]: '/cookbook',
  [AppStep.SETTINGS]: '/settings',
  [AppStep.ADMIN]: '/admin',
  [AppStep.MY_FEEDBACK]: '/feedback',
  [AppStep.SAVED_PLANS]: '/saved-plans',
  [AppStep.SINGLE_RECIPE]: '/recipe',
  [AppStep.SHOPPING_LIST]: '/shopping-list',
  [AppStep.FEATURES]: '/features',
};

// Check if current URL is an OAuth callback
// With PKCE flow, the callback may be at the root with hash params or query params
export const isOAuthCallback = (): boolean => {
  const path = window.location.pathname;
  const hash = window.location.hash;
  const search = window.location.search;

  // Check for explicit callback path
  if (path === '/auth/callback' || path.startsWith('/auth/callback')) {
    return true;
  }

  // Check for OAuth tokens in hash (implicit flow fallback)
  if (hash && (hash.includes('access_token=') || hash.includes('error='))) {
    return true;
  }

  // Check for PKCE code in query params
  if (search && search.includes('code=')) {
    return true;
  }

  return false;
};

// Reverse mapping: URL path to AppStep
const pathToStep: Record<string, AppStep> = Object.entries(stepToPath).reduce(
  (acc, [step, path]) => ({ ...acc, [path]: step as AppStep }),
  {} as Record<string, AppStep>
);

interface UseNavigationHistoryOptions {
  step: AppStep;
  setStep: (step: AppStep) => void;
  isAuthenticated: boolean;
}

export function useNavigationHistory({
  step,
  setStep,
  isAuthenticated,
}: UseNavigationHistoryOptions) {
  // Track if we're handling a popstate event to avoid pushing duplicate history
  const isHandlingPopState = useRef(false);
  // Track the last step we pushed to history
  const lastPushedStep = useRef<AppStep | null>(null);
  // Track if this is the initial mount
  const isInitialMount = useRef(true);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      isHandlingPopState.current = true;

      if (event.state?.step) {
        const targetStep = event.state.step as AppStep;

        // Validate the step is accessible
        // If not authenticated, only allow LANDING and AUTH
        if (!isAuthenticated && targetStep !== AppStep.LANDING && targetStep !== AppStep.AUTH) {
          // Redirect to landing
          window.history.replaceState({ step: AppStep.LANDING }, '', '/');
          setStep(AppStep.LANDING);
        } else {
          setStep(targetStep);
        }
      } else {
        // No state, try to parse from URL
        const path = window.location.pathname;
        const matchedStep = pathToStep[path];

        if (matchedStep) {
          if (!isAuthenticated && matchedStep !== AppStep.LANDING && matchedStep !== AppStep.AUTH) {
            window.history.replaceState({ step: AppStep.LANDING }, '', '/');
            setStep(AppStep.LANDING);
          } else {
            setStep(matchedStep);
          }
        } else {
          // Unknown path, go to appropriate default
          const defaultStep = isAuthenticated ? AppStep.WELCOME : AppStep.LANDING;
          window.history.replaceState({ step: defaultStep }, '', stepToPath[defaultStep]);
          setStep(defaultStep);
        }
      }

      // Reset flag after a short delay to ensure state updates complete
      setTimeout(() => {
        isHandlingPopState.current = false;
      }, 50);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [isAuthenticated, setStep]);

  // Push to history when step changes (but not on initial mount or popstate)
  useEffect(() => {
    // Skip on initial mount - we'll handle that separately
    if (isInitialMount.current) {
      isInitialMount.current = false;

      // On initial mount, replace current state with the current step
      const path = stepToPath[step];
      window.history.replaceState({ step }, '', path);
      lastPushedStep.current = step;
      return;
    }

    // Skip if we're handling a popstate event
    if (isHandlingPopState.current) {
      return;
    }

    // Skip if this is the same step we just pushed
    if (lastPushedStep.current === step) {
      return;
    }

    // Push new state
    const path = stepToPath[step];
    window.history.pushState({ step }, '', path);
    lastPushedStep.current = step;
  }, [step]);

  // Navigate to a step programmatically (use this for custom navigation that should add history)
  const navigateTo = useCallback((targetStep: AppStep, options?: { replace?: boolean }) => {
    const path = stepToPath[targetStep];

    if (options?.replace) {
      window.history.replaceState({ step: targetStep }, '', path);
    } else {
      window.history.pushState({ step: targetStep }, '', path);
    }

    lastPushedStep.current = targetStep;
    setStep(targetStep);
  }, [setStep]);

  // Go back in history
  const goBack = useCallback(() => {
    window.history.back();
  }, []);

  // Go forward in history
  const goForward = useCallback(() => {
    window.history.forward();
  }, []);

  return {
    navigateTo,
    goBack,
    goForward,
    currentPath: stepToPath[step],
  };
}

export { stepToPath, pathToStep };
