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
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import MyFeedback from './components/MyFeedback';
import SavedPlansView from './components/SavedPlansView';
import SingleRecipeGenerator from './components/SingleRecipeGenerator';
import FeedbackDialog from './components/FeedbackDialog';
import ErrorBoundary from './components/ErrorBoundary';
import InstallPrompt from './components/InstallPrompt';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { UploadProvider } from './contexts/UploadContext';
import { ToastContainer } from './components/Toast';
import { useToast } from './hooks/useToast';
import { generateMealPlan, generateShoppingListFromFavorites, generateDishImage } from './services/geminiService';
import {
  saveConfig,
  loadConfig,
  savePreferences,
  loadPreferences,
  savePantry,
  loadPantry,
  savePlanToHistory,
  cacheImage
} from './services/storageService';
import { signOut } from './services/authService';
import { getNewResponseCount } from './services/feedbackService';
import { ChefHat, Settings, LogOut, User, Shield, MessageSquare, Bell, HelpCircle, Menu, X, CalendarPlus, BookHeart, FolderHeart, Sparkles, UserCircle } from 'lucide-react';
import HelpModal from './components/HelpModal';

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
  const { user, isAuthenticated, loading: authLoading, isAdmin } = useAuth();
  const { toasts, dismissToast, success, error: showError } = useToast();

  // Start on landing page, move to welcome after auth
  const [step, setStep] = useState<AppStep>(AppStep.LANDING);

  // Redirect to welcome once authenticated
  useEffect(() => {
    if (isAuthenticated && (step === AppStep.LANDING || step === AppStep.AUTH)) {
      setStep(AppStep.WELCOME);
    }
  }, [isAuthenticated, step]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [config, setConfig] = useState<MealConfig>(DEFAULT_CONFIG);
  const [preferences, setPreferences] = useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [planData, setPlanData] = useState<MealPlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);

  // Feedback state
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackResponseCount, setFeedbackResponseCount] = useState(0);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'general' | 'pantry' | 'prefs' | 'account'>('general');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

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

  // Poll for user's new feedback responses (all authenticated users)
  useEffect(() => {
    if (!isAuthenticated || !user) {
      setFeedbackResponseCount(0);
      return;
    }

    const fetchCount = async () => {
      try {
        const count = await getNewResponseCount(user.id);
        setFeedbackResponseCount(count);
      } catch (error) {
        console.error('Failed to fetch feedback response count:', error);
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [isAuthenticated, user]);

  // Clear feedback badge when viewing the feedback page
  useEffect(() => {
    if (step === AppStep.MY_FEEDBACK) {
      setFeedbackResponseCount(0);
    }
  }, [step]);

  // Helper to generate images for all meals (called during plan generation)
  const generateAllMealImages = async (planData: MealPlanResponse): Promise<void> => {
    const meals: Meal[] = [];
    planData.weeklyPlan.forEach(day => {
      if (day.meals?.breakfast) meals.push(day.meals.breakfast);
      if (day.meals?.lunch) meals.push(day.meals.lunch);
      if (day.meals?.dinner) meals.push(day.meals.dinner);
    });

    // Generate images in parallel (up to 3 at a time to avoid rate limits)
    const batchSize = 3;
    for (let i = 0; i < meals.length; i += batchSize) {
      const batch = meals.slice(i, i + batchSize);
      await Promise.all(batch.map(async (meal) => {
        try {
          const imageUrl = await generateDishImage(meal.name, meal.description);
          if (imageUrl) {
            meal.imageUrl = imageUrl;
            await cacheImage(meal.name, meal.description, imageUrl);
          }
        } catch (error) {
          console.error(`Failed to generate image for ${meal.name}:`, error);
        }
      }));
    }
  };

  // Handlers
  const handleGenerate = async () => {
    setLoading(true);
    try {
      const data = await generateMealPlan(config, preferences, pantryItems);

      // Generate images for all meals before showing results
      await generateAllMealImages(data);

      setPlanData(data);

      // Save to history (with images)
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 via-white to-orange-50">
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
      case AppStep.LANDING:
        return (
          <LandingPage
            onGetStarted={() => setStep(AppStep.AUTH)}
            onLogin={() => setStep(AppStep.AUTH)}
          />
        );

      case AppStep.AUTH:
        return (
          <AuthScreen
            onBack={() => setStep(AppStep.LANDING)}
          />
        );

      case AppStep.WELCOME:
        return (
          <WelcomeScreen
            onStartNew={() => setStep(AppStep.CONFIG)}
            onViewFavorites={() => setStep(AppStep.FAVORITES)}
            onViewSavedPlans={() => setStep(AppStep.SAVED_PLANS)}
            onGenerateSingleRecipe={() => setStep(AppStep.SINGLE_RECIPE)}
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
            onClose={() => {
              setStep(AppStep.WELCOME);
              setSettingsInitialTab('general'); // Reset for next time
            }}
            initialTab={settingsInitialTab}
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
            isAdmin={isAdmin}
            onGenerateSingleRecipe={() => setStep(AppStep.SINGLE_RECIPE)}
          />
        );

      case AppStep.ADMIN:
        return (
          <AdminDashboard
            onBack={() => setStep(AppStep.WELCOME)}
          />
        );

      case AppStep.MY_FEEDBACK:
        return user ? (
          <MyFeedback
            currentUserId={user.id}
            onBack={() => setStep(AppStep.WELCOME)}
          />
        ) : null;

      case AppStep.SAVED_PLANS:
        return (
          <SavedPlansView
            onBack={() => setStep(AppStep.WELCOME)}
          />
        );

      case AppStep.SINGLE_RECIPE:
        return (
          <SingleRecipeGenerator
            onBack={() => setStep(AppStep.WELCOME)}
            preferences={preferences}
            pantryItems={pantryItems}
            peopleCount={config.peopleCount}
          />
        );

      default:
        return null;
    }
  };

  // Landing and Auth pages have their own layout
  if (step === AppStep.LANDING || step === AppStep.AUTH) {
    return (
      <div className="min-h-screen">
        {renderStep()}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <InstallPrompt />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-orange-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200 py-4 px-6 sticky top-0 z-20">
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

          {/* Desktop Header Actions - hidden on mobile */}
          <div className="hidden md:flex items-center gap-3">
            {/* User info if authenticated - clickable to go to Account settings */}
            {isAuthenticated && user && (
              <button
                onClick={() => {
                  setSettingsInitialTab('account');
                  setStep(AppStep.SETTINGS);
                }}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800 hover:bg-slate-100 px-2 py-1 rounded-lg transition-colors"
                title="Account Settings"
              >
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
              </button>
            )}

            {/* Help button */}
            <button
              onClick={() => setShowHelpModal(true)}
              className="text-slate-400 hover:text-slate-700 transition-colors p-1"
              title="Help & User Guide"
            >
              <HelpCircle size={20} />
            </button>

            {/* Feedback button - shown for all authenticated users */}
            {isAuthenticated && (
              <button
                onClick={() => setShowFeedbackDialog(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                title="Send Feedback"
              >
                <MessageSquare size={16} />
                Feedback
              </button>
            )}

            {/* My Feedback with badge (for users with responses) */}
            {isAuthenticated && feedbackResponseCount > 0 && (
              <button
                onClick={() => setStep(AppStep.MY_FEEDBACK)}
                className="relative text-slate-400 hover:text-slate-700 transition-colors p-1"
                title="View My Feedback"
              >
                <Bell size={20} />
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full min-w-[18px] text-center">
                  {feedbackResponseCount}
                </span>
              </button>
            )}

            {/* Admin button - only for super admin */}
            {isAdmin && step !== AppStep.ADMIN && (
              <button
                onClick={() => setStep(AppStep.ADMIN)}
                className="text-emerald-600 hover:text-emerald-700 transition-colors p-1"
                title="Admin Dashboard"
              >
                <Shield size={20} />
              </button>
            )}

            {/* Settings Icon - always visible except when in settings */}
            {step !== AppStep.SETTINGS && step !== AppStep.ADMIN && step !== AppStep.MY_FEEDBACK && (
              <button
                onClick={() => {
                  setSettingsInitialTab('general');
                  setStep(AppStep.SETTINGS);
                }}
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

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden text-slate-600 hover:text-slate-800 p-2"
            title="Menu"
          >
            {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg z-30">
            <div className="max-w-5xl mx-auto p-4 space-y-2">
              {/* User Info */}
              {isAuthenticated && user && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-4">
                  {user.user_metadata?.avatar_url ? (
                    <img
                      src={user.user_metadata.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center">
                      <UserCircle size={24} className="text-slate-400" />
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-slate-800">
                      {user.user_metadata?.full_name || 'User'}
                    </p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                </div>
              )}

              {/* App Links */}
              <div className="border-b border-slate-100 pb-3 mb-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide px-3 mb-2">Navigate</p>
                <button
                  onClick={() => { setStep(AppStep.CONFIG); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <CalendarPlus size={20} className="text-emerald-600" />
                  Create Meal Plan
                </button>
                <button
                  onClick={() => { setStep(AppStep.SINGLE_RECIPE); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Sparkles size={20} className="text-amber-600" />
                  Generate Recipe
                </button>
                <button
                  onClick={() => { setStep(AppStep.FAVORITES); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <BookHeart size={20} className="text-rose-600" />
                  My Cookbook
                </button>
                <button
                  onClick={() => { setStep(AppStep.SAVED_PLANS); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <FolderHeart size={20} className="text-indigo-600" />
                  Saved Plans
                </button>
              </div>

              {/* Settings & Account */}
              <div className="border-b border-slate-100 pb-3 mb-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide px-3 mb-2">Settings</p>
                <button
                  onClick={() => { setSettingsInitialTab('general'); setStep(AppStep.SETTINGS); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Settings size={20} className="text-slate-500" />
                  Preferences
                </button>
                {isAuthenticated && (
                  <button
                    onClick={() => { setSettingsInitialTab('account'); setStep(AppStep.SETTINGS); setShowMobileMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <UserCircle size={20} className="text-blue-600" />
                    Account
                  </button>
                )}
              </div>

              {/* Help & Feedback */}
              <div className="border-b border-slate-100 pb-3 mb-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide px-3 mb-2">Support</p>
                <button
                  onClick={() => { setShowHelpModal(true); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <HelpCircle size={20} className="text-slate-500" />
                  Help & Guide
                </button>
                {isAuthenticated && (
                  <button
                    onClick={() => { setShowFeedbackDialog(true); setShowMobileMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <MessageSquare size={20} className="text-slate-500" />
                    Send Feedback
                  </button>
                )}
                {isAuthenticated && feedbackResponseCount > 0 && (
                  <button
                    onClick={() => { setStep(AppStep.MY_FEEDBACK); setShowMobileMenu(false); }}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Bell size={20} className="text-slate-500" />
                      My Feedback
                    </div>
                    <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
                      {feedbackResponseCount}
                    </span>
                  </button>
                )}
              </div>

              {/* Admin (if applicable) */}
              {isAdmin && (
                <div className="border-b border-slate-100 pb-3 mb-3">
                  <button
                    onClick={() => { setStep(AppStep.ADMIN); setShowMobileMenu(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                  >
                    <Shield size={20} />
                    Admin Dashboard
                  </button>
                </div>
              )}

              {/* Sign Out */}
              {isAuthenticated && (
                <button
                  onClick={() => { handleSignOut(); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <LogOut size={20} />
                  Sign Out
                </button>
              )}
            </div>
          </div>
        )}

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
      <footer className="bg-white/80 backdrop-blur-sm border-t border-slate-200 py-6 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} Kiwi Meal Planner. An app by <a href="https://www.unicloud.co.nz" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 hover:underline">Unicloud.co.nz</a></p>
      </footer>

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Feedback Dialog */}
      <FeedbackDialog
        isOpen={showFeedbackDialog}
        onClose={() => setShowFeedbackDialog(false)}
        currentUser={user ? {
          id: user.id,
          name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          email: user.email,
        } : undefined}
      />

      {/* Help Modal */}
      <HelpModal
        isOpen={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <UploadProvider>
          <AppContent />
        </UploadProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
};

export default App;
