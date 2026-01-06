import React, { useState, useEffect } from 'react';
import { X, Delete, Check } from 'lucide-react';

interface NumericKeypadProps {
  isOpen: boolean;
  onClose: () => void;
  value: string;
  onChange: (value: string) => void;
  onConfirm: (value: string) => void;
  label?: string;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
}

const NumericKeypad: React.FC<NumericKeypadProps> = ({
  isOpen,
  onClose,
  value: initialValue,
  onChange,
  onConfirm,
  label,
  unit,
  min,
  max,
  step = 1,
}) => {
  const [displayValue, setDisplayValue] = useState(initialValue);

  useEffect(() => {
    if (isOpen) {
      setDisplayValue(initialValue);
    }
  }, [isOpen, initialValue]);

  if (!isOpen) return null;

  const handleKeyPress = (key: string) => {
    let newValue = displayValue;

    if (key === 'backspace') {
      newValue = displayValue.slice(0, -1);
    } else if (key === 'clear') {
      newValue = '';
    } else if (key === '.') {
      // Only allow one decimal point
      if (!displayValue.includes('.')) {
        newValue = displayValue + '.';
      }
    } else {
      newValue = displayValue + key;
    }

    setDisplayValue(newValue);
    onChange(newValue);
  };

  const handleConfirm = () => {
    let finalValue = displayValue;
    const numValue = parseFloat(displayValue);

    // Apply min/max constraints
    if (!isNaN(numValue)) {
      if (min !== undefined && numValue < min) {
        finalValue = min.toString();
      }
      if (max !== undefined && numValue > max) {
        finalValue = max.toString();
      }
    }

    onConfirm(finalValue);
    onClose();
  };

  const handleQuickAdjust = (delta: number) => {
    const currentValue = parseFloat(displayValue) || 0;
    let newValue = currentValue + delta;

    if (min !== undefined && newValue < min) newValue = min;
    if (max !== undefined && newValue > max) newValue = max;

    const newValueStr = newValue.toString();
    setDisplayValue(newValueStr);
    onChange(newValueStr);
  };

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'backspace'],
  ];

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-t-3xl w-full max-w-md shadow-xl animate-slideUp safe-area-bottom">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
          <span className="font-medium text-slate-700">{label}</span>
          <button
            onClick={handleConfirm}
            className="p-2 bg-emerald-500 hover:bg-emerald-600 rounded-full transition-colors"
          >
            <Check size={20} className="text-white" />
          </button>
        </div>

        {/* Display */}
        <div className="p-6 bg-slate-50">
          <div className="text-center">
            <div className="text-4xl font-bold text-slate-800 min-h-[48px]">
              {displayValue || '0'}
              {unit && <span className="text-2xl text-slate-500 ml-2">{unit}</span>}
            </div>
            {(min !== undefined || max !== undefined) && (
              <div className="text-sm text-slate-500 mt-2">
                {min !== undefined && max !== undefined
                  ? `Range: ${min} - ${max}`
                  : min !== undefined
                  ? `Min: ${min}`
                  : `Max: ${max}`}
              </div>
            )}
          </div>

          {/* Quick adjust buttons */}
          {step > 0 && (
            <div className="flex justify-center gap-3 mt-4">
              <button
                onClick={() => handleQuickAdjust(-step * 10)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 font-medium transition-colors"
              >
                -{step * 10}
              </button>
              <button
                onClick={() => handleQuickAdjust(-step)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 font-medium transition-colors"
              >
                -{step}
              </button>
              <button
                onClick={() => handleQuickAdjust(step)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 font-medium transition-colors"
              >
                +{step}
              </button>
              <button
                onClick={() => handleQuickAdjust(step * 10)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-lg text-slate-700 font-medium transition-colors"
              >
                +{step * 10}
              </button>
            </div>
          )}
        </div>

        {/* Keypad */}
        <div className="p-4 pb-6">
          <div className="grid grid-cols-3 gap-3">
            {keys.flat().map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                className={`h-14 rounded-xl text-xl font-medium transition-all active:scale-95 ${
                  key === 'backspace'
                    ? 'bg-slate-200 hover:bg-slate-300 text-slate-700'
                    : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 shadow-sm'
                }`}
              >
                {key === 'backspace' ? (
                  <Delete size={24} className="mx-auto" />
                ) : (
                  key
                )}
              </button>
            ))}
          </div>

          {/* Clear button */}
          <button
            onClick={() => handleKeyPress('clear')}
            className="w-full mt-3 h-12 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-colors"
          >
            Clear
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
        .safe-area-bottom {
          padding-bottom: env(safe-area-inset-bottom, 0);
        }
      `}</style>
    </div>
  );
};

export default NumericKeypad;
