import { supabase, isSupabaseConfigured } from './authService';
import type { Meal, MealPlanResponse, MealConfig, UserPreferences, PantryItem, PantryCategory, SavedMealPlan } from '../types';
import { CONSTANTS } from '../types';
import { autoTagRecipe } from './geminiService';
import { assignTagsToRecipe, getRecipeTags } from './recipeService';
import { safeSetItem, safeGetItem } from '../utils/localStorageUtils';

// ============================================
// LOCAL STORAGE KEYS (for fallback/migration)
// ============================================

const STORAGE_KEYS = {
  FAVORITES: 'kiwi_meal_planner_favorites',
  HISTORY: 'kiwi_meal_planner_history',
  CONFIG: 'kiwi_meal_planner_config',
  PREFERENCES: 'kiwi_meal_planner_preferences',
  PANTRY: 'kiwi_meal_planner_pantry',
  SAVED_PLANS: 'kiwi_meal_planner_saved_plans',
};

// ============================================
// HELPERS
// ============================================

const safeParse = <T>(json: string | null, fallback: T): T => {
  if (!json) return fallback;
  try {
    const parsed = JSON.parse(json);
    if (typeof fallback === 'object' && fallback !== null && !Array.isArray(fallback)) {
      return { ...fallback, ...parsed };
    }
    return parsed;
  } catch (e) {
    console.warn("Failed to parse storage item, using fallback.", e);
    return fallback;
  }
};

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// ============================================
// PANTRY ITEM PARSING UTILITIES
// ============================================

// All known units for parsing
const ALL_UNITS = [
  // Metric
  'g', 'grams', 'gram', 'kg', 'kilograms', 'kilogram', 'ml', 'millilitres', 'milliliters', 'L', 'litres', 'liters', 'litre', 'liter', 'cm',
  // Imperial
  'oz', 'ounces', 'ounce', 'lb', 'lbs', 'pounds', 'pound', 'fl oz', 'cups', 'cup', 'pt', 'pint', 'pints', 'qt', 'quart', 'quarts', 'gal', 'gallon', 'gallons', 'in', 'inches', 'inch',
  // Universal
  'pieces', 'piece', 'pcs', 'pc', 'items', 'item', 'bunch', 'bunches', 'pack', 'packs', 'can', 'cans', 'bottle', 'bottles', 'jar', 'jars', 'box', 'boxes', 'bag', 'bags', 'tbsp', 'tablespoon', 'tablespoons', 'tsp', 'teaspoon', 'teaspoons', 'cloves', 'clove', 'slices', 'slice', 'heads', 'head',
  // Additional common units
  'dozen', 'doz', 'carton', 'cartons', 'container', 'containers', 'loaf', 'loaves', 'stick', 'sticks'
];

// Normalize unit to standard form
const normalizeUnit = (unit: string): string => {
  const unitLower = unit.toLowerCase();
  const unitMap: Record<string, string> = {
    'grams': 'g', 'gram': 'g',
    'kilograms': 'kg', 'kilogram': 'kg',
    'millilitres': 'ml', 'milliliters': 'ml',
    'litres': 'L', 'liters': 'L', 'litre': 'L', 'liter': 'L',
    'ounces': 'oz', 'ounce': 'oz',
    'pounds': 'lb', 'pound': 'lb', 'lbs': 'lb',
    'cups': 'cups', 'cup': 'cups',
    'pints': 'pt', 'pint': 'pt',
    'quarts': 'qt', 'quart': 'qt',
    'gallons': 'gal', 'gallon': 'gal',
    'inches': 'in', 'inch': 'in',
    'pieces': 'pieces', 'piece': 'pieces', 'pcs': 'pieces', 'pc': 'pieces',
    'items': 'items', 'item': 'items',
    'bunches': 'bunch',
    'packs': 'pack',
    'cans': 'can',
    'bottles': 'bottle',
    'jars': 'jar',
    'boxes': 'box',
    'bags': 'bag',
    'tablespoons': 'tbsp', 'tablespoon': 'tbsp',
    'teaspoons': 'tsp', 'teaspoon': 'tsp',
    'clove': 'cloves',
    'slice': 'slices',
    'head': 'heads',
    'dozen': 'dozen', 'doz': 'dozen',
    'cartons': 'carton',
    'containers': 'container',
    'loaves': 'loaf',
    'sticks': 'stick',
  };
  return unitMap[unitLower] || unit;
};

/**
 * Parse an item name string like "milk (~500ml)" or "eggs (12)"
 * into separate name, quantity, and unit fields
 */
