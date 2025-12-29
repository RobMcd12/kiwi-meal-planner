import React, { useState, useEffect, useMemo } from 'react';
import { Meal, CookbookTab } from '../types';
import { getFavoriteMeals, removeFavoriteMeal, getCachedImage, cacheImage } from '../services/storageService';
import { generateDishImage, TAG_CATEGORIES } from '../services/geminiService';
import {
  getUserUploadedRecipes,
  getUserGeneratedRecipes,
  getPublicRecipes,
  searchRecipes,
  toggleRecipePublic,
  assignTagsToRecipe
} from '../services/recipeService';
import { useUpload } from '../contexts/UploadContext';
import RecipeUploadModal from './RecipeUploadModal';
import RecipeNotesSection from './RecipeNotesSection';
import TagEditor from './TagEditor';
import {
  Trash2, Heart, ShoppingCart, ArrowLeft, X, ChefHat, Clock,
  Image as ImageIcon, Loader2, Search, Grid, List, Plus, Upload,
  Globe, Lock, Tag, User, Sparkles, FileText
} from 'lucide-react';

interface FavoritesViewProps {
  onBack: () => void;
  onGenerateList: (meals: Meal[]) => void;
  isLoading: boolean;
  isAdmin?: boolean;
}

type ViewMode = 'cards' | 'list';

