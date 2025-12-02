import React, { useState } from 'react';
import { mediaService } from '../apiServices';
import BackgroundRemovalModal from './BackgroundRemovalModal';

interface BatchBackgroundRemovalProps {
  files: File[];
  projectId: string;
  sceneId?: string;
  onClose: () => void;
  onComplete: (results: Array<{ file: File; url: string }>) => void;
}

const BatchBackgroundRemoval: React.FC<BatchBackgroundRemovalProps> = ({
  files,
  projectId,
  sceneId,
  onClose,
  onComplete
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [processedResults, setProcessedResults] = useState<Array<{ file: File; url: string }>>([]);
  const [processing, setProcessing] = useState(false);

  const currentFile = files[currentIndex];
  const isLast = currentIndex === files.length - 1;

  const handleFileConfirm = async (processedFile: File, processedUrl: string) => {
    setProcessedResults(prev => [...prev, { file: processedFile, url: processedUrl }]);
    
    if (isLast) {
      // All files processed
      onComplete(processedResults.concat([{ file: processedFile, url: processedUrl }]));
      onClose();
    } else {
      // Move to next file
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleSkip = () => {
    if (isLast) {
      onComplete(processedResults);
      onClose();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handleProcessAll = async () => {
    setProcessing(true);
    try {
      const results: Array<{ file: File; url: string }> = [];
      
      for (let i = 0; i < files.length; i++) {
        try {
          const result = await mediaService.removeBackground(files[i]);
          if (result.success && result.processedPath) {
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            const processedUrl = result.imagekit_url || 
              `${API_BASE_URL.replace('/api', '')}${result.processedPath}`;
            
            const response = await fetch(processedUrl);
            const blob = await response.blob();
            const processedFile = new File([blob], files[i].name.replace(/\.[^/.]+$/, '_nobg.png'), { type: 'image/png' });
            
            results.push({ file: processedFile, url: processedUrl });
          }
        } catch (error: any) {
          console.error(`Failed to process file ${i + 1}:`, error);
          // Continue with next file
        }
      }
      
      onComplete(results);
      onClose();
    } catch (error: any) {
      alert('Batch processing failed: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  if (processing) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 text-center">
          <svg className="animate-spin h-8 w-8 text-amber-500 mx-auto mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647A7.962 7.962 0 0112 20a7.962 7.962 0 01-8-8H4z"></path>
          </svg>
          <p className="text-white">Processing {files.length} images...</p>
          <p className="text-sm text-zinc-400 mt-2">This may take a moment</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {currentFile && (
        <BackgroundRemovalModal
          file={currentFile}
          onClose={handleSkip}
          onConfirm={handleFileConfirm}
          projectId={projectId}
          sceneId={sceneId}
        />
      )}
      <div className="fixed bottom-4 right-4 bg-zinc-900 border border-zinc-700 rounded-lg p-4 shadow-lg z-40">
        <div className="flex items-center gap-3">
          <div className="text-sm text-zinc-300">
            Processing {currentIndex + 1} of {files.length}
          </div>
          <button
            onClick={handleProcessAll}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-500 rounded text-sm text-white"
          >
            Process All Automatically
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm text-zinc-300"
          >
            Cancel
          </button>
        </div>
      </div>
    </>
  );
};

export default BatchBackgroundRemoval;