export const parseItemQuantity = (itemString: string): { name: string; quantity?: number; unit?: string } => {
  // Pattern to match quantity in parentheses: "item (quantity unit)" or "item (~quantity unit)"
  // Examples: "milk (~500ml)", "eggs (12)", "flour (2 kg)", "bread (1 loaf)"
  const parenPattern = /^(.+?)\s*\(~?(\d+(?:\.\d+)?)\s*([a-zA-Z\s]*)\)$/;
  const parenMatch = itemString.trim().match(parenPattern);

  if (parenMatch) {
    const name = parenMatch[1].trim();
    const quantity = parseFloat(parenMatch[2]);
    let unit = parenMatch[3].trim();

    if (unit) {
      unit = normalizeUnit(unit);
    }

    return {
      name,
      quantity: isNaN(quantity) ? undefined : quantity,
      unit: unit || undefined,
    };
  }

  // Pattern for quantity at end without parentheses: "milk 500ml" or "2 loaves bread"
  // Try: "item quantity unit" pattern
  const unitsPattern = new RegExp(`^(.+?)\\s+(\\d+(?:\\.\\d+)?)\\s*(${ALL_UNITS.join('|')})\\s*$`, 'i');
  const suffixMatch = itemString.trim().match(unitsPattern);

  if (suffixMatch) {
    const name = suffixMatch[1].trim();
    const quantity = parseFloat(suffixMatch[2]);
    let unit = suffixMatch[3].trim();

    if (unit) {
      unit = normalizeUnit(unit);
    }

    return {
      name,
      quantity: isNaN(quantity) ? undefined : quantity,
      unit: unit || undefined,
    };
  }

  // Pattern for quantity at start: "2 eggs", "500g flour"
  const prefixPattern = new RegExp(`^(\\d+(?:\\.\\d+)?)\\s*(${ALL_UNITS.join('|')})?\\s+(.+)$`, 'i');
  const prefixMatch = itemString.trim().match(prefixPattern);

  if (prefixMatch) {
    const quantity = parseFloat(prefixMatch[1]);
    let unit = prefixMatch[2]?.trim();
    const name = prefixMatch[3].trim();

    if (unit) {
      unit = normalizeUnit(unit);
    }

    return {
      name,
      quantity: isNaN(quantity) ? undefined : quantity,
      unit: unit || undefined,
    };
  }

  // No quantity found, return just the name
  return { name: itemString.trim() };
};

/**
 * Convert a PantryItem with quantity in name to one with separate quantity/unit fields
 */
export const normalizeItemQuantity = (item: PantryItem): PantryItem => {
  // If item already has quantity set, don't re-parse
  if (item.quantity !== undefined && item.quantity !== null) {
    return item;
  }

  const parsed = parseItemQuantity(item.name);

  return {
    ...item,
    name: parsed.name,
    quantity: parsed.quantity,
    unit: parsed.unit,
  };
};

// ============================================
// PANTRY - Supabase with LocalStorage fallback
// ============================================

export const savePantryItem = async (name: string, isStaple: boolean = false): Promise<PantryItem | null> => {
  if (!isSupabaseConfigured()) {
    const items = loadPantryLocal();
    const newItem: PantryItem = { id: generateId(), name, isStaple };
    if (!items.some(item => item.name.toLowerCase() === name.toLowerCase())) {
      savePantryLocal([...items, newItem]);
      return newItem;
    }
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const items = loadPantryLocal();
    const newItem: PantryItem = { id: generateId(), name, isStaple };
    if (!items.some(item => item.name.toLowerCase() === name.toLowerCase())) {
      savePantryLocal([...items, newItem]);
      return newItem;
    }
    return null;
  }

  const { data, error } = await supabase
    .from('pantry_items')
    .insert({ user_id: user.id, name, is_staple: isStaple })
    .select('id, name, is_staple')
    .single();

  if (error) {
    console.error('Error saving pantry item:', error);
    return null;
  }
  return { id: data.id, name: data.name, isStaple: data.is_staple };
};

export const loadPantry = async (overrideUserId?: string): Promise<PantryItem[]> => {
  if (!isSupabaseConfigured()) {
    return loadPantryLocal();
  }

  // Use override userId for impersonation, otherwise get current user
  let userId = overrideUserId;
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return loadPantryLocal();
    userId = user.id;
  }

  const { data, error } = await supabase
    .from('pantry_items')
    .select('id, name, is_staple, needs_restock, quantity, unit, category_id, sort_order')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading pantry:', error);
    return loadPantryLocal();
  }

  // Map database fields to TypeScript interface
  return (data || []).map(item => ({
    id: item.id,
    name: item.name,
    isStaple: item.is_staple || false,
    needsRestock: item.needs_restock || false,
    quantity: item.quantity || undefined,
    unit: item.unit || undefined,
    categoryId: item.category_id || undefined,
    sortOrder: item.sort_order || 0,
  }));
};

// ============================================
// PANTRY CATEGORIES
// ============================================

export const loadPantryCategories = async (isStaple: boolean = false, overrideUserId?: string): Promise<PantryCategory[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  let userId = overrideUserId;
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];
    userId = user.id;
  }

  const { data, error } = await supabase
    .from('pantry_categories')
    .select('id, name, sort_order, is_collapsed, is_staple_category')
    .eq('user_id', userId)
    .eq('is_staple_category', isStaple)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error loading pantry categories:', error);
    return [];
  }

  return (data || []).map(cat => ({
    id: cat.id,
    name: cat.name,
    sortOrder: cat.sort_order || 0,
    isCollapsed: cat.is_collapsed ?? true,
    isStapleCategory: cat.is_staple_category || false,
  }));
};

