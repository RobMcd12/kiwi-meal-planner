import React from 'react';
import { MealConfig } from '../types';
import { Users, Calendar, Coffee, Sun, Moon, Package, ShoppingCart, Sparkles, Crown, Lock } from 'lucide-react';

interface ConfigFormProps {
  config: MealConfig;
  setConfig: React.Dispatch<React.SetStateAction<MealConfig>>;
  onNext?: () => void;
  isSettingsMode?: boolean;
  hasPantryItems?: boolean;
  pantryItemCount?: number;
  onManagePantry?: () => void;
  hasPro?: boolean;
  onUpgradeClick?: () => void;
}

const ConfigForm: React.FC<ConfigFormProps> = ({ config, setConfig, onNext, isSettingsMode = false, hasPantryItems = false, pantryItemCount = 0, onManagePantry, hasPro = false, onUpgradeClick }) => {
  const updateConfig = (key: keyof MealConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className={`max-w-2xl mx-auto p-6 bg-white rounded-xl ${!isSettingsMode ? 'shadow-lg border border-slate-100' : ''} animate-fadeIn`}>
      {!isSettingsMode && (
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-slate-800">Plan Settings</h2>
          <p className="text-slate-500 mt-2">Customize your week.</p>
        </div>
      )}

      <div className="space-y-8 mb-8">
        {/* Days Slider */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
            <Calendar size={18} className="text-indigo-500" />
            How many days to plan?
          </label>
          <div className="px-2">
            <input
              type="range"
              min="1"
              max="7"
              value={config.days}
              onChange={(e) => updateConfig('days', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
            />
            <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium">
              <span>1 Day</span>
              <span>7 Days</span>
            </div>
            <div className="text-center mt-2 font-bold text-indigo-600 text-lg">
              {config.days} Days
            </div>
          </div>
        </div>

        {/* People Slider */}
        <div>
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
            <Users size={18} className="text-indigo-500" />
            Number of People
          </label>
          <div className="flex items-center gap-4">
             <input
              type="range"
              min="1"
              max="12"
              value={config.peopleCount}
              onChange={(e) => updateConfig('peopleCount', parseInt(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 flex-1"
            />
            <div className="w-12 h-12 flex items-center justify-center bg-indigo-50 rounded-lg border border-indigo-100 text-indigo-700 font-bold text-xl">
              {config.peopleCount}
            </div>
          </div>
        </div>

        {/* Meals Selection */}
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-4">
            Which meals to include?
          </label>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => updateConfig('includeBreakfast', !config.includeBreakfast)}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                config.includeBreakfast 
                  ? 'border-orange-500 bg-orange-50 text-orange-700' 
                  : 'border-slate-200 hover:border-slate-300 text-slate-500'
              }`}
            >
              <Coffee size={24} />
              <span className="font-medium text-sm">Breakfast</span>
            </button>
            
            <button
              onClick={() => updateConfig('includeLunch', !config.includeLunch)}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                config.includeLunch 
                  ? 'border-blue-500 bg-blue-50 text-blue-700' 
                  : 'border-slate-200 hover:border-slate-300 text-slate-500'
              }`}
            >
              <Sun size={24} />
              <span className="font-medium text-sm">Lunch</span>
            </button>

            <button
              onClick={() => updateConfig('includeDinner', !config.includeDinner)}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                config.includeDinner 
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-700' 
                  : 'border-slate-200 hover:border-slate-300 text-slate-500'
              }`}
            >
              <Moon size={24} />
              <span className="font-medium text-sm">Dinner</span>
            </button>
          </div>
          {!config.includeBreakfast && !config.includeLunch && !config.includeDinner && (
             <p className="text-red-500 text-xs mt-2 text-center">Please select at least one meal.</p>
          )}
        </div>

        {/* Use What I Have Mode */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
              <Package size={18} className="text-blue-500" />
              Recipe Mode
            </label>
            {onManagePantry && (
              <button
                type="button"
                onClick={onManagePantry}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                {hasPantryItems ? `Manage Pantry (${pantryItemCount})` : 'Add Pantry Items'}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => updateConfig('useWhatIHave', false)}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                !config.useWhatIHave
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                  : 'border-slate-200 hover:border-slate-300 text-slate-500'
              }`}
            >
              <ShoppingCart size={24} />
              <span className="font-medium text-sm">Standard</span>
              <span className="text-xs text-center opacity-75">Best recipes, then shop</span>
            </button>

            <button
              onClick={() => {
                if (!hasPro) {
                  onUpgradeClick?.();
                } else if (hasPantryItems) {
                  updateConfig('useWhatIHave', true);
                }
              }}
              disabled={!hasPro ? false : !hasPantryItems}
              className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all relative ${
                config.useWhatIHave && hasPro
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : hasPro && hasPantryItems
                    ? 'border-slate-200 hover:border-slate-300 text-slate-500'
                    : 'border-slate-100 bg-slate-50 text-slate-400 cursor-pointer'
              }`}
            >
              {!hasPro && (
                <span className="absolute top-2 right-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full">
                  <Crown size={10} />
                  PRO
                </span>
              )}
              <div className="relative">
                {hasPro ? <Package size={24} /> : <Lock size={24} />}
                {hasPro && <Sparkles size={12} className="absolute -top-1 -right-1 text-blue-500" />}
              </div>
              <span className="font-medium text-sm">Use What I Have</span>
              <span className="text-xs text-center opacity-75">
                {!hasPro ? 'Pro feature' : hasPantryItems ? 'Prioritize pantry items' : 'Add pantry items first'}
              </span>
            </button>
          </div>
          {hasPro && !hasPantryItems && (
            <p className="text-xs text-slate-400 mt-2 text-center">
              Scan or add pantry items to enable smart mode
            </p>
          )}
          {config.useWhatIHave && hasPantryItems && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs text-blue-700">
                <strong>Smart Mode:</strong> Recipes will prioritize using ingredients from your pantry, fridge, and freezer to minimize shopping and reduce food waste.
              </p>
            </div>
          )}
        </div>
      </div>

      {!isSettingsMode && onNext && (
        <button
          onClick={onNext}
          disabled={!config.includeBreakfast && !config.includeLunch && !config.includeDinner}
          className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-transform active:scale-[0.99]"
        >
          Continue
        </button>
      )}
    </div>
  );
};

export default ConfigForm;
