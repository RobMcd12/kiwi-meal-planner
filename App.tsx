import React, { useState, useEffect } from 'react';
import { AppStep, PantryItem, UserPreferences, MealPlanResponse, MealConfig, Meal } from './types';
import PantryManager from './components/PantryManager';
import PreferenceForm from './components/PreferenceForm';
import PlanDisplay from './components/PlanDisplay';
import WelcomeScreen from './components/WelcomeScreen';
import ConfigForm from './components/ConfigForm';
import FavoritesView from './components/FavoritesView';
import SettingsView from './components/SettingsView';
import AuthScreen from './components/AuthScreen';
import ErrorBoundary from './components/ErrorBoundary';
import InstallPrompt from './components/InstallPrompt';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { generateMealPlan, generateShoppingListFromFavorites } from './services/geminiService';
import {
  saveConfig,
  loadConfig,
  savePreferences,
  loadPreferences,
  savePantry,
  loadPantry,
  savePlanToHistory
} from './services/storageService';
import { signOut } from './services/authService';
import { ChefHat, Settings, LogOut, User } from 'lucide-react';

// --- Default States ---
const DEFAULT_CONFIG: MealConfig = {
  days: 5,
  peopleCount: 2,
  includeBreakfast: true,
  includeLunch: true,
  includeDinner: true,
};

const DEFAULT_PREFERENCES: UserPreferences = {
  dietaryRestrictions: "",
  likes: "",
  dislikes: "",
  unitSystem: "metric",
  temperatureScale: "celsius",
};