export const createPantryCategory = async (
  name: string,
  isStaple: boolean = false
): Promise<PantryCategory | null> => {
  if (!isSupabaseConfigured()) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get max sort order
  const { data: existing } = await supabase
    .from('pantry_categories')
    .select('sort_order')
    .eq('user_id', user.id)
    .eq('is_staple_category', isStaple)
    .order('sort_order', { ascending: false })
    .limit(1);

  const maxOrder = existing?.[0]?.sort_order || 0;

  const { data, error } = await supabase
    .from('pantry_categories')
    .insert({
      user_id: user.id,
      name,
      sort_order: maxOrder + 1,
      is_collapsed: true,
      is_staple_category: isStaple,
    })
    .select('id, name, sort_order, is_collapsed, is_staple_category')
    .single();

  if (error) {
    console.error('Error creating pantry category:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    sortOrder: data.sort_order || 0,
    isCollapsed: data.is_collapsed ?? true,
    isStapleCategory: data.is_staple_category || false,
  };
};

export const updatePantryCategory = async (
  id: string,
  updates: Partial<{ name: string; isCollapsed: boolean; sortOrder: number }>
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const dbUpdates: Record<string, any> = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.isCollapsed !== undefined) dbUpdates.is_collapsed = updates.isCollapsed;
  if (updates.sortOrder !== undefined) dbUpdates.sort_order = updates.sortOrder;

  const { error } = await supabase
    .from('pantry_categories')
    .update(dbUpdates)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating pantry category:', error);
    return false;
  }
  return true;
};

export const deletePantryCategory = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Items in this category will have category_id set to null (ON DELETE SET NULL)
  const { error } = await supabase
    .from('pantry_categories')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting pantry category:', error);
    return false;
  }
  return true;
};

export const reorderCategories = async (categoryIds: string[]): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  // Update each category with its new sort order
  const updates = categoryIds.map((id, index) =>
    supabase
      .from('pantry_categories')
      .update({ sort_order: index })
      .eq('id', id)
      .eq('user_id', user.id)
  );

  const results = await Promise.all(updates);
  const hasError = results.some(r => r.error);

  if (hasError) {
    console.error('Error reordering categories');
    return false;
  }
  return true;
};

export const updatePantryItemCategory = async (
  itemId: string,
  categoryId: string | null,
  sortOrder?: number
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const updates: Record<string, any> = { category_id: categoryId };
  if (sortOrder !== undefined) updates.sort_order = sortOrder;

  const { error } = await supabase
    .from('pantry_items')
    .update(updates)
    .eq('id', itemId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating pantry item category:', error);
    return false;
  }
  return true;
};

export const reorderPantryItems = async (
  itemUpdates: { id: string; sortOrder: number; categoryId: string | null }[]
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const updates = itemUpdates.map(item =>
    supabase
      .from('pantry_items')
      .update({ sort_order: item.sortOrder, category_id: item.categoryId })
      .eq('id', item.id)
      .eq('user_id', user.id)
  );

  const results = await Promise.all(updates);
  const hasError = results.some(r => r.error);

  if (hasError) {
    console.error('Error reordering pantry items');
    return false;
  }
  return true;
};

export const removePantryItem = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured()) {
    const items = loadPantryLocal();
    savePantryLocal(items.filter(item => item.id !== id));
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const items = loadPantryLocal();
    savePantryLocal(items.filter(item => item.id !== id));
    return;
  }

  await supabase.from('pantry_items').delete().eq('id', id);
};

// Clear all pantry items by staple type
export const clearPantryItems = async (isStaple: boolean): Promise<void> => {
  if (!isSupabaseConfigured()) {
    const items = loadPantryLocal();
    savePantryLocal(items.filter(item => item.isStaple !== isStaple));
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const items = loadPantryLocal();
    savePantryLocal(items.filter(item => item.isStaple !== isStaple));
    return;
  }

  await supabase.from('pantry_items').delete().eq('user_id', user.id).eq('is_staple', isStaple);
};

// Sync function for bulk pantry operations (localStorage only - use savePantryItems for Supabase)
export const savePantry = async (items: PantryItem[]): Promise<void> => {
  savePantryLocal(items);
};

