import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh?: () => Promise<void> | void;
  threshold?: number;
  children?: React.ReactNode;
}

/**
 * Pull-to-refresh component for iOS PWA
 * Detects when user pulls down at the top of the page and triggers a refresh
 */
const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  threshold = 100,
}) => {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPulling, setIsPulling] = useState(false);

  const startYRef = useRef(0);
  const currentYRef = useRef(0);
  const isPullingRef = useRef(false);
  const canPullRef = useRef(false);

  // Check if we're running as a PWA on iOS
  const isIOSPWA = useCallback(() => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    return isIOS && isStandalone;
  }, []);

  // Check if we're at the top of the page (with small tolerance)
  const isAtTop = useCallback(() => {
    return window.scrollY <= 5;
  }, []);

  const handleTouchStart = useCallback((e: TouchEvent) => {
    // Check if at top at the start of touch
    canPullRef.current = isAtTop();
    if (!canPullRef.current) return;

    startYRef.current = e.touches[0].clientY;
    currentYRef.current = startYRef.current;
  }, [isAtTop]);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isRefreshing) return;
    if (!canPullRef.current) return;

    currentYRef.current = e.touches[0].clientY;
    const distance = currentYRef.current - startYRef.current;

    // Only activate pull-to-refresh when pulling down
    if (distance > 0) {
      // Double check we're still at top (user might have scrolled up to reach top)
      if (!isAtTop() && !isPullingRef.current) {
        canPullRef.current = false;
        return;
      }

      // Apply resistance factor for natural feel (more resistance = slower pull)
      const resistedDistance = Math.min(distance * 0.4, threshold * 1.5);

      // Start pull mode after a small threshold to avoid accidental triggers
      if (!isPullingRef.current && resistedDistance > 15) {
        isPullingRef.current = true;
        setIsPulling(true);
        // Lock scroll position
        document.body.style.overflow = 'hidden';
      }

      if (isPullingRef.current) {
        setPullDistance(resistedDistance);
        // Prevent default scroll behavior when pulling
        e.preventDefault();
      }
    }
  }, [isRefreshing, isAtTop, threshold]);

  const handleTouchEnd = useCallback(async () => {
    // Restore scroll
    document.body.style.overflow = '';

    if (!isPullingRef.current) return;

    if (pullDistance >= threshold && !isRefreshing) {
      setIsRefreshing(true);

      try {
        if (onRefresh) {
          await onRefresh();
        } else {
          // Default behavior: reload the page
          window.location.reload();
        }
      } catch (error) {
        console.error('Refresh failed:', error);
      }

      // Small delay before resetting to show completion
      setTimeout(() => {
        setIsRefreshing(false);
        setPullDistance(0);
        setIsPulling(false);
        isPullingRef.current = false;
        canPullRef.current = false;
      }, 500);
    } else {
      // Reset if threshold not met
      setPullDistance(0);
      setIsPulling(false);
      isPullingRef.current = false;
      canPullRef.current = false;
    }
  }, [pullDistance, threshold, isRefreshing, onRefresh]);

  useEffect(() => {
    // Enable for iOS PWA and all mobile browsers
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const shouldEnable = isIOSPWA() || isMobile;

    if (!shouldEnable) return;

    // Use non-passive for touchmove to allow preventDefault
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });
    document.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
      // Ensure scroll is restored on cleanup
      document.body.style.overflow = '';
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, isIOSPWA]);

  const isReady = pullDistance >= threshold;

  // Calculate progress for visual feedback
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 180;

  if (!isPulling && !isRefreshing) return null;

  return (
    <div
      className={`pull-to-refresh-container ${isPulling || isRefreshing ? 'pulling' : ''}`}
      style={{
        transform: `translateY(${Math.min(pullDistance, threshold * 1.2)}px)`,
      }}
    >
      <div
        className={`pull-to-refresh-indicator ${isReady ? 'ready' : ''} ${isRefreshing ? 'refreshing' : ''}`}
        style={{
          opacity: Math.min(progress + 0.3, 1),
        }}
      >
        {isRefreshing ? (
          <RefreshCw className="animate-spin" />
        ) : (
          <ArrowDown
            style={{
              transform: `rotate(${rotation}deg)`,
              transition: 'transform 0.1s ease-out'
            }}
          />
        )}
      </div>
    </div>
  );
};

export default PullToRefresh;
