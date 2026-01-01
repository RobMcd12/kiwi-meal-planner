import { supabase, isSupabaseConfigured } from './authService';
import { Meal, RecipeTag, RecipeNote, RecipeComment, ExtractedRecipe } from '../types';
import { autoTagRecipe } from './geminiService';

// ============================================
// TAG FUNCTIONS
// ============================================

/**
 * Get all available tags
 */
export const getAllTags = async (): Promise<RecipeTag[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('recipe_tags')
      .select('*')
      .order('category')
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('Error fetching tags:', err);
    return [];
  }
};

/**
 * Get tags for a specific recipe
 */
export const getRecipeTags = async (mealId: string): Promise<string[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('recipe_tag_assignments')
      .select('tag_id, recipe_tags(name)')
      .eq('meal_id', mealId);

    if (error) throw error;
    return data?.map((d: any) => d.recipe_tags?.name).filter(Boolean) || [];
  } catch (err) {
    console.error('Error fetching recipe tags:', err);
    return [];
  }
};

/**
 * Assign tags to a recipe
 */
export const assignTagsToRecipe = async (mealId: string, tagNames: string[]): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    // First, get tag IDs from names
    const { data: tags, error: tagError } = await supabase
      .from('recipe_tags')
      .select('id, name')
      .in('name', tagNames);

    if (tagError) throw tagError;

    // Remove existing tag assignments
    await supabase
      .from('recipe_tag_assignments')
      .delete()
      .eq('meal_id', mealId);

    // Insert new assignments
    if (tags && tags.length > 0) {
      const assignments = tags.map(tag => ({
        meal_id: mealId,
        tag_id: tag.id
      }));

      const { error: assignError } = await supabase
        .from('recipe_tag_assignments')
        .insert(assignments);

      if (assignError) throw assignError;
    }

    return true;
  } catch (err) {
    console.error('Error assigning tags:', err);
    return false;
  }
};

/**
 * Create a custom tag if it doesn't exist
 */
export const createCustomTag = async (tagName: string, category: string = 'other'): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data, error } = await supabase
      .from('recipe_tags')
      .upsert({ name: tagName, category }, { onConflict: 'name' })
      .select('id')
      .single();

    if (error) throw error;
    return data?.id || null;
  } catch (err) {
    console.error('Error creating tag:', err);
    return null;
  }
};

// ============================================
// NOTE FUNCTIONS
// ============================================

/**
 * Get notes for a recipe
 */
export const getRecipeNotes = async (mealId: string): Promise<RecipeNote[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Get user's own note + public notes from others
    const { data, error } = await supabase
      .from('recipe_notes')
      .select('*, profiles(full_name)')
      .eq('meal_id', mealId);

    if (error) throw error;

    return (data || []).map((note: any) => ({
      id: note.id,
      mealId: note.meal_id,
      userId: note.user_id,
      noteText: note.note_text,
      isPublic: note.is_public,
      createdAt: note.created_at,
      updatedAt: note.updated_at,
      userName: note.profiles?.full_name || 'Anonymous',
      isOwn: note.user_id === user?.id
    }));
  } catch (err) {
    console.error('Error fetching notes:', err);
    return [];
  }
};

/**
 * Save or update a note for a recipe
 * Now supports separate private and public notes per user
 */
export const saveRecipeNote = async (
  mealId: string,
  noteText: string,
  isPublic: boolean = false
): Promise<RecipeNote | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if a note of this type already exists
    const { data: existing } = await supabase
      .from('recipe_notes')
      .select('id')
      .eq('meal_id', mealId)
      .eq('user_id', user.id)
      .eq('is_public', isPublic)
      .single();

    let data, error;

    if (existing) {
      // Update existing note
      const result = await supabase
        .from('recipe_notes')
        .update({
          note_text: noteText,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Insert new note
      const result = await supabase
        .from('recipe_notes')
        .insert({
          meal_id: mealId,
          user_id: user.id,
          note_text: noteText,
          is_public: isPublic
        })
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) throw error;

    return {
      id: data.id,
      mealId: data.meal_id,
      userId: data.user_id,
      noteText: data.note_text,
      isPublic: data.is_public,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  } catch (err) {
    console.error('Error saving note:', err);
    return null;
  }
};

/**
 * Delete a note
 */
export const deleteRecipeNote = async (noteId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('recipe_notes')
      .delete()
      .eq('id', noteId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting note:', err);
    return false;
  }
};

// ============================================
// PUBLIC RECIPE FUNCTIONS
// ============================================

/**
 * Toggle recipe public/private status
 */
export const toggleRecipePublic = async (mealId: string, isPublic: boolean): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get user's display name for owner_name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const { error } = await supabase
      .from('favorite_meals')
      .update({
        is_public: isPublic,
        owner_name: isPublic ? (profile?.full_name || 'Anonymous') : null
      })
      .eq('id', mealId)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error toggling public status:', err);
    return false;
  }
};