// Save or update multiple pantry items to Supabase
// Used by PantryScanner to persist scanned items
export const savePantryItems = async (
  items: PantryItem[],
  mode: 'add_new' | 'update_existing' | 'replace'
): Promise<PantryItem[]> => {
  if (!isSupabaseConfigured()) {
    // For localStorage fallback
    const existing = loadPantryLocal();
    if (mode === 'replace') {
      savePantryLocal(items);
      return items;
    } else if (mode === 'update_existing') {
      // Update existing items, add new ones
      const updatedItems = [...existing];
      items.forEach(item => {
        const existingIndex = updatedItems.findIndex(e => e.id === item.id);
        if (existingIndex >= 0) {
          updatedItems[existingIndex] = { ...updatedItems[existingIndex], ...item };
        } else {
          updatedItems.push(item);
        }
      });
      savePantryLocal(updatedItems);
      return updatedItems;
    } else {
      // add_new - filter out duplicates by name
      const newItems = items.filter(
        item => !existing.some(e => e.name.toLowerCase() === item.name.toLowerCase())
      );
      const combined = [...existing, ...newItems];
      savePantryLocal(combined);
      return combined;
    }
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Same localStorage fallback for unauthenticated users
    const existing = loadPantryLocal();
    if (mode === 'replace') {
      savePantryLocal(items);
      return items;
    } else if (mode === 'update_existing') {
      const updatedItems = [...existing];
      items.forEach(item => {
        const existingIndex = updatedItems.findIndex(e => e.id === item.id);
        if (existingIndex >= 0) {
          updatedItems[existingIndex] = { ...updatedItems[existingIndex], ...item };
        } else {
          updatedItems.push(item);
        }
      });
      savePantryLocal(updatedItems);
      return updatedItems;
    } else {
      const newItems = items.filter(
        item => !existing.some(e => e.name.toLowerCase() === item.name.toLowerCase())
      );
      const combined = [...existing, ...newItems];
      savePantryLocal(combined);
      return combined;
    }
  }

  // Supabase operations
  const savedItems: PantryItem[] = [];

  if (mode === 'replace') {
    // Delete all existing items first
    await supabase.from('pantry_items').delete().eq('user_id', user.id);

    // Insert all new items
    for (const item of items) {
      const { data, error } = await supabase
        .from('pantry_items')
        .insert({
          user_id: user.id,
          name: item.name,
          is_staple: item.isStaple || false,
          needs_restock: item.needsRestock || false,
          quantity: item.quantity || null,
          unit: item.unit || null,
        })
        .select('id, name, is_staple, needs_restock, quantity, unit')
        .single();

      if (!error && data) {
        savedItems.push({
          id: data.id,
          name: data.name,
          isStaple: data.is_staple,
          needsRestock: data.needs_restock,
          quantity: data.quantity,
          unit: data.unit,
        });
      }
    }
  } else if (mode === 'update_existing') {
    // Update existing items by ID, insert new ones
    for (const item of items) {
      // Check if this is an existing item (has a valid UUID format)
      const isExistingId = item.id && !item.id.startsWith('scanned-');

      if (isExistingId) {
        // Update existing item
        const { data, error } = await supabase
          .from('pantry_items')
          .update({
            name: item.name,
            is_staple: item.isStaple || false,
            needs_restock: item.needsRestock || false,
            quantity: item.quantity || null,
            unit: item.unit || null,
          })
          .eq('id', item.id)
          .select('id, name, is_staple, needs_restock, quantity, unit')
          .single();

        if (!error && data) {
          savedItems.push({
            id: data.id,
            name: data.name,
            isStaple: data.is_staple,
            needsRestock: data.needs_restock,
            quantity: data.quantity,
            unit: data.unit,
          });
        }
      } else {
        // Insert new item
        const { data, error } = await supabase
          .from('pantry_items')
          .insert({
            user_id: user.id,
            name: item.name,
            is_staple: item.isStaple || false,
            needs_restock: item.needsRestock || false,
            quantity: item.quantity || null,
            unit: item.unit || null,
          })
          .select('id, name, is_staple, needs_restock, quantity, unit')
          .single();

        if (!error && data) {
          savedItems.push({
            id: data.id,
            name: data.name,
            isStaple: data.is_staple,
            needsRestock: data.needs_restock,
            quantity: data.quantity,
            unit: data.unit,
          });
        }
      }
    }
  } else {
    // add_new - only insert items that don't exist
    for (const item of items) {
      // Check if item with this name already exists
      const { data: existing } = await supabase
        .from('pantry_items')
        .select('id')
        .eq('user_id', user.id)
        .ilike('name', item.name)
        .single();

      if (!existing) {
        const { data, error } = await supabase
          .from('pantry_items')
          .insert({
            user_id: user.id,
            name: item.name,
            is_staple: item.isStaple || false,
            needs_restock: item.needsRestock || false,
            quantity: item.quantity || null,
            unit: item.unit || null,
          })
          .select('id, name, is_staple, needs_restock, quantity, unit')
          .single();

        if (!error && data) {
          savedItems.push({
            id: data.id,
            name: data.name,
            isStaple: data.is_staple,
            needsRestock: data.needs_restock,
            quantity: data.quantity,
            unit: data.unit,
          });
        }
      }
    }
  }

  return savedItems;
};

