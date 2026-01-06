import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, ChevronDown, FolderPlus, Check, Loader2 } from 'lucide-react';
import type { RecipeCategory } from '../services/recipeCategoryService';

interface CategorySelectorProps {
  categories: RecipeCategory[];
  selectedCategoryIds: string[];
  onChange: (categoryIds: string[]) => void;
  onCreateCategory?: (name: string) => Promise<RecipeCategory | null>;
  disabled?: boolean;
  placeholder?: string;
  compact?: boolean; // For inline display next to rating
}

// Color options for categories
const CATEGORY_COLORS = [
  { value: 'slate', label: 'Gray', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-200' },
  { value: 'rose', label: 'Rose', bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  { value: 'orange', label: 'Orange', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  { value: 'amber', label: 'Amber', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  { value: 'emerald', label: 'Green', bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  { value: 'teal', label: 'Teal', bg: 'bg-teal-100', text: 'text-teal-700', border: 'border-teal-200' },
  { value: 'blue', label: 'Blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  { value: 'indigo', label: 'Indigo', bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
  { value: 'purple', label: 'Purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  { value: 'pink', label: 'Pink', bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-200' },
];

export const getCategoryColorClasses = (color: string) => {
  const found = CATEGORY_COLORS.find(c => c.value === color);
  return found || CATEGORY_COLORS[0];
};

const CategorySelector: React.FC<CategorySelectorProps> = ({
  categories,
  selectedCategoryIds,
  onChange,
  onCreateCategory,
  disabled = false,
  placeholder = 'Add to category...',
  compact = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter categories based on input
  const filteredCategories = inputValue.length > 0
    ? categories.filter(cat =>
        cat.name.toLowerCase().includes(inputValue.toLowerCase())
      )
    : categories;

  // Check if input matches an existing category exactly
  const exactMatch = categories.find(
    cat => cat.name.toLowerCase() === inputValue.toLowerCase()
  );

  // Check if we should show the "create new" option
  const showCreateOption = inputValue.trim().length > 0 && !exactMatch && onCreateCategory;

  // Get selected categories
  const selectedCategories = categories.filter(cat => selectedCategoryIds.includes(cat.id));

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when suggestions change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [filteredCategories.length]);

  const toggleCategory = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      onChange(selectedCategoryIds.filter(id => id !== categoryId));
    } else {
      onChange([...selectedCategoryIds, categoryId]);
    }
  };

  const handleCreateCategory = async () => {
    if (!onCreateCategory || !inputValue.trim() || isCreating) return;

    setIsCreating(true);
    try {
      const newCategory = await onCreateCategory(inputValue.trim());
      if (newCategory) {
        onChange([...selectedCategoryIds, newCategory.id]);
        setInputValue('');
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showCreateOption && highlightedIndex === filteredCategories.length) {
        handleCreateCategory();
      } else if (filteredCategories.length > 0 && highlightedIndex < filteredCategories.length) {
        toggleCategory(filteredCategories[highlightedIndex].id);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const maxIndex = showCreateOption ? filteredCategories.length : filteredCategories.length - 1;
      setHighlightedIndex(prev => Math.min(prev + 1, maxIndex));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  if (compact) {
    // Compact mode - just shows the add button (selected categories are shown by parent)
    return (
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center gap-1 flex-wrap">
          {!disabled && (
            <button
              type="button"
              onClick={() => setShowDropdown(!showDropdown)}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 border border-indigo-200 rounded-full transition-colors"
            >
              <Plus size={14} />
              Category
            </button>
          )}
        </div>

        {/* Dropdown */}
        {showDropdown && !disabled && (
          <div className="absolute z-50 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-hidden right-0">
            {/* Search input */}
            <div className="p-2 border-b border-slate-100">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search or create..."
                className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-500"
                autoFocus
              />
            </div>

            {/* Category list */}
            <div className="max-h-44 overflow-y-auto">
              {filteredCategories.length === 0 && !showCreateOption && (
                <div className="px-3 py-2 text-sm text-slate-400">
                  No categories found
                </div>
              )}

              {filteredCategories.map((cat, idx) => {
                const isSelected = selectedCategoryIds.includes(cat.id);
                const colors = getCategoryColorClasses(cat.color);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                      idx === highlightedIndex ? 'bg-slate-50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                    }`}>
                      {isSelected && <Check size={12} className="text-white" />}
                    </div>
                    <span className={`w-3 h-3 rounded-full ${colors.bg}`} />
                    <span className="flex-1 truncate">{cat.name}</span>
                  </button>
                );
              })}

              {/* Create new option */}
              {showCreateOption && (
                <button
                  type="button"
                  onClick={handleCreateCategory}
                  disabled={isCreating}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors border-t border-slate-100 ${
                    highlightedIndex === filteredCategories.length ? 'bg-emerald-50' : 'hover:bg-emerald-50'
                  }`}
                >
                  {isCreating ? (
                    <Loader2 size={14} className="animate-spin text-emerald-600" />
                  ) : (
                    <Plus size={14} className="text-emerald-600" />
                  )}
                  <span className="text-emerald-700">Create "{inputValue}"</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full mode - with input field
  return (
    <div className="relative" ref={dropdownRef}>
      {/* Selected categories and input container */}
      <div
        className={`flex flex-wrap gap-2 p-2 border rounded-xl bg-white min-h-[44px] ${
          disabled ? 'bg-slate-50 cursor-not-allowed' : 'focus-within:ring-2 focus-within:ring-indigo-500 focus-within:border-indigo-500'
        }`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {/* Selected categories */}
        {selectedCategories.map(cat => {
          const colors = getCategoryColorClasses(cat.color);
          return (
            <span
              key={cat.id}
              className={`inline-flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}
            >
              {cat.name}
              {!disabled && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); toggleCategory(cat.id); }}
                  className="hover:bg-black/10 rounded-full p-0.5"
                >
                  <X size={12} />
                </button>
              )}
            </span>
          );
        })}

        {/* Input field */}
        {!disabled && (
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder={selectedCategories.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[100px] outline-none text-sm bg-transparent"
            disabled={disabled}
          />
        )}

        {/* Dropdown trigger */}
        {!disabled && (
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="ml-auto text-slate-400 hover:text-slate-600"
          >
            <ChevronDown size={16} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {showDropdown && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {filteredCategories.length === 0 && !showCreateOption && (
            <div className="px-3 py-4 text-sm text-slate-400 text-center">
              {categories.length === 0 ? (
                <div>
                  <p>No categories yet</p>
                  <p className="text-xs mt-1">Type to create your first category</p>
                </div>
              ) : (
                'No matching categories'
              )}
            </div>
          )}

          {filteredCategories.map((cat, idx) => {
            const isSelected = selectedCategoryIds.includes(cat.id);
            const colors = getCategoryColorClasses(cat.color);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                  idx === highlightedIndex ? 'bg-slate-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                  isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                }`}>
                  {isSelected && <Check size={12} className="text-white" />}
                </div>
                <span className={`w-3 h-3 rounded-full ${colors.bg}`} />
                <span className="flex-1 truncate">{cat.name}</span>
              </button>
            );
          })}

          {/* Create new option */}
          {showCreateOption && (
            <button
              type="button"
              onClick={handleCreateCategory}
              disabled={isCreating}
              className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors border-t border-slate-100 ${
                highlightedIndex === filteredCategories.length ? 'bg-emerald-50' : 'hover:bg-emerald-50'
              }`}
            >
              {isCreating ? (
                <Loader2 size={14} className="animate-spin text-emerald-600" />
              ) : (
                <Plus size={14} className="text-emerald-600" />
              )}
              <span className="text-emerald-700">Create "{inputValue}"</span>
            </button>
          )}
        </div>
      )}

      {/* Helper text */}
      {!disabled && (
        <div className="mt-1 text-xs text-slate-400">
          Type to search or create new categories
        </div>
      )}
    </div>
  );
};

export default CategorySelector;
