import React, { useState, useRef } from 'react';
import {
  X,
  Mic,
  StopCircle,
  Upload,
  Loader2,
  Check,
  AlertCircle,
  Play,
  Trash2,
  Sparkles
} from 'lucide-react';
import { uploadMediaFile, updateMediaProcessingStatus } from '../services/mediaUploadService';
import { scanPantryFromAudio } from '../services/geminiService';
import type { PantryItem, ScannedPantryResult, PantryUploadMode } from '../types';
import PantryUploadModeModal from './PantryUploadModeModal';

interface AudioRecorderProps {
  onItemsScanned: (items: PantryItem[], mode: PantryUploadMode) => void;
  onClose: () => void;
  existingItemCount: number;
  existingItems?: PantryItem[];
}

type RecordingState = 'idle' | 'recording' | 'preview' | 'uploading' | 'processing' | 'results';

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onItemsScanned, onClose, existingItemCount, existingItems = [] }) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScannedPantryResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showUploadModeModal, setShowUploadModeModal] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      streamRef.current = stream;

      chunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setRecordingState('preview');

        // Stop the microphone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
        }

        // Stop the timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setRecordingState('recording');
      setRecordingTime(0);

      // Start timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Could not access microphone. Please ensure microphone permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('audio/')) {
      setError('Please select an audio file.');
      return;
    }

    // Max 25MB for audio
    if (file.size > 25 * 1024 * 1024) {
      setError('Audio file must be less than 25MB.');
      return;
    }

    setError(null);
    setRecordedBlob(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setRecordingState('preview');

    e.target.value = '';
  };

  const discardRecording = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setRecordedBlob(null);
    setPreviewUrl(null);
    setScanResult(null);
    setSelectedItems(new Set());
    setRecordingState('idle');
    setRecordingTime(0);
  };

  const processAudio = async () => {
    if (!recordedBlob) return;

    setRecordingState('uploading');
    setError(null);

    try {
      // Upload to Supabase Storage
      const file = new File([recordedBlob], `pantry_audio_${Date.now()}.webm`, {
        type: recordedBlob.type || 'audio/webm',
      });

      const mediaUpload = await uploadMediaFile(file, 'audio');

      if (!mediaUpload) {
        setError('Failed to upload audio. Please try again.');
        setRecordingState('preview');
        return;
      }

      setRecordingState('processing');

      // Update status to processing
      await updateMediaProcessingStatus(mediaUpload.id, 'processing');

      // Process with AI
      const result = await scanPantryFromAudio(recordedBlob);

      if (result && result.items.length > 0) {
        // Update with results
        await updateMediaProcessingStatus(mediaUpload.id, 'complete', result);
        setScanResult(result);
        setSelectedItems(new Set(result.items));
        setRecordingState('results');
      } else {
        await updateMediaProcessingStatus(mediaUpload.id, 'complete', { items: [] });
        setError('No items could be identified in the audio. Try speaking more clearly or recording again.');
        setRecordingState('preview');
      }
    } catch (err) {
      console.error('Error processing audio:', err);
      setError('Failed to process audio. Please try again.');
      setRecordingState('preview');
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
      id: `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
            <div className="bg-orange-100 p-2 rounded-lg">
              <Mic className="text-orange-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Audio Pantry Scan</h2>
              <p className="text-sm text-slate-500">Record or upload audio of your pantry items</p>
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
          {/* Idle/Recording State */}
          {(recordingState === 'idle' || recordingState === 'recording') && (
            <div className="space-y-4">
              {/* Recording visualization */}
              <div className="text-center py-8">
                <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full transition-all ${
                  recordingState === 'recording'
                    ? 'bg-red-100'
                    : 'bg-slate-100'
                }`}>
                  {recordingState === 'recording' ? (
                    <div className="relative">
                      <Mic size={40} className="text-red-600" />
                      <div className="absolute -inset-2 border-2 border-red-400 rounded-full animate-ping" />
                    </div>
                  ) : (
                    <Mic size={40} className="text-slate-400" />
                  )}
                </div>

                {recordingState === 'recording' && (
                  <div className="mt-4">
                    <span className="text-2xl font-mono font-bold text-red-600">
                      {formatTime(recordingTime)}
                    </span>
                  </div>
                )}

                <p className="mt-4 text-lg font-medium text-slate-800">
                  {recordingState === 'recording' ? 'Recording...' : 'Ready to record'}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {recordingState === 'recording'
                    ? 'List your pantry items clearly'
                    : 'Record or upload an audio file'}
                </p>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-4">
                {recordingState === 'idle' ? (
                  <>
                    <button
                      onClick={startRecording}
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
                    >
                      <Mic size={20} />
                      Start Recording
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                    >
                      <Upload size={20} />
                      Upload Audio
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </>
                ) : (
                  <button
                    onClick={stopRecording}
                    className="flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
                  >
                    <StopCircle size={20} />
                    Stop Recording
                  </button>
                )}
              </div>

              {/* Tips */}
              <div className="bg-amber-50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-amber-800 mb-2">Tips for best results:</h4>
                <ul className="text-sm text-amber-700 space-y-1">
                  <li>• Speak clearly and at a normal pace</li>
                  <li>• List items one by one</li>
                  <li>• Include quantities when possible</li>
                  <li>• 10-60 seconds of audio works best</li>
                </ul>
              </div>
            </div>
          )}

          {/* Preview State */}
          {recordingState === 'preview' && previewUrl && (
            <div className="space-y-4">
              {/* Audio player */}
              <div className="bg-slate-50 rounded-xl p-4">
                <audio
                  src={previewUrl}
                  controls
                  className="w-full"
                />
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-4">
                <button
                  onClick={discardRecording}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  <Trash2 size={20} />
                  Discard
                </button>
                <button
                  onClick={processAudio}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
                >
                  <Sparkles size={20} />
                  Analyze Audio
                </button>
              </div>
            </div>
          )}

          {/* Uploading/Processing State */}
          {(recordingState === 'uploading' || recordingState === 'processing') && (
            <div className="py-16 text-center">
              <Loader2 size={48} className="mx-auto text-emerald-600 animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {recordingState === 'uploading' ? 'Uploading audio...' : 'Analyzing audio...'}
              </h3>
              <p className="text-sm text-slate-500">
                {recordingState === 'uploading'
                  ? 'Please wait while we upload your recording'
                  : 'AI is identifying items from your audio'}
              </p>
            </div>
          )}

          {/* Results State */}
          {recordingState === 'results' && scanResult && (
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

              {/* Record again option */}
              <button
                onClick={discardRecording}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <Mic size={14} />
                Record another audio
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
        {recordingState === 'results' && (
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

export default AudioRecorder;
