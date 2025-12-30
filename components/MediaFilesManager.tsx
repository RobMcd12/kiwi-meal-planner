import React, { useState, useEffect } from 'react';
import {
  Video,
  Mic,
  Trash2,
  Loader2,
  AlertCircle,
  Clock,
  FileText,
  RefreshCw
} from 'lucide-react';
import { getUserMediaUploads, deleteMediaUpload, getDaysUntilExpiry, formatFileSize } from '../services/mediaUploadService';
import type { MediaUpload } from '../types';

interface MediaFilesManagerProps {
  onRefresh?: () => void;
}

const MediaFilesManager: React.FC<MediaFilesManagerProps> = ({ onRefresh }) => {
  const [uploads, setUploads] = useState<MediaUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUploads();
  }, []);

  const loadUploads = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getUserMediaUploads();
      setUploads(data);
    } catch (err) {
      console.error('Error loading uploads:', err);
      setError('Failed to load media files');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this file?')) return;

    setDeletingId(id);
    try {
      const success = await deleteMediaUpload(id);
      if (success) {
        setUploads(prev => prev.filter(u => u.id !== id));
        onRefresh?.();
      } else {
        setError('Failed to delete file');
      }
    } catch (err) {
      console.error('Error deleting upload:', err);
      setError('Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">Pending</span>;
      case 'processing':
        return <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">Processing</span>;
      case 'complete':
        return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full">Complete</span>;
      case 'failed':
        return <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-full">Failed</span>;
      default:
        return null;
    }
  };

  const getExpiryColor = (daysLeft: number): string => {
    if (daysLeft <= 1) return 'text-red-600';
    if (daysLeft <= 3) return 'text-amber-600';
    return 'text-slate-500';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 size={24} className="animate-spin text-emerald-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
        <div>
          <p className="text-red-800 font-medium">Error loading media files</p>
          <p className="text-red-700 text-sm">{error}</p>
          <button
            onClick={loadUploads}
            className="mt-2 text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
          >
            <RefreshCw size={14} />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (uploads.length === 0) {
    return (
      <div className="text-center py-8 bg-slate-50 rounded-xl">
        <FileText size={48} className="mx-auto text-slate-300 mb-3" />
        <p className="text-slate-500 mb-1">No uploaded media files</p>
        <p className="text-sm text-slate-400">
          Video and audio files from pantry scanning will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2">
        <Clock size={16} className="text-blue-500 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-700">
          Media files are automatically deleted after 10 days. Your pantry items are saved permanently.
        </p>
      </div>

      {/* File list */}
      <div className="space-y-2">
        {uploads.map((upload) => {
          const daysLeft = getDaysUntilExpiry(upload.expiresAt);
          const expiryColor = getExpiryColor(daysLeft);

          return (
            <div
              key={upload.id}
              className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4"
            >
              {/* Icon */}
              <div className={`p-2 rounded-lg ${
                upload.mediaType === 'video' ? 'bg-red-100' : 'bg-orange-100'
              }`}>
                {upload.mediaType === 'video' ? (
                  <Video size={20} className="text-red-600" />
                ) : (
                  <Mic size={20} className="text-orange-600" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-slate-800 truncate">
                    {upload.originalFilename}
                  </h4>
                  {getStatusBadge(upload.processingStatus)}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm">
                  <span className="text-slate-500">
                    {formatFileSize(upload.fileSizeBytes)}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className={expiryColor}>
                    {daysLeft === 0 ? (
                      'Expires today'
                    ) : daysLeft === 1 ? (
                      'Expires tomorrow'
                    ) : (
                      `Expires in ${daysLeft} days`
                    )}
                  </span>
                </div>
                {upload.processedItems && upload.processedItems.items.length > 0 && (
                  <p className="text-xs text-slate-400 mt-1">
                    {upload.processedItems.items.length} items detected
                  </p>
                )}
                {upload.errorMessage && (
                  <p className="text-xs text-red-500 mt-1">
                    {upload.errorMessage}
                  </p>
                )}
              </div>

              {/* Delete button */}
              <button
                onClick={() => handleDelete(upload.id)}
                disabled={deletingId === upload.id}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                title="Delete file"
              >
                {deletingId === upload.id ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Trash2 size={18} />
                )}
              </button>
            </div>
          );
        })}
      </div>

      {/* Refresh button */}
      <button
        onClick={loadUploads}
        className="text-sm text-emerald-600 hover:text-emerald-700 font-medium flex items-center gap-1"
      >
        <RefreshCw size={14} />
        Refresh
      </button>
    </div>
  );
};

export default MediaFilesManager;
