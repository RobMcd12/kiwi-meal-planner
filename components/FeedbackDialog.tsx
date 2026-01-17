import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Loader2, Bug, Sparkles, HelpCircle, MessageSquare, CheckCircle, Camera, Trash2, Image as ImageIcon, Square, Pause, Play, Circle, Video, RefreshCw } from 'lucide-react';
import { submitFeedback } from '../services/feedbackService';
import { useScreenRecording } from '../hooks/useScreenRecording';
import type { FeedbackType } from '../types';

interface FeedbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: {
    id: string;
    name: string;
    email?: string;
  };
}

const FEEDBACK_TYPES: { type: FeedbackType; label: string; icon: React.ElementType }[] = [
  { type: 'bug', label: 'Bug Report', icon: Bug },
  { type: 'feature', label: 'Feature Request', icon: Sparkles },
  { type: 'question', label: 'Question', icon: HelpCircle },
  { type: 'other', label: 'Other', icon: MessageSquare },
];

const MAX_RECORDING_SECONDS = 30;

const FeedbackDialog: React.FC<FeedbackDialogProps> = ({ isOpen, onClose, currentUser }) => {
  const [type, setType] = useState<FeedbackType>('feature');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraFacing, setCameraFacing] = useState<'user' | 'environment'>('environment');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraVideoRef = useRef<HTMLVideoElement>(null);

  // Screen recording (or camera recording on mobile/iOS)
  const {
    state: recordingState,
    recordingBlob,
    recordingUrl,
    elapsedTime,
    error: recordingError,
    startRecording: startRecordingHook,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    isSupported: isRecordingSupported,
    isCameraMode,
  } = useScreenRecording({
    maxDurationMs: MAX_RECORDING_SECONDS * 1000,
  });

  // Check if we're actively recording (modal should be hidden)
  const isActivelyRecording = recordingState === 'recording' || recordingState === 'paused';

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Handle camera preview for mobile recording
  const startCameraPreview = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing },
        audio: false,
      });
      setCameraStream(stream);
      setShowCameraPreview(true);
      if (cameraVideoRef.current) {
        cameraVideoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Failed to access camera:', err);
      setError('Could not access camera. Please check permissions.');
    }
  }, [cameraFacing]);

  const stopCameraPreview = useCallback(() => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCameraPreview(false);
  }, [cameraStream]);

  const switchCamera = useCallback(async () => {
    const newFacing = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(newFacing);
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacing },
          audio: false,
        });
        setCameraStream(stream);
        if (cameraVideoRef.current) {
          cameraVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error('Failed to switch camera:', err);
      }
    }
  }, [cameraFacing, cameraStream]);

  // Cleanup camera stream on unmount or when recording stops
  useEffect(() => {
    if (recordingState === 'stopped' || recordingState === 'idle') {
      stopCameraPreview();
    }
  }, [recordingState, stopCameraPreview]);

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const handleStartRecording = async () => {
    if (isCameraMode) {
      // For camera mode, show preview first
      await startCameraPreview();
    } else {
      // For screen mode, start directly
      await startRecordingHook();
    }
  };

  const handleStartCameraRecording = async () => {
    // Stop the preview stream first
    stopCameraPreview();
    // Then start the actual recording
    await startRecordingHook();
  };

  const captureScreenshot = useCallback(async () => {
    setIsCapturing(true);
    try {
      // Use html2canvas to capture the screen
      const html2canvas = (await import('html2canvas')).default;

      // Temporarily hide the entire modal (including backdrop)
      const backdropElement = document.querySelector('[data-feedback-backdrop]');
      if (backdropElement) {
        (backdropElement as HTMLElement).style.visibility = 'hidden';
      }

      // Small delay to ensure modal is hidden
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capture the document body
      const canvas = await html2canvas(document.body, {
        scale: 0.5, // Reduce scale for smaller file size
        logging: false,
        useCORS: true,
        allowTaint: true,
      });

      // Show modal again
      if (backdropElement) {
        (backdropElement as HTMLElement).style.visibility = '';
      }

      // Convert to base64
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
      setScreenshot(dataUrl);
    } catch (err) {
      console.error('Screenshot capture failed:', err);
      setError('Failed to capture screenshot. Please try uploading an image instead.');
    } finally {
      setIsCapturing(false);
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, etc.)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setScreenshot(event.target?.result as string);
      setError(null);
    };
    reader.onerror = () => {
      setError('Failed to read image file');
    };
    reader.readAsDataURL(file);
  };

  const removeScreenshot = () => {
    setScreenshot(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !subject.trim() || !message.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await submitFeedback(
        currentUser.id,
        currentUser.name,
        currentUser.email,
        type,
        subject.trim(),
        message.trim(),
        screenshot || undefined,
        recordingBlob || undefined
      );

      setSubmitted(true);
      setTimeout(() => {
        onClose();
        // Reset form after closing
        setTimeout(() => {
          setSubmitted(false);
          setSubject('');
          setMessage('');
          setType('feature');
          setScreenshot(null);
          clearRecording();
        }, 300);
      }, 2000);
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      setError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting && recordingState === 'idle') {
      clearRecording();
      onClose();
    }
  };

  // Render camera preview modal for mobile camera recording
  if (showCameraPreview && isCameraMode) {
    return (
      <div className="fixed inset-0 bg-black/90 flex flex-col items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-2xl max-w-lg w-full shadow-xl animate-fadeIn overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <Video className="text-red-500" size={20} />
              <h3 className="font-semibold text-slate-800">Camera Preview</h3>
            </div>
            <button
              type="button"
              onClick={stopCameraPreview}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors"
            >
              <X size={20} className="text-slate-400" />
            </button>
          </div>

          {/* Camera preview */}
          <div className="relative bg-black aspect-video">
            <video
              ref={cameraVideoRef}
              autoPlay
              muted
              playsInline
              className="w-full h-full object-cover"
            />
            {/* Camera switch button */}
            <button
              onClick={switchCamera}
              className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
            >
              <RefreshCw size={20} className="text-white" />
            </button>
          </div>

          {/* Controls */}
          <div className="p-4 flex flex-col gap-3">
            <p className="text-sm text-slate-500 text-center">
              Point your camera at the screen to show us the issue
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={stopCameraPreview}
                className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleStartCameraRecording}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors"
              >
                <Circle size={16} className="fill-white" />
                Start Recording
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render floating recording controls when actively recording (for both screen and camera modes)
  if (isActivelyRecording) {
    return (
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] animate-fadeIn">
        <div className="bg-slate-900/95 backdrop-blur-sm text-white rounded-2xl shadow-2xl px-6 py-4 flex items-center gap-4">
          {/* Recording indicator */}
          <div className="flex items-center gap-3">
            {recordingState === 'recording' ? (
              <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
            ) : (
              <span className="w-3 h-3 bg-amber-500 rounded-full" />
            )}
            <span className="text-lg font-mono font-medium">
              {formatTime(elapsedTime)}
            </span>
            <span className="text-sm text-slate-400">
              / {formatTime(MAX_RECORDING_SECONDS * 1000)}
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-100 ${
                recordingState === 'recording' ? 'bg-red-500' : 'bg-amber-500'
              }`}
              style={{ width: `${(elapsedTime / (MAX_RECORDING_SECONDS * 1000)) * 100}%` }}
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center gap-2">
            {recordingState === 'recording' ? (
              <button
                type="button"
                onClick={pauseRecording}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
              >
                <Pause size={18} />
                Pause
              </button>
            ) : (
              <button
                type="button"
                onClick={resumeRecording}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
              >
                <Play size={18} />
                Resume
              </button>
            )}
            <button
              type="button"
              onClick={stopRecording}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              <Square size={16} className="fill-white" />
              Stop & Save
            </button>
          </div>
        </div>

        {/* Helper text */}
        <p className="text-center text-white/80 text-sm mt-3 bg-slate-900/80 rounded-lg px-4 py-2 backdrop-blur-sm">
          {isCameraMode ? 'Recording from camera...' : 'Navigate around the app to show us the issue'}
        </p>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      data-feedback-backdrop
    >
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-xl animate-fadeIn max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="text-emerald-600" size={32} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 mb-2">Thank you!</h3>
            <p className="text-slate-500">Your feedback has been submitted successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-bold text-slate-800">Send Feedback</h2>
              <button
                type="button"
                onClick={handleClose}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Type Selection */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  What type of feedback?
                </label>
                <div className="flex flex-wrap gap-2">
                  {FEEDBACK_TYPES.map(({ type: t, label, icon: Icon }) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        type === t
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <Icon size={16} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Subject
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                  placeholder="Brief summary of your feedback..."
                  required
                  maxLength={255}
                />
              </div>

              {/* Message */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Message
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all resize-none h-32"
                  placeholder="Describe in detail..."
                  required
                />
              </div>

              {/* Screenshot Section */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Screenshot (optional)
                </label>

                {screenshot ? (
                  <div className="relative">
                    <img
                      src={screenshot}
                      alt="Screenshot"
                      className="w-full rounded-xl border border-slate-200 max-h-48 object-contain bg-slate-50"
                    />
                    <button
                      type="button"
                      onClick={removeScreenshot}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                      title="Remove screenshot"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={captureScreenshot}
                      disabled={isCapturing}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                      {isCapturing ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          Capturing...
                        </>
                      ) : (
                        <>
                          <Camera size={16} />
                          Capture Screen
                        </>
                      )}
                    </button>
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors cursor-pointer">
                      <ImageIcon size={16} />
                      Upload Image
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
                <p className="text-xs text-slate-400 mt-2">
                  Add a screenshot to help us understand the issue better.
                </p>
              </div>

              {/* Screen/Camera Recording Section */}
              {isRecordingSupported && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    {isCameraMode ? 'Video Recording (optional, max 30s)' : 'Screen Recording (optional, max 30s)'}
                  </label>

                  {recordingUrl ? (
                    // Show recorded video
                    <div className="relative">
                      <video
                        src={recordingUrl}
                        controls
                        playsInline
                        className="w-full rounded-xl border border-slate-200 max-h-48 bg-slate-900"
                      />
                      <button
                        type="button"
                        onClick={clearRecording}
                        className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-md"
                        title="Remove recording"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    // Start recording button
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-medium transition-colors"
                    >
                      <Circle size={16} className="fill-red-500 text-red-500" />
                      {isCameraMode ? 'Record Video' : 'Record Screen'}
                    </button>
                  )}

                  {recordingError && (
                    <p className="text-xs text-red-500 mt-2">{recordingError}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    {isCameraMode
                      ? 'Use your camera to record what you see on screen.'
                      : 'Click to start recording. The dialog will hide so you can navigate the app.'}
                  </p>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !subject.trim() || !message.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit Feedback'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default FeedbackDialog;
