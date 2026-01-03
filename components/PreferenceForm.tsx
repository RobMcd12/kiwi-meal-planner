import React, { useState } from 'react';
import { UserPreferences, ExcludedIngredient } from '../types';
import { Utensils, Heart, ThumbsDown, Scale, Thermometer, Beef, Flame, AlertTriangle, Plus, X, ShieldAlert, Target } from 'lucide-react';
import MacroTargetsEditor from './MacroTargetsEditor';

interface PreferenceFormProps {
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
  onSubmit?: () => void;
  isLoading?: boolean;
  isSettingsMode?: boolean;
  hasPro?: boolean;
  onUpgradeClick?: () => void;
}

type PreferenceTab = 'meal' | 'allergy' | 'macros';

const EXCLUSION_REASONS = [
  { value: 'allergy', label: 'Allergy', color: 'red' },
  { value: 'intolerance', label: 'Intolerance', color: 'orange' },
  { value: 'preference', label: 'Preference', color: 'slate' },
];

const PreferenceForm: React.FC<PreferenceFormProps> = ({
  preferences,
  setPreferences,
  onSubmit,
  isLoading = false,
  isSettingsMode = false,
  hasPro = false,
  onUpgradeClick
}) => {
  const [newIngredient, setNewIngredient] = useState('');
  const [newReason, setNewReason] = useState<string>('allergy');
  const [activeTab, setActiveTab] = useState<PreferenceTab>('meal');

  const handleChange = (field: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

  const addExcludedIngredient = () => {
    if (!newIngredient.trim()) return;

    const ingredient: ExcludedIngredient = {
      name: newIngredient.trim(),
      reason: newReason,
    };

    const current = preferences.excludedIngredients || [];
    // Don't add duplicates
    if (current.some(i => i.name.toLowerCase() === ingredient.name.toLowerCase())) {
      setNewIngredient('');
      return;
    }

    handleChange('excludedIngredients', [...current, ingredient]);
    setNewIngredient('');
  };

  const removeExcludedIngredient = (name: string) => {
    const current = preferences.excludedIngredients || [];
    handleChange('excludedIngredients', current.filter(i => i.name !== name));
  };

  const getReasonBadgeColor = (reason?: string) => {
    switch (reason) {
      case 'allergy':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'intolerance':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  // Count exclusions for badge
  const exclusionCount = preferences.excludedIngredients?.length || 0;

  const tabs = [
    { id: 'meal' as PreferenceTab, label: 'Meal Prefs', icon: <Utensils size={16} /> },
    { id: 'allergy' as PreferenceTab, label: 'Allergies', icon: <ShieldAlert size={16} />, badge: exclusionCount > 0 ? exclusionCount : undefined },
    { id: 'macros' as PreferenceTab, label: 'Macros', icon: <Target size={16} /> },
  ];

  return (
    <div className={`max-w-2xl mx-auto p-6 bg-white rounded-xl ${!isSettingsMode ? 'shadow-lg border border-slate-100' : ''} animate-fadeIn`}>
      {!isSettingsMode && (
        <div className="text-center mb-8">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Utensils className="text-indigo-600 w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">Meal Preferences</h2>
          <p className="text-slate-500 mt-2">
            Tell us what you like so we can design the perfect week for you.
          </p>
        </div>
      )}

      {/* Sub-tabs - Only show in settings mode */}
      {isSettingsMode && (
        <div className="flex gap-1 p-1 bg-slate-100 rounded-lg mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white shadow-sm text-slate-900'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-red-100 text-red-600 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="space-y-6 mb-8">

        {/* Tab: Meal Preferences */}
        {(!isSettingsMode || activeTab === 'meal') && (
          <div className="space-y-6 animate-fadeIn">
            {/* Dietary Restrictions */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <span className="text-red-500 text-lg mb-1">•</span> Dietary Requirements
              </label>
              <input
                type="text"
                value={preferences.dietaryRestrictions}
                onChange={(e) => handleChange('dietaryRestrictions', e.target.value)}
                placeholder="e.g., Vegetarian, Gluten Free, Nut Allergy..."
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
              />
            </div>

            {/* Likes */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <Heart size={18} className="text-rose-500" />
                Cuisines & Foods You Love
              </label>
              <textarea
                value={preferences.likes}
                onChange={(e) => handleChange('likes', e.target.value)}
                placeholder="e.g., Italian pasta, Mexican tacos, Spicy curries, Fresh salads..."
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none resize-none"
              />
            </div>

            {/* Dislikes */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <ThumbsDown size={18} className="text-slate-500" />
                Foods to Avoid
              </label>
              <textarea
                value={preferences.dislikes}
                onChange={(e) => handleChange('dislikes', e.target.value)}
                placeholder="e.g., Mushrooms, Olives, Seafood..."
                rows={2}
                className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-slate-500 focus:ring-2 focus:ring-slate-200 outline-none resize-none"
              />
            </div>

            {/* Measurement Settings */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100">
              {/* Unit System */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <Scale size={18} className="text-slate-500" />
                  Units
                </label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => handleChange('unitSystem', 'metric')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      preferences.unitSystem === 'metric' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Metric
                  </button>
                  <button
                    onClick={() => handleChange('unitSystem', 'imperial')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      preferences.unitSystem === 'imperial' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Imperial
                  </button>
                </div>
              </div>

              {/* Temperature Scale */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <Thermometer size={18} className="text-slate-500" />
                  Temp
                </label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    onClick={() => handleChange('temperatureScale', 'celsius')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      preferences.temperatureScale === 'celsius' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    °C
                  </button>
                  <button
                    onClick={() => handleChange('temperatureScale', 'fahrenheit')}
                    className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                      preferences.temperatureScale === 'fahrenheit' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    °F
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Allergies & Exclusions */}
        {(!isSettingsMode || activeTab === 'allergy') && (
          <div className={`space-y-4 ${isSettingsMode ? 'animate-fadeIn' : 'pt-4 border-t border-slate-100'}`}>
            {!isSettingsMode && (
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-2">
                <ShieldAlert size={18} className="text-red-500" />
                Allergies & Always Exclude
              </label>
            )}
            {isSettingsMode && (
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert size={20} className="text-red-500" />
                <h3 className="text-lg font-semibold text-slate-800">Allergies & Exclusions</h3>
              </div>
            )}
            <p className="text-xs text-slate-500 mb-3">
              These ingredients will NEVER appear in any recipe. Use this for allergies, intolerances, or ingredients you never want.
            </p>

            {/* Add New Exclusion */}
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newIngredient}
                onChange={(e) => setNewIngredient(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addExcludedIngredient()}
                placeholder="Enter ingredient..."
                className="flex-1 px-4 py-2 rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none"
              />
              <select
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="px-3 py-2 rounded-lg border border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-200 outline-none bg-white"
              >
                {EXCLUSION_REASONS.map(r => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <button
                onClick={addExcludedIngredient}
                disabled={!newIngredient.trim()}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-medium rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus size={18} />
                Add
              </button>
            </div>

            {/* Excluded Ingredients List */}
            {preferences.excludedIngredients && preferences.excludedIngredients.length > 0 ? (
              <div className="space-y-2">
                {preferences.excludedIngredients.map((item) => (
                  <div
                    key={item.name}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle size={16} className={item.reason === 'allergy' ? 'text-red-500' : item.reason === 'intolerance' ? 'text-orange-500' : 'text-slate-400'} />
                      <span className="font-medium text-slate-800">{item.name}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${getReasonBadgeColor(item.reason)}`}>
                        {EXCLUSION_REASONS.find(r => r.value === item.reason)?.label || 'Preference'}
                      </span>
                    </div>
                    <button
                      onClick={() => removeExcludedIngredient(item.name)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                <ShieldAlert size={24} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm text-slate-400">No excluded ingredients yet</p>
                <p className="text-xs text-slate-400">Add ingredients you&apos;re allergic to or never want in recipes</p>
              </div>
            )}

            {/* Allergy Disclaimer */}
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-800">
                  <strong>Important:</strong> Recipes in this app are AI-generated or community-supplied. While we use your exclusion list to filter ingredients, we cannot guarantee complete accuracy. If you have severe allergies or intolerances, please always verify all ingredients before cooking or consuming any recipe.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Macros & Nutrition */}
        {(!isSettingsMode || activeTab === 'macros') && (
          <div className={`space-y-6 ${isSettingsMode ? 'animate-fadeIn' : 'pt-4 border-t border-slate-100'}`}>
            {isSettingsMode && (
              <div className="flex items-center gap-2 mb-2">
                <Target size={20} className="text-indigo-500" />
                <h3 className="text-lg font-semibold text-slate-800">Portions & Nutrition</h3>
              </div>
            )}

            {/* Portion Settings */}
            <div>
              {!isSettingsMode && (
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <Beef size={18} className="text-red-500" />
                  Portion & Nutrition
                </h3>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* Meat Serving Size */}
                <div className="bg-slate-50 p-4 rounded-lg">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                    <Beef size={16} className="text-red-500" />
                    Meat per person
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={50}
                      max={500}
                      step={10}
                      value={preferences.meatServingGrams || 175}
                      onChange={(e) => handleChange('meatServingGrams', parseInt(e.target.value) || 175)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-center"
                    />
                    <span className="text-sm text-slate-500">g</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 text-center">Recommended: 150-200g</p>
                </div>

                {/* Daily Calorie Target */}
                <div className="bg-slate-50 p-4 rounded-lg">
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-600 mb-2">
                    <Flame size={16} className="text-orange-500" />
                    Daily calories
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1000}
                      max={5000}
                      step={50}
                      value={preferences.calorieTarget || 2000}
                      onChange={(e) => handleChange('calorieTarget', parseInt(e.target.value) || 2000)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none text-center"
                    />
                    <span className="text-sm text-slate-500">kcal</span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1 text-center">Recommended: 2000 kcal</p>
                </div>
              </div>
            </div>

            {/* Macro Targets */}
            <div className="pt-4 border-t border-slate-100">
              <MacroTargetsEditor hasPro={hasPro} onUpgradeClick={onUpgradeClick} />
            </div>
          </div>
        )}

      </div>

      {!isSettingsMode && onSubmit && (
        <button
          onClick={onSubmit}
          disabled={isLoading}
          className={`w-full py-4 rounded-xl font-bold text-lg text-white transition-all flex items-center justify-center gap-2 ${
            isLoading
              ? 'bg-indigo-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg active:scale-[0.99]'
          }`}
        >
          {isLoading ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Generating Plan...
            </>
          ) : (
            'Generate My Meal Plan'
          )}
        </button>
      )}
    </div>
  );
};

export default PreferenceForm;
