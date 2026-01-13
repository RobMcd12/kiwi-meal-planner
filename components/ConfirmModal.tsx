import React, { useEffect } from 'react';
import { X, AlertTriangle, Info, CheckCircle, AlertCircle } from 'lucide-react';

export type ConfirmModalType = 'confirm' | 'alert' | 'warning' | 'success' | 'error';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: ConfirmModalType;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  showCancel?: boolean;
  destructive?: boolean;
}

const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  type = 'confirm',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  showCancel = true,
  destructive = false,
}) => {
  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onCancel) {
        onCancel();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  // Determine icon and colors based on type
  const getIconAndColors = () => {
    switch (type) {
      case 'warning':
      case 'confirm':
        return {
          icon: <AlertTriangle size={24} />,
          iconBg: 'bg-amber-100',
          iconColor: 'text-amber-600',
        };
      case 'error':
        return {
          icon: <AlertCircle size={24} />,
          iconBg: 'bg-red-100',
          iconColor: 'text-red-600',
        };
      case 'success':
        return {
          icon: <CheckCircle size={24} />,
          iconBg: 'bg-emerald-100',
          iconColor: 'text-emerald-600',
        };
      case 'alert':
      default:
        return {
          icon: <Info size={24} />,
          iconBg: 'bg-blue-100',
          iconColor: 'text-blue-600',
        };
    }
  };

  const { icon, iconBg, iconColor } = getIconAndColors();

  // Determine button colors
  const confirmButtonClasses = destructive
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : type === 'success'
    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
    : type === 'error'
    ? 'bg-red-600 hover:bg-red-700 text-white'
    : 'bg-emerald-600 hover:bg-emerald-700 text-white';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className={`${iconBg} p-2 rounded-lg`}>
              <span className={iconColor}>{icon}</span>
            </div>
            <h3 className="font-semibold text-slate-800">{title}</h3>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-slate-400 hover:text-slate-600 p-1 transition-colors"
            >
              <X size={20} />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-slate-600 whitespace-pre-wrap">{message}</p>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-slate-200">
          {showCancel && onCancel && (
            <button
              onClick={onCancel}
              className="flex-1 py-2.5 px-4 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 rounded-lg font-medium transition-colors ${confirmButtonClasses}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;

// Hook for easier usage with confirm/alert patterns
export interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  type: ConfirmModalType;
  confirmText: string;
  cancelText: string;
  showCancel: boolean;
  destructive: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const useConfirmModal = () => {
  const [state, setState] = React.useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'confirm',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    showCancel: true,
    destructive: false,
    onConfirm: () => {},
    onCancel: () => {},
  });

  const confirm = (options: {
    title: string;
    message: string;
    type?: ConfirmModalType;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
  }): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title: options.title,
        message: options.message,
        type: options.type || 'confirm',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        showCancel: true,
        destructive: options.destructive || false,
        onConfirm: () => {
          setState((prev) => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setState((prev) => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  };

  const alert = (options: {
    title: string;
    message: string;
    type?: ConfirmModalType;
    confirmText?: string;
  }): Promise<void> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        title: options.title,
        message: options.message,
        type: options.type || 'alert',
        confirmText: options.confirmText || 'OK',
        cancelText: 'Cancel',
        showCancel: false,
        destructive: false,
        onConfirm: () => {
          setState((prev) => ({ ...prev, isOpen: false }));
          resolve();
        },
        onCancel: () => {
          setState((prev) => ({ ...prev, isOpen: false }));
          resolve();
        },
      });
    });
  };

  const close = () => {
    setState((prev) => ({ ...prev, isOpen: false }));
  };

  return { state, confirm, alert, close };
};
