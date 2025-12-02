import React, { useState, useRef } from 'react';
import { mediaService } from '../apiServices';

interface BackgroundRemovalModalProps {
  file: File | null;
  onClose: () => void;
  onConfirm: (processedFile: File, processedUrl: string) => void;
  projectId?: string;
  sceneId?: string;
}

const BackgroundRemovalModal: React.FC<BackgroundRemovalModalProps> = ({
  file,
  onClose,
  onConfirm,
  projectId,
  sceneId
}) => {
  const [processing, setProcessing] = useState(false);
  const [originalPreview, setOriginalPreview] = useState<string | null>(null);
  const [processedPreview, setProcessedPreview] = useState<string | null>(null);
  const [processedFile, setProcessedFile] = useState<File | null>(null);
  const [sensitivity, setSensitivity] = useState(50); // 0-100, affects threshold
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  React.useEffect(() => {
    if (file) {
      // Show original preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, [file]);

  const handleProcess = async () => {
    if (!file) return;

    setProcessing(true);
    try {
      const result = await mediaService.removeBackground(file);
      
      if (result.success && result.processedPath) {
        // Fetch the processed image
        const processedUrl = result.imagekit_url || 
          `${API_BASE_URL.replace('/api', '')}${result.processedPath}`;
        
        // Fetch as blob to create File object
        const response = await fetch(processedUrl);
        const blob = await response.blob();
        const processedFileObj = new File([blob], file.name.replace(/\.[^/.]+$/, '_nobg.png'), { type: 'image/png' });
        
        setProcessedPreview(processedUrl);
        setProcessedFile(processedFileObj);
      } else {
        alert('Failed to process image');
      }
    } catch (error: any) {
      console.error('Background removal error:', error);
      alert('Failed to remove background: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleConfirm = () => {
    if (processedFile && processedPreview) {
      onConfirm(processedFile, processedPreview);
      onClose();
    }
  };

  if (!file) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900 z-10">
          <h2 className="text-xl font-bold text-white">Background Removal Preview</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Before/After Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Original */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Original</h3>
              <div className="relative w-full h-64 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
                {originalPreview && (
                  <img
                    src={originalPreview}
                    alt="Original"
                    className="w-full h-full object-contain"
                  />
                )}
              </div>
            </div>

            {/* Processed */}
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Processed</h3>
              <div className="relative w-full h-64 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
                {processing ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <svg className="animate-spin h-8 w-8 text-amber-500 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647A7.962 7.962 0 0112 20a7.962 7.962 0 01-8-8H4z"></path>
                      </svg>
                      <p className="text-sm text-zinc-400">Processing...</p>
                    </div>
                  </div>
                ) : processedPreview ? (
                  <img
                    src={processedPreview}
                    alt="Processed"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-500">
                    <div className="text-center">
                      <div className="text-4xl mb-2">🖼️</div>
                      <div className="text-sm">Click "Process" to remove background</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sensitivity Slider (Note: Currently for display only, backend doesn't support it yet) */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-semibold text-zinc-300">Sensitivity</label>
              <span className="text-xs text-zinc-400">(Coming soon - will adjust detection threshold)</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sensitivity}
              onChange={(e) => setSensitivity(parseInt(e.target.value))}
              disabled={true}
              className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-600 disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-zinc-500 mt-1">
              <span>Less sensitive</span>
              <span>More sensitive</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            {!processedPreview && (
              <button
                onClick={handleProcess}
                disabled={processing}
                className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>
                    <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647A7.962 7.962 0 0112 20a7.962 7.962 0 01-8-8H4z"></path>
                    </svg>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                    </svg>
                    <span>Process Image</span>
                  </>
                )}
              </button>
            )}
            {processedPreview && (
              <>
                <button
                  onClick={handleConfirm}
                  className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-medium transition-colors"
                >
                  Use This Image
                </button>
                <button
                  onClick={handleProcess}
                  disabled={processing}
                  className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 font-medium disabled:opacity-50 transition-colors"
                >
                  Re-process
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="px-4 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BackgroundRemovalModal;

