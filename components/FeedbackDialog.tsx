import React, { useState, useRef, useCallback } from 'react';
import { X, Loader2, Bug, Sparkles, HelpCircle, MessageSquare, CheckCircle, Camera, Trash2, Image as ImageIcon } from 'lucide-react';
import { submitFeedback } from '../services/feedbackService';
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

  const captureScreenshot = useCallback(async () => {
    setIsCapturing(true);
    try {
      // Use html2canvas to capture the screen
      const html2canvas = (await import('html2canvas')).default;

      // Temporarily hide the modal
      const modalElement = document.querySelector('[data-feedback-modal]');
      if (modalElement) {
        (modalElement as HTMLElement).style.display = 'none';
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
      if (modalElement) {
        (modalElement as HTMLElement).style.display = '';
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
        screenshot || undefined
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
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl max-w-lg w-full shadow-xl animate-fadeIn max-h-[90vh] overflow-y-auto"
        data-feedback-modal
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
