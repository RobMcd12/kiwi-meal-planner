import { supabase, isSupabaseConfigured } from './authService';
import { safeSetItem, safeGetItem } from '../utils/localStorageUtils';

// Types
export interface ShoppingListSelections {
  selectedPlanIds: string[];
  selectedRecipeIds: string[];
  checkedItemIds: string[];
}

const STORAGE_KEY = 'kiwi_shopping_list_selections';

// Default empty selections
const DEFAULT_SELECTIONS: ShoppingListSelections = {
  selectedPlanIds: [],
  selectedRecipeIds: [],
  checkedItemIds: []
};

// ============================================
// LOCAL STORAGE FALLBACK
// ============================================

const getSelectionsLocal = (): ShoppingListSelections => {
  try {
    const saved = safeGetItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load local shopping list selections:', e);
  }
  return { ...DEFAULT_SELECTIONS };
};

const saveSelectionsLocal = (selections: ShoppingListSelections): boolean => {
  return safeSetItem(STORAGE_KEY, JSON.stringify(selections));
};

// ============================================
// SUPABASE OPERATIONS
// ============================================

/**
 * Get shopping list selections for the current user
 */
export const getShoppingListSelections = async (): Promise<ShoppingListSelections> => {
  if (!isSupabaseConfigured()) {
    return getSelectionsLocal();
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return getSelectionsLocal();
  }

  const { data, error } = await supabase
    .from('shopping_list_selections')
    .select('selected_plan_ids, selected_recipe_ids, checked_item_ids')
    .eq('user_id', user.id)
    .single();

  if (error) {
    // PGRST116 means no rows found - that's OK, return defaults
    if (error.code === 'PGRST116') {
      return { ...DEFAULT_SELECTIONS };
    }
    console.error('Error fetching shopping list selections:', error);
    return getSelectionsLocal();
  }

  return {
    selectedPlanIds: data.selected_plan_ids || [],
    selectedRecipeIds: data.selected_recipe_ids || [],
    checkedItemIds: data.checked_item_ids || []
  };
};

/**
 * Save shopping list selections for the current user
 */
export const saveShoppingListSelections = async (
  selections: ShoppingListSelections
): Promise<boolean> => {
  // Always save to local as backup
  saveSelectionsLocal(selections);

  if (!isSupabaseConfigured()) {
    return true;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return true; // Local save is sufficient for non-authenticated users
  }

  const { error } = await supabase
    .from('shopping_list_selections')
    .upsert({
      user_id: user.id,
      selected_plan_ids: selections.selectedPlanIds,
      selected_recipe_ids: selections.selectedRecipeIds,
      checked_item_ids: selections.checkedItemIds,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id'
    });

  if (error) {
    console.error('Error saving shopping list selections:', error);
    return false;
  }

  return true;
};

/**
 * Add a plan to the shopping list selections
 */
export const addPlanToShoppingList = async (planId: string): Promise<boolean> => {
  const selections = await getShoppingListSelections();

  if (!selections.selectedPlanIds.includes(planId)) {
    selections.selectedPlanIds.push(planId);
    return saveShoppingListSelections(selections);
  }

  return true; // Already in list
};

/**
 * Remove a plan from the shopping list selections
 */
export const removePlanFromShoppingList = async (planId: string): Promise<boolean> => {
  const selections = await getShoppingListSelections();

  const index = selections.selectedPlanIds.indexOf(planId);
  if (index > -1) {
    selections.selectedPlanIds.splice(index, 1);
    return saveShoppingListSelections(selections);
  }

  return true; // Already not in list
};

/**
 * Add a recipe to the shopping list selections
 */
export const addRecipeToShoppingList = async (recipeId: string): Promise<boolean> => {
  const selections = await getShoppingListSelections();

  if (!selections.selectedRecipeIds.includes(recipeId)) {
    selections.selectedRecipeIds.push(recipeId);
    return saveShoppingListSelections(selections);
  }

  return true; // Already in list
};

/**
 * Remove a recipe from the shopping list selections
 */
export const removeRecipeFromShoppingList = async (recipeId: string): Promise<boolean> => {
  const selections = await getShoppingListSelections();

  const index = selections.selectedRecipeIds.indexOf(recipeId);
  if (index > -1) {
    selections.selectedRecipeIds.splice(index, 1);
    return saveShoppingListSelections(selections);
  }

  return true; // Already not in list
};

/**
 * Toggle a checked item
 */
export const toggleCheckedItem = async (itemId: string): Promise<boolean> => {
  const selections = await getShoppingListSelections();

  const index = selections.checkedItemIds.indexOf(itemId);
  if (index > -1) {
    selections.checkedItemIds.splice(index, 1);
  } else {
    selections.checkedItemIds.push(itemId);
  }

  return saveShoppingListSelections(selections);
};

/**
 * Clear all checked items
 */
export const clearCheckedItems = async (): Promise<boolean> => {
  const selections = await getShoppingListSelections();
  selections.checkedItemIds = [];
  return saveShoppingListSelections(selections);
};

/**
 * Clear all selections (plans, recipes, and checked items)
 */
export const clearAllSelections = async (): Promise<boolean> => {
  const emptySelections: ShoppingListSelections = {
    selectedPlanIds: [],
    selectedRecipeIds: [],
    checkedItemIds: []
  };

  // Clear local storage
  localStorage.removeItem(STORAGE_KEY);

  if (!isSupabaseConfigured()) {
    return true;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return true;
  }

  const { error } = await supabase
    .from('shopping_list_selections')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('Error clearing shopping list selections:', error);
    return false;
  }

  return true;
};

/**
 * Check if user has any items in their shopping list
 * (for showing indicator on home page)
 */
export const hasShoppingListItems = async (): Promise<boolean> => {
  const selections = await getShoppingListSelections();
  return selections.selectedPlanIds.length > 0 || selections.selectedRecipeIds.length > 0;
};
