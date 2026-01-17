import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Reusable skeleton loading placeholder component.
 * Use to show loading states while content is being fetched.
 */
const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-slate-200';

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-shimmer bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%]',
    none: '',
  };

  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`${baseClasses} ${animationClasses[animation]} ${variantClasses[variant]} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
};

/**
 * Skeleton card for recipe/meal items
 */
export const SkeletonCard: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white rounded-xl border border-slate-100 p-4 ${className}`}>
    <div className="flex gap-4">
      <Skeleton variant="rounded" width={80} height={80} />
      <div className="flex-1 space-y-3">
        <Skeleton variant="text" width="60%" height={20} />
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="40%" />
      </div>
    </div>
  </div>
);

/**
 * Skeleton for a list of items
 */
export const SkeletonList: React.FC<{ count?: number; className?: string }> = ({
  count = 3,
  className = ''
}) => (
  <div className={`space-y-4 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

/**
 * Skeleton for plan/recipe grid
 */
export const SkeletonGrid: React.FC<{ count?: number; className?: string }> = ({
  count = 6,
  className = ''
}) => (
  <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="bg-white rounded-xl border border-slate-100 p-4 space-y-3">
        <Skeleton variant="rounded" width="100%" height={140} />
        <Skeleton variant="text" width="70%" height={20} />
        <Skeleton variant="text" width="50%" />
      </div>
    ))}
  </div>
);

/**
 * Inline skeleton for text content
 */
export const SkeletonText: React.FC<{ lines?: number; className?: string }> = ({
  lines = 3,
  className = ''
}) => (
  <div className={`space-y-2 ${className}`}>
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton
        key={i}
        variant="text"
        width={i === lines - 1 ? '60%' : '100%'}
      />
    ))}
  </div>
);

export default Skeleton;
