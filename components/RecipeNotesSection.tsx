import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Send, Trash2, Globe, Lock, Loader2, User,
  ChevronDown, ChevronUp, Star, Edit2, X
} from 'lucide-react';
import { RecipeNote, RecipeComment } from '../types';
import {
  getRecipeNotes, saveRecipeNote, deleteRecipeNote,
  getRecipeComments, saveRecipeComment, deleteRecipeComment, getRecipeAverageRating
} from '../services/recipeService';

interface RecipeNotesSectionProps {
  mealId: string;
  isPublicRecipe?: boolean;
  canEdit?: boolean;
}

// Star Rating Component
const StarRating: React.FC<{
  rating: number;
  onRate?: (rating: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md';
}> = ({ rating, onRate, readonly = false, size = 'md' }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const starSize = size === 'sm' ? 14 : 18;

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onRate?.(star)}
          onMouseEnter={() => !readonly && setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          className={`${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'} transition-transform`}
        >
          <Star
            size={starSize}
            className={`${
              star <= (hoverRating || rating)
                ? 'fill-amber-400 text-amber-400'
                : 'text-slate-300'
            } transition-colors`}
          />
        </button>
      ))}
    </div>
  );
};

const RecipeNotesSection: React.FC<RecipeNotesSectionProps> = ({
  mealId,
  isPublicRecipe = false,
  canEdit = true
}) => {
  // Notes state
  const [privateNote, setPrivateNote] = useState<RecipeNote | null>(null);
  const [publicNote, setPublicNote] = useState<RecipeNote | null>(null);
  const [otherPublicNotes, setOtherPublicNotes] = useState<RecipeNote[]>([]);
  const [privateNoteText, setPrivateNoteText] = useState('');
  const [publicNoteText, setPublicNoteText] = useState('');
  const [savingPrivate, setSavingPrivate] = useState(false);
  const [savingPublic, setSavingPublic] = useState(false);

  // Comments state
  const [comments, setComments] = useState<RecipeComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(0);
  const [savingComment, setSavingComment] = useState(false);
  const [commentsExpanded, setCommentsExpanded] = useState(false);
  const [averageRating, setAverageRating] = useState({ average: 0, count: 0 });

  // Loading state
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [mealId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load notes
      const fetchedNotes = await getRecipeNotes(mealId);
      const ownPrivate = fetchedNotes.find(n => n.isOwn && !n.isPublic);
      const ownPublic = fetchedNotes.find(n => n.isOwn && n.isPublic);
      const othersPublic = fetchedNotes.filter(n => !n.isOwn && n.isPublic);

      setPrivateNote(ownPrivate || null);
      setPublicNote(ownPublic || null);
      setOtherPublicNotes(othersPublic);
      setPrivateNoteText(ownPrivate?.noteText || '');
      setPublicNoteText(ownPublic?.noteText || '');

      // Load comments if public recipe
      if (isPublicRecipe) {
        const fetchedComments = await getRecipeComments(mealId);
        setComments(fetchedComments);

        const rating = await getRecipeAverageRating(mealId);
        setAverageRating(rating);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePrivateNote = async () => {
    if (!privateNoteText.trim()) return;
    setSavingPrivate(true);
    try {
      const saved = await saveRecipeNote(mealId, privateNoteText.trim(), false);
      if (saved) {
        setPrivateNote({ ...saved, isOwn: true });
      }
    } catch (err) {
      console.error('Error saving private note:', err);
    } finally {
      setSavingPrivate(false);
    }
  };

  const handleSavePublicNote = async () => {
    if (!publicNoteText.trim()) return;
    setSavingPublic(true);
    try {
      const saved = await saveRecipeNote(mealId, publicNoteText.trim(), true);
      if (saved) {
        setPublicNote({ ...saved, isOwn: true });
      }
    } catch (err) {
      console.error('Error saving public note:', err);
    } finally {
      setSavingPublic(false);
    }
  };

  const handleDeleteNote = async (noteId: string, isPublic: boolean) => {
    if (!confirm('Delete this note?')) return;
    try {
      const success = await deleteRecipeNote(noteId);
      if (success) {
        if (isPublic) {
          setPublicNote(null);
          setPublicNoteText('');
        } else {
          setPrivateNote(null);
          setPrivateNoteText('');
        }
      }
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  const handleSaveComment = async () => {
    if (!newComment.trim()) return;
    setSavingComment(true);
    try {
      const saved = await saveRecipeComment(mealId, newComment.trim(), newRating || null);
      if (saved) {
        setComments(prev => [saved, ...prev]);
        setNewComment('');
        setNewRating(0);
        // Refresh average rating
        const rating = await getRecipeAverageRating(mealId);
        setAverageRating(rating);
      }
    } catch (err) {
      console.error('Error saving comment:', err);
    } finally {
      setSavingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      const success = await deleteRecipeComment(commentId);
      if (success) {
        setComments(prev => prev.filter(c => c.id !== commentId));
        // Refresh average rating
        const rating = await getRecipeAverageRating(mealId);
        setAverageRating(rating);
      }
    } catch (err) {
      console.error('Error deleting comment:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Private Notes Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-slate-700">
          <Lock size={18} />
          <h3 className="font-semibold">Private Note</h3>
          <span className="text-xs text-slate-400">(Only you can see this)</span>
        </div>

        {canEdit && (
          <div className="space-y-2">
            <textarea
              value={privateNoteText}
              onChange={(e) => setPrivateNoteText(e.target.value)}
              placeholder="Add a personal note about this recipe..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              {privateNote && (
                <button
                  onClick={() => handleDeleteNote(privateNote.id, false)}
                  className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  Delete
                </button>
              )}
              <button
                onClick={handleSavePrivateNote}
                disabled={!privateNoteText.trim() || savingPrivate}
                className="flex items-center gap-2 px-4 py-1.5 bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPrivate ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {privateNote ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {!canEdit && privateNote && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{privateNote.noteText}</p>
          </div>
        )}
      </div>

      {/* Public Notes Section (only for public recipes) */}
      {isPublicRecipe && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-slate-700">
            <Globe size={18} className="text-blue-600" />
            <h3 className="font-semibold">Shared Note</h3>
            <span className="text-xs text-slate-400">(Visible to everyone)</span>
          </div>

          {canEdit && (
            <div className="space-y-2">
              <textarea
                value={publicNoteText}
                onChange={(e) => setPublicNoteText(e.target.value)}
                placeholder="Share a note about this recipe with others..."
                className="w-full px-4 py-3 border border-blue-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-blue-50/50"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                {publicNote && (
                  <button
                    onClick={() => handleDeleteNote(publicNote.id, true)}
                    className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                )}
                <button
                  onClick={handleSavePublicNote}
                  disabled={!publicNoteText.trim() || savingPublic}
                  className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingPublic ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Globe size={14} />
                  )}
                  {publicNote ? 'Update' : 'Share Publicly'}
                </button>
              </div>
            </div>
          )}

          {/* Other users' public notes */}
          {otherPublicNotes.length > 0 && (
            <div className="space-y-2 pt-2">
              <h4 className="text-sm font-medium text-slate-600">
                Notes from others ({otherPublicNotes.length})
              </h4>
              {otherPublicNotes.map(note => (
                <div key={note.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center">
                      <User size={10} className="text-slate-500" />
                    </div>
                    <span className="text-xs font-medium text-slate-600">{note.userName}</span>
                    <span className="text-xs text-slate-400">
                      {new Date(note.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.noteText}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Comments & Ratings Section (only for public recipes) */}
      {isPublicRecipe && (
        <div className="space-y-3 border-t border-slate-200 pt-4">
          {/* Header with average rating */}
          <button
            onClick={() => setCommentsExpanded(!commentsExpanded)}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <div className="flex items-center gap-3">
              <MessageSquare size={18} className="text-slate-600" />
              <span className="font-semibold text-slate-700">
                Comments & Ratings ({comments.length})
              </span>
              {averageRating.count > 0 && (
                <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200">
                  <StarRating rating={Math.round(averageRating.average)} readonly size="sm" />
                  <span className="text-sm font-medium text-slate-600">
                    {averageRating.average.toFixed(1)}
                  </span>
                  <span className="text-xs text-slate-400">
                    ({averageRating.count})
                  </span>
                </div>
              )}
            </div>
            {commentsExpanded ? (
              <ChevronUp size={18} className="text-slate-400" />
            ) : (
              <ChevronDown size={18} className="text-slate-400" />
            )}
          </button>

          {/* Expandable comments section */}
          {commentsExpanded && (
            <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
              {/* Add comment form */}
              {canEdit && (
                <div className="bg-slate-50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-600">Your rating:</span>
                    <StarRating rating={newRating} onRate={setNewRating} />
                    {newRating > 0 && (
                      <button
                        onClick={() => setNewRating(0)}
                        className="text-xs text-slate-400 hover:text-slate-600"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Share your thoughts about this recipe..."
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white"
                    rows={2}
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveComment}
                      disabled={!newComment.trim() || savingComment}
                      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {savingComment ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                      Post Comment
                    </button>
                  </div>
                </div>
              )}

              {/* Comments list */}
              {comments.length > 0 ? (
                <div className="space-y-3">
                  {comments.map(comment => (
                    <div
                      key={comment.id}
                      className={`rounded-xl p-4 ${
                        comment.isOwn
                          ? 'bg-emerald-50 border border-emerald-200'
                          : 'bg-white border border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          {comment.userAvatar ? (
                            <img
                              src={comment.userAvatar}
                              alt={comment.userName}
                              className="w-8 h-8 rounded-full"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                              <User size={14} className="text-slate-500" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-slate-700">
                                {comment.userName}
                              </span>
                              {comment.isOwn && (
                                <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">
                                  You
                                </span>
                              )}
                            </div>
                            <span className="text-xs text-slate-400">
                              {new Date(comment.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {comment.rating && (
                            <StarRating rating={comment.rating} readonly size="sm" />
                          )}
                          {comment.isOwn && canEdit && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                              title="Delete comment"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-slate-700 mt-2 whitespace-pre-wrap">
                        {comment.commentText}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">
                  No comments yet. Be the first to share your thoughts!
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RecipeNotesSection;