// Update a pantry item's staple status with optional category transfer
// Returns the new category ID if category was transferred, or undefined
export const updatePantryItemStaple = async (
  id: string,
  isStaple: boolean,
  categoryName?: string
): Promise<{ success: boolean; newCategoryId?: string }> => {
  if (!isSupabaseConfigured()) {
    const items = loadPantryLocal();
    const updated = items.map(item =>
      item.id === id ? { ...item, isStaple, needsRestock: isStaple ? item.needsRestock : false, categoryId: undefined } : item
    );
    savePantryLocal(updated);
    return { success: true };
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const items = loadPantryLocal();
    const updated = items.map(item =>
      item.id === id ? { ...item, isStaple, needsRestock: isStaple ? item.needsRestock : false, categoryId: undefined } : item
    );
    savePantryLocal(updated);
    return { success: true };
  }

  let newCategoryId: string | undefined = undefined;

  // If item has a category, find or create matching category in destination tab
  if (categoryName) {
    // First, check if a category with the same name already exists in the destination tab
    const { data: existingCategory } = await supabase
      .from('pantry_categories')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', categoryName)
      .eq('is_staple_category', isStaple)
      .single();

    if (existingCategory) {
      newCategoryId = existingCategory.id;
    } else {
      // Create a new category in the destination tab
      const newCategory = await createPantryCategory(categoryName, isStaple);
      if (newCategory) {
        newCategoryId = newCategory.id;
      }
    }
  }

  // Build update object
  const updateData: { is_staple: boolean; needs_restock?: boolean; category_id: string | null } = {
    is_staple: isStaple,
    category_id: newCategoryId || null
  };
  if (!isStaple) {
    updateData.needs_restock = false;
  }

  const { error } = await supabase
    .from('pantry_items')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating pantry item staple status:', error);
    return { success: false };
  }
  return { success: true, newCategoryId };
};

// Update a pantry item's quantity and unit
export const updatePantryItemQuantity = async (
  id: string,
  quantity: number | null,
  unit: string | null
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const items = loadPantryLocal();
    const updated = items.map(item =>
      item.id === id ? { ...item, quantity: quantity || undefined, unit: unit || undefined } : item
    );
    savePantryLocal(updated);
    return true;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const items = loadPantryLocal();
    const updated = items.map(item =>
      item.id === id ? { ...item, quantity: quantity || undefined, unit: unit || undefined } : item
    );
    savePantryLocal(updated);
    return true;
  }

  const { error } = await supabase
    .from('pantry_items')
    .update({ quantity, unit })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating pantry item quantity:', error);
    return false;
  }
  return true;
};

// Update a pantry item's name
export const updatePantryItemName = async (
  id: string,
  name: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const items = loadPantryLocal();
    const updated = items.map(item =>
      item.id === id ? { ...item, name } : item
    );
    savePantryLocal(updated);
    return true;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const items = loadPantryLocal();
    const updated = items.map(item =>
      item.id === id ? { ...item, name } : item
    );
    savePantryLocal(updated);
    return true;
  }

  const { error } = await supabase
    .from('pantry_items')
    .update({ name })
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating pantry item name:', error);
    return false;
  }
  return true;
};

// Toggle restock status for a staple item
export const togglePantryItemRestock = async (id: string, needsRestock: boolean): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const items = loadPantryLocal();
    const updated = items.map(item =>
      item.id === id ? { ...item, needsRestock } : item
    );
    savePantryLocal(updated);
    return true;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const items = loadPantryLocal();
    const updated = items.map(item =>
      item.id === id ? { ...item, needsRestock } : item
    );
    savePantryLocal(updated);
    return true;
  }

  const { error } = await supabase
    .from('pantry_items')
    .update({ needs_restock: needsRestock })
    .eq('id', id);

  if (error) {
    console.error('Error toggling pantry item restock:', error);
    return false;
  }
  return true;
};

// Clear all restock flags (mark shopping as completed)
export const clearStaplesRestock = async (): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const items = loadPantryLocal();
    const updated = items.map(item => ({ ...item, needsRestock: false }));
    savePantryLocal(updated);
    return true;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const items = loadPantryLocal();
    const updated = items.map(item => ({ ...item, needsRestock: false }));
    savePantryLocal(updated);
    return true;
  }

  const { error } = await supabase
    .from('pantry_items')
    .update({ needs_restock: false })
    .eq('user_id', user.id)
    .eq('needs_restock', true);

  if (error) {
    console.error('Error clearing staples restock:', error);
    return false;
  }
  return true;
};

// ============================================
// FAVORITES - Supabase with LocalStorage fallback
// ============================================

