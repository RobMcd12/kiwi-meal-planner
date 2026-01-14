import React, { useState, useEffect } from 'react';
import { ArrowLeft, Sparkles, ChefHat, Loader2, Heart, Printer, Users, Check, Apple, SlidersHorizontal, AlertCircle, Package, ShoppingCart, Beef, Target, ChevronDown, ChevronUp, Settings, Flame, Wheat, Droplets, Info, UtensilsCrossed, Cake, RefreshCw, X, Crown } from 'lucide-react';
import type { Meal, MealWithSides, UserPreferences, PantryItem, CountryCode, MacroTargets, SideDish, Dessert } from '../types';
import { DEFAULT_MACRO_TARGETS } from '../types';
import { generateSingleRecipe, generateDishImage } from '../services/geminiService';
import { saveFavoriteMeal } from '../services/storageService';
import { addRecipeToShoppingList } from '../services/shoppingListService';
import { getUserMacroTargets } from '../services/macroTargetService';
import { useAuth } from './AuthProvider';
import RecipePrintView from './RecipePrintView';
import NutritionInfo from './NutritionInfo';
import RecipeAdjuster from './RecipeAdjuster';

type RecipeTab = 'main' | 'sides' | 'dessert';

interface SingleRecipeGeneratorProps {
  onBack: () => void;
  preferences: UserPreferences;
  setPreferences?: React.Dispatch<React.SetStateAction<UserPreferences>>;
  pantryItems: PantryItem[];
  peopleCount: number;
  onManagePantry?: () => void;
  userCountry?: CountryCode | null;
  hasPro?: boolean;
  onUpgradeClick?: () => void;
}

