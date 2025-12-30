import { supabase, isSupabaseConfigured } from './authService';
import type { AdminInstruction, AdminInstructionCategory, InstructionTag } from '../types';

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

  const { data: result, error } = await supabase
    .from('admin_instructions')
    .insert({
      category_id: data.categoryId,
      title: data.title,
      instruction_text: data.instructionText,
      tags: data.tags,
      priority: data.priority ?? 0,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating instruction:', error);
    return null;
  }

  return {
    id: result.id,
    categoryId: result.category_id,
    title: result.title,
    instructionText: result.instruction_text,
    tags: result.tags || [],
    isActive: result.is_active,
    priority: result.priority,
    createdAt: result.created_at,
    updatedAt: result.updated_at,
  };
};

/**
 * Update an existing instruction (admin only)
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

  const updateData: Record<string, unknown> = {};
  if (data.categoryId !== undefined) updateData.category_id = data.categoryId;
  if (data.title !== undefined) updateData.title = data.title;
  if (data.instructionText !== undefined) updateData.instruction_text = data.instructionText;
  if (data.tags !== undefined) updateData.tags = data.tags;
  if (data.isActive !== undefined) updateData.is_active = data.isActive;
  if (data.priority !== undefined) updateData.priority = data.priority;

  const { error } = await supabase
    .from('admin_instructions')
    .update(updateData)
    .eq('id', id);

  if (error) {
    console.error('Error updating instruction:', error);
    return false;
  }

  return true;
};

/**
 * Delete an instruction (admin only)
 */
export const deleteInstruction = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const { error } = await supabase
    .from('admin_instructions')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting instruction:', error);
    return false;
  }

  return true;
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
 */
export const createCategory = async (
  name: string,
  description?: string
): Promise<AdminInstructionCategory | null> => {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data, error } = await supabase
    .from('admin_instruction_categories')
    .insert({ name, description })
    .select()
    .single();

  if (error) {
    console.error('Error creating category:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    description: data.description,
    createdAt: data.created_at,
  };
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
 */
export const deleteCategory = async (id: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    return false;
  }

  const { error } = await supabase
    .from('admin_instruction_categories')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting category:', error);
    return false;
  }

  return true;
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