export const saveFavoriteMeal = async (meal: Meal, autoTag: boolean = true): Promise<string | null> => {
  if (!isSupabaseConfigured()) {
    const success = saveFavoriteMealLocal(meal);
    return success ? meal.id : null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const success = saveFavoriteMealLocal(meal);
    return success ? meal.id : null;
  }

  const { data, error } = await supabase
    .from('favorite_meals')
    .insert({
      user_id: user.id,
      name: meal.name,
      description: meal.description,
      ingredients: meal.ingredients,
      instructions: meal.instructions,
      image_url: meal.imageUrl,
      source: meal.source || 'generated',
      is_public: meal.isPublic || false,
      upload_status: 'complete',
      servings: meal.servings || 4, // Default to 4 servings if not specified
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving favorite:', error);
    return null;
  }

  // Auto-tag the recipe if requested and we have a valid ID
  if (autoTag && data?.id) {
    try {
      const tagResult = await autoTagRecipe({
        name: meal.name,
        description: meal.description,
        ingredients: meal.ingredients,
      });

      if (tagResult.tags.length > 0) {
        await assignTagsToRecipe(data.id, tagResult.tags);
      }
    } catch (tagError) {
      console.error('Error auto-tagging recipe:', tagError);
      // Don't fail the save if tagging fails
    }
  }

  return data?.id || null;
};

export const getFavoriteMeals = async (): Promise<Meal[]> => {
  if (!isSupabaseConfigured()) {
    return getFavoriteMealsLocal();
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return getFavoriteMealsLocal();

  const { data, error } = await supabase
    .from('favorite_meals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading favorites:', error);
    return getFavoriteMealsLocal();
  }

  // Fetch tags for each recipe
  const mealsWithTags = await Promise.all(
    (data || []).map(async (row) => {
      const tags = await getRecipeTags(row.id);
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        ingredients: row.ingredients,
        instructions: row.instructions,
        servings: row.servings || 4, // Default to 4 if not set
        isFavorite: true,
        imageUrl: row.image_url,
        source: row.source as 'generated' | 'uploaded' | undefined,
        isPublic: row.is_public,
        uploadStatus: row.upload_status,
        userId: row.user_id,
        ownerName: row.owner_name,
        createdAt: row.created_at,
        tags,
      };
    })
  );

  return mealsWithTags;
};

export const removeFavoriteMeal = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    removeFavoriteMealLocal(id);
    return true;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    removeFavoriteMealLocal(id);
    return true;
  }

  const { error } = await supabase
    .from('favorite_meals')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting favorite meal:', error);
    return false;
  }

  return true;
};

/**
 * Update a favorite meal's image URL
 */
export const updateFavoriteMealImage = async (id: string, imageUrl: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    // Update in local storage
    const favorites = getFavoriteMealsLocal();
    const updated = favorites.map(f => f.id === id ? { ...f, imageUrl } : f);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
    return true;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const favorites = getFavoriteMealsLocal();
    const updated = favorites.map(f => f.id === id ? { ...f, imageUrl } : f);
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
    return true;
  }

  const { error } = await supabase
    .from('favorite_meals')
    .update({ image_url: imageUrl })
    .eq('id', id)
    .eq('user_id', user.id); // Ensure user owns this recipe

  if (error) {
    console.error('Error updating favorite image:', error);
    return false;
  }

  console.log('Image saved to database for meal:', id);
  return true;
};

// ============================================
// CONFIG - Supabase with LocalStorage fallback
// ============================================

export const saveConfig = async (config: MealConfig): Promise<void> => {
  // Always save locally for sync
  saveConfigLocal(config);

  if (!isSupabaseConfigured()) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('meal_configs').upsert({
    user_id: user.id,
    days: config.days,
    people_count: config.peopleCount,
    include_breakfast: config.includeBreakfast,
    include_lunch: config.includeLunch,
    include_dinner: config.includeDinner,
    use_what_i_have: config.useWhatIHave || false,
  }, { onConflict: 'user_id' });
};

export const loadConfig = async (fallback: MealConfig, overrideUserId?: string): Promise<MealConfig> => {
  if (!isSupabaseConfigured()) {
    return loadConfigLocal(fallback);
  }

  // Use override userId for impersonation, otherwise get current user
  let userId = overrideUserId;
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return loadConfigLocal(fallback);
    userId = user.id;
  }

  const { data, error } = await supabase
    .from('meal_configs')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error loading config:', error);
    return loadConfigLocal(fallback);
  }
  if (!data) return loadConfigLocal(fallback);

  return {
    days: data.days,
    peopleCount: data.people_count,
    includeBreakfast: data.include_breakfast,
    includeLunch: data.include_lunch,
    includeDinner: data.include_dinner,
    useWhatIHave: data.use_what_i_have || false,
  };
};

// ============================================
// PREFERENCES - Supabase with LocalStorage fallback
// ============================================

export const savePreferences = async (prefs: UserPreferences): Promise<void> => {
  // Always save locally for sync
  savePreferencesLocal(prefs);

  if (!isSupabaseConfigured()) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('user_preferences').upsert({
    user_id: user.id,
    dietary_restrictions: prefs.dietaryRestrictions,
    likes: prefs.likes,
    dislikes: prefs.dislikes,
    unit_system: prefs.unitSystem,
    temperature_scale: prefs.temperatureScale,
  }, { onConflict: 'user_id' });
};

export const loadPreferences = async (fallback: UserPreferences, overrideUserId?: string): Promise<UserPreferences> => {
  if (!isSupabaseConfigured()) {
    return loadPreferencesLocal(fallback);
  }

  // Use override userId for impersonation, otherwise get current user
  let userId = overrideUserId;
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return loadPreferencesLocal(fallback);
    userId = user.id;
  }

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error loading preferences:', error);
    return loadPreferencesLocal(fallback);
  }
  if (!data) return loadPreferencesLocal(fallback);

  return {
    dietaryRestrictions: data.dietary_restrictions,
    likes: data.likes,
    dislikes: data.dislikes,
    unitSystem: data.unit_system,
    temperatureScale: data.temperature_scale,
  };
};

