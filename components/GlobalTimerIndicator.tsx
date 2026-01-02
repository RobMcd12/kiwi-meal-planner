import React, { useState, useRef, useEffect } from 'react';
import { Timer, X, Pause, Play, Trash2, ChevronDown, Bell, BellOff } from 'lucide-react';
import { useTimer, CookingTimer } from '../contexts/TimerContext';

interface GlobalTimerIndicatorProps {
  className?: string;
}

const formatTime = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const GlobalTimerIndicator: React.FC<GlobalTimerIndicatorProps> = ({ className = '' }) => {
  const {
    activeTimers,
    hasActiveTimers,
    expiredTimers,
    pauseTimer,
    resumeTimer,
    removeTimer,
    dismissExpiredTimer,
    openRecipeForTimer
  } = useTimer();

  const [isExpanded, setIsExpanded] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsExpanded(false);
      }
    };

    if (isExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isExpanded]);

  // Auto-expand when a timer expires
  useEffect(() => {
    if (expiredTimers.length > 0 && !isExpanded) {
      setIsExpanded(true);
    }
  }, [expiredTimers.length]);

  if (!hasActiveTimers) {
    return null;
  }

  // Get the timer with the shortest remaining time (for display on the badge)
  const runningTimers = activeTimers.filter(t => t.isRunning && !t.isExpired);
  const shortestTimer = runningTimers.length > 0
    ? runningTimers.reduce((a, b) => a.remainingSeconds < b.remainingSeconds ? a : b)
    : null;

  const hasExpired = expiredTimers.length > 0;

  const handleTimerClick = (timer: CookingTimer) => {
    if (timer.recipeId) {
      openRecipeForTimer(timer.recipeId);
      setIsExpanded(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Timer Badge Button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`flex items-center gap-2 px-3 py-2 rounded-full font-medium text-sm transition-all ${
          hasExpired
            ? 'bg-red-500 text-white animate-pulse shadow-lg'
            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
        }`}
      >
        <Timer size={18} className={hasExpired ? 'animate-bounce' : ''} />
        {shortestTimer ? (
          <span className="font-mono">{formatTime(shortestTimer.remainingSeconds)}</span>
        ) : hasExpired ? (
          <span>Done!</span>
        ) : (
          <span>Paused</span>
        )}
        {activeTimers.length > 1 && (
          <span className={`px-1.5 py-0.5 text-xs rounded-full ${
            hasExpired ? 'bg-white/20' : 'bg-emerald-200'
          }`}>
            +{activeTimers.length - 1}
          </span>
        )}
        <ChevronDown
          size={16}
          className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Expanded Timer List */}
      {isExpanded && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Timer size={18} className="text-emerald-600" />
              Active Timers
            </h3>
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={18} className="text-slate-400" />
            </button>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {activeTimers.map((timer) => (
              <div
                key={timer.id}
                className={`p-4 border-b border-slate-100 last:border-b-0 ${
                  timer.isExpired ? 'bg-red-50' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div
                    className={`flex-1 ${timer.recipeId ? 'cursor-pointer hover:text-emerald-600' : ''}`}
                    onClick={() => handleTimerClick(timer)}
                  >
                    <p className="font-medium text-slate-800">{timer.name}</p>
                    {timer.recipeName && (
                      <p className="text-sm text-slate-500">{timer.recipeName}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className={`font-mono text-lg ${
                      timer.isExpired
                        ? 'text-red-600 font-bold'
                        : timer.remainingSeconds <= 60
                          ? 'text-amber-600'
                          : 'text-slate-800'
                    }`}>
                      {timer.isExpired ? 'DONE!' : formatTime(timer.remainingSeconds)}
                    </p>
                    {!timer.isRunning && !timer.isExpired && (
                      <p className="text-xs text-slate-400">Paused</p>
                    )}
                  </div>
                </div>

                {/* Timer Controls */}
                <div className="flex items-center gap-2 mt-3">
                  {timer.isExpired ? (
                    <button
                      onClick={() => dismissExpiredTimer(timer.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium text-sm"
                    >
                      <Bell size={16} />
                      Dismiss
                    </button>
                  ) : timer.isRunning ? (
                    <button
                      onClick={() => pauseTimer(timer.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-medium text-sm"
                    >
                      <Pause size={16} />
                      Pause
                    </button>
                  ) : (
                    <button
                      onClick={() => resumeTimer(timer.id)}
                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-colors font-medium text-sm"
                    >
                      <Play size={16} />
                      Resume
                    </button>
                  )}
                  <button
                    onClick={() => removeTimer(timer.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete timer"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {activeTimers.length === 0 && (
            <div className="p-6 text-center text-slate-500">
              No active timers
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GlobalTimerIndicator;
