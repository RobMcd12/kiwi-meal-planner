/**
 * LocalStorage Utilities
 *
 * Provides safe localStorage operations with quota error handling
 * and automatic cleanup when storage is full.
 */

// Keys that can be cleaned up to free space (in order of priority - least important first)
const CLEANUP_PRIORITY = [
  'kiwi_checked_items',           // Shopping list checkmarks - easily regenerated
  'kiwi_meal_planner_history',    // Meal plan history - nice to have but not critical
  'kiwi_supermarket_layouts',     // Supermarket layouts - can be recreated
  'kiwi_shopping_selections',     // Shopping selections - temporary
  'kiwi_timer_state',             // Timer state - session-specific
];

// Keys that should never be automatically cleaned up
const PROTECTED_KEYS = [
  'kiwi_meal_planner_favorites',
  'kiwi_meal_planner_preferences',
  'kiwi_meal_planner_config',
  'kiwi_meal_planner_pantry',
  'kiwi_meal_planner_saved_plans',
  'kiwi_app_version',
];

/**
 * Get the approximate size of localStorage in bytes
 */
export const getLocalStorageSize = (): number => {
  let total = 0;
  try {
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length * 2; // UTF-16 = 2 bytes per char
      }
    }
  } catch {
    // Ignore errors
  }
  return total;
};

/**
 * Get localStorage usage as a percentage (approximate, assumes 5MB limit)
 */
export const getLocalStorageUsagePercent = (): number => {
  const size = getLocalStorageSize();
  const maxSize = 5 * 1024 * 1024; // 5MB typical limit
  return Math.round((size / maxSize) * 100);
};

/**
 * Clean up localStorage to free space
 * @returns number of bytes freed
 */
export const cleanupLocalStorage = (): number => {
  const beforeSize = getLocalStorageSize();

  // Remove items in priority order until we've freed at least 500KB
  const targetFree = 500 * 1024;
  let freedSoFar = 0;

  for (const key of CLEANUP_PRIORITY) {
    try {
      const value = localStorage.getItem(key);
      if (value) {
        const itemSize = value.length * 2;
        localStorage.removeItem(key);
        freedSoFar += itemSize;
        console.log(`[Storage] Cleaned up ${key} (${Math.round(itemSize / 1024)}KB)`);

        if (freedSoFar >= targetFree) {
          break;
        }
      }
    } catch {
      // Continue with next item
    }
  }

  const afterSize = getLocalStorageSize();
  const totalFreed = beforeSize - afterSize;
  console.log(`[Storage] Total freed: ${Math.round(totalFreed / 1024)}KB`);

  return totalFreed;
};

/**
 * Safely set an item in localStorage with quota error handling
 * @returns true if successful, false if failed even after cleanup
 */
export const safeSetItem = (key: string, value: string): boolean => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    // Check if it's a quota error
    if (e instanceof DOMException && (
      e.code === 22 || // Legacy code
      e.code === 1014 || // Firefox
      e.name === 'QuotaExceededError' ||
      e.name === 'NS_ERROR_DOM_QUOTA_REACHED'
    )) {
      console.warn('[Storage] Quota exceeded, attempting cleanup...');

      // Try to clean up and retry
      const freed = cleanupLocalStorage();

      if (freed > 0) {
        try {
          localStorage.setItem(key, value);
          console.log('[Storage] Successfully saved after cleanup');
          return true;
        } catch {
          console.error('[Storage] Still failed after cleanup');
          return false;
        }
      }

      return false;
    }

    // Non-quota error
    console.error('[Storage] Error setting item:', e);
    return false;
  }
};

/**
 * Safely get an item from localStorage
 */
export const safeGetItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * Safely remove an item from localStorage
 */
export const safeRemoveItem = (key: string): boolean => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

/**
 * Check if localStorage is available
 */
export const isLocalStorageAvailable = (): boolean => {
  try {
    const test = '__storage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
};

/**
 * Get a breakdown of localStorage usage by key
 */
export const getStorageBreakdown = (): { key: string; sizeKB: number }[] => {
  const breakdown: { key: string; sizeKB: number }[] = [];

  try {
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        const size = localStorage[key].length * 2;
        breakdown.push({
          key,
          sizeKB: Math.round(size / 1024 * 10) / 10,
        });
      }
    }
  } catch {
    // Ignore errors
  }

  return breakdown.sort((a, b) => b.sizeKB - a.sizeKB);
};
