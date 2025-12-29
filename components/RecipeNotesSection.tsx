import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, Trash2, Globe, Lock, Loader2, User } from 'lucide-react';
import { RecipeNote } from '../types';
import { getRecipeNotes, saveRecipeNote, deleteRecipeNote } from '../services/recipeService';

interface RecipeNotesSectionProps {
  mealId: string;
  isPublicRecipe?: boolean;
  canEdit?: boolean;
}

const RecipeNotesSection: React.FC<RecipeNotesSectionProps> = ({
  mealId,
  isPublicRecipe = false,
  canEdit = true
}) => {
  const [notes, setNotes] = useState<RecipeNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  useEffect(() => {
    loadNotes();
  }, [mealId]);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const fetchedNotes = await getRecipeNotes(mealId);
      setNotes(fetchedNotes);
    } catch (err) {
      console.error('Error loading notes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveNote = async () => {
    if (!newNote.trim()) return;

    setIsSaving(true);
    try {
      const savedNote = await saveRecipeNote(mealId, newNote.trim(), isPublic);
      if (savedNote) {
        // Check if updating existing or adding new
        const existingIndex = notes.findIndex(n => n.isOwn);
        if (existingIndex >= 0) {
          setNotes(prev => prev.map((n, i) => i === existingIndex ? { ...savedNote, isOwn: true } : n));
        } else {
          setNotes(prev => [{ ...savedNote, isOwn: true }, ...prev]);
        }
        setNewNote('');
        setIsPublic(false);
        setEditingNoteId(null);
      }
    } catch (err) {
      console.error('Error saving note:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm('Delete this note?')) return;

    try {
      const success = await deleteRecipeNote(noteId);
      if (success) {
        setNotes(prev => prev.filter(n => n.id !== noteId));
      }
    } catch (err) {
      console.error('Error deleting note:', err);
    }
  };

  const handleEditNote = (note: RecipeNote) => {
    setNewNote(note.noteText);
    setIsPublic(note.isPublic);
    setEditingNoteId(note.id);
  };

  const handleCancelEdit = () => {
    setNewNote('');
    setIsPublic(false);
    setEditingNoteId(null);
  };

  // Separate own notes from others' public notes
  const ownNote = notes.find(n => n.isOwn);
  const otherNotes = notes.filter(n => !n.isOwn);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-slate-700">
        <MessageSquare size={18} />
        <h3 className="font-semibold">Notes</h3>
      </div>

      {/* Add/Edit Note Form */}
      {canEdit && (
        <div className="space-y-3">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Add a personal note about this recipe..."
            className="w-full px-4 py-3 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
            rows={3}
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                disabled={!isPublicRecipe}
              />
              <span className="text-sm text-slate-600 flex items-center gap-1">
                {isPublic ? <Globe size={14} /> : <Lock size={14} />}
                {isPublic ? 'Share publicly' : 'Private note'}
              </span>
              {!isPublicRecipe && (
                <span className="text-xs text-slate-400">(Recipe must be public to share notes)</span>
              )}
            </label>

            <div className="flex gap-2">
              {editingNoteId && (
                <button
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
              <button
                onClick={handleSaveNote}
                disabled={!newNote.trim() || isSaving}
                className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                {editingNoteId ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Own Note */}
      {ownNote && !editingNoteId && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Your Note
                </span>
                {ownNote.isPublic ? (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Globe size={12} />
                    Public
                  </span>
                ) : (
                  <span className="text-xs text-slate-500 flex items-center gap-1">
                    <Lock size={12} />
                    Private
                  </span>
                )}
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{ownNote.noteText}</p>
              <p className="text-xs text-slate-400 mt-2">
                {new Date(ownNote.updatedAt || ownNote.createdAt).toLocaleDateString()}
              </p>
            </div>

            {canEdit && (
              <div className="flex gap-1">
                <button
                  onClick={() => handleEditNote(ownNote)}
                  className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                  title="Edit"
                >
                  <MessageSquare size={14} />
                </button>
                <button
                  onClick={() => handleDeleteNote(ownNote.id)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Other Users' Public Notes */}
      {otherNotes.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-600">
            Community Notes ({otherNotes.length})
          </h4>
          {otherNotes.map(note => (
            <div
              key={note.id}
              className="bg-slate-50 border border-slate-200 rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center">
                  <User size={12} className="text-slate-500" />
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {note.userName || 'Anonymous'}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(note.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{note.noteText}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {notes.length === 0 && !canEdit && (
        <p className="text-sm text-slate-500 text-center py-4">
          No notes yet for this recipe.
        </p>
      )}
    </div>
  );
};

export default RecipeNotesSection;
