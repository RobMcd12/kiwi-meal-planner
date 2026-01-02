import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { UploadTask, Meal, ExtractedRecipe } from '../types';
import { extractRecipeFromImage, extractRecipeFromText, extractRecipeFromPDF, extractRecipeFromURL, autoTagRecipe } from '../services/geminiService';
import { createPlaceholderRecipe, updateRecipeFromExtraction, updateRecipeStatus } from '../services/recipeService';
import { useToast } from '../hooks/useToast';

interface UploadContextType {
  uploads: UploadTask[];
  startUpload: (file: File | File[] | string, type: 'image' | 'text' | 'pdf' | 'url') => Promise<string | null>;
  getUploadStatus: (id: string) => UploadTask | undefined;
  clearCompletedUploads: () => void;
  hasActiveUploads: boolean;
}

const UploadContext = createContext<UploadContextType>({
  uploads: [],
  startUpload: async () => null,
  getUploadStatus: () => undefined,
  clearCompletedUploads: () => {},
  hasActiveUploads: false,
});

interface UploadProviderProps {
  children: ReactNode;
}

/**
 * Convert a File to base64 string
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const UploadProvider: React.FC<UploadProviderProps> = ({ children }) => {
  const [uploads, setUploads] = useState<UploadTask[]>([]);
  const { success, error: showError } = useToast();

  /**
   * Update the status of an upload task
   */
  const updateUploadTaskStatus = useCallback((
    taskId: string,
    status: UploadTask['status'],
    result?: Meal,
    errorMsg?: string
  ) => {
    setUploads(prev => prev.map(upload =>
      upload.id === taskId
        ? { ...upload, status, result, error: errorMsg }
        : upload
    ));
  }, []);

  /**
   * Process an upload asynchronously (runs in background)
   */
  const processUploadAsync = useCallback(async (
    taskId: string,
    content: File | File[] | string,
    type: 'image' | 'text' | 'pdf' | 'url',
    placeholderId: string
  ) => {
    updateUploadTaskStatus(taskId, 'processing');
    await updateRecipeStatus(placeholderId, 'processing');

    try {
      let extracted: ExtractedRecipe;

      if (type === 'url') {
        // URL passed directly - fetch and extract recipe from webpage
        extracted = await extractRecipeFromURL(content as string);
      } else if (type === 'text') {
        // Text content passed directly
        extracted = await extractRecipeFromText(content as string);
      } else if (type === 'pdf') {
        // PDF file
        const file = content as File;
        const base64 = await fileToBase64(file);
        extracted = await extractRecipeFromPDF(base64);
      } else if (type === 'image' && Array.isArray(content)) {
        // Multiple images for multi-page recipe
        const images = await Promise.all(
          (content as File[]).map(async (file) => ({
            base64: await fileToBase64(file),
            mimeType: file.type
          }))
        );
        extracted = await extractRecipeFromImage(images);
      } else {
        // Single image file (backwards compatibility)
        const file = content as File;
        const base64 = await fileToBase64(file);
        extracted = await extractRecipeFromImage([{ base64, mimeType: file.type }]);
      }

      // Auto-tag the extracted recipe
      const tagResult = await autoTagRecipe({
        name: extracted.name,
        description: extracted.description,
        ingredients: extracted.ingredients
      });

      // Combine AI-generated tags with suggested tags from extraction
      const allTags = [...new Set([
        ...tagResult.tags,
        ...(extracted.suggestedTags || [])
      ])];

      // Update the recipe in database
      const updateSuccess = await updateRecipeFromExtraction(
        placeholderId,
        extracted,
        allTags
      );

      if (!updateSuccess) {
        throw new Error('Failed to save extracted recipe');
      }

      // Create the result meal object
      const resultMeal: Meal = {
        id: placeholderId,
        name: extracted.name,
        description: extracted.description,
        ingredients: extracted.ingredients,
        instructions: extracted.instructions,
        source: 'uploaded',
        uploadStatus: 'complete',
        tags: allTags,
        isFavorite: true
      };

      updateUploadTaskStatus(taskId, 'complete', resultMeal);
      success(`Recipe "${extracted.name}" extracted successfully!`);

    } catch (err: any) {
      console.error('Upload processing error:', err);
      await updateRecipeStatus(placeholderId, 'failed');
      updateUploadTaskStatus(taskId, 'failed', undefined, err.message || 'Failed to process recipe');
      showError('Failed to extract recipe. Please try again.');
    }
  }, [updateUploadTaskStatus, success, showError]);

  /**
   * Start a new upload
   * Returns the task ID or null if failed
   */
  const startUpload = useCallback(async (
    content: File | File[] | string,
    type: 'image' | 'text' | 'pdf' | 'url'
  ): Promise<string | null> => {
    const taskId = crypto.randomUUID();
    let fileName: string;

    if (type === 'text') {
      fileName = 'Pasted Text';
    } else if (type === 'url') {
      fileName = `Recipe from ${new URL(content as string).hostname}`;
    } else if (Array.isArray(content)) {
      // Multiple images - use first file name or indicate multi-page
      fileName = content.length > 1
        ? `Multi-page Recipe (${content.length} images)`
        : content[0].name;
    } else {
      fileName = (content as File).name;
    }

    // Add to uploads state immediately
    setUploads(prev => [...prev, {
      id: taskId,
      fileName,
      status: 'pending',
      progress: 0
    }]);

    // Create placeholder in database
    const placeholderId = await createPlaceholderRecipe(fileName);
    if (!placeholderId) {
      updateUploadTaskStatus(taskId, 'failed', undefined, 'Failed to create recipe placeholder');
      showError('Failed to start upload. Please try again.');
      return null;
    }

    // Start async processing (non-blocking)
    // This allows the user to navigate away while processing continues
    processUploadAsync(taskId, content, type, placeholderId);

    success('Processing recipe in background. You can navigate away.');
    return taskId;
  }, [processUploadAsync, updateUploadTaskStatus, success, showError]);

  /**
   * Get status of a specific upload
   */
  const getUploadStatus = useCallback((id: string): UploadTask | undefined => {
    return uploads.find(u => u.id === id);
  }, [uploads]);

  /**
   * Clear completed and failed uploads from the list
   */
  const clearCompletedUploads = useCallback(() => {
    setUploads(prev => prev.filter(u => u.status === 'pending' || u.status === 'processing'));
  }, []);

  const hasActiveUploads = uploads.some(u => u.status === 'pending' || u.status === 'processing');

  const value: UploadContextType = {
    uploads,
    startUpload,
    getUploadStatus,
    clearCompletedUploads,
    hasActiveUploads,
  };

  return (
    <UploadContext.Provider value={value}>
      {children}
    </UploadContext.Provider>
  );
};

/**
 * Hook to access upload context
 */
export const useUpload = (): UploadContextType => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within an UploadProvider');
  }
  return context;
};

export default UploadProvider;
