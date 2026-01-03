import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, ShoppingCart, Check, Package, Star, RefreshCw, Trash2, Plus, ChevronDown, ChevronUp, FolderHeart, BookHeart, Share, Download, Printer, X, Settings, GripVertical, Store, LayoutList, Edit2, Save as SaveIcon, Crown, Lock } from 'lucide-react';
import type { PantryItem, SavedMealPlan, ShoppingCategory, Ingredient, Meal } from '../types';
import { loadPantry, getSavedMealPlans, togglePantryItemRestock, getFavoriteMeals } from '../services/storageService';
import {
  getShoppingListSelections,
  saveShoppingListSelections,
  clearAllSelections as clearAllSelectionsService,
  clearCheckedItems as clearCheckedItemsService,
  type ShoppingListSelections
} from '../services/shoppingListService';
import {
  getSupermarketLayouts,
  getDefaultLayout,
  createSupermarketLayout,
  updateSupermarketLayout,
  deleteSupermarketLayout,
  setDefaultLayout,
  suggestCategory,
  DEFAULT_CATEGORIES,
  type SupermarketLayout
} from '../services/supermarketLayoutService';

interface MasterShoppingListProps {
  onBack: () => void;
  pantryItems?: PantryItem[];
  onPantryUpdate?: (items: PantryItem[]) => void;
  hasPro?: boolean;
  onUpgradeClick?: () => void;
}

interface ShoppingItem {
  id: string;
  name: string;
  quantity?: string;
  unit?: string;
  category?: string;
  source: 'plan' | 'staple' | 'recipe' | 'pantry';
  sourceName?: string;
  checked: boolean;
  originalItem?: PantryItem;
}

type SortMode = 'list' | 'category' | 'supermarket';