const SingleRecipeGenerator: React.FC<SingleRecipeGeneratorProps> = ({
  onBack,
  preferences,
  setPreferences,
  pantryItems,
  peopleCount,
  onManagePantry,
  userCountry,
  hasPro = false,
  onUpgradeClick,
}) => {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState(peopleCount);
  const [useWhatIHave, setUseWhatIHave] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<MealWithSides | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);
  const [isAddedToList, setIsAddedToList] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);
  const [showAdjuster, setShowAdjuster] = useState(false);

  // Sides and dessert options
  const [includeSidesAndDessert, setIncludeSidesAndDessert] = useState(false);
  const [activeRecipeTab, setActiveRecipeTab] = useState<RecipeTab>('main');

  // Regeneration state
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);
  const [regenerateMainVariation, setRegenerateMainVariation] = useState('');
  const [regenerateSidesVariation, setRegenerateSidesVariation] = useState('');
  const [regenerateDessertVariation, setRegenerateDessertVariation] = useState('');
  const [regenerateIncludeSides, setRegenerateIncludeSides] = useState(false);
  const [regenerateIncludeDessert, setRegenerateIncludeDessert] = useState(false);

  // Advanced options state
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [meatServingGrams, setMeatServingGrams] = useState(preferences.meatServingGrams ?? 175);
  const [dailyMacroTargets, setDailyMacroTargets] = useState<MacroTargets>(DEFAULT_MACRO_TARGETS);
  const [useMacroTargets, setUseMacroTargets] = useState(false);

  // Local preferences state for editing
  const [localDiet, setLocalDiet] = useState(preferences.dietaryRestrictions || '');
  const [localLikes, setLocalLikes] = useState(preferences.likes || '');
  const [localDislikes, setLocalDislikes] = useState(preferences.dislikes || '');

  const hasPantryItems = pantryItems.length > 0;

  // Load user's macro targets
  useEffect(() => {
    const loadMacros = async () => {
      if (user) {
        try {
          const data = await getUserMacroTargets(user.id);
          if (data) {
            setDailyMacroTargets(data.targets);
          }
        } catch (err) {
          console.error('Error loading macro targets:', err);
        }
      }
    };
    loadMacros();
  }, [user]);

  // Calculate per-meal macros (approximately 1/3 of daily for main meals)
  const mealMacros = {
    calories: Math.round(dailyMacroTargets.calories / 3),
    protein: Math.round(dailyMacroTargets.protein / 3),
    carbohydrates: Math.round(dailyMacroTargets.carbohydrates / 3),
    fat: Math.round(dailyMacroTargets.fat / 3),
  };

  const examplePrompts = [
    "A quick weeknight pasta dish",
    "Something healthy with chicken and vegetables",
    "A cozy soup for a cold day",
    "An easy breakfast for meal prep",
    "A vegetarian stir fry",
    "Something impressive for a dinner party",
  ];

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setIsGenerating(true);
    setError(null);
    setGeneratedRecipe(null);
    setIsSaved(false);

    // Build effective preferences with local overrides
    const effectivePreferences: UserPreferences = {
      ...preferences,
      dietaryRestrictions: localDiet,
      likes: localLikes,
      dislikes: localDislikes,
      meatServingGrams,
    };

    // Update global preferences if setter is provided
    if (setPreferences) {
      setPreferences(effectivePreferences);
    }

    try {
      const recipe = await generateSingleRecipe(
        description,
        effectivePreferences,
        pantryItems,
        servings,
        useWhatIHave,
        userCountry,
        useMacroTargets ? mealMacros : undefined,
        meatServingGrams,
        includeSidesAndDessert
      );
      setGeneratedRecipe(recipe);
      setActiveRecipeTab('main'); // Reset to main tab when new recipe generated

      // Automatically generate image in the background
      setIsGeneratingImage(true);
      try {
        const imageUrl = await generateDishImage(recipe.name, recipe.description);
        if (imageUrl) {
          setGeneratedRecipe(prev => prev ? { ...prev, imageUrl } : null);
        }
      } catch (imgErr) {
        console.error('Image generation error:', imgErr);
        // Don't show error - image generation is optional
      } finally {
        setIsGeneratingImage(false);
      }
    } catch (err) {
      console.error('Recipe generation error:', err);
      setError('Failed to generate recipe. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveToFavorites = async () => {
    if (!generatedRecipe) return;

    setIsSaving(true);
    try {
      const recipeId = await saveFavoriteMeal(generatedRecipe);
      if (recipeId) {
        setSavedRecipeId(recipeId);
        setIsSaved(true);
      }
    } catch (err) {
      console.error('Failed to save recipe:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddToShoppingList = async () => {
    if (!savedRecipeId) return;

    try {
      await addRecipeToShoppingList(savedRecipeId);
      setIsAddedToList(true);
    } catch (e) {
      console.error('Failed to add recipe to shopping list:', e);
    }
  };

  const handleGenerateImage = async () => {
    if (!generatedRecipe) return;

    setIsGeneratingImage(true);
    try {
      const imageUrl = await generateDishImage(generatedRecipe.name, generatedRecipe.description);
      if (imageUrl) {
        setGeneratedRecipe({ ...generatedRecipe, imageUrl });
      }
    } catch (err) {
      console.error('Failed to generate image:', err);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleNewRecipe = () => {
    setGeneratedRecipe(null);
    setDescription('');
    setIsSaved(false);
    setSavedRecipeId(null);
    setIsAddedToList(false);
    setError(null);
    setActiveRecipeTab('main');
  };

  const handleOpenRegenerateModal = () => {
    // Initialize with current state
    const hasSides = generatedRecipe?.sides && generatedRecipe.sides.length > 0;
    const hasDessert = generatedRecipe?.desserts && generatedRecipe.desserts.length > 0;
    setRegenerateIncludeSides(!!hasSides);
    setRegenerateIncludeDessert(!!hasDessert);
    setRegenerateMainVariation('');
    setRegenerateSidesVariation('');
    setRegenerateDessertVariation('');
    setShowRegenerateModal(true);
  };

  const handleRegenerate = async () => {
    if (!generatedRecipe) return;

    setShowRegenerateModal(false);
    setIsGenerating(true);
    setError(null);
    setIsSaved(false);

    // Build the regeneration prompt with variations
    let regenerationPrompt = `Create a variation of "${generatedRecipe.name}"`;

    if (regenerateMainVariation.trim()) {
      regenerationPrompt += `. Main dish changes: ${regenerateMainVariation}`;
    }

    if (regenerateIncludeSides && regenerateSidesVariation.trim()) {
      regenerationPrompt += `. Side dishes should: ${regenerateSidesVariation}`;
    }

    if (regenerateIncludeDessert && regenerateDessertVariation.trim()) {
      regenerationPrompt += `. Dessert should: ${regenerateDessertVariation}`;
    }

    // Build effective preferences with local overrides
    const effectivePreferences: UserPreferences = {
      ...preferences,
      dietaryRestrictions: localDiet,
      likes: localLikes,
      dislikes: localDislikes,
      meatServingGrams,
    };

    try {
      const shouldIncludeSidesAndDessert = regenerateIncludeSides || regenerateIncludeDessert;
      const recipe = await generateSingleRecipe(
        regenerationPrompt,
        effectivePreferences,
        pantryItems,
        servings,
        useWhatIHave,
        userCountry,
        useMacroTargets ? mealMacros : undefined,
        meatServingGrams,
        shouldIncludeSidesAndDessert
      );

      // If user only wanted sides or only wanted dessert, filter accordingly
      const filteredRecipe: MealWithSides = {
        ...recipe,
        sides: regenerateIncludeSides ? recipe.sides : [],
        desserts: regenerateIncludeDessert ? recipe.desserts : [],
      };

      setGeneratedRecipe(filteredRecipe);
      setActiveRecipeTab('main');

      // Automatically generate image in the background
      setIsGeneratingImage(true);
      try {
        const imageUrl = await generateDishImage(filteredRecipe.name, filteredRecipe.description);
        if (imageUrl) {
          setGeneratedRecipe(prev => prev ? { ...prev, imageUrl } : null);
        }
      } catch (imgErr) {
        console.error('Image generation error:', imgErr);
      } finally {
        setIsGeneratingImage(false);
      }
    } catch (err) {
      console.error('Recipe regeneration error:', err);
      setError('Failed to regenerate recipe. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApplyAdjustment = async (adjustedMeal: Meal, saveAsNew: boolean) => {
    // Preserve sides and desserts from the original recipe when applying adjustments
    const adjustedWithExtras: MealWithSides = {
      ...adjustedMeal,
      sides: generatedRecipe?.sides || [],
      desserts: generatedRecipe?.desserts || [],
    };

    if (saveAsNew) {
      // For single recipe generator, we save as new and update the display
      try {
        await saveFavoriteMeal(adjustedWithExtras);
        setGeneratedRecipe(adjustedWithExtras);
        setServings(adjustedMeal.servings || servings);
        setIsSaved(true); // Mark as saved since we just saved it
      } catch (error) {
        console.error('Failed to save adjusted recipe:', error);
        // Still update the display even if save failed
        setGeneratedRecipe(adjustedWithExtras);
        setServings(adjustedMeal.servings || servings);
        setIsSaved(false);
      }
    } else {
      // Legacy: just update the display
      setGeneratedRecipe(adjustedWithExtras);
      setServings(adjustedMeal.servings || servings);
      setIsSaved(false); // Reset saved state since recipe changed
    }
  };

  return (
    <div className="animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="bg-amber-100 p-3 rounded-xl">
          <Sparkles className="text-amber-600" size={28} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Generate a Recipe</h2>
          <p className="text-slate-500 text-sm">
            Describe what you're in the mood for
          </p>
        </div>
      </div>

      {!generatedRecipe ? (
        // Input Form
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-6">
          {/* Description Input */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              What would you like to make?
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the dish you want to create..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none transition-all resize-none"
              rows={3}
              disabled={isGenerating}
            />
          </div>

          {/* Example Prompts */}
          <div>
            <p className="text-xs text-slate-400 mb-2">Try something like:</p>
            <div className="flex flex-wrap gap-2">
              {examplePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => setDescription(prompt)}
                  className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-full transition-colors"
                  disabled={isGenerating}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Servings */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <Users size={16} className="inline mr-1" />
              Servings
            </label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="w-10 h-10 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600"
                disabled={isGenerating || servings <= 1}
              >
                -
              </button>
              <span className="text-lg font-semibold text-slate-800 w-8 text-center">
                {servings}
              </span>
              <button
                onClick={() => setServings(Math.min(12, servings + 1))}
                className="w-10 h-10 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-600"
                disabled={isGenerating || servings >= 12}
              >
                +
              </button>
            </div>
          </div>

          {/* Recipe Mode Toggle */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-slate-700">
                <Package size={16} className="inline mr-1" />
                Recipe Mode
              </label>
              {onManagePantry && (
                <button
                  type="button"
                  onClick={onManagePantry}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium"
                >
                  {hasPantryItems ? 'Manage Pantry' : 'Add Pantry Items'}
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUseWhatIHave(false)}
                disabled={isGenerating}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                  !useWhatIHave
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-slate-200 hover:border-slate-300 text-slate-500'
                }`}
              >
                <ShoppingCart size={20} />
                <span className="font-medium text-xs">Standard</span>
              </button>
              <button
                type="button"
                onClick={() => setUseWhatIHave(true)}
                disabled={isGenerating || !hasPantryItems}
                className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                  useWhatIHave
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : hasPantryItems
                      ? 'border-slate-200 hover:border-slate-300 text-slate-500'
                      : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
                }`}
              >
                <div className="relative">
                  <Package size={20} />
                  <Sparkles size={10} className="absolute -top-1 -right-1 text-blue-500" />
                </div>
                <span className="font-medium text-xs">Use What I Have</span>
              </button>
            </div>
            {!hasPantryItems && (
              <p className="text-xs text-slate-400 mt-2">
                Add pantry items to enable "Use What I Have" mode
              </p>
            )}
            {useWhatIHave && hasPantryItems && (
              <p className="text-xs text-blue-600 mt-2">
                Recipe will prioritize your {pantryItems.length} pantry items
              </p>
            )}
          </div>

          {/* Include Sides & Dessert Toggle - Pro Feature */}
          <div>
            {hasPro ? (
              <label className="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl cursor-pointer hover:from-amber-100 hover:to-orange-100 transition-colors">
                <input
                  type="checkbox"
                  checked={includeSidesAndDessert}
                  onChange={(e) => setIncludeSidesAndDessert(e.target.checked)}
                  disabled={isGenerating}
                  className="w-5 h-5 text-amber-500 border-slate-300 rounded focus:ring-amber-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed size={18} className="text-amber-600" />
                    <span className="font-medium text-slate-700">Include Sides & Dessert</span>
                    <span className="text-xs px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded font-semibold">PRO</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generate complementary side dishes and a dessert along with the main dish
                  </p>
                </div>
              </label>
            ) : (
              <button
                type="button"
                onClick={onUpgradeClick}
                className="w-full flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl hover:from-amber-100 hover:to-orange-100 transition-colors text-left"
              >
                <div className="w-5 h-5 flex items-center justify-center">
                  <Crown size={18} className="text-amber-500" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed size={18} className="text-amber-600" />
                    <span className="font-medium text-slate-700">Include Sides & Dessert</span>
                    <span className="text-xs px-1.5 py-0.5 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded font-semibold">PRO</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Upgrade to Pro to generate complementary side dishes and a dessert
                  </p>
                </div>
              </button>
            )}
          </div>

          {/* Advanced Options */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings size={18} className="text-slate-500" />
                <span className="font-medium text-slate-700">Recipe Options</span>
                {(localDiet || useMacroTargets) && (
                  <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">Customized</span>
                )}
              </div>
              {showAdvancedOptions ? (
                <ChevronUp size={18} className="text-slate-400" />
              ) : (
                <ChevronDown size={18} className="text-slate-400" />
              )}
            </button>

            {showAdvancedOptions && (
              <div className="p-4 space-y-5 border-t border-slate-200 bg-white">
                {/* Dietary Preferences */}
                <div>
                  <h4 className="font-medium text-slate-700 mb-3 text-sm">Dietary Preferences</h4>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Diet Type</label>
                      <input
                        type="text"
                        value={localDiet}
                        onChange={(e) => setLocalDiet(e.target.value)}
                        placeholder="e.g., Vegetarian, Keto, Low-carb..."
                        className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                        disabled={isGenerating}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Likes</label>
                        <input
                          type="text"
                          value={localLikes}
                          onChange={(e) => setLocalLikes(e.target.value)}
                          placeholder="Foods you enjoy..."
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                          disabled={isGenerating}
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Dislikes</label>
                        <input
                          type="text"
                          value={localDislikes}
                          onChange={(e) => setLocalDislikes(e.target.value)}
                          placeholder="Foods to avoid..."
                          className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                          disabled={isGenerating}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Meat Portion */}
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                    <Beef size={16} className="text-red-500" />
                    Meat Portion per Person
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={50}
                      max={400}
                      step={25}
                      value={meatServingGrams}
                      onChange={(e) => setMeatServingGrams(parseInt(e.target.value))}
                      className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-500"
                      disabled={isGenerating}
                    />
                    <div className="flex items-center gap-1 min-w-[70px]">
                      <input
                        type="number"
                        min={50}
                        max={400}
                        step={25}
                        value={meatServingGrams}
                        onChange={(e) => setMeatServingGrams(parseInt(e.target.value) || 175)}
                        className="w-16 px-2 py-1 text-sm text-center border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none"
                        disabled={isGenerating}
                      />
                      <span className="text-xs text-slate-500">g</span>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">Standard: 150-200g per person</p>
                </div>

                {/* Macro Targets Toggle */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <Target size={16} className="text-indigo-500" />
                      Target Nutrition (per meal)
                    </label>
                    <button
                      type="button"
                      onClick={() => setUseMacroTargets(!useMacroTargets)}
                      disabled={isGenerating}
                      className={`relative w-11 h-6 rounded-full transition-colors ${
                        useMacroTargets ? 'bg-indigo-600' : 'bg-slate-300'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${
                          useMacroTargets ? 'translate-x-5' : ''
                        }`}
                      />
                    </button>
                  </div>

                  {useMacroTargets && (
                    <div className="space-y-3">
                      <div className="flex items-start gap-2 p-2 bg-blue-50 rounded-lg">
                        <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-blue-700">
                          These are per-meal targets (≈⅓ of your daily goals). The recipe will aim to meet these nutritional targets.
                        </p>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div className="bg-slate-50 p-2 rounded-lg text-center">
                          <Flame size={14} className="text-orange-500 mx-auto mb-1" />
                          <div className="text-sm font-semibold text-slate-700">{mealMacros.calories}</div>
                          <div className="text-xs text-slate-500">kcal</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg text-center">
                          <Beef size={14} className="text-red-500 mx-auto mb-1" />
                          <div className="text-sm font-semibold text-slate-700">{mealMacros.protein}g</div>
                          <div className="text-xs text-slate-500">Protein</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg text-center">
                          <Wheat size={14} className="text-amber-500 mx-auto mb-1" />
                          <div className="text-sm font-semibold text-slate-700">{mealMacros.carbohydrates}g</div>
                          <div className="text-xs text-slate-500">Carbs</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg text-center">
                          <Droplets size={14} className="text-yellow-500 mx-auto mb-1" />
                          <div className="text-sm font-semibold text-slate-700">{mealMacros.fat}g</div>
                          <div className="text-xs text-slate-500">Fat</div>
                        </div>
                      </div>
                      {!hasPro && (
                        <p className="text-xs text-slate-400">
                          Upgrade to Pro to customize your daily macro targets in settings.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Current settings summary */}
          {!showAdvancedOptions && (localDiet || hasPantryItems) && (
            <div className="bg-slate-50 rounded-xl p-3">
              <p className="text-xs text-slate-500">
                {localDiet && <span>Diet: {localDiet}</span>}
                {localDiet && hasPantryItems && ' • '}
                {hasPantryItems && !useWhatIHave && <span>{pantryItems.length} pantry items available</span>}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || !description.trim()}
            className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Creating your recipe & image...
              </>
            ) : (
              <>
                <Sparkles size={20} />
                Generate Recipe
              </>
            )}
          </button>
        </div>
      ) : (
        // Generated Recipe Display
        <div className="space-y-6">
          {/* Recipe Card */}
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
            {/* Recipe Image */}
            {generatedRecipe.imageUrl ? (
              <img
                src={generatedRecipe.imageUrl}
                alt={generatedRecipe.name}
                className="w-full h-64 object-cover"
              />
            ) : (
              <div className="w-full h-48 bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center">
                {isGeneratingImage ? (
                  <div className="flex items-center gap-2 px-4 py-2 bg-white/80 rounded-lg text-slate-700 font-medium">
                    <Loader2 size={18} className="animate-spin" />
                    Generating image...
                  </div>
                ) : (
                  <button
                    onClick={handleGenerateImage}
                    className="flex items-center gap-2 px-4 py-2 bg-white/80 hover:bg-white rounded-lg text-slate-700 font-medium transition-colors"
                  >
                    <Sparkles size={18} />
                    Regenerate Image
                  </button>
                )}
              </div>
            )}

            {/* Recipe Content */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">{generatedRecipe.name}</h3>
                  <p className="text-slate-500 mt-1">{generatedRecipe.description}</p>
                </div>
                <div className="flex items-center gap-1 text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  <Users size={14} />
                  {servings}
                </div>
              </div>

              {/* Tags */}
              {generatedRecipe.tags && generatedRecipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {generatedRecipe.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-amber-100 text-amber-700 text-xs rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Tabs for Main/Sides/Dessert */}
              {((generatedRecipe.sides && generatedRecipe.sides.length > 0) || (generatedRecipe.desserts && generatedRecipe.desserts.length > 0)) && (
                <div className="flex gap-2 mb-6 border-b border-slate-200 pb-3">
                  <button
                    onClick={() => setActiveRecipeTab('main')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      activeRecipeTab === 'main'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <ChefHat size={16} />
                    Main Dish
                  </button>
                  {generatedRecipe.sides && generatedRecipe.sides.length > 0 && (
                    <button
                      onClick={() => setActiveRecipeTab('sides')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeRecipeTab === 'sides'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <UtensilsCrossed size={16} />
                      Sides ({generatedRecipe.sides.length})
                    </button>
                  )}
                  {generatedRecipe.desserts && generatedRecipe.desserts.length > 0 && (
                    <button
                      onClick={() => setActiveRecipeTab('dessert')}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                        activeRecipeTab === 'dessert'
                          ? 'bg-pink-100 text-pink-700'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Cake size={16} />
                      Dessert
                    </button>
                  )}
                </div>
              )}

              {/* Main Dish Content */}
              {activeRecipeTab === 'main' && (
                <>
                  {/* Ingredients */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <ChefHat size={18} />
                      Ingredients
                    </h4>
                    <ul className="space-y-2">
                      {generatedRecipe.ingredients.map((ingredient, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-slate-600">
                          <span className="text-amber-500 mt-1">•</span>
                          {ingredient}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Instructions */}
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-3">Instructions</h4>
                    <div className="text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {generatedRecipe.instructions}
                    </div>
                  </div>
                </>
              )}

              {/* Sides Content */}
              {activeRecipeTab === 'sides' && generatedRecipe.sides && (
                <div className="space-y-6">
                  {generatedRecipe.sides.map((side, sideIdx) => (
                    <div key={side.id || sideIdx} className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-bold text-slate-800">{side.name}</h4>
                          <p className="text-sm text-slate-500">{side.description}</p>
                        </div>
                        {side.prepTime && (
                          <span className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">
                            {side.prepTime}
                          </span>
                        )}
                      </div>

                      <div className="mb-4">
                        <h5 className="font-medium text-slate-700 mb-2 text-sm">Ingredients</h5>
                        <ul className="space-y-1">
                          {side.ingredients.map((ing, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                              <span className="text-emerald-500 mt-0.5">•</span>
                              {ing}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div>
                        <h5 className="font-medium text-slate-700 mb-2 text-sm">Instructions</h5>
                        <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                          {side.instructions}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Dessert Content */}
              {activeRecipeTab === 'dessert' && generatedRecipe.desserts && generatedRecipe.desserts[0] && (
                <div className="bg-pink-50 rounded-xl p-4 border border-pink-200">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-slate-800">{generatedRecipe.desserts[0].name}</h4>
                      <p className="text-sm text-slate-500">{generatedRecipe.desserts[0].description}</p>
                    </div>
                    {generatedRecipe.desserts[0].prepTime && (
                      <span className="text-xs text-pink-600 bg-pink-100 px-2 py-1 rounded-full">
                        {generatedRecipe.desserts[0].prepTime}
                      </span>
                    )}
                  </div>

                  <div className="mb-4">
                    <h5 className="font-medium text-slate-700 mb-2 text-sm">Ingredients</h5>
                    <ul className="space-y-1">
                      {generatedRecipe.desserts[0].ingredients.map((ing, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="text-pink-500 mt-0.5">•</span>
                          {ing}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h5 className="font-medium text-slate-700 mb-2 text-sm">Instructions</h5>
                    <div className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {generatedRecipe.desserts[0].instructions}
                    </div>
                  </div>
                </div>
              )}

              {/* AI Disclaimer */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
                <p className="text-xs text-amber-700">
                  <strong>AI-Generated Recipe:</strong> This recipe was created by AI and may contain errors in ingredients, quantities, or instructions. Always use your judgment when cooking, especially regarding food safety, cooking times, and temperatures. Verify allergen information independently.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex flex-wrap gap-3">
              <button
                onClick={handleSaveToFavorites}
                disabled={isSaving || isSaved}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  isSaved
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-rose-500 hover:bg-rose-600 text-white'
                }`}
              >
                {isSaving ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : isSaved ? (
                  <Check size={18} />
                ) : (
                  <Heart size={18} />
                )}
                {isSaved ? 'Saved to Cookbook' : 'Save to Cookbook'}
              </button>

              {/* Add to Shopping List - Only show after saving */}
              {isSaved && savedRecipeId && (
                <button
                  onClick={handleAddToShoppingList}
                  disabled={isAddedToList}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isAddedToList
                      ? 'bg-teal-100 text-teal-700'
                      : 'bg-teal-500 hover:bg-teal-600 text-white'
                  }`}
                >
                  {isAddedToList ? (
                    <Check size={18} />
                  ) : (
                    <ShoppingCart size={18} />
                  )}
                  {isAddedToList ? 'Added to List' : 'Add to Shopping List'}
                </button>
              )}

              <button
                onClick={() => setShowPrintView(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg font-medium transition-colors"
              >
                <Printer size={18} />
                Print / PDF
              </button>

              <button
                onClick={() => setShowNutrition(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
              >
                <Apple size={18} />
                Nutrition
              </button>

              <button
                onClick={() => setShowAdjuster(true)}
                className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg font-medium transition-colors"
              >
                <SlidersHorizontal size={18} />
                Adjust
              </button>

              <button
                onClick={handleOpenRegenerateModal}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
              >
                <RefreshCw size={18} />
                Regenerate
              </button>

              <button
                onClick={handleNewRecipe}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors ml-auto"
              >
                <Sparkles size={18} />
                New Recipe
              </button>
            </div>
          </div>

          {/* Regeneration Loading Overlay */}
          {isGenerating && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-2xl p-8 flex flex-col items-center gap-4 shadow-xl">
                <Loader2 size={40} className="animate-spin text-amber-500" />
                <p className="text-lg font-medium text-slate-700">Regenerating your recipe...</p>
                <p className="text-sm text-slate-500">This may take a moment</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Print View Modal */}
      {showPrintView && generatedRecipe && (
        <RecipePrintView
          meal={generatedRecipe}
          onClose={() => setShowPrintView(false)}
        />
      )}

      {/* Nutrition Info Modal */}
      {showNutrition && generatedRecipe && (
        <NutritionInfo
          meal={generatedRecipe}
          servings={servings}
          onClose={() => setShowNutrition(false)}
        />
      )}

      {/* Recipe Adjuster Modal */}
      {showAdjuster && generatedRecipe && (
        <RecipeAdjuster
          meal={generatedRecipe}
          preferences={preferences}
          onClose={() => setShowAdjuster(false)}
          onApply={handleApplyAdjustment}
          currentServings={servings}
        />
      )}

      {/* Regenerate Modal */}
      {showRegenerateModal && generatedRecipe && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl animate-fadeIn max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <RefreshCw size={20} className="text-amber-500" />
                <h2 className="text-lg font-bold text-slate-800">Regenerate Recipe</h2>
              </div>
              <button
                onClick={() => setShowRegenerateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-4 space-y-5">
              {/* Current Recipe Info */}
              <div className="bg-slate-50 rounded-xl p-3">
                <p className="text-sm text-slate-500">Current recipe:</p>
                <p className="font-medium text-slate-700">{generatedRecipe.name}</p>
              </div>

              {/* Main Dish Variation */}
              <div>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-2">
                  <ChefHat size={16} className="text-amber-500" />
                  Main Dish Variation
                </label>
                <textarea
                  value={regenerateMainVariation}
                  onChange={(e) => setRegenerateMainVariation(e.target.value)}
                  placeholder="e.g., Make it spicier, use chicken instead of beef, add more vegetables..."
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none"
                  rows={2}
                />
                <p className="text-xs text-slate-400 mt-1">Leave empty to generate a fresh variation</p>
              </div>

              {/* Include Sides Toggle */}
              <div className="border border-slate-200 rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regenerateIncludeSides}
                    onChange={(e) => setRegenerateIncludeSides(e.target.checked)}
                    className="w-5 h-5 text-emerald-500 border-slate-300 rounded focus:ring-emerald-500"
                  />
                  <div className="flex items-center gap-2">
                    <UtensilsCrossed size={18} className="text-emerald-600" />
                    <span className="font-medium text-slate-700">Include Side Dishes</span>
                  </div>
                </label>

                {regenerateIncludeSides && (
                  <div className="mt-3 pl-8">
                    <textarea
                      value={regenerateSidesVariation}
                      onChange={(e) => setRegenerateSidesVariation(e.target.value)}
                      placeholder="e.g., Simple salad, roasted vegetables, something light..."
                      className="w-full px-3 py-2 text-sm border border-emerald-200 bg-emerald-50 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none resize-none"
                      rows={2}
                    />
                    <p className="text-xs text-slate-400 mt-1">Optional: describe what kind of sides you want</p>
                  </div>
                )}
              </div>

              {/* Include Dessert Toggle */}
              <div className="border border-slate-200 rounded-xl p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={regenerateIncludeDessert}
                    onChange={(e) => setRegenerateIncludeDessert(e.target.checked)}
                    className="w-5 h-5 text-pink-500 border-slate-300 rounded focus:ring-pink-500"
                  />
                  <div className="flex items-center gap-2">
                    <Cake size={18} className="text-pink-600" />
                    <span className="font-medium text-slate-700">Include Dessert</span>
                  </div>
                </label>

                {regenerateIncludeDessert && (
                  <div className="mt-3 pl-8">
                    <textarea
                      value={regenerateDessertVariation}
                      onChange={(e) => setRegenerateDessertVariation(e.target.value)}
                      placeholder="e.g., Something chocolate, light and fruity, no baking required..."
                      className="w-full px-3 py-2 text-sm border border-pink-200 bg-pink-50 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 outline-none resize-none"
                      rows={2}
                    />
                    <p className="text-xs text-slate-400 mt-1">Optional: describe what kind of dessert you want</p>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowRegenerateModal(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRegenerate}
                  className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <RefreshCw size={18} />
                  Regenerate
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SingleRecipeGenerator;
