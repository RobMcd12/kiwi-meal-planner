import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Mic,
  MicOff,
  Loader2,
  Check,
  AlertCircle,
  Volume2,
  Sparkles
} from 'lucide-react';
import { parseDictationForPantryItems } from '../services/geminiService';
import type { PantryItem, ScannedPantryResult, PantryUploadMode } from '../types';
import PantryUploadModeModal from './PantryUploadModeModal';

interface LiveDictationProps {
  onItemsScanned: (items: PantryItem[], mode: PantryUploadMode) => void;
  onClose: () => void;
  existingItemCount: number;
}

// Type for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

type DictationState = 'idle' | 'listening' | 'processing' | 'results';

const LiveDictation: React.FC<LiveDictationProps> = ({ onItemsScanned, onClose, existingItemCount }) => {
  const [dictationState, setDictationState] = useState<DictationState>('idle');
  const [transcription, setTranscription] = useState('');
  const [interimTranscription, setInterimTranscription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScannedPantryResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showUploadModeModal, setShowUploadModeModal] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check for Web Speech API support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setIsSupported(false);
      setError('Speech recognition is not supported in your browser. Try Chrome or Edge.');
      return;
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setDictationState('listening');
      setError(null);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        setTranscription(prev => prev + final);
      }
      setInterimTranscription(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please enable microphone permissions.');
      } else if (event.error === 'no-speech') {
        // Ignore - just no speech detected
      } else {
        setError(`Speech recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (dictationState === 'listening') {
        // Restart if we were still meant to be listening
        try {
          recognition.start();
        } catch (e) {
          // Recognition already started
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore
        }
      }
    };
  }, []);

  const startListening = () => {
    if (!recognitionRef.current) return;

    setTranscription('');
    setInterimTranscription('');
    setError(null);
    setScanResult(null);
    setSelectedItems(new Set());

    try {
      recognitionRef.current.start();
    } catch (e) {
      setError('Failed to start speech recognition. Please try again.');
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Ignore
      }
    }
    setDictationState('idle');
    setInterimTranscription('');
  };

  const processTranscription = async () => {
    if (!transcription.trim()) {
      setError('No items detected. Please speak the items in your pantry.');
      return;
    }

    stopListening();
    setDictationState('processing');
    setError(null);

    try {
      const result = await parseDictationForPantryItems(transcription);

      if (result && result.items.length > 0) {
        setScanResult(result);
        setSelectedItems(new Set(result.items));
        setDictationState('results');
      } else {
        setError('No items could be identified. Try speaking more clearly or listing items one by one.');
        setDictationState('idle');
      }
    } catch (err) {
      console.error('Error processing transcription:', err);
      setError('Failed to process your items. Please try again.');
      setDictationState('idle');
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
    if (existingItemCount > 0) {
      setShowUploadModeModal(true);
    } else {
      finalizeAddItems('add_new');
    }
  };

  const finalizeAddItems = (mode: PantryUploadMode) => {
    const items: PantryItem[] = Array.from(selectedItems).map(name => ({
      id: `dictation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
    }));
    onItemsScanned(items, mode);
  };

  const handleUploadModeSelect = (mode: PantryUploadMode) => {
    setShowUploadModeModal(false);
    finalizeAddItems(mode);
  };

  const resetDictation = () => {
    setTranscription('');
    setInterimTranscription('');
    setScanResult(null);
    setSelectedItems(new Set());
    setDictationState('idle');
    setError(null);
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
            <div className="bg-purple-100 p-2 rounded-lg">
              <Mic className="text-purple-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Talk to Add Items</h2>
              <p className="text-sm text-slate-500">Speak your pantry items aloud</p>
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
          {/* Not Supported */}
          {!isSupported && (
            <div className="py-16 text-center">
              <MicOff size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Speech Recognition Not Supported
              </h3>
              <p className="text-sm text-slate-500">
                Your browser doesn't support speech recognition. Please try Chrome, Edge, or Safari.
              </p>
            </div>
          )}

          {/* Idle/Listening State */}
          {isSupported && (dictationState === 'idle' || dictationState === 'listening') && (
            <div className="space-y-4">
              {/* Microphone visualization */}
              <div className="text-center py-8">
                <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full transition-all ${
                  dictationState === 'listening'
                    ? 'bg-purple-100 animate-pulse'
                    : 'bg-slate-100'
                }`}>
                  {dictationState === 'listening' ? (
                    <Volume2 size={40} className="text-purple-600" />
                  ) : (
                    <Mic size={40} className="text-slate-400" />
                  )}
                </div>
                <p className="mt-4 text-lg font-medium text-slate-800">
                  {dictationState === 'listening' ? 'Listening...' : 'Ready to listen'}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {dictationState === 'listening'
                    ? 'Speak your pantry items clearly'
                    : 'Click the button below to start speaking'}
                </p>
              </div>

              {/* Transcription display */}
              {(transcription || interimTranscription) && (
                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="text-sm font-medium text-slate-700 mb-2">What we heard:</h4>
                  <p className="text-slate-800">
                    {transcription}
                    <span className="text-slate-400">{interimTranscription}</span>
                  </p>
                </div>
              )}

              {/* Controls */}
              <div className="flex justify-center gap-4">
                {dictationState === 'idle' ? (
                  <button
                    onClick={startListening}
                    className="flex items-center gap-2 px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors"
                  >
                    <Mic size={24} />
                    Start Talking
                  </button>
                ) : (
                  <>
                    <button
                      onClick={stopListening}
                      className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                    >
                      <MicOff size={20} />
                      Stop
                    </button>
                    <button
                      onClick={processTranscription}
                      disabled={!transcription.trim()}
                      className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-semibold transition-colors"
                    >
                      <Sparkles size={20} />
                      Process Items
                    </button>
                  </>
                )}
              </div>

              {/* Tips */}
              <div className="bg-amber-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-amber-800 mb-2">Tips for best results:</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Speak clearly and at a normal pace</li>
                  <li>• List items one by one: "eggs, milk, butter, cheese"</li>
                  <li>• Include quantities: "two bottles of milk, a dozen eggs"</li>
                  <li>• You can speak naturally: "I've got some chicken and rice"</li>
                </ul>
              </div>
            </div>
          )}

          {/* Processing State */}
          {dictationState === 'processing' && (
            <div className="py-16 text-center">
              <Loader2 size={48} className="mx-auto text-emerald-600 animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                Processing your items...
              </h3>
              <p className="text-sm text-slate-500">
                AI is identifying the pantry items you mentioned
              </p>
            </div>
          )}

          {/* Results State */}
          {dictationState === 'results' && scanResult && (
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

              {/* Original transcription */}
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">You said:</p>
                <p className="text-sm text-slate-700 italic">"{transcription.trim()}"</p>
              </div>

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
                          {items.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => toggleItem(item)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                                selectedItems.has(item)
                                  ? 'bg-emerald-500 text-white'
                                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                              }`}
                            >
                              {selectedItems.has(item) && <Check size={14} className="inline mr-1" />}
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {scanResult.items.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleItem(item)}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        selectedItems.has(item)
                          ? 'bg-emerald-500 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {selectedItems.has(item) && <Check size={14} className="inline mr-1" />}
                      {item}
                    </button>
                  ))}
                </div>
              )}

              {/* Try again option */}
              <button
                onClick={resetDictation}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <Mic size={14} />
                Speak again
              </button>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {dictationState === 'results' && (
          <div className="border-t border-slate-200 p-4 bg-slate-50">
            <button
              onClick={handleAddSelected}
              disabled={selectedItems.size === 0}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
            >
              <Check size={20} />
              Add {selectedItems.size} Items to Pantry
            </button>
          </div>
        )}
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

export default LiveDictation;
