import React, { useState, useEffect } from 'react';
import { X, Loader2, Flame, Beef, Wheat, Droplets, AlertCircle, Heart } from 'lucide-react';
import { calculateNutrition, NutritionInfo as NutritionData } from '../services/geminiService';
import { getUserMacroTargets } from '../services/macroTargetService';
import { useAuth } from './AuthProvider';
import type { Meal, MacroTargets } from '../types';

interface NutritionInfoProps {
  meal: Meal;
  servings?: number;
  onClose: () => void;
}

const NutritionInfo: React.FC<NutritionInfoProps> = ({ meal, servings = 1, onClose }) => {
  const { user } = useAuth();
  const [nutrition, setNutrition] = useState<NutritionData | null>(null);
  const [targets, setTargets] = useState<MacroTargets | null>(null);
  const [isCustomTargets, setIsCustomTargets] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNutrition();
    loadTargets();
  }, [meal.id, user]);

  const loadTargets = async () => {
    if (!user) return;
    try {
      const data = await getUserMacroTargets(user.id);
      if (data) {
        setTargets(data.targets);
        setIsCustomTargets(data.isCustom);
      }
    } catch (err) {
      console.error('Failed to load targets:', err);
    }
  };

  const loadNutrition = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await calculateNutrition(meal.name, meal.ingredients, servings);
      setNutrition(result);
    } catch (err) {
      console.error('Failed to load nutrition:', err);
      setError('Failed to calculate nutritional information. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate percentage of daily value based on user targets
  const getDailyValuePercent = (value: number, targetValue: number) => {
    return Math.round((value / targetValue) * 100);
  };

  // Get color based on percentage (for goals, meeting is good; for limits, under is good)
  const getPercentColor = (percent: number, isMaxLimit: boolean = false): string => {
    if (isMaxLimit) {
      // For sugar, sodium, saturated fat - lower is better
      if (percent <= 30) return 'text-emerald-600';
      if (percent <= 60) return 'text-amber-600';
      return 'text-red-600';
    } else {
      // For protein, fiber, etc - hitting target is good
      if (percent >= 20 && percent <= 40) return 'text-emerald-600'; // Good per-serving range
      if (percent >= 10) return 'text-amber-600';
      return 'text-slate-500';
    }
  };

  // Macro bar component
  const MacroBar: React.FC<{ value: number; max: number; color: string }> = ({ value, max, color }) => {
    const percent = Math.min((value / max) * 100, 100);
    return (
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${percent}%` }}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Nutrition Facts</h2>
            <p className="text-sm text-slate-500 truncate max-w-[250px]">{meal.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 size={40} className="text-emerald-600 animate-spin mb-4" />
              <p className="text-slate-500">Calculating nutrition...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={loadNutrition}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium"
              >
                Try Again
              </button>
            </div>
          ) : nutrition ? (
            <div className="space-y-6">
              {/* Serving Info */}
              <div className="bg-slate-50 rounded-xl p-4 text-center">
                <p className="text-sm text-slate-500">Per serving</p>
                <p className="text-lg font-semibold text-slate-700">{nutrition.servingSize}</p>
                <p className="text-xs text-slate-400">
                  Recipe makes {nutrition.servingsPerRecipe} servings
                </p>
              </div>

              {/* Calories with target comparison */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-orange-100 px-4 py-2 rounded-full">
                  <Flame className="text-orange-500" size={20} />
                  <span className="text-2xl font-bold text-orange-600">{nutrition.calories}</span>
                  <span className="text-orange-600 font-medium">calories</span>
                </div>
                {targets && (
                  <p className={`text-sm mt-2 ${getPercentColor(getDailyValuePercent(nutrition.calories, targets.calories))}`}>
                    {getDailyValuePercent(nutrition.calories, targets.calories)}% of your daily target ({targets.calories} kcal)
                  </p>
                )}
              </div>

              {/* Macros */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                    Macronutrients
                  </h3>
                  {targets && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${isCustomTargets ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                      {isCustomTargets ? 'Your targets' : 'Recommended'}
                    </span>
                  )}
                </div>

                {/* Protein */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Beef size={16} className="text-red-500" />
                      <span className="font-medium text-slate-700">Protein</span>
                    </div>
                    <span className="font-semibold text-slate-800">{nutrition.macros.protein}g</span>
                  </div>
                  <MacroBar value={nutrition.macros.protein} max={targets?.protein ?? 50} color="bg-red-500" />
                  <p className={`text-xs mt-1 ${targets ? getPercentColor(getDailyValuePercent(nutrition.macros.protein, targets.protein)) : 'text-slate-400'}`}>
                    {getDailyValuePercent(nutrition.macros.protein, targets?.protein ?? 50)}% of daily target ({targets?.protein ?? 50}g)
                  </p>
                </div>

                {/* Carbohydrates */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Wheat size={16} className="text-amber-500" />
                      <span className="font-medium text-slate-700">Carbohydrates</span>
                    </div>
                    <span className="font-semibold text-slate-800">{nutrition.macros.carbohydrates}g</span>
                  </div>
                  <MacroBar value={nutrition.macros.carbohydrates} max={targets?.carbohydrates ?? 250} color="bg-amber-500" />
                  <p className={`text-xs mt-1 ${targets ? getPercentColor(getDailyValuePercent(nutrition.macros.carbohydrates, targets.carbohydrates)) : 'text-slate-400'}`}>
                    {getDailyValuePercent(nutrition.macros.carbohydrates, targets?.carbohydrates ?? 250)}% of daily target ({targets?.carbohydrates ?? 250}g)
                  </p>
                </div>

                {/* Fat */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Droplets size={16} className="text-yellow-500" />
                      <span className="font-medium text-slate-700">Fat</span>
                    </div>
                    <span className="font-semibold text-slate-800">{nutrition.macros.fat}g</span>
                  </div>
                  <MacroBar value={nutrition.macros.fat} max={targets?.fat ?? 65} color="bg-yellow-500" />
                  <p className={`text-xs mt-1 ${targets ? getPercentColor(getDailyValuePercent(nutrition.macros.fat, targets.fat)) : 'text-slate-400'}`}>
                    {getDailyValuePercent(nutrition.macros.fat, targets?.fat ?? 65)}% of daily target ({targets?.fat ?? 65}g)
                  </p>
                </div>

                {/* Additional macros with target comparison */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {nutrition.macros.fiber !== undefined && (
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-green-600">{nutrition.macros.fiber}g</p>
                      <p className="text-xs text-green-700">Fiber</p>
                      {targets?.fiber && (
                        <p className="text-xs text-green-600 mt-1">
                          {getDailyValuePercent(nutrition.macros.fiber, targets.fiber)}%
                        </p>
                      )}
                    </div>
                  )}
                  {nutrition.macros.sugar !== undefined && (
                    <div className="bg-pink-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-pink-600">{nutrition.macros.sugar}g</p>
                      <p className="text-xs text-pink-700">Sugar</p>
                      {targets?.sugar && (
                        <p className={`text-xs mt-1 ${getPercentColor(getDailyValuePercent(nutrition.macros.sugar, targets.sugar), true)}`}>
                          {getDailyValuePercent(nutrition.macros.sugar, targets.sugar)}% max
                        </p>
                      )}
                    </div>
                  )}
                  {nutrition.macros.saturatedFat !== undefined && (
                    <div className="bg-orange-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-orange-600">{nutrition.macros.saturatedFat}g</p>
                      <p className="text-xs text-orange-700">Sat. Fat</p>
                      {targets?.saturatedFat && (
                        <p className={`text-xs mt-1 ${getPercentColor(getDailyValuePercent(nutrition.macros.saturatedFat, targets.saturatedFat), true)}`}>
                          {getDailyValuePercent(nutrition.macros.saturatedFat, targets.saturatedFat)}% max
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Micronutrients */}
              {nutrition.micros && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-700">Other Nutrients</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {nutrition.micros.sodium !== undefined && (
                      <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-slate-600">Sodium</span>
                        <span className="font-medium text-slate-800">{nutrition.micros.sodium}mg</span>
                      </div>
                    )}
                    {nutrition.micros.cholesterol !== undefined && (
                      <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-slate-600">Cholesterol</span>
                        <span className="font-medium text-slate-800">{nutrition.micros.cholesterol}mg</span>
                      </div>
                    )}
                    {nutrition.micros.potassium !== undefined && (
                      <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-slate-600">Potassium</span>
                        <span className="font-medium text-slate-800">{nutrition.micros.potassium}mg</span>
                      </div>
                    )}
                    {nutrition.micros.vitaminA !== undefined && (
                      <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-slate-600">Vitamin A</span>
                        <span className="font-medium text-slate-800">{nutrition.micros.vitaminA}%</span>
                      </div>
                    )}
                    {nutrition.micros.vitaminC !== undefined && (
                      <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-slate-600">Vitamin C</span>
                        <span className="font-medium text-slate-800">{nutrition.micros.vitaminC}%</span>
                      </div>
                    )}
                    {nutrition.micros.calcium !== undefined && (
                      <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-slate-600">Calcium</span>
                        <span className="font-medium text-slate-800">{nutrition.micros.calcium}%</span>
                      </div>
                    )}
                    {nutrition.micros.iron !== undefined && (
                      <div className="flex justify-between bg-slate-50 rounded-lg px-3 py-2">
                        <span className="text-slate-600">Iron</span>
                        <span className="font-medium text-slate-800">{nutrition.micros.iron}%</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Health Notes */}
              {nutrition.healthNotes && nutrition.healthNotes.length > 0 && (
                <div className="bg-emerald-50 rounded-xl p-4">
                  <h3 className="font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                    <Heart size={16} />
                    Health Notes
                  </h3>
                  <ul className="space-y-1">
                    {nutrition.healthNotes.map((note, idx) => (
                      <li key={idx} className="text-sm text-emerald-700 flex items-start gap-2">
                        <span className="text-emerald-500 mt-1">•</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <p className="text-xs text-amber-700 text-center">
                  <strong>AI-Generated Estimate:</strong> Nutritional values are calculated by AI based on typical ingredient data and may contain errors. Actual values vary based on specific brands, preparation methods, and portion sizes. For medical or dietary needs, consult a qualified nutritionist.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default NutritionInfo;
