import React, { useState } from 'react';
import { MealConfig, UserPreferences, PantryItem } from '../types';
import ConfigForm from './ConfigForm';
import PreferenceForm from './PreferenceForm';
import PantryManager from './PantryManager';
import { useAuth } from './AuthProvider';
import { supabase } from '../services/authService';
import { ArrowLeft, Check, Sliders, Archive, Utensils, UserCircle, Loader2 } from 'lucide-react';

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
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'general' | 'pantry' | 'prefs' | 'account'>('general');
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState(false);

  // Check if user has Google identity linked
  const hasGoogleLinked = user?.identities?.some(
    (identity) => identity.provider === 'google'
  ) ?? false;

  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true);
    setLinkError(null);
    setLinkSuccess(false);

    try {
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        throw error;
      }
      // If successful, the user will be redirected to Google for authentication
      // and then back to the app
    } catch (err: unknown) {
      console.error('Failed to link Google account:', err);
      setLinkError(
        err instanceof Error
          ? err.message
          : 'Failed to link Google account. Please try again.'
      );
      setIsLinkingGoogle(false);
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
                onClick={() => setActiveTab('account')}
                className={`flex-1 min-w-[120px] py-4 text-center font-medium text-sm flex items-center justify-center gap-2 transition-colors border-b-2 ${
                    activeTab === 'account'
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                }`}
            >
                <UserCircle size={18} />
                Account
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
            {activeTab === 'account' && (
                <div className="animate-fadeIn space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Account Information</h3>
                        <p className="text-sm text-slate-500">
                            Manage your account settings and connected services.
                        </p>
                    </div>

                    {/* User Info */}
                    {user && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <div className="flex items-center gap-4">
                                {user.user_metadata?.avatar_url ? (
                                    <img
                                        src={user.user_metadata.avatar_url}
                                        alt="Profile"
                                        className="w-16 h-16 rounded-full"
                                    />
                                ) : (
                                    <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center">
                                        <UserCircle size={32} className="text-slate-400" />
                                    </div>
                                )}
                                <div>
                                    <p className="font-semibold text-slate-800">
                                        {user.user_metadata?.full_name || 'User'}
                                    </p>
                                    <p className="text-sm text-slate-500">{user.email}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Connected Accounts */}
                    <div>
                        <h4 className="font-medium text-slate-700 mb-3">Connected Accounts</h4>

                        {/* Google Connection */}
                        <div className="border border-slate-200 rounded-xl p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-800">Google</p>
                                        <p className="text-sm text-slate-500">
                                            {hasGoogleLinked ? 'Connected' : 'Not connected'}
                                        </p>
                                    </div>
                                </div>

                                {hasGoogleLinked ? (
                                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-medium rounded-full flex items-center gap-1">
                                        <Check size={14} />
                                        Linked
                                    </span>
                                ) : (
                                    <button
                                        onClick={handleLinkGoogle}
                                        disabled={isLinkingGoogle}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {isLinkingGoogle ? (
                                            <>
                                                <Loader2 size={16} className="animate-spin" />
                                                Connecting...
                                            </>
                                        ) : (
                                            'Connect Google'
                                        )}
                                    </button>
                                )}
                            </div>

                            {/* Info message for users not connected */}
                            {!hasGoogleLinked && !linkError && (
                                <p className="text-xs text-slate-400 mt-3">
                                    Link your Google account to enable quick sign-in with Google in the future.
                                </p>
                            )}

                            {/* Error message */}
                            {linkError && (
                                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                                    <p className="text-sm text-red-600">{linkError}</p>
                                </div>
                            )}

                            {/* Success message */}
                            {linkSuccess && (
                                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <p className="text-sm text-emerald-600">
                                        Google account linked successfully!
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Current Auth Providers */}
                    {user?.identities && user.identities.length > 0 && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            <h4 className="font-medium text-slate-700 mb-2 text-sm">Your Sign-in Methods</h4>
                            <div className="flex flex-wrap gap-2">
                                {user.identities.map((identity) => (
                                    <span
                                        key={identity.id}
                                        className="px-3 py-1 bg-white border border-slate-200 text-slate-600 text-sm rounded-full capitalize"
                                    >
                                        {identity.provider}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;