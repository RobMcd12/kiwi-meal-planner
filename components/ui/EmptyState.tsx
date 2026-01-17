import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  iconClassName?: string;
}

/**
 * Reusable empty state component for when there's no data to display.
 * Provides consistent UX across the app with icon, title, description, and optional CTA.
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  iconClassName = 'text-slate-400',
}) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
      <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
        <Icon className={iconClassName} size={32} />
      </div>
      <h3 className="text-lg font-semibold text-slate-700 mb-2">{title}</h3>
      <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
        {description}
      </p>
      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          {action && (
            <button
              onClick={action.onClick}
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors min-w-[120px] min-h-[44px]"
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors min-w-[120px] min-h-[44px]"
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EmptyState;
