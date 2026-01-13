import React, { useState } from 'react';
import { PantryItem, PantryUploadMode } from '../types';
import { Plus, Trash2, Archive, Camera, Sparkles, Star, ShoppingCart, Check, Video, Mic, Upload, Lock, Crown } from 'lucide-react';
import PantryScanner from './PantryScanner';
import ResponsiveTabs from './ResponsiveTabs';
import VideoRecorder from './VideoRecorder';
import LiveDictation from './LiveDictation';
import AudioRecorder from './AudioRecorder';
import PantryItemEditModal from './PantryItemEditModal';
import PantryCategorizedList from './PantryCategorizedList';
import { savePantryItem, savePantryItems, updatePantryItemStaple, togglePantryItemRestock, clearStaplesRestock, updatePantryItemQuantity, removePantryItem, clearPantryItems, loadPantry } from '../services/storageService';

interface PantryManagerProps {
  items: PantryItem[];
  setItems: React.Dispatch<React.SetStateAction<PantryItem[]>>;
  onNext?: () => void;
  isSettingsMode?: boolean;
  hasPro?: boolean;
  onUpgradeClick?: () => void;
  unitSystem?: 'metric' | 'imperial';
}

const COMMON_PANTRY_ITEMS = [
  "Salt", "Pepper", "Olive Oil", "Rice", "Pasta", "Flour", "Sugar", "Milk", "Butter", "Eggs", "Garlic", "Onions"
];

const COMMON_STAPLE_ITEMS = [
  "Salt", "Pepper", "Olive Oil", "Flour", "Sugar", "Rice", "Pasta", "Butter", "Soy Sauce", "Vinegar"
];