/**
 * Get public recipes from all users
 */
export const getPublicRecipes = async (): Promise<Meal[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('favorite_meals')
      .select(`
        *,
        recipe_videos(id, processing_status)
      `)
      .eq('is_public', true)
      .neq('user_id', user?.id || '') // Exclude own recipes
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch tags for each recipe
    const recipesWithTags = await Promise.all(
      (data || []).map(async (meal: any) => {
        const tags = await getRecipeTags(meal.id);
        const video = meal.recipe_videos?.[0];
        return {
          id: meal.id,
          name: meal.name,
          description: meal.description,
          ingredients: meal.ingredients,
          instructions: meal.instructions,
          imageUrl: meal.image_url,
          source: meal.source as 'generated' | 'uploaded',
          isPublic: meal.is_public,
          userId: meal.user_id,
          ownerName: meal.owner_name,
          createdAt: meal.created_at,
          tags,
          isFavorite: false,
          videoId: video?.id,
          hasVideo: video?.processing_status === 'complete',
        };
      })
    );

    return recipesWithTags;
  } catch (err) {
    console.error('Error fetching public recipes:', err);
    return [];
  }
};

// ============================================
// SEARCH FUNCTIONS
// ============================================

/**
 * Search recipes (client-side filtering)
 */
export const searchRecipes = (
  recipes: Meal[],
  query: string,
  selectedTags: string[],
  minRating?: number
): Meal[] => {
  const q = query.toLowerCase().trim();

  return recipes.filter(recipe => {
    // Query filter (starts after 3 characters)
    const matchesQuery = q.length < 3 ||
      recipe.name.toLowerCase().includes(q) ||
      recipe.description.toLowerCase().includes(q) ||
      recipe.ingredients.some(ing => ing.toLowerCase().includes(q));

    // Tag filter (must match ALL selected tags)
    const matchesTags = selectedTags.length === 0 ||
      selectedTags.every(tag =>
        recipe.tags?.some(t => t.toLowerCase() === tag.toLowerCase())
      );

    // Rating filter (minimum rating)
    const matchesRating = !minRating ||
      (recipe.averageRating && recipe.averageRating >= minRating);

    return matchesQuery && matchesTags && matchesRating;
  });
};

/**
 * Server-side full-text search (for larger datasets)
 */
export const searchRecipesServer = async (query: string): Promise<Meal[]> => {
  if (!isSupabaseConfigured() || query.length < 3) return [];

  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Use PostgreSQL full-text search
    const { data, error } = await supabase
      .from('favorite_meals')
      .select('*')
      .or(`user_id.eq.${user?.id},is_public.eq.true`)
      .textSearch('search_vector', query, { type: 'websearch' })
      .limit(50);

    if (error) throw error;

    return (data || []).map((meal: any) => ({
      id: meal.id,
      name: meal.name,
      description: meal.description,
      ingredients: meal.ingredients,
      instructions: meal.instructions,
      imageUrl: meal.image_url,
      source: meal.source,
      isPublic: meal.is_public,
      userId: meal.user_id,
      ownerName: meal.owner_name,
      createdAt: meal.created_at,
      isFavorite: meal.user_id === user?.id
    }));
  } catch (err) {
    console.error('Error searching recipes:', err);
    return [];
  }
};

// ============================================
// RECIPE UPLOAD FUNCTIONS
// ============================================

/**
 * Create a placeholder recipe for background processing
 */
export const createPlaceholderRecipe = async (fileName: string): Promise<string | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('favorite_meals')
      .insert({
        user_id: user.id,
        name: `Processing: ${fileName}`,
        description: 'Recipe is being extracted...',
        ingredients: [],
        instructions: '',
        source: 'uploaded',
        upload_status: 'pending'
      })
      .select('id')
      .single();

    if (error) throw error;
    return data?.id || null;
  } catch (err) {
    console.error('Error creating placeholder:', err);
    return null;
  }
};

/**
 * Update a recipe after AI extraction
 */
export const updateRecipeFromExtraction = async (
  recipeId: string,
  extracted: ExtractedRecipe,
  tags: string[]
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('favorite_meals')
      .update({
        name: extracted.name,
        description: extracted.description,
        ingredients: extracted.ingredients,
        instructions: extracted.instructions,
        upload_status: 'complete'
      })
      .eq('id', recipeId);

    if (error) throw error;

    // Assign tags
    if (tags.length > 0) {
      await assignTagsToRecipe(recipeId, tags);
    }

    return true;
  } catch (err) {
    console.error('Error updating recipe:', err);
    return false;
  }
};

