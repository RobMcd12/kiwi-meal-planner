import React, { useState, useEffect } from 'react';
import { Meal } from '../types';
import { getFavoriteMeals, removeFavoriteMeal, getCachedImage, cacheImage } from '../services/storageService';
import { generateDishImage } from '../services/geminiService';
import { Trash2, Heart, ShoppingCart, ArrowLeft, X, ChefHat, Clock, Image as ImageIcon, Loader2 } from 'lucide-react';

interface FavoritesViewProps {
  onBack: () => void;
  onGenerateList: (meals: Meal[]) => void;
  isLoading: boolean;
}

const FavoritesView: React.FC<FavoritesViewProps> = ({ onBack, onGenerateList, isLoading }) => {
  const [favorites, setFavorites] = useState<Meal[]>([]);
  const [selectedMeals, setSelectedMeals] = useState<string[]>([]);
  const [openMeal, setOpenMeal] = useState<Meal | null>(null);
  const [mealImages, setMealImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const loadFavorites = async () => {
      const meals = await getFavoriteMeals();
      setFavorites(meals);

      // Load cached images for all favorites
      for (const meal of meals) {
        const cached = await getCachedImage(meal.name);
        if (cached) {
          setMealImages(prev => ({ ...prev, [meal.name]: cached }));
        }
      }
    };
    loadFavorites();
  }, []);

  const handleDelete = async (name: string) => {
    await removeFavoriteMeal(name);
    const meals = await getFavoriteMeals();
    setFavorites(meals);
    setSelectedMeals(prev => prev.filter(n => n !== name));
    if (openMeal?.name === name) {
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
  };

  const handleCloseMeal = () => {
    setOpenMeal(null);
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

  const handleGenerate = () => {
    const mealsToProcess = favorites.filter(f => selectedMeals.includes(f.name));
    onGenerateList(mealsToProcess);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20 animate-fadeIn">
      <div className="flex items-center gap-4 mb-8">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <h2 className="text-2xl font-bold text-slate-800">My Cookbook</h2>
      </div>

      {favorites.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
            <Heart size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-lg font-medium text-slate-600">No favorites yet</h3>
            <p className="text-slate-400">Rate meals in your weekly plan to save them here.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4 mb-24">
          {favorites.map((meal) => {
            const hasImage = !!mealImages[meal.name];
            return (
              <div
                  key={meal.name}
                  className={`border rounded-xl overflow-hidden transition-all cursor-pointer ${
                      selectedMeals.includes(meal.name)
                      ? 'border-indigo-500 bg-indigo-50 shadow-sm'
                      : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md'
                  }`}
                  onClick={() => handleOpenMeal(meal)}
              >
                {/* Thumbnail image if available */}
                {hasImage && (
                  <div className="h-32 overflow-hidden">
                    <img
                      src={mealImages[meal.name]}
                      alt={meal.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                        <div
                          className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 ${selectedMeals.includes(meal.name) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'}`}
                          onClick={(e) => toggleSelect(e, meal.name)}
                        >
                            {selectedMeals.includes(meal.name) && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                        <h3 className="font-bold text-slate-800">{meal.name}</h3>
                    </div>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDelete(meal.name); }}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-2 pl-7">{meal.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Recipe Card Modal */}
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
              {mealImages[openMeal.name] ? (
                <div className="h-48 md:h-64 overflow-hidden rounded-t-2xl">
                  <img
                    src={mealImages[openMeal.name]}
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
            </div>

            {/* Content */}
            <div className="p-6">
              <h2 className="text-2xl font-bold text-slate-800 mb-2">{openMeal.name}</h2>
              <p className="text-slate-600 italic mb-6">{openMeal.description}</p>

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

              {/* Action buttons */}
              <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
                {!mealImages[openMeal.name] && !loadingImages[openMeal.name] && (
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

      {favorites.length > 0 && (
          <div className="fixed bottom-6 left-0 right-0 flex justify-center px-4 z-20">
            <button
                onClick={handleGenerate}
                disabled={selectedMeals.length === 0 || isLoading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white px-8 py-4 rounded-full shadow-xl font-bold text-lg flex items-center gap-3 transition-transform active:scale-95"
            >
                {isLoading ? (
                    <>Generating...</>
                ) : (
                    <>
                        <ShoppingCart size={20} />
                        Create List ({selectedMeals.length})
                    </>
                )}
            </button>
          </div>
      )}
    </div>
  );
};

export default FavoritesView;
