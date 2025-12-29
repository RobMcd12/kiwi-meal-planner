import React, { useState } from 'react';
import { MealConfig, UserPreferences, PantryItem } from '../types';
import ConfigForm from './ConfigForm';
import PreferenceForm from './PreferenceForm';
import PantryManager from './PantryManager';
import { getAllUserData, restoreUserData } from '../services/storageService';
import { ArrowLeft, Check, Sliders, Archive, Utensils, Database, Download, Upload, AlertTriangle } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'general' | 'pantry' | 'prefs' | 'data'>('general');

  const handleExport = () => {
    const data = getAllUserData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kiwi-meal-planner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        if (restoreUserData(content)) {
          alert("Data imported successfully! The app will now reload.");
          window.location.reload();
        } else {
          alert("Failed to import data. The file might be corrupted or invalid.");
        }
      };
      reader.readAsText(file);
    }
  };

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
            <button
                onClick={() => setActiveTab('data')}
                className={`flex-1 min-w-[120px] py-4 text-center font-medium text-sm flex items-center justify-center gap-2 transition-colors border-b-2 ${
                    activeTab === 'data' 
                    ? 'border-slate-800 text-slate-800 bg-slate-100' 
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
            >
                <Database size={18} />
                Data
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
            {activeTab === 'data' && (
                <div className="animate-fadeIn space-y-8 max-w-xl mx-auto py-8">
                    <div className="text-center mb-8">
                        <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Database className="text-slate-600 w-8 h-8" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800">Manage Your Data</h3>
                        <p className="text-slate-500 mt-2">
                            Export your pantry, favorites, and settings to move them to another device or account.
                        </p>
                    </div>

                    <div className="grid gap-6">
                        {/* Export */}
                        <div className="bg-indigo-50 border border-indigo-100 p-6 rounded-xl flex items-center justify-between">
                            <div>
                                <h4 className="font-bold text-indigo-900 mb-1">Export Backup</h4>
                                <p className="text-sm text-indigo-700/80">Save your current setup to a JSON file.</p>
                            </div>
                            <button 
                                onClick={handleExport}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm"
                            >
                                <Download size={18} />
                                Export
                            </button>
                        </div>

                        {/* Import */}
                        <div className="bg-white border border-slate-200 p-6 rounded-xl">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h4 className="font-bold text-slate-800 mb-1">Import Backup</h4>
                                    <p className="text-sm text-slate-500">Restore data from a previously exported file.</p>
                                </div>
                                <label className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 shadow-sm">
                                    <Upload size={18} />
                                    Import
                                    <input 
                                        type="file" 
                                        accept=".json" 
                                        onChange={handleImport}
                                        className="hidden" 
                                    />
                                </label>
                            </div>
                            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg text-xs">
                                <AlertTriangle size={16} />
                                <span>Warning: Importing will overwrite your current pantry and settings.</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;