/**
 * Timer Storage Service
 * Handles localStorage persistence for cooking timers
 */

const TIMER_STORAGE_KEY = 'kiwi_cooking_timers';
const NOTIFICATION_PERMISSION_KEY = 'kiwi_notification_permission_asked';

export interface StoredTimer {
  id: string;
  name: string;
  recipeId?: string;       // Link to recipe for reopening
  recipeName?: string;     // Display name
  durationSeconds: number;
  startedAt: number;       // timestamp when timer started
  pausedAt?: number;       // timestamp when paused (if paused)
  remainingAtPause?: number; // remaining seconds when paused
  isRunning: boolean;
}

/**
 * Save timers to localStorage
 */
export const saveTimers = (timers: StoredTimer[]): void => {
  try {
    localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timers));
  } catch (error) {
    console.error('Failed to save timers:', error);
  }
};

/**
 * Load timers from localStorage
 */
export const loadTimers = (): StoredTimer[] => {
  try {
    const stored = localStorage.getItem(TIMER_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load timers:', error);
  }
  return [];
};

/**
 * Clear all timers from localStorage
 */
export const clearTimers = (): void => {
  try {
    localStorage.removeItem(TIMER_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear timers:', error);
  }
};

/**
 * Calculate remaining time for a timer
 * Returns seconds remaining, or 0 if expired
 */
export const calculateRemainingTime = (timer: StoredTimer): number => {
  if (!timer.isRunning) {
    // Timer is paused, return the remaining time at pause
    return timer.remainingAtPause ?? timer.durationSeconds;
  }

  const now = Date.now();
  const elapsed = Math.floor((now - timer.startedAt) / 1000);
  const remaining = timer.durationSeconds - elapsed;

  return Math.max(0, remaining);
};

/**
 * Check if a timer has expired
 */
export const isTimerExpired = (timer: StoredTimer): boolean => {
  return calculateRemainingTime(timer) <= 0;
};

/**
 * Add a new timer
 */
export const addTimer = (timer: StoredTimer): StoredTimer[] => {
  const timers = loadTimers();
  timers.push(timer);
  saveTimers(timers);
  return timers;
};

/**
 * Remove a timer by ID
 */
export const removeTimer = (timerId: string): StoredTimer[] => {
  const timers = loadTimers();
  const filtered = timers.filter(t => t.id !== timerId);
  saveTimers(filtered);
  return filtered;
};

/**
 * Update a timer
 */
export const updateTimer = (timerId: string, updates: Partial<StoredTimer>): StoredTimer[] => {
  const timers = loadTimers();
  const updated = timers.map(t =>
    t.id === timerId ? { ...t, ...updates } : t
  );
  saveTimers(updated);
  return updated;
};

/**
 * Pause a timer
 */
export const pauseTimer = (timerId: string): StoredTimer[] => {
  const timers = loadTimers();
  const timer = timers.find(t => t.id === timerId);

  if (timer && timer.isRunning) {
    const remaining = calculateRemainingTime(timer);
    return updateTimer(timerId, {
      isRunning: false,
      pausedAt: Date.now(),
      remainingAtPause: remaining
    });
  }

  return timers;
};

/**
 * Resume a paused timer
 */
export const resumeTimer = (timerId: string): StoredTimer[] => {
  const timers = loadTimers();
  const timer = timers.find(t => t.id === timerId);

  if (timer && !timer.isRunning && timer.remainingAtPause !== undefined) {
    // Calculate new startedAt based on remaining time
    const now = Date.now();
    const newStartedAt = now - ((timer.durationSeconds - timer.remainingAtPause) * 1000);

    return updateTimer(timerId, {
      isRunning: true,
      startedAt: newStartedAt,
      pausedAt: undefined,
      remainingAtPause: undefined
    });
  }

  return timers;
};

/**
 * Check if notification permission has been asked
 */
export const hasAskedNotificationPermission = (): boolean => {
  return localStorage.getItem(NOTIFICATION_PERMISSION_KEY) === 'true';
};

/**
 * Mark notification permission as asked
 */
export const markNotificationPermissionAsked = (): void => {
  localStorage.setItem(NOTIFICATION_PERMISSION_KEY, 'true');
};

/**
 * Request notification permission
 * Returns true if granted
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.log('Notifications not supported');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission === 'denied') {
    return false;
  }

  const permission = await Notification.requestPermission();
  markNotificationPermissionAsked();
  return permission === 'granted';
};

/**
 * Show a notification for timer completion
 */
export const showTimerNotification = (timerName: string, recipeName?: string): void => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const title = 'Timer Complete!';
  const body = recipeName
    ? `${timerName} for "${recipeName}" is done!`
    : `${timerName} is done!`;

  try {
    const notification = new Notification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'timer-complete',
      requireInteraction: true
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (error) {
    console.error('Failed to show notification:', error);
  }
};

/**
 * Check notification permission status
 */
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission;
};
