import React, { useState } from 'react';
import { PantryItem, PantryCategory } from '../types';
import { ChevronDown, ChevronRight, GripVertical, Trash2, Star, Edit2, X, Check } from 'lucide-react';

interface PantryCategorySectionProps {
  category: PantryCategory | null; // null for uncategorized
  items: PantryItem[];
  isStaple: boolean;
  onToggleCollapse: (categoryId: string) => void;
  onDeleteCategory: (categoryId: string) => void;
  onRenameCategory: (categoryId: string, newName: string) => void;
  onItemClick: (item: PantryItem) => void;
  onToggleStaple: (itemId: string, isStaple: boolean) => void;
  onToggleRestock: (itemId: string, needsRestock: boolean) => void;
  onRemoveItem: (itemId: string) => void;
  formatQuantity: (item: PantryItem) => string | null;
  // Drag and drop handlers
  onDragStartCategory?: (e: React.DragEvent, categoryId: string) => void;
  onDragOverCategory?: (e: React.DragEvent, categoryId: string | null) => void;
  onDropOnCategory?: (e: React.DragEvent, categoryId: string | null) => void;
  onDragStartItem?: (e: React.DragEvent, item: PantryItem) => void;
  onDragOverItem?: (e: React.DragEvent, targetItem: PantryItem) => void;
  onDropOnItem?: (e: React.DragEvent, targetItem: PantryItem) => void;
  onDragEnd?: () => void;
  isDraggingOver?: boolean;
}