const AppContent: React.FC = () => {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const { toasts, dismissToast, success, error: showError } = useToast();

  const [step, setStep] = useState<AppStep>(AppStep.WELCOME);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [config, setConfig] = useState<MealConfig>(DEFAULT_CONFIG);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [planData, setPlanData] = useState<MealPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Load data from storage on mount and when auth changes
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedPantry, loadedConfig, loadedPrefs] = await Promise.all([
          loadPantry(),
          loadConfig(DEFAULT_CONFIG),
          loadPreferences(DEFAULT_PREFERENCES),
        ]);

        setPantryItems(loadedPantry);
        setConfig(loadedConfig);
        setPreferences(loadedPrefs);
        setDataLoaded(true);
      } catch (err) {
        console.error('Error loading data:', err);
        setDataLoaded(true);
      }
    };

    if (!authLoading) {
      loadData();
    }
  }, [authLoading, isAuthenticated]);

  // Persistence Effects - Automatically save on change
  useEffect(() => {
    if (dataLoaded) {
      saveConfig(config);
    }
  }, [config, dataLoaded]);

  useEffect(() => {
    if (dataLoaded) {
      savePreferences(preferences);
    }
  }, [preferences, dataLoaded]);

  useEffect(() => {
    if (dataLoaded) {
      savePantry(pantryItems);
    }
  }, [pantryItems, dataLoaded]);

  // Handlers
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await generateMealPlan(config, preferences, pantryItems);
      setPlanData(data);

      // Save to history
      const planId = await savePlanToHistory(data);
      if (planId) {
        data.id = planId;
      }

      setStep(AppStep.RESULTS);
      success('Meal plan generated successfully!');
    } catch (err) {
      showError('Something went wrong generating the plan. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateFromFavorites = async (meals: Meal[]) => {
    setLoading(true);
    try {
      const data = await generateShoppingListFromFavorites(meals, config.peopleCount, pantryItems);
      setPlanData(data);
      setStep(AppStep.RESULTS);
      success('Shopping list generated from favorites!');
    } catch (err) {
      showError('Error generating list from favorites.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      success('Signed out successfully');
      setStep(AppStep.WELCOME);
    } catch (err) {
      showError('Failed to sign out');
    }
  };

  const resetApp = () => {
    setStep(AppStep.WELCOME);
    setPlanData(null);
  };

  // Show loading while auth is initializing
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Render logic helper
  const renderStep = () => {
    switch (step) {
      case AppStep.WELCOME:
        return (
          <WelcomeScreen
            onStartNew={() => setStep(AppStep.CONFIG)}
            onViewFavorites={() => setStep(AppStep.FAVORITES)}
            onOpenSettings={() => setStep(AppStep.SETTINGS)}
          />
        );

      case AppStep.AUTH:
        return (
          <AuthScreen
            onSkip={() => setStep(AppStep.WELCOME)}
          />
        );

      case AppStep.SETTINGS:
        return (
          <SettingsView
            config={config}
            setConfig={setConfig}
            preferences={preferences}
            setPreferences={setPreferences}
            pantryItems={pantryItems}
            setPantryItems={setPantryItems}
            onClose={() => setStep(AppStep.WELCOME)}
          />
        );

      case AppStep.CONFIG:
        return (
          <ConfigForm
            config={config}
            setConfig={setConfig}
            onNext={() => setStep(AppStep.PANTRY)}
          />
        );

      case AppStep.PANTRY:
        return (
          <PantryManager
            items={pantryItems}
            setItems={setPantryItems}
            onNext={() => setStep(AppStep.PREFERENCES)}
          />
        );

      case AppStep.PREFERENCES:
        return (
          <div className="animate-fadeIn">
            <button
              onClick={() => setStep(AppStep.PANTRY)}
              className="mb-4 text-slate-500 text-sm hover:text-slate-800 flex items-center gap-1"
            >
              ← Back to Pantry
            </button>
            <PreferenceForm
              preferences={preferences}
              setPreferences={setPreferences}
              onSubmit={handleGenerate}
              isLoading={loading}
            />
          </div>
        );

      case AppStep.RESULTS:
        return planData ? <PlanDisplay data={planData} onReset={resetApp} /> : null;

      case AppStep.FAVORITES:
        return (
          <FavoritesView
            onBack={() => setStep(AppStep.WELCOME)}
            onGenerateList={handleGenerateFromFavorites}
            isLoading={loading}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setStep(AppStep.WELCOME)}
          >
            <div className="bg-emerald-600 p-1.5 rounded-lg text-white">
              <ChefHat size={24} />
            </div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">
              Kiwi<span className="text-emerald-600">MealPlanner</span>
            </h1>
          </div>

          {/* Header Actions */}
          <div className="flex items-center gap-3">
            {/* User info if authenticated */}
            {isAuthenticated && user && (
              <div className="hidden sm:flex items-center gap-2 text-sm text-slate-600">
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt=""
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <User size={16} />
                )}
                <span className="max-w-[120px] truncate">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
              </div>
            )}

            {/* Settings Icon */}
            {step !== AppStep.WELCOME && step !== AppStep.SETTINGS && step !== AppStep.AUTH && (
              <button
                onClick={() => setStep(AppStep.SETTINGS)}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                title="Settings"
              >
                <Settings size={20} />
              </button>
            )}

            {/* Sign out button */}
            {isAuthenticated && (
              <button
                onClick={handleSignOut}
                className="text-slate-400 hover:text-slate-700 transition-colors p-1"
                title="Sign out"
              >
                <LogOut size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Progress Indicator (Only for creation flow) */}
        {(step === AppStep.CONFIG || step === AppStep.PANTRY || step === AppStep.PREFERENCES) && (
          <div className="max-w-5xl mx-auto mt-4">
            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-400 uppercase tracking-widest">
              <span className={step === AppStep.CONFIG ? "text-emerald-600 font-bold" : ""}>Settings</span>
              <span>/</span>
              <span className={step === AppStep.PANTRY ? "text-emerald-600 font-bold" : ""}>Pantry</span>
              <span>/</span>
              <span className={step === AppStep.PREFERENCES ? "text-emerald-600 font-bold" : ""}>Prefs</span>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8">
        {renderStep()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} Kiwi Meal Planner. An app by <a href="https://www.unicloud.co.nz" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 hover:underline">Unicloud.co.nz</a></p>
      </footer>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
