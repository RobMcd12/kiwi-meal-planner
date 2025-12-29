import React, { useState } from 'react';
import { MealConfig, UserPreferences, PantryItem } from '../types';
import ConfigForm from './ConfigForm';
import PreferenceForm from './PreferenceForm';
import PantryManager from './PantryManager';
import { ArrowLeft, Check, Sliders, Archive, Utensils } from 'lucide-react';

interface SettingsViewProps {
  config: MealConfig;
  setConfig: React.Dispatch<React.SetStateAction<MealConfig>>;
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
  pantryItems: PantryItem[];
  setPantryItems: React.Dispatch<React.SetStateAction<PantryItem[]>>;
  onClose: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  setConfig,
  preferences,
  setPreferences,
  pantryItems,
  setPantryItems,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'pantry' | 'prefs'>('general');

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn pb-20">
      <div className="flex items-center justify-between mb-8 px-4">
        <button 
          onClick={onClose}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors flex items-center gap-2 text-slate-600"
        >
          <ArrowLeft size={24} />
          <span className="font-medium hidden sm:inline">Back</span>
        </button>
        <h2 className="text-2xl font-bold text-slate-800">Overall Preferences</h2>
        <button 
          onClick={onClose}
          className="bg-slate-900 text-white px-6 py-2 rounded-full font-medium hover:bg-slate-800 transition-colors flex items-center gap-2"
        >
          <Check size={18} />
          Done
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-slate-200 overflow-x-auto">
            <button
                onClick={() => setActiveTab('general')}
                className={`flex-1 min-w-[120px] py-4 text-center font-medium text-sm flex items-center justify-center gap-2 transition-colors border-b-2 ${
                    activeTab === 'general' 
                    ? 'border-indigo-600 text-indigo-600 bg-indigo-50/50' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
            >
                <Sliders size={18} />
                Plan Config
            </button>
            <button
                onClick={() => setActiveTab('pantry')}
                className={`flex-1 min-w-[120px] py-4 text-center font-medium text-sm flex items-center justify-center gap-2 transition-colors border-b-2 ${
                    activeTab === 'pantry' 
                    ? 'border-emerald-600 text-emerald-600 bg-emerald-50/50' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
            >
                <Archive size={18} />
                Pantry
            </button>
             <button
                onClick={() => setActiveTab('prefs')}
                className={`flex-1 min-w-[120px] py-4 text-center font-medium text-sm flex items-center justify-center gap-2 transition-colors border-b-2 ${
                    activeTab === 'prefs'
                    ? 'border-rose-600 text-rose-600 bg-rose-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
            >
                <Utensils size={18} />
                Preferences
            </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-8 min-h-[500px]">
            {activeTab === 'general' && (
                <div className="animate-fadeIn">
                    <ConfigForm config={config} setConfig={setConfig} isSettingsMode={true} />
                </div>
            )}
            {activeTab === 'pantry' && (
                <div className="animate-fadeIn">
                    <PantryManager items={pantryItems} setItems={setPantryItems} isSettingsMode={true} />
                </div>
            )}
            {activeTab === 'prefs' && (
                 <div className="animate-fadeIn">
                    <PreferenceForm preferences={preferences} setPreferences={setPreferences} isSettingsMode={true} />
                 </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;