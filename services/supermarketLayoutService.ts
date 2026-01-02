import { supabase, isSupabaseConfigured } from './authService';

// Types
export interface SupermarketLayout {
  id: string;
  name: string;
  isDefault: boolean;
  categoryOrder: string[];
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'kiwi_supermarket_layouts';
const DEFAULT_LAYOUT_KEY = 'kiwi_default_layout_id';

// Default category order (common grocery store layout)
export const DEFAULT_CATEGORIES = [
  'Produce',
  'Bakery',
  'Dairy',
  'Meat & Seafood',
  'Deli',
  'Frozen',
  'Pantry',
  'Canned Goods',
  'Condiments & Sauces',
  'Snacks',
  'Beverages',
  'Breakfast',
  'Baking',
  'Spices & Seasonings',
  'International',
  'Health & Beauty',
  'Household',
  'Other'
];

// ============================================
// LOCAL STORAGE FALLBACK
// ============================================

const getLayoutsLocal = (): SupermarketLayout[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load local supermarket layouts:', e);
  }
  return [];
};

const saveLayoutsLocal = (layouts: SupermarketLayout[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  } catch (e) {
    console.error('Failed to save local supermarket layouts:', e);
  }
};

const getDefaultLayoutIdLocal = (): string | null => {
  try {
    return localStorage.getItem(DEFAULT_LAYOUT_KEY);
  } catch (e) {
    return null;
  }
};

const setDefaultLayoutIdLocal = (id: string | null): void => {
  try {
    if (id) {
      localStorage.setItem(DEFAULT_LAYOUT_KEY, id);
    } else {
      localStorage.removeItem(DEFAULT_LAYOUT_KEY);
    }
  } catch (e) {
    console.error('Failed to save default layout id:', e);
  }
};

// ============================================
// SUPABASE OPERATIONS
// ============================================

/**
 * Get all supermarket layouts for the current user
 */
export const getSupermarketLayouts = async (): Promise<SupermarketLayout[]> => {
  if (!isSupabaseConfigured()) {
    return getLayoutsLocal();
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return getLayoutsLocal();
  }

  const { data, error } = await supabase
    .from('supermarket_layouts')
    .select('*')
    .eq('user_id', user.id)
    .order('name');

  if (error) {
    console.error('Error fetching supermarket layouts:', error);
    return getLayoutsLocal();
  }

  return data.map(row => ({
    id: row.id,
    name: row.name,
    isDefault: row.is_default,
    categoryOrder: row.category_order || [],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }));
};

/**
 * Get the default supermarket layout for the current user
 */
