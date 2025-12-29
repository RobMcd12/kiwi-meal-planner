import { supabase, isSupabaseConfigured } from './authService';
import { getAllUserData, clearLocalStorage, hasLocalData } from './storageService';

/**
 * Check if user has local data that needs migration
 */
export const checkForLocalData = (): boolean => {
  return hasLocalData();
};

/**
 * Migrate all local data to Supabase for the authenticated user
 */
export const migrateLocalDataToSupabase = async (userId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    console.warn('Supabase not configured, cannot migrate');
    return false;
  }

  try {
    const localData = getAllUserData();

    // Migrate config
    if (localData.config) {
      await supabase.from('meal_configs').upsert({
        user_id: userId,
        days: localData.config.days,
        people_count: localData.config.peopleCount,
        include_breakfast: localData.config.includeBreakfast,
        include_lunch: localData.config.includeLunch,
        include_dinner: localData.config.includeDinner,
      }, { onConflict: 'user_id' });
    }

    // Migrate preferences
    if (localData.preferences) {
      await supabase.from('user_preferences').upsert({
        user_id: userId,
        dietary_restrictions: localData.preferences.dietaryRestrictions,
        likes: localData.preferences.likes,
        dislikes: localData.preferences.dislikes,
        unit_system: localData.preferences.unitSystem,
        temperature_scale: localData.preferences.temperatureScale,
      }, { onConflict: 'user_id' });
    }

    // Migrate pantry items
    if (localData.pantry && localData.pantry.length > 0) {
      const pantryInserts = localData.pantry.map(item => ({
        user_id: userId,
        name: item.name,
      }));

      // Use upsert to handle duplicates gracefully
      for (const item of pantryInserts) {
        await supabase.from('pantry_items').upsert(item, {
          onConflict: 'user_id,name'
        });
      }
    }

    // Migrate favorites
    if (localData.favorites && localData.favorites.length > 0) {
      for (const meal of localData.favorites) {
        await supabase.from('favorite_meals').insert({
          user_id: userId,
          name: meal.name,
          description: meal.description,
          ingredients: meal.ingredients,
          instructions: meal.instructions,
          image_url: meal.imageUrl,
        });
      }
    }

    // Migrate history (latest plans)
    if (localData.history && localData.history.length > 0) {
      for (const plan of localData.history) {
        await supabase.from('meal_plan_history').insert({
          user_id: userId,
          plan_data: plan,
        });
      }
    }

    // Clear local storage after successful migration
    clearLocalStorage();

    return true;
  } catch (error) {
    console.error('Migration failed:', error);
    return false;
  }
};

/**
 * Get migration status message for UI
 */
export const getMigrationSummary = (): string => {
  const data = getAllUserData();

  const items: string[] = [];

  if (data.favorites.length > 0) {
    items.push(`${data.favorites.length} favorite meal${data.favorites.length > 1 ? 's' : ''}`);
  }

  if (data.pantry.length > 0) {
    items.push(`${data.pantry.length} pantry item${data.pantry.length > 1 ? 's' : ''}`);
  }

  if (data.history.length > 0) {
    items.push(`${data.history.length} meal plan${data.history.length > 1 ? 's' : ''}`);
  }

  if (data.config.days !== 5 || data.config.peopleCount !== 2) {
    items.push('your settings');
  }

  if (data.preferences.dietaryRestrictions || data.preferences.likes || data.preferences.dislikes) {
    items.push('your preferences');
  }

  if (items.length === 0) {
    return 'No data to migrate';
  }

  return `Found: ${items.join(', ')}`;
};
