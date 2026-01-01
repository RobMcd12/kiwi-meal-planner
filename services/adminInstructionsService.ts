import { supabase, isSupabaseConfigured } from './authService';
import type { AdminInstruction, AdminInstructionCategory, InstructionTag } from '../types';

/**
 * Helper to call the manage-instructions edge function
 */
const callManageInstructionsFunction = async (action: string, data: Record<string, unknown>) => {
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Session check:', {
    hasSession: !!session,
    hasAccessToken: !!session?.access_token,
    tokenPreview: session?.access_token?.substring(0, 20) + '...'
  });

  if (!session) {
    throw new Error('Not authenticated');
  }

  console.log('Calling manage-instructions edge function:', action);

  const { data: result, error } = await supabase.functions.invoke('manage-instructions', {
    body: { action, data },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  // Log the full response for debugging
  console.log('Edge function full response:', JSON.stringify({ result, error }, null, 2));

  if (error) {
    console.error('Edge function error:', error);
    // Try to extract more specific error message
    const errorMessage = error.message || (typeof error === 'object' ? JSON.stringify(error) : 'Edge function failed');
    throw new Error(errorMessage);
  }

  if (result?.error) {
    // Log detailed error info if available
    console.error('Edge function returned error:', {
      error: result.error,
      reason: result.reason,
      details: result.details
    });
    throw new Error(`${result.error}: ${result.reason || ''} - ${result.details || ''}`);
  }

  return result;
};

/**
 * Get all active instructions for a specific tag
 * This is used by AI services to get instructions to prepend to prompts
 */
export const getInstructionsByTag = async (tag: InstructionTag): Promise<string[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('admin_instructions')
    .select('instruction_text, priority')
    .contains('tags', [tag])
    .eq('is_active', true)
    .order('priority', { ascending: false });

  if (error) {
    console.error('Error fetching instructions by tag:', error);
    return [];
  }

  return (data || []).map(row => row.instruction_text);
};

/**
 * Get all instructions (admin only)
 * Includes category information
 */
export const getAllInstructions = async (): Promise<AdminInstruction[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('admin_instructions')
    .select(`
      id,
      category_id,
      title,
      instruction_text,
      tags,
      is_active,
      priority,
      created_at,
      updated_at,
      admin_instruction_categories (
        name
      )
    `)
    .order('priority', { ascending: false });

  if (error) {
    console.error('Error fetching all instructions:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    categoryId: row.category_id,
    categoryName: (row.admin_instruction_categories as any)?.name || 'Unknown',
    title: row.title,
    instructionText: row.instruction_text,
    tags: row.tags || [],
    isActive: row.is_active,
    priority: row.priority,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
};

/**
 * Create a new instruction (admin only)
 * Uses Edge Function to bypass RLS
 */
export const createInstruction = async (data: {
  categoryId: string;
  title: string;
  instructionText: string;
  tags: InstructionTag[];
  priority?: number;
}): Promise<AdminInstruction | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const result = await callManageInstructionsFunction('createInstruction', {
      categoryId: data.categoryId,
      title: data.title,
      instructionText: data.instructionText,
      tags: data.tags,
      priority: data.priority ?? 0,
    });

    if (!result?.instruction) {
      return null;
    }

    const row = result.instruction;
    return {
      id: row.id,
      categoryId: row.category_id,
      title: row.title,
      instructionText: row.instruction_text,
      tags: row.tags || [],
      isActive: row.is_active,
      priority: row.priority,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  } catch (err) {
    console.error('Error creating instruction:', err);
    return null;
  }
};

/**
 * Update an existing instruction (admin only)
 * Uses Edge Function to bypass RLS
 */
export const updateInstruction = async (
  id: string,
  data: Partial<{
    categoryId: string;
    title: string;
    instructionText: string;
    tags: InstructionTag[];
    isActive: boolean;
    priority: number;
  }>
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    await callManageInstructionsFunction('updateInstruction', {
      id,
      updates: data,
    });
    return true;
  } catch (err) {
    console.error('Error updating instruction:', err);
    return false;
  }
};

/**
 * Delete an instruction (admin only)
 * Uses Edge Function to bypass RLS
 */
export const deleteInstruction = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    await callManageInstructionsFunction('deleteInstruction', { id });
    return true;
  } catch (err) {
    console.error('Error deleting instruction:', err);
    return false;
  }
};

/**
 * Get all instruction categories
 */
export const getCategories = async (): Promise<AdminInstructionCategory[]> => {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const { data, error } = await supabase
    .from('admin_instruction_categories')
    .select('id, name, description, created_at')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching categories:', error);
    return [];
  }

  return (data || []).map(row => ({
    id: row.id,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
  }));
};

/**
 * Create a new category (admin only)
 * Uses Edge Function to bypass RLS
 */
export const createCategory = async (
  name: string,
  description?: string
): Promise<AdminInstructionCategory | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  try {
    const result = await callManageInstructionsFunction('createCategory', {
      name,
      description,
    });

    if (!result?.category) {
      return null;
    }

    const row = result.category;
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.created_at,
    };
  } catch (err) {
    console.error('Error creating category:', err);
    return null;
  }
};

/**
 * Update a category (admin only)
 */
export const updateCategory = async (
  id: string,
  data: { name?: string; description?: string }
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const { error } = await supabase
    .from('admin_instruction_categories')
    .update(data)
    .eq('id', id);

  if (error) {
    console.error('Error updating category:', error);
    return false;
  }

  return true;
};

/**
 * Delete a category (admin only)
 * Note: This will cascade delete all instructions in the category
 * Uses Edge Function to bypass RLS
 */
export const deleteCategory = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  try {
    await callManageInstructionsFunction('deleteCategory', { id });
    return true;
  } catch (err) {
    console.error('Error deleting category:', err);
    return false;
  }
};

/**
 * Build a prompt string with admin instructions prepended
 * Used by AI services to apply admin-managed rules
 */
export const buildPromptWithInstructions = (
  basePrompt: string,
  instructions: string[]
): string => {
  if (instructions.length === 0) {
    return basePrompt;
  }

  const instructionBlock = instructions
    .map((inst, i) => `${i + 1}. ${inst}`)
    .join('\n');

  return `IMPORTANT RULES TO FOLLOW:
${instructionBlock}

${basePrompt}`;
};
