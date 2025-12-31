import React, { useState } from 'react';
import { PantryItem, PantryUploadMode } from '../types';
import { Plus, Trash2, Archive, Camera, Sparkles, Star, ShoppingCart, Check, Video, Mic, Upload, Lock, Crown } from 'lucide-react';
import PantryScanner from './PantryScanner';
import VideoRecorder from './VideoRecorder';
import LiveDictation from './LiveDictation';
import AudioRecorder from './AudioRecorder';
import { updatePantryItemStaple, togglePantryItemRestock, clearStaplesRestock } from '../services/storageService';

interface PantryManagerProps {
  items: PantryItem[];
  setItems: React.Dispatch<React.SetStateAction<PantryItem[]>>;
  onNext?: () => void;
  isSettingsMode?: boolean;
  hasPro?: boolean;
  onUpgradeClick?: () => void;
}

const COMMON_PANTRY_ITEMS = [
  "Salt", "Pepper", "Olive Oil", "Rice", "Pasta", "Flour", "Sugar", "Milk", "Butter", "Eggs", "Garlic", "Onions"
];

const COMMON_STAPLE_ITEMS = [
  "Salt", "Pepper", "Olive Oil", "Flour", "Sugar", "Rice", "Pasta", "Butter", "Soy Sauce", "Vinegar"
];