/**
 * Update recipe upload status
 */
export const updateRecipeStatus = async (
  recipeId: string,
  status: 'pending' | 'processing' | 'complete' | 'failed'
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('favorite_meals')
      .update({ upload_status: status })
      .eq('id', recipeId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error updating status:', err);
    return false;
  }
};

/**
 * Get user's uploaded recipes
 */
export const getUserUploadedRecipes = async (): Promise<Meal[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('favorite_meals')
      .select(`
        *,
        recipe_videos(id, processing_status)
      `)
      .eq('user_id', user.id)
      .eq('source', 'uploaded')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch tags for each recipe
    const recipesWithTags = await Promise.all(
      (data || []).map(async (meal: any) => {
        const tags = await getRecipeTags(meal.id);
        const video = meal.recipe_videos?.[0];
        return {
          id: meal.id,
          name: meal.name,
          description: meal.description,
          ingredients: meal.ingredients,
          instructions: meal.instructions,
          imageUrl: meal.image_url,
          source: 'uploaded' as const,
          isPublic: meal.is_public,
          uploadStatus: meal.upload_status,
          userId: meal.user_id,
          createdAt: meal.created_at,
          tags,
          isFavorite: true,
          videoId: video?.id,
          hasVideo: video?.processing_status === 'complete',
        };
      })
    );

    return recipesWithTags;
  } catch (err) {
    console.error('Error fetching uploaded recipes:', err);
    return [];
  }
};

/**
 * Get user's AI-generated (favorited) recipes
 */
export const getUserGeneratedRecipes = async (): Promise<Meal[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('favorite_meals')
      .select(`
        *,
        recipe_videos(id, processing_status)
      `)
      .eq('user_id', user.id)
      .or('source.eq.generated,source.is.null')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch tags for each recipe
    const recipesWithTags = await Promise.all(
      (data || []).map(async (meal: any) => {
        const tags = await getRecipeTags(meal.id);
        const video = meal.recipe_videos?.[0];
        return {
          id: meal.id,
          name: meal.name,
          description: meal.description,
          ingredients: meal.ingredients,
          instructions: meal.instructions,
          imageUrl: meal.image_url,
          source: 'generated' as const,
          isPublic: meal.is_public,
          userId: meal.user_id,
          createdAt: meal.created_at,
          tags,
          isFavorite: true,
          videoId: video?.id,
          hasVideo: video?.processing_status === 'complete',
        };
      })
    );

    return recipesWithTags;
  } catch (err) {
    console.error('Error fetching generated recipes:', err);
    return [];
  }
};

/**
 * Auto-tag a recipe and save tags to database
 */
export const autoTagAndSave = async (recipeId: string, recipe: { name: string; description: string; ingredients: string[] }): Promise<string[]> => {
  try {
    const result = await autoTagRecipe(recipe);
    if (result.tags.length > 0) {
      await assignTagsToRecipe(recipeId, result.tags);
    }
    return result.tags;
  } catch (err) {
    console.error('Error auto-tagging:', err);
    return [];
  }
};

// ============================================
// COMMENT FUNCTIONS
// ============================================

/**
 * Get comments for a recipe
 */
export const getRecipeComments = async (mealId: string): Promise<RecipeComment[]> => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data: { user } } = await supabase.auth.getUser();

    const { data, error } = await supabase
      .from('recipe_comments')
      .select('*, profiles(full_name, avatar_url)')
      .eq('meal_id', mealId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((comment: any) => ({
      id: comment.id,
      mealId: comment.meal_id,
      userId: comment.user_id,
      commentText: comment.comment_text,
      rating: comment.rating,
      isPublic: comment.is_public ?? true,
      createdAt: comment.created_at,
      updatedAt: comment.updated_at,
      userName: comment.profiles?.full_name || 'Anonymous',
      userAvatar: comment.profiles?.avatar_url,
      isOwn: comment.user_id === user?.id
    }));
  } catch (err) {
    console.error('Error fetching comments:', err);
    return [];
  }
};

/**
 * Save a comment with optional rating and visibility
 */
export const saveRecipeComment = async (
  mealId: string,
  commentText: string,
  rating: number | null = null,
  isPublic: boolean = true
): Promise<RecipeComment | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('recipe_comments')
      .insert({
        meal_id: mealId,
        user_id: user.id,
        comment_text: commentText,
        rating: rating,
        is_public: isPublic
      })
      .select('*, profiles(full_name, avatar_url)')
      .single();

    if (error) throw error;

    return {
      id: data.id,
      mealId: data.meal_id,
      userId: data.user_id,
      commentText: data.comment_text,
      rating: data.rating,
      isPublic: data.is_public,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      userName: data.profiles?.full_name || 'Anonymous',
      userAvatar: data.profiles?.avatar_url,
      isOwn: true
    };
  } catch (err) {
    console.error('Error saving comment:', err);
    return null;
  }
};

