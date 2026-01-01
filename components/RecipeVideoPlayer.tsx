import React, { useState, useEffect } from 'react';
import { Play, Lock, Crown, Loader2, Video, RefreshCw, Trash2, AlertCircle, ExternalLink } from 'lucide-react';
import type { RecipeVideo } from '../types';
import { getVideoSignedUrl, formatVideoDuration, formatVideoFileSize } from '../services/recipeVideoService';

interface RecipeVideoPlayerProps {
  video: RecipeVideo | null;
  hasPro: boolean;
  onUpgradeClick?: () => void;
  isAdmin?: boolean;
  onRegenerate?: () => void;
  onDelete?: () => void;
  compact?: boolean;
}

const RecipeVideoPlayer: React.FC<RecipeVideoPlayerProps> = ({
  video,
  hasPro,
  onUpgradeClick,
  isAdmin,
  onRegenerate,
  onDelete,
  compact = false,
}) => {
  const [playableUrl, setPlayableUrl] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Load playable URL for Supabase videos
  useEffect(() => {
    const loadPlayableUrl = async () => {
      if (!video || video.processingStatus !== 'complete') return;

      if (video.storageType === 'supabase' && video.supabaseStoragePath) {
        setIsLoadingUrl(true);
        const url = await getVideoSignedUrl(video.supabaseStoragePath);
        setPlayableUrl(url);
        setIsLoadingUrl(false);
      } else if (video.videoUrl) {
        setPlayableUrl(video.videoUrl);
      } else if (video.googleDriveUrl) {
        setPlayableUrl(video.googleDriveUrl);
      }
    };

    loadPlayableUrl();
  }, [video]);

  if (!video) return null;

  // Show processing state
  if (video.processingStatus !== 'complete') {
    return (
      <div className={`bg-slate-100 rounded-xl flex flex-col items-center justify-center ${compact ? 'p-4' : 'p-8'}`}>
        {video.processingStatus === 'failed' ? (
          <>
            <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
            <p className="text-sm font-medium text-red-600 mb-1">Video generation failed</p>
            <p className="text-xs text-slate-500 text-center max-w-xs">
              {video.errorMessage || 'An unknown error occurred'}
            </p>
            {isAdmin && onRegenerate && (
              <button
                onClick={onRegenerate}
                className="mt-3 flex items-center gap-2 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-medium transition-colors"
              >
                <RefreshCw size={14} />
                Retry
              </button>
            )}
          </>
        ) : (
          <>
            <Loader2 className={`animate-spin text-slate-400 mb-2 ${compact ? 'w-6 h-6' : 'w-8 h-8'}`} />
            <p className="text-sm text-slate-500">
              {video.processingStatus === 'pending' && 'Waiting to start...'}
              {video.processingStatus === 'generating' && 'AI is creating your video...'}
              {video.processingStatus === 'uploading' && 'Uploading video...'}
            </p>
            <p className="text-xs text-slate-400 mt-1">This may take a few minutes</p>
          </>
        )}
      </div>
    );
  }

  // Pro feature gating - show thumbnail with lock for free users
  if (!hasPro && !isAdmin) {
    return (
      <div className={`relative overflow-hidden rounded-xl bg-slate-900 ${compact ? 'aspect-video' : 'aspect-video'}`}>
        {/* Thumbnail or placeholder */}
        {video.thumbnailUrl ? (
          <img
            src={video.thumbnailUrl}
            alt="Video thumbnail"
            className="w-full h-full object-cover opacity-50"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <Video size={48} className="text-slate-600" />
          </div>
        )}

        {/* Lock overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-16 h-16 bg-black/50 rounded-full flex items-center justify-center mb-3">
            <Lock size={28} className="text-white" />
          </div>
          <p className="text-white font-medium mb-1">Pro Feature</p>
          <p className="text-slate-300 text-sm mb-3">Upgrade to watch recipe videos</p>
          <button
            onClick={onUpgradeClick}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all"
          >
            <Crown size={16} />
            Upgrade to Pro
          </button>
        </div>

        {/* Video info */}
        <div className="absolute bottom-2 left-2 flex items-center gap-2">
          {video.durationSeconds && (
            <span className="px-2 py-0.5 bg-black/60 text-white text-xs rounded">
              {formatVideoDuration(video.durationSeconds)}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Pro users and admins can play the video
  return (
    <div className="relative">
      <div className={`rounded-xl overflow-hidden bg-black ${compact ? 'aspect-video' : 'aspect-video'}`}>
        {isLoadingUrl ? (
          <div className="w-full h-full flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : playableUrl ? (
          video.storageType === 'google_drive' && video.googleDriveFileId ? (
            // Google Drive embed
            <iframe
              src={`https://drive.google.com/file/d/${video.googleDriveFileId}/preview`}
              className="w-full h-full"
              allow="autoplay"
              allowFullScreen
            />
          ) : (
            // HTML5 video player for Supabase storage
            <video
              src={playableUrl}
              controls
              className="w-full h-full"
              poster={video.thumbnailUrl}
            >
              Your browser does not support the video tag.
            </video>
          )
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <AlertCircle size={32} className="mb-2" />
            <p className="text-sm">Video unavailable</p>
          </div>
        )}
      </div>

      {/* Pro badge */}
      <div className="absolute top-2 right-2">
        <span className="flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold rounded-full shadow-lg">
          <Crown size={12} />
          PRO
        </span>
      </div>

      {/* Video info bar */}
      <div className="flex items-center justify-between mt-2 px-1">
        <div className="flex items-center gap-3 text-xs text-slate-500">
          {video.durationSeconds && (
            <span>{formatVideoDuration(video.durationSeconds)}</span>
          )}
          {video.fileSizeBytes && (
            <span>{formatVideoFileSize(video.fileSizeBytes)}</span>
          )}
          <span className="capitalize">
            {video.storageType === 'google_drive' ? 'Google Drive' : 'Cloud Storage'}
          </span>
        </div>

        {/* Admin controls */}
        {isAdmin && (
          <div className="flex items-center gap-1">
            {video.storageType === 'google_drive' && video.googleDriveUrl && (
              <a
                href={video.googleDriveUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                title="Open in Google Drive"
              >
                <ExternalLink size={14} />
              </a>
            )}
            <button
              onClick={onRegenerate}
              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
              title="Regenerate video"
            >
              <RefreshCw size={14} />
            </button>
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
              title="Delete video"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {showConfirmDelete && (
        <div className="absolute inset-0 bg-black/80 rounded-xl flex items-center justify-center">
          <div className="bg-white rounded-lg p-4 max-w-xs text-center">
            <Trash2 className="w-8 h-8 text-red-500 mx-auto mb-2" />
            <p className="font-medium text-slate-800 mb-1">Delete this video?</p>
            <p className="text-sm text-slate-500 mb-4">This action cannot be undone.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirmDelete(false)}
                className="flex-1 px-3 py-1.5 border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowConfirmDelete(false);
                  onDelete?.();
                }}
                className="flex-1 px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecipeVideoPlayer;
