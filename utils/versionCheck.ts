/**
 * Version Check Utility
 *
 * Forces a hard refresh when a new app version is detected.
 * This ensures users get the latest code after a deployment.
 */

import { safeSetItem, safeGetItem } from './localStorageUtils';

// Injected at build time by Vite
declare const __APP_VERSION__: string;

const VERSION_STORAGE_KEY = 'kiwi_app_version';

/**
 * Get the current app version from the build
 */
export const getCurrentVersion = (): string => {
  try {
    return __APP_VERSION__;
  } catch {
    return 'unknown';
  }
};

/**
 * Get the stored version from localStorage
 */
export const getStoredVersion = (): string | null => {
  return safeGetItem(VERSION_STORAGE_KEY);
};

/**
 * Store the current version in localStorage
 */
export const storeVersion = (version: string): void => {
  safeSetItem(VERSION_STORAGE_KEY, version);
};

/**
 * Check if a new version is available and force refresh if needed.
 * Call this on app initialization.
 *
 * @returns true if a refresh was triggered, false otherwise
 */
export const checkVersionAndRefresh = (): boolean => {
  const currentVersion = getCurrentVersion();
  const storedVersion = getStoredVersion();

  // If no stored version, this is first visit - just store it
  if (!storedVersion) {
    storeVersion(currentVersion);
    console.log('[Version] First visit, storing version:', currentVersion);
    return false;
  }

  // If versions match, no refresh needed
  if (storedVersion === currentVersion) {
    console.log('[Version] Version unchanged:', currentVersion);
    return false;
  }

  // New version detected - store it and force refresh
  console.log('[Version] New version detected!');
  console.log('[Version] Old:', storedVersion);
  console.log('[Version] New:', currentVersion);

  // Store the new version first to prevent refresh loops
  storeVersion(currentVersion);

  // Clear service worker caches to ensure fresh content
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        console.log('[Version] Clearing cache:', name);
        caches.delete(name);
      });
    });
  }

  // Unregister service workers to prevent serving stale content
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        console.log('[Version] Unregistering service worker');
        registration.unregister();
      });
    });
  }

  // Force a hard refresh (bypass cache)
  console.log('[Version] Forcing hard refresh...');

  // Small delay to allow cache clearing to complete
  setTimeout(() => {
    // Use location.reload(true) for hard refresh, with fallback
    // Note: The 'true' parameter is deprecated but still works in most browsers
    window.location.reload();
  }, 100);

  return true;
};

/**
 * Initialize version checking.
 * Should be called once at app startup.
 */
export const initVersionCheck = (): void => {
  // Check version immediately
  const refreshTriggered = checkVersionAndRefresh();

  // If refresh was triggered, don't continue with other checks
  if (refreshTriggered) {
    return;
  }

  // Also check when the page becomes visible (user returns to tab)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      // Don't auto-refresh on visibility change, just log
      // This prevents disruptive refreshes while user is working
      const currentVersion = getCurrentVersion();
      const storedVersion = getStoredVersion();

      if (storedVersion && storedVersion !== currentVersion) {
        console.log('[Version] New version available on next page load');
      }
    }
  });
};
