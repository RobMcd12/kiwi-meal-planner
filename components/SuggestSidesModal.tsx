import React, { useState, useEffect } from 'react';
import { X, Loader2, Check, ChefHat, Clock, Plus, Trash2, Sparkles, UtensilsCrossed, MessageSquare } from 'lucide-react';
import { Meal, SideDish } from '../types';
import { suggestSideDishes, saveSidesToRecipe, getSidesForRecipe, removeSidesFromRecipe } from '../services/suggestSidesService';

interface SuggestSidesModalProps {
  isOpen: boolean;
  onClose: () => void;
  meal: Meal;
  onSidesUpdated: (sides: SideDish[]) => void;
  userPreferences?: { dietary?: string; dislikes?: string };
}

const SuggestSidesModal: React.FC<SuggestSidesModalProps> = ({
  isOpen,
  onClose,
  meal,
  onSidesUpdated,
  userPreferences
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestions, setSuggestions] = useState<SideDish[]>([]);
  const [selectedSides, setSelectedSides] = useState<SideDish[]>([]);
  const [existingSides, setExistingSides] = useState<SideDish[]>([]);
  const [expandedSide, setExpandedSide] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState('');

  // Load existing sides when modal opens
  useEffect(() => {
    if (isOpen && meal.id) {
      loadExistingSides();
    }
  }, [isOpen, meal.id]);

  const loadExistingSides = async () => {
    if (!meal.id) return;
    const sides = await getSidesForRecipe(meal.id);
    setExistingSides(sides);
    setSelectedSides(sides);
  };

  const handleSuggest = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const sides = await suggestSideDishes(meal, userPreferences, customPrompt.trim() || undefined);
      setSuggestions(sides);
    } catch (err) {
      console.error('Error getting suggestions:', err);
      setError('Failed to get side dish suggestions. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSideSelection = (side: SideDish) => {
    setSelectedSides(prev => {
      const exists = prev.find(s => s.id === side.id);
      if (exists) {
        return prev.filter(s => s.id !== side.id);
      } else {
        return [...prev, side];
      }
    });
  };

  const removeSide = (sideId: string) => {
    setSelectedSides(prev => prev.filter(s => s.id !== sideId));
  };

  const handleSave = async () => {
    if (!meal.id) return;

    setIsSaving(true);
    try {
      const success = await saveSidesToRecipe(meal.id, selectedSides);
      if (success) {
        onSidesUpdated(selectedSides);
        onClose();
      } else {
        setError('Failed to save sides. Please try again.');
      }
    } catch (err) {
      setError('Failed to save sides. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearAll = async () => {
    if (!meal.id) return;

    setIsSaving(true);
    try {
      const success = await removeSidesFromRecipe(meal.id);
      if (success) {
        setSelectedSides([]);
        setExistingSides([]);
        onSidesUpdated([]);
      }
    } catch (err) {
      setError('Failed to clear sides. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <UtensilsCrossed size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold">Suggest Sides</h2>
                <p className="text-amber-100 text-sm">Find perfect side dishes for {meal.name}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-4 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Selected Sides Section */}
          {selectedSides.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  <Check size={18} className="text-emerald-500" />
                  Selected Sides ({selectedSides.length})
                </h3>
                <button
                  onClick={handleClearAll}
                  disabled={isSaving}
                  className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 size={14} />
                  Clear All
                </button>
              </div>
              <div className="grid gap-2">
                {selectedSides.map(side => (
                  <div
                    key={side.id}
                    className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center">
                        <ChefHat size={16} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">{side.name}</p>
                        <p className="text-xs text-slate-500">{side.ingredients.length} ingredients</p>
                      </div>
                    </div>
                    <button
                      onClick={() => removeSide(side.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Get Suggestions Button */}
          {suggestions.length === 0 && !isLoading && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} className="text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-700 mb-2">
                Get AI Side Dish Suggestions
              </h3>
              <p className="text-slate-500 mb-4 max-w-md mx-auto">
                Our AI will suggest 4 complementary side dishes that pair perfectly with {meal.name}
              </p>

              {/* Custom Prompt Input */}
              <div className="max-w-md mx-auto mb-4">
                <div className="relative">
                  <MessageSquare size={16} className="absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Optional: Guide the AI (e.g., 'low carb', 'quick to make', 'Asian style')"
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1.5 text-left">
                  Leave empty for general suggestions, or add preferences like cuisine, diet, or prep time
                </p>
              </div>

              <button
                onClick={handleSuggest}
                className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-medium rounded-xl transition-all shadow-md flex items-center gap-2 mx-auto"
              >
                <Sparkles size={18} />
                Suggest Side Dishes
              </button>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="text-center py-12">
              <Loader2 size={40} className="animate-spin text-amber-500 mx-auto mb-4" />
              <p className="text-slate-600">Finding perfect side dishes...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
              {error}
            </div>
          )}

          {/* Suggestions Grid */}
          {suggestions.length > 0 && !isLoading && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-700">Suggested Sides</h3>
              </div>

              {/* Custom Prompt for New Suggestions */}
              <div className="mb-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={14} className="text-amber-600" />
                  <span className="text-sm font-medium text-amber-800">Get different suggestions</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="e.g., 'keto friendly', 'Mediterranean style', 'under 15 minutes'"
                    className="flex-1 px-3 py-2 border border-amber-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
                  />
                  <button
                    onClick={handleSuggest}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors flex items-center gap-1.5 text-sm"
                  >
                    <Sparkles size={14} />
                    Refresh
                  </button>
                </div>
              </div>
              <div className="grid gap-3">
                {suggestions.map(side => {
                  const isSelected = selectedSides.some(s => s.id === side.id);
                  const isExpanded = expandedSide === side.id;

                  return (
                    <div
                      key={side.id}
                      className={`border rounded-xl overflow-hidden transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-slate-200 bg-white hover:border-amber-300'
                      }`}
                    >
                      <div
                        className="p-4 cursor-pointer"
                        onClick={() => setExpandedSide(isExpanded ? null : side.id)}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-slate-800">{side.name}</h4>
                              {side.prepTime && (
                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                  <Clock size={12} />
                                  {side.prepTime}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-600">{side.description}</p>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSideSelection(side);
                            }}
                            className={`p-2 rounded-lg transition-all flex-shrink-0 ${
                              isSelected
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-100 text-slate-400 hover:bg-amber-100 hover:text-amber-600'
                            }`}
                          >
                            {isSelected ? <Check size={18} /> : <Plus size={18} />}
                          </button>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                          <div className="grid md:grid-cols-2 gap-4 mt-4">
                            {/* Ingredients */}
                            <div>
                              <h5 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                                <ChefHat size={14} />
                                Ingredients
                              </h5>
                              <ul className="space-y-1">
                                {side.ingredients.map((ing, idx) => (
                                  <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                                    <span className="w-1 h-1 rounded-full bg-amber-400 mt-2 flex-shrink-0" />
                                    {ing}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {/* Instructions */}
                            <div>
                              <h5 className="text-sm font-medium text-slate-700 mb-2 flex items-center gap-1">
                                <Clock size={14} />
                                Instructions
                              </h5>
                              <p className="text-sm text-slate-600 whitespace-pre-wrap">
                                {side.instructions}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || selectedSides.length === 0}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check size={18} />
                Save {selectedSides.length} Side{selectedSides.length !== 1 ? 's' : ''}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuggestSidesModal;
