import React from 'react';
import { Lock, Crown } from 'lucide-react';

interface ProFeatureLockProps {
  children: React.ReactNode;
  hasPro: boolean;
  featureName?: string;
  onUpgradeClick?: () => void;
  className?: string;
  overlayClassName?: string;
  showBadge?: boolean;
}

/**
 * Wrapper component that locks Pro features for free users.
 * Shows a greyed-out overlay with "Upgrade to Pro" when user doesn't have Pro.
 */
const ProFeatureLock: React.FC<ProFeatureLockProps> = ({
  children,
  hasPro,
  featureName,
  onUpgradeClick,
  className = '',
  overlayClassName = '',
  showBadge = true
}) => {
  // If user has Pro, just render the children normally
  if (hasPro) {
    return (
      <div className={`relative ${className}`}>
        {children}
        {showBadge && (
          <span className="absolute top-0 right-0 -mt-1 -mr-1 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full shadow-sm flex items-center gap-0.5">
            <Crown size={10} />
            PRO
          </span>
        )}
      </div>
    );
  }

  // User doesn't have Pro - show locked state
  return (
    <div className={`relative ${className}`}>
      {/* Greyed-out content */}
      <div className="opacity-40 pointer-events-none select-none filter grayscale">
        {children}
      </div>

      {/* Lock overlay */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-center bg-slate-900/10 backdrop-blur-[1px] rounded-xl cursor-pointer transition-all hover:bg-slate-900/15 ${overlayClassName}`}
        onClick={onUpgradeClick}
      >
        <div className="flex flex-col items-center gap-2 px-4 py-3 bg-white/95 rounded-xl shadow-lg border border-slate-200">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg">
              <Lock size={14} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-700">
              {featureName || 'Pro Feature'}
            </span>
          </div>
          <button
            className="px-3 py-1.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white text-xs font-medium rounded-lg transition-all shadow-sm"
            onClick={(e) => {
              e.stopPropagation();
              onUpgradeClick?.();
            }}
          >
            Upgrade to Pro
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Simple Pro badge component
 */
export const ProBadge: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full ${className}`}>
    <Crown size={10} />
    PRO
  </span>
);

/**
 * Inline lock indicator for smaller UI elements
 */
export const InlineLock: React.FC<{
  hasPro: boolean;
  onUpgradeClick?: () => void;
}> = ({ hasPro, onUpgradeClick }) => {
  if (hasPro) return null;

  return (
    <button
      onClick={onUpgradeClick}
      className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-500 text-xs font-medium rounded-lg transition-colors"
      title="Upgrade to Pro to unlock"
    >
      <Lock size={12} />
      <span>Pro</span>
    </button>
  );
};

export default ProFeatureLock;
