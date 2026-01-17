import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Check, Plus, Trash2, Image as ImageIcon, Sparkles, AlertCircle, AlertTriangle, Edit3, RefreshCw, Star } from 'lucide-react';
import { scanPantryFromImages } from '../services/geminiService';
import { parseItemQuantity } from '../services/storageService';
import type { PantryItem, ScannedPantryResult, PantryUploadMode } from '../types';

interface PantryScannerProps {
  onItemsScanned: (items: PantryItem[], mode: PantryUploadMode) => void;
  onClose: () => void;
  existingItemCount: number;
  existingItems?: PantryItem[];  // Pass existing items to detect duplicates
}

interface ImagePreview {
  id: string;
  base64: string;
  mimeType: string;
  preview: string;
}

// Track editable items with their names and staple status
interface EditableItem {
  originalName: string;
  editedName: string;
  selected: boolean;
  isStaple: boolean;
}

const PantryScanner: React.FC<PantryScannerProps> = ({ onItemsScanned, onClose, existingItemCount, existingItems = [] }) => {
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScannedPantryResult | null>(null);
  const [editableItems, setEditableItems] = useState<Map<string, EditableItem>>(new Map());
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Helper to check if an item already exists in pantry (case-insensitive, ignoring quantity in parens)
  const getBaseItemName = (itemName: string): string => {
    // Extract just the item name without quantity (e.g., "milk (~500ml)" -> "milk")
    return itemName.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();
  };

  const isDuplicate = (itemName: string): boolean => {
    const baseName = getBaseItemName(itemName);
    return existingItems.some(
      existing => getBaseItemName(existing.name) === baseName
    );
  };

  // Find the existing item that matches
  const findExistingItem = (itemName: string): PantryItem | undefined => {
    const baseName = getBaseItemName(itemName);
    return existingItems.find(
      existing => getBaseItemName(existing.name) === baseName
    );
  };

  // Get selected items from editableItems
  const selectedItems = new Set(
    Array.from(editableItems.values())
      .filter(item => item.selected)
      .map(item => item.editedName)
  );

  // Count duplicates in selected items
  const duplicatesInSelection = Array.from(selectedItems).filter(isDuplicate).length;
  const newItemsInSelection = selectedItems.size - duplicatesInSelection;

  // Count staples in selected items
  const staplesInSelection = Array.from(editableItems.values())
    .filter(item => item.selected && item.isStaple).length;

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newImages: ImagePreview[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const base64 = await fileToBase64(file);
      newImages.push({
        id: `${Date.now()}-${i}`,
        base64: base64.split(',')[1], // Remove data URL prefix
        mimeType: file.type,
        preview: base64,
      });
    }

    setImages(prev => [...prev, ...newImages]);
    setScanResult(null);
    setError(null);

    // Reset input
    e.target.value = '';
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (id: string) => {
    setImages(prev => prev.filter(img => img.id !== id));
    setScanResult(null);
  };

  const handleScan = async () => {
    if (images.length === 0) return;

    setIsScanning(true);
    setError(null);

    try {
      const result = await scanPantryFromImages(
        images.map(img => ({ base64: img.base64, mimeType: img.mimeType }))
      );
      setScanResult(result);
      // Initialize editable items - pre-select all
      const newEditableItems = new Map<string, EditableItem>();
      result.items.forEach((item, index) => {
        const id = `item-${index}`;
        // Check if existing item is a staple
        const existingItem = existingItems.find(
          existing => getBaseItemName(existing.name) === getBaseItemName(item)
        );
        newEditableItems.set(id, {
          originalName: item,
          editedName: item,
          selected: true,
          isStaple: existingItem?.isStaple || false,
        });
      });
      setEditableItems(newEditableItems);
    } catch (err) {
      console.error('Scan error:', err);
      setError('Failed to analyze images. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleItem = (itemId: string) => {
    setEditableItems(prev => {
      const next = new Map(prev);
      const item = next.get(itemId);
      if (item) {
        next.set(itemId, { ...item, selected: !item.selected });
      }
      return next;
    });
  };

  const updateItemName = (itemId: string, newName: string) => {
    setEditableItems(prev => {
      const next = new Map(prev);
      const item = next.get(itemId);
      if (item) {
        next.set(itemId, { ...item, editedName: newName });
      }
      return next;
    });
  };

  const toggleItemStaple = (itemId: string) => {
    setEditableItems(prev => {
      const next = new Map(prev);
      const item = next.get(itemId);
      if (item) {
        next.set(itemId, { ...item, isStaple: !item.isStaple });
      }
      return next;
    });
  };

  const selectAll = () => {
    setEditableItems(prev => {
      const next = new Map(prev);
      next.forEach((item, id) => {
        next.set(id, { ...item, selected: true });
      });
      return next;
    });
  };

  const deselectAll = () => {
    setEditableItems(prev => {
      const next = new Map(prev);
      next.forEach((item, id) => {
        next.set(id, { ...item, selected: false });
      });
      return next;
    });
  };

  // Find item ID by original name
  const findItemIdByName = (name: string): string | undefined => {
    for (const [id, item] of editableItems.entries()) {
      if (item.originalName === name) return id;
    }
    return undefined;
  };

  // Replace all pantry items with scanned items
  const handleReplaceAll = () => {
    const items: PantryItem[] = [];

    // Get all selected items as new items
    editableItems.forEach((item) => {
      if (!item.selected) return;

      // Parse quantity from item name (e.g., "milk (~500ml)" -> name: "milk", quantity: 500, unit: "ml")
      const parsed = parseItemQuantity(item.editedName);

      items.push({
        id: `scanned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: parsed.name,
        quantity: parsed.quantity,
        unit: parsed.unit,
        isStaple: item.isStaple,
      });
    });

    onItemsScanned(items, 'replace');
  };

  // Add new items and update existing items with new quantities
  const handleAddAndUpdate = () => {
    const items: PantryItem[] = [];

    // Get all selected items
    editableItems.forEach((item) => {
      if (!item.selected) return;

      // Parse quantity from item name (e.g., "milk (~500ml)" -> name: "milk", quantity: 500, unit: "ml")
      const parsed = parseItemQuantity(item.editedName);
      const isExisting = isDuplicate(item.editedName);

      if (isExisting) {
        // Update existing item - use the existing item's ID but new parsed name and quantity
        const existingItem = findExistingItem(item.editedName);
        if (existingItem) {
          items.push({
            id: existingItem.id,
            name: parsed.name,
            quantity: parsed.quantity,
            unit: parsed.unit,
            isStaple: item.isStaple,
          });
        }
      } else {
        // New item
        items.push({
          id: `scanned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: parsed.name,
          quantity: parsed.quantity,
          unit: parsed.unit,
          isStaple: item.isStaple,
        });
      }
    });

    // Use 'update_existing' mode when we have duplicates, otherwise 'add_new'
    const mode = duplicatesInSelection > 0 ? 'update_existing' : 'add_new';
    onItemsScanned(items, mode);
  };

  const categoryLabels: Record<string, string> = {
    produce: '🥬 Produce',
    dairy: '🥛 Dairy',
    meat: '🥩 Meat & Seafood',
    pantryStaples: '🫙 Pantry Staples',
    frozen: '🧊 Frozen',
    beverages: '🥤 Beverages',
    condiments: '🧂 Condiments',
    other: '📦 Other',
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-xl animate-fadeIn">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-lg">
              <Camera className="text-emerald-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Scan Your Pantry</h2>
              <p className="text-sm text-slate-500">Upload photos to identify ingredients</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!scanResult ? (
            // Image Upload Section
            <div className="space-y-4">
              {/* Upload Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium transition-colors"
                >
                  <Upload size={20} />
                  Upload Photos
                </button>
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 py-4 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-700 font-medium transition-colors"
                >
                  <Camera size={20} />
                  Take Photo
                </button>
              </div>

              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileSelect}
              />

              {/* Image Previews */}
              {images.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">
                      {images.length} {images.length === 1 ? 'photo' : 'photos'} ready to scan
                    </span>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
                    >
                      <Plus size={16} />
                      Add more
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {images.map(img => (
                      <div key={img.id} className="relative group">
                        <img
                          src={img.preview}
                          alt="Pantry"
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          onClick={() => removeImage(img.id)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {images.length === 0 && (
                <div className="text-center py-8 bg-slate-50 rounded-xl">
                  <ImageIcon size={48} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-slate-500 mb-1">
                    Take photos of your fridge, pantry, or freezer
                  </p>
                  <p className="text-sm text-slate-400">
                    AI will identify all visible ingredients
                  </p>
                </div>
              )}

              {/* Tips */}
              <div className="bg-amber-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-amber-800 mb-2">Tips for best results:</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Good lighting helps identify items accurately</li>
                  <li>• Take multiple photos from different angles</li>
                  <li>• Include close-ups of shelves and drawers</li>
                  <li>• Labels should be visible when possible</li>
                </ul>
              </div>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}
            </div>
          ) : (
            // Scan Results Section
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800">
                    Found {scanResult.items.length} items
                  </h3>
                  <p className="text-sm text-slate-500">
                    Select items to add to your pantry
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Select all
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    onClick={deselectAll}
                    className="text-sm text-slate-500 hover:text-slate-700 font-medium"
                  >
                    Deselect all
                  </button>
                </div>
              </div>

              {/* Color Key / Legend */}
              <div className="bg-slate-100 border border-slate-200 rounded-xl p-3">
                <p className="text-xs font-medium text-slate-600 mb-2">Color Key:</p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-emerald-400 border-2 border-emerald-500"></div>
                    <span className="text-xs text-slate-600">New item (will be added)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-amber-400 border-2 border-amber-500"></div>
                    <span className="text-xs text-slate-600">Existing item (quantity will be updated)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-slate-200 border border-slate-300"></div>
                    <span className="text-xs text-slate-600">Deselected (will be skipped)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star size={16} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-xs text-slate-600">Staple item (will auto-add to shopping list when low)</span>
                  </div>
                </div>
              </div>

              {/* Summary info */}
              {(newItemsInSelection > 0 || duplicatesInSelection > 0 || staplesInSelection > 0) && (
                <div className="flex flex-wrap gap-3 text-sm">
                  {newItemsInSelection > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                      <Plus size={14} />
                      <span>{newItemsInSelection} new</span>
                    </div>
                  )}
                  {duplicatesInSelection > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg">
                      <RefreshCw size={14} />
                      <span>{duplicatesInSelection} to update</span>
                    </div>
                  )}
                  {staplesInSelection > 0 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg">
                      <Star size={14} className="fill-yellow-500" />
                      <span>{staplesInSelection} staple{staplesInSelection !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Editing instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
                <Edit3 size={18} className="text-blue-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-700">
                  Tap the <Edit3 size={12} className="inline" /> icon to edit name or quantity before saving.
                </p>
              </div>

              {/* Items List - now using editableItems */}
              <div className="space-y-2">
                {Array.from(editableItems.entries()).map(([itemId, item]) => {
                  const isExisting = isDuplicate(item.editedName);
                  const isEditing = editingItemId === itemId;

                  return (
                    <div
                      key={itemId}
                      className={`flex items-center gap-2 p-2 rounded-lg transition-colors border-l-4 ${
                        item.selected
                          ? isExisting
                            ? 'bg-amber-50 border-amber-500 border-y border-r border-y-amber-200 border-r-amber-200'
                            : 'bg-emerald-50 border-emerald-500 border-y border-r border-y-emerald-200 border-r-emerald-200'
                          : 'bg-slate-50 border-slate-300 border-y border-r border-y-slate-200 border-r-slate-200'
                      }`}
                    >
                      {/* Checkbox */}
                      <button
                        onClick={() => toggleItem(itemId)}
                        className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-colors ${
                          item.selected
                            ? isExisting
                              ? 'bg-amber-500 text-white'
                              : 'bg-emerald-500 text-white'
                            : 'bg-white border-2 border-slate-300 hover:border-slate-400'
                        }`}
                      >
                        {item.selected && <Check size={14} />}
                      </button>

                      {/* Item name - editable or display */}
                      {isEditing ? (
                        <input
                          type="text"
                          value={item.editedName}
                          onChange={(e) => updateItemName(itemId, e.target.value)}
                          onBlur={() => setEditingItemId(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingItemId(null);
                            if (e.key === 'Escape') {
                              updateItemName(itemId, item.originalName);
                              setEditingItemId(null);
                            }
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1 text-sm bg-white border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          placeholder="Item name with quantity"
                        />
                      ) : (
                        <span
                          className={`flex-1 text-sm ${
                            item.selected ? 'text-slate-800 font-medium' : 'text-slate-500'
                          }`}
                        >
                          {item.editedName}
                          {item.editedName !== item.originalName && (
                            <span className="text-xs text-slate-400 ml-1">(edited)</span>
                          )}
                        </span>
                      )}

                      {/* Edit button */}
                      {!isEditing && (
                        <button
                          onClick={() => setEditingItemId(itemId)}
                          className="flex-shrink-0 p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Edit item name/quantity"
                        >
                          <Edit3 size={14} />
                        </button>
                      )}

                      {/* Staple toggle button */}
                      <button
                        onClick={() => toggleItemStaple(itemId)}
                        className={`flex-shrink-0 p-1.5 rounded-lg transition-colors ${
                          item.isStaple
                            ? 'text-yellow-500 hover:text-yellow-600 bg-yellow-50'
                            : 'text-slate-300 hover:text-yellow-500 hover:bg-yellow-50'
                        }`}
                        title={item.isStaple ? 'Remove staple flag' : 'Mark as staple item'}
                      >
                        <Star size={14} className={item.isStaple ? 'fill-yellow-500' : ''} />
                      </button>

                      {/* Status badge */}
                      {item.selected && (
                        <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                          isExisting
                            ? 'bg-amber-200 text-amber-800'
                            : 'bg-emerald-200 text-emerald-800'
                        }`}>
                          {isExisting ? 'UPDATE' : 'NEW'}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Rescan Option */}
              <button
                onClick={() => {
                  setScanResult(null);
                  setImages([]);
                }}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <Camera size={14} />
                Scan different photos
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50">
          {!scanResult ? (
            <button
              onClick={handleScan}
              disabled={images.length === 0 || isScanning}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              {isScanning ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Analyzing images...
                </>
              ) : (
                <>
                  <Sparkles size={20} />
                  Scan for Ingredients
                </>
              )}
            </button>
          ) : (
            <div className="space-y-3">
              {selectedItems.size === 0 ? (
                <div className="text-center py-3 text-amber-700 bg-amber-50 rounded-xl">
                  <AlertTriangle size={18} className="inline mr-2" />
                  Select items to add to your pantry
                </div>
              ) : (
                <>
                  {/* Primary button - Add New & Update Existing */}
                  <button
                    onClick={handleAddAndUpdate}
                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    <Plus size={20} />
                    {duplicatesInSelection > 0 && newItemsInSelection > 0
                      ? `Add ${newItemsInSelection} New & Update ${duplicatesInSelection} Existing`
                      : duplicatesInSelection > 0
                        ? `Update ${duplicatesInSelection} Existing Item${duplicatesInSelection !== 1 ? 's' : ''}`
                        : `Add ${newItemsInSelection} Item${newItemsInSelection !== 1 ? 's' : ''} to Pantry`
                    }
                  </button>

                  {/* Secondary button - Replace All (only show if there are existing items) */}
                  {existingItemCount > 0 && (
                    <button
                      onClick={handleReplaceAll}
                      className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors border border-slate-300"
                    >
                      <Trash2 size={18} />
                      Replace All Pantry Items ({existingItemCount}) with Scanned Items
                    </button>
                  )}

                  {/* Info text */}
                  {duplicatesInSelection > 0 && newItemsInSelection > 0 && (
                    <p className="text-xs text-center text-slate-500">
                      {duplicatesInSelection} existing item{duplicatesInSelection !== 1 ? 's' : ''} will have quantities updated
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PantryScanner;
