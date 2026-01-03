import React, { useState, useEffect } from 'react';
import { MacroTargets, DEFAULT_MACRO_TARGETS } from '../types';
import { getUserMacroTargets, saveUserMacroTargets, resetMacroTargets } from '../services/macroTargetService';
import { useAuth } from './AuthProvider';
import { Target, Flame, Beef, Wheat, Droplets, Loader2, RotateCcw, Save, Lock, Crown, Info } from 'lucide-react';

interface MacroTargetsEditorProps {
  hasPro: boolean;
  onUpgradeClick?: () => void;
}

const MacroTargetsEditor: React.FC<MacroTargetsEditorProps> = ({ hasPro, onUpgradeClick }) => {
  const { user } = useAuth();
  const [targets, setTargets] = useState<MacroTargets>(DEFAULT_MACRO_TARGETS);
  const [isCustom, setIsCustom] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    const loadTargets = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const data = await getUserMacroTargets(user.id);
        if (data) {
          setTargets(data.targets);
          setIsCustom(data.isCustom);
        }
      } catch (err) {
        console.error('Error loading macro targets:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadTargets();
  }, [user]);

  const handleChange = (field: keyof MacroTargets, value: number) => {
    setTargets(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    if (!user || !hasPro) return;
    setIsSaving(true);
    try {
      const success = await saveUserMacroTargets(user.id, targets);
      if (success) {
        setIsCustom(true);
        setHasChanges(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving targets:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      await resetMacroTargets(user.id);
      setTargets(DEFAULT_MACRO_TARGETS);
      setIsCustom(false);
      setHasChanges(false);
    } catch (err) {
      console.error('Error resetting targets:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-indigo-500" />
          <h4 className="font-semibold text-slate-700">Daily Macro Targets</h4>
          {isCustom && (
            <span className="text-xs px-2 py-0.5 bg-indigo-100 text-indigo-600 rounded-full">Custom</span>
          )}
        </div>
        {!hasPro && (
          <button
            onClick={onUpgradeClick}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium rounded-full hover:from-amber-600 hover:to-orange-600 transition-all"
          >
            <Crown size={14} />
            Pro Feature
          </button>
        )}
      </div>

      {/* Info box */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <Info size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          Set your personal daily nutrition targets. These will be used when generating meal plans and displayed on recipe nutrition info for comparison. Values are per person per day.
        </p>
      </div>

      {/* Pro feature lock overlay */}
      <div className={`relative ${!hasPro ? 'opacity-60 pointer-events-none' : ''}`}>
        {!hasPro && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 rounded-lg">
            <div className="flex items-center gap-2 text-slate-500">
              <Lock size={20} />
              <span className="font-medium">Upgrade to Pro to customize</span>
            </div>
          </div>
        )}

        {/* Macro inputs grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Calories */}
          <div className="bg-slate-50 p-3 rounded-lg">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2">
              <Flame size={14} className="text-orange-500" />
              Calories
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={1000}
                max={5000}
                step={50}
                value={targets.calories}
                onChange={(e) => handleChange('calories', parseInt(e.target.value) || DEFAULT_MACRO_TARGETS.calories)}
                className="w-full px-2 py-1.5 rounded border border-slate-200 text-center text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none"
              />
              <span className="text-xs text-slate-400">kcal</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 text-center">Recommended: {DEFAULT_MACRO_TARGETS.calories}</p>
          </div>

          {/* Protein */}
          <div className="bg-slate-50 p-3 rounded-lg">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2">
              <Beef size={14} className="text-red-500" />
              Protein
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={10}
                max={300}
                step={5}
                value={targets.protein}
                onChange={(e) => handleChange('protein', parseInt(e.target.value) || DEFAULT_MACRO_TARGETS.protein)}
                className="w-full px-2 py-1.5 rounded border border-slate-200 text-center text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none"
              />
              <span className="text-xs text-slate-400">g</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 text-center">Recommended: {DEFAULT_MACRO_TARGETS.protein}g</p>
          </div>

          {/* Carbs */}
          <div className="bg-slate-50 p-3 rounded-lg">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2">
              <Wheat size={14} className="text-amber-500" />
              Carbs
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={50}
                max={500}
                step={10}
                value={targets.carbohydrates}
                onChange={(e) => handleChange('carbohydrates', parseInt(e.target.value) || DEFAULT_MACRO_TARGETS.carbohydrates)}
                className="w-full px-2 py-1.5 rounded border border-slate-200 text-center text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none"
              />
              <span className="text-xs text-slate-400">g</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 text-center">Recommended: {DEFAULT_MACRO_TARGETS.carbohydrates}g</p>
          </div>

          {/* Fat */}
          <div className="bg-slate-50 p-3 rounded-lg">
            <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600 mb-2">
              <Droplets size={14} className="text-yellow-500" />
              Fat
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={20}
                max={200}
                step={5}
                value={targets.fat}
                onChange={(e) => handleChange('fat', parseInt(e.target.value) || DEFAULT_MACRO_TARGETS.fat)}
                className="w-full px-2 py-1.5 rounded border border-slate-200 text-center text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none"
              />
              <span className="text-xs text-slate-400">g</span>
            </div>
            <p className="text-xs text-slate-400 mt-1 text-center">Recommended: {DEFAULT_MACRO_TARGETS.fat}g</p>
          </div>
        </div>

        {/* Advanced macros (collapsible) */}
        <details className="mt-4">
          <summary className="text-sm font-medium text-slate-600 cursor-pointer hover:text-slate-800">
            Advanced targets (fiber, sugar, sodium)
          </summary>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-3">
            {/* Fiber */}
            <div className="bg-slate-50 p-3 rounded-lg">
              <label className="text-xs font-medium text-slate-600 mb-2 block">
                Fiber (min)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={10}
                  max={60}
                  step={5}
                  value={targets.fiber ?? DEFAULT_MACRO_TARGETS.fiber}
                  onChange={(e) => handleChange('fiber', parseInt(e.target.value) || DEFAULT_MACRO_TARGETS.fiber!)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 text-center text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none"
                />
                <span className="text-xs text-slate-400">g</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 text-center">Recommended: {DEFAULT_MACRO_TARGETS.fiber}g</p>
            </div>

            {/* Sugar */}
            <div className="bg-slate-50 p-3 rounded-lg">
              <label className="text-xs font-medium text-slate-600 mb-2 block">
                Sugar (max)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={10}
                  max={100}
                  step={5}
                  value={targets.sugar ?? DEFAULT_MACRO_TARGETS.sugar}
                  onChange={(e) => handleChange('sugar', parseInt(e.target.value) || DEFAULT_MACRO_TARGETS.sugar!)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 text-center text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none"
                />
                <span className="text-xs text-slate-400">g</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 text-center">Max: {DEFAULT_MACRO_TARGETS.sugar}g</p>
            </div>

            {/* Sodium */}
            <div className="bg-slate-50 p-3 rounded-lg">
              <label className="text-xs font-medium text-slate-600 mb-2 block">
                Sodium (max)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={500}
                  max={4000}
                  step={100}
                  value={targets.sodium ?? DEFAULT_MACRO_TARGETS.sodium}
                  onChange={(e) => handleChange('sodium', parseInt(e.target.value) || DEFAULT_MACRO_TARGETS.sodium!)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 text-center text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none"
                />
                <span className="text-xs text-slate-400">mg</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 text-center">Max: {DEFAULT_MACRO_TARGETS.sodium}mg</p>
            </div>

            {/* Saturated Fat */}
            <div className="bg-slate-50 p-3 rounded-lg">
              <label className="text-xs font-medium text-slate-600 mb-2 block">
                Sat. Fat (max)
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={5}
                  max={50}
                  step={5}
                  value={targets.saturatedFat ?? DEFAULT_MACRO_TARGETS.saturatedFat}
                  onChange={(e) => handleChange('saturatedFat', parseInt(e.target.value) || DEFAULT_MACRO_TARGETS.saturatedFat!)}
                  className="w-full px-2 py-1.5 rounded border border-slate-200 text-center text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-200 outline-none"
                />
                <span className="text-xs text-slate-400">g</span>
              </div>
              <p className="text-xs text-slate-400 mt-1 text-center">Max: {DEFAULT_MACRO_TARGETS.saturatedFat}g</p>
            </div>
          </div>
        </details>
      </div>

      {/* Actions */}
      {hasPro && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={handleReset}
            disabled={isSaving || !isCustom}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw size={14} />
            Reset to defaults
          </button>

          <div className="flex items-center gap-2">
            {saveSuccess && (
              <span className="text-sm text-emerald-600">Saved!</span>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Targets
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MacroTargetsEditor;
