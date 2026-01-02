import React, { useState, useRef, useCallback } from 'react';
import { X, Upload, FileText, Image as ImageIcon, FileType, Loader2, CheckCircle, AlertCircle, Link, Camera, Plus, Trash2 } from 'lucide-react';
import { useUpload } from '../contexts/UploadContext';
import TagEditor from './TagEditor';
import ResponsiveTabs from './ResponsiveTabs';

interface RecipeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadComplete?: () => void;
}

type UploadMode = 'image' | 'text' | 'pdf' | 'url';

// Check if device is mobile
const isMobileDevice = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

const RecipeUploadModal: React.FC<RecipeUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadComplete
}) => {
  const { startUpload, uploads } = useUpload();
  const [mode, setMode] = useState<UploadMode>('image');
  const [textContent, setTextContent] = useState('');
  const [urlContent, setUrlContent] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]); // Multiple images for multi-page recipes
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStarted, setUploadStarted] = useState(false);
  const [urlError, setUrlError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const addMoreInputRef = useRef<HTMLInputElement>(null);
  const isMobile = isMobileDevice();

  // Get recent uploads to show status
  const recentUploads = uploads.slice(-3);

  const handleFileSelect = (file: File) => {
    const isImage = file.type.startsWith('image/');
    const isPDF = file.type === 'application/pdf';

    if (isImage) {
      setMode('image');
      setSelectedFile(file);
      // Also add to multi-image array
      setSelectedFiles([file]);
    } else if (isPDF) {
      setMode('pdf');
      setSelectedFile(file);
      setSelectedFiles([]);
    } else {
      alert('Please select an image (JPG, PNG, WebP) or PDF file.');
    }
  };

  // Handle multiple image selection for multi-page recipes
  const handleMultipleFiles = (files: FileList) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      alert('Please select image files (JPG, PNG, WebP).');
      return;
    }
    setMode('image');
    setSelectedFiles(prev => [...prev, ...imageFiles].slice(0, 5)); // Max 5 images
    setSelectedFile(imageFiles[0]); // Keep first for backwards compatibility
  };

  // Add more images to existing selection
  const handleAddMoreImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleMultipleFiles(e.target.files);
    }
  };

  // Remove a specific image from selection
  const removeImage = (index: number) => {
    setSelectedFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (newFiles.length === 0) {
        setSelectedFile(null);
      } else {
        setSelectedFile(newFiles[0]);
      }
      return newFiles;
    });
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

  const validateUrl = (url: string): boolean => {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleUpload = async () => {
    setIsUploading(true);
    setUploadStarted(true);
    setUrlError('');

    try {
      if (mode === 'url') {
        if (!urlContent.trim()) {
          setUrlError('Please enter a URL.');
          setIsUploading(false);
          return;
        }
        if (!validateUrl(urlContent.trim())) {
          setUrlError('Please enter a valid URL (starting with http:// or https://).');
          setIsUploading(false);
          return;
        }
        await startUpload(urlContent.trim(), 'url');
        setUrlContent('');
      } else if (mode === 'text') {
        if (!textContent.trim()) {
          alert('Please enter some recipe text.');
          setIsUploading(false);
          return;
        }
        await startUpload(textContent, 'text');
        setTextContent('');
      } else if (mode === 'image' && selectedFiles.length > 0) {
        // Use multiple files for multi-page recipe support
        await startUpload(selectedFiles, 'image');
        setSelectedFiles([]);
        setSelectedFile(null);
      } else if (selectedFile) {
        await startUpload(selectedFile, mode);
        setSelectedFile(null);
        setSelectedFiles([]);
      } else {
        alert('Please select a file.');
        setIsUploading(false);
        return;
      }

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
    setUrlContent('');
    setSelectedFile(null);
    setSelectedFiles([]);
    setUploadStarted(false);
    setUrlError('');
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
              Add a recipe from a URL, image, PDF, or text
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
          <ResponsiveTabs
            tabs={[
              { id: 'url', label: 'URL', icon: <Link size={16} /> },
              { id: 'image', label: 'Image', icon: <ImageIcon size={16} /> },
              { id: 'pdf', label: 'PDF', icon: <FileType size={16} /> },
              { id: 'text', label: 'Text', icon: <FileText size={16} /> },
            ]}
            activeTab={mode}
            onTabChange={(tabId) => {
              setMode(tabId as UploadMode);
              setSelectedFile(null);
              setUrlError('');
            }}
            variant="button-group"
            visibleCount={4}
          />
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* URL Input */}
          {mode === 'url' && (
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700">
                Recipe URL
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Link size={18} className="text-slate-400" />
                </div>
                <input
                  type="url"
                  value={urlContent}
                  onChange={(e) => { setUrlContent(e.target.value); setUrlError(''); }}
                  placeholder="https://www.example.com/recipe"
                  className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none ${
                    urlError ? 'border-red-300 bg-red-50' : 'border-slate-200'
                  }`}
                />
              </div>
              {urlError && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle size={14} />
                  {urlError}
                </p>
              )}
              <p className="text-xs text-slate-400">
                Paste a URL to any recipe page. AI will extract the recipe and ignore ads, navigation, and other content.
              </p>
            </div>
          )}

          {/* Image Upload with Camera & Multi-page support */}
          {mode === 'image' && (
            <div className="space-y-4">
              {/* Hidden file inputs */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={(e) => e.target.files && handleMultipleFiles(e.target.files)}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
              />
              <input
                ref={addMoreInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handleAddMoreImages}
                className="hidden"
              />

              {selectedFiles.length > 0 ? (
                <div className="space-y-4">
                  {/* Selected images grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Page ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute top-1 left-1 bg-slate-800/70 text-white text-xs px-1.5 py-0.5 rounded">
                          Page {index + 1}
                        </div>
                        <button
                          onClick={() => removeImage(index)}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}

                    {/* Add more button (up to 5 images) */}
                    {selectedFiles.length < 5 && (
                      <button
                        onClick={() => addMoreInputRef.current?.click()}
                        className="aspect-square rounded-lg border-2 border-dashed border-slate-300 hover:border-emerald-500 hover:bg-emerald-50 flex flex-col items-center justify-center gap-1 transition-colors"
                      >
                        <Plus size={24} className="text-slate-400" />
                        <span className="text-xs text-slate-500">Add page</span>
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 text-center">
                    {selectedFiles.length} image{selectedFiles.length !== 1 ? 's' : ''} selected for multi-page recipe
                  </p>

                  <button
                    onClick={() => { setSelectedFiles([]); setSelectedFile(null); }}
                    className="text-sm text-red-600 hover:text-red-700 mx-auto block"
                  >
                    Clear all
                  </button>
                </div>
              ) : (
                <div
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                    isDragging ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 hover:border-slate-300'
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                >
                  <div className="space-y-4">
                    <div className="w-16 h-16 mx-auto bg-slate-100 rounded-full flex items-center justify-center">
                      <ImageIcon size={32} className="text-slate-400" />
                    </div>

                    {/* Mobile: Show camera and gallery options */}
                    {isMobile ? (
                      <div className="space-y-3">
                        <p className="font-medium text-slate-800">
                          Photograph your recipe
                        </p>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => cameraInputRef.current?.click()}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors"
                          >
                            <Camera size={20} />
                            Take Photo
                          </button>
                          <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-medium transition-colors"
                          >
                            <ImageIcon size={20} />
                            Choose from Gallery
                          </button>
                        </div>
                        <p className="text-xs text-slate-400">
                          Take multiple photos for multi-page recipes (up to 5)
                        </p>
                      </div>
                    ) : (
                      /* Desktop: Show drag & drop */
                      <div className="space-y-3">
                        <p className="font-medium text-slate-800">
                          Drop your images here
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
                        <p className="text-xs text-slate-400">
                          JPG, PNG, or WebP up to 10MB. Select multiple for multi-page recipes.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* PDF Upload */}
          {mode === 'pdf' && (
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
                accept="application/pdf"
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
                      Drop your PDF here
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
                    PDF files up to 10MB
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
            disabled={isUploading || (mode === 'url' ? !urlContent.trim() : mode === 'text' ? !textContent.trim() : mode === 'image' ? selectedFiles.length === 0 : !selectedFile)}
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
