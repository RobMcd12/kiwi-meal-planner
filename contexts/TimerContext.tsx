import React, { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import {
  StoredTimer,
  loadTimers,
  saveTimers,
  calculateRemainingTime,
  isTimerExpired,
  showTimerNotification,
  hasAskedNotificationPermission,
  getNotificationPermission
} from '../services/timerStorageService';

export interface CookingTimer extends StoredTimer {
  remainingSeconds: number;
  isExpired: boolean;
}

interface TimerContextType {
  activeTimers: CookingTimer[];
  addTimer: (name: string, durationSeconds: number, recipeId?: string, recipeName?: string) => string;
  removeTimer: (id: string) => void;
  pauseTimer: (id: string) => void;
  resumeTimer: (id: string) => void;
  hasActiveTimers: boolean;
  expiredTimers: CookingTimer[];
  dismissExpiredTimer: (id: string) => void;
  shouldShowPermissionPrompt: boolean;
  dismissPermissionPrompt: () => void;
  openRecipeForTimer: (recipeId: string) => void;
  onOpenRecipe?: (recipeId: string) => void;
  setOnOpenRecipe: (handler: ((recipeId: string) => void) | undefined) => void;
}

const TimerContext = createContext<TimerContextType>({
  activeTimers: [],
  addTimer: () => '',
  removeTimer: () => {},
  pauseTimer: () => {},
  resumeTimer: () => {},
  hasActiveTimers: false,
  expiredTimers: [],
  dismissExpiredTimer: () => {},
  shouldShowPermissionPrompt: false,
  dismissPermissionPrompt: () => {},
  openRecipeForTimer: () => {},
  setOnOpenRecipe: () => {}
});

interface TimerProviderProps {
  children: ReactNode;
}

export const TimerProvider: React.FC<TimerProviderProps> = ({ children }) => {
  const [storedTimers, setStoredTimers] = useState<StoredTimer[]>([]);
  const [dismissedExpiredIds, setDismissedExpiredIds] = useState<Set<string>>(new Set());
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);
  const [permissionPromptDismissed, setPermissionPromptDismissed] = useState(false);
  const onOpenRecipeRef = useRef<((recipeId: string) => void) | undefined>(undefined);
  const notifiedTimersRef = useRef<Set<string>>(new Set());
  const tickIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [tick, setTick] = useState(0);

  // Load timers from storage on mount
  useEffect(() => {
    const loaded = loadTimers();
    setStoredTimers(loaded);

    // Check if we should show permission prompt
    const permission = getNotificationPermission();
    const hasAsked = hasAskedNotificationPermission();
    if (loaded.length > 0 && permission === 'default' && !hasAsked) {
      setShowPermissionPrompt(true);
    }
  }, []);

  // Save timers to storage whenever they change
  useEffect(() => {
    saveTimers(storedTimers);
  }, [storedTimers]);

  // Start tick interval when there are active timers
  useEffect(() => {
    const hasRunning = storedTimers.some(t => t.isRunning);

    if (hasRunning && !tickIntervalRef.current) {
      tickIntervalRef.current = setInterval(() => {
        setTick(t => t + 1);
      }, 1000);
    } else if (!hasRunning && tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }

    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
        tickIntervalRef.current = null;
      }
    };
  }, [storedTimers]);

  // Calculate enriched timers with remaining time
  const activeTimers: CookingTimer[] = storedTimers.map(timer => ({
    ...timer,
    remainingSeconds: calculateRemainingTime(timer),
    isExpired: isTimerExpired(timer)
  }));

  // Check for newly expired timers and show notifications
  useEffect(() => {
    activeTimers.forEach(timer => {
      if (timer.isExpired && timer.isRunning && !notifiedTimersRef.current.has(timer.id)) {
        notifiedTimersRef.current.add(timer.id);
        showTimerNotification(timer.name, timer.recipeName);

        // Mark as not running since it's done
        setStoredTimers(prev =>
          prev.map(t => t.id === timer.id ? { ...t, isRunning: false } : t)
        );
      }
    });
  }, [activeTimers, tick]);

  // Expired timers that haven't been dismissed
  const expiredTimers = activeTimers.filter(
    t => t.isExpired && !dismissedExpiredIds.has(t.id)
  );

  const addTimer = useCallback((
    name: string,
    durationSeconds: number,
    recipeId?: string,
    recipeName?: string
  ): string => {
    const id = crypto.randomUUID();
    const newTimer: StoredTimer = {
      id,
      name,
      recipeId,
      recipeName,
      durationSeconds,
      startedAt: Date.now(),
      isRunning: true
    };

    setStoredTimers(prev => [...prev, newTimer]);

    // Show permission prompt if we haven't asked yet
    const permission = getNotificationPermission();
    const hasAsked = hasAskedNotificationPermission();
    if (permission === 'default' && !hasAsked && !permissionPromptDismissed) {
      setShowPermissionPrompt(true);
    }

    return id;
  }, [permissionPromptDismissed]);

  const removeTimer = useCallback((id: string) => {
    setStoredTimers(prev => prev.filter(t => t.id !== id));
    notifiedTimersRef.current.delete(id);
    setDismissedExpiredIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);

  const pauseTimer = useCallback((id: string) => {
    setStoredTimers(prev => prev.map(timer => {
      if (timer.id === id && timer.isRunning) {
        const remaining = calculateRemainingTime(timer);
        return {
          ...timer,
          isRunning: false,
          pausedAt: Date.now(),
          remainingAtPause: remaining
        };
      }
      return timer;
    }));
  }, []);

  const resumeTimer = useCallback((id: string) => {
    setStoredTimers(prev => prev.map(timer => {
      if (timer.id === id && !timer.isRunning && timer.remainingAtPause !== undefined) {
        const now = Date.now();
        const newStartedAt = now - ((timer.durationSeconds - timer.remainingAtPause) * 1000);
        return {
          ...timer,
          isRunning: true,
          startedAt: newStartedAt,
          pausedAt: undefined,
          remainingAtPause: undefined
        };
      }
      return timer;
    }));
  }, []);

  const dismissExpiredTimer = useCallback((id: string) => {
    setDismissedExpiredIds(prev => new Set(prev).add(id));
    // Also remove from storage since it's been acknowledged
    removeTimer(id);
  }, [removeTimer]);

  const dismissPermissionPrompt = useCallback(() => {
    setShowPermissionPrompt(false);
    setPermissionPromptDismissed(true);
  }, []);

  const openRecipeForTimer = useCallback((recipeId: string) => {
    if (onOpenRecipeRef.current) {
      onOpenRecipeRef.current(recipeId);
    }
  }, []);

  const setOnOpenRecipe = useCallback((handler: ((recipeId: string) => void) | undefined) => {
    onOpenRecipeRef.current = handler;
  }, []);

  const hasActiveTimers = activeTimers.length > 0;
  const shouldShowPermissionPrompt = showPermissionPrompt && !permissionPromptDismissed;

  const value: TimerContextType = {
    activeTimers,
    addTimer,
    removeTimer,
    pauseTimer,
    resumeTimer,
    hasActiveTimers,
    expiredTimers,
    dismissExpiredTimer,
    shouldShowPermissionPrompt,
    dismissPermissionPrompt,
    openRecipeForTimer,
    setOnOpenRecipe
  };

  return (
    <TimerContext.Provider value={value}>
      {children}
    </TimerContext.Provider>
  );
};

/**
 * Hook to access timer context
 */
export const useTimer = (): TimerContextType => {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error('useTimer must be used within a TimerProvider');
  }
  return context;
};

export default TimerProvider;
