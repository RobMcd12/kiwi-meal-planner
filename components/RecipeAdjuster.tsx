import React, { useState } from 'react';
import { X, Users, Beef, Target, Sparkles, Loader2, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import type { Meal, UserPreferences } from '../types';
import { adjustRecipe, AdjustedRecipe, RecipeAdjustmentType } from '../services/geminiService';

interface RecipeAdjusterProps {
  meal: Meal;
  preferences?: UserPreferences;
  onClose: () => void;
  onApply: (adjustedMeal: Meal) => void;
}

type AdjustmentMode = 'servings' | 'protein' | 'macros' | 'custom';

const RecipeAdjuster: React.FC<RecipeAdjusterProps> = ({
  meal,
  preferences,
  onClose,
  onApply,
}) => {
  const [mode, setMode] = useState<AdjustmentMode>('servings');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<AdjustedRecipe | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // Servings adjustment
  const [targetServings, setTargetServings] = useState(meal.servings || 4);

  // Protein adjustment
  const [proteinAdjustment, setProteinAdjustment] = useState<'increase' | 'decrease'>('increase');
  const [targetProteinGrams, setTargetProteinGrams] = useState<number | undefined>(undefined);

  // Macro targets
  const [targetCalories, setTargetCalories] = useState<number | undefined>(undefined);
  const [targetProtein, setTargetProtein] = useState<number | undefined>(undefined);
  const [targetCarbs, setTargetCarbs] = useState<number | undefined>(undefined);
  const [targetFat, setTargetFat] = useState<number | undefined>(undefined);

  // Custom instructions
  const [customInstructions, setCustomInstructions] = useState('');

  const handleAdjust = async () => {
    setIsAdjusting(true);
    setError(null);
    setPreview(null);

    let adjustment: RecipeAdjustmentType;

    switch (mode) {
      case 'servings':
        adjustment = { type: 'servings', targetServings };
        break;
      case 'protein':
        adjustment = {
          type: 'protein',
          adjustment: proteinAdjustment,
          targetGrams: targetProteinGrams,
        };
        break;
      case 'macros':
        adjustment = {
          type: 'macros',
          targetCalories,
          targetProtein,
          targetCarbs,
          targetFat,
        };
        break;
      case 'custom':
        if (!customInstructions.trim()) {
          setError('Please enter your adjustment instructions');
          setIsAdjusting(false);
          return;
        }
        adjustment = { type: 'custom', instructions: customInstructions };
        break;
    }

    try {
      const adjusted = await adjustRecipe(meal, adjustment, preferences);
      setPreview(adjusted);
      setShowPreview(true);
    } catch (err) {
      console.error('Adjustment error:', err);
      setError('Failed to adjust recipe. Please try again.');
    } finally {
      setIsAdjusting(false);
    }
  };

  const handleApplyChanges = () => {
    if (!preview) return;

    const adjustedMeal: Meal = {
      ...meal,
      name: preview.name,
      description: preview.description,
      ingredients: preview.ingredients,
      instructions: preview.instructions,
      servings: preview.servings,
    };

    onApply(adjustedMeal);
    onClose();
  };

  const modeButtons = [
    { id: 'servings' as AdjustmentMode, label: 'Servings', icon: Users },
    { id: 'protein' as AdjustmentMode, label: 'Protein', icon: Beef },
    { id: 'macros' as AdjustmentMode, label: 'Macros', icon: Target },
    { id: 'custom' as AdjustmentMode, label: 'Custom', icon: Sparkles },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Adjust Recipe</h2>
            <p className="text-sm text-slate-500">{meal.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Mode Selection */}
          <div className="grid grid-cols-4 gap-2">
            {modeButtons.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  setMode(id);
                  setPreview(null);
                  setShowPreview(false);
                }}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl transition-all ${
                  mode === id
                    ? 'bg-amber-100 text-amber-700 ring-2 ring-amber-500'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon size={20} />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>

          {/* Adjustment Options based on mode */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-4">
            {mode === 'servings' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Adjust servings from {meal.servings || 4} to:
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setTargetServings(Math.max(1, targetServings - 1))}
                    className="w-10 h-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600"
                    disabled={targetServings <= 1}
                  >
                    -
                  </button>
                  <span className="text-2xl font-bold text-slate-800 w-12 text-center">
                    {targetServings}
                  </span>
                  <button
                    onClick={() => setTargetServings(Math.min(24, targetServings + 1))}
                    className="w-10 h-10 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600"
                    disabled={targetServings >= 24}
                  >
                    +
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-2">
                  Ingredient quantities and cooking times will be scaled automatically.
                </p>
              </div>
            )}

            {mode === 'protein' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Adjustment type:
                  </label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setProteinAdjustment('increase')}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                        proteinAdjustment === 'increase'
                          ? 'bg-green-100 text-green-700 ring-2 ring-green-500'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Increase Protein
                    </button>
                    <button
                      onClick={() => setProteinAdjustment('decrease')}
                      className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                        proteinAdjustment === 'decrease'
                          ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-500'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Decrease Protein
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Target protein per serving (optional):
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={targetProteinGrams || ''}
                      onChange={(e) => setTargetProteinGrams(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="e.g. 40"
                      className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    />
                    <span className="text-slate-500 font-medium">grams</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Leave empty for a general {proteinAdjustment}.
                  </p>
                </div>
              </div>
            )}

            {mode === 'macros' && (
              <div className="space-y-4">
                <p className="text-sm text-slate-600 mb-2">
                  Set target macros per serving. Leave empty to keep current values.
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Calories</label>
                    <input
                      type="number"
                      value={targetCalories || ''}
                      onChange={(e) => setTargetCalories(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="e.g. 500"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Protein (g)</label>
                    <input
                      type="number"
                      value={targetProtein || ''}
                      onChange={(e) => setTargetProtein(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="e.g. 35"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Carbs (g)</label>
                    <input
                      type="number"
                      value={targetCarbs || ''}
                      onChange={(e) => setTargetCarbs(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="e.g. 50"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Fat (g)</label>
                    <input
                      type="number"
                      value={targetFat || ''}
                      onChange={(e) => setTargetFat(e.target.value ? parseInt(e.target.value) : undefined)}
                      placeholder="e.g. 20"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {mode === 'custom' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tell the AI how to adjust this recipe:
                </label>
                <textarea
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Make it lower in sodium, substitute chicken for tofu, make it spicier..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                  rows={3}
                />
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={18} className="text-red-500 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Preview Section */}
          {preview && showPreview && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-green-800">Preview Adjustments</h3>
                <button
                  onClick={() => setShowPreview(!showPreview)}
                  className="text-green-600 hover:text-green-800"
                >
                  {showPreview ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </button>
              </div>

              <div className="text-sm text-green-700 bg-green-100 rounded-lg p-2">
                <strong>Changes:</strong> {preview.adjustmentNotes}
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-green-600" />
                  <span className="text-slate-600">Servings:</span>
                  <span className="font-medium text-slate-800">{preview.servings}</span>
                </div>

                <div>
                  <p className="text-slate-600 font-medium mb-1">Ingredients:</p>
                  <ul className="list-disc list-inside text-slate-700 max-h-32 overflow-y-auto bg-white rounded-lg p-2">
                    {preview.ingredients.slice(0, 5).map((ing, idx) => (
                      <li key={idx} className="truncate">{ing}</li>
                    ))}
                    {preview.ingredients.length > 5 && (
                      <li className="text-slate-400">...and {preview.ingredients.length - 5} more</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 flex gap-3">
          {preview ? (
            <>
              <button
                onClick={() => {
                  setPreview(null);
                  setShowPreview(false);
                }}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-colors"
              >
                Adjust Again
              </button>
              <button
                onClick={handleApplyChanges}
                className="flex-1 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Sparkles size={18} />
                Apply Changes
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjust}
                disabled={isAdjusting}
                className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAdjusting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Adjusting...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} />
                    Adjust Recipe
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipeAdjuster;
