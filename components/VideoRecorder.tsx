import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Video,
  StopCircle,
  Upload,
  Loader2,
  Check,
  AlertCircle,
  Play,
  Trash2,
  Camera,
  RefreshCw
} from 'lucide-react';
import { uploadMediaFile, updateMediaProcessingStatus } from '../services/mediaUploadService';
import { scanPantryFromVideo } from '../services/geminiService';
import type { PantryItem, ScannedPantryResult, PantryUploadMode } from '../types';
import PantryUploadModeModal from './PantryUploadModeModal';

interface VideoRecorderProps {
  onItemsScanned: (items: PantryItem[], mode: PantryUploadMode) => void;
  onClose: () => void;
  existingItemCount: number;
  existingItems?: PantryItem[];
}

type RecordingState = 'idle' | 'recording' | 'preview' | 'uploading' | 'processing' | 'results';

const VideoRecorder: React.FC<VideoRecorderProps> = ({ onItemsScanned, onClose, existingItemCount, existingItems = [] }) => {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScannedPantryResult | null>(null);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [showUploadModeModal, setShowUploadModeModal] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');

  const videoRef = useRef<HTMLVideoElement>(null);
  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      stopCamera();
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Error accessing camera:', err);
      setError('Could not access camera. Please ensure camera permissions are granted.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const switchCamera = async () => {
    stopCamera();
    setCameraFacing(prev => prev === 'user' ? 'environment' : 'user');
    // Camera will restart when cameraFacing changes
  };

  useEffect(() => {
    if (recordingState === 'idle' && !recordedBlob) {
      startCamera();
    }
  }, [recordingState, cameraFacing]);

  const startRecording = () => {
    if (!streamRef.current) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(streamRef.current, {
      mimeType: 'video/webm;codecs=vp9,opus',
    });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setRecordingState('preview');
      stopCamera();
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start(1000); // Collect data every second
    setRecordingState('recording');
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please select a video file.');
      return;
    }

    // Max 50MB
    if (file.size > 50 * 1024 * 1024) {
      setError('Video file must be less than 50MB.');
      return;
    }

    setError(null);
    setRecordedBlob(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setRecordingState('preview');
    stopCamera();

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
  };

  const processVideo = async () => {
    if (!recordedBlob) return;

    setRecordingState('uploading');
    setError(null);

    try {
      // Upload to Supabase Storage
      const file = new File([recordedBlob], `pantry_video_${Date.now()}.webm`, {
        type: recordedBlob.type || 'video/webm',
      });

      const mediaUpload = await uploadMediaFile(file, 'video');

      if (!mediaUpload) {
        setError('Failed to upload video. Please try again.');
        setRecordingState('preview');
        return;
      }

      setRecordingState('processing');

      // Update status to processing
      await updateMediaProcessingStatus(mediaUpload.id, 'processing');

      // Process with AI
      const result = await scanPantryFromVideo(recordedBlob);

      if (result && result.items.length > 0) {
        // Update with results
        await updateMediaProcessingStatus(mediaUpload.id, 'complete', result);
        setScanResult(result);
        setSelectedItems(new Set(result.items));
        setRecordingState('results');
      } else {
        await updateMediaProcessingStatus(mediaUpload.id, 'complete', { items: [] });
        setError('No items could be identified in the video. Try recording again with better lighting and clearer views of items.');
        setRecordingState('preview');
      }
    } catch (err) {
      console.error('Error processing video:', err);
      setError('Failed to process video. Please try again.');
      setRecordingState('preview');
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
      id: `video-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
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
            <div className="bg-red-100 p-2 rounded-lg">
              <Video className="text-red-600" size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Video Pantry Scan</h2>
              <p className="text-sm text-slate-500">Record or upload a video of your pantry</p>
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
          {/* Camera/Recording View */}
          {(recordingState === 'idle' || recordingState === 'recording') && (
            <div className="space-y-4">
              {/* Camera preview */}
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full h-full object-cover"
                />
                {recordingState === 'recording' && (
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Recording...
                  </div>
                )}

                {/* Camera switch button */}
                <button
                  onClick={switchCamera}
                  className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
                  disabled={recordingState === 'recording'}
                >
                  <RefreshCw size={20} className="text-white" />
                </button>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-4">
                {recordingState === 'idle' ? (
                  <>
                    <button
                      onClick={startRecording}
                      className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition-colors"
                    >
                      <Video size={20} />
                      Start Recording
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                    >
                      <Upload size={20} />
                      Upload Video
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*"
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
                  <li>• Slowly pan across shelves and drawers</li>
                  <li>• Ensure good lighting</li>
                  <li>• Keep items in frame for 2-3 seconds each</li>
                  <li>• 10-30 seconds of video works best</li>
                </ul>
              </div>
            </div>
          )}

          {/* Preview View */}
          {recordingState === 'preview' && previewUrl && (
            <div className="space-y-4">
              <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
                <video
                  ref={previewVideoRef}
                  src={previewUrl}
                  controls
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="flex justify-center gap-4">
                <button
                  onClick={discardRecording}
                  className="flex items-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  <Trash2 size={20} />
                  Discard
                </button>
                <button
                  onClick={processVideo}
                  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold transition-colors"
                >
                  <Camera size={20} />
                  Analyze Video
                </button>
              </div>
            </div>
          )}

          {/* Uploading/Processing View */}
          {(recordingState === 'uploading' || recordingState === 'processing') && (
            <div className="py-16 text-center">
              <Loader2 size={48} className="mx-auto text-emerald-600 animate-spin mb-4" />
              <h3 className="text-lg font-semibold text-slate-800 mb-2">
                {recordingState === 'uploading' ? 'Uploading video...' : 'Analyzing video...'}
              </h3>
              <p className="text-sm text-slate-500">
                {recordingState === 'uploading'
                  ? 'Please wait while we upload your video'
                  : 'AI is identifying items in your video'}
              </p>
            </div>
          )}

          {/* Results View */}
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

              {/* Scan again option */}
              <button
                onClick={discardRecording}
                className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <Video size={14} />
                Record another video
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

export default VideoRecorder;
