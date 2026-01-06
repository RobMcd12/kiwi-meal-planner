import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, FolderHeart, Trash2, Calendar, ShoppingCart, ChefHat, Clock, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import type { SavedMealPlan, DayPlan, ShoppingCategory, Meal } from '../types';
import { getSavedMealPlans, deleteSavedMealPlan } from '../services/storageService';
import RecipePrintView from './RecipePrintView';

interface SavedPlansViewProps {
  onBack: () => void;
  onLoadPlan?: (plan: SavedMealPlan) => void;
}

const SavedPlansView: React.FC<SavedPlansViewProps> = ({ onBack, onLoadPlan }) => {
  const [plans, setPlans] = useState<SavedMealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SavedMealPlan | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [printMeal, setPrintMeal] = useState<Meal | null>(null);

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

  if (loading) {
    return (
      <div className="animate-fadeIn">
        <button
          onClick={onBack}
          className="mb-6 text-slate-500 hover:text-slate-800 flex items-center gap-1 text-sm"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
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
                  <h3 className="font-semibold text-slate-800 truncate">{plan.name}</h3>
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
                <div className="border-t border-slate-100 p-4 animate-fadeIn">
                  {/* Meals Overview */}
                  <div className="mb-6">
                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <Calendar size={16} />
                      Weekly Meals
                    </h4>
                    <div className="space-y-3">
                      {plan.weeklyPlan.map((day, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-lg p-3">
                          <div className="font-medium text-slate-700 mb-2">{day.day}</div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                            {day.meals.breakfast && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrintMeal(day.meals.breakfast!);
                                }}
                                className="text-left bg-white p-2 rounded border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                              >
                                <span className="text-amber-600 font-medium">Breakfast:</span>{' '}
                                <span className="text-slate-600">{day.meals.breakfast.name}</span>
                              </button>
                            )}
                            {day.meals.lunch && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrintMeal(day.meals.lunch!);
                                }}
                                className="text-left bg-white p-2 rounded border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                              >
                                <span className="text-emerald-600 font-medium">Lunch:</span>{' '}
                                <span className="text-slate-600">{day.meals.lunch.name}</span>
                              </button>
                            )}
                            {day.meals.dinner && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPrintMeal(day.meals.dinner!);
                                }}
                                className="text-left bg-white p-2 rounded border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
                              >
                                <span className="text-indigo-600 font-medium">Dinner:</span>{' '}
                                <span className="text-slate-600">{day.meals.dinner.name}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shopping List */}
                  <div>
                    <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                      <ShoppingCart size={16} />
                      Shopping List
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {plan.shoppingList.map((category, idx) => (
                        <div key={idx} className="bg-slate-50 rounded-lg p-3">
                          <div className="font-medium text-slate-700 mb-2 text-sm uppercase tracking-wide">
                            {category.categoryName}
                          </div>
                          <ul className="space-y-1">
                            {category.items.map((item, itemIdx) => (
                              <li key={itemIdx} className="text-sm text-slate-600 flex items-start gap-2">
                                <span className="text-emerald-500 mt-1">•</span>
                                <span>
                                  {item.quantity} {item.unit} {item.name}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Load Plan Button (optional) */}
                  {onLoadPlan && (
                    <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          onLoadPlan(plan);
                        }}
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