const MasterShoppingList: React.FC<MasterShoppingListProps> = ({
  onBack,
  pantryItems: externalPantryItems,
  onPantryUpdate,
  hasPro = false,
  onUpgradeClick
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
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showLayoutModal, setShowLayoutModal] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Sorting & Layout state
  const [sortMode, setSortMode] = useState<SortMode>('list');
  const [layouts, setLayouts] = useState<SupermarketLayout[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string | null>(null);
  const [editingLayout, setEditingLayout] = useState<SupermarketLayout | null>(null);
  const [newLayoutName, setNewLayoutName] = useState('');
  const [editingCategories, setEditingCategories] = useState<string[]>([]);
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);

  // Drag-and-drop for items in list mode
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  const [customItemOrder, setCustomItemOrder] = useState<string[]>([]); // Array of item IDs in custom order

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

      // Load supermarket layouts
      const userLayouts = await getSupermarketLayouts();
      setLayouts(userLayouts);

      // Set default layout if available
      const defaultLayout = await getDefaultLayout();
      if (defaultLayout) {
        setSelectedLayoutId(defaultLayout.id);
      }

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
          category: suggestCategory(item.name),
          source: 'staple',
          checked: false,
          originalItem: item
        });
      }
    });

    // Add regular pantry items that need restocking (not staples)
    const pantryNeedingRestock = pantry.filter(item => !item.isStaple && item.needsRestock);
    pantryNeedingRestock.forEach(item => {
      const key = item.name.toLowerCase();
      if (!addedItems.has(key)) {
        addedItems.add(key);
        shoppingItems.push({
          id: `pantry-${item.id}`,
          name: item.name,
          quantity: item.quantity?.toString(),
          unit: item.unit,
          category: suggestCategory(item.name),
          source: 'pantry',
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
              category: category.categoryName || suggestCategory(ingredient.name),
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
            category: suggestCategory(ingredientStr),
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

    // If it's a staple or pantry item and now checked, mark it as no longer needing restock
    if ((item.source === 'staple' || item.source === 'pantry') && item.originalItem && newChecked.has(itemId)) {
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

  // Get sorted items based on sort mode
  const getSortedItems = useCallback(() => {
    if (sortMode === 'list') {
      // Simple list view - items in custom order or default order
      let orderedItems: ShoppingItem[];
      if (customItemOrder.length > 0) {
        // Sort by custom order
        const orderMap = new Map(customItemOrder.map((id, idx) => [id, idx]));
        orderedItems = [...items].sort((a, b) => {
          const orderA = orderMap.get(a.id) ?? 999;
          const orderB = orderMap.get(b.id) ?? 999;
          return orderA - orderB;
        });
      } else {
        orderedItems = items;
      }
      return {
        mode: 'list' as const,
        groups: [{ title: 'Shopping List', items: orderedItems, color: 'slate' }]
      };
    }

    if (sortMode === 'category') {
      // Group by category with default category order
      const categoryMap = new Map<string, ShoppingItem[]>();
      items.forEach(item => {
        const cat = item.category || 'Other';
        if (!categoryMap.has(cat)) {
          categoryMap.set(cat, []);
        }
        categoryMap.get(cat)!.push(item);
      });

      const sortedCategories = Array.from(categoryMap.keys()).sort((a, b) => {
        const indexA = DEFAULT_CATEGORIES.findIndex(c => c.toLowerCase() === a.toLowerCase());
        const indexB = DEFAULT_CATEGORIES.findIndex(c => c.toLowerCase() === b.toLowerCase());
        const orderA = indexA === -1 ? 999 : indexA;
        const orderB = indexB === -1 ? 999 : indexB;
        return orderA - orderB;
      });

      return {
        mode: 'category' as const,
        groups: sortedCategories.map(cat => ({
          title: cat,
          items: categoryMap.get(cat) || [],
          color: 'slate'
        }))
      };
    }

    // Supermarket mode - group by category using selected layout order
    const categoryMap = new Map<string, ShoppingItem[]>();
    items.forEach(item => {
      const cat = item.category || 'Other';
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, []);
      }
      categoryMap.get(cat)!.push(item);
    });

    // Get category order from selected layout
    let categoryOrder: string[];
    if (selectedLayoutId) {
      const layout = layouts.find(l => l.id === selectedLayoutId);
      categoryOrder = layout?.categoryOrder || DEFAULT_CATEGORIES;
    } else {
      categoryOrder = DEFAULT_CATEGORIES;
    }

    // Sort categories by layout order
    const sortedCategories = Array.from(categoryMap.keys()).sort((a, b) => {
      const indexA = categoryOrder.findIndex(c => c.toLowerCase() === a.toLowerCase());
      const indexB = categoryOrder.findIndex(c => c.toLowerCase() === b.toLowerCase());
      const orderA = indexA === -1 ? 999 : indexA;
      const orderB = indexB === -1 ? 999 : indexB;
      return orderA - orderB;
    });

    return {
      mode: 'supermarket' as const,
      groups: sortedCategories.map(cat => ({
        title: cat,
        items: categoryMap.get(cat) || [],
        color: 'slate'
      }))
    };
  }, [items, sortMode, selectedLayoutId, layouts, customItemOrder]);

  const sortedData = getSortedItems();

  // Group items by source type (for backward compatibility with print/share)
  const groupedItems = {
    staples: items.filter(i => i.source === 'staple'),
    pantry: items.filter(i => i.source === 'pantry'),
    planAndRecipe: items.filter(i => i.source === 'plan' || i.source === 'recipe')
  };

  // Layout management functions
  const handleCreateLayout = async () => {
    if (!newLayoutName.trim()) return;
    const layout = await createSupermarketLayout(
      newLayoutName.trim(),
      editingCategories.length > 0 ? editingCategories : DEFAULT_CATEGORIES,
      layouts.length === 0 // First layout is default
    );
    if (layout) {
      setLayouts([...layouts, layout]);
      setNewLayoutName('');
      setEditingCategories([]);
      setEditingLayout(null);
    }
  };

  const handleUpdateLayout = async () => {
    if (!editingLayout) return;
    const success = await updateSupermarketLayout(editingLayout.id, {
      name: editingLayout.name,
      categoryOrder: editingCategories
    });
    if (success) {
      setLayouts(layouts.map(l =>
        l.id === editingLayout.id
          ? { ...l, name: editingLayout.name, categoryOrder: editingCategories }
          : l
      ));
      setEditingLayout(null);
      setEditingCategories([]);
    }
  };

  const handleDeleteLayout = async (layoutId: string) => {
    const success = await deleteSupermarketLayout(layoutId);
    if (success) {
      setLayouts(layouts.filter(l => l.id !== layoutId));
      if (selectedLayoutId === layoutId) {
        setSelectedLayoutId(null);
        setSortMode('list');
      }
    }
  };

  const handleSetDefaultLayout = async (layoutId: string) => {
    const success = await setDefaultLayout(layoutId);
    if (success) {
      setLayouts(layouts.map(l => ({ ...l, isDefault: l.id === layoutId })));
    }
  };

  const startEditingLayout = (layout: SupermarketLayout) => {
    setEditingLayout(layout);
    setEditingCategories([...layout.categoryOrder]);
  };

  const handleCategoryDragStart = (e: React.DragEvent, index: number) => {
    setDraggedCategoryIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCategoryDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedCategoryIndex === null || draggedCategoryIndex === index) return;

    const newOrder = [...editingCategories];
    const [removed] = newOrder.splice(draggedCategoryIndex, 1);
    newOrder.splice(index, 0, removed);
    setEditingCategories(newOrder);
    setDraggedCategoryIndex(index);
  };

  const handleCategoryDragEnd = () => {
    setDraggedCategoryIndex(null);
  };

  const addCategoryToLayout = (category: string) => {
    if (!editingCategories.includes(category)) {
      setEditingCategories([...editingCategories, category]);
    }
  };

  const removeCategoryFromLayout = (index: number) => {
    setEditingCategories(editingCategories.filter((_, i) => i !== index));
  };

  // Item drag handlers for list mode
  const handleItemDragStart = (e: React.DragEvent, index: number, itemId: string) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', itemId);
  };

  const handleItemDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;

    // Get current order
    const currentOrder = customItemOrder.length > 0
      ? [...customItemOrder]
      : items.map(i => i.id);

    const [removed] = currentOrder.splice(draggedItemIndex, 1);
    currentOrder.splice(index, 0, removed);
    setCustomItemOrder(currentOrder);
    setDraggedItemIndex(index);
  };

  const handleItemDragEnd = () => {
    setDraggedItemIndex(null);
  };

  // Initialize custom order when items change (if not already set)
  useEffect(() => {
    if (items.length > 0 && customItemOrder.length === 0) {
      // Don't auto-initialize - let user reorder from default
    }
  }, [items, customItemOrder.length]);

  // Generate plain text list for sharing - organized by category for iOS Reminders
  const generateListText = () => {
    // Get items grouped by category (use supermarket layout order if available)
    const categoryMap = new Map<string, ShoppingItem[]>();
    items.forEach(item => {
      if (checkedItems.has(item.id)) return; // Skip checked items
      const cat = item.category || 'Other';
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, []);
      }
      categoryMap.get(cat)!.push(item);
    });

    // Get category order - prefer supermarket layout if in that mode
    let categoryOrder: string[];
    if (sortMode === 'supermarket' && selectedLayoutId) {
      const layout = layouts.find(l => l.id === selectedLayoutId);
      categoryOrder = layout?.categoryOrder || DEFAULT_CATEGORIES;
    } else {
      categoryOrder = DEFAULT_CATEGORIES;
    }

    // Sort categories by order
    const sortedCategories = Array.from(categoryMap.keys()).sort((a, b) => {
      const indexA = categoryOrder.findIndex(c => c.toLowerCase() === a.toLowerCase());
      const indexB = categoryOrder.findIndex(c => c.toLowerCase() === b.toLowerCase());
      const orderA = indexA === -1 ? 999 : indexA;
      const orderB = indexB === -1 ? 999 : indexB;
      return orderA - orderB;
    });

    const lines: string[] = [];

    // For iOS Reminders: each line becomes a separate reminder item
    // Section headers are marked with === to stand out
    sortedCategories.forEach(category => {
      const categoryItems = categoryMap.get(category) || [];
      if (categoryItems.length === 0) return;

      // Add section header
      lines.push(`=== ${category.toUpperCase()} ===`);

      // Add each item as a simple line (iOS Reminders will make each a checkable item)
      categoryItems.forEach(item => {
        let itemText = item.name;
        if (item.quantity) {
          itemText += ` (${item.quantity}${item.unit ? ` ${item.unit}` : ''})`;
        }
        lines.push(itemText);
      });

      lines.push(''); // Empty line between sections
    });

    return lines.join('\n').trim();
  };

  // Generate simple list (one item per line) for iOS Reminders import
  const generateRemindersText = () => {
    // Get items grouped by category
    const categoryMap = new Map<string, ShoppingItem[]>();
    items.forEach(item => {
      if (checkedItems.has(item.id)) return;
      const cat = item.category || 'Other';
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, []);
      }
      categoryMap.get(cat)!.push(item);
    });

    // Get category order
    let categoryOrder: string[];
    if (sortMode === 'supermarket' && selectedLayoutId) {
      const layout = layouts.find(l => l.id === selectedLayoutId);
      categoryOrder = layout?.categoryOrder || DEFAULT_CATEGORIES;
    } else {
      categoryOrder = DEFAULT_CATEGORIES;
    }

    const sortedCategories = Array.from(categoryMap.keys()).sort((a, b) => {
      const indexA = categoryOrder.findIndex(c => c.toLowerCase() === a.toLowerCase());
      const indexB = categoryOrder.findIndex(c => c.toLowerCase() === b.toLowerCase());
      return (indexA === -1 ? 999 : indexA) - (indexB === -1 ? 999 : indexB);
    });

    const lines: string[] = [];

    sortedCategories.forEach(category => {
      const categoryItems = categoryMap.get(category) || [];
      if (categoryItems.length === 0) return;

      // Add category as a header item (will appear as first reminder in section)
      lines.push(`📍 ${category}`);

      categoryItems.forEach(item => {
        let itemText = item.name;
        if (item.quantity) {
          itemText += ` - ${item.quantity}${item.unit ? ` ${item.unit}` : ''}`;
        }
        lines.push(`  • ${itemText}`);
      });
    });

    return lines.join('\n');
  };

  // Share/Export to iOS Reminders
  const handleShare = async () => {
    // Check if there are any unchecked items
    const uncheckedItems = items.filter(i => !checkedItems.has(i.id));
    if (uncheckedItems.length === 0) {
      alert('All items are checked off!');
      return;
    }

    const text = generateRemindersText();

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Shopping List',
          text: text,
        });
      } catch (err) {
        console.log('Share canceled');
      }
    } else {
      navigator.clipboard.writeText(text);
      alert('List copied to clipboard (Share not supported on this device)');
    }
  };

  // Print functionality
  const handlePrint = () => {
    setShowPrintModal(true);
  };

  const executePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shopping List - Kiwi Meal Planner</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
              color: #1e293b;
              line-height: 1.6;
              padding: 24px 32px;
              max-width: 800px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              align-items: center;
              gap: 12px;
              margin-bottom: 20px;
              padding-bottom: 12px;
              border-bottom: 2px solid #059669;
            }
            .logo { display: flex; align-items: center; gap: 8px; }
            .logo-icon {
              width: 40px;
              height: 40px;
              background: #059669;
              border-radius: 8px;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .logo-icon svg { width: 24px; height: 24px; fill: white; }
            .logo-text { font-weight: 700; font-size: 20px; color: #1e293b; }
            .logo-text span { color: #059669; }
            .title { font-size: 24px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
            .date { font-size: 14px; color: #64748b; margin-bottom: 24px; }
            .section { margin-bottom: 24px; }
            .section-title {
              font-size: 16px;
              font-weight: 600;
              color: #059669;
              margin-bottom: 12px;
              padding-bottom: 8px;
              border-bottom: 1px solid #e2e8f0;
            }
            .item {
              padding: 8px 0;
              border-bottom: 1px dashed #e2e8f0;
              display: flex;
              align-items: flex-start;
              gap: 12px;
            }
            .item:last-child { border-bottom: none; }
            .checkbox {
              width: 16px;
              height: 16px;
              border: 2px solid #94a3b8;
              border-radius: 4px;
              flex-shrink: 0;
              margin-top: 2px;
            }
            .item-name { flex: 1; }
            .item-qty { color: #64748b; font-size: 14px; }
            .footer {
              margin-top: 32px;
              padding-top: 16px;
              border-top: 1px solid #e2e8f0;
              text-align: center;
              color: #64748b;
              font-size: 13px;
            }
            .footer a { color: #059669; text-decoration: none; font-weight: 600; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    };
  };

  // PDF Export
  const handleDownloadPDF = async () => {
    try {
      const jsPDF = (await import('jspdf')).default;
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = 210;
      const pageHeight = 297;
      const margin = 20;
      const contentWidth = pageWidth - (margin * 2);
      let yPos = margin;

      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number, fontSize: number, fontStyle: string = 'normal'): number => {
        pdf.setFontSize(fontSize);
        pdf.setFont('helvetica', fontStyle);
        const lines = pdf.splitTextToSize(text, maxWidth);
        lines.forEach((line: string) => {
          if (y > pageHeight - margin) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(line, x, y);
          y += lineHeight;
        });
        return y;
      };

      // Header with logo
      pdf.setFillColor(5, 150, 105);
      pdf.roundedRect(margin, yPos, 10, 10, 2, 2, 'F');
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 41, 59);
      pdf.text('Kiwi', margin + 14, yPos + 7);
      pdf.setTextColor(5, 150, 105);
      pdf.text('MealPlanner', margin + 28, yPos + 7);
      yPos += 15;

      // Header line
      pdf.setDrawColor(5, 150, 105);
      pdf.setLineWidth(0.5);
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Title
      pdf.setTextColor(30, 41, 59);
      pdf.setFontSize(22);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Shopping List', margin, yPos);
      yPos += 8;

      // Date
      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text(new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }), margin, yPos);
      yPos += 12;

      const addSection = (title: string, sectionItems: ShoppingItem[], color: { r: number, g: number, b: number }) => {
        const uncheckedItems = sectionItems.filter(i => !checkedItems.has(i.id));
        if (uncheckedItems.length === 0) return;

        if (yPos > pageHeight - 40) {
          pdf.addPage();
          yPos = margin;
        }

        // Section title
        pdf.setTextColor(color.r, color.g, color.b);
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text(title, margin, yPos);
        yPos += 3;
        pdf.setDrawColor(226, 232, 240);
        pdf.setLineWidth(0.3);
        pdf.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 8;

        // Items
        uncheckedItems.forEach(item => {
          if (yPos > pageHeight - 15) {
            pdf.addPage();
            yPos = margin;
          }

          // Checkbox
          pdf.setDrawColor(148, 163, 184);
          pdf.setLineWidth(0.5);
          pdf.rect(margin, yPos - 4, 4, 4);

          // Item text
          pdf.setTextColor(30, 41, 59);
          pdf.setFontSize(11);
          pdf.setFont('helvetica', 'normal');
          let itemText = item.name;
          if (item.quantity) {
            itemText += ` (${item.quantity}${item.unit ? ` ${item.unit}` : ''})`;
          }
          yPos = addWrappedText(itemText, margin + 8, yPos, contentWidth - 8, 5, 11, 'normal');
          yPos += 2;
        });
        yPos += 5;
      };

      // Add sections
      addSection('Staples to Restock', groupedItems.staples, { r: 217, g: 119, b: 6 }); // amber-600
      addSection('Pantry Items to Restock', groupedItems.pantry, { r: 22, g: 163, b: 74 }); // green-600
      addSection('Ingredients', groupedItems.planAndRecipe, { r: 79, g: 70, b: 229 }); // indigo-600

      // Footer
      if (yPos > pageHeight - 20) {
        pdf.addPage();
        yPos = margin;
      }
      pdf.setDrawColor(226, 232, 240);
      pdf.setLineWidth(0.3);
      pdf.line(margin, yPos + 10, pageWidth - margin, yPos + 10);
      yPos += 18;
      pdf.setTextColor(100, 116, 139);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Powered by ', margin + (contentWidth / 2) - 25, yPos);
      pdf.setTextColor(5, 150, 105);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Kiwi Meal Planner', margin + (contentWidth / 2) - 2, yPos);

      pdf.save(`shopping_list_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('PDF generation failed:', error);
      alert('Failed to generate PDF. Please try printing instead.');
    }
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

      {/* Sort Mode & Layout Selector */}
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-sm text-slate-500">View:</span>
          <div className="flex bg-slate-100 rounded-lg p-1">
            <button
              onClick={() => setSortMode('list')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                sortMode === 'list' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <LayoutList size={14} />
              List
            </button>
            <button
              onClick={() => setSortMode('category')}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
                sortMode === 'category' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Category
            </button>
            <button
              onClick={() => {
                if (hasPro) {
                  setSortMode('supermarket');
                } else {
                  onUpgradeClick?.();
                }
              }}
              className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-1 ${
                sortMode === 'supermarket'
                  ? 'bg-white shadow text-slate-800'
                  : hasPro
                    ? 'text-slate-500 hover:text-slate-700'
                    : 'text-slate-400'
              }`}
            >
              <Store size={14} />
              Supermarket
              {!hasPro && (
                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold rounded-full">
                  <Crown size={10} />
                  PRO
                </span>
              )}
            </button>
          </div>

          {sortMode === 'supermarket' && hasPro && (
            <>
              {layouts.length > 0 ? (
                <select
                  value={selectedLayoutId || ''}
                  onChange={(e) => setSelectedLayoutId(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white"
                >
                  {layouts.map(layout => (
                    <option key={layout.id} value={layout.id}>
                      {layout.name} {layout.isDefault ? '(Default)' : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-xs text-slate-400">No layouts - using default order</span>
              )}
            </>
          )}

          {sortMode === 'list' && (
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <GripVertical size={12} />
              Drag items to reorder
            </span>
          )}

          {hasPro && (
            <button
              onClick={() => setShowLayoutModal(true)}
              className="ml-auto px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 flex items-center gap-1"
            >
              <Settings size={14} />
              Manage Layouts
            </button>
          )}
        </div>
      )}

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
          {/* Dynamic groups based on sort mode */}
          {sortedData.groups.map((group, groupIndex) => {
            const colors = { bg: 'bg-white', border: 'border-slate-200', headerBg: 'bg-slate-50', text: 'text-slate-700', accent: 'text-slate-500', checkBg: 'bg-emerald-500', checkBorder: 'border-emerald-500', uncheckedBorder: 'border-slate-300 hover:border-emerald-500' };

            const uncheckedCount = group.items.filter(i => !checkedItems.has(i.id)).length;

            return (
              <div key={`${group.title}-${groupIndex}`} className={`${colors.bg} rounded-xl border ${colors.border} overflow-hidden`}>
                {/* Only show header for category/supermarket modes, or if it's not the main list group */}
                {(sortMode !== 'list' || group.title !== 'Shopping List') && (
                  <div className={`px-4 py-3 ${colors.headerBg} border-b ${colors.border} flex items-center gap-2`}>
                    {sortMode === 'list' && <LayoutList size={18} className={colors.accent} />}
                    {sortMode === 'category' && <Package size={18} className={colors.accent} />}
                    {sortMode === 'supermarket' && <Store size={18} className={colors.accent} />}
                    <h3 className={`font-semibold ${colors.text}`}>{group.title}</h3>
                    <span className={`ml-auto text-sm ${colors.accent}`}>
                      {uncheckedCount} items
                    </span>
                  </div>
                )}
                <div className="divide-y divide-slate-100">
                  {group.items.map((item, itemIndex) => (
                    <div
                      key={item.id}
                      draggable={sortMode === 'list'}
                      onDragStart={sortMode === 'list' ? (e) => handleItemDragStart(e, itemIndex, item.id) : undefined}
                      onDragOver={sortMode === 'list' ? (e) => handleItemDragOver(e, itemIndex) : undefined}
                      onDragEnd={sortMode === 'list' ? handleItemDragEnd : undefined}
                      className={`flex items-center gap-3 px-4 py-3 transition-all ${
                        checkedItems.has(item.id) ? 'bg-slate-50/50 opacity-60' : 'bg-white'
                      } ${sortMode === 'list' ? 'cursor-move' : ''} ${
                        draggedItemIndex === itemIndex ? 'opacity-50 bg-emerald-50' : ''
                      }`}
                    >
                      {/* Drag handle for list mode */}
                      {sortMode === 'list' && (
                        <GripVertical size={16} className="text-slate-300 flex-shrink-0" />
                      )}
                      <button
                        onClick={() => toggleItem(item.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                          checkedItems.has(item.id)
                            ? `${colors.checkBg} ${colors.checkBorder} text-white`
                            : colors.uncheckedBorder
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
                        {/* Show source info in list mode */}
                        {sortMode === 'list' && (
                          <span className="text-xs text-slate-400">
                            {item.source === 'staple' && 'Staple to restock'}
                            {item.source === 'pantry' && 'Pantry to restock'}
                            {item.source === 'plan' && `From plan: ${item.sourceName}`}
                            {item.source === 'recipe' && `From recipe: ${item.sourceName}`}
                          </span>
                        )}
                        {/* Show category in list mode */}
                        {sortMode === 'list' && item.category && (
                          <span className="text-xs text-slate-300 ml-2">• {item.category}</span>
                        )}
                        {/* Show source in category/supermarket modes */}
                        {(sortMode === 'category' || sortMode === 'supermarket') && (
                          <span className="text-xs text-slate-400">
                            {item.source === 'staple' && 'Staple'}
                            {item.source === 'pantry' && 'Pantry'}
                            {item.source === 'plan' && `Plan: ${item.sourceName}`}
                            {item.source === 'recipe' && `Recipe: ${item.sourceName}`}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Quick actions */}
          <div className="flex flex-wrap gap-3 pt-4">
            <button
              onClick={handleShare}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Share size={16} />
              Share / Reminders
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Printer size={16} />
              Print
            </button>
            <button
              onClick={handleDownloadPDF}
              className="flex items-center gap-2 px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg transition-colors text-sm font-medium"
            >
              <Download size={16} />
              PDF
            </button>
            <button
              onClick={loadData}
              className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors text-sm"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      )}

      {/* Print Modal */}
      {showPrintModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl animate-fadeIn max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-800">Print Shopping List</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={executePrint}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Printer size={18} />
                  Print
                </button>
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Download size={18} />
                  PDF
                </button>
                <button
                  onClick={() => setShowPrintModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X size={20} className="text-slate-400" />
                </button>
              </div>
            </div>

            {/* Preview Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              <div
                ref={printRef}
                className="bg-white rounded-xl shadow-lg p-6 max-w-xl mx-auto"
              >
                {/* Branding Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #059669' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '40px', height: '40px', background: '#059669', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: '24px', height: '24px' }}>
                        <path d="M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6Z"/>
                        <line x1="6" y1="17" x2="18" y2="17"/>
                      </svg>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '20px', color: '#1e293b' }}>
                      Kiwi<span style={{ color: '#059669' }}>MealPlanner</span>
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginBottom: '8px' }}>Shopping List</h1>
                <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '24px' }}>
                  {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>

                {/* Staples Section */}
                {groupedItems.staples.filter(i => !checkedItems.has(i.id)).length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#d97706', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                      Staples to Restock
                    </h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {groupedItems.staples.filter(i => !checkedItems.has(i.id)).map((item, idx) => (
                        <li key={item.id} style={{ padding: '8px 0', borderBottom: idx < groupedItems.staples.filter(i => !checkedItems.has(i.id)).length - 1 ? '1px dashed #e2e8f0' : 'none', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <span style={{ width: '16px', height: '16px', border: '2px solid #94a3b8', borderRadius: '4px', flexShrink: 0, marginTop: '2px' }}></span>
                          <span>
                            {item.name}
                            {item.quantity && item.unit && (
                              <span style={{ color: '#64748b', fontSize: '14px', marginLeft: '8px' }}>
                                ({item.quantity} {item.unit})
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pantry Section */}
                {groupedItems.pantry.filter(i => !checkedItems.has(i.id)).length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#16a34a', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                      Pantry Items to Restock
                    </h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {groupedItems.pantry.filter(i => !checkedItems.has(i.id)).map((item, idx) => (
                        <li key={item.id} style={{ padding: '8px 0', borderBottom: idx < groupedItems.pantry.filter(i => !checkedItems.has(i.id)).length - 1 ? '1px dashed #e2e8f0' : 'none', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <span style={{ width: '16px', height: '16px', border: '2px solid #94a3b8', borderRadius: '4px', flexShrink: 0, marginTop: '2px' }}></span>
                          <span>
                            {item.name}
                            {item.quantity && item.unit && (
                              <span style={{ color: '#64748b', fontSize: '14px', marginLeft: '8px' }}>
                                ({item.quantity} {item.unit})
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Ingredients Section */}
                {groupedItems.planAndRecipe.filter(i => !checkedItems.has(i.id)).length > 0 && (
                  <div style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#4f46e5', marginBottom: '12px', paddingBottom: '8px', borderBottom: '1px solid #e2e8f0' }}>
                      Ingredients
                    </h2>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {groupedItems.planAndRecipe.filter(i => !checkedItems.has(i.id)).map((item, idx) => (
                        <li key={item.id} style={{ padding: '8px 0', borderBottom: idx < groupedItems.planAndRecipe.filter(i => !checkedItems.has(i.id)).length - 1 ? '1px dashed #e2e8f0' : 'none', display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                          <span style={{ width: '16px', height: '16px', border: '2px solid #94a3b8', borderRadius: '4px', flexShrink: 0, marginTop: '2px' }}></span>
                          <span>
                            {item.name}
                            {item.quantity && (
                              <span style={{ color: '#64748b', fontSize: '14px', marginLeft: '8px' }}>
                                ({item.quantity}{item.unit ? ` ${item.unit}` : ''})
                              </span>
                            )}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Footer */}
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                  <p>
                    Powered by <a href="https://kiwimealplanner.com" style={{ color: '#059669', textDecoration: 'none', fontWeight: 600 }}>Kiwi Meal Planner</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Layout Management Modal */}
      {showLayoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-xl animate-fadeIn max-h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Store className="text-emerald-600" size={24} />
                <h2 className="text-lg font-bold text-slate-800">Supermarket Layouts</h2>
              </div>
              <button
                onClick={() => {
                  setShowLayoutModal(false);
                  setEditingLayout(null);
                  setNewLayoutName('');
                  setEditingCategories([]);
                }}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {/* Existing Layouts */}
              {layouts.length > 0 && !editingLayout && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Your Layouts</h3>
                  <div className="space-y-2">
                    {layouts.map(layout => (
                      <div
                        key={layout.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200"
                      >
                        <Store size={18} className="text-slate-400" />
                        <div className="flex-1">
                          <span className="font-medium text-slate-700">{layout.name}</span>
                          {layout.isDefault && (
                            <span className="ml-2 text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded">
                              Default
                            </span>
                          )}
                          <p className="text-xs text-slate-500">{layout.categoryOrder.length} categories</p>
                        </div>
                        <div className="flex items-center gap-1">
                          {!layout.isDefault && (
                            <button
                              onClick={() => handleSetDefaultLayout(layout.id)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                              title="Set as default"
                            >
                              <Star size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => startEditingLayout(layout)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                            title="Edit layout"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteLayout(layout.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Delete layout"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Create/Edit Layout */}
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-3">
                  {editingLayout ? `Edit: ${editingLayout.name}` : 'Create New Layout'}
                </h3>

                <div className="mb-4">
                  <label className="block text-sm text-slate-600 mb-1">Layout Name</label>
                  <input
                    type="text"
                    value={editingLayout ? editingLayout.name : newLayoutName}
                    onChange={(e) => editingLayout
                      ? setEditingLayout({ ...editingLayout, name: e.target.value })
                      : setNewLayoutName(e.target.value)
                    }
                    placeholder="e.g., Countdown Mt Eden"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="mb-4">
                  <label className="block text-sm text-slate-600 mb-2">
                    Category Order (drag to reorder)
                  </label>

                  {/* Category list */}
                  <div className="space-y-1 mb-3 max-h-64 overflow-y-auto border border-slate-200 rounded-lg p-2">
                    {(editingCategories.length > 0 ? editingCategories : (editingLayout ? editingLayout.categoryOrder : DEFAULT_CATEGORIES)).map((cat, idx) => (
                      <div
                        key={`${cat}-${idx}`}
                        draggable
                        onDragStart={(e) => handleCategoryDragStart(e, idx)}
                        onDragOver={(e) => handleCategoryDragOver(e, idx)}
                        onDragEnd={handleCategoryDragEnd}
                        className={`flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded cursor-move ${
                          draggedCategoryIndex === idx ? 'opacity-50' : ''
                        }`}
                      >
                        <GripVertical size={14} className="text-slate-300" />
                        <span className="flex-1 text-sm text-slate-700">{cat}</span>
                        <span className="text-xs text-slate-400">{idx + 1}</span>
                        <button
                          onClick={() => removeCategoryFromLayout(idx)}
                          className="p-1 text-slate-300 hover:text-red-500"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add category */}
                  <div className="flex flex-wrap gap-1">
                    {DEFAULT_CATEGORIES.filter(cat =>
                      !(editingCategories.length > 0 ? editingCategories : (editingLayout?.categoryOrder || DEFAULT_CATEGORIES)).includes(cat)
                    ).map(cat => (
                      <button
                        key={cat}
                        onClick={() => addCategoryToLayout(cat)}
                        className="text-xs px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded"
                      >
                        + {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  {editingLayout ? (
                    <>
                      <button
                        onClick={handleUpdateLayout}
                        className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                      >
                        <SaveIcon size={16} />
                        Save Changes
                      </button>
                      <button
                        onClick={() => {
                          setEditingLayout(null);
                          setEditingCategories([]);
                        }}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        if (!editingCategories.length) {
                          setEditingCategories([...DEFAULT_CATEGORIES]);
                        }
                        handleCreateLayout();
                      }}
                      disabled={!newLayoutName.trim()}
                      className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                    >
                      <Plus size={16} />
                      Create Layout
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-slate-500 mt-4">
                Create custom layouts to match how your local supermarket is organized.
                Drag categories to match your store's aisle order for faster shopping.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MasterShoppingList;
