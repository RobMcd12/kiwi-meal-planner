import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, Image as ImageIcon, FileType, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { useUpload } from '../contexts/UploadContext';
import TagEditor from './TagEditor';

interface RecipeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: () => void;
}

type UploadMode = 'image' | 'text' | 'pdf';

const RecipeUploadModal: React.FC<RecipeUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete
}) => {
  const { startUpload, uploads } = useUpload();
  const [mode, setMode] = useState<UploadMode>('image');
  const [textContent, setTextContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStarted, setUploadStarted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get recent uploads to show status
  const recentUploads = uploads.slice(-3);

  const handleFileSelect = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (isImage) {
      setMode('image');
      setSelectedFile(file);
    } else if (isPDF) {
      setMode('pdf');
      setSelectedFile(file);
    } else {
      alert('Please select an image (JPG, PNG, WebP) or PDF file.');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleUpload = async () => {
    setIsUploading(true);
    setUploadStarted(true);

    try {
      if (mode === 'text') {
        if (!textContent.trim()) {
          alert('Please enter some recipe text.');
          return;
        }
        await startUpload(textContent, 'text');
      } else if (selectedFile) {
        await startUpload(selectedFile, mode);
      } else {
        alert('Please select a file.');
        return;
      }

      // Reset form but keep modal open to show status
      setTextContent('');
      setSelectedFile(null);

      // Notify parent after short delay
      setTimeout(() => {
        onUploadComplete?.();
      }, 500);

    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setTextContent('');
    setSelectedFile(null);
    setUploadStarted(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-white rounded-2xl max-w-xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Upload Recipe</h2>
            <p className="text-sm text-slate-500 mt-1">
              Add a recipe from an image, PDF, or text
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Mode Selector */}
        <div className="px-6 pt-4">
          <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => { setMode('image'); setSelectedFile(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                mode === 'image' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <ImageIcon size={16} />
              Image
            </button>
            <button
              onClick={() => { setMode('pdf'); setSelectedFile(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                mode === 'pdf' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileType size={16} />
              PDF
            </button>
            <button
              onClick={() => { setMode('text'); setSelectedFile(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${
                mode === 'text' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <FileText size={16} />
              Text
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Image/PDF Upload */}
          {(mode === 'image' || mode === 'pdf') && (
            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50'
                  : selectedFile
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-slate-200 hover:border-slate-300'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept={mode === 'image' ? 'image/jpeg,image/png,image/webp' : 'application/pdf'}
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />

              {selectedFile ? (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto bg-emerald-100 rounded-full flex items-center justify-center">
                    <CheckCircle size={32} className="text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{selectedFile.name}</p>
                    <p className="text-sm text-slate-500">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
                    <Upload size={32} className="text-slate-400" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">
                      Drop your {mode === 'image' ? 'image' : 'PDF'} here
                    </p>
                    <p className="text-sm text-slate-500">
                      or{' '}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        browse files
                      </button>
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">
                    {mode === 'image' ? 'JPG, PNG, or WebP' : 'PDF files'} up to 10MB
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Text Input */}
          {mode === 'text' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Paste Recipe Text
              </label>
              <textarea
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="Paste the full recipe text here, including ingredients and instructions. Our AI will extract and format it for you."
                className="w-full h-64 px-4 py-3 border border-slate-200 rounded-xl resize-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
              <p className="text-xs text-slate-400">
                Tip: Include the recipe name, ingredients list, and cooking instructions for best results.
              </p>
            </div>
          )}

          {/* Processing Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <div className="text-blue-600 mt-0.5">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-blue-800">Background Processing</p>
                <p className="text-xs text-blue-600 mt-1">
                  AI will extract the recipe details and auto-generate tags. You can navigate away while this processes - we'll notify you when it's done.
                </p>
              </div>
            </div>
          </div>

          {/* Recent Upload Status */}
          {uploadStarted && recentUploads.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-700">Recent Uploads</h4>
              {recentUploads.map(upload => (
                <div
                  key={upload.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    upload.status === 'complete' ? 'bg-emerald-50' :
                    upload.status === 'failed' ? 'bg-red-50' :
                    'bg-slate-50'
                  }`}
                >
                  {upload.status === 'pending' || upload.status === 'processing' ? (
                    <Loader2 size={16} className="animate-spin text-emerald-600" />
                  ) : upload.status === 'complete' ? (
                    <CheckCircle size={16} className="text-emerald-600" />
                  ) : (
                    <AlertCircle size={16} className="text-red-600" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {upload.result?.name || upload.fileName}
                    </p>
                    <p className="text-xs text-slate-500">
                      {upload.status === 'pending' && 'Waiting to process...'}
                      {upload.status === 'processing' && 'Extracting recipe with AI...'}
                      {upload.status === 'complete' && 'Successfully added to cookbook!'}
                      {upload.status === 'failed' && (upload.error || 'Failed to process')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors"
          >
            {uploadStarted ? 'Close' : 'Cancel'}
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || (mode === 'text' ? !textContent.trim() : !selectedFile)}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isUploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload size={18} />
                Upload Recipe
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecipeUploadModal;
