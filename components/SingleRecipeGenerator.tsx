import React, { useState } from 'react';
import { ArrowLeft, Sparkles, ChefHat, Loader2, Heart, Printer, Users, Check, Apple, SlidersHorizontal, AlertCircle, Package, ShoppingCart } from 'lucide-react';
import type { Meal, UserPreferences, PantryItem } from '../types';
import { generateSingleRecipe, generateDishImage } from '../services/geminiService';
import { saveFavoriteMeal } from '../services/storageService';
import RecipePrintView from './RecipePrintView';
import NutritionInfo from './NutritionInfo';
import RecipeAdjuster from './RecipeAdjuster';

interface SingleRecipeGeneratorProps {
  onBack: () => void;
  preferences: UserPreferences;
  pantryItems: PantryItem[];
  peopleCount: number;
  onManagePantry?: () => void;
}

const SingleRecipeGenerator: React.FC<SingleRecipeGeneratorProps> = ({
  onBack,
  preferences,
  pantryItems,
  peopleCount,
  onManagePantry,
}) => {
  const [description, setDescription] = useState('');
  const [servings, setServings] = useState(peopleCount);
  const [useWhatIHave, setUseWhatIHave] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Meal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [showPrintView, setShowPrintView] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);
  const [showAdjuster, setShowAdjuster] = useState(false);

  const hasPantryItems = pantryItems.length > 0;

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

    try {
      const recipe = await generateSingleRecipe(
        description,
        preferences,
        pantryItems,
        servings,
        useWhatIHave
      );
      setGeneratedRecipe(recipe);

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
      await saveFavoriteMeal(generatedRecipe);
      setIsSaved(true);
    } catch (err) {
      console.error('Failed to save recipe:', err);
    } finally {
      setIsSaving(false);
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
    setError(null);
  };

  const handleApplyAdjustment = async (adjustedMeal: Meal, saveAsNew: boolean) => {
    if (saveAsNew) {
      // For single recipe generator, we save as new and update the display
      try {
        await saveFavoriteMeal(adjustedMeal);
        setGeneratedRecipe(adjustedMeal);
        setServings(adjustedMeal.servings || servings);
        setIsSaved(true); // Mark as saved since we just saved it
      } catch (error) {
        console.error('Failed to save adjusted recipe:', error);
        // Still update the display even if save failed
        setGeneratedRecipe(adjustedMeal);
        setServings(adjustedMeal.servings || servings);
        setIsSaved(false);
      }
    } else {
      // Legacy: just update the display
      setGeneratedRecipe(adjustedMeal);
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

          {/* Info about preferences */}
          <div className="bg-slate-50 rounded-xl p-4">
            <p className="text-sm text-slate-500">
              Your dietary preferences{hasPantryItems ? ' and pantry items' : ''} will be used to create a personalized recipe.
            </p>
            {preferences.dietaryRestrictions && (
              <p className="text-xs text-slate-400 mt-1">
                Diet: {preferences.dietaryRestrictions}
              </p>
            )}
            {hasPantryItems && !useWhatIHave && (
              <p className="text-xs text-slate-400 mt-1">
                {pantryItems.length} pantry items available
              </p>
            )}
          </div>

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
                onClick={handleNewRecipe}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg font-medium transition-colors ml-auto"
              >
                <Sparkles size={18} />
                Generate Another
              </button>
            </div>
          </div>
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
        />
      )}
    </div>
  );
};

export default SingleRecipeGenerator;
