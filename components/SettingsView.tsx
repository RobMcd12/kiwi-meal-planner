import React, { useState, useEffect } from 'react';
import { MealConfig, UserPreferences, PantryItem, SubscriptionState, CountryCode } from '../types';
import ConfigForm from './ConfigForm';
import PreferenceForm from './PreferenceForm';
import PantryManager from './PantryManager';
import MediaFilesManager from './MediaFilesManager';
import SubscriptionManager from './SubscriptionManager';
import { useAuth } from './AuthProvider';
import { supabase } from '../services/authService';
import { getSubscriptionState } from '../services/subscriptionService';
import { getUserProfile, updateUserProfile, COUNTRY_OPTIONS } from '../services/profileService';
import { ArrowLeft, Check, Sliders, Archive, Utensils, UserCircle, Loader2, FileVideo, Crown, Pencil, Globe, Save } from 'lucide-react';
import ResponsiveTabs, { Tab } from './ResponsiveTabs';

interface SettingsViewProps {
  config: MealConfig;
  setConfig: React.Dispatch<React.SetStateAction<MealConfig>>;
  preferences: UserPreferences;
  setPreferences: React.Dispatch<React.SetStateAction<UserPreferences>>;
  pantryItems: PantryItem[];
  setPantryItems: React.Dispatch<React.SetStateAction<PantryItem[]>>;
  onClose: () => void;
  initialTab?: 'general' | 'pantry' | 'prefs' | 'account' | 'subscription';
}

