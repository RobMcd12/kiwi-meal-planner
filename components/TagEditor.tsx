import React, { useState, useRef, useEffect } from 'react';
import { X, Plus, ChevronDown } from 'lucide-react';
import { TAG_CATEGORIES } from '../services/geminiService';

interface TagEditorProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  maxTags?: number;
}

const ALL_TAGS = [
  ...TAG_CATEGORIES.cuisine,
  ...TAG_CATEGORIES.dietary,
  ...TAG_CATEGORIES.mealType,
  ...TAG_CATEGORIES.other
];

const TagEditor: React.FC<TagEditorProps> = ({
  tags,
  onChange,
  disabled = false,
  placeholder = 'Add tags...',
  maxTags = 10
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  const suggestions = inputValue.length > 0
    ? ALL_TAGS.filter(tag =>
        tag.toLowerCase().includes(inputValue.toLowerCase()) &&
        !tags.some(t => t.toLowerCase() === tag.toLowerCase())
      ).slice(0, 8)
    : ALL_TAGS.filter(tag =>
        !tags.some(t => t.toLowerCase() === tag.toLowerCase())
      ).slice(0, 8);

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
  }, [suggestions.length]);

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (
      trimmedTag &&
      !tags.some(t => t.toLowerCase() === trimmedTag.toLowerCase()) &&
      tags.length < maxTags
    ) {
      onChange([...tags, trimmedTag]);
    }
    setInputValue('');
    setShowDropdown(false);
    inputRef.current?.focus();
  };

  const removeTag = (tagToRemove: string) => {
    onChange(tags.filter(t => t !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showDropdown && suggestions.length > 0) {
        addTag(suggestions[highlightedIndex]);
      } else if (inputValue.trim()) {
        addTag(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  // Get tag color based on category
  const getTagColor = (tag: string) => {
    if (TAG_CATEGORIES.cuisine.includes(tag)) return 'bg-blue-100 text-blue-700 border-blue-200';
    if (TAG_CATEGORIES.dietary.includes(tag)) return 'bg-green-100 text-green-700 border-green-200';
    if (TAG_CATEGORIES.mealType.includes(tag)) return 'bg-purple-100 text-purple-700 border-purple-200';
    if (TAG_CATEGORIES.other.includes(tag)) return 'bg-orange-100 text-orange-700 border-orange-200';
    return 'bg-slate-100 text-slate-700 border-slate-200'; // Custom tags
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Tags and input container */}
      <div
        className={`flex flex-wrap gap-2 p-2 border rounded-xl bg-white min-h-[44px] ${
          disabled ? 'bg-slate-50 cursor-not-allowed' : 'focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500'
        }`}
        onClick={() => !disabled && inputRef.current?.focus()}
      >
        {/* Existing tags */}
        {tags.map(tag => (
          <span
            key={tag}
            className={`inline-flex items-center gap-1 px-2 py-1 text-sm font-medium rounded-full border ${getTagColor(tag)}`}
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(tag); }}
                className="hover:bg-black/10 rounded-full p-0.5"
              >
                <X size={12} />
              </button>
            )}
          </span>
        ))}

        {/* Input field */}
        {!disabled && tags.length < maxTags && (
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
            placeholder={tags.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[100px] outline-none text-sm bg-transparent"
            disabled={disabled}
          />
        )}

        {/* Dropdown trigger for empty input */}
        {!disabled && tags.length < maxTags && inputValue === '' && (
          <button
            type="button"
            onClick={() => setShowDropdown(!showDropdown)}
            className="ml-auto text-slate-400 hover:text-slate-600"
          >
            <ChevronDown size={16} />
          </button>
        )}
      </div>

      {/* Dropdown suggestions */}
      {showDropdown && !disabled && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
          {/* Category headers */}
          {inputValue === '' ? (
            <div className="p-2">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-2 py-1">
                Popular Tags
              </div>
              {suggestions.map((tag, idx) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                    idx === highlightedIndex ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className={`inline-block px-2 py-0.5 text-xs rounded-full mr-2 ${getTagColor(tag)}`}>
                    {TAG_CATEGORIES.cuisine.includes(tag) ? 'Cuisine' :
                     TAG_CATEGORIES.dietary.includes(tag) ? 'Dietary' :
                     TAG_CATEGORIES.mealType.includes(tag) ? 'Meal' : 'Other'}
                  </span>
                  {tag}
                </button>
              ))}
            </div>
          ) : (
            <div className="p-1">
              {suggestions.map((tag, idx) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => addTag(tag)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                    idx === highlightedIndex ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50'
                  }`}
                >
                  {tag}
                </button>
              ))}
              {/* Option to add custom tag */}
              {!ALL_TAGS.some(t => t.toLowerCase() === inputValue.toLowerCase()) && (
                <button
                  type="button"
                  onClick={() => addTag(inputValue)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                    suggestions.length === highlightedIndex ? 'bg-emerald-50 text-emerald-700' : 'hover:bg-slate-50'
                  }`}
                >
                  <Plus size={14} />
                  Add "{inputValue}"
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Helper text */}
      {!disabled && (
        <div className="mt-1 text-xs text-slate-400">
          {tags.length}/{maxTags} tags • Press Enter to add custom tags
        </div>
      )}
    </div>
  );
};

export default TagEditor;
