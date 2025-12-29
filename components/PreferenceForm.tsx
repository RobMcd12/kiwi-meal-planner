import React from 'react';
import { UserPreferences } from '../types';
import { Utensils, Heart, ThumbsDown, Scale, Thermometer } from 'lucide-react';

interface PreferenceFormProps {
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
  onSubmit?: () => void;
  isLoading?: boolean;
  isSettingsMode?: boolean;
}

const PreferenceForm: React.FC<PreferenceFormProps> = ({ preferences, setPreferences, onSubmit, isLoading = false, isSettingsMode = false }) => {
  const handleChange = (field: keyof UserPreferences, value: any) => {
    setPreferences(prev => ({ ...prev, [field]: value }));
  };

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

      <div className="space-y-6 mb-8">
        
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
