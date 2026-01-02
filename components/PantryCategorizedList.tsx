import React, { useState, useEffect } from 'react';
import { PantryItem, PantryCategory } from '../types';
import { Plus, FolderPlus } from 'lucide-react';
import PantryCategorySection from './PantryCategorySection';
import {
  loadPantryCategories,
  createPantryCategory,
  updatePantryCategory,
  deletePantryCategory,
  reorderCategories,
  reorderPantryItems,
} from '../services/storageService';

interface PantryCategorizedListProps {
  items: PantryItem[];
  setItems: React.Dispatch<React.SetStateAction<PantryItem[]>>;
  isStaple: boolean;
  onItemClick: (item: PantryItem) => void;
  onToggleStaple: (itemId: string, isStaple: boolean, categoryName?: string) => void;
  onToggleRestock: (itemId: string, needsRestock: boolean) => void;
  onRemoveItem: (itemId: string) => void;
  formatQuantity: (item: PantryItem) => string | null;
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
}) => {
  const [categories, setCategories] = useState<PantryCategory[]>([]);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [isAddingCategory, setIsAddingCategory] = useState(false);

  // Drag state
  const [draggedItem, setDraggedItem] = useState<PantryItem | null>(null);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [dropTargetCategoryId, setDropTargetCategoryId] = useState<string | null | 'uncategorized'>(null);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      const cats = await loadPantryCategories(isStaple);
      setCategories(cats);
    };
    loadCategories();
  }, [isStaple]);

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

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;

    setIsAddingCategory(true);
    const newCat = await createPantryCategory(newCategoryName.trim(), isStaple);
    if (newCat) {
      setCategories([...categories, newCat]);
      setNewCategoryName('');
      setShowAddCategory(false);
    }
    setIsAddingCategory(false);
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
    setCategories(categories.filter(c => c.id !== categoryId));
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
              onClick={handleAddCategory}
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
