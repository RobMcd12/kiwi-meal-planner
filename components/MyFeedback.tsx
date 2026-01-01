import React, { useState, useEffect } from 'react';
import { ArrowLeft, Bug, Sparkles, HelpCircle, MessageSquare, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { getMyFeedback, markFeedbackViewed } from '../services/feedbackService';
import type { FeedbackItem, FeedbackType, FeedbackStatus } from '../types';

interface MyFeedbackProps {
  currentUserId: string;
  onBack: () => void;
}

const TYPE_ICONS: Record<FeedbackType, React.ElementType> = {
  bug: Bug,
  feature: Sparkles,
  question: HelpCircle,
  other: MessageSquare,
};

const STATUS_COLORS: Record<FeedbackStatus, string> = {
  new: 'bg-blue-100 text-blue-700',
  reviewed: 'bg-amber-100 text-amber-700',
  'in-progress': 'bg-purple-100 text-purple-700',
  resolved: 'bg-emerald-100 text-emerald-700',
};

const MyFeedback: React.FC<MyFeedbackProps> = ({ currentUserId, onBack }) => {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadFeedback();
  }, [currentUserId]);

  const loadFeedback = async () => {
    try {
      const data = await getMyFeedback(currentUserId);
      setFeedback(data);
    } catch (error) {
      console.error('Failed to load feedback:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExpand = async (item: FeedbackItem) => {
    const newId = expandedId === item.id ? null : item.id;
    setExpandedId(newId);

    // Mark as viewed if expanding and has unviewed response
    if (newId && item.admin_response && !item.user_viewed_response) {
      try {
        await markFeedbackViewed(item.id);
        setFeedback((prev) =>
          prev.map((f) => (f.id === item.id ? { ...f, user_viewed_response: true } : f))
        );
      } catch (error) {
        console.error('Failed to mark as viewed:', error);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-NZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onBack}
          className="p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-slate-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">My Feedback</h1>
          <p className="text-slate-500 text-sm">View your submitted feedback and responses</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={32} className="animate-spin text-emerald-600" />
        </div>
      ) : feedback.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-slate-200">
          <MessageSquare className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="text-lg font-medium text-slate-700 mb-2">No feedback yet</h3>
          <p className="text-slate-500">
            You haven't submitted any feedback. Use the feedback button to share your thoughts!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {feedback.map((item) => {
            const Icon = TYPE_ICONS[item.type];
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                {/* Header - clickable */}
                <button
                  onClick={() => handleExpand(item)}
                  className="w-full p-4 text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-slate-100 rounded-lg">
                        <Icon size={20} className="text-slate-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-slate-800">{item.subject}</h3>
                        <p className="text-sm text-slate-500">{formatDate(item.created_at)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.admin_response && !item.user_viewed_response && (
                        <span className="px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-full">
                          New Response
                        </span>
                      )}
                      <span
                        className={`px-2.5 py-1 text-xs font-medium rounded-full capitalize ${
                          STATUS_COLORS[item.status]
                        }`}
                      >
                        {item.status.replace('-', ' ')}
                      </span>
                      {isExpanded ? (
                        <ChevronUp size={20} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={20} className="text-slate-400" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="border-t border-slate-200 p-4 space-y-4 bg-slate-50">
                    {/* Original message */}
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-2">Your Message</h4>
                      <p className="text-slate-700 whitespace-pre-wrap bg-white p-4 rounded-lg border border-slate-200">
                        {item.message}
                      </p>
                    </div>

                    {/* Screenshot */}
                    {item.screenshot && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 mb-2">Attached Screenshot</h4>
                        <a
                          href={item.screenshot}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <img
                            src={item.screenshot}
                            alt="Feedback screenshot"
                            className="max-w-full max-h-48 rounded-lg border border-slate-200 hover:border-emerald-500 transition-colors cursor-pointer"
                          />
                        </a>
                        <p className="text-xs text-slate-400 mt-1">Click to view full size</p>
                      </div>
                    )}

                    {/* Admin response */}
                    {item.admin_response && (
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                        <h4 className="text-sm font-medium text-emerald-700 mb-2 flex items-center gap-2">
                          <span className="w-2 h-2 bg-emerald-500 rounded-full" />
                          Admin Response
                        </h4>
                        <p className="text-slate-700 whitespace-pre-wrap">{item.admin_response}</p>
                        {item.admin_responded_at && (
                          <p className="text-xs text-slate-500 mt-3">
                            Responded {formatDateTime(item.admin_responded_at)}
                            {item.admin_name && ` by ${item.admin_name}`}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyFeedback;