const PantryCategorySection: React.FC<PantryCategorySectionProps> = ({
  category,
  items,
  isStaple,
  onToggleCollapse,
  onDeleteCategory,
  onRenameCategory,
  onItemClick,
  onToggleStaple,
  onToggleRestock,
  onRemoveItem,
  formatQuantity,
  onDragStartCategory,
  onDragOverCategory,
  onDropOnCategory,
  onDragStartItem,
  onDragOverItem,
  onDropOnItem,
  onDragEnd,
  isDraggingOver,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(category?.name || '');

  const isCollapsed = category?.isCollapsed ?? false;
  const categoryId = category?.id || null;

  const handleSaveRename = () => {
    if (category && editName.trim() && editName !== category.name) {
      onRenameCategory(category.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelRename = () => {
    setEditName(category?.name || '');
    setIsEditing(false);
  };

  const accentColor = isStaple ? 'amber' : 'emerald';

  return (
    <div
      className={`mb-3 ${isDraggingOver ? `ring-2 ring-${accentColor}-400 rounded-lg` : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        onDragOverCategory?.(e, categoryId);
      }}
      onDrop={(e) => onDropOnCategory?.(e, categoryId)}
    >
      {/* Category Header */}
      {category && (
        <div
          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer select-none transition-colors ${
            isStaple
              ? 'bg-amber-100 hover:bg-amber-200'
              : 'bg-emerald-100 hover:bg-emerald-200'
          }`}
          draggable
          onDragStart={(e) => onDragStartCategory?.(e, category.id)}
          onDragEnd={onDragEnd}
        >
          {/* Drag handle */}
          <div className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600">
            <GripVertical size={16} />
          </div>

          {/* Collapse toggle */}
          <button
            onClick={() => onToggleCollapse(category.id)}
            className={`p-0.5 rounded transition-colors ${
              isStaple ? 'text-amber-700 hover:bg-amber-300' : 'text-emerald-700 hover:bg-emerald-300'
            }`}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
          </button>

          {/* Category name */}
          {isEditing ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveRename();
                  if (e.key === 'Escape') handleCancelRename();
                }}
                className="flex-1 px-2 py-1 rounded border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                autoFocus
              />
              <button
                onClick={handleSaveRename}
                className="p-1 text-green-600 hover:bg-green-100 rounded"
              >
                <Check size={16} />
              </button>
              <button
                onClick={handleCancelRename}
                className="p-1 text-slate-500 hover:bg-slate-200 rounded"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <span
              className={`flex-1 font-medium text-sm ${
                isStaple ? 'text-amber-800' : 'text-emerald-800'
              }`}
              onClick={() => onToggleCollapse(category.id)}
            >
              {category.name}
            </span>
          )}

          {/* Item count */}
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            isStaple ? 'bg-amber-200 text-amber-700' : 'bg-emerald-200 text-emerald-700'
          }`}>
            {items.length}
          </span>

          {/* Actions */}
          {!isEditing && (
            <div className="flex items-center gap-1">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsEditing(true);
                }}
                className="p-1 text-slate-500 hover:text-slate-700 hover:bg-white/50 rounded opacity-0 group-hover:opacity-100"
              >
                <Edit2 size={14} />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`Delete category "${category.name}"? Items will be moved to Uncategorized.`)) {
                    onDeleteCategory(category.id);
                  }
                }}
                className="p-1 text-slate-500 hover:text-red-600 hover:bg-white/50 rounded"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Uncategorized header */}
      {!category && items.length > 0 && (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
          isStaple ? 'bg-slate-100' : 'bg-slate-100'
        }`}>
          <span className="flex-1 font-medium text-sm text-slate-600">
            Uncategorized
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-200 text-slate-600">
            {items.length}
          </span>
        </div>
      )}

      {/* Items */}
      {(!category || !isCollapsed) && items.length > 0 && (
        <div className={`mt-2 ${category ? 'ml-4' : ''} space-y-1`}>
          {items.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => onDragStartItem?.(e, item)}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDragOverItem?.(e, item);
              }}
              onDrop={(e) => {
                e.stopPropagation();
                onDropOnItem?.(e, item);
              }}
              onDragEnd={onDragEnd}
              className={`group flex items-center gap-2 bg-white px-3 py-2 rounded-md shadow-sm border border-slate-100 hover:border-${accentColor}-300 transition-colors cursor-grab active:cursor-grabbing`}
            >
              {/* Drag handle */}
              <div className="text-slate-300 group-hover:text-slate-400">
                <GripVertical size={14} />
              </div>

              {/* Staples: Restock checkbox */}
              {isStaple && (
                <input
                  type="checkbox"
                  checked={item.needsRestock || false}
                  onChange={() => onToggleRestock(item.id, item.needsRestock || false)}
                  className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500"
                  title="Check when you need to restock"
                />
              )}

              {/* Item content - clickable for quantity edit */}
              <button
                onClick={() => onItemClick(item)}
                className="flex-1 text-left flex flex-col min-w-0"
                title="Click to edit quantity"
              >
                <span className={`text-slate-700 truncate text-sm ${
                  item.needsRestock ? 'line-through text-slate-400' : ''
                }`}>
                  {item.name}
                </span>
                {formatQuantity(item) ? (
                  <span className={`text-xs font-medium ${isStaple ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {formatQuantity(item)}
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    + Add amount
                  </span>
                )}
              </button>

              {/* Need to buy badge for staples */}
              {isStaple && item.needsRestock && (
                <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full flex-shrink-0">
                  Need to buy
                </span>
              )}

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleStaple(item.id, item.isStaple || false);
                  }}
                  className={`p-1 rounded ${
                    isStaple
                      ? 'text-amber-500 hover:text-slate-400'
                      : 'text-slate-400 hover:text-amber-500'
                  }`}
                  title={isStaple ? 'Move to pantry' : 'Mark as staple'}
                >
                  <Star size={14} fill={isStaple ? 'currentColor' : 'none'} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveItem(item.id);
                  }}
                  className="p-1 text-slate-400 hover:text-red-500 rounded"
                  title="Remove item"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty category message */}
      {category && !isCollapsed && items.length === 0 && (
        <div className={`mt-2 ml-4 px-3 py-4 rounded-lg border-2 border-dashed ${
          isStaple ? 'border-amber-200 text-amber-400' : 'border-emerald-200 text-emerald-400'
        } text-center text-sm`}>
          Drag items here
        </div>
      )}
    </div>
  );
};

export default PantryCategorySection;
