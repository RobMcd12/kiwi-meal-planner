import React, { useState, useEffect } from 'react';
import { HardDrive, Check, X, Loader2, FolderOpen, RefreshCw, ExternalLink, AlertCircle, Cloud } from 'lucide-react';
import { getGoogleDriveConfig, disconnectGoogleDrive } from '../../services/recipeVideoService';
import { initiateGoogleDriveAuth, isGoogleDriveClientConfigured, listDriveFolders, createDriveFolder } from '../../services/googleDriveService';
import type { GoogleDriveConfig } from '../../types';

interface GoogleDriveSetupProps {
  onConfigChange?: () => void;
}

const GoogleDriveSetup: React.FC<GoogleDriveSetupProps> = ({ onConfigChange }) => {
  const [config, setConfig] = useState<GoogleDriveConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [folders, setFolders] = useState<{ id: string; name: string }[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    const driveConfig = await getGoogleDriveConfig();
    setConfig(driveConfig);
    setIsLoading(false);
  };

  const handleConnect = () => {
    if (!isGoogleDriveClientConfigured()) {
      alert('Google Drive Client ID is not configured. Please add VITE_GOOGLE_DRIVE_CLIENT_ID to your environment variables.');
      return;
    }
    initiateGoogleDriveAuth();
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to disconnect Google Drive? Existing videos will not be deleted.')) {
      return;
    }

    setIsDisconnecting(true);
    const success = await disconnectGoogleDrive();
    if (success) {
      setConfig({ isConfigured: false });
      onConfigChange?.();
    }
    setIsDisconnecting(false);
  };

  const handleOpenFolderPicker = async () => {
    setShowFolderPicker(true);
    setLoadingFolders(true);
    const drivefolders = await listDriveFolders();
    setFolders(drivefolders);
    setLoadingFolders(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    setCreatingFolder(true);
    const folder = await createDriveFolder(newFolderName.trim());
    if (folder) {
      setFolders([...folders, folder]);
      setNewFolderName('');
      // Could auto-select the new folder here
    }
    setCreatingFolder(false);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  const isClientConfigured = isGoogleDriveClientConfigured();

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-100">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
          <HardDrive className="text-blue-600" size={20} />
        </div>
        <div>
          <h3 className="font-semibold text-slate-800">Google Drive Storage</h3>
          <p className="text-sm text-slate-500">Store generated videos in your Google Drive</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {!isClientConfigured ? (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Configuration Required</p>
                <p className="text-sm text-amber-700 mt-1">
                  Google Drive integration requires OAuth credentials. Add <code className="bg-amber-100 px-1 rounded">VITE_GOOGLE_DRIVE_CLIENT_ID</code> to your environment variables.
                </p>
              </div>
            </div>
          </div>
        ) : config?.isConfigured ? (
          <>
            {/* Connected state */}
            <div className="flex items-center gap-2 text-emerald-600 mb-4">
              <Check size={18} />
              <span className="font-medium">Connected to Google Drive</span>
            </div>

            <div className="space-y-3">
              {/* Folder info */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FolderOpen size={18} className="text-slate-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {config.driveFolderName || 'No folder selected'}
                    </p>
                    {config.configuredAt && (
                      <p className="text-xs text-slate-500">
                        Connected {new Date(config.configuredAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleOpenFolderPicker}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Change Folder
                </button>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="flex items-center gap-2 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  {isDisconnecting ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <X size={14} />
                  )}
                  Disconnect
                </button>
                <button
                  onClick={loadConfig}
                  className="flex items-center gap-2 px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <RefreshCw size={14} />
                  Refresh
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Not connected state */}
            <div className="text-center py-6">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Cloud size={32} className="text-slate-400" />
              </div>
              <p className="text-slate-600 mb-4">
                Connect your Google Drive to store recipe videos in the cloud.
              </p>
              <button
                onClick={handleConnect}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors mx-auto"
              >
                <HardDrive size={18} />
                Connect Google Drive
              </button>
              <p className="text-xs text-slate-400 mt-3">
                You'll be redirected to Google to authorize access.
              </p>
            </div>
          </>
        )}

        {/* Supabase fallback note */}
        <div className="mt-4 p-3 bg-slate-50 rounded-lg">
          <div className="flex items-start gap-2">
            <Cloud size={16} className="text-slate-400 mt-0.5" />
            <div>
              <p className="text-sm text-slate-600">
                <strong>Tip:</strong> Videos can also be stored in Supabase Storage if Google Drive is not connected.
                Select storage location when generating each video.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Folder picker modal */}
      {showFolderPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFolderPicker(false)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[70vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">Select Folder</h3>
              <button
                onClick={() => setShowFolderPicker(false)}
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingFolders ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : (
                <div className="space-y-2">
                  {folders.map(folder => (
                    <button
                      key={folder.id}
                      className="w-full flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors text-left"
                    >
                      <FolderOpen size={18} className="text-amber-500" />
                      <span className="font-medium text-slate-700">{folder.name}</span>
                    </button>
                  ))}

                  {/* Create new folder */}
                  <div className="pt-4 border-t border-slate-200">
                    <p className="text-sm text-slate-500 mb-2">Create new folder:</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        placeholder="Folder name..."
                        className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                      <button
                        onClick={handleCreateFolder}
                        disabled={!newFolderName.trim() || creatingFolder}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creatingFolder ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          'Create'
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoogleDriveSetup;
