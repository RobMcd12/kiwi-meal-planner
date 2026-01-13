import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Loader2, Check, Plus, Trash2, Image as ImageIcon, Sparkles, AlertCircle, AlertTriangle } from 'lucide-react';
import { scanPantryFromImages } from '../services/geminiService';
import type { PantryItem, ScannedPantryResult, PantryUploadMode } from '../types';
import PantryUploadModeModal from './PantryUploadModeModal';

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

const PantryScanner: React.FC<PantryScannerProps> = ({ onItemsScanned, onClose, existingItemCount, existingItems = [] }) => {
  const [images, setImages] = useState<ImagePreview[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScannedPantryResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [showUploadModeModal, setShowUploadModeModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Helper to check if an item already exists in pantry (case-insensitive)
  const isDuplicate = (itemName: string): boolean => {
    return existingItems.some(
      existing => existing.name.toLowerCase() === itemName.toLowerCase()
    );
  };

  // Count duplicates in selected items
  const duplicatesInSelection = Array.from(selectedItems).filter(isDuplicate).length;
  const newItemsInSelection = selectedItems.size - duplicatesInSelection;

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
      // Pre-select all items
      setSelectedItems(new Set(result.items));
    } catch (err) {
      console.error('Scan error:', err);
      setError('Failed to analyze images. Please try again.');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleItem = (item: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(item)) {
        next.delete(item);
      } else {
        next.add(item);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (scanResult) {
      setSelectedItems(new Set(scanResult.items));
    }
  };

  const deselectAll = () => {
    setSelectedItems(new Set());
  };

  const handleAddSelected = () => {
    // If there are existing items, show the upload mode modal
    if (existingItemCount > 0) {
      setShowUploadModeModal(true);
    } else {
      // No existing items, just add the new ones
      finalizeAddItems('add_new');
    }
  };

  const finalizeAddItems = (mode: PantryUploadMode) => {
    // Filter out duplicates - only add new items
    const newItemNames = Array.from(selectedItems).filter(name => !isDuplicate(name));
    const items: PantryItem[] = newItemNames.map(name => ({
      id: `scanned-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
    }));
    onItemsScanned(items, mode);
  };

  const handleUploadModeSelect = (mode: PantryUploadMode) => {
    setShowUploadModeModal(false);
    finalizeAddItems(mode);
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

              {/* Duplicate warning */}
              {duplicatesInSelection > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                  <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      {duplicatesInSelection} item{duplicatesInSelection !== 1 ? 's' : ''} already in your pantry
                    </p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      Items marked with a yellow border are already in your pantry. Selecting them will not add duplicates.
                    </p>
                  </div>
                </div>
              )}

              {/* Categorized Items */}
              {scanResult.categories ? (
                <div className="space-y-4">
                  {Object.entries(scanResult.categories).map(([category, items]) => {
                    if (!items || items.length === 0) return null;
                    return (
                      <div key={category} className="bg-slate-50 rounded-xl p-3">
                        <h4 className="font-medium text-slate-700 mb-2">
                          {categoryLabels[category] || category}
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {items.map((item, idx) => {
                            const isExisting = isDuplicate(item);
                            const isSelected = selectedItems.has(item);
                            return (
                              <button
                                key={idx}
                                onClick={() => toggleItem(item)}
                                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                  isSelected
                                    ? isExisting
                                      ? 'bg-amber-400 text-white border-2 border-amber-500'
                                      : 'bg-emerald-500 text-white'
                                    : isExisting
                                      ? 'bg-amber-50 text-amber-700 border-2 border-amber-300'
                                      : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                                }`}
                                title={isExisting ? 'Already in pantry' : 'New item'}
                              >
                                {isSelected && <Check size={14} className="inline mr-1" />}
                                {isExisting && !isSelected && <AlertTriangle size={12} className="inline mr-1" />}
                                {item}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                // Flat list if no categories
                <div className="flex flex-wrap gap-2">
                  {scanResult.items.map((item, idx) => {
                    const isExisting = isDuplicate(item);
                    const isSelected = selectedItems.has(item);
                    return (
                      <button
                        key={idx}
                        onClick={() => toggleItem(item)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                          isSelected
                            ? isExisting
                              ? 'bg-amber-400 text-white border-2 border-amber-500'
                              : 'bg-emerald-500 text-white'
                            : isExisting
                              ? 'bg-amber-50 text-amber-700 border-2 border-amber-300'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                        title={isExisting ? 'Already in pantry' : 'New item'}
                      >
                        {isSelected && <Check size={14} className="inline mr-1" />}
                        {isExisting && !isSelected && <AlertTriangle size={12} className="inline mr-1" />}
                        {item}
                      </button>
                    );
                  })}
                </div>
              )}

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
            <div className="space-y-2">
              {newItemsInSelection > 0 || duplicatesInSelection === 0 ? (
                <button
                  onClick={handleAddSelected}
                  disabled={newItemsInSelection === 0}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                >
                  <Plus size={20} />
                  Add {newItemsInSelection} New Item{newItemsInSelection !== 1 ? 's' : ''} to Pantry
                </button>
              ) : (
                <div className="text-center py-3 text-amber-700 bg-amber-50 rounded-xl">
                  <AlertTriangle size={18} className="inline mr-2" />
                  All selected items are already in your pantry
                </div>
              )}
              {duplicatesInSelection > 0 && newItemsInSelection > 0 && (
                <p className="text-xs text-center text-slate-500">
                  {duplicatesInSelection} duplicate{duplicatesInSelection !== 1 ? 's' : ''} will be skipped
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload Mode Modal */}
      {showUploadModeModal && (
        <PantryUploadModeModal
          onSelect={handleUploadModeSelect}
          onClose={() => setShowUploadModeModal(false)}
          existingItemCount={existingItemCount}
          newItemCount={selectedItems.size}
        />
      )}
    </div>
  );
};

export default PantryScanner;
