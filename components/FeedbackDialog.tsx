import React, { useState } from 'react';
import { X, Loader2, Bug, Sparkles, HelpCircle, MessageSquare, CheckCircle } from 'lucide-react';
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
        message.trim()
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
        className="bg-white rounded-2xl max-w-lg w-full shadow-xl animate-fadeIn"
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
