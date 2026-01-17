import React, { useState, useEffect } from 'react';
import { PantryItem, PantryCategory } from '../types';
import { Plus, FolderPlus, Sparkles, Loader2 } from 'lucide-react';
import PantryCategorySection from './PantryCategorySection';
import {
  loadPantryCategories,
  createPantryCategory,
  updatePantryCategory,
  deletePantryCategory,
  reorderCategories,
  reorderPantryItems,
  updatePantryItemCategory,
} from '../services/storageService';
import { suggestCategoriesForItems } from '../services/geminiService';

interface PantryCategorizedListProps {
  items: PantryItem[];
  setItems: React.Dispatch<React.SetStateAction<PantryItem[]>>;
  isStaple: boolean;
  onItemClick: (item: PantryItem) => void;
  onToggleStaple: (itemId: string, isStaple: boolean, categoryName?: string) => void;
  onToggleRestock: (itemId: string, needsRestock: boolean) => void;
  onRemoveItem: (itemId: string) => void;
  formatQuantity: (item: PantryItem) => string | null;
  onCategoriesChange?: (categories: PantryCategory[]) => void;
  onCreateCategoryRef?: React.MutableRefObject<((name: string) => Promise<PantryCategory | null>) | null>;
}

const PantryCategorizedList: React.FC<PantryCategorizedListProps> = ({
  items,
  setItems,
  isStaple,
  onItemClick,
  onToggleStaple,
  onToggleRestock,
  onRemoveItem,
  formatQuantity,
  onCategoriesChange,
  onCreateCategoryRef,
}) => {
  const [categories, setCategories] = useState<PantryCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [isSuggestingCategories, setIsSuggestingCategories] = useState(false);

  // Drag state
  const [draggedItem, setDraggedItem] = useState<PantryItem | null>(null);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [dropTargetCategoryId, setDropTargetCategoryId] = useState<string | null | 'uncategorized'>(null);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      const cats = await loadPantryCategories(isStaple);
      setCategories(cats);
      onCategoriesChange?.(cats);
    };
    loadCategories();
  }, [isStaple, onCategoriesChange]);

  // Expose create category function to parent via ref
  useEffect(() => {
    if (onCreateCategoryRef) {
      onCreateCategoryRef.current = handleAddCategory;
    }
    return () => {
      if (onCreateCategoryRef) {
        onCreateCategoryRef.current = null;
      }
    };
  }, [onCreateCategoryRef, categories, isStaple]);

  // Filter items by staple status
  const filteredItems = items.filter(item => (item.isStaple || false) === isStaple);

  // Group items by category
  const itemsByCategory = new Map<string | null, PantryItem[]>();
  filteredItems.forEach(item => {
    const catId = item.categoryId || null;
    if (!itemsByCategory.has(catId)) {
      itemsByCategory.set(catId, []);
    }
    itemsByCategory.get(catId)!.push(item);
  });

  // Sort items within each category by sortOrder
  itemsByCategory.forEach((items, catId) => {
    items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  });

  const uncategorizedItems = itemsByCategory.get(null) || [];

  const handleAddCategory = async (name?: string): Promise<PantryCategory | null> => {
    const categoryName = name || newCategoryName.trim();
    if (!categoryName) return null;

    setIsAddingCategory(true);
    const newCat = await createPantryCategory(categoryName, isStaple);
    if (newCat) {
      const updatedCategories = [...categories, newCat];
      setCategories(updatedCategories);
      onCategoriesChange?.(updatedCategories);
      if (!name) {
        setNewCategoryName('');
        setShowAddCategory(false);
      }
    }
    setIsAddingCategory(false);
    return newCat;
  };

  const handleToggleCollapse = async (categoryId: string) => {
    const cat = categories.find(c => c.id === categoryId);
    if (!cat) return;

    const newCollapsed = !cat.isCollapsed;
    await updatePantryCategory(categoryId, { isCollapsed: newCollapsed });
    setCategories(categories.map(c =>
      c.id === categoryId ? { ...c, isCollapsed: newCollapsed } : c
    ));
  };

  const handleDeleteCategory = async (categoryId: string) => {
    await deletePantryCategory(categoryId);
    const updatedCategories = categories.filter(c => c.id !== categoryId);
    setCategories(updatedCategories);
    onCategoriesChange?.(updatedCategories);
    // Items in this category will have categoryId set to null automatically by DB
    setItems(items.map(item =>
      item.categoryId === categoryId ? { ...item, categoryId: undefined } : item
    ));
  };

  const handleRenameCategory = async (categoryId: string, newName: string) => {
    await updatePantryCategory(categoryId, { name: newName });
    setCategories(categories.map(c =>
      c.id === categoryId ? { ...c, name: newName } : c
    ));
  };

  // AI suggest categories for all uncategorized items
  const handleAISuggestCategories = async () => {
    if (uncategorizedItems.length === 0) return;

    setIsSuggestingCategories(true);
    try {
      const itemNames = uncategorizedItems.map(item => item.name);
      const suggestions = await suggestCategoriesForItems(itemNames);

      // Track which categories need to be created
      let updatedCategories = [...categories];

      // Process each suggestion
      for (const suggestion of suggestions) {
        // Find the item that matches this suggestion
        const item = uncategorizedItems.find(
          i => i.name.toLowerCase() === suggestion.name.toLowerCase()
        );
        if (!item) continue;

        // Find or create the category
        let category = updatedCategories.find(
          c => c.name.toLowerCase() === suggestion.suggestedCategory.toLowerCase()
        );

        if (!category) {
          // Create the category
          const newCat = await createPantryCategory(suggestion.suggestedCategory, isStaple);
          if (newCat) {
            category = newCat;
            updatedCategories = [...updatedCategories, newCat];
          }
        }

        if (category) {
          // Update the item's category
          const success = await updatePantryItemCategory(item.id, category.id);
          if (success) {
            setItems(prevItems => prevItems.map(i =>
              i.id === item.id ? { ...i, categoryId: category!.id } : i
            ));
          }
        }
      }

      // Update categories state
      setCategories(updatedCategories);
      onCategoriesChange?.(updatedCategories);
    } catch (error) {
      console.error('Failed to suggest categories:', error);
    } finally {
      setIsSuggestingCategories(false);
    }
  };

  // Drag and Drop handlers for categories
  const handleDragStartCategory = (e: React.DragEvent, categoryId: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('type', 'category');
    e.dataTransfer.setData('categoryId', categoryId);
    setDraggedCategoryId(categoryId);
  };

  const handleDragOverCategory = (e: React.DragEvent, targetCategoryId: string | null) => {
    e.preventDefault();
    if (draggedItem) {
      setDropTargetCategoryId(targetCategoryId === null ? 'uncategorized' : targetCategoryId);
    }
  };

  const handleDropOnCategory = async (e: React.DragEvent, targetCategoryId: string | null) => {
    e.preventDefault();
    const type = e.dataTransfer.getData('type');

    if (type === 'category' && draggedCategoryId) {
      // Reorder categories
      if (targetCategoryId && draggedCategoryId !== targetCategoryId) {
        const draggedIndex = categories.findIndex(c => c.id === draggedCategoryId);
        const targetIndex = categories.findIndex(c => c.id === targetCategoryId);

        if (draggedIndex !== -1 && targetIndex !== -1) {
          const newCategories = [...categories];
          const [removed] = newCategories.splice(draggedIndex, 1);
          newCategories.splice(targetIndex, 0, removed);

          setCategories(newCategories);
          await reorderCategories(newCategories.map(c => c.id));
        }
      }
    } else if (draggedItem) {
      // Move item to category
      const newCategoryId = targetCategoryId;

      // Update item's category
      const updatedItems = items.map(item =>
        item.id === draggedItem.id
          ? { ...item, categoryId: newCategoryId || undefined }
          : item
      );
      setItems(updatedItems);

      // Persist
      await reorderPantryItems([{
        id: draggedItem.id,
        sortOrder: draggedItem.sortOrder || 0,
        categoryId: newCategoryId,
      }]);
    }

    setDraggedCategoryId(null);
    setDraggedItem(null);
    setDropTargetCategoryId(null);
  };

  // Drag and Drop handlers for items
  const handleDragStartItem = (e: React.DragEvent, item: PantryItem) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('type', 'item');
    e.dataTransfer.setData('itemId', item.id);
    setDraggedItem(item);
  };

  const handleDragOverItem = (e: React.DragEvent, targetItem: PantryItem) => {
    e.preventDefault();
    // Could show insertion indicator here
  };

  const handleDropOnItem = async (e: React.DragEvent, targetItem: PantryItem) => {
    e.preventDefault();

    if (!draggedItem || draggedItem.id === targetItem.id) {
      setDraggedItem(null);
      return;
    }

    // Get items in the same category as target
    const targetCategoryId = targetItem.categoryId || null;
    const categoryItems = filteredItems
      .filter(item => (item.categoryId || null) === targetCategoryId)
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    // Find indices
    const draggedIndex = categoryItems.findIndex(i => i.id === draggedItem.id);
    const targetIndex = categoryItems.findIndex(i => i.id === targetItem.id);

    // If dragged item is from a different category, insert it
    if (draggedIndex === -1) {
      // Item from different category - insert before target
      const newItems = items.map(item => {
        if (item.id === draggedItem.id) {
          return { ...item, categoryId: targetCategoryId || undefined, sortOrder: (targetItem.sortOrder || 0) - 0.5 };
        }
        return item;
      });

      // Recalculate sort orders for the category
      const updatedCategoryItems = newItems
        .filter(item => (item.isStaple || false) === isStaple && (item.categoryId || null) === targetCategoryId)
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      const itemUpdates = updatedCategoryItems.map((item, index) => ({
        id: item.id,
        sortOrder: index,
        categoryId: targetCategoryId,
      }));

      setItems(newItems.map(item => {
        const update = itemUpdates.find(u => u.id === item.id);
        return update ? { ...item, sortOrder: update.sortOrder, categoryId: update.categoryId || undefined } : item;
      }));

      await reorderPantryItems(itemUpdates);
    } else {
      // Reorder within same category
      const newOrder = [...categoryItems];
      const [removed] = newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, removed);

      const itemUpdates = newOrder.map((item, index) => ({
        id: item.id,
        sortOrder: index,
        categoryId: targetCategoryId,
      }));

      setItems(items.map(item => {
        const update = itemUpdates.find(u => u.id === item.id);
        return update ? { ...item, sortOrder: update.sortOrder } : item;
      }));

      await reorderPantryItems(itemUpdates);
    }

    setDraggedItem(null);
    setDropTargetCategoryId(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDraggedCategoryId(null);
    setDropTargetCategoryId(null);
  };

  const accentColor = isStaple ? 'amber' : 'emerald';

  return (
    <div className="space-y-2">
      {/* Add Category Button/Input */}
      <div className="mb-4">
        {showAddCategory ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddCategory();
                if (e.key === 'Escape') {
                  setShowAddCategory(false);
                  setNewCategoryName('');
                }
              }}
              placeholder="Category name..."
              className={`flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-${accentColor}-300`}
              autoFocus
            />
            <button
              onClick={() => handleAddCategory()}
              disabled={!newCategoryName.trim() || isAddingCategory}
              className={`px-4 py-2 rounded-lg text-white font-medium text-sm transition-colors ${
                isStaple
                  ? 'bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300'
                  : 'bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300'
              }`}
            >
              Add
            </button>
            <button
              onClick={() => {
                setShowAddCategory(false);
                setNewCategoryName('');
              }}
              className="px-3 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowAddCategory(true)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg border-2 border-dashed transition-colors text-sm ${
                isStaple
                  ? 'border-amber-300 text-amber-600 hover:bg-amber-50'
                  : 'border-emerald-300 text-emerald-600 hover:bg-emerald-50'
              }`}
            >
              <FolderPlus size={16} />
              Add Category
            </button>
            {/* AI Suggest button - only show if there are uncategorized items */}
            {uncategorizedItems.length > 0 && (
              <button
                onClick={handleAISuggestCategories}
                disabled={isSuggestingCategories}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-100 text-purple-700 hover:bg-purple-200 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSuggestingCategories ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Organizing...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    AI Organize ({uncategorizedItems.length})
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Categories */}
      {categories.map(category => (
        <PantryCategorySection
          key={category.id}
          category={category}
          items={itemsByCategory.get(category.id) || []}
          isStaple={isStaple}
          onToggleCollapse={handleToggleCollapse}
          onDeleteCategory={handleDeleteCategory}
          onRenameCategory={handleRenameCategory}
          onItemClick={onItemClick}
          onToggleStaple={onToggleStaple}
          onToggleRestock={onToggleRestock}
          onRemoveItem={onRemoveItem}
          formatQuantity={formatQuantity}
          onDragStartCategory={handleDragStartCategory}
          onDragOverCategory={handleDragOverCategory}
          onDropOnCategory={handleDropOnCategory}
          onDragStartItem={handleDragStartItem}
          onDragOverItem={handleDragOverItem}
          onDropOnItem={handleDropOnItem}
          onDragEnd={handleDragEnd}
          isDraggingOver={dropTargetCategoryId === category.id}
        />
      ))}

      {/* Uncategorized Items */}
      <PantryCategorySection
        category={null}
        items={uncategorizedItems}
        isStaple={isStaple}
        onToggleCollapse={() => {}}
        onDeleteCategory={() => {}}
        onRenameCategory={() => {}}
        onItemClick={onItemClick}
        onToggleStaple={onToggleStaple}
        onToggleRestock={onToggleRestock}
        onRemoveItem={onRemoveItem}
        formatQuantity={formatQuantity}
        onDragStartItem={handleDragStartItem}
        onDragOverCategory={handleDragOverCategory}
        onDropOnCategory={handleDropOnCategory}
        onDragOverItem={handleDragOverItem}
        onDropOnItem={handleDropOnItem}
        onDragEnd={handleDragEnd}
        isDraggingOver={dropTargetCategoryId === 'uncategorized'}
      />

      {/* Empty state */}
      {filteredItems.length === 0 && (
        <div className={`flex flex-col items-center justify-center py-8 text-slate-400`}>
          <p>No items yet.</p>
          <p className="text-sm mt-1">Add items using the form above.</p>
        </div>
      )}
    </div>
  );
};

export default PantryCategorizedList;
