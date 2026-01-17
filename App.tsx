import React, { useState, useEffect } from 'react';
import { AppStep, PantryItem, UserPreferences, MealPlanResponse, MealConfig, Meal, SideDish, CountryCode, MacroTargets } from './types';
import PantryManager from './components/PantryManager';
import PreferenceForm from './components/PreferenceForm';
import PlanDisplay from './components/PlanDisplay';
import WelcomeScreen from './components/WelcomeScreen';
import ConfigForm from './components/ConfigForm';
import FavoritesView from './components/FavoritesView';
import SettingsView from './components/SettingsView';
import AuthScreen from './components/AuthScreen';
import LandingPage from './components/LandingPage';
import FeaturesPage from './components/FeaturesPage';
import AdminDashboard from './components/AdminDashboard';
import MyFeedback from './components/MyFeedback';
import SavedPlansView from './components/SavedPlansView';
import SingleRecipeGenerator from './components/SingleRecipeGenerator';
import MasterShoppingList from './components/MasterShoppingList';
import FeedbackDialog from './components/FeedbackDialog';
import ErrorBoundary from './components/ErrorBoundary';
import InstallPrompt from './components/InstallPrompt';
import ImpersonationBanner from './components/ImpersonationBanner';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { UploadProvider } from './contexts/UploadContext';
import { TimerProvider } from './contexts/TimerContext';
import { ToastProvider, useToastContext } from './contexts/ToastContext';
import GlobalTimerIndicator from './components/GlobalTimerIndicator';
import NotificationPermissionPrompt from './components/NotificationPermissionPrompt';
import NavBar from './components/NavBar';
import { ToastContainer } from './components/Toast';
import { useNavigationHistory, pathToStep, isOAuthCallback } from './hooks/useNavigationHistory';
import { generateMealPlan, generateShoppingListFromFavorites, generateDishImage, MealWithSidesForShopping } from './services/geminiService';
import { getSidesForRecipe } from './services/suggestSidesService';
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
import { getSubscriptionState } from './services/subscriptionService';
import { getUserProfile } from './services/profileService';
import { getUserMacroTargets } from './services/macroTargetService';
import type { SubscriptionState } from './types';
import { ChefHat, Settings, LogOut, User, Shield, MessageSquare, Bell, HelpCircle, Menu, X, CalendarPlus, BookHeart, FolderHeart, Sparkles, UserCircle, RefreshCw, List, ShoppingCart, Apple, History } from 'lucide-react';
import HelpModal from './components/HelpModal';
import VersionHistory from './components/VersionHistory';
import PullToRefresh from './components/PullToRefresh';

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
  const { user, isAuthenticated, loading: authLoading, isAdmin, isImpersonating, impersonatedUser, effectiveUserId } = useAuth();
  const { toasts, dismissToast, success, error: showError } = useToastContext();

  // Determine initial step from URL or default to landing
  const getInitialStep = (): AppStep => {
    // If this is an OAuth callback, wait for auth to complete
    // Don't change the step yet - let the auth flow finish
    if (isOAuthCallback()) {
      // Return AUTH step temporarily - we'll redirect after auth completes
      return AppStep.AUTH;
    }

    const path = window.location.pathname;
    const matchedStep = pathToStep[path];
    // If we have a valid path, use it (auth will be validated later)
    if (matchedStep) {
      return matchedStep;
    }
    // Default to landing page
    return AppStep.LANDING;
  };

  const [step, setStep] = useState<AppStep>(getInitialStep);

  // Handle OAuth callback - clear the callback URL once auth is detected
  useEffect(() => {
    // Only process if we're on an OAuth callback URL
    if (!isOAuthCallback()) return;

    // Wait for auth loading to complete
    if (authLoading) return;

    if (isAuthenticated) {
      // OAuth completed successfully, redirect to welcome
      console.log('OAuth callback complete, redirecting to welcome');
      window.history.replaceState({ step: AppStep.WELCOME }, '', '/home');
      setStep(AppStep.WELCOME);
    } else {
      // OAuth callback but not authenticated - something went wrong
      // Clear the URL params and go back to auth screen
      console.log('OAuth callback detected but not authenticated, returning to auth');
      window.history.replaceState({ step: AppStep.AUTH }, '', '/auth');
      setStep(AppStep.AUTH);
    }
  }, [isAuthenticated, authLoading]);

  // Set up browser history navigation
  useNavigationHistory({
    step,
    setStep,
    isAuthenticated,
  });

  // Redirect to welcome once authenticated (from landing or auth pages)
  // Also handle URL-based navigation when auth state changes
  useEffect(() => {
    if (isAuthenticated) {
      // If on landing or auth, go to welcome
      if (step === AppStep.LANDING || step === AppStep.AUTH) {
        setStep(AppStep.WELCOME);
      }
      // If on a protected route, stay there (URL-based deep link)
    } else if (!authLoading) {
      // If not authenticated and trying to access protected route, go to landing
      const protectedSteps = [
        AppStep.WELCOME, AppStep.CONFIG, AppStep.PANTRY, AppStep.PREFERENCES,
        AppStep.RESULTS, AppStep.FAVORITES, AppStep.SETTINGS, AppStep.ADMIN,
        AppStep.MY_FEEDBACK, AppStep.SAVED_PLANS, AppStep.SINGLE_RECIPE,
      ];
      if (protectedSteps.includes(step)) {
        setStep(AppStep.LANDING);
      }
    }
  }, [isAuthenticated, authLoading, step]);
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

  // Subscription state
  const [subscriptionState, setSubscriptionState] = useState<SubscriptionState | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // User profile state (for localization)
  const [userCountry, setUserCountry] = useState<CountryCode | null>(null);

  // Macro targets for nutrition-aware meal planning
  const [macroTargets, setMacroTargets] = useState<MacroTargets | null>(null);

  // Load data from storage on mount and when auth/impersonation changes
  useEffect(() => {
    const loadData = async () => {
      try {
        // Use effectiveUserId to load the correct user's data (supports impersonation)
        const userIdToLoad = effectiveUserId || undefined;
        const [loadedPantry, loadedConfig, loadedPrefs] = await Promise.all([
          loadPantry(userIdToLoad),
          loadConfig(DEFAULT_CONFIG, userIdToLoad),
          loadPreferences(DEFAULT_PREFERENCES, userIdToLoad),
        ]);

        setPantryItems(loadedPantry);
        setConfig(loadedConfig);
        setPreferences(loadedPrefs);
        setDataLoaded(true);

        // Load user profile for country (for ingredient localization)
        if (userIdToLoad) {
          try {
            const profile = await getUserProfile(userIdToLoad);
            if (profile?.country) {
              setUserCountry(profile.country);
            }
          } catch (profileErr) {
            console.error('Error loading user profile:', profileErr);
          }

          // Load macro targets for nutrition-aware meal planning
          try {
            const targets = await getUserMacroTargets();
            if (targets) {
              setMacroTargets(targets.targets);
            }
          } catch (macroErr) {
            console.error('Error loading macro targets:', macroErr);
          }
        }
      } catch (err) {
        console.error('Error loading data:', err);
        setDataLoaded(true);
      }
    };

    if (!authLoading) {
      loadData();
    }
  }, [authLoading, isAuthenticated, effectiveUserId]);

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

  // Load subscription state when authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setSubscriptionState(null);
      return;
    }

    const loadSubscription = async () => {
      try {
        const state = await getSubscriptionState(effectiveUserId);
        setSubscriptionState(state);
      } catch (error) {
        console.error('Failed to fetch subscription state:', error);
      }
    };

    loadSubscription();
  }, [isAuthenticated, effectiveUserId]);

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
      const data = await generateMealPlan(config, preferences, pantryItems, userCountry, macroTargets);

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
      // Fetch sides for each meal to include in shopping list
      const mealsWithSides: MealWithSidesForShopping[] = await Promise.all(
        meals.map(async (meal) => {
          if (meal.id) {
            const sides = await getSidesForRecipe(meal.id);
            return { ...meal, sides };
          }
          return meal;
        })
      );

      const data = await generateShoppingListFromFavorites(mealsWithSides, config.peopleCount, pantryItems);
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
      setStep(AppStep.LANDING);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-100 via-emerald-50/50 to-orange-50">
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
            onViewFeatures={() => setStep(AppStep.FEATURES)}
          />
        );

      case AppStep.FEATURES:
        return (
          <FeaturesPage
            onBack={() => setStep(isAuthenticated ? AppStep.WELCOME : AppStep.LANDING)}
            onGetStarted={() => setStep(AppStep.AUTH)}
            onLogin={() => setStep(AppStep.AUTH)}
            isAuthenticated={isAuthenticated}
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
            onUseWhatIHave={() => {
              // Enable "Use What I Have" mode and go to config
              setConfig(prev => ({ ...prev, useWhatIHave: true }));
              setStep(AppStep.CONFIG);
            }}
            onManagePantry={() => {
              setSettingsInitialTab('pantry');
              setStep(AppStep.SETTINGS);
            }}
            onViewShoppingList={() => setStep(AppStep.SHOPPING_LIST)}
            onSetPreferences={() => {
              setSettingsInitialTab('prefs');
              setStep(AppStep.SETTINGS);
            }}
            hasPantryItems={pantryItems.length > 0}
            hasShoppingListItems={pantryItems.some(item => item.isStaple && item.needsRestock)}
            hasPreferences={Boolean(preferences.dietaryRestrictions || preferences.likes || preferences.dislikes)}
            hasGeneratedPlan={planData !== null}
            hasSavedRecipe={false}
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
            onNext={() => setStep(AppStep.PREFERENCES)}
            hasPantryItems={pantryItems.length > 0}
            pantryItemCount={pantryItems.length}
            onManagePantry={() => setStep(AppStep.PANTRY)}
            hasPro={subscriptionState?.hasPro ?? false}
            onUpgradeClick={() => setStep(AppStep.FEATURES)}
          />
        );

      case AppStep.PANTRY:
        return (
          <PantryManager
            items={pantryItems}
            setItems={setPantryItems}
            hasPro={subscriptionState?.hasPro ?? false}
            onUpgradeClick={() => setStep(AppStep.FEATURES)}
          />
        );

      case AppStep.PREFERENCES:
        return (
          <div className="animate-fadeIn">
            <button
              onClick={() => setStep(AppStep.CONFIG)}
              className="mb-4 text-slate-500 text-sm hover:text-slate-800 flex items-center gap-1"
            >
              ← Back to Settings
            </button>
            <PreferenceForm
              preferences={preferences}
              setPreferences={setPreferences}
              onSubmit={handleGenerate}
              isLoading={loading}
              hasPro={subscriptionState?.hasPro ?? false}
              onUpgradeClick={() => setStep(AppStep.FEATURES)}
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
            hasPro={subscriptionState?.hasPro ?? false}
            recipeCount={subscriptionState?.recipeCount ?? 0}
            recipeLimit={subscriptionState?.recipeLimit ?? 20}
            onUpgradeClick={() => setShowUpgradeModal(true)}
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
            onManagePantry={() => {
              setSettingsInitialTab('pantry');
              setStep(AppStep.SETTINGS);
            }}
            userCountry={userCountry}
            hasPro={subscriptionState?.hasPro ?? false}
            onUpgradeClick={() => setStep(AppStep.FEATURES)}
          />
        );

      case AppStep.SHOPPING_LIST:
        return (
          <MasterShoppingList
            onBack={() => setStep(AppStep.WELCOME)}
            pantryItems={pantryItems}
            onPantryUpdate={setPantryItems}
            hasPro={subscriptionState?.hasPro ?? false}
            onUpgradeClick={() => setStep(AppStep.FEATURES)}
          />
        );

      case AppStep.VERSION_HISTORY:
        return (
          <VersionHistory
            onBack={() => setStep(AppStep.WELCOME)}
          />
        );

      default:
        return null;
    }
  };

  // Landing, Auth, and Features pages have their own layout
  if (step === AppStep.LANDING || step === AppStep.AUTH || step === AppStep.FEATURES) {
    return (
      <div className="min-h-screen">
        <PullToRefresh />
        {renderStep()}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
        <InstallPrompt />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-100 via-emerald-50/50 to-orange-50 flex flex-col">
      {/* Pull to refresh for iOS PWA */}
      <PullToRefresh />

      {/* Impersonation Banner - shown when admin is viewing as another user */}
      <ImpersonationBanner />

      {/* Header - adjust top position when impersonation banner is visible */}
      <header className={`bg-white/80 backdrop-blur-sm border-b border-slate-200 py-4 px-6 sticky z-20 ${isImpersonating ? 'top-12' : 'top-0'}`}>
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
            {/* User info if authenticated - shows impersonated user when impersonating */}
            {isAuthenticated && user && (
              <button
                onClick={() => {
                  if (!isImpersonating) {
                    setSettingsInitialTab('account');
                    setStep(AppStep.SETTINGS);
                  }
                }}
                className={`flex items-center gap-2 text-sm px-2 py-1 rounded-lg transition-colors ${
                  isImpersonating
                    ? 'text-amber-700 bg-amber-50 cursor-default'
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                }`}
                title={isImpersonating ? `Viewing as ${impersonatedUser?.fullName || impersonatedUser?.email}` : "Account Settings"}
              >
                {isImpersonating && impersonatedUser ? (
                  <>
                    {impersonatedUser.avatarUrl ? (
                      <img
                        src={impersonatedUser.avatarUrl}
                        alt=""
                        className="w-6 h-6 rounded-full ring-2 ring-amber-400"
                      />
                    ) : (
                      <User size={16} />
                    )}
                    <span className="max-w-[120px] truncate">
                      {impersonatedUser.fullName || impersonatedUser.email}
                    </span>
                  </>
                ) : (
                  <>
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
                  </>
                )}
              </button>
            )}

            {/* Features link */}
            <button
              onClick={() => setStep(AppStep.FEATURES)}
              className="text-slate-400 hover:text-slate-700 transition-colors p-1"
              title="Features"
            >
              <List size={20} />
            </button>

            {/* Help button */}
            <button
              onClick={() => setShowHelpModal(true)}
              className="text-slate-400 hover:text-slate-700 transition-colors p-1"
              title="Help & User Guide"
            >
              <HelpCircle size={20} />
            </button>

            {/* Global Timer Indicator */}
            <GlobalTimerIndicator />

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

          {/* Mobile Timer Indicator & Menu Button */}
          <div className="md:hidden flex items-center gap-2">
            <GlobalTimerIndicator />
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="text-slate-600 hover:text-slate-800 p-2"
              title="Menu"
            >
              {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-white border-b border-slate-200 shadow-lg z-30">
            <div className="max-w-5xl mx-auto p-4 space-y-2">
              {/* User Info - shows impersonated user when impersonating */}
              {isAuthenticated && user && (
                <div className={`flex items-center gap-3 p-3 rounded-xl mb-4 ${
                  isImpersonating ? 'bg-amber-50 border border-amber-200' : 'bg-slate-50'
                }`}>
                  {isImpersonating && impersonatedUser ? (
                    <>
                      {impersonatedUser.avatarUrl ? (
                        <img
                          src={impersonatedUser.avatarUrl}
                          alt=""
                          className="w-10 h-10 rounded-full ring-2 ring-amber-400"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-amber-200 flex items-center justify-center">
                          <UserCircle size={24} className="text-amber-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-amber-800">
                          {impersonatedUser.fullName || 'User'}
                        </p>
                        <p className="text-sm text-amber-600">{impersonatedUser.email}</p>
                      </div>
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
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
                <button
                  onClick={() => { setStep(AppStep.SHOPPING_LIST); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <ShoppingCart size={20} className="text-teal-600" />
                  Shopping List
                </button>
                <button
                  onClick={() => { setStep(AppStep.PANTRY); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <Apple size={20} className="text-orange-600" />
                  Pantry
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
                  onClick={() => { setStep(AppStep.FEATURES); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <List size={20} className="text-emerald-600" />
                  All Features
                </button>
                <button
                  onClick={() => { setStep(AppStep.VERSION_HISTORY); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <History size={20} className="text-purple-600" />
                  Version History
                </button>
                <button
                  onClick={() => { setShowHelpModal(true); setShowMobileMenu(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <HelpCircle size={20} className="text-slate-500" />
                  Help & Guide
                </button>
                <button
                  onClick={() => { window.location.reload(); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <RefreshCw size={20} className="text-slate-500" />
                  Refresh App
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

      </header>

      {/* Navigation Bar - shown on all pages except Welcome */}
      {step !== AppStep.WELCOME && (
        <NavBar
          currentStep={step}
          onNavigate={(targetStep) => {
            setStep(targetStep);
          }}
        />
      )}

      {/* Meal Plan Creation Flow Steps - shown below navbar during creation */}
      {(step === AppStep.CONFIG || step === AppStep.PREFERENCES) && (
        <div className="bg-white/90 backdrop-blur-sm border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 py-3">
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setStep(AppStep.CONFIG)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  step === AppStep.CONFIG
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === AppStep.CONFIG ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>1</span>
                Settings
              </button>
              <div className="w-8 h-0.5 bg-slate-200" />
              <button
                onClick={() => setStep(AppStep.PREFERENCES)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  step === AppStep.PREFERENCES
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step === AppStep.PREFERENCES ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}>2</span>
                Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 md:p-8">
        {renderStep()}
      </main>

      {/* Footer */}
      <footer className="bg-white/80 backdrop-blur-sm border-t border-slate-200 py-6 text-center text-slate-400 text-sm">
        <p>© {new Date().getFullYear()} Kiwi Meal Planner.</p>
        <p className="mt-1">Powered by <a href="https://www.unicloud.co.nz" target="_blank" rel="noopener noreferrer" className="text-emerald-600 hover:text-emerald-700 hover:underline">www.unicloud.co.nz</a></p>
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

      {/* Notification Permission Prompt for Timers */}
      <NotificationPermissionPrompt />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <UploadProvider>
            <TimerProvider>
              <AppContent />
            </TimerProvider>
          </UploadProvider>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