// ============================================
// MEAL PLAN HISTORY - Supabase with LocalStorage fallback
// ============================================

export const savePlanToHistory = async (plan: MealPlanResponse): Promise<string | null> => {
  // Always save locally
  savePlanToHistoryLocal(plan);

  if (!isSupabaseConfigured()) return null;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('meal_plan_history')
    .insert({
      user_id: user.id,
      plan_data: plan,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving plan to history:', error);
    return null;
  }
  return data?.id || null;
};

export const getPlanHistory = async (): Promise<MealPlanResponse[]> => {
  if (!isSupabaseConfigured()) {
    return getPlanHistoryLocal();
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return getPlanHistoryLocal();

  const { data, error } = await supabase
    .from('meal_plan_history')
    .select('plan_data')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(CONSTANTS.MAX_HISTORY_ENTRIES);

  if (error) {
    console.error('Error loading history:', error);
    return getPlanHistoryLocal();
  }

  return (data || []).map(row => row.plan_data as MealPlanResponse);
};

// ============================================
// SHOPPING LIST STATE - Supabase with LocalStorage fallback
// ============================================

export const saveCheckedItems = async (
  planId: string | null,
  checkedItems: Record<string, boolean>
): Promise<void> => {
  // Always save locally
  localStorage.setItem('kiwi_checked_items', JSON.stringify(checkedItems));

  if (!isSupabaseConfigured() || !planId) return;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from('shopping_list_state').upsert({
    user_id: user.id,
    plan_id: planId,
    checked_items: checkedItems,
  }, { onConflict: 'user_id,plan_id' });
};

export const loadCheckedItems = async (planId: string | null): Promise<Record<string, boolean>> => {
  const localData = safeParse(localStorage.getItem('kiwi_checked_items'), {});

  if (!isSupabaseConfigured() || !planId) {
    return localData;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return localData;

  const { data, error } = await supabase
    .from('shopping_list_state')
    .select('checked_items')
    .eq('user_id', user.id)
    .eq('plan_id', planId)
    .maybeSingle();

  if (error) {
    console.error('Error loading checked items:', error);
    return localData;
  }
  if (!data) return localData;
  return (data.checked_items as Record<string, boolean>) || {};
};

// ============================================
// IMAGE CACHE - Supabase (Global cache)
// ============================================

export const getCachedImage = async (mealName: string): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await supabase
    .from('meal_image_cache')
    .select('image_data')
    .eq('meal_name', mealName)
    .maybeSingle();

  if (error) {
    console.error('Error loading cached image:', error);
    return null;
  }
  return data?.image_data || null;
};

export const cacheImage = async (mealName: string, description: string, imageData: string): Promise<void> => {
  if (!isSupabaseConfigured()) return;

  await supabase.from('meal_image_cache').upsert({
    meal_name: mealName,
    meal_description: description,
    image_data: imageData,
  }, { onConflict: 'meal_name' });
};

// ============================================
// SAVED MEAL PLANS - Supabase with LocalStorage fallback
// ============================================

export const saveMealPlan = async (
  plan: MealPlanResponse,
  name: string
): Promise<SavedMealPlan | null> => {
  const savedPlan: SavedMealPlan = {
    id: generateId(),
    name,
    weeklyPlan: plan.weeklyPlan,
    shoppingList: plan.shoppingList,
    createdAt: new Date().toISOString(),
  };

  if (!isSupabaseConfigured()) {
    saveMealPlanLocal(savedPlan);
    return savedPlan;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    saveMealPlanLocal(savedPlan);
    return savedPlan;
  }

  const { data, error } = await supabase
    .from('saved_meal_plans')
    .insert({
      user_id: user.id,
      name,
      weekly_plan: plan.weeklyPlan,
      shopping_list: plan.shoppingList,
    })
    .select('id, created_at')
    .single();

  if (error) {
    console.error('Error saving meal plan:', error);
    saveMealPlanLocal(savedPlan);
    return savedPlan;
  }

  return {
    ...savedPlan,
    id: data.id,
    createdAt: data.created_at,
    userId: user.id,
  };
};

export const getSavedMealPlans = async (): Promise<SavedMealPlan[]> => {
  if (!isSupabaseConfigured()) {
    return getSavedMealPlansLocal();
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return getSavedMealPlansLocal();

  const { data, error } = await supabase
    .from('saved_meal_plans')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error loading saved plans:', error);
    return getSavedMealPlansLocal();
  }

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    weeklyPlan: row.weekly_plan,
    shoppingList: row.shopping_list,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
  }));
};

export const deleteSavedMealPlan = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured()) {
    deleteSavedMealPlanLocal(id);
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    deleteSavedMealPlanLocal(id);
    return;
  }

  await supabase.from('saved_meal_plans').delete().eq('id', id);
};

export const updateSavedMealPlanName = async (id: string, name: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    updateSavedMealPlanNameLocal(id, name);
    return true;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    updateSavedMealPlanNameLocal(id, name);
    return true;
  }

  const { error } = await supabase
    .from('saved_meal_plans')
    .update({ name, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Failed to update meal plan name:', error);
    return false;
  }

  return true;
};