const PantryManager: React.FC<PantryManagerProps> = ({ items, setItems, onNext, isSettingsMode = false, hasPro = false, onUpgradeClick, unitSystem = 'metric' }) => {
  const [newItem, setNewItem] = useState('');
  const [newStapleItem, setNewStapleItem] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [showLiveDictation, setShowLiveDictation] = useState(false);
  const [showAudioRecorder, setShowAudioRecorder] = useState(false);
  const [activeTab, setActiveTab] = useState<'pantry' | 'staples'>('pantry');
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);

  // Separate items into regular pantry and staples
  const regularItems = items.filter(item => !item.isStaple);
  const stapleItems = items.filter(item => item.isStaple);
  const staplesNeedingRestock = stapleItems.filter(item => item.needsRestock);

  const addItem = async () => {
    if (newItem.trim()) {
      const savedItem = await savePantryItem(newItem.trim(), false);
      if (savedItem) {
        setItems([...items, savedItem]);
      }
      setNewItem('');
    }
  };

  const addCommonItem = async (name: string) => {
    if (!items.find(i => i.name.toLowerCase() === name.toLowerCase())) {
      const savedItem = await savePantryItem(name, false);
      if (savedItem) {
        setItems([...items, savedItem]);
      }
    }
  };

  const addStapleItem = async () => {
    if (newStapleItem.trim()) {
      const savedItem = await savePantryItem(newStapleItem.trim(), true);
      if (savedItem) {
        setItems([...items, savedItem]);
      }
      setNewStapleItem('');
    }
  };

  const addCommonStaple = async (name: string) => {
    if (!items.find(i => i.name.toLowerCase() === name.toLowerCase())) {
      const savedItem = await savePantryItem(name, true);
      if (savedItem) {
        setItems([...items, savedItem]);
      }
    }
  };

  const handleStapleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addStapleItem();
    }
  };

  const removeItem = async (id: string) => {
    await removePantryItem(id);
    setItems(items.filter(item => item.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addItem();
    }
  };

  const handleScannedItems = async (scannedItems: PantryItem[], mode: PantryUploadMode) => {
    console.log('handleScannedItems called with mode:', mode);
    console.log('Scanned items:', scannedItems.map(i => ({ id: i.id, name: i.name })));

    // Save items to Supabase/localStorage and get back items with real IDs
    const savedItems = await savePantryItems(scannedItems, mode);
    console.log('Saved items from Supabase:', savedItems.map(i => ({ id: i.id, name: i.name })));

    // Reload the full pantry to get consistent state
    const refreshedPantry = await loadPantry();
    setItems(refreshedPantry);

    setShowScanner(false);
  };

  const toggleStaple = async (id: string, currentStaple: boolean, categoryName?: string) => {
    const newIsStaple = !currentStaple;
    const result = await updatePantryItemStaple(id, newIsStaple, categoryName);
    if (result.success) {
      setItems(items.map(item =>
        item.id === id
          ? { ...item, isStaple: newIsStaple, needsRestock: newIsStaple ? item.needsRestock : false, categoryId: result.newCategoryId }
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

  const handleEmptyPantry = async () => {
    if (!window.confirm('Are you sure you want to remove all items from your pantry? This cannot be undone.')) {
      return;
    }
    await clearPantryItems(false);
    setItems(items.filter(item => item.isStaple));
  };

  const handleEmptyStaples = async () => {
    if (!window.confirm('Are you sure you want to remove all staple items? This cannot be undone.')) {
      return;
    }
    await clearPantryItems(true);
    setItems(items.filter(item => !item.isStaple));
  };

  const handleQuantitySave = async (quantity: number | null, unit: string | null) => {
    if (!editingItem) return;

    const success = await updatePantryItemQuantity(editingItem.id, quantity, unit);
    if (success) {
      setItems(items.map(item =>
        item.id === editingItem.id
          ? { ...item, quantity: quantity || undefined, unit: unit || undefined }
          : item
      ));
    }
    setEditingItem(null);
  };

  // Format quantity display
  const formatQuantity = (item: PantryItem): string | null => {
    if (!item.quantity && !item.unit) return null;
    if (item.quantity && item.unit) return `${item.quantity} ${item.unit}`;
    if (item.quantity) return `${item.quantity}`;
    if (item.unit) return item.unit;
    return null;
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
      <ResponsiveTabs
        tabs={[
          { id: 'pantry', label: 'Pantry Items', icon: <Archive size={18} />, color: 'emerald' },
          { id: 'staples', label: 'Staples', icon: <Star size={18} />, color: 'amber', badge: staplesNeedingRestock.length > 0 ? staplesNeedingRestock.length : undefined },
        ]}
        activeTab={activeTab}
        onTabChange={(tabId) => setActiveTab(tabId as 'pantry' | 'staples')}
        variant="underline"
        visibleCount={2}
        className="mb-6"
      />

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

          <div className="bg-slate-50 rounded-lg p-4 min-h-[200px] max-h-[500px] overflow-y-auto border border-slate-200">
            <PantryCategorizedList
              items={items}
              setItems={setItems}
              isStaple={false}
              onItemClick={(item) => setEditingItem(item)}
              onToggleStaple={(id, isStaple, categoryName) => toggleStaple(id, isStaple, categoryName)}
              onToggleRestock={(id, needsRestock) => toggleRestock(id, needsRestock)}
              onRemoveItem={removeItem}
              formatQuantity={formatQuantity}
            />
          </div>

          {/* Empty Pantry Button */}
          {regularItems.length > 0 && (
            <button
              onClick={handleEmptyPantry}
              className="w-full mt-4 mb-8 py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-red-200"
            >
              <Trash2 size={16} />
              Empty My Pantry ({regularItems.length} items)
            </button>
          )}
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

          <div className="bg-slate-50 rounded-lg p-4 min-h-[200px] max-h-[500px] overflow-y-auto border border-slate-200">
            <PantryCategorizedList
              items={items}
              setItems={setItems}
              isStaple={true}
              onItemClick={(item) => setEditingItem(item)}
              onToggleStaple={(id, isStaple, categoryName) => toggleStaple(id, isStaple, categoryName)}
              onToggleRestock={(id, needsRestock) => toggleRestock(id, needsRestock)}
              onRemoveItem={removeItem}
              formatQuantity={formatQuantity}
            />
          </div>

          {/* Empty Staples Button */}
          {stapleItems.length > 0 && (
            <button
              onClick={handleEmptyStaples}
              className="w-full mt-4 py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 border border-red-200"
            >
              <Trash2 size={16} />
              Empty My Staples ({stapleItems.length} items)
            </button>
          )}
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
          existingItems={items}
        />
      )}

      {/* Video Recorder Modal */}
      {showVideoRecorder && (
        <VideoRecorder
          onItemsScanned={handleScannedItems}
          onClose={() => setShowVideoRecorder(false)}
          existingItemCount={items.length}
          existingItems={items}
        />
      )}

      {/* Live Dictation Modal */}
      {showLiveDictation && (
        <LiveDictation
          onItemsScanned={handleScannedItems}
          onClose={() => setShowLiveDictation(false)}
          existingItemCount={items.length}
          existingItems={items}
        />
      )}

      {/* Audio Recorder Modal */}
      {showAudioRecorder && (
        <AudioRecorder
          onItemsScanned={handleScannedItems}
          onClose={() => setShowAudioRecorder(false)}
          existingItemCount={items.length}
          existingItems={items}
        />
      )}

      {/* Quantity Edit Modal */}
      {editingItem && (
        <PantryItemEditModal
          item={editingItem}
          unitSystem={unitSystem}
          onSave={handleQuantitySave}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  );
};

export default PantryManager;
