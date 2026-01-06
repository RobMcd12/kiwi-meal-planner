import React, { useState, useRef, useCallback } from 'react';
import { X, Loader2, Bug, Sparkles, HelpCircle, MessageSquare, CheckCircle, Camera, Trash2, Image as ImageIcon, Video, Square, Pause, Play, Circle } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Screen recording
  const {
    state: recordingState,
    recordingBlob,
    recordingUrl,
    elapsedTime,
    error: recordingError,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    clearRecording,
    isSupported: isRecordingSupported,
  } = useScreenRecording({
    maxDurationMs: MAX_RECORDING_SECONDS * 1000,
  });

  const formatTime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const remainingTime = MAX_RECORDING_SECONDS * 1000 - elapsedTime;

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

              {/* Screen Recording Section */}
              {isRecordingSupported && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Screen Recording (optional, max 30s)
                  </label>

                  {recordingUrl ? (
                    // Show recorded video
                    <div className="relative">
                      <video
                        src={recordingUrl}
                        controls
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
                  ) : recordingState === 'idle' ? (
                    // Start recording button
                    <button
                      type="button"
                      onClick={startRecording}
                      className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-medium transition-colors"
                    >
                      <Circle size={16} className="fill-red-500 text-red-500" />
                      Record Screen
                    </button>
                  ) : (
                    // Recording controls
                    <div className="bg-slate-100 rounded-xl p-4 space-y-3">
                      {/* Timer and progress */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {recordingState === 'recording' && (
                            <span className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                          )}
                          {recordingState === 'paused' && (
                            <span className="w-3 h-3 bg-amber-500 rounded-full" />
                          )}
                          <span className="text-lg font-mono font-medium text-slate-800">
                            {formatTime(elapsedTime)}
                          </span>
                          <span className="text-sm text-slate-500">
                            / {formatTime(MAX_RECORDING_SECONDS * 1000)}
                          </span>
                        </div>
                        <span className="text-sm text-slate-500">
                          {recordingState === 'recording' ? 'Recording...' : 'Paused'}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-100 ${
                            recordingState === 'recording' ? 'bg-red-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${(elapsedTime / (MAX_RECORDING_SECONDS * 1000)) * 100}%` }}
                        />
                      </div>

                      {/* Control buttons */}
                      <div className="flex gap-2">
                        {recordingState === 'recording' ? (
                          <button
                            type="button"
                            onClick={pauseRecording}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                          >
                            <Pause size={16} />
                            Pause
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={resumeRecording}
                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition-colors"
                          >
                            <Play size={16} />
                            Resume
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={stopRecording}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
                        >
                          <Square size={14} className="fill-white" />
                          Stop
                        </button>
                      </div>
                    </div>
                  )}

                  {recordingError && (
                    <p className="text-xs text-red-500 mt-2">{recordingError}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-2">
                    Record your screen to show us exactly what&apos;s happening.
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