export const getDefaultLayout = async (): Promise<SupermarketLayout | null> => {
  if (!isSupabaseConfigured()) {
    const layouts = getLayoutsLocal();
    const defaultId = getDefaultLayoutIdLocal();
    return layouts.find(l => l.id === defaultId) || layouts.find(l => l.isDefault) || null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const layouts = getLayoutsLocal();
    return layouts.find(l => l.isDefault) || null;
  }

  const { data, error } = await supabase
    .from('supermarket_layouts')
    .select('*')
    .eq('user_id', user.id)
    .eq('is_default', true)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // No default layout
    }
    console.error('Error fetching default layout:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    isDefault: data.is_default,
    categoryOrder: data.category_order || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

/**
 * Get a specific layout by ID
 */
export const getLayoutById = async (layoutId: string): Promise<SupermarketLayout | null> => {
  if (!isSupabaseConfigured()) {
    const layouts = getLayoutsLocal();
    return layouts.find(l => l.id === layoutId) || null;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    const layouts = getLayoutsLocal();
    return layouts.find(l => l.id === layoutId) || null;
  }

  const { data, error } = await supabase
    .from('supermarket_layouts')
    .select('*')
    .eq('id', layoutId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Error fetching layout:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    isDefault: data.is_default,
    categoryOrder: data.category_order || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

/**
 * Create a new supermarket layout
 */
export const createSupermarketLayout = async (
  name: string,
  categoryOrder: string[],
  isDefault: boolean = false
): Promise<SupermarketLayout | null> => {
  const now = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const layouts = getLayoutsLocal();
    const newLayout: SupermarketLayout = {
      id: crypto.randomUUID(),
      name,
      isDefault,
      categoryOrder,
      createdAt: now,
      updatedAt: now
    };

    // If this is default, unset other defaults
    if (isDefault) {
      layouts.forEach(l => l.isDefault = false);
      setDefaultLayoutIdLocal(newLayout.id);
    }

    layouts.push(newLayout);
    saveLayoutsLocal(layouts);
    return newLayout;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Fall back to local storage for non-authenticated users
    const layouts = getLayoutsLocal();
    const newLayout: SupermarketLayout = {
      id: crypto.randomUUID(),
      name,
      isDefault,
      categoryOrder,
      createdAt: now,
      updatedAt: now
    };
    layouts.push(newLayout);
    saveLayoutsLocal(layouts);
    return newLayout;
  }

  const { data, error } = await supabase
    .from('supermarket_layouts')
    .insert({
      user_id: user.id,
      name,
      is_default: isDefault,
      category_order: categoryOrder
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating supermarket layout:', error);
    return null;
  }

  return {
    id: data.id,
    name: data.name,
    isDefault: data.is_default,
    categoryOrder: data.category_order || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at
  };
};

/**
 * Update a supermarket layout
 */
export const updateSupermarketLayout = async (
  layoutId: string,
  updates: { name?: string; categoryOrder?: string[]; isDefault?: boolean }
): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const layouts = getLayoutsLocal();
    const index = layouts.findIndex(l => l.id === layoutId);
    if (index === -1) return false;

    if (updates.name !== undefined) layouts[index].name = updates.name;
    if (updates.categoryOrder !== undefined) layouts[index].categoryOrder = updates.categoryOrder;
    if (updates.isDefault !== undefined) {
      if (updates.isDefault) {
        layouts.forEach(l => l.isDefault = false);
        setDefaultLayoutIdLocal(layoutId);
      }
      layouts[index].isDefault = updates.isDefault;
    }
    layouts[index].updatedAt = new Date().toISOString();

    saveLayoutsLocal(layouts);
    return true;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  };

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.categoryOrder !== undefined) updateData.category_order = updates.categoryOrder;
  if (updates.isDefault !== undefined) updateData.is_default = updates.isDefault;

  const { error } = await supabase
    .from('supermarket_layouts')
    .update(updateData)
    .eq('id', layoutId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error updating supermarket layout:', error);
    return false;
  }

  return true;
};

/**
 * Delete a supermarket layout
 */
export const deleteSupermarketLayout = async (layoutId: string): Promise<boolean> => {
  if (!isSupabaseConfigured()) {
    const layouts = getLayoutsLocal();
    const filtered = layouts.filter(l => l.id !== layoutId);
    saveLayoutsLocal(filtered);
    return true;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return false;
  }

  const { error } = await supabase
    .from('supermarket_layouts')
    .delete()
    .eq('id', layoutId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error deleting supermarket layout:', error);
    return false;
  }

  return true;
};

/**
 * Set a layout as the default
 */
export const setDefaultLayout = async (layoutId: string): Promise<boolean> => {
  return updateSupermarketLayout(layoutId, { isDefault: true });
};

/**
 * Sort items by a layout's category order
 */
export const sortByLayout = <T extends { category?: string }>(
  items: T[],
  categoryOrder: string[]
): T[] => {
  const orderMap = new Map(categoryOrder.map((cat, idx) => [cat.toLowerCase(), idx]));
  const maxOrder = categoryOrder.length;

  return [...items].sort((a, b) => {
    const catA = a.category?.toLowerCase() || 'other';
    const catB = b.category?.toLowerCase() || 'other';
    const orderA = orderMap.get(catA) ?? maxOrder;
    const orderB = orderMap.get(catB) ?? maxOrder;
    return orderA - orderB;
  });
};

/**
 * Get a suggested category for an ingredient name
 */
