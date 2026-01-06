import { supabase, isSupabaseConfigured } from './authService';

// ============================================
// TYPES
// ============================================

export interface RecipeCategory {
  id: string;
  userId: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecipeCategoryAssignment {
  mealId: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
}

// Local storage key for categories
const STORAGE_KEY = 'kiwi_recipe_categories';
const ASSIGNMENTS_KEY = 'kiwi_recipe_category_assignments';

// ============================================
// LOCAL STORAGE HELPERS
// ============================================

const getCategoriesLocal = (): RecipeCategory[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveCategoriesLocal = (categories: RecipeCategory[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
};

const getAssignmentsLocal = (): { mealId: string; categoryId: string }[] => {
  try {
    const data = localStorage.getItem(ASSIGNMENTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveAssignmentsLocal = (assignments: { mealId: string; categoryId: string }[]): void => {
  localStorage.setItem(ASSIGNMENTS_KEY, JSON.stringify(assignments));
};

// ============================================
// CATEGORY CRUD OPERATIONS
// ============================================

/**
 * Get all categories for the current user
 */
export const getUserCategories = async (userId: string): Promise<RecipeCategory[]> => {
  if (!isSupabaseConfigured()) {
    return getCategoriesLocal().filter(c => c.userId === userId);
  }

  const { data, error } = await supabase
    .from('user_recipe_categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching user categories:', error);
    return getCategoriesLocal().filter(c => c.userId === userId);
  }

  return (data || []).map(row => ({
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color || 'slate',
    sortOrder: row.sort_order || 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
};

/**
 * Create a new category
 */
export const createCategory = async (
  userId: string,
  name: string,
  color: string = 'slate'
): Promise<RecipeCategory | null> => {
  const trimmedName = name.trim();
  if (!trimmedName) return null;

  if (!isSupabaseConfigured()) {
    const categories = getCategoriesLocal();
    const newCategory: RecipeCategory = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      name: trimmedName,
      color,
      sortOrder: categories.filter(c => c.userId === userId).length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveCategoriesLocal([...categories, newCategory]);
    return newCategory;
  }

  const { data, error } = await supabase
    .from('user_recipe_categories')
    .insert({
      user_id: userId,
      name: trimmedName,
      color
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    name: data.name,
    color: data.color || 'slate',
    sortOrder: data.sort_order || 0,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

/**
 * Update a category
 */
export const updateCategory = async (
  categoryId: string,
  updates: { name?: string; color?: string; sortOrder?: number }
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const categories = getCategoriesLocal();
    const index = categories.findIndex(c => c.id === categoryId);
    if (index === -1) return false;

    categories[index] = {
      ...categories[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    saveCategoriesLocal(categories);
    return true;
  }

  const updateData: Record<string, unknown> = {};
  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.color !== undefined) updateData.color = updates.color;
  if (updates.sortOrder !== undefined) updateData.sort_order = updates.sortOrder;

  const { error } = await supabase
    .from('user_recipe_categories')
    .update(updateData)
    .eq('id', categoryId);

  if (error) {
    console.error('Error updating category:', error);
    return false;
  }

  return true;
};

/**
 * Delete a category (also removes all assignments)
 */
export const deleteCategory = async (categoryId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const categories = getCategoriesLocal();
    saveCategoriesLocal(categories.filter(c => c.id !== categoryId));

    const assignments = getAssignmentsLocal();
    saveAssignmentsLocal(assignments.filter(a => a.categoryId !== categoryId));
    return true;
  }

  const { error } = await supabase
    .from('user_recipe_categories')
    .delete()
    .eq('id', categoryId);

  if (error) {
    console.error('Error deleting category:', error);
    return false;
  }

  return true;
};

// ============================================
// RECIPE CATEGORY ASSIGNMENTS
// ============================================

/**
 * Get all category assignments for a recipe
 */
export const getRecipeCategories = async (mealId: string): Promise<RecipeCategoryAssignment[]> => {
  if (!isSupabaseConfigured()) {
    const assignments = getAssignmentsLocal().filter(a => a.mealId === mealId);
    const categories = getCategoriesLocal();

    return assignments.map(a => {
      const category = categories.find(c => c.id === a.categoryId);
      return {
        mealId: a.mealId,
        categoryId: a.categoryId,
        categoryName: category?.name || '',
        categoryColor: category?.color || 'slate'
      };
    }).filter(a => a.categoryName);
  }

  const { data, error } = await supabase
    .from('recipe_category_assignments')
    .select(`
      meal_id,
      category_id,
      user_recipe_categories (
        name,
        color
      )
    `)
    .eq('meal_id', mealId);

  if (error) {
    console.error('Error fetching recipe categories:', error);
    return [];
  }

  return (data || []).map(row => {
    const categoryData = row.user_recipe_categories as unknown as { name: string; color: string } | null;
    return {
      mealId: row.meal_id,
      categoryId: row.category_id,
      categoryName: categoryData?.name || '',
      categoryColor: categoryData?.color || 'slate'
    };
  });
};

/**
 * Get category assignments for multiple recipes at once
 */
export const getBatchRecipeCategories = async (
  mealIds: string[]
): Promise<Record<string, RecipeCategoryAssignment[]>> => {
  if (mealIds.length === 0) return {};

  if (!isSupabaseConfigured()) {
    const assignments = getAssignmentsLocal();
    const categories = getCategoriesLocal();

    const result: Record<string, RecipeCategoryAssignment[]> = {};
    for (const mealId of mealIds) {
      const mealAssignments = assignments.filter(a => a.mealId === mealId);
      result[mealId] = mealAssignments.map(a => {
        const category = categories.find(c => c.id === a.categoryId);
        return {
          mealId: a.mealId,
          categoryId: a.categoryId,
          categoryName: category?.name || '',
          categoryColor: category?.color || 'slate'
        };
      }).filter(a => a.categoryName);
    }
    return result;
  }

  const { data, error } = await supabase
    .from('recipe_category_assignments')
    .select(`
      meal_id,
      category_id,
      user_recipe_categories (
        name,
        color
      )
    `)
    .in('meal_id', mealIds);

  if (error) {
    console.error('Error fetching batch recipe categories:', error);
    return {};
  }

  const result: Record<string, RecipeCategoryAssignment[]> = {};
  for (const row of data || []) {
    const mealId = row.meal_id;
    if (!result[mealId]) result[mealId] = [];
    const categoryData = row.user_recipe_categories as unknown as { name: string; color: string } | null;
    result[mealId].push({
      mealId: row.meal_id,
      categoryId: row.category_id,
      categoryName: categoryData?.name || '',
      categoryColor: categoryData?.color || 'slate'
    });
  }

  return result;
};

/**
 * Assign categories to a recipe (replaces existing assignments)
 */
export const assignCategoriesToRecipe = async (
  mealId: string,
  categoryIds: string[]
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const assignments = getAssignmentsLocal().filter(a => a.mealId !== mealId);
    const newAssignments = categoryIds.map(categoryId => ({ mealId, categoryId }));
    saveAssignmentsLocal([...assignments, ...newAssignments]);
    return true;
  }

  // First, remove existing assignments
  const { error: deleteError } = await supabase
    .from('recipe_category_assignments')
    .delete()
    .eq('meal_id', mealId);

  if (deleteError) {
    console.error('Error removing existing category assignments:', deleteError);
    return false;
  }

  // If no new categories to assign, we're done
  if (categoryIds.length === 0) return true;

  // Insert new assignments
  const { error: insertError } = await supabase
    .from('recipe_category_assignments')
    .insert(
      categoryIds.map(categoryId => ({
        meal_id: mealId,
        category_id: categoryId
      }))
    );

  if (insertError) {
    console.error('Error assigning categories:', insertError);
    return false;
  }

  return true;
};

/**
 * Add a single category to a recipe
 */
export const addCategoryToRecipe = async (
  mealId: string,
  categoryId: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const assignments = getAssignmentsLocal();
    if (assignments.some(a => a.mealId === mealId && a.categoryId === categoryId)) {
      return true; // Already assigned
    }
    saveAssignmentsLocal([...assignments, { mealId, categoryId }]);
    return true;
  }

  const { error } = await supabase
    .from('recipe_category_assignments')
    .insert({ meal_id: mealId, category_id: categoryId })
    .select();

  if (error) {
    // Ignore duplicate key errors
    if (error.code === '23505') return true;
    console.error('Error adding category to recipe:', error);
    return false;
  }

  return true;
};

/**
 * Remove a single category from a recipe
 */
export const removeCategoryFromRecipe = async (
  mealId: string,
  categoryId: string
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const assignments = getAssignmentsLocal();
    saveAssignmentsLocal(
      assignments.filter(a => !(a.mealId === mealId && a.categoryId === categoryId))
    );
    return true;
  }

  const { error } = await supabase
    .from('recipe_category_assignments')
    .delete()
    .eq('meal_id', mealId)
    .eq('category_id', categoryId);

  if (error) {
    console.error('Error removing category from recipe:', error);
    return false;
  }

  return true;
};

/**
 * Get all recipes in a specific category
 */
export const getRecipesInCategory = async (categoryId: string): Promise<string[]> => {
  if (!isSupabaseConfigured()) {
    return getAssignmentsLocal()
      .filter(a => a.categoryId === categoryId)
      .map(a => a.mealId);
  }

  const { data, error } = await supabase
    .from('recipe_category_assignments')
    .select('meal_id')
    .eq('category_id', categoryId);

  if (error) {
    console.error('Error fetching recipes in category:', error);
    return [];
  }

  return (data || []).map(row => row.meal_id);
};
