import React from 'react';
import { X, RefreshCw, Plus, AlertCircle } from 'lucide-react';
import type { PantryUploadMode } from '../types';

interface PantryUploadModeModalProps {
  onSelect: (mode: PantryUploadMode) => void;
  onClose: () => void;
  existingItemCount: number;
  newItemCount: number;
}

const PantryUploadModeModal: React.FC<PantryUploadModeModalProps> = ({
  onSelect,
  onClose,
  existingItemCount,
  newItemCount,
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800">How should we add these items?</h2>
            <p className="text-sm text-slate-500 mt-1">
              You have {existingItemCount} existing item{existingItemCount !== 1 ? 's' : ''} in your list
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Options */}
        <div className="p-5 space-y-3">
          {/* Replace all option */}
          <button
            onClick={() => onSelect('replace')}
            className="w-full p-4 border-2 border-slate-200 hover:border-emerald-500 rounded-xl text-left transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg group-hover:bg-amber-200 transition-colors">
                <RefreshCw size={20} className="text-amber-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800">Replace All</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Clear your current list and start fresh with {newItemCount} new item{newItemCount !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </button>

          {/* Add new only option */}
          <button
            onClick={() => onSelect('add_new')}
            className="w-full p-4 border-2 border-emerald-500 bg-emerald-50 rounded-xl text-left transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
                <Plus size={20} className="text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                  Add New Items Only
                  <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </h3>
                <p className="text-sm text-slate-500 mt-1">
                  Keep existing items and add only items that aren't already in your list
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Info note */}
        <div className="px-5 pb-5">
          <div className="bg-slate-50 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle size={16} className="text-slate-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-500">
              "Add New Items Only" will compare item names and skip duplicates.
              You can always remove unwanted items manually.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PantryUploadModeModal;
