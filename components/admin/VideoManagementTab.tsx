import React, { useState, useEffect } from 'react';
import { Video, Search, RefreshCw, Trash2, Loader2, Check, X, Clock, AlertCircle, ExternalLink, Play, Filter, ChevronDown, Cloud, HardDrive } from 'lucide-react';
import { getAllRecipeVideos, deleteRecipeVideo, regenerateVideo } from '../../services/recipeVideoService';
import type { RecipeVideo, VideoProcessingStatus, VideoStorageType } from '../../types';

interface VideoManagementTabProps {
  onVideoCountChange?: (count: number) => void;
}

const VideoManagementTab: React.FC<VideoManagementTabProps> = ({ onVideoCountChange }) => {
  const [videos, setVideos] = useState<RecipeVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<VideoProcessingStatus | 'all'>('all');
  const [storageFilter, setStorageFilter] = useState<VideoStorageType | 'all'>('all');
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    setIsLoading(true);
    const allVideos = await getAllRecipeVideos();
    setVideos(allVideos);
    onVideoCountChange?.(allVideos.length);
    setIsLoading(false);
  };

  const handleRegenerate = async (video: RecipeVideo) => {
    setProcessingIds(prev => new Set(prev).add(video.id));
    const result = await regenerateVideo(video.id, video.storageType);
    if (result) {
      await loadVideos();
    }
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(video.id);
      return next;
    });
  };

  const handleDelete = async (videoId: string) => {
    setProcessingIds(prev => new Set(prev).add(videoId));
    const success = await deleteRecipeVideo(videoId);
    if (success) {
      setVideos(prev => prev.filter(v => v.id !== videoId));
      onVideoCountChange?.(videos.length - 1);
    }
    setProcessingIds(prev => {
      const next = new Set(prev);
      next.delete(videoId);
      return next;
    });
    setShowDeleteConfirm(null);
  };

  const getStatusIcon = (status: VideoProcessingStatus) => {
    switch (status) {
      case 'complete':
        return <Check size={14} className="text-emerald-500" />;
      case 'failed':
        return <X size={14} className="text-red-500" />;
      case 'pending':
        return <Clock size={14} className="text-amber-500" />;
      case 'generating':
      case 'uploading':
        return <Loader2 size={14} className="animate-spin text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusLabel = (status: VideoProcessingStatus) => {
    switch (status) {
      case 'complete':
        return 'Complete';
      case 'failed':
        return 'Failed';
      case 'pending':
        return 'Pending';
      case 'generating':
        return 'Generating...';
      case 'uploading':
        return 'Uploading...';
      default:
        return status;
    }
  };

  const getStatusBadgeClasses = (status: VideoProcessingStatus) => {
    switch (status) {
      case 'complete':
        return 'bg-emerald-100 text-emerald-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      case 'pending':
        return 'bg-amber-100 text-amber-700';
      case 'generating':
      case 'uploading':
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  const getStorageIcon = (storageType: VideoStorageType) => {
    return storageType === 'google_drive'
      ? <HardDrive size={14} className="text-blue-500" />
      : <Cloud size={14} className="text-purple-500" />;
  };

  // Filter videos
  const filteredVideos = videos.filter(video => {
    const matchesSearch = !searchQuery ||
      video.mealName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || video.processingStatus === statusFilter;
    const matchesStorage = storageFilter === 'all' || video.storageType === storageFilter;
    return matchesSearch && matchesStatus && matchesStorage;
  });

  // Stats
  const completeCount = videos.filter(v => v.processingStatus === 'complete').length;
  const failedCount = videos.filter(v => v.processingStatus === 'failed').length;
  const pendingCount = videos.filter(v => v.processingStatus === 'pending' || v.processingStatus === 'generating' || v.processingStatus === 'uploading').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-emerald-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{completeCount}</p>
          <p className="text-sm text-emerald-700">Complete</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-sm text-amber-700">Processing</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-red-600">{failedCount}</p>
          <p className="text-sm text-red-700">Failed</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by recipe name..."
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as VideoProcessingStatus | 'all')}
            className="appearance-none pl-4 pr-10 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
          >
            <option value="all">All Status</option>
            <option value="complete">Complete</option>
            <option value="pending">Pending</option>
            <option value="generating">Generating</option>
            <option value="uploading">Uploading</option>
            <option value="failed">Failed</option>
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Storage Filter */}
        <div className="relative">
          <select
            value={storageFilter}
            onChange={(e) => setStorageFilter(e.target.value as VideoStorageType | 'all')}
            className="appearance-none pl-4 pr-10 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none bg-white"
          >
            <option value="all">All Storage</option>
            <option value="google_drive">Google Drive</option>
            <option value="supabase">Supabase</option>
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Refresh Button */}
        <button
          onClick={loadVideos}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Video List */}
      {filteredVideos.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl">
          <Video size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-medium">No videos found</p>
          <p className="text-sm text-slate-400 mt-1">
            {videos.length === 0
              ? 'Generate your first recipe video from the cookbook'
              : 'Try adjusting your filters'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredVideos.map(video => (
            <div
              key={video.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-slate-300 transition-colors"
            >
              {/* Main Row */}
              <div
                className="flex items-center gap-4 p-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === video.id ? null : video.id)}
              >
                {/* Thumbnail */}
                <div className="w-16 h-12 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {video.thumbnailUrl ? (
                    <img
                      src={video.thumbnailUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Video size={20} className="text-slate-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {video.mealName || 'Unknown Recipe'}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClasses(video.processingStatus)}`}>
                      {getStatusIcon(video.processingStatus)}
                      {getStatusLabel(video.processingStatus)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      {getStorageIcon(video.storageType)}
                      {video.storageType === 'google_drive' ? 'Drive' : 'Cloud'}
                    </span>
                    {video.durationSeconds && (
                      <span className="text-xs text-slate-400">
                        {Math.floor(video.durationSeconds / 60)}:{(video.durationSeconds % 60).toString().padStart(2, '0')}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  {video.processingStatus === 'complete' && video.storageType === 'google_drive' && video.googleDriveUrl && (
                    <a
                      href={video.googleDriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Open in Google Drive"
                    >
                      <ExternalLink size={16} />
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRegenerate(video);
                    }}
                    disabled={processingIds.has(video.id)}
                    className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Regenerate video"
                  >
                    {processingIds.has(video.id) ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <RefreshCw size={16} />
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDeleteConfirm(video.id);
                    }}
                    disabled={processingIds.has(video.id)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                    title="Delete video"
                  >
                    <Trash2 size={16} />
                  </button>
                  <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform ${expandedId === video.id ? 'rotate-180' : ''}`}
                  />
                </div>
              </div>

              {/* Expanded Details */}
              {expandedId === video.id && (
                <div className="px-4 pb-4 pt-0 border-t border-slate-100">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Created</p>
                      <p className="text-slate-700">
                        {new Date(video.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Created By</p>
                      <p className="text-slate-700">{video.createdByName || 'Unknown'}</p>
                    </div>
                    {video.fileSizeBytes && (
                      <div>
                        <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">File Size</p>
                        <p className="text-slate-700">
                          {(video.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Storage</p>
                      <p className="text-slate-700 capitalize">
                        {video.storageType === 'google_drive' ? 'Google Drive' : 'Supabase Storage'}
                      </p>
                    </div>
                  </div>

                  {video.processingStatus === 'failed' && video.errorMessage && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <AlertCircle size={16} className="text-red-500 mt-0.5" />
                        <div>
                          <p className="font-medium text-red-700 text-sm">Generation Failed</p>
                          <p className="text-red-600 text-sm mt-1">{video.errorMessage}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {video.generationPrompt && (
                    <div className="mt-4">
                      <p className="text-slate-400 text-xs uppercase tracking-wide mb-1">Generation Prompt</p>
                      <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                        {video.generationPrompt}
                      </p>
                    </div>
                  )}

                  {video.instructionsUsed && video.instructionsUsed.length > 0 && (
                    <div className="mt-4">
                      <p className="text-slate-400 text-xs uppercase tracking-wide mb-2">Instructions Used</p>
                      <div className="flex flex-wrap gap-2">
                        {video.instructionsUsed.map(instruction => (
                          <span
                            key={instruction.id}
                            className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                          >
                            {instruction.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Delete Confirmation */}
              {showDeleteConfirm === video.id && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
                  <div className="bg-white rounded-xl p-6 max-w-sm mx-4 shadow-xl">
                    <div className="text-center">
                      <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-3" />
                      <h3 className="font-semibold text-slate-800 mb-2">Delete Video?</h3>
                      <p className="text-sm text-slate-500 mb-4">
                        This will permanently delete the video "{video.mealName}". This action cannot be undone.
                      </p>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleDelete(video.id)}
                          disabled={processingIds.has(video.id)}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {processingIds.has(video.id) ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            'Delete'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VideoManagementTab;
