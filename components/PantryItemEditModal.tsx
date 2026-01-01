import React, { useState, useEffect } from 'react';
import { X, Scale } from 'lucide-react';
import { PantryItem, METRIC_UNITS, IMPERIAL_UNITS, UNIVERSAL_UNITS } from '../types';

interface PantryItemEditModalProps {
  item: PantryItem;
  unitSystem: 'metric' | 'imperial';
  onSave: (quantity: number | null, unit: string | null) => void;
  onClose: () => void;
}

const PantryItemEditModal: React.FC<PantryItemEditModalProps> = ({
  item,
  unitSystem,
  onSave,
  onClose,
}) => {
  const [quantity, setQuantity] = useState<string>(item.quantity?.toString() || '');
  const [unit, setUnit] = useState<string>(item.unit || '');
  const [showAllUnits, setShowAllUnits] = useState(false);

  // Get units based on settings
  const primaryUnits = unitSystem === 'metric' ? METRIC_UNITS : IMPERIAL_UNITS;
  const secondaryUnits = unitSystem === 'metric' ? IMPERIAL_UNITS : METRIC_UNITS;

  // Combined units based on show all toggle
  const availableUnits = showAllUnits
    ? [...primaryUnits, ...secondaryUnits, ...UNIVERSAL_UNITS]
    : [...primaryUnits, ...UNIVERSAL_UNITS];

  const handleSave = () => {
    const numQuantity = quantity ? parseFloat(quantity) : null;
    const unitValue = unit || null;
    onSave(numQuantity, unitValue);
    onClose();
  };

  const handleClear = () => {
    setQuantity('');
    setUnit('');
  };

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Scale size={20} className="text-emerald-600" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">Edit Quantity</h3>
              <p className="text-sm text-slate-500">{item.name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Quantity Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Amount
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Enter quantity"
              step="0.1"
              min="0"
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-lg"
              autoFocus
            />
          </div>

          {/* Unit Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                Unit of Measure
              </label>
              <button
                onClick={() => setShowAllUnits(!showAllUnits)}
                className="text-xs text-emerald-600 hover:text-emerald-700 font-medium"
              >
                {showAllUnits ? 'Show Less' : 'Show All Units'}
              </button>
            </div>

            {/* Unit chips */}
            <div className="flex flex-wrap gap-2">
              {availableUnits.map((u) => (
                <button
                  key={u.value}
                  onClick={() => setUnit(u.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    unit === u.value
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {u.value}
                </button>
              ))}
            </div>

            {/* Custom unit input */}
            <div className="mt-3">
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Or type custom unit..."
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-none text-sm"
              />
            </div>
          </div>

          {/* Preview */}
          {(quantity || unit) && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-sm text-slate-500 mb-1">Preview:</p>
              <p className="font-medium text-slate-800">
                {item.name}: {quantity || '?'} {unit || '(no unit)'}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-4 border-t border-slate-200">
          <button
            onClick={handleClear}
            className="flex-1 py-2.5 px-4 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
          >
            Clear
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default PantryItemEditModal;