const SettingsView: React.FC<SettingsViewProps> = ({
  config,
  setConfig,
  preferences,
  setPreferences,
  pantryItems,
  setPantryItems,
  onClose,
  initialTab = 'general',
}) => {
  const { user, isImpersonating } = useAuth();
  // If impersonating and trying to access account tab, redirect to general
  const safeInitialTab = isImpersonating && (initialTab === 'account' || initialTab === 'subscription') ? 'general' : initialTab;
  const [activeTab, setActiveTab] = useState<'general' | 'pantry' | 'prefs' | 'account' | 'subscription'>(safeInitialTab);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState(false);
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState | null>(null);

  // Profile editing state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editCountry, setEditCountry] = useState<CountryCode | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  // Load user profile
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      setIsLoadingProfile(true);
      try {
        const profile = await getUserProfile(user.id);
        if (profile) {
          setEditDisplayName(profile.displayName || user.user_metadata?.full_name || '');
          setEditCountry(profile.country);
        } else {
          setEditDisplayName(user.user_metadata?.full_name || '');
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    loadProfile();
  }, [user]);

  // Handle profile save
  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    setProfileSaveSuccess(false);
    try {
      const success = await updateUserProfile(user.id, {
        displayName: editDisplayName.trim() || null,
        country: editCountry,
      });
      if (success) {
        setProfileSaveSuccess(true);
        setIsEditingProfile(false);
        setTimeout(() => setProfileSaveSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Error saving profile:', err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Cancel profile editing
  const handleCancelEdit = async () => {
    if (!user) return;
    // Reset to original values
    const profile = await getUserProfile(user.id);
    if (profile) {
      setEditDisplayName(profile.displayName || user.user_metadata?.full_name || '');
      setEditCountry(profile.country);
    } else {
      setEditDisplayName(user.user_metadata?.full_name || '');
      setEditCountry(null);
    }
    setIsEditingProfile(false);
  };

  // Load subscription state
  useEffect(() => {
    const loadSubscription = async () => {
      const state = await getSubscriptionState();
      setSubscriptionState(state);
    };
    loadSubscription();
  }, [user]);

  // Check for auth callback errors in URL (e.g., after OAuth redirect)
  useEffect(() => {
    const url = new URL(window.location.href);
    const errorCode = url.searchParams.get('error_code') || url.hash.match(/error_code=([^&]+)/)?.[1];
    const errorDescription = url.searchParams.get('error_description') || url.hash.match(/error_description=([^&]+)/)?.[1];

    if (errorCode === 'identity_already_exists') {
      // Google is already linked - show success message instead of error
      setLinkSuccess(true);
      setActiveTab('account');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (errorCode && errorDescription) {
      setLinkError(decodeURIComponent(errorDescription.replace(/\+/g, ' ')));
      setActiveTab('account');
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Check if user has Google identity linked and get the identity details
  const googleIdentity = user?.identities?.find(
    (identity) => identity.provider === 'google'
  );
  const hasGoogleLinked = !!googleIdentity;

  // Get Google account details from the identity
  const googleEmail = googleIdentity?.identity_data?.email as string | undefined;
  const googleName = googleIdentity?.identity_data?.full_name as string | undefined;
  const googleAvatar = googleIdentity?.identity_data?.avatar_url as string | undefined;

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
      const errorMessage = err instanceof Error ? err.message : '';

      // Handle specific error cases
      if (errorMessage.includes('Manual linking is disabled')) {
        setLinkError(
          'Account linking is not currently available. Please contact support if you need to connect your Google account.'
        );
      } else {
        setLinkError(
          errorMessage || 'Failed to link Google account. Please try again.'
        );
      }
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
        <ResponsiveTabs
          tabs={[
            { id: 'general', label: 'Plan Defaults', icon: <Sliders size={18} />, color: 'indigo' },
            { id: 'pantry', label: 'Pantry', icon: <Archive size={18} />, color: 'emerald' },
            { id: 'prefs', label: 'Preferences', icon: <Utensils size={18} />, color: 'rose' },
            { id: 'account', label: 'Account', icon: <UserCircle size={18} />, color: 'blue', hidden: isImpersonating },
            { id: 'subscription', label: 'Subscription', icon: <Crown size={18} />, color: 'amber', hidden: isImpersonating },
          ]}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as any)}
          variant="underline"
          visibleCount={5}
        />

        {/* Content */}
        <div className="p-4 md:p-8 min-h-[500px]">
            {activeTab === 'general' && (
                <div className="animate-fadeIn">
                    <ConfigForm config={config} setConfig={setConfig} isSettingsMode={true} />
                </div>
            )}
            {activeTab === 'pantry' && (
                <div className="animate-fadeIn">
                    <PantryManager
                      items={pantryItems}
                      setItems={setPantryItems}
                      isSettingsMode={true}
                      unitSystem={preferences.unitSystem}
                      hasPro={subscriptionState?.hasPro ?? false}
                      onUpgradeClick={() => setActiveTab('subscription')}
                    />
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

                    {/* User Profile */}
                    {user && (
                        <div className="bg-slate-50 rounded-xl p-4">
                            {isLoadingProfile ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 size={24} className="animate-spin text-slate-400" />
                                </div>
                            ) : isEditingProfile ? (
                                // Edit Mode
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4 pb-4 border-b border-slate-200">
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
                                            <p className="font-semibold text-slate-800">Edit Profile</p>
                                            <p className="text-sm text-slate-500">{user.email}</p>
                                        </div>
                                    </div>

                                    {/* Display Name */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            Display Name
                                        </label>
                                        <input
                                            type="text"
                                            value={editDisplayName}
                                            onChange={(e) => setEditDisplayName(e.target.value)}
                                            placeholder="Enter your name"
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                        />
                                    </div>

                                    {/* Country Selection */}
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">
                                            <div className="flex items-center gap-2">
                                                <Globe size={16} />
                                                Country
                                            </div>
                                        </label>
                                        <p className="text-xs text-slate-500 mb-2">
                                            This helps us use local ingredient names (e.g., cilantro vs coriander)
                                        </p>
                                        <select
                                            value={editCountry || ''}
                                            onChange={(e) => setEditCountry(e.target.value as CountryCode || null)}
                                            className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
                                        >
                                            <option value="">Select your country</option>
                                            {COUNTRY_OPTIONS.map((country) => (
                                                <option key={country.code} value={country.code}>
                                                    {country.flag} {country.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-3 pt-2">
                                        <button
                                            onClick={handleSaveProfile}
                                            disabled={isSavingProfile}
                                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            {isSavingProfile ? (
                                                <>
                                                    <Loader2 size={16} className="animate-spin" />
                                                    Saving...
                                                </>
                                            ) : (
                                                <>
                                                    <Save size={16} />
                                                    Save Changes
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={handleCancelEdit}
                                            disabled={isSavingProfile}
                                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-medium rounded-lg transition-colors"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                // View Mode
                                <div>
                                    <div className="flex items-center justify-between">
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
                                                    {editDisplayName || user.user_metadata?.full_name || 'User'}
                                                </p>
                                                <p className="text-sm text-slate-500">{user.email}</p>
                                                {editCountry && (
                                                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-1">
                                                        <Globe size={14} />
                                                        {COUNTRY_OPTIONS.find(c => c.code === editCountry)?.flag}{' '}
                                                        {COUNTRY_OPTIONS.find(c => c.code === editCountry)?.name}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsEditingProfile(true)}
                                            className="p-2 hover:bg-slate-200 rounded-lg transition-colors text-slate-600"
                                            title="Edit profile"
                                        >
                                            <Pencil size={18} />
                                        </button>
                                    </div>
                                    {profileSaveSuccess && (
                                        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2">
                                            <Check size={16} className="text-emerald-600" />
                                            <p className="text-sm text-emerald-600">Profile updated successfully!</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Connected Accounts */}
                    <div>
                        <h4 className="font-medium text-slate-700 mb-3">Connected Accounts</h4>

                        {/* Google Connection */}
                        <div className={`border rounded-xl p-4 ${hasGoogleLinked ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200'}`}>
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

                            {/* Connected Google Account Details */}
                            {hasGoogleLinked && (
                                <div className="mt-4 pt-4 border-t border-emerald-200">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Connected Account</p>
                                    <div className="flex items-center gap-3 bg-white rounded-lg p-3 border border-slate-200">
                                        {googleAvatar ? (
                                            <img
                                                src={googleAvatar}
                                                alt="Google profile"
                                                className="w-10 h-10 rounded-full"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                <UserCircle size={24} className="text-slate-400" />
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            {googleName && (
                                                <p className="font-medium text-slate-800 truncate">{googleName}</p>
                                            )}
                                            {googleEmail && (
                                                <p className="text-sm text-slate-500 truncate">{googleEmail}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 text-emerald-600">
                                            <Check size={16} />
                                            <span className="text-xs font-medium">Verified</span>
                                        </div>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">
                                        You can sign in with this Google account anytime.
                                    </p>
                                </div>
                            )}

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
                            {linkSuccess && !hasGoogleLinked && (
                                <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                                    <p className="text-sm text-emerald-600">
                                        Google account linked successfully!
                                    </p>
                                </div>
                            )}
                            {linkSuccess && hasGoogleLinked && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm text-blue-600">
                                        Your Google account is already connected. You can sign in with Google anytime.
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

                    {/* Uploaded Media Files */}
                    <div className="bg-white rounded-xl border border-slate-200 p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="bg-slate-100 p-2 rounded-lg">
                                <FileVideo className="text-slate-600" size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-slate-800">Uploaded Media Files</h3>
                                <p className="text-sm text-slate-500">Video and audio recordings from pantry scanning</p>
                            </div>
                        </div>
                        <MediaFilesManager />
                    </div>
                </div>
            )}
            {activeTab === 'subscription' && (
                <div className="animate-fadeIn">
                    <div className="mb-6">
                        <h3 className="text-lg font-semibold text-slate-800 mb-2">Subscription</h3>
                        <p className="text-sm text-slate-500">
                            Manage your subscription and billing.
                        </p>
                    </div>
                    <SubscriptionManager />
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SettingsView;