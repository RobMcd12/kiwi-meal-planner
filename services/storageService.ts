import { supabase, isSupabaseConfigured } from './authService';
import type { Meal, MealPlanResponse, MealConfig, UserPreferences, PantryItem } from '../types';
import { CONSTANTS } from '../types';
import { autoTagRecipe } from './geminiService';
import { assignTagsToRecipe, getRecipeTags } from './recipeService';

// ============================================
// LOCAL STORAGE KEYS (for fallback/migration)
// ============================================

const STORAGE_KEYS = {
  FAVORITES: 'kiwi_meal_planner_favorites',
  HISTORY: 'kiwi_meal_planner_history',
  CONFIG: 'kiwi_meal_planner_config',
  PREFERENCES: 'kiwi_meal_planner_preferences',
  PANTRY: 'kiwi_meal_planner_pantry',
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
// PANTRY - Supabase with LocalStorage fallback
// ============================================

export const savePantryItem = async (name: string): Promise<PantryItem | null> => {
  if (!isSupabaseConfigured()) {
    const items = loadPantryLocal();
    const newItem: PantryItem = { id: generateId(), name };
    if (!items.some(item => item.name.toLowerCase() === name.toLowerCase())) {
      savePantryLocal([...items, newItem]);
      return newItem;
    }
    return null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const items = loadPantryLocal();
    const newItem: PantryItem = { id: generateId(), name };
    if (!items.some(item => item.name.toLowerCase() === name.toLowerCase())) {
      savePantryLocal([...items, newItem]);
      return newItem;
    }
    return null;
  }

  const { data, error } = await supabase
    .from('pantry_items')
    .insert({ user_id: user.id, name })
    .select('id, name')
    .single();

  if (error) {
    console.error('Error saving pantry item:', error);
    return null;
  }
  return data;
};

export const loadPantry = async (): Promise<PantryItem[]> => {
  if (!isSupabaseConfigured()) {
    return loadPantryLocal();
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return loadPantryLocal();

  const { data, error } = await supabase
    .from('pantry_items')
    .select('id, name')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading pantry:', error);
    return loadPantryLocal();
  }
  return data || [];
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

// Sync function for bulk pantry operations
export const savePantry = async (items: PantryItem[]): Promise<void> => {
  savePantryLocal(items);
};

// ============================================
// FAVORITES - Supabase with LocalStorage fallback
// ============================================

export const saveFavoriteMeal = async (meal: Meal, autoTag: boolean = true): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return saveFavoriteMealLocal(meal);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return saveFavoriteMealLocal(meal);

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
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving favorite:', error);
    return false;
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

  return true;
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

export const removeFavoriteMeal = async (id: string): Promise<void> => {
  if (!isSupabaseConfigured()) {
    removeFavoriteMealLocal(id);
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    removeFavoriteMealLocal(id);
    return;
  }

  await supabase.from('favorite_meals').delete().eq('id', id);
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
  }, { onConflict: 'user_id' });
};

export const loadConfig = async (fallback: MealConfig): Promise<MealConfig> => {
  if (!isSupabaseConfigured()) {
    return loadConfigLocal(fallback);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return loadConfigLocal(fallback);

  const { data, error } = await supabase
    .from('meal_configs')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return loadConfigLocal(fallback);

  return {
    days: data.days,
    peopleCount: data.people_count,
    includeBreakfast: data.include_breakfast,
    includeLunch: data.include_lunch,
    includeDinner: data.include_dinner,
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

export const loadPreferences = async (fallback: UserPreferences): Promise<UserPreferences> => {
  if (!isSupabaseConfigured()) {
    return loadPreferencesLocal(fallback);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return loadPreferencesLocal(fallback);

  const { data, error } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error || !data) return loadPreferencesLocal(fallback);

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
    .single();

  if (error || !data) return localData;
  return (data.checked_items as Record<string, boolean>) || {};
};

// ============================================
// IMAGE CACHE - Supabase (Global cache)
// ============================================

export const getCachedImage = async (mealName: string): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;

  const { data } = await supabase
    .from('meal_image_cache')
    .select('image_data')
    .eq('meal_name', mealName)
    .single();

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
// LOCAL STORAGE FALLBACK HELPERS
// ============================================

const loadPantryLocal = (): PantryItem[] => {
  return safeParse(localStorage.getItem(STORAGE_KEYS.PANTRY), []);
};

const savePantryLocal = (items: PantryItem[]): void => {
  localStorage.setItem(STORAGE_KEYS.PANTRY, JSON.stringify(items));
};

const saveFavoriteMealLocal = (meal: Meal): boolean => {
  const favorites = getFavoriteMealsLocal();
  const mealId = meal.id || generateId();
  if (!favorites.some(f => f.id === mealId)) {
    const newMeal = { ...meal, isFavorite: true, id: mealId };
    localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify([...favorites, newMeal]));
    return true;
  }
  return false;
};

const getFavoriteMealsLocal = (): Meal[] => {
  return safeParse(localStorage.getItem(STORAGE_KEYS.FAVORITES), []);
};

const removeFavoriteMealLocal = (id: string): void => {
  const favorites = getFavoriteMealsLocal();
  const updated = favorites.filter(f => f.id !== id);
  localStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(updated));
};

const saveConfigLocal = (config: MealConfig): void => {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
};

const loadConfigLocal = (fallback: MealConfig): MealConfig => {
  return safeParse(localStorage.getItem(STORAGE_KEYS.CONFIG), fallback);
};

const savePreferencesLocal = (prefs: UserPreferences): void => {
  localStorage.setItem(STORAGE_KEYS.PREFERENCES, JSON.stringify(prefs));
};

const loadPreferencesLocal = (fallback: UserPreferences): UserPreferences => {
  return safeParse(localStorage.getItem(STORAGE_KEYS.PREFERENCES), fallback);
};

const savePlanToHistoryLocal = (plan: MealPlanResponse): void => {
  const history = getPlanHistoryLocal();
  const updated = [plan, ...history].slice(0, CONSTANTS.MAX_HISTORY_ENTRIES);
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
};

const getPlanHistoryLocal = (): MealPlanResponse[] => {
  return safeParse(localStorage.getItem(STORAGE_KEYS.HISTORY), []);
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