/**
 * Update a comment
 */
export const updateRecipeComment = async (
  commentId: string,
  commentText: string,
  rating: number | null = null
): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('recipe_comments')
      .update({
        comment_text: commentText,
        rating: rating,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error updating comment:', err);
    return false;
  }
};

/**
 * Delete a comment
 */
export const deleteRecipeComment = async (commentId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('recipe_comments')
      .delete()
      .eq('id', commentId);

    if (error) throw error;
    return true;
  } catch (err) {
    console.error('Error deleting comment:', err);
    return false;
  }
};

/**
 * Get average rating for a recipe
 */
export const getRecipeAverageRating = async (mealId: string): Promise<{ average: number; count: number }> => {
  if (!isSupabaseConfigured()) return { average: 0, count: 0 };

  try {
    const { data, error } = await supabase
      .from('recipe_comments')
      .select('rating')
      .eq('meal_id', mealId)
      .not('rating', 'is', null);

    if (error) throw error;

    const ratings = data?.map(d => d.rating).filter(Boolean) || [];
    const count = ratings.length;
    const average = count > 0 ? ratings.reduce((a, b) => a + b, 0) / count : 0;

    return { average: Math.round(average * 10) / 10, count };
  } catch (err) {
    console.error('Error getting average rating:', err);
    return { average: 0, count: 0 };
  }
};

/**
 * Save or update a rating (auto-saves without requiring a comment)
 * Creates a minimal comment entry if user hasn't commented yet
 */
export const saveRecipeRating = async (
  mealId: string,
  rating: number
): Promise<{ success: boolean; average: number; count: number }> => {
  if (!isSupabaseConfigured()) return { success: false, average: 0, count: 0 };

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if user already has a comment/rating for this recipe
    // Use maybeSingle() to avoid throwing error when no row exists
    const { data: existing, error: fetchError } = await supabase
      .from('recipe_comments')
      .select('id')
      .eq('meal_id', mealId)
      .eq('user_id', user.id)
      .maybeSingle();

    // Only throw if it's a real error (not just "no rows found")
    if (fetchError) {
      console.error('Error checking existing rating:', fetchError);
      throw fetchError;
    }

    if (existing) {
      // Update existing rating
      const { error } = await supabase
        .from('recipe_comments')
        .update({
          rating: rating,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (error) {
        console.error('Error updating rating:', error);
        throw error;
      }
    } else {
      // Create new entry with just rating (null comment text)
      const { error } = await supabase
        .from('recipe_comments')
        .insert({
          meal_id: mealId,
          user_id: user.id,
          comment_text: null,
          rating: rating
        });

      if (error) {
        console.error('Error inserting rating:', error);
        throw error;
      }
    }

    // Return updated average
    const newAverage = await getRecipeAverageRating(mealId);
    return { success: true, ...newAverage };
  } catch (err) {
    console.error('Error saving rating:', err);
    return { success: false, average: 0, count: 0 };
  }
};

/**
 * Get user's own rating for a recipe
 */
export const getUserRating = async (mealId: string): Promise<number | null> => {
  if (!isSupabaseConfigured()) return null;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('recipe_comments')
      .select('rating')
      .eq('meal_id', mealId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return data?.rating || null;
  } catch (err) {
    console.error('Error getting user rating:', err);
    return null;
  }
};

/**
 * Get average ratings for multiple recipes (batch)
 */
export const getBatchRecipeRatings = async (mealIds: string[]): Promise<Record<string, { average: number; count: number }>> => {
  if (!isSupabaseConfigured() || mealIds.length === 0) return {};

  try {
    const { data, error } = await supabase
      .from('recipe_comments')
      .select('meal_id, rating')
      .in('meal_id', mealIds)
      .not('rating', 'is', null);

    if (error) throw error;

    // Group ratings by meal_id
    const ratingsByMeal: Record<string, number[]> = {};
    (data || []).forEach(item => {
      if (!ratingsByMeal[item.meal_id]) {
        ratingsByMeal[item.meal_id] = [];
      }
      if (item.rating) {
        ratingsByMeal[item.meal_id].push(item.rating);
      }
    });

    // Calculate averages
    const result: Record<string, { average: number; count: number }> = {};
    Object.entries(ratingsByMeal).forEach(([mealId, ratings]) => {
      const count = ratings.length;
      const average = count > 0 ? ratings.reduce((a, b) => a + b, 0) / count : 0;
      result[mealId] = { average: Math.round(average * 10) / 10, count };
    });

    return result;
  } catch (err) {
    console.error('Error getting batch ratings:', err);
    return {};
  }
};
