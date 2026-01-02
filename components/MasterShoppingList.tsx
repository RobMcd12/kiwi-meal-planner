import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, ShoppingCart, Check, Package, Star, RefreshCw, Trash2, Plus, ChevronDown, ChevronUp, FolderHeart, BookHeart } from 'lucide-react';
import type { PantryItem, SavedMealPlan, ShoppingCategory, Ingredient, Meal } from '../types';
import { loadPantry, getSavedMealPlans, togglePantryItemRestock, getFavoriteMeals } from '../services/storageService';
import {
  getShoppingListSelections,
  saveShoppingListSelections,
  clearAllSelections as clearAllSelectionsService,
  clearCheckedItems as clearCheckedItemsService,
  type ShoppingListSelections
} from '../services/shoppingListService';

interface MasterShoppingListProps {
  onBack: () => void;
  pantryItems?: PantryItem[];
  onPantryUpdate?: (items: PantryItem[]) => void;
}

interface ShoppingItem {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  source: 'plan' | 'staple' | 'recipe';
  sourceName?: string;
  checked: boolean;
  originalItem?: PantryItem;
}

const MasterShoppingList: React.FC<MasterShoppingListProps> = ({
  onBack,
  pantryItems: externalPantryItems,
  onPantryUpdate
}) => {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());

  // Source data
  const [savedPlans, setSavedPlans] = useState<SavedMealPlan[]>([]);
  const [favoriteRecipes, setFavoriteRecipes] = useState<Meal[]>([]);
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);

  // Selections
  const [selectedPlanIds, setSelectedPlanIds] = useState<Set<string>>(new Set());
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<Set<string>>(new Set());

  // UI state
  const [showAddSources, setShowAddSources] = useState(false);
  const [expandedSection, setExpandedSection] = useState<'plans' | 'recipes' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Save selections to database
  const saveSelections = useCallback(async (planIds: Set<string>, recipeIds: Set<string>, checked: Set<string>) => {
    setIsSaving(true);
    try {
      const data: ShoppingListSelections = {
        selectedPlanIds: Array.from(planIds),
        selectedRecipeIds: Array.from(recipeIds),
        checkedItemIds: Array.from(checked)
      };
      await saveShoppingListSelections(data);
    } catch (e) {
      console.error('Failed to save selections:', e);
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Load all data on mount
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load pantry items
      const pantry = externalPantryItems || await loadPantry();
      setPantryItems(pantry);

      // Load saved plans
      const plans = await getSavedMealPlans();
      plans.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setSavedPlans(plans);

      // Load favorite recipes
      const favorites = await getFavoriteMeals();
      setFavoriteRecipes(favorites);

      // Load saved selections from database
      const savedSelections = await getShoppingListSelections();

      // Validate that saved selections still exist
      const validPlanIds = new Set(savedSelections.selectedPlanIds.filter(id =>
        plans.some(p => p.id === id)
      ));
      const validRecipeIds = new Set(savedSelections.selectedRecipeIds.filter(id =>
        favorites.some(r => r.id === id)
      ));

      setSelectedPlanIds(validPlanIds);
      setSelectedRecipeIds(validRecipeIds);
      setCheckedItems(new Set(savedSelections.checkedItemIds));

      // Build shopping list
      buildShoppingList(pantry, plans, favorites, validPlanIds, validRecipeIds);
    } catch (error) {
      console.error('Failed to load shopping data:', error);
    } finally {
      setLoading(false);
    }
  }, [externalPantryItems]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Rebuild list when selections change
  useEffect(() => {
    if (!loading) {
      buildShoppingList(pantryItems, savedPlans, favoriteRecipes, selectedPlanIds, selectedRecipeIds);
      saveSelections(selectedPlanIds, selectedRecipeIds, checkedItems);
    }
  }, [selectedPlanIds, selectedRecipeIds, pantryItems, savedPlans, favoriteRecipes, loading, saveSelections, checkedItems]);

  const buildShoppingList = (
    pantry: PantryItem[],
    plans: SavedMealPlan[],
    recipes: Meal[],
    planIds: Set<string>,
    recipeIds: Set<string>
  ) => {
    const shoppingItems: ShoppingItem[] = [];
    const addedItems = new Set<string>(); // Track by lowercase name to avoid duplicates

    // Add staples that need restocking
    const staplesNeedingRestock = pantry.filter(item => item.isStaple && item.needsRestock);
    staplesNeedingRestock.forEach(item => {
      const key = item.name.toLowerCase();
      if (!addedItems.has(key)) {
        addedItems.add(key);
        shoppingItems.push({
          id: `staple-${item.id}`,
          name: item.name,
          quantity: item.quantity?.toString(),
          unit: item.unit,
          source: 'staple',
          checked: false,
          originalItem: item
        });
      }
    });

    // Add items from selected plans
    plans.filter(p => planIds.has(p.id)).forEach(plan => {
      plan.shoppingList?.forEach((category: ShoppingCategory) => {
        category.items.forEach((ingredient: Ingredient, idx: number) => {
          const key = ingredient.name.toLowerCase();
          // Skip if in pantry (and not flagged for restock)
          const inPantry = pantry.some(
            p => p.name.toLowerCase() === key && !p.needsRestock
          );

          if (!inPantry && !addedItems.has(key)) {
            addedItems.add(key);
            shoppingItems.push({
              id: `plan-${plan.id}-${category.categoryName}-${idx}`,
              name: ingredient.name,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              source: 'plan',
              sourceName: plan.name,
              checked: ingredient.checked || false
            });
          }
        });
      });
    });

    // Add items from selected recipes
    // Note: recipe.ingredients is string[] (e.g., "2 cups flour")
    recipes.filter(r => recipeIds.has(r.id)).forEach(recipe => {
      recipe.ingredients?.forEach((ingredientStr, idx) => {
        // Parse ingredient string to extract name (take last word(s) after quantity/unit)
        // Simple approach: use the full string as the display name
        const key = ingredientStr.toLowerCase().trim();

        // Skip if any pantry item name appears in this ingredient
        const inPantry = pantry.some(
          p => key.includes(p.name.toLowerCase()) && !p.needsRestock
        );

        if (!inPantry && !addedItems.has(key)) {
          addedItems.add(key);
          shoppingItems.push({
            id: `recipe-${recipe.id}-${idx}`,
            name: ingredientStr, // Use full ingredient string
            source: 'recipe',
            sourceName: recipe.name,
            checked: false
          });
        }
      });
    });

    setItems(shoppingItems);
  };

  const toggleItem = async (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
    saveSelections(selectedPlanIds, selectedRecipeIds, newChecked);

    // If it's a staple item and now checked, mark it as no longer needing restock
    if (item.source === 'staple' && item.originalItem && newChecked.has(itemId)) {
      await togglePantryItemRestock(item.originalItem.id, true);
      const updatedPantry = pantryItems.map(p =>
        p.id === item.originalItem!.id ? { ...p, needsRestock: false } : p
      );
      setPantryItems(updatedPantry);
      onPantryUpdate?.(updatedPantry);

      // Remove from list after visual feedback
      setTimeout(() => {
        setItems(prev => prev.filter(i => i.id !== itemId));
        newChecked.delete(itemId);
        setCheckedItems(new Set(newChecked));
      }, 500);
    }
  };

  const togglePlanSelection = (planId: string) => {
    const newSelected = new Set(selectedPlanIds);
    if (newSelected.has(planId)) {
      newSelected.delete(planId);
    } else {
      newSelected.add(planId);
    }
    setSelectedPlanIds(newSelected);
  };

  const toggleRecipeSelection = (recipeId: string) => {
    const newSelected = new Set(selectedRecipeIds);
    if (newSelected.has(recipeId)) {
      newSelected.delete(recipeId);
    } else {
      newSelected.add(recipeId);
    }
    setSelectedRecipeIds(newSelected);
  };

  const clearAllSelections = async () => {
    setSelectedPlanIds(new Set());
    setSelectedRecipeIds(new Set());
    setCheckedItems(new Set());
    await clearAllSelectionsService();
  };

  const clearCheckedItems = async () => {
    setCheckedItems(new Set());
    await clearCheckedItemsService();
  };

  // Group items by source type
  const groupedItems = {
    staples: items.filter(i => i.source === 'staple'),
    planAndRecipe: items.filter(i => i.source === 'plan' || i.source === 'recipe')
  };

  const checkedCount = checkedItems.size;
  const totalCount = items.length;
  const hasSelections = selectedPlanIds.size > 0 || selectedRecipeIds.size > 0;

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
        <div className="flex items-center gap-2">
          {checkedCount > 0 && (
            <button
              onClick={clearCheckedItems}
              className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
            >
              <Trash2 size={14} />
              Clear checked
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <div className="bg-emerald-100 p-3 rounded-xl">
          <ShoppingCart className="text-emerald-600" size={28} />
        </div>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-slate-800">Shopping List</h2>
          <p className="text-slate-500 text-sm">
            {totalCount === 0
              ? 'Add plans or recipes to build your list'
              : `${totalCount - checkedCount} items remaining`}
          </p>
        </div>
      </div>

      {/* Source Selection */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 mb-6">
        <button
          onClick={() => setShowAddSources(!showAddSources)}
          className="w-full px-4 py-3 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-emerald-600" />
            <span className="font-medium text-slate-700">
              {hasSelections
                ? `${selectedPlanIds.size} plans, ${selectedRecipeIds.size} recipes selected`
                : 'Add plans or recipes to your list'
              }
            </span>
          </div>
          {showAddSources ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {showAddSources && (
          <div className="border-t border-slate-200 p-4 space-y-4">
            {/* Saved Plans */}
            <div>
              <button
                onClick={() => setExpandedSection(expandedSection === 'plans' ? null : 'plans')}
                className="w-full flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-2">
                  <FolderHeart size={16} className="text-indigo-600" />
                  <span className="font-medium text-slate-700">Saved Plans</span>
                  <span className="text-xs text-slate-400">({savedPlans.length})</span>
                </div>
                {expandedSection === 'plans' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {expandedSection === 'plans' && (
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {savedPlans.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">No saved plans yet</p>
                  ) : (
                    savedPlans.map(plan => (
                      <label
                        key={plan.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedPlanIds.has(plan.id)}
                          onChange={() => togglePlanSelection(plan.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-slate-700 truncate block">{plan.name}</span>
                          <span className="text-xs text-slate-400">
                            {plan.shoppingList?.reduce((sum, cat) => sum + cat.items.length, 0) || 0} items
                          </span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Favorite Recipes */}
            <div>
              <button
                onClick={() => setExpandedSection(expandedSection === 'recipes' ? null : 'recipes')}
                className="w-full flex items-center justify-between py-2"
              >
                <div className="flex items-center gap-2">
                  <BookHeart size={16} className="text-rose-600" />
                  <span className="font-medium text-slate-700">Cookbook Recipes</span>
                  <span className="text-xs text-slate-400">({favoriteRecipes.length})</span>
                </div>
                {expandedSection === 'recipes' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>

              {expandedSection === 'recipes' && (
                <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                  {favoriteRecipes.length === 0 ? (
                    <p className="text-sm text-slate-400 py-2">No recipes in cookbook yet</p>
                  ) : (
                    favoriteRecipes.map(recipe => (
                      <label
                        key={recipe.id}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-100 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedRecipeIds.has(recipe.id)}
                          onChange={() => toggleRecipeSelection(recipe.id)}
                          className="w-4 h-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-sm text-slate-700 truncate block">{recipe.name}</span>
                          <span className="text-xs text-slate-400">
                            {recipe.ingredients?.length || 0} ingredients
                          </span>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>

            {hasSelections && (
              <button
                onClick={clearAllSelections}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                Clear all selections
              </button>
            )}
          </div>
        )}
      </div>

      {/* Shopping List */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
          <div className="bg-slate-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="text-slate-400" size={32} />
          </div>
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Your list is empty</h3>
          <p className="text-slate-500 text-sm max-w-sm mx-auto">
            {groupedItems.staples.length === 0 && !hasSelections
              ? 'Select plans or recipes above, or mark staples as "need to restock" in your pantry.'
              : 'All items from your selections are already in your pantry!'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Staples needing restock */}
          {groupedItems.staples.length > 0 && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden">
              <div className="px-4 py-3 bg-amber-100 border-b border-amber-200 flex items-center gap-2">
                <Star size={18} className="text-amber-600" fill="currentColor" />
                <h3 className="font-semibold text-amber-800">Staples to Restock</h3>
                <span className="ml-auto text-sm text-amber-600">
                  {groupedItems.staples.filter(i => !checkedItems.has(i.id)).length} items
                </span>
              </div>
              <div className="divide-y divide-amber-100">
                {groupedItems.staples.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-all ${
                      checkedItems.has(item.id) ? 'bg-amber-50/50 opacity-60' : 'bg-white'
                    }`}
                  >
                    <button
                      onClick={() => toggleItem(item.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                        checkedItems.has(item.id)
                          ? 'bg-amber-500 border-amber-500 text-white'
                          : 'border-amber-300 hover:border-amber-500'
                      }`}
                    >
                      {checkedItems.has(item.id) && <Check size={14} />}
                    </button>
                    <span
                      className={`flex-1 ${
                        checkedItems.has(item.id) ? 'line-through text-slate-400' : 'text-slate-700'
                      }`}
                    >
                      {item.name}
                      {item.quantity && item.unit && (
                        <span className="text-amber-600 text-sm ml-2">
                          ({item.quantity} {item.unit})
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Plan & Recipe items */}
          {groupedItems.planAndRecipe.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                <Package size={18} className="text-slate-600" />
                <h3 className="font-semibold text-slate-700">Ingredients</h3>
                <span className="ml-auto text-sm text-slate-500">
                  {groupedItems.planAndRecipe.filter(i => !checkedItems.has(i.id)).length} items
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {groupedItems.planAndRecipe.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-3 px-4 py-3 transition-all ${
                      checkedItems.has(item.id) ? 'bg-slate-50 opacity-60' : ''
                    }`}
                  >
                    <button
                      onClick={() => toggleItem(item.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                        checkedItems.has(item.id)
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-slate-300 hover:border-emerald-500'
                      }`}
                    >
                      {checkedItems.has(item.id) && <Check size={14} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span
                        className={`block ${
                          checkedItems.has(item.id) ? 'line-through text-slate-400' : 'text-slate-700'
                        }`}
                      >
                        {item.name}
                        {item.quantity && (
                          <span className="text-slate-500 text-sm ml-2">
                            ({item.quantity}{item.unit ? ` ${item.unit}` : ''})
                          </span>
                        )}
                      </span>
                      {item.sourceName && (
                        <span className={`text-xs ${item.source === 'plan' ? 'text-indigo-500' : 'text-rose-500'}`}>
                          {item.source === 'plan' ? 'Plan: ' : 'Recipe: '}{item.sourceName}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick actions */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors text-sm"
            >
              <RefreshCw size={16} />
              Refresh list
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterShoppingList;