const FavoritesView: React.FC<FavoritesViewProps> = ({ onBack, onGenerateList, isLoading, isAdmin = false }) => {
  // Tab and view state
  const [activeTab, setActiveTab] = useState<CookbookTab>('generated');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');

  // Recipe data
  const [generatedRecipes, setGeneratedRecipes] = useState<Meal[]>([]);
  const [uploadedRecipes, setUploadedRecipes] = useState<Meal[]>([]);
  const [publicRecipes, setPublicRecipes] = useState<Meal[]>([]);

  // Search and filter
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // Selection and modal state
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [openMeal, setOpenMeal] = useState<Meal | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showTagEditor, setShowTagEditor] = useState(false);

  // Images
  const [mealImages, setMealImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});

  // Loading state
  const [isLoadingRecipes, setIsLoadingRecipes] = useState(true);

  // Upload context
  const { uploads, hasActiveUploads } = useUpload();

  // All available tags for filtering
  const allTags = useMemo(() => [
    ...TAG_CATEGORIES.cuisine,
    ...TAG_CATEGORIES.dietary,
    ...TAG_CATEGORIES.mealType,
    ...TAG_CATEGORIES.other
  ], []);

  // Load recipes based on active tab
  useEffect(() => {
    loadRecipes();
  }, [activeTab]);

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
      if (activeTab === 'generated') {
        const recipes = await getUserGeneratedRecipes();
        // Fallback to local storage if no Supabase data
        if (recipes.length === 0) {
          const localFavorites = await getFavoriteMeals();
          setGeneratedRecipes(localFavorites.filter(m => m.source !== 'uploaded'));
        } else {
          setGeneratedRecipes(recipes);
        }
      } else if (activeTab === 'uploaded') {
        const recipes = await getUserUploadedRecipes();
        setUploadedRecipes(recipes);
      } else if (activeTab === 'public') {
        const recipes = await getPublicRecipes();
        setPublicRecipes(recipes);
      }

      // Load cached images
      const recipes = activeTab === 'generated' ? generatedRecipes :
                      activeTab === 'uploaded' ? uploadedRecipes : publicRecipes;
      for (const meal of recipes) {
        const cached = await getCachedImage(meal.name);
        if (cached) {
          setMealImages(prev => ({ ...prev, [meal.name]: cached }));
        }
      }
    } catch (err) {
      console.error('Error loading recipes:', err);
    } finally {
      setIsLoadingRecipes(false);
    }
  };

  // Get current recipes based on tab
  const currentRecipes = useMemo(() => {
    let recipes: Meal[] = [];
    if (activeTab === 'generated') recipes = generatedRecipes;
    else if (activeTab === 'uploaded') recipes = uploadedRecipes;
    else if (activeTab === 'public') recipes = publicRecipes;

    // Apply search and tag filters
    return searchRecipes(recipes, searchQuery, selectedTags);
  }, [activeTab, generatedRecipes, uploadedRecipes, publicRecipes, searchQuery, selectedTags]);

  // Get unique tags from current recipes for filter pills
  const availableTags = useMemo(() => {
    const tagSet = new Set<string>();
    currentRecipes.forEach(r => r.tags?.forEach(t => tagSet.add(t)));
    return Array.from(tagSet).sort();
  }, [currentRecipes]);

  const handleDelete = async (id: string, name: string) => {
    await removeFavoriteMeal(name);
    if (activeTab === 'generated') {
      setGeneratedRecipes(prev => prev.filter(m => m.id !== id));
    } else if (activeTab === 'uploaded') {
      setUploadedRecipes(prev => prev.filter(m => m.id !== id));
    }
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

  const handleOpenMeal = (meal: Meal) => {
    setOpenMeal(meal);
    setShowTagEditor(false);
  };

  const handleCloseMeal = () => {
    setOpenMeal(null);
    setShowTagEditor(false);
  };

  const handleGenerateImage = async (meal: Meal) => {
    if (loadingImages[meal.name]) return;

    setLoadingImages(prev => ({ ...prev, [meal.name]: true }));
    try {
      const imageData = await generateDishImage(meal.name, meal.description);
      if (imageData) {
        setMealImages(prev => ({ ...prev, [meal.name]: imageData }));
        await cacheImage(meal.name, meal.description, imageData);
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
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
    <div className="max-w-5xl mx-auto px-4 pb-20 animate-fadeIn">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-slate-600" />
          </button>
          <h2 className="text-2xl font-bold text-slate-800">My Cookbook</h2>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
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
      <div className="relative mb-4">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search recipes..."
          className="w-full pl-11 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
        />
        {searchQuery && searchQuery.length < 3 && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
            Type {3 - searchQuery.length} more...
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab('generated')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-colors ${
            activeTab === 'generated'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Sparkles size={16} />
          AI Generated
          {generatedRecipes.length > 0 && (
            <span className={`px-1.5 py-0.5 text-xs rounded-full ${
              activeTab === 'generated' ? 'bg-white/20' : 'bg-slate-200'
            }`}>
              {generatedRecipes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('uploaded')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-colors ${
            activeTab === 'uploaded'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Upload size={16} />
          My Uploads
          {uploadedRecipes.length > 0 && (
            <span className={`px-1.5 py-0.5 text-xs rounded-full ${
              activeTab === 'uploaded' ? 'bg-white/20' : 'bg-slate-200'
            }`}>
              {uploadedRecipes.length}
            </span>
          )}
          {hasActiveUploads && (
            <Loader2 size={14} className="animate-spin" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('public')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-colors ${
            activeTab === 'public'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Globe size={16} />
          Public Recipes
          {publicRecipes.length > 0 && (
            <span className={`px-1.5 py-0.5 text-xs rounded-full ${
              activeTab === 'public' ? 'bg-white/20' : 'bg-slate-200'
            }`}>
              {publicRecipes.length}
            </span>
          )}
        </button>
      </div>

      {/* Tag Filter Pills */}
      {availableTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-6">
          <span className="flex items-center gap-1 text-sm text-slate-500">
            <Tag size={14} />
            Filter:
          </span>
          {availableTags.slice(0, 10).map(tag => (
            <button
              key={tag}
              onClick={() => toggleTagFilter(tag)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-emerald-300'
              }`}
            >
              {tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button
              onClick={() => setSelectedTags([])}
              className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded-full"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {isLoadingRecipes ? (
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
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <Plus size={18} />
                Upload Recipe
              </button>
            </>
          ) : activeTab === 'public' ? (
            <>
              <Globe size={48} className="mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">No public recipes yet</h3>
              <p className="text-slate-400">Recipes shared by other users will appear here.</p>
            </>
          ) : (
            <>
              <Heart size={48} className="mx-auto text-slate-200 mb-4" />
              <h3 className="text-lg font-medium text-slate-600">No favorites yet</h3>
              <p className="text-slate-400">Rate meals in your weekly plan to save them here.</p>
            </>
          )}
        </div>
      ) : viewMode === 'cards' ? (
        /* Cards View */
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-24">
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
                    {activeTab !== 'public' && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(meal.id, meal.name); }}
                        className="text-slate-400 hover:text-red-500 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2 pl-7 mb-2">{meal.description}</p>

                  {/* Tags */}
                  {meal.tags && meal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 pl-7">
                      {meal.tags.slice(0, 3).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                      {meal.tags.length > 3 && (
                        <span className="px-2 py-0.5 text-xs text-slate-400">
                          +{meal.tags.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="space-y-2 mb-24">
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
                  </div>
                  <h3 className="font-bold text-slate-800 truncate">{meal.name}</h3>
                  <p className="text-sm text-slate-600 line-clamp-1">{meal.description}</p>
                  {meal.tags && meal.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {meal.tags.slice(0, 4).map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded-full"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
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
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={handleCloseMeal}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Section */}
            <div className="relative">
              {(mealImages[openMeal.name] || openMeal.imageUrl) ? (
                <div className="h-48 md:h-64 overflow-hidden rounded-t-2xl">
                  <img
                    src={mealImages[openMeal.name] || openMeal.imageUrl}
                    alt={openMeal.name}
                    className="w-full h-full object-cover"
                  />
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
            <div className="p-6">
              <div className="flex items-start justify-between gap-4 mb-2">
                <h2 className="text-2xl font-bold text-slate-800">{openMeal.name}</h2>

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

              <p className="text-slate-600 italic mb-4">{openMeal.description}</p>

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

              <div className="grid md:grid-cols-2 gap-6">
                {/* Ingredients */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-emerald-700 font-bold border-b border-emerald-100 pb-2">
                    <ChefHat size={18} />
                    <h3>Ingredients</h3>
                  </div>
                  <ul className="space-y-2">
                    {openMeal.ingredients.map((ing, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                        <span>{ing}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Instructions */}
                <div>
                  <div className="flex items-center gap-2 mb-3 text-indigo-700 font-bold border-b border-indigo-100 pb-2">
                    <Clock size={18} />
                    <h3>Instructions</h3>
                  </div>
                  <div className="text-sm text-slate-700 whitespace-pre-wrap">
                    {openMeal.instructions}
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              <div className="mt-6 pt-6 border-t border-slate-100">
                <RecipeNotesSection
                  mealId={openMeal.id}
                  isPublicRecipe={openMeal.isPublic}
                  canEdit={activeTab !== 'public' || openMeal.isPublic}
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

      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center gap-4 px-4 z-20">
        {/* Upload Button */}
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-full shadow-xl transition-transform active:scale-95"
          title="Upload Recipe"
        >
          <Plus size={24} />
        </button>

        {/* Generate Shopping List Button */}
        {(generatedRecipes.length > 0 || uploadedRecipes.length > 0) && (
          <button
            onClick={handleGenerate}
            disabled={selectedMeals.length === 0 || isLoading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-6 py-4 rounded-full shadow-xl font-bold flex items-center gap-3 transition-transform active:scale-95"
          >
            {isLoading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <ShoppingCart size={20} />
                Create List ({selectedMeals.length})
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default FavoritesView;
