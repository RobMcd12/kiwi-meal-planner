import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Meal, CookbookTab, SideDish, UserProfile } from '../types';
import { getFavoriteMeals, removeFavoriteMeal, getCachedImage, cacheImage, updateFavoriteMealImage, saveFavoriteMeal } from '../services/storageService';
import { useAuth } from './AuthProvider';
import { getUserProfile } from '../services/profileService';
import { generateDishImage, editDishImage, TAG_CATEGORIES, adjustRecipe, AdjustedRecipe } from '../services/geminiService';
import {
  getUserUploadedRecipes,
  getUserGeneratedRecipes,
  getPublicRecipes,
  searchRecipes,
  toggleRecipePublic,
  assignTagsToRecipe,
  getBatchRecipeRatings
} from '../services/recipeService';
import { useUpload } from '../contexts/UploadContext';
import RecipeUploadModal from './RecipeUploadModal';
import RecipeNotesSection from './RecipeNotesSection';
import RecipePrintView from './RecipePrintView';
import NutritionInfo from './NutritionInfo';
import TagEditor from './TagEditor';
import RecipeAdjuster from './RecipeAdjuster';
import SuggestSidesModal from './SuggestSidesModal';
import {
  Trash2, Heart, ShoppingCart, ArrowLeft, X, ChefHat, Clock,
  Image as ImageIcon, Loader2, Search, Grid, List, Plus, Upload,
  Globe, Lock, Tag, User, Sparkles, FileText, Pencil, RefreshCw, Star, Printer, Apple, SlidersHorizontal, Crown, AlertCircle, Video, Play, MoreVertical, Mic, MessageCircle, UtensilsCrossed, Target, FolderPlus
} from 'lucide-react';
import RecipeVideoPlayer from './RecipeVideoPlayer';
import RecipeChatModal from './RecipeChatModal';
import ResponsiveTabs from './ResponsiveTabs';
import { getRecipeVideo, initiateVideoGeneration } from '../services/recipeVideoService';
import type { RecipeVideo } from '../types';
import { getSidesForRecipe } from '../services/suggestSidesService';
import { getUserMacroTargets } from '../services/macroTargetService';
import type { MacroTargets } from '../types';
import {
  getUserCategories,
  createCategory,
  getBatchRecipeCategories,
  getRecipeCategories,
  assignCategoriesToRecipe,
  type RecipeCategory,
  type RecipeCategoryAssignment
} from '../services/recipeCategoryService';
import CategorySelector, { getCategoryColorClasses } from './CategorySelector';

interface FavoritesViewProps {
  onBack: () => void;
  onGenerateList: (meals: Meal[]) => void;
  isLoading: boolean;
  isAdmin?: boolean;
  onGenerateSingleRecipe?: () => void;
  hasPro?: boolean;
  recipeCount?: number;
  recipeLimit?: number;
  onUpgradeClick?: () => void;
}

type ViewMode = 'cards' | 'list';