const PantryManager: React.FC<PantryManagerProps> = ({ items, setItems, onNext, isSettingsMode = false, hasPro = false, onUpgradeClick }) => {
  const [newItem, setNewItem] = useState('');
  const [newStapleItem, setNewStapleItem] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showLiveDictation, setShowLiveDictation] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [activeTab, setActiveTab] = useState<'pantry' | 'staples'>('pantry');

  // Separate items into regular pantry and staples
  const regularItems = items.filter(item => !item.isStaple);
  const stapleItems = items.filter(item => item.isStaple);
  const staplesNeedingRestock = stapleItems.filter(item => item.needsRestock);

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

  const addStapleItem = () => {
    if (newStapleItem.trim()) {
      setItems([...items, { id: Date.now().toString(), name: newStapleItem.trim(), isStaple: true }]);
      setNewStapleItem('');
    }
  };

  const addCommonStaple = (name: string) => {
    if (!items.find(i => i.name === name)) {
      setItems([...items, { id: Date.now().toString(), name, isStaple: true }]);
    }
  };

  const handleStapleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addStapleItem();
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

  const handleScannedItems = (scannedItems: PantryItem[], mode: PantryUploadMode) => {
    if (mode === 'replace') {
      // Replace all existing items with new scanned items
      setItems(scannedItems);
    } else {
      // Add only new items that don't exist yet (add_new mode)
      const newItems = scannedItems.filter(
        scanned => !items.some(existing =>
          existing.name.toLowerCase() === scanned.name.toLowerCase()
        )
      );
      setItems([...items, ...newItems]);
    }
    setShowScanner(false);
  };

  const toggleStaple = async (id: string, currentStaple: boolean) => {
    const newIsStaple = !currentStaple;
    const success = await updatePantryItemStaple(id, newIsStaple);
    if (success) {
      setItems(items.map(item =>
        item.id === id
          ? { ...item, isStaple: newIsStaple, needsRestock: newIsStaple ? item.needsRestock : false }
          : item
      ));
    }
  };

  const toggleRestock = async (id: string, currentRestock: boolean) => {
    const newNeedsRestock = !currentRestock;
    const success = await togglePantryItemRestock(id, newNeedsRestock);
    if (success) {
      setItems(items.map(item =>
        item.id === id ? { ...item, needsRestock: newNeedsRestock } : item
      ));
    }
  };

  const handleShoppingCompleted = async () => {
    const success = await clearStaplesRestock();
    if (success) {
      setItems(items.map(item => ({ ...item, needsRestock: false })));
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

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('pantry')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'pantry'
              ? 'text-emerald-600 border-b-2 border-emerald-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Archive size={18} />
          Pantry Items
        </button>
        <button
          onClick={() => setActiveTab('staples')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            activeTab === 'staples'
              ? 'text-amber-600 border-b-2 border-amber-600'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <Star size={18} />
          Staples
          {staplesNeedingRestock.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
              {staplesNeedingRestock.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'pantry' && (
        <>
          <div className="mb-6">
            {/* Scan Pantry Button */}
            {/* Main scan button */}
            <button
              onClick={() => setShowScanner(true)}
              className="w-full mb-3 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all shadow-md hover:shadow-lg"
            >
              <Camera size={20} />
              <span>Scan with Photos</span>
              <Sparkles size={16} />
            </button>

            {/* Additional input methods - Pro features */}
            {!hasPro && (
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-3 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Crown size={16} className="text-amber-600" />
                  <span className="text-sm font-semibold text-amber-800">Pro Features</span>
                </div>
                <p className="text-xs text-amber-700 mb-3">
                  Upgrade to Pro to unlock video scanning, voice dictation, and audio upload for faster pantry management.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => onUpgradeClick?.()}
                    className="py-2 px-2 rounded-lg bg-white/60 border border-amber-200 text-amber-700 text-xs font-medium flex flex-col items-center gap-1 hover:bg-white transition-colors"
                  >
                    <Video size={16} />
                    <span>Video</span>
                  </button>
                  <button
                    onClick={() => onUpgradeClick?.()}
                    className="py-2 px-2 rounded-lg bg-white/60 border border-amber-200 text-amber-700 text-xs font-medium flex flex-col items-center gap-1 hover:bg-white transition-colors"
                  >
                    <Mic size={16} />
                    <span>Voice</span>
                  </button>
                  <button
                    onClick={() => onUpgradeClick?.()}
                    className="py-2 px-2 rounded-lg bg-white/60 border border-amber-200 text-amber-700 text-xs font-medium flex flex-col items-center gap-1 hover:bg-white transition-colors"
                  >
                    <Upload size={16} />
                    <span>Audio</span>
                  </button>
                </div>
                <button
                  onClick={() => onUpgradeClick?.()}
                  className="w-full mt-3 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Lock size={14} />
                  Upgrade to Pro
                </button>
              </div>
            )}

            {hasPro && (
              <div className="grid grid-cols-2 gap-2 mb-4">
                {/* Video Scan - Pro */}
                <button
                  onClick={() => setShowVideoRecorder(true)}
                  className="py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors border relative bg-red-50 hover:bg-red-100 text-red-700 border-red-200"
                >
                  <Video size={18} />
                  <span className="text-sm">Video Scan</span>
                  <span className="absolute -top-1.5 -right-1.5 px-1 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-bold rounded-full flex items-center gap-0.5">
                    <Crown size={8} />
                    PRO
                  </span>
                </button>

                {/* Talk to Add - Pro */}
                <button
                  onClick={() => setShowLiveDictation(true)}
                  className="py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors border relative bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                >
                  <Mic size={18} />
                  <span className="text-sm">Talk to Add</span>
                  <span className="absolute -top-1.5 -right-1.5 px-1 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-bold rounded-full flex items-center gap-0.5">
                    <Crown size={8} />
                    PRO
                  </span>
                </button>

                {/* Upload Audio - Pro */}
                <button
                  onClick={() => setShowAudioRecorder(true)}
                  className="col-span-2 py-2.5 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors border relative bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200"
                >
                  <Upload size={18} />
                  <span className="text-sm">Upload Audio</span>
                  <span className="absolute -top-1.5 -right-1.5 px-1 py-0.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[8px] font-bold rounded-full flex items-center gap-0.5">
                    <Crown size={8} />
                    PRO
                  </span>
                </button>
              </div>
            )}

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
            {regularItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                <Archive size={40} className="mb-2 opacity-20" />
                <p>Your pantry list is empty.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {regularItems.map(item => (
                  <div key={item.id} className="group flex items-center justify-between bg-white px-3 py-2 rounded-md shadow-sm border border-slate-100">
                    <span className="text-slate-700 truncate mr-2" title={item.name}>{item.name}</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleStaple(item.id, item.isStaple || false)}
                        className="text-slate-400 hover:text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Mark as staple"
                      >
                        <Star size={16} />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {activeTab === 'staples' && (
        <div className="mb-8">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="text-amber-800 text-sm">
              <Star size={16} className="inline mr-1" />
              Staples are items you always keep in stock. Check the box when you need to restock them.
            </p>
          </div>

          {/* Add Staple Item */}
          <div className="mb-4">
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newStapleItem}
                onChange={(e) => setNewStapleItem(e.target.value)}
                onKeyDown={handleStapleKeyDown}
                placeholder="Add a staple item (e.g., Soy Sauce)"
                className="flex-1 px-4 py-3 rounded-lg border border-slate-300 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
              />
              <button
                onClick={addStapleItem}
                className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <Plus size={20} />
                Add
              </button>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Quick Add Staples</p>
              <div className="flex flex-wrap gap-2">
                {COMMON_STAPLE_ITEMS.map(item => (
                  <button
                    key={item}
                    onClick={() => addCommonStaple(item)}
                    disabled={items.some(i => i.name === item)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors border ${
                      items.some(i => i.name === item)
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-default'
                        : 'bg-white text-amber-600 border-amber-200 hover:bg-amber-50 hover:border-amber-300'
                    }`}
                  >
                    + {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Shopping List Summary */}
          {staplesNeedingRestock.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h4 className="font-medium text-red-800 flex items-center gap-2">
                    <ShoppingCart size={18} />
                    Shopping List ({staplesNeedingRestock.length} items)
                  </h4>
                  <p className="text-red-600 text-sm mt-1">
                    {staplesNeedingRestock.map(i => i.name).join(', ')}
                  </p>
                </div>
                <button
                  onClick={handleShoppingCompleted}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Check size={18} />
                  Shopping Completed
                </button>
              </div>
            </div>
          )}

          <div className="bg-slate-50 rounded-lg p-4 min-h-[200px] max-h-[400px] overflow-y-auto border border-slate-200">
            {stapleItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 py-8">
                <Star size={40} className="mb-2 opacity-20" />
                <p>No staples yet.</p>
                <p className="text-sm mt-1">Add items above or click the star on pantry items.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {stapleItems.map(item => (
                  <div key={item.id} className="group flex items-center justify-between bg-white px-4 py-3 rounded-md shadow-sm border border-slate-100">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={item.needsRestock || false}
                        onChange={() => toggleRestock(item.id, item.needsRestock || false)}
                        className="w-5 h-5 rounded border-slate-300 text-red-600 focus:ring-red-500"
                        title="Check when you need to restock"
                      />
                      <span className={`text-slate-700 ${item.needsRestock ? 'line-through text-slate-400' : ''}`}>
                        {item.name}
                      </span>
                      {item.needsRestock && (
                        <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                          Need to buy
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleStaple(item.id, item.isStaple || false)}
                        className="text-amber-500 hover:text-slate-400"
                        title="Move to pantry"
                      >
                        <Star size={16} fill="currentColor" />
                      </button>
                      <button
                        onClick={() => removeItem(item.id)}
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Remove item"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!isSettingsMode && onNext && (
        <button
          onClick={onNext}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white py-4 rounded-xl font-bold text-lg transition-transform active:scale-[0.99]"
        >
          Continue to Preferences
        </button>
      )}

      {/* Pantry Scanner Modal */}
      {showScanner && (
        <PantryScanner
          onItemsScanned={handleScannedItems}
          onClose={() => setShowScanner(false)}
          existingItemCount={items.length}
        />
      )}

      {/* Video Recorder Modal */}
      {showVideoRecorder && (
        <VideoRecorder
          onItemsScanned={handleScannedItems}
          onClose={() => setShowVideoRecorder(false)}
          existingItemCount={items.length}
        />
      )}

      {/* Live Dictation Modal */}
      {showLiveDictation && (
        <LiveDictation
          onItemsScanned={handleScannedItems}
          onClose={() => setShowLiveDictation(false)}
          existingItemCount={items.length}
        />
      )}

      {/* Audio Recorder Modal */}
      {showAudioRecorder && (
        <AudioRecorder
          onItemsScanned={handleScannedItems}
          onClose={() => setShowAudioRecorder(false)}
          existingItemCount={items.length}
        />
      )}
    </div>
  );
};

export default PantryManager;
