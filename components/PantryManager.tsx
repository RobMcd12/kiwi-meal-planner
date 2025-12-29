import React, { useState } from 'react';
import { PantryItem } from '../types';
import { Plus, Trash2, Archive } from 'lucide-react';

interface PantryManagerProps {
  items: PantryItem[];
  setItems: React.Dispatch<React.SetStateAction<PantryItem[]>>;
  onNext?: () => void;
  isSettingsMode?: boolean;
}

const COMMON_PANTRY_ITEMS = [
  "Salt", "Pepper", "Olive Oil", "Rice", "Pasta", "Flour", "Sugar", "Milk", "Butter", "Eggs", "Garlic", "Onions"
];

const PantryManager: React.FC<PantryManagerProps> = ({ items, setItems, onNext, isSettingsMode = false }) => {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    if (newItem.trim()) {
      setItems([...items, { id: Date.now().toString(), name: newItem.trim() }]);
      setNewItem('');
    }
  };

  const addCommonItem = (name: string) => {
    if (!items.find(i => i.name === name)) {
      setItems([...items, { id: Date.now().toString(), name }]);
    }
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addItem();
    }
  };

  return (
    <div className={`max-w-2xl mx-auto p-6 bg-white rounded-xl ${!isSettingsMode ? 'shadow-lg border border-slate-100' : ''}`}>
      {!isSettingsMode && (
        <div className="text-center mb-8">
          <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Archive className="text-emerald-600 w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800">What's in your pantry?</h2>
          <p className="text-slate-500 mt-2">
            We'll exclude these items from your shopping list so you save money and reduce waste.
          </p>
        </div>
      )}

      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Add an item (e.g., Soy Sauce)"
            className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all"
          />
          <button
            onClick={addItem}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={20} />
            Add
          </button>
        </div>
        
        <div className="mt-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quick Add Essentials</p>
          <div className="flex flex-wrap gap-2">
            {COMMON_PANTRY_ITEMS.map(item => (
              <button
                key={item}
                onClick={() => addCommonItem(item)}
                disabled={items.some(i => i.name === item)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                  items.some(i => i.name === item)
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default'
                    : 'bg-white text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-300'
                }`}
              >
                + {item}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto mb-8 border border-slate-200">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Archive size={40} className="mb-2 opacity-20" />
            <p>Your pantry list is empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {items.map(item => (
              <div key={item.id} className="group flex items-center justify-between bg-white px-3 py-2 rounded-md shadow-sm border border-slate-100">
                <span className="text-slate-700 truncate mr-2" title={item.name}>{item.name}</span>
                <button
                  onClick={() => removeItem(item.id)}
                  className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {!isSettingsMode && onNext && (
        <button
          onClick={onNext}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold text-lg transition-transform active:scale-[0.99]"
        >
          Continue to Preferences
        </button>
      )}
    </div>
  );
};

export default PantryManager;
