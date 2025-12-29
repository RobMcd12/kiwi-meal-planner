import React, { useState, useEffect } from 'react';
import { X, Loader2, Flame, Beef, Wheat, Droplets, AlertCircle, Heart } from 'lucide-react';
import { calculateNutrition, NutritionInfo as NutritionData } from '../services/geminiService';
import type { Meal } from '../types';

interface NutritionInfoProps {
  meal: Meal;
  servings?: number;
  onClose: () => void;
}

const NutritionInfo: React.FC<NutritionInfoProps> = ({ meal, servings = 1, onClose }) => {
  const [nutrition, setNutrition] = useState<NutritionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadNutrition();
  }, [meal.id]);

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

  // Calculate percentage of daily value (based on 2000 calorie diet)
  const getDailyValuePercent = (value: number, dailyValue: number) => {
    return Math.round((value / dailyValue) * 100);
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

              {/* Calories */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 bg-orange-100 px-4 py-2 rounded-full">
                  <Flame className="text-orange-500" size={20} />
                  <span className="text-2xl font-bold text-orange-600">{nutrition.calories}</span>
                  <span className="text-orange-600 font-medium">calories</span>
                </div>
              </div>

              {/* Macros */}
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                  Macronutrients
                </h3>

                {/* Protein */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Beef size={16} className="text-red-500" />
                      <span className="font-medium text-slate-700">Protein</span>
                    </div>
                    <span className="font-semibold text-slate-800">{nutrition.macros.protein}g</span>
                  </div>
                  <MacroBar value={nutrition.macros.protein} max={50} color="bg-red-500" />
                  <p className="text-xs text-slate-400 mt-1">
                    {getDailyValuePercent(nutrition.macros.protein, 50)}% Daily Value
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
                  <MacroBar value={nutrition.macros.carbohydrates} max={300} color="bg-amber-500" />
                  <p className="text-xs text-slate-400 mt-1">
                    {getDailyValuePercent(nutrition.macros.carbohydrates, 300)}% Daily Value
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
                  <MacroBar value={nutrition.macros.fat} max={65} color="bg-yellow-500" />
                  <p className="text-xs text-slate-400 mt-1">
                    {getDailyValuePercent(nutrition.macros.fat, 65)}% Daily Value
                  </p>
                </div>

                {/* Additional macros */}
                <div className="grid grid-cols-3 gap-3 pt-2">
                  {nutrition.macros.fiber !== undefined && (
                    <div className="bg-green-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-green-600">{nutrition.macros.fiber}g</p>
                      <p className="text-xs text-green-700">Fiber</p>
                    </div>
                  )}
                  {nutrition.macros.sugar !== undefined && (
                    <div className="bg-pink-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-pink-600">{nutrition.macros.sugar}g</p>
                      <p className="text-xs text-pink-700">Sugar</p>
                    </div>
                  )}
                  {nutrition.macros.saturatedFat !== undefined && (
                    <div className="bg-orange-50 rounded-lg p-2 text-center">
                      <p className="text-lg font-bold text-orange-600">{nutrition.macros.saturatedFat}g</p>
                      <p className="text-xs text-orange-700">Sat. Fat</p>
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

              {/* Disclaimer */}
              <p className="text-xs text-slate-400 text-center">
                * Nutritional values are AI-estimated based on typical ingredients and may vary.
                Consult a nutritionist for precise dietary information.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default NutritionInfo;
