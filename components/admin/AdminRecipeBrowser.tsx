import React, { useState, useEffect } from 'react';
import { Search, ChefHat, Video, Play, Loader2, RefreshCw, User, Check, X, Clock, AlertCircle, ChevronDown, Filter } from 'lucide-react';
import { getAllRecipes, type AdminRecipe } from '../../services/adminService';
import { initiateVideoGeneration, getRecipeVideo } from '../../services/recipeVideoService';
import type { VideoStorageType, RecipeVideo } from '../../types';

interface AdminRecipeBrowserProps {
  onVideoGenerated?: () => void;
}

const AdminRecipeBrowser: React.FC<AdminRecipeBrowserProps> = ({ onVideoGenerated }) => {
  const [recipes, setRecipes] = useState<AdminRecipe[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [videoFilter, setVideoFilter] = useState<'all' | 'with_video' | 'without_video'>('all');
  const [generatingIds, setGeneratingIds] = useState<Set<string>>(new Set());
  const [selectedStorageType, setSelectedStorageType] = useState<VideoStorageType>('supabase');
  const [error, setError] = useState<string | null>(null);
  const [displayLimit, setDisplayLimit] = useState(20);

  useEffect(() => {
    loadRecipes();
  }, []);

  const loadRecipes = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const allRecipes = await getAllRecipes();
      setRecipes(allRecipes);
    } catch (err) {
      setError('Failed to load recipes');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateVideo = async (recipeId: string) => {
    setGeneratingIds(prev => new Set(prev).add(recipeId));
    setError(null);

    try {
      await initiateVideoGeneration(recipeId, selectedStorageType);
      // Refresh recipes to show new video status
      await loadRecipes();
      onVideoGenerated?.();
    } catch (err: any) {
      setError(err.message || 'Failed to generate video');
    } finally {
      setGeneratingIds(prev => {
        const next = new Set(prev);
        next.delete(recipeId);
        return next;
      });
    }
  };

  const getVideoStatusBadge = (recipe: AdminRecipe) => {
    if (!recipe.hasVideo) return null;

    switch (recipe.videoStatus) {
      case 'complete':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
            <Check size={12} />
            Video Ready
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            <X size={12} />
            Failed
          </span>
        );
      case 'generating':
      case 'uploading':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            <Loader2 size={12} className="animate-spin" />
            Processing
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <Clock size={12} />
            Pending
          </span>
        );
      default:
        return null;
    }
  };

  // Filter recipes
  const filteredRecipes = recipes.filter(recipe => {
    const matchesSearch = !searchQuery ||
      recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.userEmail?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.userName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesVideoFilter =
      videoFilter === 'all' ||
      (videoFilter === 'with_video' && recipe.hasVideo) ||
      (videoFilter === 'without_video' && !recipe.hasVideo);

    return matchesSearch && matchesVideoFilter;
  });

  const displayedRecipes = filteredRecipes.slice(0, displayLimit);

  // Stats
  const totalRecipes = recipes.length;
  const recipesWithVideo = recipes.filter(r => r.hasVideo).length;
  const recipesWithoutVideo = recipes.filter(r => !r.hasVideo).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-slate-600">{totalRecipes}</p>
          <p className="text-sm text-slate-500">Total Recipes</p>
        </div>
        <div className="bg-purple-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{recipesWithVideo}</p>
          <p className="text-sm text-purple-700">With Video</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{recipesWithoutVideo}</p>
          <p className="text-sm text-amber-700">No Video</p>
        </div>
      </div>

      {/* Storage Type Selection */}
      <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
        <span className="text-sm font-medium text-slate-700">Default Storage:</span>
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedStorageType('supabase')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedStorageType === 'supabase'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Supabase Storage
          </button>
          <button
            onClick={() => setSelectedStorageType('google_drive')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              selectedStorageType === 'google_drive'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            Google Drive
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-700">Error</p>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by recipe name or user..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
          />
        </div>

        {/* Video Filter */}
        <div className="relative">
          <select
            value={videoFilter}
            onChange={(e) => setVideoFilter(e.target.value as 'all' | 'with_video' | 'without_video')}
            className="appearance-none pl-4 pr-10 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
          >
            <option value="all">All Recipes</option>
            <option value="with_video">With Video</option>
            <option value="without_video">Without Video</option>
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Refresh */}
        <button
          onClick={loadRecipes}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Recipe List */}
      {filteredRecipes.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <ChefHat size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">No recipes found</p>
          <p className="text-sm text-slate-400 mt-1">
            {searchQuery ? 'Try adjusting your search' : 'No recipes have been created yet'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedRecipes.map(recipe => (
            <div
              key={recipe.id}
              className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-slate-300 transition-colors"
            >
              {/* Thumbnail */}
              <div className="w-16 h-16 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                {recipe.imageUrl ? (
                  <img
                    src={recipe.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ChefHat size={24} className="text-slate-400" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-slate-800 truncate">{recipe.name}</p>
                  {getVideoStatusBadge(recipe)}
                  {recipe.isPublic && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                      Public
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm text-slate-500">
                  <User size={14} />
                  <span className="truncate">
                    {recipe.userName || recipe.userEmail || 'Unknown User'}
                  </span>
                </div>
                {recipe.description && (
                  <p className="text-sm text-slate-400 mt-1 line-clamp-1">
                    {recipe.description}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {!recipe.hasVideo ? (
                  <button
                    onClick={() => handleGenerateVideo(recipe.id)}
                    disabled={generatingIds.has(recipe.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {generatingIds.has(recipe.id) ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span className="hidden sm:inline">Generating...</span>
                      </>
                    ) : (
                      <>
                        <Video size={16} />
                        <span className="hidden sm:inline">Generate Video</span>
                      </>
                    )}
                  </button>
                ) : recipe.videoStatus === 'complete' ? (
                  <span className="flex items-center gap-1 text-emerald-600 text-sm">
                    <Play size={16} />
                    <span className="hidden sm:inline">Video Available</span>
                  </span>
                ) : recipe.videoStatus === 'failed' ? (
                  <button
                    onClick={() => handleGenerateVideo(recipe.id)}
                    disabled={generatingIds.has(recipe.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    {generatingIds.has(recipe.id) ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                    <span className="hidden sm:inline">Retry</span>
                  </button>
                ) : (
                  <span className="flex items-center gap-2 text-blue-600 text-sm">
                    <Loader2 size={16} className="animate-spin" />
                    <span className="hidden sm:inline">Processing...</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More */}
      {filteredRecipes.length > displayLimit && (
        <div className="text-center">
          <button
            onClick={() => setDisplayLimit(prev => prev + 20)}
            className="px-6 py-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium"
          >
            Load More ({filteredRecipes.length - displayLimit} remaining)
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminRecipeBrowser;
