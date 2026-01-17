import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ArrowLeft, FolderHeart, Trash2, Calendar, ShoppingCart, ChefHat, Clock, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Download, Share, Sun, Coffee, Moon, Filter, Utensils, Pencil, Check, X, Store, LayoutList } from 'lucide-react';
import type { SavedMealPlan, DayPlan, ShoppingCategory, Meal } from '../types';
import { useToastContext } from '../contexts/ToastContext';
import { SkeletonList } from './ui/Skeleton';
import { getSavedMealPlans, deleteSavedMealPlan, updateSavedMealPlanName } from '../services/storageService';
import { getDefaultLayout, DEFAULT_CATEGORIES, type SupermarketLayout } from '../services/supermarketLayoutService';
import RecipePrintView from './RecipePrintView';

type MealFilter = 'all' | 'breakfast' | 'lunch' | 'dinner';
type SortMode = 'category' | 'layout';

interface SavedPlansViewProps {
  onBack: () => void;
  onLoadPlan?: (plan: SavedMealPlan) => void;
}

const SavedPlansView: React.FC<SavedPlansViewProps> = ({ onBack, onLoadPlan }) => {
  const { success } = useToastContext();
  const [plans, setPlans] = useState<SavedMealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SavedMealPlan | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [printMeal, setPrintMeal] = useState<Meal | null>(null);
  const [mealFilter, setMealFilter] = useState<MealFilter>('all');
  const [shoppingListExpanded, setShoppingListExpanded] = useState(false);
  const [exportingPDF, setExportingPDF] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [editPlanName, setEditPlanName] = useState('');
  const [sortMode, setSortMode] = useState<SortMode>('category');
  const [supermarketLayout, setSupermarketLayout] = useState<SupermarketLayout | null>(null);

  const loadPlans = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const savedPlans = await getSavedMealPlans();
      // Sort by created date, newest first
      savedPlans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setPlans(savedPlans);
    } catch (error) {
      console.error('Failed to load saved plans:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const handleRefresh = () => {
    loadPlans(true);
  };

  useEffect(() => {
    loadPlans();
    // Load default supermarket layout
    getDefaultLayout().then(layout => {
      if (layout) setSupermarketLayout(layout);
    });
  }, [loadPlans]);

  const handleDelete = async (id: string) => {
    try {
      await deleteSavedMealPlan(id);
      setPlans(prev => prev.filter(p => p.id !== id));
      setDeleteConfirm(null);
      if (selectedPlan?.id === id) {
        setSelectedPlan(null);
      }
    } catch (error) {
      console.error('Failed to delete plan:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getMealCount = (weeklyPlan: DayPlan[]) => {
    let count = 0;
    weeklyPlan.forEach(day => {
      if (day.meals.breakfast) count++;
      if (day.meals.lunch) count++;
      if (day.meals.dinner) count++;
    });
    return count;
  };

  const getItemCount = (shoppingList: ShoppingCategory[]) => {
    return shoppingList.reduce((sum, cat) => sum + cat.items.length, 0);
  };

  // Sort shopping list based on mode
  const getSortedShoppingList = useCallback((shoppingList: ShoppingCategory[]): ShoppingCategory[] => {
    if (sortMode === 'category') {
      // Sort alphabetically by category name
      return [...shoppingList].sort((a, b) => a.categoryName.localeCompare(b.categoryName));
    } else {
      // Sort by supermarket layout
      const categoryOrder = supermarketLayout?.categoryOrder || DEFAULT_CATEGORIES;
      const orderMap = new Map(categoryOrder.map((cat, idx) => [cat.toLowerCase(), idx]));
      const maxOrder = categoryOrder.length;

      return [...shoppingList].sort((a, b) => {
        const orderA = orderMap.get(a.categoryName.toLowerCase()) ?? maxOrder;
        const orderB = orderMap.get(b.categoryName.toLowerCase()) ?? maxOrder;
        return orderA - orderB;
      });
    }
  }, [sortMode, supermarketLayout]);

  // Get all meals from the plan based on filter
  const getFilteredMeals = useCallback((plan: SavedMealPlan): { meal: Meal; type: 'breakfast' | 'lunch' | 'dinner'; day: string }[] => {
    const meals: { meal: Meal; type: 'breakfast' | 'lunch' | 'dinner'; day: string }[] = [];

    plan.weeklyPlan.forEach(day => {
      if (day.meals.breakfast && (mealFilter === 'all' || mealFilter === 'breakfast')) {
        meals.push({ meal: day.meals.breakfast, type: 'breakfast', day: day.day });
      }
      if (day.meals.lunch && (mealFilter === 'all' || mealFilter === 'lunch')) {
        meals.push({ meal: day.meals.lunch, type: 'lunch', day: day.day });
      }
      if (day.meals.dinner && (mealFilter === 'all' || mealFilter === 'dinner')) {
        meals.push({ meal: day.meals.dinner, type: 'dinner', day: day.day });
      }
    });

    return meals;
  }, [mealFilter]);

  // Export shopping list to PDF
  const handleExportPDF = async (plan: SavedMealPlan) => {
    setExportingPDF(true);
    try {
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.setTextColor(16, 185, 129); // Emerald color
      doc.text(plan.name, 20, 20);

      // Date
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Created: ${formatDate(plan.createdAt)}`, 20, 28);

      // Shopping List
      doc.setFontSize(14);
      doc.setTextColor(30, 41, 59);
      doc.text('Shopping List', 20, 42);

      let yPos = 52;
      const pageHeight = 280;

      getSortedShoppingList(plan.shoppingList).forEach(category => {
        // Check if we need a new page
        if (yPos > pageHeight - 30) {
          doc.addPage();
          yPos = 20;
        }

        // Category name
        doc.setFontSize(11);
        doc.setTextColor(71, 85, 105);
        doc.text(category.categoryName.toUpperCase(), 20, yPos);
        yPos += 7;

        // Items
        doc.setFontSize(10);
        doc.setTextColor(51, 65, 85);
        category.items.forEach(item => {
          if (yPos > pageHeight) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(`• ${item.quantity} ${item.unit} ${item.name}`, 25, yPos);
          yPos += 5;
        });

        yPos += 5;
      });

      doc.save(`${plan.name.replace(/[^a-z0-9]/gi, '_')}_shopping_list.pdf`);
    } catch (error) {
      console.error('Failed to export PDF:', error);
    } finally {
      setExportingPDF(false);
    }
  };

  // Share shopping list
  const handleShare = async (plan: SavedMealPlan) => {
    const listText = getSortedShoppingList(plan.shoppingList).map(cat =>
      `${cat.categoryName}:\n${cat.items.map(item => `  • ${item.quantity} ${item.unit} ${item.name}`).join('\n')}`
    ).join('\n\n');

    const shareText = `${plan.name}\n\nShopping List:\n\n${listText}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: plan.name,
          text: shareText,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareText);
        success('Shopping list copied to clipboard!');
      } catch {
        console.error('Failed to copy to clipboard');
      }
    }
  };

  // Handle save plan name
  const handleSavePlanName = async (id: string) => {
    if (!editPlanName.trim()) {
      setEditingPlanId(null);
      return;
    }
    const success = await updateSavedMealPlanName(id, editPlanName.trim());
    if (success) {
      setPlans(prev => prev.map(p =>
        p.id === id ? { ...p, name: editPlanName.trim() } : p
      ));
    }
    setEditingPlanId(null);
  };

  // Start editing plan name
  const handleStartEditName = (plan: SavedMealPlan, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPlanId(plan.id);
    setEditPlanName(plan.name);
  };

  // Reset filter when plan changes
  useEffect(() => {
    setMealFilter('all');
    setShoppingListExpanded(false);
  }, [selectedPlan?.id]);

  if (loading) {
    return (
      <div className="animate-fadeIn">
        <button
          onClick={onBack}
          className="mb-6 text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center gap-4 mb-6">
          <div className="bg-slate-100 w-12 h-12 rounded-full flex items-center justify-center">
            <FolderHeart className="text-slate-400" size={24} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Saved Meal Plans</h2>
            <p className="text-slate-500 text-sm">Loading your saved plans...</p>
          </div>
        </div>
        <SkeletonList count={3} />
      </div>
    );
  }

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

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-100 p-3 rounded-xl">
            <FolderHeart className="text-indigo-600" size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800">Saved Meal Plans</h2>
            <p className="text-slate-500 text-sm">
              {plans.length} {plans.length === 1 ? 'plan' : 'plans'} saved
            </p>
          </div>
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition-colors disabled:opacity-50"
          title="Refresh plans"
        >
          <RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderHeart className="text-slate-400" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No saved plans yet</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            Generate a meal plan and click "Save This Plan" to save it here with the shopping list.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {plans.map(plan => (
            <div
              key={plan.id}
              className={`bg-white rounded-xl border transition-all cursor-pointer ${
                selectedPlan?.id === plan.id
                  ? 'border-indigo-300 shadow-md'
                  : 'border-slate-100 hover:border-slate-200 hover:shadow-sm'
              }`}
              onClick={() => setSelectedPlan(selectedPlan?.id === plan.id ? null : plan)}
            >
              {/* Plan Header */}
              <div className="p-4 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  {editingPlanId === plan.id ? (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <input
                        type="text"
                        value={editPlanName}
                        onChange={e => setEditPlanName(e.target.value)}
                        className="flex-1 px-3 py-1 border border-indigo-300 rounded-lg text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleSavePlanName(plan.id);
                          if (e.key === 'Escape') setEditingPlanId(null);
                        }}
                        autoFocus
                      />
                      <button
                        onClick={() => handleSavePlanName(plan.id)}
                        className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Save"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => setEditingPlanId(null)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group">
                      <h3 className="font-semibold text-slate-800 truncate">{plan.name}</h3>
                      <button
                        onClick={(e) => handleStartEditName(plan, e)}
                        className="p-1 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                        title="Edit name"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-sm text-slate-500">
                    <span className="flex items-center gap-1">
                      <Clock size={14} />
                      {formatDate(plan.createdAt)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {plan.weeklyPlan.length} days
                    </span>
                    <span className="flex items-center gap-1">
                      <ChefHat size={14} />
                      {getMealCount(plan.weeklyPlan)} meals
                    </span>
                    <span className="flex items-center gap-1">
                      <ShoppingCart size={14} />
                      {getItemCount(plan.shoppingList)} items
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {deleteConfirm === plan.id ? (
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      <span className="text-sm text-slate-500">Delete?</span>
                      <button
                        onClick={() => handleDelete(plan.id)}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1 bg-slate-200 text-slate-700 text-sm rounded-lg hover:bg-slate-300"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          setDeleteConfirm(plan.id);
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete plan"
                      >
                        <Trash2 size={18} />
                      </button>
                      {selectedPlan?.id === plan.id ? (
                        <ChevronUp size={20} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={20} className="text-slate-400" />
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Expanded Content */}
              {selectedPlan?.id === plan.id && (
                <div className="border-t border-slate-100 p-4 animate-fadeIn" onClick={e => e.stopPropagation()}>
                  {/* Meal Filter Tabs */}
                  <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2">
                    <span className="text-sm text-slate-500 flex-shrink-0">
                      <Filter size={14} className="inline mr-1" />
                      Filter:
                    </span>
                    {([
                      { key: 'all', label: 'All Meals', icon: Utensils },
                      { key: 'breakfast', label: 'Breakfast', icon: Coffee },
                      { key: 'lunch', label: 'Lunch', icon: Sun },
                      { key: 'dinner', label: 'Dinner', icon: Moon },
                    ] as const).map(({ key, label, icon: Icon }) => (
                      <button
                        key={key}
                        onClick={() => setMealFilter(key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                          mealFilter === key
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <Icon size={14} />
                        {label}
                      </button>
                    ))}
                  </div>

                  {/* Meals Grid - Modern Cards */}
                  <div className="mb-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {getFilteredMeals(plan).map(({ meal, type, day }, idx) => (
                        <button
                          key={`${day}-${type}-${idx}`}
                          onClick={() => setPrintMeal(meal)}
                          className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-indigo-300 hover:shadow-lg transition-all text-left"
                        >
                          {/* Meal Image */}
                          <div className="aspect-video bg-gradient-to-br from-slate-100 to-slate-200 relative overflow-hidden">
                            {meal.imageUrl ? (
                              <img
                                src={meal.imageUrl}
                                alt={meal.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ChefHat size={32} className="text-slate-300" />
                              </div>
                            )}
                            {/* Meal type badge */}
                            <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                              type === 'breakfast' ? 'bg-amber-100 text-amber-700' :
                              type === 'lunch' ? 'bg-emerald-100 text-emerald-700' :
                              'bg-indigo-100 text-indigo-700'
                            }`}>
                              {type === 'breakfast' && <Coffee size={10} className="inline mr-1" />}
                              {type === 'lunch' && <Sun size={10} className="inline mr-1" />}
                              {type === 'dinner' && <Moon size={10} className="inline mr-1" />}
                              {type.charAt(0).toUpperCase() + type.slice(1)}
                            </div>
                            {/* Day badge */}
                            <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs font-medium bg-white/90 text-slate-600">
                              {day}
                            </div>
                          </div>
                          {/* Meal Info */}
                          <div className="p-3">
                            <h5 className="font-medium text-slate-800 line-clamp-2 group-hover:text-indigo-600 transition-colors">
                              {meal.name}
                            </h5>
                            {meal.description && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                                {meal.description}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>

                    {getFilteredMeals(plan).length === 0 && (
                      <div className="text-center py-8 text-slate-500">
                        No {mealFilter === 'all' ? 'meals' : mealFilter} found in this plan.
                      </div>
                    )}
                  </div>

                  {/* Collapsible Shopping List */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <button
                      onClick={() => setShoppingListExpanded(!shoppingListExpanded)}
                      className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-100 rounded-lg">
                          <ShoppingCart size={18} className="text-emerald-600" />
                        </div>
                        <div className="text-left">
                          <h4 className="font-semibold text-slate-700">Shopping List</h4>
                          <p className="text-sm text-slate-500">
                            {getItemCount(plan.shoppingList)} items across {plan.shoppingList.length} categories
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Export buttons - only show when expanded */}
                        {shoppingListExpanded && (
                          <div className="flex items-center gap-1 mr-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleExportPDF(plan);
                              }}
                              disabled={exportingPDF}
                              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Download PDF"
                            >
                              <Download size={18} className={exportingPDF ? 'animate-pulse' : ''} />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShare(plan);
                              }}
                              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                              title="Share list"
                            >
                              <Share size={18} />
                            </button>
                          </div>
                        )}
                        {shoppingListExpanded ? (
                          <ChevronUp size={20} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={20} className="text-slate-400" />
                        )}
                      </div>
                    </button>

                    {/* Shopping List Content */}
                    {shoppingListExpanded && (
                      <div className="p-4 bg-white animate-fadeIn">
                        {/* Sort Toggle */}
                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
                          <span className="text-sm text-slate-500">Sort by:</span>
                          <div className="flex rounded-lg overflow-hidden border border-slate-200">
                            <button
                              onClick={() => setSortMode('category')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                                sortMode === 'category'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <LayoutList size={14} />
                              Category
                            </button>
                            <button
                              onClick={() => setSortMode('layout')}
                              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                                sortMode === 'layout'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-white text-slate-600 hover:bg-slate-50'
                              }`}
                            >
                              <Store size={14} />
                              Store Layout
                            </button>
                          </div>
                          {sortMode === 'layout' && supermarketLayout && (
                            <span className="text-xs text-slate-400">({supermarketLayout.name})</span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {getSortedShoppingList(plan.shoppingList).map((category, idx) => (
                            <div key={idx} className="bg-slate-50 rounded-lg p-3">
                              <div className="font-medium text-slate-700 mb-2 text-sm uppercase tracking-wide flex items-center gap-2">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                {category.categoryName}
                              </div>
                              <ul className="space-y-1">
                                {category.items.map((item, itemIdx) => (
                                  <li key={itemIdx} className="text-sm text-slate-600 flex items-start gap-2">
                                    <span className="text-emerald-500 mt-0.5">•</span>
                                    <span>
                                      <span className="font-medium">{item.quantity} {item.unit}</span> {item.name}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Load Plan Button (optional) */}
                  {onLoadPlan && (
                    <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={() => onLoadPlan(plan)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors"
                      >
                        Load This Plan
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Print Modal */}
      {printMeal && (
        <RecipePrintView
          meal={printMeal}
          onClose={() => setPrintMeal(null)}
        />
      )}
    </div>
  );
};

export default SavedPlansView;
