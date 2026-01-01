import React from 'react';
import { Eye, X, AlertTriangle } from 'lucide-react';
import { useAuth } from './AuthProvider';

/**
 * Floating banner shown when an admin is impersonating another user.
 * Displays at the top of the page with the impersonated user's info
 * and an exit button to stop impersonation.
 */
const ImpersonationBanner: React.FC = () => {
  const { impersonatedUser, isImpersonating, stopImpersonation } = useAuth();

  if (!isImpersonating || !impersonatedUser) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-amber-900 py-2 px-4 shadow-lg">
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Eye size={20} className="flex-shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium whitespace-nowrap">Viewing as:</span>
            <span className="font-bold truncate">
              {impersonatedUser.fullName || impersonatedUser.email}
            </span>
            {impersonatedUser.fullName && (
              <span className="text-amber-700 text-sm truncate hidden sm:inline">
                ({impersonatedUser.email})
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="hidden md:flex items-center gap-1.5 text-amber-700 text-sm">
            <AlertTriangle size={14} />
            <span>Read-only mode</span>
          </div>

          <button
            onClick={stopImpersonation}
            className="flex items-center gap-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors text-sm"
          >
            <X size={16} />
            <span className="hidden sm:inline">Exit Impersonation</span>
            <span className="sm:hidden">Exit</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImpersonationBanner;
