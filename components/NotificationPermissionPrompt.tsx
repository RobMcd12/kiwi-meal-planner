import React, { useState } from 'react';
import { Bell, BellOff, X, Timer, ChefHat } from 'lucide-react';
import { useTimer } from '../contexts/TimerContext';
import { requestNotificationPermission, markNotificationPermissionAsked } from '../services/timerStorageService';

interface NotificationPermissionPromptProps {
  onClose?: () => void;
}

const NotificationPermissionPrompt: React.FC<NotificationPermissionPromptProps> = ({ onClose }) => {
  const { shouldShowPermissionPrompt, dismissPermissionPrompt } = useTimer();
  const [isRequesting, setIsRequesting] = useState(false);

  if (!shouldShowPermissionPrompt) {
    return null;
  }

  const handleEnable = async () => {
    setIsRequesting(true);
    try {
      await requestNotificationPermission();
    } catch (error) {
      console.error('Failed to request notification permission:', error);
    }
    setIsRequesting(false);
    dismissPermissionPrompt();
    onClose?.();
  };

  const handleMaybeLater = () => {
    markNotificationPermissionAsked();
    dismissPermissionPrompt();
    onClose?.();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-scaleIn">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-teal-500 p-6 text-white">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Bell size={32} />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg">
                <Timer size={18} className="text-emerald-600" />
              </div>
            </div>
          </div>
          <h2 className="text-xl font-bold text-center">Never Miss a Timer!</h2>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <p className="text-slate-600 text-center">
            Enable notifications to get alerts when your cooking timers are done, even when the app is in the background.
          </p>

          <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <ChefHat size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-slate-800">Perfect Timing</p>
                <p className="text-sm text-slate-500">
                  Get notified exactly when your dish is ready
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Timer size={16} className="text-emerald-600" />
              </div>
              <div>
                <p className="font-medium text-slate-800">Background Alerts</p>
                <p className="text-sm text-slate-500">
                  Browse other apps while your timer runs
                </p>
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={handleEnable}
              disabled={isRequesting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Bell size={18} />
              Enable Notifications
            </button>
            <button
              onClick={handleMaybeLater}
              className="w-full py-3 text-slate-500 hover:text-slate-700 hover:bg-slate-100 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <BellOff size={18} />
              Maybe Later
            </button>
          </div>

          <p className="text-xs text-slate-400 text-center">
            You can change this anytime in your browser settings
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermissionPrompt;