const FavoritesView: React.FC<FavoritesViewProps> = ({
  onBack,
  onGenerateList,
  isLoading,
  isAdmin = false,
  onGenerateSingleRecipe,
  hasPro = false,
  recipeCount = 0,
  recipeLimit = 20,
  onUpgradeClick
}) => {
  const { user } = useAuth();

  // Calculate if user can create more recipes
  const canCreateRecipe = hasPro || recipeCount < recipeLimit;
  const recipesRemaining = hasPro ? null : Math.max(0, recipeLimit - recipeCount);

  // Get user's display name for recipe naming
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User';

  // Track whether we've initialized the default tab
  const defaultTabInitialized = useRef(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  // Tab and view state - start with null until we determine the correct default
  const [activeTab, setActiveTab] = useState<CookbookTab | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Recipe data
  const [generatedRecipes, setGeneratedRecipes] = useState<Meal[]>([]);
  const [uploadedRecipes, setUploadedRecipes] = useState<Meal[]>([]);
  const [publicRecipes, setPublicRecipes] = useState<Meal[]>([]);
  const [favouriteRecipes, setFavouriteRecipes] = useState<Meal[]>([]);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [minRating, setMinRating] = useState<number | undefined>(undefined);
  const [hasVideoFilter, setHasVideoFilter] = useState(false);

  // Selection and modal state
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [openMeal, setOpenMeal] = useState<Meal | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [imageEditPrompt, setImageEditPrompt] = useState('');
  const [showPrintView, setShowPrintView] = useState(false);
  const [showNutrition, setShowNutrition] = useState(false);
  const [showAdjuster, setShowAdjuster] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  // Images
  const [mealImages, setMealImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});

  // Video state
  const [currentVideo, setCurrentVideo] = useState<RecipeVideo | null>(null);
  const [loadingVideo, setLoadingVideo] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);

  // Recipe chat state
  const [showRecipeChat, setShowRecipeChat] = useState(false);

  // Side dishes state
  const [showSidesModal, setShowSidesModal] = useState(false);
  const [recipeSides, setRecipeSides] = useState<SideDish[]>([]);

  // Fit My Macros state
  const [userMacroTargets, setUserMacroTargets] = useState<MacroTargets | null>(null);
  const [isCustomMacros, setIsCustomMacros] = useState(false);
  const [isFittingMacros, setIsFittingMacros] = useState(false);
  const [fittedRecipePreview, setFittedRecipePreview] = useState<AdjustedRecipe | null>(null);
  const [fittedRecipeName, setFittedRecipeName] = useState('');
  const [showFitPreview, setShowFitPreview] = useState(false);
  const [isSavingFitted, setIsSavingFitted] = useState(false);

  // Loading state
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);

  // Upload context
  const { uploads, hasActiveUploads } = useUpload();

  // User categories state
  const [userCategories, setUserCategories] = useState<RecipeCategory[]>([]);
  const [recipeCategoryMap, setRecipeCategoryMap] = useState<Record<string, RecipeCategoryAssignment[]>>({});
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);
  const [openMealCategories, setOpenMealCategories] = useState<string[]>([]);

  // All available tags for filtering
  const allTags = useMemo(() => [
    ...TAG_CATEGORIES.cuisine,
    ...TAG_CATEGORIES.dietary,
    ...TAG_CATEGORIES.mealType,
    ...TAG_CATEGORIES.other
  ], []);

  // Initialize default tab based on user preference
  useEffect(() => {
    const initializeDefaultTab = async () => {
      if (defaultTabInitialized.current || !user) return;
      defaultTabInitialized.current = true;

      // Load user profile to get preference
      const profile = await getUserProfile(user.id);
      setUserProfile(profile);

      // Load all recipes first to determine if favourites exist
      const [generated, uploaded] = await Promise.all([
        getUserGeneratedRecipes(),
        getUserUploadedRecipes()
      ]);

      // Find recipes marked as favourite
      const allRecipes = [...generated, ...uploaded];
      const favourites = allRecipes.filter(r => r.isFavorite === true);
      setFavouriteRecipes(favourites);
      setGeneratedRecipes(generated);
      setUploadedRecipes(uploaded);

      // Determine default tab
      if (profile?.defaultCookbookTab) {
        // User has a preference set
        setActiveTab(profile.defaultCookbookTab);
      } else if (favourites.length > 0) {
        // No preference but has favourites
        setActiveTab('favourites');
      } else {
        // No preference and no favourites - default to all
        setActiveTab('all');
      }
    };

    initializeDefaultTab();
  }, [user]);

  // Load recipes based on active tab
  useEffect(() => {
    if (activeTab) {
      loadRecipes();
    }
  }, [activeTab]);

  // Load user's categories
  useEffect(() => {
    const loadCategories = async () => {
      if (!user) return;
      try {
        const categories = await getUserCategories(user.id);
        setUserCategories(categories);
      } catch (err) {
        console.error('Error loading user categories:', err);
      }
    };
    loadCategories();
  }, [user]);

  // Load user's macro targets for Fit My Macros feature
  useEffect(() => {
    const loadMacroTargets = async () => {
      if (!user) return;
      try {
        const data = await getUserMacroTargets(user.id);
        if (data) {
          setUserMacroTargets(data.targets);
          setIsCustomMacros(data.isCustom);
        }
      } catch (err) {
        console.error('Error loading macro targets:', err);
      }
    };
    loadMacroTargets();
  }, [user]);

  // Reload uploaded recipes when uploads complete
  useEffect(() => {
    const hasNewComplete = uploads.some(u => u.status === 'complete');
    if (hasNewComplete && activeTab === 'uploaded') {
      loadRecipes();
    }
  }, [uploads]);

  const loadRecipes = async () => {
    setIsLoadingRecipes(true);
    try {
      let loadedRecipes: Meal[] = [];

      if (activeTab === 'favourites' || activeTab === 'all') {
        // For favourites and all tabs, load both generated and uploaded
        const [generated, uploaded] = await Promise.all([
          getUserGeneratedRecipes(),
          getUserUploadedRecipes()
        ]);
        setGeneratedRecipes(generated);
        setUploadedRecipes(uploaded);

        // Filter for favourites
        const allRecipes = [...generated, ...uploaded];
        const favourites = allRecipes.filter(r => r.isFavorite === true);
        setFavouriteRecipes(favourites);

        loadedRecipes = activeTab === 'favourites' ? favourites : allRecipes;
      } else if (activeTab === 'generated') {
        const recipes = await getUserGeneratedRecipes();
        // Fallback to local storage if no Supabase data
        if (recipes.length === 0) {
          const localFavorites = await getFavoriteMeals();
          loadedRecipes = localFavorites.filter(m => m.source !== 'uploaded');
        } else {
          loadedRecipes = recipes;
        }
        setGeneratedRecipes(loadedRecipes);
      } else if (activeTab === 'uploaded') {
        loadedRecipes = await getUserUploadedRecipes();
        setUploadedRecipes(loadedRecipes);
      } else if (activeTab === 'public') {
        loadedRecipes = await getPublicRecipes();
        setPublicRecipes(loadedRecipes);
      }

      // Fetch ratings for all loaded recipes
      if (loadedRecipes.length > 0) {
        const mealIds = loadedRecipes.map(m => m.id);
        const ratings = await getBatchRecipeRatings(mealIds);

        // Update recipes with ratings
        loadedRecipes = loadedRecipes.map(meal => ({
          ...meal,
          averageRating: ratings[meal.id]?.average || 0,
          ratingCount: ratings[meal.id]?.count || 0
        }));

        // Update the correct state based on tab
        if (activeTab === 'favourites') {
          setFavouriteRecipes(loadedRecipes);
        } else if (activeTab === 'generated') {
          setGeneratedRecipes(loadedRecipes);
        } else if (activeTab === 'uploaded') {
          setUploadedRecipes(loadedRecipes);
        } else if (activeTab === 'public') {
          setPublicRecipes(loadedRecipes);
        }

        // Load category assignments for recipes (not for public tab)
        if (activeTab !== 'public') {
          const categoryAssignments = await getBatchRecipeCategories(mealIds);
          setRecipeCategoryMap(categoryAssignments);
        }
      }

      // Load cached images and auto-generate for recipes without images
      const recipesNeedingImages: Meal[] = [];

      for (const meal of loadedRecipes) {
        // Check if recipe already has an image URL from DB
        if (meal.imageUrl) {
          setMealImages(prev => ({ ...prev, [meal.name]: meal.imageUrl! }));
        } else {
          // Try to load from local cache
          const cached = await getCachedImage(meal.name);
          if (cached) {
            setMealImages(prev => ({ ...prev, [meal.name]: cached }));
          } else {
            // No image - queue for auto-generation
            recipesNeedingImages.push(meal);
          }
        }
      }

      // Auto-generate images for recipes without them (in background)
      if (recipesNeedingImages.length > 0) {
        autoGenerateImages(recipesNeedingImages);
      }
    } catch (err) {
      console.error('Error loading recipes:', err);
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  // Auto-generate images for recipes in background
  const autoGenerateImages = async (recipes: Meal[]) => {
    // Process up to 3 at a time to avoid rate limits
    const batchSize = 3;
    for (let i = 0; i < recipes.length; i += batchSize) {
      const batch = recipes.slice(i, i + batchSize);
      await Promise.all(batch.map(async (meal) => {
        // Skip if already loading or already has image
        if (loadingImages[meal.name] || mealImages[meal.name]) return;

        setLoadingImages(prev => ({ ...prev, [meal.name]: true }));
        try {
          const imageData = await generateDishImage(meal.name, meal.description);
          if (imageData) {
            setMealImages(prev => ({ ...prev, [meal.name]: imageData }));
            await cacheImage(meal.name, meal.description, imageData);
            // Save to database so image persists
            if (meal.id) {
              await updateFavoriteMealImage(meal.id, imageData);
            }
          }
        } catch (error) {
          console.error(`Failed to auto-generate image for ${meal.name}:`, error);
        } finally {
          setLoadingImages(prev => ({ ...prev, [meal.name]: false }));
        }
      }));
    }
  };

  // Get current recipes based on tab
  const currentRecipes = useMemo(() => {
    let recipes: Meal[] = [];
    if (activeTab === 'all') {
      // Combine all recipes, avoiding duplicates by id
      const seen = new Set<string>();
      [...generatedRecipes, ...uploadedRecipes].forEach(r => {
        if (!seen.has(r.id)) {
          seen.add(r.id);
          recipes.push(r);
        }
      });
    } else if (activeTab === 'favourites') recipes = favouriteRecipes;
    else if (activeTab === 'generated') recipes = generatedRecipes;
    else if (activeTab === 'uploaded') recipes = uploadedRecipes;
    else if (activeTab === 'public') recipes = publicRecipes;

    // Apply search, tag, and rating filters
    let filtered = searchRecipes(recipes, searchQuery, selectedTags, minRating);

    // Apply video filter
    if (hasVideoFilter) {
      filtered = filtered.filter(r => r.hasVideo);
    }

    // Apply category filter
    if (selectedCategoryFilter) {
      filtered = filtered.filter(r => {
        const categories = recipeCategoryMap[r.id] || [];
        return categories.some(c => c.categoryId === selectedCategoryFilter);
      });
    }

    return filtered;
  }, [activeTab, generatedRecipes, uploadedRecipes, publicRecipes, favouriteRecipes, searchQuery, selectedTags, minRating, hasVideoFilter, selectedCategoryFilter, recipeCategoryMap]);

  // Get unique tags from current recipes for filter pills
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    currentRecipes.forEach(r => r.tags?.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [currentRecipes]);

  const handleDelete = async (id: string, name: string) => {
    const success = await removeFavoriteMeal(id);
    if (!success) {
      console.error('Failed to delete recipe:', name);
      return;
    }
    // Remove from both lists (in case it appears in both or we're on 'all' tab)
    setGeneratedRecipes(prev => prev.filter(m => m.id !== id));
    setUploadedRecipes(prev => prev.filter(m => m.id !== id));
    setSelectedMeals(prev => prev.filter(n => n !== name));
    if (openMeal?.id === id) {
      setOpenMeal(null);
    }
  };

  const toggleSelect = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    if (selectedMeals.includes(name)) {
      setSelectedMeals(prev => prev.filter(n => n !== name));
    } else {
      setSelectedMeals(prev => [...prev, name]);
    }
  };

  const handleOpenMeal = async (meal: Meal) => {
    setOpenMeal(meal);
    setShowTagEditor(false);
    setShowImageEditor(false);
    setImageEditPrompt('');
    setCurrentVideo(null);
    setGeneratingVideo(false);
    setRecipeSides([]);

    // Load categories for this meal
    const mealCategories = recipeCategoryMap[meal.id] || [];
    setOpenMealCategories(mealCategories.map(c => c.categoryId));

    // Load video if recipe has one
    if (meal.hasVideo && meal.id) {
      setLoadingVideo(true);
      const video = await getRecipeVideo(meal.id);
      setCurrentVideo(video);
      setLoadingVideo(false);
    }

    // Load sides if recipe has them
    if (meal.id) {
      const sides = await getSidesForRecipe(meal.id);
      setRecipeSides(sides);
    }
  };

  const handleCloseMeal = () => {
    setOpenMeal(null);
    setShowTagEditor(false);
    setShowImageEditor(false);
    setImageEditPrompt('');
    setCurrentVideo(null);
    setShowMobileMenu(false);
    setLoadingVideo(false);
    setShowSidesModal(false);
    setRecipeSides([]);
    // Note: We don't reset generatingVideo here to allow background generation
  };

  const handleGenerateImage = async (meal: Meal) => {
    if (loadingImages[meal.name]) return;

    setLoadingImages(prev => ({ ...prev, [meal.name]: true }));
    try {
      const imageData = await generateDishImage(meal.name, meal.description);
      if (imageData) {
        setMealImages(prev => ({ ...prev, [meal.name]: imageData }));
        await cacheImage(meal.name, meal.description, imageData);
        // Save to database so the image persists
        if (meal.id) {
          await updateFavoriteMealImage(meal.id, imageData);
        }
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
    } finally {
      setLoadingImages(prev => ({ ...prev, [meal.name]: false }));
    }
  };

  const handleEditImage = async (meal: Meal, instructions: string) => {
    if (loadingImages[meal.name] || !instructions.trim()) return;

    setLoadingImages(prev => ({ ...prev, [meal.name]: true }));
    try {
      const imageData = await editDishImage(meal.name, meal.description, instructions);
      if (imageData) {
        setMealImages(prev => ({ ...prev, [meal.name]: imageData }));
        await cacheImage(meal.name, meal.description, imageData);
        // Save to database so the image persists
        if (meal.id) {
          await updateFavoriteMealImage(meal.id, imageData);
        }
        setShowImageEditor(false);
        setImageEditPrompt('');
      }
    } catch (error) {
      console.error('Failed to edit image:', error);
    } finally {
      setLoadingImages(prev => ({ ...prev, [meal.name]: false }));
    }
  };

  const handleTogglePublic = async (meal: Meal) => {
    const newIsPublic = !meal.isPublic;
    const success = await toggleRecipePublic(meal.id, newIsPublic);
    if (success) {
      // Update local state
      if (activeTab === 'uploaded') {
        setUploadedRecipes(prev => prev.map(m =>
          m.id === meal.id ? { ...m, isPublic: newIsPublic } : m
        ));
      }
      if (openMeal?.id === meal.id) {
        setOpenMeal(prev => prev ? { ...prev, isPublic: newIsPublic } : null);
      }
    }
  };

  const handleTagsChange = async (meal: Meal, newTags: string[]) => {
    const success = await assignTagsToRecipe(meal.id, newTags);
    if (success) {
      // Update local state
      const updateRecipes = (prev: Meal[]) =>
        prev.map(m => m.id === meal.id ? { ...m, tags: newTags } : m);

      if (activeTab === 'generated') setGeneratedRecipes(updateRecipes);
      else if (activeTab === 'uploaded') setUploadedRecipes(updateRecipes);

      if (openMeal?.id === meal.id) {
        setOpenMeal(prev => prev ? { ...prev, tags: newTags } : null);
      }
    }
  };

  const handleCategoriesChange = async (mealId: string, categoryIds: string[]) => {
    const success = await assignCategoriesToRecipe(mealId, categoryIds);
    if (success) {
      // Update local category map
      const newAssignments = categoryIds.map(categoryId => {
        const category = userCategories.find(c => c.id === categoryId);
        return {
          mealId,
          categoryId,
          categoryName: category?.name || '',
          categoryColor: category?.color || 'slate'
        };
      });
      setRecipeCategoryMap(prev => ({
        ...prev,
        [mealId]: newAssignments
      }));
      setOpenMealCategories(categoryIds);
    }
  };

  const handleCreateCategory = async (name: string): Promise<RecipeCategory | null> => {
    if (!user) return null;
    const newCategory = await createCategory(user.id, name);
    if (newCategory) {
      setUserCategories(prev => [...prev, newCategory]);
    }
    return newCategory;
  };

  const handleGenerate = () => {
    const allRecipes = [...generatedRecipes, ...uploadedRecipes, ...publicRecipes];
    const mealsToProcess = allRecipes.filter(f => selectedMeals.includes(f.name));
    onGenerateList(mealsToProcess);
  };

  const toggleTagFilter = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const canEditTags = (meal: Meal) => {
    // Users can edit tags on their uploaded recipes
    // Admins can edit any tags
    return isAdmin || (activeTab === 'uploaded' && meal.source === 'uploaded');
  };

  const handleApplyAdjustment = async (adjustedMeal: Meal, saveAsNew: boolean) => {
    if (saveAsNew) {
      // Save as a new recipe - don't modify the original
      try {
        const saved = await saveFavoriteMeal(adjustedMeal);
        if (saved) {
          // Reload recipes to show the new one
          await loadRecipes();
          // Close the modal
          setOpenMeal(null);
          setShowAdjuster(false);
        }
      } catch (error) {
        console.error('Failed to save adjusted recipe:', error);
      }
    } else {
      // Legacy behavior: Update the recipe in local state (kept for backwards compatibility)
      const updateRecipes = (prev: Meal[]) =>
        prev.map(m => m.id === adjustedMeal.id ? { ...adjustedMeal, imageUrl: m.imageUrl } : m);

      if (activeTab === 'generated') setGeneratedRecipes(updateRecipes);
      else if (activeTab === 'uploaded') setUploadedRecipes(updateRecipes);

      // Update the open meal with the adjustments
      setOpenMeal(adjustedMeal);
    }
  };

  // Handle "Fit My Macros" - automatically adjust recipe to user's macro targets
  const handleFitMyMacros = async () => {
    if (!openMeal || !hasPro) return;

    // Use user's custom targets or fall back to defaults
    const targets = userMacroTargets || {
      calories: 2000,
      protein: 50,
      carbohydrates: 250,
      fat: 65,
    };

    setIsFittingMacros(true);

    try {
      // Calculate per-serving targets (assuming 3 main meals per day)
      const servingsPerDay = 3;
      const perServingTargets = {
        targetCalories: Math.round(targets.calories / servingsPerDay),
        targetProtein: Math.round(targets.protein / servingsPerDay),
        targetCarbs: Math.round(targets.carbohydrates / servingsPerDay),
        targetFat: Math.round(targets.fat / servingsPerDay),
      };

      const adjusted = await adjustRecipe(openMeal, {
        type: 'macros',
        ...perServingTargets,
      });

      // Show preview modal with suggested name
      setFittedRecipePreview(adjusted);
      setFittedRecipeName(`${userName}'s ${adjusted.name || openMeal.name}`);
      setShowFitPreview(true);
    } catch (error) {
      console.error('Failed to fit recipe to macros:', error);
    } finally {
      setIsFittingMacros(false);
    }
  };

  // Save the fitted recipe as a new recipe
  const handleSaveFittedRecipe = async () => {
    if (!fittedRecipePreview || !fittedRecipeName.trim()) return;

    setIsSavingFitted(true);

    try {
      const newMeal: Meal = {
        id: '',
        name: fittedRecipeName.trim(),
        description: fittedRecipePreview.description,
        ingredients: fittedRecipePreview.ingredients,
        instructions: fittedRecipePreview.instructions,
        servings: fittedRecipePreview.servings,
        source: 'generated',
      };

      const saved = await saveFavoriteMeal(newMeal);
      if (saved) {
        await loadRecipes();
        // Close both modals
        setShowFitPreview(false);
        setFittedRecipePreview(null);
        setOpenMeal(null);
      }
    } catch (error) {
      console.error('Failed to save fitted recipe:', error);
    } finally {
      setIsSavingFitted(false);
    }
  };

  // Cancel the fitted recipe preview
  const handleCancelFitPreview = () => {
    setShowFitPreview(false);
    setFittedRecipePreview(null);
    setFittedRecipeName('');
  };

  // Get source badge color and icon
  const getSourceBadge = (meal: Meal) => {
    if (meal.source === 'uploaded') {
      return { color: 'bg-purple-100 text-purple-700', icon: Upload, label: 'Uploaded' };
    }
    if (meal.isPublic) {
      return { color: 'bg-blue-100 text-blue-700', icon: Globe, label: 'Public' };
    }
    return { color: 'bg-emerald-100 text-emerald-700', icon: Sparkles, label: 'AI Generated' };
  };

  return (
    <div className="max-w-5xl mx-auto animate-fadeIn">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-gradient-to-br from-emerald-50 via-white to-orange-50 pb-4 -mx-4 px-4 pt-4">
        {/* Title Row - on mobile, just title; on desktop, title + actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <ArrowLeft size={24} className="text-slate-600" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-slate-800">My Cookbook</h2>
              {/* Recipe limit indicator for free users - only on desktop */}
              {!hasPro && (
                <div className="hidden md:flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-slate-500">
                      {recipeCount} / {recipeLimit} recipes
                    </span>
                    <div className="w-24 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          recipeCount >= recipeLimit
                            ? 'bg-red-500'
                            : recipeCount >= recipeLimit * 0.8
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (recipeCount / recipeLimit) * 100)}%` }}
                      />
                    </div>
                  </div>
                  {recipeCount >= recipeLimit && (
                    <button
                      onClick={onUpgradeClick}
                      className="flex items-center gap-1 px-2 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-medium rounded-full hover:from-amber-600 hover:to-orange-600 transition-colors"
                    >
                      <Crown size={10} />
                      Upgrade
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons - hidden on mobile, shown on desktop */}
          <div className="hidden md:flex items-center gap-2">
            {/* Generate Recipe Button */}
            {onGenerateSingleRecipe && (
              <button
                onClick={() => {
                  if (!canCreateRecipe) {
                    onUpgradeClick?.();
                  } else {
                    onGenerateSingleRecipe();
                  }
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  canCreateRecipe
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-slate-200 text-slate-500 cursor-pointer'
                }`}
                title={canCreateRecipe ? 'Generate a Recipe' : 'Recipe limit reached - Upgrade to Pro'}
              >
                {canCreateRecipe ? <Sparkles size={18} /> : <Lock size={18} />}
                <span className="hidden sm:inline">Generate</span>
              </button>
            )}

            {/* Upload Button - Pro only */}
            <button
              onClick={() => {
                if (!hasPro) {
                  onUpgradeClick?.();
                } else {
                  setShowUploadModal(true);
                }
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                hasPro
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-slate-200 text-slate-500 cursor-pointer'
              }`}
              title={hasPro ? 'Upload Recipe (Image, PDF, URL)' : 'Upgrade to Pro to upload recipes'}
            >
              {hasPro ? <Plus size={18} /> : <Lock size={18} />}
              <span className="hidden sm:inline">Upload</span>
              {!hasPro && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full">
                  <Crown size={10} />
                  PRO
                </span>
              )}
            </button>

            {/* Generate Shopping List Button */}
            {selectedMeals.length > 0 && (
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span className="hidden sm:inline">Generating...</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    <span className="hidden sm:inline">Create List</span>
                    <span className="bg-white/20 px-1.5 py-0.5 rounded text-sm">{selectedMeals.length}</span>
                  </>
                )}
              </button>
            )}

            {/* View Toggle */}
            <div className="flex items-center bg-slate-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('cards')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'cards' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Card view"
              >
                <Grid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
                }`}
                title="List view"
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Action Buttons Row - shown only on mobile */}
        <div className="flex md:hidden items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            {/* Generate Recipe Button */}
            {onGenerateSingleRecipe && (
              <button
                onClick={() => {
                  if (!canCreateRecipe) {
                    onUpgradeClick?.();
                  } else {
                    onGenerateSingleRecipe();
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                  canCreateRecipe
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-slate-200 text-slate-500 cursor-pointer'
                }`}
                title={canCreateRecipe ? 'Generate a Recipe' : 'Recipe limit reached - Upgrade to Pro'}
              >
                {canCreateRecipe ? <Sparkles size={18} /> : <Lock size={18} />}
              </button>
            )}

            {/* Upload Button - Pro only */}
            <button
              onClick={() => {
                if (!hasPro) {
                  onUpgradeClick?.();
                } else {
                  setShowUploadModal(true);
                }
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors ${
                hasPro
                  ? 'bg-purple-600 hover:bg-purple-700 text-white'
                  : 'bg-slate-200 text-slate-500 cursor-pointer'
              }`}
              title={hasPro ? 'Upload Recipe (Image, PDF, URL)' : 'Upgrade to Pro to upload recipes'}
            >
              {hasPro ? <Plus size={18} /> : <Lock size={18} />}
            </button>

            {/* Generate Shopping List Button */}
            {selectedMeals.length > 0 && (
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-3 py-2 rounded-lg font-medium transition-colors"
              >
                {isLoading ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <>
                    <ShoppingCart size={18} />
                    <span className="bg-white/20 px-1.5 py-0.5 rounded text-sm">{selectedMeals.length}</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'cards' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="Card view"
            >
              <Grid size={18} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="List view"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search recipes..."
            className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none bg-white"
          />
          {searchQuery && searchQuery.length < 3 && (
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              Type {3 - searchQuery.length} more...
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      {activeTab && (
        <ResponsiveTabs
          tabs={[
            {
              id: 'all',
              label: 'All Recipes',
              icon: <ChefHat size={16} />,
              color: 'default'
            },
            {
              id: 'favourites',
              label: 'Favourites',
              icon: <Heart size={16} />,
              color: 'rose'
            },
            {
              id: 'generated',
              label: 'AI Generated',
              icon: <Sparkles size={16} />,
              color: 'emerald'
            },
            {
              id: 'uploaded',
              label: 'My Uploads',
              icon: <Upload size={16} />,
              color: 'purple'
            },
            {
              id: 'public',
              label: 'Public Recipes',
              icon: <Globe size={16} />,
              color: 'blue'
            },
          ]}
          activeTab={activeTab}
          onTabChange={(tabId) => setActiveTab(tabId as CookbookTab)}
          variant="solid-pill"
          visibleCount={5}
          loadingTabId={hasActiveUploads ? 'uploaded' : undefined}
          className="mb-4"
        />
      )}

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        {/* Rating Filter */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-sm text-slate-500">
            <Star size={14} />
            Rating:
          </span>
          <div className="flex gap-1">
            {[0, 3, 4, 5].map(rating => (
              <button
                key={rating}
                onClick={() => setMinRating(rating === 0 ? undefined : rating)}
                className={`px-2.5 py-1 text-sm rounded-full border transition-colors ${
                  (rating === 0 && !minRating) || minRating === rating
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-amber-300'
                }`}
              >
                {rating === 0 ? 'All' : `${rating}+`}
              </button>
            ))}
          </div>
        </div>

        {/* Video Filter - Hidden until video API is configured */}
        {false && (
          <button
            onClick={() => setHasVideoFilter(!hasVideoFilter)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-full border transition-colors ${
              hasVideoFilter
                ? 'bg-purple-600 text-white border-purple-600'
                : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300'
            }`}
          >
            <Video size={14} />
            Has Video
          </button>
        )}

        {/* Category Filter Pills */}
        {userCategories.length > 0 && activeTab !== 'public' && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-slate-500">
              <FolderPlus size={14} />
              Categories:
            </span>
            {userCategories.map(cat => {
              const colors = getCategoryColorClasses(cat.color);
              const isSelected = selectedCategoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategoryFilter(isSelected ? null : cat.id)}
                  className={`px-2.5 py-1 text-sm rounded-full border transition-colors ${
                    isSelected
                      ? `${colors.bg} ${colors.text} ${colors.border}`
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        )}

        {/* Tag Filter Pills */}
        {availableTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1 text-sm text-slate-500">
              <Tag size={14} />
              Tags:
            </span>
            {availableTags.slice(0, 8).map(tag => (
              <button
                key={tag}
                onClick={() => toggleTagFilter(tag)}
                className={`px-2.5 py-1 text-sm rounded-full border transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Clear filters */}
        {(selectedTags.length > 0 || minRating || hasVideoFilter || selectedCategoryFilter) && (
          <button
            onClick={() => { setSelectedTags([]); setMinRating(undefined); setHasVideoFilter(false); setSelectedCategoryFilter(null); }}
            className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-full"
          >
            Clear All
          </button>
        )}
      </div>

      {/* Loading State */}
      {!activeTab || isLoadingRecipes ? (
        <div className="text-center py-20">
          <Loader2 size={32} className="animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500">Loading recipes...</p>
        </div>
      ) : currentRecipes.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
          {activeTab === 'uploaded' ? (
            <>
              <Upload size={48} className="mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">No uploaded recipes yet</h3>
              <p className="text-slate-400 mb-4">Upload your own recipes from images, PDFs, or text.</p>
              {hasPro ? (
                <button
                  onClick={() => setShowUploadModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Plus size={18} />
                  Upload Recipe
                </button>
              ) : (
                <button
                  onClick={() => onUpgradeClick?.()}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:from-amber-600 hover:to-orange-600 transition-colors"
                >
                  <Crown size={18} />
                  Upgrade to Pro to Upload
                </button>
              )}
            </>
          ) : activeTab === 'public' ? (
            <>
              <Globe size={48} className="mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">No public recipes yet</h3>
              <p className="text-slate-400">Recipes shared by other users will appear here.</p>
            </>
          ) : activeTab === 'favourites' ? (
            <>
              <Heart size={48} className="mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">No favourites yet</h3>
              <p className="text-slate-400">Mark recipes as favourites to see them here.</p>
            </>
          ) : (
            <>
              <ChefHat size={48} className="mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">No recipes yet</h3>
              <p className="text-slate-400">Generate or upload recipes to get started.</p>
            </>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
          {currentRecipes.map((meal) => {
            const hasImage = !!mealImages[meal.name] || !!meal.imageUrl;
            const imageUrl = mealImages[meal.name] || meal.imageUrl;
            const badge = getSourceBadge(meal);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={meal.id}
                className={`border rounded-xl overflow-hidden transition-all cursor-pointer ${
                  selectedMeals.includes(meal.name)
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md'
                }`}
                onClick={() => handleOpenMeal(meal)}
              >
                {/* Image */}
                <div className="h-36 overflow-hidden bg-gradient-to-br from-slate-100 to-slate-50 relative">
                  {hasImage ? (
                    <img
                      src={imageUrl}
                      alt={meal.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat size={32} className="text-slate-300" />
                    </div>
                  )}
                  {/* Source badge */}
                  <span className={`absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${badge.color}`}>
                    <BadgeIcon size={12} />
                    {badge.label}
                  </span>
                  {/* Processing indicator */}
                  {meal.uploadStatus === 'processing' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 size={24} className="animate-spin text-white" />
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2 flex-1">
                      <div
                        className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${
                          selectedMeals.includes(meal.name) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                        }`}
                        onClick={(e) => toggleSelect(e, meal.name)}
                      >
                        {selectedMeals.includes(meal.name) && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <h3 className="font-bold text-slate-800 line-clamp-1">{meal.name}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Video badge - Hidden until video API is configured */}
                      {false && meal.hasVideo && (
                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                          <Video size={12} />
                        </div>
                      )}
                      {/* Rating display */}
                      {meal.averageRating && meal.averageRating > 0 && (
                        <div className="flex items-center gap-1 text-amber-500">
                          <Star size={14} className="fill-amber-400" />
                          <span className="text-xs font-medium">{meal.averageRating.toFixed(1)}</span>
                        </div>
                      )}
                      {activeTab !== 'public' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(meal.id, meal.name); }}
                          className="text-slate-400 hover:text-red-500 p-1"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2 pl-7 mb-2">{meal.description}</p>

                  {/* Tags and Categories */}
                  <div className="flex flex-wrap gap-1 pl-7">
                    {/* User Categories */}
                    {recipeCategoryMap[meal.id]?.slice(0, 2).map(cat => {
                      const colors = getCategoryColorClasses(cat.categoryColor);
                      return (
                        <span
                          key={cat.categoryId}
                          className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
                        >
                          {cat.categoryName}
                        </span>
                      );
                    })}
                    {(recipeCategoryMap[meal.id]?.length || 0) > 2 && (
                      <span className="px-2 py-0.5 text-xs text-slate-400">
                        +{recipeCategoryMap[meal.id].length - 2}
                      </span>
                    )}
                    {/* Tags */}
                    {meal.tags && meal.tags.length > 0 && (
                      <>
                        {meal.tags.slice(0, 3 - (recipeCategoryMap[meal.id]?.length || 0)).map(tag => (
                          <span
                            key={tag}
                            className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {meal.tags.length > (3 - (recipeCategoryMap[meal.id]?.length || 0)) && (
                          <span className="px-2 py-0.5 text-xs text-slate-400">
                            +{meal.tags.length - (3 - (recipeCategoryMap[meal.id]?.length || 0))}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2 pb-4">
          {currentRecipes.map((meal) => {
            const hasImage = !!mealImages[meal.name] || !!meal.imageUrl;
            const imageUrl = mealImages[meal.name] || meal.imageUrl;
            const badge = getSourceBadge(meal);
            const BadgeIcon = badge.icon;

            return (
              <div
                key={meal.id}
                className={`flex items-center gap-4 p-4 border rounded-xl transition-all cursor-pointer ${
                  selectedMeals.includes(meal.name)
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md'
                }`}
                onClick={() => handleOpenMeal(meal)}
              >
                {/* Thumbnail */}
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 relative">
                  {hasImage ? (
                    <img
                      src={imageUrl}
                      alt={meal.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ChefHat size={24} className="text-slate-300" />
                    </div>
                  )}
                  {meal.uploadStatus === 'processing' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 size={16} className="animate-spin text-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${badge.color}`}>
                      <BadgeIcon size={10} />
                      {badge.label}
                    </span>
                    {meal.isPublic && meal.source === 'uploaded' && activeTab === 'uploaded' && (
                      <span className="flex items-center gap-1 text-xs text-blue-600">
                        <Globe size={10} />
                        Shared
                      </span>
                    )}
                    {/* Video badge in list view - Hidden until video API is configured */}
                    {false && meal.hasVideo && (
                      <div className="flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                        <Video size={10} />
                      </div>
                    )}
                    {/* Rating display in list view */}
                    {meal.averageRating && meal.averageRating > 0 && (
                      <div className="flex items-center gap-1 text-amber-500">
                        <Star size={12} className="fill-amber-400" />
                        <span className="text-xs font-medium">{meal.averageRating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-slate-800 truncate">{meal.name}</h3>
                  <p className="text-sm text-slate-600 line-clamp-1">{meal.description}</p>
                  {/* Categories and Tags */}
                  <div className="flex flex-wrap gap-1 mt-1">
                    {/* User Categories first */}
                    {recipeCategoryMap[meal.id]?.slice(0, 2).map(cat => {
                      const colors = getCategoryColorClasses(cat.categoryColor);
                      return (
                        <span
                          key={cat.categoryId}
                          className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
                        >
                          {cat.categoryName}
                        </span>
                      );
                    })}
                    {/* Then Tags */}
                    {meal.tags?.slice(0, 4 - (recipeCategoryMap[meal.id]?.length || 0)).map(tag => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                      selectedMeals.includes(meal.name) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                    }`}
                    onClick={(e) => toggleSelect(e, meal.name)}
                  >
                    {selectedMeals.includes(meal.name) && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  {activeTab !== 'public' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(meal.id, meal.name); }}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recipe Detail Modal */}
      {openMeal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 md:p-4"
          onClick={handleCloseMeal}
        >
          <div
            className="bg-white rounded-2xl w-full md:w-[85%] lg:w-[80%] max-w-5xl shadow-2xl max-h-[95vh] md:max-h-[90vh] overflow-y-auto overflow-x-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Section */}
            <div className="relative">
              {(mealImages[openMeal.name] || openMeal.imageUrl) ? (
                <div className="h-48 md:h-64 overflow-hidden rounded-t-2xl relative group">
                  <img
                    src={mealImages[openMeal.name] || openMeal.imageUrl}
                    alt={openMeal.name}
                    className="w-full h-full object-cover"
                  />
                  {/* Loading overlay */}
                  {loadingImages[openMeal.name] && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="flex items-center gap-2 text-white">
                        <Loader2 size={24} className="animate-spin" />
                        <span>Generating...</span>
                      </div>
                    </div>
                  )}
                  {/* Image edit buttons - show on hover */}
                  {!loadingImages[openMeal.name] && (
                    <div className="absolute bottom-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => setShowImageEditor(!showImageEditor)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white rounded-lg shadow-md text-slate-700 text-sm font-medium transition-colors"
                        title="Edit image with AI"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                      <button
                        onClick={() => handleGenerateImage(openMeal)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 hover:bg-white rounded-lg shadow-md text-slate-700 text-sm font-medium transition-colors"
                        title="Regenerate image"
                      >
                        <RefreshCw size={14} />
                        Regenerate
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-48 md:h-64 bg-gradient-to-br from-emerald-100 to-orange-100 rounded-t-2xl flex items-center justify-center">
                  <button
                    onClick={() => handleGenerateImage(openMeal)}
                    disabled={loadingImages[openMeal.name]}
                    className="flex items-center gap-2 px-4 py-2 bg-white/90 hover:bg-white rounded-lg shadow-md text-slate-700 font-medium transition-colors"
                  >
                    {loadingImages[openMeal.name] ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <ImageIcon size={18} />
                        Generate Image
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Image Edit Panel */}
              {showImageEditor && (mealImages[openMeal.name] || openMeal.imageUrl) && (
                <div className="absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm p-4 border-t border-slate-200">
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Describe how you want to change the image:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={imageEditPrompt}
                      onChange={(e) => setImageEditPrompt(e.target.value)}
                      placeholder="e.g., Make it more colorful, add garnish, show on a white plate..."
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && imageEditPrompt.trim()) {
                          handleEditImage(openMeal, imageEditPrompt);
                        }
                      }}
                    />
                    <button
                      onClick={() => handleEditImage(openMeal, imageEditPrompt)}
                      disabled={!imageEditPrompt.trim() || loadingImages[openMeal.name]}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => { setShowImageEditor(false); setImageEditPrompt(''); }}
                      className="px-3 py-2 text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Tip: Be specific about colors, plating, lighting, or presentation style.
                  </p>
                </div>
              )}

              {/* Close button */}
              <button
                onClick={handleCloseMeal}
                className="absolute top-3 right-3 p-2 bg-black/30 hover:bg-black/50 rounded-full text-white transition-colors"
              >
                <X size={20} />
              </button>

              {/* Source badge */}
              {(() => {
                const badge = getSourceBadge(openMeal);
                const BadgeIcon = badge.icon;
                return (
                  <span className={`absolute top-3 left-3 flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full ${badge.color}`}>
                    <BadgeIcon size={14} />
                    {badge.label}
                  </span>
                );
              })()}
            </div>

            {/* Content */}
            <div className="p-4 md:p-6">
              <div className="flex items-start justify-between gap-3 mb-3">
                <h2 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">{openMeal.name}</h2>

                {/* Mobile Menu Button */}
                <div className="relative md:hidden">
                  <button
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    <MoreVertical size={20} className="text-slate-600" />
                  </button>
                  {showMobileMenu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setShowMobileMenu(false)} />
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-slate-200 py-2 min-w-48 z-50">
                        <button
                          onClick={() => { setShowPrintView(true); setShowMobileMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-slate-700 hover:bg-slate-50"
                        >
                          <Printer size={18} className="text-slate-500" />
                          Print / PDF
                        </button>
                        <button
                          onClick={() => { setShowNutrition(true); setShowMobileMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-green-700 hover:bg-green-50"
                        >
                          <Apple size={18} />
                          Nutrition Info
                        </button>
                        <button
                          onClick={() => {
                            if (hasPro) {
                              setShowAdjuster(true);
                              setShowMobileMenu(false);
                            } else {
                              setShowMobileMenu(false);
                              onUpgradeClick?.();
                            }
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${
                            hasPro ? 'text-purple-700 hover:bg-purple-50' : 'text-slate-400'
                          }`}
                        >
                          <SlidersHorizontal size={18} />
                          Adjust Recipe
                          {!hasPro && (
                            <span className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full">
                              <Crown size={10} />
                              PRO
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (hasPro) {
                              handleFitMyMacros();
                              setShowMobileMenu(false);
                            } else {
                              setShowMobileMenu(false);
                              onUpgradeClick?.();
                            }
                          }}
                          disabled={isFittingMacros}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${
                            hasPro
                              ? 'text-teal-700 hover:bg-teal-50'
                              : 'text-slate-400'
                          } disabled:opacity-50`}
                        >
                          {isFittingMacros ? (
                            <Loader2 size={18} className="animate-spin" />
                          ) : (
                            <Target size={18} />
                          )}
                          {isFittingMacros ? 'Fitting...' : 'Fit My Macros'}
                          {!hasPro && (
                            <span className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full">
                              <Crown size={10} />
                              PRO
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => { setShowSidesModal(true); setShowMobileMenu(false); }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-amber-700 hover:bg-amber-50"
                        >
                          <UtensilsCrossed size={18} />
                          Suggest Sides
                          {recipeSides.length > 0 && (
                            <span className="ml-auto px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                              {recipeSides.length}
                            </span>
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (hasPro) {
                              setShowRecipeChat(true);
                              setShowMobileMenu(false);
                            } else {
                              setShowMobileMenu(false);
                              onUpgradeClick?.();
                            }
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${hasPro ? 'text-emerald-700 hover:bg-emerald-50' : 'text-slate-400'}`}
                        >
                          <Mic size={18} />
                          Cook Mode
                          {!hasPro && (
                            <span className="ml-auto inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full">
                              <Crown size={10} />
                              PRO
                            </span>
                          )}
                        </button>
                        {activeTab === 'uploaded' && openMeal.source === 'uploaded' && (
                          <button
                            onClick={() => { handleTogglePublic(openMeal); setShowMobileMenu(false); }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-left ${
                              openMeal.isPublic ? 'text-blue-700 hover:bg-blue-50' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {openMeal.isPublic ? <Globe size={18} /> : <Lock size={18} />}
                            {openMeal.isPublic ? 'Make Private' : 'Make Public'}
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Desktop Action buttons */}
                <div className="hidden md:flex items-center gap-2 flex-shrink-0">
                  {/* Print button */}
                  <button
                    onClick={() => setShowPrintView(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-slate-100 text-slate-600 hover:bg-slate-200"
                    title="Print or export as PDF"
                  >
                    <Printer size={14} />
                    Print
                  </button>

                  {/* Nutrition button */}
                  <button
                    onClick={() => setShowNutrition(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-green-100 text-green-700 hover:bg-green-200"
                    title="View nutritional information"
                  >
                    <Apple size={14} />
                    Nutrition
                  </button>

                  {/* Adjust recipe button - Pro only */}
                  <button
                    onClick={() => {
                      if (hasPro) {
                        setShowAdjuster(true);
                      } else {
                        onUpgradeClick?.();
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      hasPro
                        ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                    title={hasPro ? "Adjust servings, protein, or macros" : "Upgrade to Pro for AI Recipe Adjustments"}
                  >
                    <SlidersHorizontal size={14} />
                    Adjust
                    {!hasPro && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full">
                        <Crown size={10} />
                        PRO
                      </span>
                    )}
                  </button>

                  {/* Fit My Macros button - Pro only */}
                  <button
                    onClick={() => {
                      if (hasPro) {
                        handleFitMyMacros();
                      } else {
                        onUpgradeClick?.();
                      }
                    }}
                    disabled={isFittingMacros}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      hasPro
                        ? 'bg-teal-100 text-teal-700 hover:bg-teal-200'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                    title={
                      !hasPro
                        ? "Upgrade to Pro for Fit My Macros"
                        : isCustomMacros
                        ? "Adjust recipe to match your custom macro targets"
                        : "Adjust recipe to match recommended daily macros"
                    }
                  >
                    {isFittingMacros ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Target size={14} />
                    )}
                    {isFittingMacros ? 'Fitting...' : 'Fit My Macros'}
                    {!hasPro && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full">
                        <Crown size={10} />
                        PRO
                      </span>
                    )}
                  </button>

                  {/* Suggest Sides button */}
                  <button
                    onClick={() => setShowSidesModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-amber-100 text-amber-700 hover:bg-amber-200"
                    title="Get AI side dish suggestions"
                  >
                    <UtensilsCrossed size={14} />
                    Sides
                    {recipeSides.length > 0 && (
                      <span className="px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full">
                        {recipeSides.length}
                      </span>
                    )}
                  </button>

                  {/* Cooking Assistant button - Pro only */}
                  <button
                    onClick={() => {
                      if (hasPro) {
                        setShowRecipeChat(true);
                      } else {
                        onUpgradeClick?.();
                      }
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      hasPro
                        ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                        : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                    }`}
                    title={hasPro ? "Talk to cooking assistant" : "Upgrade to Pro to use Cook Mode"}
                  >
                    <Mic size={14} />
                    Cook Mode
                    {!hasPro && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full">
                        <Crown size={10} />
                        PRO
                      </span>
                    )}
                  </button>

                  {/* Public toggle for uploaded recipes */}
                  {activeTab === 'uploaded' && openMeal.source === 'uploaded' && (
                    <button
                      onClick={() => handleTogglePublic(openMeal)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        openMeal.isPublic
                          ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {openMeal.isPublic ? <Globe size={14} /> : <Lock size={14} />}
                      {openMeal.isPublic ? 'Public' : 'Private'}
                    </button>
                  )}
                </div>
              </div>

              <p className="text-sm md:text-base text-slate-600 italic mb-4 leading-relaxed">{openMeal.description}</p>

              {/* Video Section - Hidden until video API is configured */}
              {false && (openMeal.hasVideo || isAdmin) && (
                <div className="mb-6">
                  {loadingVideo ? (
                    <div className="bg-slate-100 rounded-xl p-8 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    </div>
                  ) : currentVideo ? (
                    <RecipeVideoPlayer
                      video={currentVideo}
                      hasPro={hasPro}
                      onUpgradeClick={onUpgradeClick}
                      isAdmin={isAdmin}
                      onRegenerate={async () => {
                        if (!openMeal.id) return;
                        setGeneratingVideo(true);
                        try {
                          await initiateVideoGeneration(openMeal.id, 'supabase');
                          const video = await getRecipeVideo(openMeal.id);
                          setCurrentVideo(video);
                        } catch (err) {
                          console.error('Error regenerating video:', err);
                        }
                        setGeneratingVideo(false);
                      }}
                      onDelete={async () => {
                        setCurrentVideo(null);
                        // Refresh the recipes to update hasVideo status
                        if (activeTab === 'generated') {
                          setGeneratedRecipes(prev => prev.map(r =>
                            r.id === openMeal.id ? { ...r, hasVideo: false, videoId: undefined } : r
                          ));
                        }
                      }}
                    />
                  ) : isAdmin && !generatingVideo ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
                      <Video className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-600 font-medium mb-2">No video for this recipe</p>
                      <p className="text-sm text-slate-500 mb-4">Generate an AI cooking video for this recipe</p>
                      <button
                        onClick={async () => {
                          if (!openMeal.id) return;
                          setGeneratingVideo(true);
                          try {
                            await initiateVideoGeneration(openMeal.id, 'supabase');
                            const video = await getRecipeVideo(openMeal.id);
                            setCurrentVideo(video);
                            // Update recipe in list
                            if (activeTab === 'generated') {
                              setGeneratedRecipes(prev => prev.map(r =>
                                r.id === openMeal.id ? { ...r, hasVideo: true, videoId: video?.id } : r
                              ));
                            }
                          } catch (err) {
                            console.error('Error generating video:', err);
                          }
                          setGeneratingVideo(false);
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors mx-auto"
                      >
                        <Play size={18} />
                        Generate Video
                      </button>
                    </div>
                  ) : generatingVideo ? (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                      <Loader2 className="w-10 h-10 animate-spin text-purple-500 mx-auto mb-3" />
                      <p className="text-slate-600 font-medium">Generating video...</p>
                      <p className="text-sm text-slate-500 mt-1">This may take a few minutes</p>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Owner name for public recipes */}
              {activeTab === 'public' && openMeal.ownerName && (
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-4">
                  <User size={14} />
                  Shared by {openMeal.ownerName}
                </div>
              )}

              {/* Tags */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-slate-700 flex items-center gap-1">
                    <Tag size={14} />
                    Tags
                  </h4>
                  {canEditTags(openMeal) && (
                    <button
                      onClick={() => setShowTagEditor(!showTagEditor)}
                      className="text-xs text-emerald-600 hover:text-emerald-700"
                    >
                      {showTagEditor ? 'Done' : 'Edit'}
                    </button>
                  )}
                </div>

                {showTagEditor && canEditTags(openMeal) ? (
                  <TagEditor
                    tags={openMeal.tags || []}
                    onChange={(newTags) => handleTagsChange(openMeal, newTags)}
                  />
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {openMeal.tags && openMeal.tags.length > 0 ? (
                      openMeal.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 text-sm bg-slate-100 text-slate-600 rounded-full"
                        >
                          {tag}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">No tags</span>
                    )}
                  </div>
                )}
              </div>

              {/* User Categories - only show for non-public recipes */}
              {activeTab !== 'public' && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      <FolderPlus size={14} />
                      My Categories
                    </h4>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Display selected categories */}
                    {openMealCategories.map(catId => {
                      const category = userCategories.find(c => c.id === catId);
                      if (!category) return null;
                      const colors = getCategoryColorClasses(category.color);
                      return (
                        <span
                          key={catId}
                          className={`inline-flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
                        >
                          {category.name}
                          <button
                            type="button"
                            onClick={() => handleCategoriesChange(openMeal.id, openMealCategories.filter(id => id !== catId))}
                            className="hover:bg-black/10 rounded-full p-0.5"
                          >
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                    {/* Add category button */}
                    <CategorySelector
                      categories={userCategories}
                      selectedCategoryIds={openMealCategories}
                      onChange={(ids) => handleCategoriesChange(openMeal.id, ids)}
                      onCreateCategory={handleCreateCategory}
                      compact={true}
                    />
                  </div>
                  {openMealCategories.length === 0 && userCategories.length === 0 && (
                    <p className="text-xs text-slate-400 mt-1">
                      Create categories to organize your recipes
                    </p>
                  )}
                </div>
              )}

              <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                {/* Ingredients */}
                <div className="bg-emerald-50/50 rounded-xl p-3 md:p-4">
                  <div className="flex items-center gap-2 mb-3 text-emerald-700 font-bold border-b border-emerald-200 pb-2">
                    <ChefHat size={18} />
                    <h3 className="text-base">Ingredients</h3>
                  </div>
                  <ul className="space-y-2">
                    {openMeal.ingredients.map((ing, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 flex-shrink-0" />
                        <span className="leading-relaxed">{ing}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
                <div className="bg-indigo-50/50 rounded-xl p-3 md:p-4">
                  <div className="flex items-center gap-2 mb-3 text-indigo-700 font-bold border-b border-indigo-200 pb-2">
                    <Clock size={18} />
                    <h3 className="text-base">Instructions</h3>
                  </div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                    {openMeal.instructions}
                  </div>
                </div>
              </div>

              {/* Saved Side Dishes Section */}
              {recipeSides.length > 0 && (
                <div className="mt-6 bg-amber-50/50 rounded-xl p-4 border border-amber-200">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-amber-800 flex items-center gap-2">
                      <UtensilsCrossed size={18} />
                      Side Dishes ({recipeSides.length})
                    </h3>
                    <button
                      onClick={() => setShowSidesModal(true)}
                      className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                    >
                      Edit
                    </button>
                  </div>
                  <div className="grid gap-3">
                    {recipeSides.map(side => (
                      <div key={side.id} className="bg-white rounded-lg p-3 border border-amber-100">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-slate-800">{side.name}</h4>
                            <p className="text-sm text-slate-600 mt-1">{side.description}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              {side.prepTime && (
                                <span className="text-xs text-slate-500 flex items-center gap-1">
                                  <Clock size={12} />
                                  {side.prepTime}
                                </span>
                              )}
                              <span className="text-xs text-slate-500">
                                {side.ingredients.length} ingredients
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Disclaimer for AI-generated or uploaded recipes */}
              {(openMeal.source === 'generated' || activeTab === 'generated') && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mt-4">
                  <p className="text-xs text-amber-700">
                    <strong>AI-Generated Recipe:</strong> This recipe was created by AI and may contain errors. Verify ingredients, cooking times, and temperatures. Check allergen information independently.
                  </p>
                </div>
              )}

              {/* Notes Section */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <RecipeNotesSection
                  mealId={openMeal.id}
                  isPublicRecipe={openMeal.isPublic}
                  canEdit={true}
                  onRatingChange={(average, count) => {
                    // Update the recipe's rating in local state
                    const updateRecipes = (prev: Meal[]) =>
                      prev.map(m => m.id === openMeal.id
                        ? { ...m, averageRating: average, ratingCount: count }
                        : m
                      );
                    if (activeTab === 'generated') setGeneratedRecipes(updateRecipes);
                    else if (activeTab === 'uploaded') setUploadedRecipes(updateRecipes);
                    else if (activeTab === 'public') setPublicRecipes(updateRecipes);

                    // Also update openMeal
                    setOpenMeal(prev => prev
                      ? { ...prev, averageRating: average, ratingCount: count }
                      : null
                    );
                  }}
                />
              </div>

              {/* Action buttons */}
              <div className="flex flex-wrap gap-3 mt-6 pt-4 border-t border-slate-100">
                {!(mealImages[openMeal.name] || openMeal.imageUrl) && !loadingImages[openMeal.name] && (
                  <button
                    onClick={() => handleGenerateImage(openMeal)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 font-medium transition-colors"
                  >
                    <ImageIcon size={16} />
                    Generate Image
                  </button>
                )}
                <button
                  onClick={(e) => { toggleSelect(e, openMeal.name); handleCloseMeal(); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedMeals.includes(openMeal.name)
                      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                  }`}
                >
                  <ShoppingCart size={16} />
                  {selectedMeals.includes(openMeal.name) ? 'Selected for List' : 'Add to Shopping List'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      <RecipeUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadComplete={() => {
          setActiveTab('uploaded');
          loadRecipes();
        }}
      />

      {/* Print View Modal */}
      {showPrintView && openMeal && (
        <RecipePrintView
          meal={{
            ...openMeal,
            imageUrl: mealImages[openMeal.name] || openMeal.imageUrl
          }}
          onClose={() => setShowPrintView(false)}
        />
      )}

      {/* Nutrition Info Modal */}
      {showNutrition && openMeal && (
        <NutritionInfo
          meal={openMeal}
          servings={openMeal.servings || 4}
          onClose={() => setShowNutrition(false)}
        />
      )}

      {/* Recipe Adjuster Modal */}
      {showAdjuster && openMeal && (
        <RecipeAdjuster
          meal={openMeal}
          onClose={() => setShowAdjuster(false)}
          onApply={handleApplyAdjustment}
          userName={userName}
          isPublicRecipe={activeTab === 'public' || openMeal.isPublic}
        />
      )}

      {/* Recipe Chat / Cook Mode Modal */}
      {showRecipeChat && openMeal && (
        <RecipeChatModal
          recipe={openMeal}
          isOpen={showRecipeChat}
          onClose={() => setShowRecipeChat(false)}
        />
      )}

      {/* Suggest Sides Modal */}
      {showSidesModal && openMeal && (
        <SuggestSidesModal
          isOpen={showSidesModal}
          onClose={() => setShowSidesModal(false)}
          meal={openMeal}
          onSidesUpdated={(sides) => setRecipeSides(sides)}
        />
      )}

      {/* Fit My Macros Preview Modal */}
      {showFitPreview && fittedRecipePreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-teal-50 to-emerald-50">
              <div className="flex items-center gap-2">
                <Target size={20} className="text-teal-600" />
                <h2 className="text-lg font-bold text-slate-800">Recipe Adjusted to Your Macros</h2>
              </div>
              <button
                onClick={handleCancelFitPreview}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* Adjustment Notes */}
              {fittedRecipePreview.adjustmentNotes && (
                <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
                  <p className="text-sm text-teal-700">
                    <strong>Changes made:</strong> {fittedRecipePreview.adjustmentNotes}
                  </p>
                </div>
              )}

              {/* Recipe Name Input */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Save as new recipe named:
                </label>
                <input
                  type="text"
                  value={fittedRecipeName}
                  onChange={(e) => setFittedRecipeName(e.target.value)}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                  placeholder="Enter recipe name..."
                />
                <p className="text-xs text-slate-500 mt-1">
                  The original recipe will not be modified.
                </p>
              </div>

              {/* Preview Details */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <ChefHat size={16} className="text-slate-400" />
                  <span>Servings: <strong>{fittedRecipePreview.servings}</strong></span>
                </div>

                {/* Ingredients Preview */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Ingredients:</h4>
                  <ul className="bg-slate-50 rounded-lg p-3 space-y-1 max-h-40 overflow-y-auto">
                    {fittedRecipePreview.ingredients.slice(0, 8).map((ing, idx) => (
                      <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-teal-500 mt-1">•</span>
                        <span>{ing}</span>
                      </li>
                    ))}
                    {fittedRecipePreview.ingredients.length > 8 && (
                      <li className="text-sm text-slate-400 italic">
                        ...and {fittedRecipePreview.ingredients.length - 8} more ingredients
                      </li>
                    )}
                  </ul>
                </div>

                {/* Instructions Preview */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 mb-2">Instructions:</h4>
                  <div className="bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <p className="text-sm text-slate-600 whitespace-pre-wrap line-clamp-6">
                      {fittedRecipePreview.instructions}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-slate-100 p-4 bg-slate-50 flex gap-3">
              <button
                onClick={handleCancelFitPreview}
                className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFittedRecipe}
                disabled={isSavingFitted || !fittedRecipeName.trim()}
                className="flex-1 py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSavingFitted ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Heart size={18} />
                    Save to Cookbook
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FavoritesView;