export const suggestCategory = (ingredientName: string): string => {
  const name = ingredientName.toLowerCase();

  // Produce
  if (/\b(apple|banana|orange|lemon|lime|berry|strawberr|blueberr|raspberr|grape|melon|watermelon|cantaloupe|peach|plum|pear|mango|pineapple|kiwi|avocado|tomato|potato|onion|garlic|carrot|celery|lettuce|spinach|kale|broccoli|cauliflower|pepper|cucumber|zucchini|squash|mushroom|corn|bean|pea|asparagus|artichoke|eggplant|cabbage|brussels|radish|turnip|beet|sweet potato|yam|leek|scallion|chive|cilantro|parsley|basil|mint|dill|thyme|rosemary|sage|oregano|ginger|jalapeño|habanero|serrano|poblano|shallot|fennel)\b/.test(name)) {
    return 'Produce';
  }

  // Meat & Seafood
  if (/\b(chicken|beef|pork|lamb|turkey|duck|bacon|sausage|ham|steak|ground|mince|ribs|roast|fish|salmon|tuna|shrimp|prawn|crab|lobster|scallop|mussel|clam|oyster|cod|tilapia|halibut|trout|anchov|sardine)\b/.test(name)) {
    return 'Meat & Seafood';
  }

  // Dairy
  if (/\b(milk|cream|cheese|butter|yogurt|sour cream|cottage|ricotta|mozzarella|cheddar|parmesan|feta|brie|gouda|swiss|egg|half and half|whipping cream|heavy cream|cream cheese)\b/.test(name)) {
    return 'Dairy';
  }

  // Bakery
  if (/\b(bread|bagel|croissant|muffin|roll|bun|tortilla|pita|naan|baguette|sourdough|ciabatta|focaccia|brioche|danish|donut|pastry|cake|pie|cookie)\b/.test(name)) {
    return 'Bakery';
  }

  // Frozen
  if (/\b(frozen|ice cream|popsicle|sorbet|gelato)\b/.test(name)) {
    return 'Frozen';
  }

  // Canned Goods
  if (/\b(canned|can of|tinned|diced tomato|crushed tomato|tomato paste|tomato sauce|chickpea|black bean|kidney bean|cannellini|soup|broth|stock|coconut milk)\b/.test(name)) {
    return 'Canned Goods';
  }

  // Condiments & Sauces
  if (/\b(sauce|ketchup|mustard|mayo|mayonnaise|vinegar|soy sauce|teriyaki|hoisin|sriracha|hot sauce|salsa|dressing|marinade|barbecue|bbq|worcestershire|relish|pickle|olive)\b/.test(name)) {
    return 'Condiments & Sauces';
  }

  // Spices & Seasonings
  if (/\b(salt|pepper|cumin|paprika|cinnamon|nutmeg|clove|allspice|curry|turmeric|coriander|cardamom|cayenne|chili powder|garlic powder|onion powder|bay leaf|vanilla|extract|seasoning|spice)\b/.test(name)) {
    return 'Spices & Seasonings';
  }

  // Baking
  if (/\b(flour|sugar|baking soda|baking powder|yeast|cocoa|chocolate chip|brown sugar|powdered sugar|confectioner|cornstarch|honey|maple syrup|molasses|extract|vanilla|almond extract)\b/.test(name)) {
    return 'Baking';
  }

  // Pantry
  if (/\b(pasta|spaghetti|penne|fettuccine|macaroni|rice|quinoa|couscous|oat|cereal|granola|noodle|ramen|udon|soba|lentil|dried bean|nut|almond|walnut|pecan|cashew|peanut|seed|sunflower|pumpkin seed|chia|flax)\b/.test(name)) {
    return 'Pantry';
  }

  // Snacks
  if (/\b(chip|cracker|pretzel|popcorn|trail mix|granola bar|protein bar|candy|chocolate|gummy|cookie|snack)\b/.test(name)) {
    return 'Snacks';
  }

  // Beverages
  if (/\b(water|juice|soda|coffee|tea|wine|beer|spirits|vodka|whiskey|rum|gin|tequila|cocktail|mixer|tonic|seltzer|sparkling|energy drink|sports drink|lemonade|iced tea)\b/.test(name)) {
    return 'Beverages';
  }

  // Breakfast
  if (/\b(cereal|oatmeal|pancake|waffle|syrup|jam|jelly|preserves|peanut butter|nutella|breakfast)\b/.test(name)) {
    return 'Breakfast';
  }

  // International
  if (/\b(tofu|tempeh|miso|nori|seaweed|wasabi|tahini|hummus|falafel|curry paste|coconut cream|fish sauce|oyster sauce|chili paste|sambal|gochujang|kimchi|tortilla|taco|enchilada|tamale|mole)\b/.test(name)) {
    return 'International';
  }

  // Default
  return 'Other';
};
