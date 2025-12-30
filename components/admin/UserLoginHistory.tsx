import React, { useState, useEffect } from 'react';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Clock,
  Loader2
} from 'lucide-react';
import { getUserLoginHistory, formatLoginTime, formatLoginLocation } from '../../services/loginHistoryService';
import type { LoginHistoryEntry, UserLoginSummary } from '../../types';

interface UserLoginHistoryProps {
  userId: string;
  userEmail: string;
  loginSummary: UserLoginSummary | null;
  isExpanded: boolean;
  onToggle: () => void;
}

const UserLoginHistory: React.FC<UserLoginHistoryProps> = ({
  userId,
  userEmail,
  loginSummary,
  isExpanded,
  onToggle
}) => {
  const [loginHistory, setLoginHistory] = useState<LoginHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (isExpanded && !hasLoaded) {
      loadHistory();
    }
  }, [isExpanded, hasLoaded]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const history = await getUserLoginHistory(userId, 20);
      setLoginHistory(history);
      setHasLoaded(true);
    } catch (err) {
      console.error('Error loading login history:', err);
    } finally {
      setLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string | null) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone size={14} className="text-slate-400" />;
      case 'tablet':
        return <Tablet size={14} className="text-slate-400" />;
      default:
        return <Monitor size={14} className="text-slate-400" />;
    }
  };

  const summaryText = loginSummary
    ? `${loginSummary.totalLogins} login${loginSummary.totalLogins !== 1 ? 's' : ''}`
    : '0 logins';

  const lastLoginText = loginSummary?.lastLoginAt
    ? `Last: ${formatLoginTime(loginSummary.lastLoginAt)}${loginSummary.lastLoginLocation ? ` (${loginSummary.lastLoginLocation})` : ''}`
    : 'Never logged in';

  return (
    <div className="mt-2">
      {/* Summary row - clickable to expand */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors text-left"
      >
        <div className="flex items-center gap-3 text-sm">
          <Clock size={14} className="text-slate-400" />
          <span className="text-slate-600">{summaryText}</span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-500">{lastLoginText}</span>
        </div>
        {isExpanded ? (
          <ChevronUp size={16} className="text-slate-400" />
        ) : (
          <ChevronDown size={16} className="text-slate-400" />
        )}
      </button>

      {/* Expanded history */}
      {isExpanded && (
        <div className="mt-2 ml-4 border-l-2 border-slate-200 pl-4">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 size={20} className="animate-spin text-emerald-600" />
            </div>
          ) : loginHistory.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">No login history found</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loginHistory.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-start gap-3 py-2 text-sm border-b border-slate-100 last:border-0"
                >
                  {/* Device icon */}
                  <div className="mt-0.5">
                    {getDeviceIcon(entry.deviceType)}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-700 font-medium">
                        {formatLoginTime(entry.loginAt)}
                      </span>
                      {entry.browser && entry.os && (
                        <span className="text-slate-400 text-xs">
                          {entry.browser}/{entry.os}
                        </span>
                      )}
                      {entry.loginMethod && (
                        <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-xs rounded capitalize">
                          {entry.loginMethod}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-slate-500">
                      {(entry.city || entry.country) && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} />
                          {formatLoginLocation(entry)}
                        </span>
                      )}
                      {entry.ipAddress && (
                        <span className="flex items-center gap-1">
                          <Globe size={12} />
                          {entry.ipAddress}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary stats */}
          {loginSummary && (loginSummary.devices.length > 0 || loginSummary.countries.length > 0) && (
            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 flex-wrap text-xs text-slate-500">
              {loginSummary.devices.length > 0 && (
                <span className="flex items-center gap-1">
                  <Monitor size={12} />
                  Devices: {loginSummary.devices.join(', ')}
                </span>
              )}
              {loginSummary.countries.length > 0 && (
                <span className="flex items-center gap-1">
                  <Globe size={12} />
                  Countries: {loginSummary.countries.join(', ')}
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UserLoginHistory;
