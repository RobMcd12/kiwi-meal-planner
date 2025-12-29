import React, { useState, useEffect } from 'react';
import {
  MessageSquare, Send, Trash2, Globe, Lock, Loader2, User,
  ChevronDown, ChevronUp, Star, Plus, X
} from 'lucide-react';
import { RecipeNote, RecipeComment } from '../types';
import {
  getRecipeNotes, saveRecipeNote, deleteRecipeNote,
  getRecipeComments, saveRecipeComment, deleteRecipeComment, getRecipeAverageRating,
  saveRecipeRating, getUserRating
} from '../services/recipeService';

interface RecipeNotesSectionProps {
  mealId: string;
  isPublicRecipe?: boolean;
  canEdit?: boolean;
  onRatingChange?: (average: number, count: number) => void;
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
  canEdit = true,
  onRatingChange
}) => {
  // Notes state
  const [privateNote, setPrivateNote] = useState<RecipeNote | null>(null);
  const [publicNote, setPublicNote] = useState<RecipeNote | null>(null);
  const [otherPublicNotes, setOtherPublicNotes] = useState<RecipeNote[]>([]);

  // Form state
  const [showAddNote, setShowAddNote] = useState(false);
  const [showAddPublicNote, setShowAddPublicNote] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [publicNoteText, setPublicNoteText] = useState('');
  const [sharePublicly, setSharePublicly] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [savingPublicNote, setSavingPublicNote] = useState(false);
  const [editingPrivate, setEditingPrivate] = useState(false);
  const [editingPublic, setEditingPublic] = useState(false);

  // Comments state
  const [comments, setComments] = useState<RecipeComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [newRating, setNewRating] = useState(0);
  const [userRating, setUserRating] = useState<number | null>(null);
  const [savingComment, setSavingComment] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
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

      // Load comments and ratings for all recipes (not just public)
      const fetchedComments = await getRecipeComments(mealId);
      setComments(fetchedComments);

      const rating = await getRecipeAverageRating(mealId);
      setAverageRating(rating);

      // Load user's own rating
      const ownRating = await getUserRating(mealId);
      setUserRating(ownRating);
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      // If sharePublicly is checked, save as public note
      const saved = await saveRecipeNote(mealId, noteText.trim(), sharePublicly);
      if (saved) {
        if (sharePublicly) {
          setPublicNote({ ...saved, isOwn: true });
        } else {
          setPrivateNote({ ...saved, isOwn: true });
        }
        setNoteText('');
        setSharePublicly(false);
        setShowAddNote(false);
        setEditingPrivate(false);
      }
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setSavingNote(false);
    }
  };

  const handleSavePublicNote = async () => {
    if (!publicNoteText.trim()) return;
    setSavingPublicNote(true);
    try {
      const saved = await saveRecipeNote(mealId, publicNoteText.trim(), true);
      if (saved) {
        setPublicNote({ ...saved, isOwn: true });
        setPublicNoteText('');
        setShowAddPublicNote(false);
        setEditingPublic(false);
      }
    } catch (err) {
      console.error('Error saving public note:', err);
    } finally {
      setSavingPublicNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string, isPublic: boolean) => {
    if (!confirm('Delete this note?')) return;
    try {
      const success = await deleteRecipeNote(noteId);
      if (success) {
        if (isPublic) {
          setPublicNote(null);
        } else {
          setPrivateNote(null);
        }
      }
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  const handleEditPrivateNote = () => {
    if (privateNote) {
      setNoteText(privateNote.noteText);
      setSharePublicly(false);
      setEditingPrivate(true);
      setShowAddNote(true);
    }
  };

  const handleEditPublicNote = () => {
    if (publicNote) {
      setPublicNoteText(publicNote.noteText);
      setEditingPublic(true);
      setShowAddPublicNote(true);
    }
  };

  // Auto-save rating when user clicks a star
  const handleRatingClick = async (rating: number) => {
    if (savingRating) return;
    setSavingRating(true);
    setUserRating(rating); // Optimistic update
    try {
      const result = await saveRecipeRating(mealId, rating);
      if (result.success) {
        setAverageRating({ average: result.average, count: result.count });
        onRatingChange?.(result.average, result.count);
      }
    } catch (err) {
      console.error('Error saving rating:', err);
      // Revert on error
      const ownRating = await getUserRating(mealId);
      setUserRating(ownRating);
    } finally {
      setSavingRating(false);
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
        onRatingChange?.(rating.average, rating.count);
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
        onRatingChange?.(rating.average, rating.count);
        // Also reset user rating if they deleted their only comment
        const ownRating = await getUserRating(mealId);
        setUserRating(ownRating);
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

  const hasAnyNote = privateNote || publicNote;

  return (
    <div className="space-y-6">
      {/* Notes Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-700">
            <MessageSquare size={18} />
            <h3 className="font-semibold">Notes</h3>
          </div>

          {/* Add Note Button - only show if user can edit and doesn't have both notes */}
          {canEdit && !showAddNote && !privateNote && (
            <button
              onClick={() => setShowAddNote(true)}
              className="flex items-center gap-1.5 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
            >
              <Plus size={16} />
              Add Note
            </button>
          )}
        </div>

        {/* Add Note Form */}
        {showAddNote && canEdit && (
          <div className="bg-slate-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">
                {editingPrivate ? 'Edit Note' : 'New Note'}
              </span>
              <button
                onClick={() => {
                  setShowAddNote(false);
                  setNoteText('');
                  setSharePublicly(false);
                  setEditingPrivate(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add your note about this recipe..."
              className="w-full px-4 py-3 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white"
              rows={3}
            />

            {/* Share Publicly Checkbox - only on public recipes */}
            {isPublicRecipe && !publicNote && (
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sharePublicly}
                  onChange={(e) => setSharePublicly(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-600 flex items-center gap-1.5">
                  <Globe size={14} className="text-blue-500" />
                  Share Publicly
                </span>
                <span className="text-xs text-slate-400">(visible to everyone)</span>
              </label>
            )}

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddNote(false);
                  setNoteText('');
                  setSharePublicly(false);
                  setEditingPrivate(false);
                }}
                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={!noteText.trim() || savingNote}
                className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingNote ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {editingPrivate ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {/* Display Private Note */}
        {privateNote && !editingPrivate && (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Lock size={14} className="text-slate-500" />
                <span className="text-xs font-medium text-slate-500">Private Note</span>
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <button
                    onClick={handleEditPrivateNote}
                    className="p-1 text-slate-400 hover:text-emerald-600 rounded transition-colors"
                    title="Edit"
                  >
                    <MessageSquare size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(privateNote.id, false)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{privateNote.noteText}</p>
          </div>
        )}

        {/* Display Public Note (owned by user) */}
        {publicNote && !editingPublic && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-blue-500" />
                <span className="text-xs font-medium text-blue-600">Shared Publicly</span>
              </div>
              {canEdit && (
                <div className="flex gap-1">
                  <button
                    onClick={handleEditPublicNote}
                    className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors"
                    title="Edit"
                  >
                    <MessageSquare size={14} />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(publicNote.id, true)}
                    className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{publicNote.noteText}</p>
          </div>
        )}

        {/* Add Separate Public Note Button - only if has private note but no public note */}
        {isPublicRecipe && privateNote && !publicNote && !showAddPublicNote && canEdit && (
          <button
            onClick={() => setShowAddPublicNote(true)}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            <Plus size={16} />
            Add Public Note
          </button>
        )}

        {/* Add Public Note Form */}
        {showAddPublicNote && canEdit && (
          <div className="bg-blue-50 rounded-xl p-4 space-y-3 border border-blue-200">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-blue-700 flex items-center gap-1.5">
                <Globe size={14} />
                {editingPublic ? 'Edit Public Note' : 'New Public Note'}
              </span>
              <button
                onClick={() => {
                  setShowAddPublicNote(false);
                  setPublicNoteText('');
                  setEditingPublic(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <textarea
              value={publicNoteText}
              onChange={(e) => setPublicNoteText(e.target.value)}
              placeholder="Share a note with others..."
              className="w-full px-4 py-3 border border-blue-200 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm bg-white"
              rows={3}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddPublicNote(false);
                  setPublicNoteText('');
                  setEditingPublic(false);
                }}
                className="px-3 py-1.5 text-sm text-slate-600 hover:bg-blue-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePublicNote}
                disabled={!publicNoteText.trim() || savingPublicNote}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingPublicNote ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Globe size={14} />
                )}
                {editingPublic ? 'Update' : 'Share'}
              </button>
            </div>
          </div>
        )}

        {/* Other users' public notes */}
        {otherPublicNotes.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <h4 className="text-sm font-medium text-slate-600">
              Notes from others ({otherPublicNotes.length})
            </h4>
            {otherPublicNotes.map(note => (
              <div key={note.id} className="bg-white border border-slate-200 rounded-xl p-3">
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

        {/* Empty state for notes */}
        {!hasAnyNote && !showAddNote && !canEdit && otherPublicNotes.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-2">
            No notes yet.
          </p>
        )}
      </div>

      {/* Ratings & Comments Section (for all recipes) */}
      <div className="space-y-3 border-t border-slate-200 pt-4">
        {/* Quick Rating (always visible) */}
        {canEdit && (
          <div className="flex items-center justify-between bg-amber-50 rounded-xl p-3 border border-amber-200">
            <div className="flex items-center gap-2">
              <Star size={18} className="text-amber-500" />
              <span className="text-sm font-medium text-slate-700">Rate this recipe:</span>
            </div>
            <div className="flex items-center gap-2">
              <StarRating
                rating={userRating || 0}
                onRate={handleRatingClick}
              />
              {savingRating && (
                <Loader2 size={14} className="animate-spin text-amber-500" />
              )}
              {userRating && !savingRating && (
                <span className="text-xs text-amber-600 font-medium">Saved!</span>
              )}
            </div>
          </div>
        )}

        {/* Header with average rating - collapsible */}
        <button
          onClick={() => setCommentsExpanded(!commentsExpanded)}
          className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors"
        >
          <div className="flex items-center gap-3">
            <MessageSquare size={18} className="text-slate-600" />
            <span className="font-semibold text-slate-700">
              Comments{comments.filter(c => c.commentText).length > 0 && ` (${comments.filter(c => c.commentText).length})`}
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
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Share your thoughts about this recipe..."
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm bg-white"
                  rows={2}
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">Add rating with comment:</span>
                    <StarRating rating={newRating} onRate={setNewRating} size="sm" />
                  </div>
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
                    Post
                  </button>
                </div>
              </div>
            )}

            {/* Comments list (filter out empty comments that are just ratings) */}
            {comments.filter(c => c.commentText).length > 0 ? (
              <div className="space-y-3">
                {comments.filter(c => c.commentText).map(comment => (
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
    </div>
  );
};

export default RecipeNotesSection;