// Local storage helpers for saved plans
const saveMealPlanLocal = (plan: SavedMealPlan): void => {
  const plans = getSavedMealPlansLocal();
  safeSetItem(STORAGE_KEYS.SAVED_PLANS, JSON.stringify([plan, ...plans]));
};

const getSavedMealPlansLocal = (): SavedMealPlan[] => {
  return safeParse(safeGetItem(STORAGE_KEYS.SAVED_PLANS), []);
};

const deleteSavedMealPlanLocal = (id: string): void => {
  const plans = getSavedMealPlansLocal();
  safeSetItem(STORAGE_KEYS.SAVED_PLANS, JSON.stringify(plans.filter(p => p.id !== id)));
};

const updateSavedMealPlanNameLocal = (id: string, name: string): void => {
  const plans = getSavedMealPlansLocal();
  const updatedPlans = plans.map(p =>
    p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p
  );
  safeSetItem(STORAGE_KEYS.SAVED_PLANS, JSON.stringify(updatedPlans));
};

// ============================================
// LOCAL STORAGE FALLBACK HELPERS
// ============================================

const loadPantryLocal = (): PantryItem[] => {
  return safeParse(safeGetItem(STORAGE_KEYS.PANTRY), []);
};

const savePantryLocal = (items: PantryItem[]): void => {
  safeSetItem(STORAGE_KEYS.PANTRY, JSON.stringify(items));
};

const saveFavoriteMealLocal = (meal: Meal): boolean => {
  const favorites = getFavoriteMealsLocal();
  const mealId = meal.id || generateId();
  if (!favorites.some(f => f.id === mealId)) {
    const newMeal = { ...meal, isFavorite: true, id: mealId };
    safeSetItem(STORAGE_KEYS.FAVORITES, JSON.stringify([...favorites, newMeal]));
    return true;
  }
  return false;
};

const getFavoriteMealsLocal = (): Meal[] => {
  return safeParse(safeGetItem(STORAGE_KEYS.FAVORITES), []);
};

const removeFavoriteMealLocal = (id: string): void => {
  const favorites = getFavoriteMealsLocal();
  const updated = favorites.filter(f => f.id !== id);
  safeSetItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
};

const saveConfigLocal = (config: MealConfig): void => {
  safeSetItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
};

const loadConfigLocal = (fallback: MealConfig): MealConfig => {
  return safeParse(safeGetItem(STORAGE_KEYS.CONFIG), fallback);
};

const savePreferencesLocal = (prefs: UserPreferences): void => {
  safeSetItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
};

const loadPreferencesLocal = (fallback: UserPreferences): UserPreferences => {
  return safeParse(safeGetItem(STORAGE_KEYS.PREFERENCES), fallback);
};

const savePlanToHistoryLocal = (plan: MealPlanResponse): void => {
  const history = getPlanHistoryLocal();
  const updated = [plan, ...history].slice(0, CONSTANTS.MAX_HISTORY_ENTRIES);
  safeSetItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
};

const getPlanHistoryLocal = (): MealPlanResponse[] => {
  return safeParse(safeGetItem(STORAGE_KEYS.HISTORY), []);
};

// ============================================
// DATA MIGRATION (Export/Import)
// ============================================

export const getAllUserData = () => {
  const defaultConfig: MealConfig = {
    days: 5,
    peopleCount: 2,
    includeBreakfast: true,
    includeLunch: true,
    includeDinner: true,
  };
  const defaultPrefs: UserPreferences = {
    dietaryRestrictions: '',
    likes: '',
    dislikes: '',
    unitSystem: 'metric',
    temperatureScale: 'celsius',
  };

  return {
    favorites: getFavoriteMealsLocal(),
    pantry: loadPantryLocal(),
    config: loadConfigLocal(defaultConfig),
    preferences: loadPreferencesLocal(defaultPrefs),
    history: getPlanHistoryLocal(),
    timestamp: new Date().toISOString(),
  };
};

export const restoreUserData = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    if (!data || typeof data !== 'object') return false;

    if (data.favorites) localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(data.favorites));
    if (data.pantry) localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(data.pantry));
    if (data.config) localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(data.config));
    if (data.preferences) localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(data.preferences));
    if (data.history) localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(data.history));

    return true;
  } catch (e) {
    console.error("Restore failed:", e);
    return false;
  }
};

export const clearLocalStorage = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  localStorage.removeItem('kiwi_checked_items');
};

export const hasLocalData = (): boolean => {
  return Object.values(STORAGE_KEYS).some(key => localStorage.getItem(key) !== null);
};

// ============================================
// ADMIN DATA FUNCTIONS
// ============================================

export const exportAllData = async () => {
  return getAllUserData();
};

export const importData = async (data: any): Promise<void> => {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data format');
  }
  restoreUserData(JSON.stringify(data));
};

export const clearAllData = async (): Promise<void> => {
  clearLocalStorage();
};
