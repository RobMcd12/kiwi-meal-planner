import React, { useState, useEffect } from 'react';
import { X, Scale, Edit2, Sparkles, FolderOpen, Loader2 } from 'lucide-react';
import { PantryItem, PantryCategory, METRIC_UNITS, IMPERIAL_UNITS, UNIVERSAL_UNITS } from '../types';
import { suggestCategoriesForItems, PANTRY_CATEGORIES } from '../services/geminiService';

interface PantryItemEditModalProps {
  item: PantryItem;
  unitSystem: 'metric' | 'imperial';
  onSave: (quantity: number | null, unit: string | null, name?: string, categoryId?: string | null) => void;
  onClose: () => void;
  allowNameEdit?: boolean;
  allowCategoryEdit?: boolean;
  categories?: PantryCategory[];
  onCreateCategory?: (name: string) => Promise<PantryCategory | null>;
}

const PantryItemEditModal: React.FC<PantryItemEditModalProps> = ({
  item,
  unitSystem,
  onSave,
  onClose,
  allowNameEdit = false,
  allowCategoryEdit = false,
  categories = [],
  onCreateCategory,
}) => {
  const [name, setName] = useState<string>(item.name);
  const [quantity, setQuantity] = useState<string>(item.quantity?.toString() || '');
  const [unit, setUnit] = useState<string>(item.unit || '');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(item.categoryId || null);
  const [showAllUnits, setShowAllUnits] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [isSuggestingCategory, setIsSuggestingCategory] = useState(false);
  const [suggestedCategory, setSuggestedCategory] = useState<string | null>(null);
  const [showCategorySelector, setShowCategorySelector] = useState(false);

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
    const nameValue = name.trim() !== item.name ? name.trim() : undefined;
    const categoryValue = selectedCategoryId !== (item.categoryId || null) ? selectedCategoryId : undefined;
    onSave(numQuantity, unitValue, nameValue, categoryValue);
    onClose();
  };

  const handleClear = () => {
    setQuantity('');
    setUnit('');
  };

  const displayName = name.trim() || item.name;

  const handleSuggestCategory = async () => {
    setIsSuggestingCategory(true);
    setSuggestedCategory(null);
    try {
      const suggestions = await suggestCategoriesForItems([displayName]);
      if (suggestions.length > 0) {
        const suggestion = suggestions[0];
        setSuggestedCategory(suggestion.suggestedCategory);
        // Find matching category or create one
        const matchingCategory = categories.find(
          c => c.name.toLowerCase() === suggestion.suggestedCategory.toLowerCase()
        );
        if (matchingCategory) {
          setSelectedCategoryId(matchingCategory.id);
        } else if (onCreateCategory) {
          // Create the category if it doesn't exist
          const newCategory = await onCreateCategory(suggestion.suggestedCategory);
          if (newCategory) {
            setSelectedCategoryId(newCategory.id);
          }
        }
      }
    } catch (error) {
      console.error('Failed to suggest category:', error);
    } finally {
      setIsSuggestingCategory(false);
    }
  };

  const selectedCategory = categories.find(c => c.id === selectedCategoryId);

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
              <h3 className="font-semibold text-slate-800">Edit Item</h3>
              {allowNameEdit && isEditingName ? (
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onBlur={() => setIsEditingName(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setIsEditingName(false);
                    if (e.key === 'Escape') {
                      setName(item.name);
                      setIsEditingName(false);
                    }
                  }}
                  className="text-sm text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-none w-full"
                  autoFocus
                />
              ) : (
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-slate-500">{displayName}</p>
                  {allowNameEdit && (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="p-0.5 text-slate-400 hover:text-emerald-600 transition-colors"
                      title="Edit name"
                    >
                      <Edit2 size={12} />
                    </button>
                  )}
                </div>
              )}
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

          {/* Category Selection - Only for uncategorized items */}
          {allowCategoryEdit && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-slate-700">
                  Category
                </label>
                <button
                  onClick={handleSuggestCategory}
                  disabled={isSuggestingCategory}
                  className="text-xs text-purple-600 hover:text-purple-700 font-medium flex items-center gap-1 disabled:opacity-50"
                >
                  {isSuggestingCategory ? (
                    <>
                      <Loader2 size={12} className="animate-spin" />
                      Suggesting...
                    </>
                  ) : (
                    <>
                      <Sparkles size={12} />
                      AI Suggest
                    </>
                  )}
                </button>
              </div>

              {/* Current selection */}
              <button
                onClick={() => setShowCategorySelector(!showCategorySelector)}
                className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-slate-300 hover:border-emerald-400 transition-colors bg-white"
              >
                <div className="flex items-center gap-2">
                  <FolderOpen size={18} className="text-slate-400" />
                  <span className={selectedCategory ? 'text-slate-800' : 'text-slate-400'}>
                    {selectedCategory?.name || 'Select a category...'}
                  </span>
                </div>
                {suggestedCategory && selectedCategory?.name === suggestedCategory && (
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                    AI Suggested
                  </span>
                )}
              </button>

              {/* Category dropdown */}
              {showCategorySelector && (
                <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                  {/* Uncategorized option */}
                  <button
                    onClick={() => {
                      setSelectedCategoryId(null);
                      setShowCategorySelector(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${
                      !selectedCategoryId ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'
                    }`}
                  >
                    Uncategorized
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        setSelectedCategoryId(cat.id);
                        setShowCategorySelector(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors ${
                        selectedCategoryId === cat.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700'
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                  {/* Suggested categories from AI that don't exist yet */}
                  {suggestedCategory && !categories.find(c => c.name.toLowerCase() === suggestedCategory.toLowerCase()) && (
                    <button
                      onClick={async () => {
                        if (onCreateCategory) {
                          const newCat = await onCreateCategory(suggestedCategory);
                          if (newCat) {
                            setSelectedCategoryId(newCat.id);
                          }
                        }
                        setShowCategorySelector(false);
                      }}
                      className="w-full text-left px-4 py-2 text-sm bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors flex items-center gap-2"
                    >
                      <Sparkles size={14} />
                      Create "{suggestedCategory}"
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Preview */}
          {(quantity || unit || (allowNameEdit && name !== item.name) || (allowCategoryEdit && selectedCategoryId !== (item.categoryId || null))) && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-sm text-slate-500 mb-1">Preview:</p>
              <p className="font-medium text-slate-800">
                {displayName}{quantity || unit ? `: ${quantity || '?'} ${unit || '(no unit)'}` : ''}
              </p>
              {allowNameEdit && name !== item.name && (
                <p className="text-xs text-emerald-600 mt-1">Name will be updated</p>
              )}
              {allowCategoryEdit && selectedCategoryId !== (item.categoryId || null) && (
                <p className="text-xs text-purple-600 mt-1">
                  Will move to: {selectedCategory?.name || 'Uncategorized'}
                </p>
              )}
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
