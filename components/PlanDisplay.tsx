import React, { useState, useEffect } from 'react';
import { MealPlanResponse, Meal } from '../types';
import { Calendar, ShoppingCart, ChevronDown, ChevronUp, ExternalLink, Check, RefreshCw, Heart, Loader2, Clock, ChefHat, Image as ImageIcon, Share, LayoutGrid, List, Save, CheckCircle, X } from 'lucide-react';
import { saveFavoriteMeal, removeFavoriteMeal, getFavoriteMeals, saveCheckedItems, loadCheckedItems, getCachedImage, cacheImage, saveMealPlan } from '../services/storageService';
import { generateDishImage } from '../services/geminiService';

interface PlanDisplayProps {
  data: MealPlanResponse;
  onReset: () => void;
}

const PlanDisplay: React.FC<PlanDisplayProps> = ({ data, onReset }) => {
  const [activeTab, setActiveTab] = useState<'plan' | 'shop'>('plan');
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null);
  const [allExpanded, setAllExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isNewWorldLoading, setIsNewWorldLoading] = useState(false);

  // Image State
  const [mealImages, setMealImages] = useState<Record<string, string>>({});
  const [loadingImages, setLoadingImages] = useState<Record<string, boolean>>({});

  // Save Plan State
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [planName, setPlanName] = useState('');
  const [isSavingPlan, setIsSavingPlan] = useState(false);
  const [planSaved, setPlanSaved] = useState(false);

  // Check if we have only one meal type per day (single meal mode)
  const isSingleMealMode = data.weeklyPlan.every(day => {
    const mealCount = [day.meals?.breakfast, day.meals?.lunch, day.meals?.dinner].filter(Boolean).length;
    return mealCount <= 1;
  });

  // Auto-expand all days on load when in single meal mode
  useEffect(() => {
    if (isSingleMealMode) {
      const allDays = new Set(data.weeklyPlan.map(d => d.day));
      setExpandedDays(allDays);
      setAllExpanded(true);
    } else {
      // Default: expand first day only
      if (data.weeklyPlan[0]?.day) {
        setExpandedDays(new Set([data.weeklyPlan[0].day]));
      }
    }
  }, [data.weeklyPlan, isSingleMealMode]);

  // Get all meals flattened for card view in single meal mode
  const getAllMeals = () => {
    const meals: { day: string; type: string; meal: Meal }[] = [];
    data.weeklyPlan.forEach(dayPlan => {
      if (dayPlan.meals?.breakfast) meals.push({ day: dayPlan.day, type: 'Breakfast', meal: dayPlan.meals.breakfast });
      if (dayPlan.meals?.lunch) meals.push({ day: dayPlan.day, type: 'Lunch', meal: dayPlan.meals.lunch });
      if (dayPlan.meals?.dinner) meals.push({ day: dayPlan.day, type: 'Dinner', meal: dayPlan.meals.dinner });
    });
    return meals;
  };

  // Load favorites and checked items on mount
  useEffect(() => {
    const loadData = async () => {
      const favs = await getFavoriteMeals();
      setFavorites(favs.map(m => m.name));

      const checked = await loadCheckedItems(data.id || null);
      setCheckedItems(checked);
    };
    loadData();
  }, [data.id]);

  // Persist checked items when they change
  useEffect(() => {
    if (Object.keys(checkedItems).length > 0) {
      saveCheckedItems(data.id || null, checkedItems);
    }
  }, [checkedItems, data.id]);

  const toggleDay = (day: string) => {
    setExpandedDays(prev => {
      const newSet = new Set(prev);
      if (newSet.has(day)) {
        newSet.delete(day);
      } else {
        newSet.add(day);
      }
      // Update allExpanded state based on whether all days are expanded
      setAllExpanded(newSet.size === data.weeklyPlan.length);
      return newSet;
    });
    setExpandedMeal(null); // Close expanded meals when switching days
  };

  const toggleAllDays = () => {
    if (allExpanded) {
      // Collapse all
      setExpandedDays(new Set());
      setAllExpanded(false);
    } else {
      // Expand all
      const allDays = new Set(data.weeklyPlan.map(d => d.day));
      setExpandedDays(allDays);
      setAllExpanded(true);
    }
    setExpandedMeal(null);
  };

  const toggleItem = (category: string, itemIdx: number) => {
    const key = `${category}-${itemIdx}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleFavorite = async (meal: Meal) => {
    if (favorites.includes(meal.name)) {
      await removeFavoriteMeal(meal.id);
      setFavorites(prev => prev.filter(n => n !== meal.name));
    } else {
      await saveFavoriteMeal(meal);
      setFavorites(prev => [...prev, meal.name]);
    }
  };

  const toggleMealDetails = async (meal: Meal, mealKey: string) => {
    const uniqueKey = `${mealKey}-${meal.name}`;
    const isExpanding = expandedMeal !== uniqueKey;

    setExpandedMeal(isExpanding ? uniqueKey : null);

    // If expanding and no image exists, try cache first then generate
    if (isExpanding && !mealImages[meal.name] && !loadingImages[meal.name]) {
      setLoadingImages(prev => ({ ...prev, [meal.name]: true }));
      try {
        // Check cache first
        const cachedImage = await getCachedImage(meal.name);
        if (cachedImage) {
          setMealImages(prev => ({ ...prev, [meal.name]: cachedImage }));
        } else {
          // Generate new image
          const imageBase64 = await generateDishImage(meal.name, meal.description);
          if (imageBase64) {
            setMealImages(prev => ({ ...prev, [meal.name]: imageBase64 }));
            // Cache the image for future use
            await cacheImage(meal.name, meal.description, imageBase64);
          }
        }
      } catch (error) {
        console.error("Error generating image:", error);
      } finally {
        setLoadingImages(prev => ({ ...prev, [meal.name]: false }));
      }
    }
  };

  const generateListText = () => {
    const itemsToBuy: string[] = [];
    data.shoppingList.forEach(category => {
        const categoryItems: string[] = [];
        category.items.forEach((item, idx) => {
            const key = `${category.categoryName}-${idx}`;
            if (!checkedItems[key]) {
                categoryItems.push(`- [ ] ${item.quantity} ${item.unit} ${item.name}`);
            }
        });
        if (categoryItems.length > 0) {
            itemsToBuy.push(`\n${category.categoryName.toUpperCase()}:`);
            itemsToBuy.push(...categoryItems);
        }
    });
    return itemsToBuy.join('\n');
  };

  const handleShare = async () => {
    const text = generateListText();
    if (!text.trim()) {
      alert("All items are checked off!");
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Kiwi Meal Planner Shopping List',
          text: text,
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      navigator.clipboard.writeText(text);
      alert("List copied to clipboard (Share not supported on this device)");
    }
  };

  const handleSavePlan = async () => {
    if (!planName.trim()) return;

    setIsSavingPlan(true);
    try {
      await saveMealPlan(data, planName.trim());
      setPlanSaved(true);
      setTimeout(() => {
        setShowSaveModal(false);
        setPlanName('');
        setTimeout(() => setPlanSaved(false), 300);
      }, 1500);
    } catch (error) {
      console.error('Error saving plan:', error);
    } finally {
      setIsSavingPlan(false);
    }
  };

  const getDefaultPlanName = () => {
    const days = data.weeklyPlan.map(d => d.day).join(', ');
    const date = new Date().toLocaleDateString('en-NZ', { month: 'short', day: 'numeric' });
    return `Meal Plan - ${date}`;
  };

  const handleNewWorldIntegration = () => {
    setIsNewWorldLoading(true);
    
    // Collect only unchecked items to "buy"
    const itemsToBuy: string[] = [];
    data.shoppingList.forEach(category => {
        category.items.forEach((item, idx) => {
            const key = `${category.categoryName}-${idx}`;
            // If NOT checked, we need to buy it
            if (!checkedItems[key]) {
                itemsToBuy.push(item.name);
            }
        });
    });

    if (itemsToBuy.length === 0) {
        setIsNewWorldLoading(false);
        alert("All items are checked off! Nothing to add to cart.");
        return;
    }

    const listText = itemsToBuy.join('\n');

    setTimeout(() => {
        setIsNewWorldLoading(false);
        navigator.clipboard.writeText(listText).then(() => {
            const proceed = window.confirm(
                `${itemsToBuy.length} items copied to clipboard!\n\n` +
                "Your shopping list is ready.\n\n" +
                "Click OK to open your preferred online store and paste the list to quickly add items to your cart."
            );

            if (proceed) {
                window.open("https://www.countdown.co.nz", "_blank");
            }
        }).catch(err => {
            console.error('Failed to copy', err);
            window.open("https://www.countdown.co.nz", "_blank");
        });
    }, 1000);
  };

  const renderMealCard = (type: string, meal?: Meal, dayLabel?: string) => {
    if (!meal) return null;
    const isFav = favorites.includes(meal.name);

    // Determine color scheme based on meal type
    let colors = { bg: 'bg-slate-50', border: 'border-slate-100', text: 'text-slate-600', icon: 'text-slate-400' };
    if (type.toLowerCase() === 'breakfast') colors = { bg: 'bg-orange-50', border: 'border-orange-100', text: 'text-orange-600', icon: 'text-orange-400' };
    if (type.toLowerCase() === 'lunch') colors = { bg: 'bg-blue-50', border: 'border-blue-100', text: 'text-blue-600', icon: 'text-blue-400' };
    if (type.toLowerCase() === 'dinner') colors = { bg: 'bg-indigo-50', border: 'border-indigo-100', text: 'text-indigo-600', icon: 'text-indigo-400' };

    const uniqueKey = `${dayLabel || ''}-${type}-${meal.name}`;
    const isExpanded = expandedMeal === uniqueKey;
    const imageUrl = mealImages[meal.name];
    const isLoading = loadingImages[meal.name];

    return (
        <div
          key={uniqueKey}
          className={`
            ${colors.bg} ${colors.border} rounded-xl border relative transition-all duration-300 overflow-hidden
            ${isExpanded ? 'col-span-1 md:col-span-2 lg:col-span-3 shadow-lg ring-1 ring-black/5' : 'hover:shadow-md cursor-pointer'}
          `}
          onClick={() => !isExpanded && toggleMealDetails(meal, `${dayLabel || ''}-${type}`)}
        >
            {/* Card Header (Always Visible) */}
            <div className="p-5">
              <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    {dayLabel && <span className="text-xs font-semibold text-slate-500 mb-0.5">{dayLabel}</span>}
                    <span className={`text-xs font-bold uppercase tracking-wide opacity-80 ${colors.text}`}>{type}</span>
                  </div>
                  <div className="flex gap-2">
                    {isExpanded && (
                      <button 
                        onClick={(e) => { e.stopPropagation(); toggleMealDetails(meal, type); }}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <ChevronUp size={18} />
                      </button>
                    )}
                    <button 
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(meal); }}
                        className={`transition-colors p-1 rounded-full relative z-10 ${isFav ? 'text-rose-500 bg-white shadow-sm' : 'text-slate-400 hover:text-rose-400'}`}
                        title={isFav ? "Remove from favorites" : "Save as favorite"}
                    >
                        <Heart size={18} fill={isFav ? "currentColor" : "none"} />
                    </button>
                  </div>
              </div>
              <h4 className="font-bold text-slate-800 mt-1 text-lg leading-tight">{meal.name}</h4>
              <p className={`text-sm text-slate-600 mt-2 italic ${isExpanded ? '' : 'line-clamp-2'}`}>{meal.description}</p>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
              <div className="border-t border-black/5 bg-white/50 animate-fadeIn">
                {/* Image Section */}
                <div className="relative h-48 sm:h-64 bg-slate-100 w-full">
                   {imageUrl ? (
                     <img src={imageUrl} alt={meal.name} className="w-full h-full object-cover" />
                   ) : (
                     <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
                       {isLoading ? (
                         <>
                           <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-2" />
                           <span className="text-xs font-medium">Preparing visual...</span>
                         </>
                       ) : (
                         <div className="flex flex-col items-center">
                            <ImageIcon size={32} className="opacity-20 mb-2" />
                            <span className="text-xs opacity-50">No image generated</span>
                         </div>
                       )}
                     </div>
                   )}
                </div>

                <div className="p-5 grid md:grid-cols-2 gap-6">
                  {/* Ingredients */}
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-emerald-700 font-bold border-b border-emerald-100 pb-2">
                       <ChefHat size={18} />
                       <h3 className="text-sm">Ingredients</h3>
                    </div>
                    <ul className="space-y-2">
                      {meal.ingredients.map((ing, idx) => (
                        <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                          <span className="leading-relaxed">{ing}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Instructions */}
                  <div>
                    <div className="flex items-center gap-2 mb-3 text-indigo-700 font-bold border-b border-indigo-100 pb-2">
                       <Clock size={18} />
                       <h3 className="text-sm">Instructions</h3>
                    </div>
                    <div className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                      {meal.instructions}
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Tap to view hint */}
            {!isExpanded && (
              <div className="px-5 pb-4 pt-0">
                  <div className="mt-3 pt-3 border-t border-slate-200/50 flex items-center text-xs text-slate-400 font-medium">
                     <span>View Recipe</span>
                     <ChevronDown size={14} className="ml-1" />
                  </div>
              </div>
            )}
        </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      
      {/* Header Tabs */}
      <div className="sticky top-0 z-10 bg-slate-50 pt-4 pb-4 px-4 shadow-sm mb-6">
        <div className="flex justify-center gap-4 mb-3">
          <button
            onClick={() => setActiveTab('plan')}
            className={`px-6 py-2 rounded-full font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'plan'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Calendar size={18} />
            Weekly Plan
          </button>
          <button
            onClick={() => setActiveTab('shop')}
            className={`px-6 py-2 rounded-full font-semibold transition-all flex items-center gap-2 ${
              activeTab === 'shop'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShoppingCart size={18} />
            Shopping List
          </button>
        </div>

        {/* Save Plan Button */}
        <div className="flex justify-center">
          <button
            onClick={() => {
              setPlanName(getDefaultPlanName());
              setShowSaveModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <Save size={16} />
            Save This Plan
          </button>
        </div>
      </div>

      <div className="px-4">
        {activeTab === 'plan' ? (
          <div className="space-y-4">
            {/* AI Disclaimer */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-700 text-center">
                <strong>AI-Generated Recipes:</strong> These recipes were created by AI and may contain errors. Always verify ingredients, quantities, cooking times, and temperatures. Check allergen information independently.
              </p>
            </div>
            {/* View Toggle for single meal mode */}
            {isSingleMealMode && (
              <div className="flex justify-between items-center">
                <span className="text-sm text-slate-500">{getAllMeals().length} meals</span>
                <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('cards')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'cards' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <LayoutGrid size={16} />
                    Cards
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <List size={16} />
                    List
                  </button>
                </div>
              </div>
            )}

            {/* Single Meal Mode - Card Grid or List View */}
            {isSingleMealMode ? (
              viewMode === 'cards' ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {getAllMeals().map(({ day, type, meal }) => (
                    renderMealCard(type, meal, day)
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {getAllMeals().map(({ day, type, meal }) => {
                    const isFav = favorites.includes(meal.name);
                    let colors = { bg: 'bg-slate-50', text: 'text-slate-600' };
                    if (type.toLowerCase() === 'breakfast') colors = { bg: 'bg-orange-50', text: 'text-orange-600' };
                    if (type.toLowerCase() === 'lunch') colors = { bg: 'bg-blue-50', text: 'text-blue-600' };
                    if (type.toLowerCase() === 'dinner') colors = { bg: 'bg-indigo-50', text: 'text-indigo-600' };

                    const uniqueKey = `${day}-${type}-${meal.name}`;
                    const isExpanded = expandedMeal === uniqueKey;

                    return (
                      <div
                        key={uniqueKey}
                        className={`bg-white rounded-xl border border-slate-200 overflow-hidden transition-all ${isExpanded ? 'ring-1 ring-black/5 shadow-lg' : ''}`}
                      >
                        <div
                          className="flex items-center gap-4 p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                          onClick={() => toggleMealDetails(meal, `${day}-${type}`)}
                        >
                          <div className={`w-16 text-center py-1 px-2 rounded-lg ${colors.bg}`}>
                            <div className="text-xs font-semibold text-slate-500">{day}</div>
                            <div className={`text-xs font-bold uppercase ${colors.text}`}>{type}</div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-slate-800 truncate">{meal.name}</h4>
                            <p className="text-sm text-slate-500 truncate">{meal.description}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleFavorite(meal); }}
                              className={`p-1.5 rounded-full transition-colors ${isFav ? 'text-rose-500' : 'text-slate-300 hover:text-rose-400'}`}
                            >
                              <Heart size={18} fill={isFav ? "currentColor" : "none"} />
                            </button>
                            {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="border-t border-slate-200 p-4 bg-slate-50 animate-fadeIn">
                            <p className="text-sm text-slate-600 italic mb-4">{meal.description}</p>
                            <div className="grid md:grid-cols-2 gap-6">
                              <div>
                                <div className="flex items-center gap-2 mb-3 text-emerald-700 font-bold border-b border-emerald-100 pb-2">
                                  <ChefHat size={18} />
                                  <h3 className="text-sm">Ingredients</h3>
                                </div>
                                <ul className="space-y-2">
                                  {meal.ingredients.map((ing, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-sm text-slate-700">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 flex-shrink-0" />
                                      <span>{ing}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-3 text-indigo-700 font-bold border-b border-indigo-100 pb-2">
                                  <Clock size={18} />
                                  <h3 className="text-sm">Instructions</h3>
                                </div>
                                <div className="text-sm text-slate-700 whitespace-pre-wrap">{meal.instructions}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              /* Multi-meal mode - Original day-based accordion view */
              <>
                {/* Expand/Collapse All Button */}
                <div className="flex justify-end">
                  <button
                    onClick={toggleAllDays}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    {allExpanded ? (
                      <>
                        <ChevronUp size={16} />
                        Collapse All
                      </>
                    ) : (
                      <>
                        <ChevronDown size={16} />
                        Expand All
                      </>
                    )}
                  </button>
                </div>

                {data.weeklyPlan.map((dayPlan) => {
                  const hasMeals = dayPlan.meals && (dayPlan.meals.breakfast || dayPlan.meals.lunch || dayPlan.meals.dinner);
                  if (!hasMeals) return null;
                  const isExpanded = expandedDays.has(dayPlan.day);

                  return (
                    <div key={dayPlan.day} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <button
                        onClick={() => toggleDay(dayPlan.day)}
                        className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                      >
                        <h3 className="font-bold text-lg text-slate-800">{dayPlan.day}</h3>
                        {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                      </button>

                      {isExpanded && (
                        <div className="p-4 grid md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fadeIn">
                          {renderMealCard("Breakfast", dayPlan.meals.breakfast)}
                          {renderMealCard("Lunch", dayPlan.meals.lunch)}
                          {renderMealCard("Dinner", dayPlan.meals.dinner)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </>
            )}
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
             <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6 text-sm text-yellow-800 flex gap-3">
               <div className="mt-0.5">ℹ️</div>
               <p>
                 We've automatically excluded items from your pantry.
               </p>
             </div>

            <div className="space-y-6">
              {data.shoppingList.map((category) => (
                <div key={category.categoryName} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 font-bold text-slate-700 uppercase text-sm tracking-wider">
                    {category.categoryName}
                  </div>
                  <div className="divide-y divide-slate-100">
                    {category.items.map((item, idx) => {
                      const isChecked = checkedItems[`${category.categoryName}-${idx}`];
                      return (
                        <div 
                          key={idx} 
                          className={`flex items-center px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer ${isChecked ? 'bg-slate-50' : ''}`}
                          onClick={() => toggleItem(category.categoryName, idx)}
                        >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center mr-4 transition-colors ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300'}`}>
                            {isChecked && <Check size={12} className="text-white" />}
                          </div>
                          <div className={`flex-1 ${isChecked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            <span className="font-medium">{item.name}</span>
                            <span className="text-slate-500 text-sm ml-2">({item.quantity} {item.unit})</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="fixed bottom-6 left-0 right-0 flex flex-col sm:flex-row justify-center gap-3 px-4 z-20">
              <button 
                onClick={handleShare}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full shadow-lg font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95"
              >
                <Share size={18} />
                Share / Reminders
              </button>
              
              <button 
                onClick={handleNewWorldIntegration}
                disabled={isNewWorldLoading}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-full shadow-lg font-semibold flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-80"
              >
                {isNewWorldLoading ? (
                    <>
                        <Loader2 className="animate-spin" size={18} />
                        Loading...
                    </>
                ) : (
                    <>
                        <ExternalLink size={18} />
                        Shop Online
                    </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
       
      <div className="mt-12 text-center pb-8">
        <button
            onClick={onReset}
            className="text-slate-400 hover:text-slate-600 flex items-center gap-2 mx-auto text-sm"
        >
            <RefreshCw size={14} />
            Start Over
        </button>
      </div>

      {/* Save Plan Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div
            className="bg-white rounded-2xl max-w-md w-full shadow-xl animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            {planSaved ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="text-emerald-600" size={32} />
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Plan Saved!</h3>
                <p className="text-slate-500">Your meal plan has been saved successfully.</p>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                      <Save className="text-emerald-600" size={20} />
                    </div>
                    <h2 className="text-xl font-bold text-slate-800">Save Meal Plan</h2>
                  </div>
                  <button
                    onClick={() => setShowSaveModal(false)}
                    className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                  >
                    <X size={20} className="text-slate-400" />
                  </button>
                </div>

                <div className="p-6 space-y-4">
                  <p className="text-sm text-slate-500">
                    Save this meal plan with its shopping list to access it later from your cookbook.
                  </p>

                  {/* Plan Name Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Plan Name
                    </label>
                    <input
                      type="text"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                      placeholder="e.g., Weekly Plan - Dec 30"
                      autoFocus
                    />
                  </div>

                  {/* Plan Summary */}
                  <div className="bg-slate-50 rounded-xl p-4">
                    <h4 className="text-sm font-medium text-slate-700 mb-2">Plan Includes:</h4>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                        {data.weeklyPlan.length} days
                      </span>
                      <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                        {data.weeklyPlan.filter(d => d.meals?.breakfast).length} breakfasts
                      </span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                        {data.weeklyPlan.filter(d => d.meals?.lunch).length} lunches
                      </span>
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full">
                        {data.weeklyPlan.filter(d => d.meals?.dinner).length} dinners
                      </span>
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full">
                        {data.shoppingList.reduce((acc, cat) => acc + cat.items.length, 0)} shopping items
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
                  <button
                    onClick={() => setShowSaveModal(false)}
                    disabled={isSavingPlan}
                    className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePlan}
                    disabled={isSavingPlan || !planName.trim()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingPlan ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Save Plan
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanDisplay;