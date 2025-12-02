import React, { useState, useRef } from 'react';
import { projectsService } from '../apiServices';

interface CoverImageManagerProps {
  projectId: string;
  currentCoverUrl?: string | null;
  onClose: () => void;
  onUpdate: () => void;
}

const CoverImageManager: React.FC<CoverImageManagerProps> = ({
  projectId,
  currentCoverUrl,
  onClose,
  onUpdate
}) => {
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [generatedPreview, setGeneratedPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Show preview only, don't upload yet
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
      setSelectedFile(file);
    };
    reader.readAsDataURL(file);
  };

  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', selectedFile);

      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/cover-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload cover image');
      }

      const result = await response.json();
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Upload error:', error);
      alert('Failed to upload cover image: ' + error.message);
    } finally {
      setUploading(false);
      setSelectedFile(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleCancelPreview = () => {
    setPreview(null);
    setSelectedFile(null);
    setGeneratedPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenerateFromCharacters = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/generate-cover`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate cover image');
      }

      const result = await response.json();
      // Show preview of generated image
      if (result.cover_imagekit_url || result.cover_image_url) {
        const previewUrl = result.cover_imagekit_url || 
          `${API_BASE_URL.replace('/api', '')}${result.cover_image_url}`;
        setGeneratedPreview(previewUrl);
        setPreview(previewUrl);
      } else {
        // If no preview URL, just update and close
        onUpdate();
        onClose();
      }
    } catch (error: any) {
      console.error('Generate error:', error);
      alert('Failed to generate cover image: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleConfirmGenerated = async () => {
    // Generated image is already saved, just update
    onUpdate();
    onClose();
  };

  const handleRemoveCover = async () => {
    if (!window.confirm('Remove cover image? The project will use auto-generated character composite instead.')) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/cover-image`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove cover image');
      }

      alert('Cover image removed successfully!');
      onUpdate();
      onClose();
    } catch (error: any) {
      console.error('Remove error:', error);
      alert('Failed to remove cover image: ' + error.message);
    }
  };

  // Determine what to display
  const displayPreview = preview || generatedPreview;
  const displayUrl = displayPreview || currentCoverUrl || null;
  const fullUrl = displayUrl?.startsWith('http') 
    ? displayUrl 
    : displayUrl 
      ? `${API_BASE_URL.replace('/api', '')}${displayUrl.startsWith('/') ? '' : '/'}${displayUrl}`
      : null;
  
  const hasPendingChanges = (preview && selectedFile) || generatedPreview;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between sticky top-0 bg-zinc-900 z-10">
          <h2 className="text-xl font-bold text-white">Manage Cover Image</h2>
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
          {/* Preview Section */}
          {fullUrl && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
                {hasPendingChanges ? 'Preview' : 'Current Cover'}
              </h3>
              <div className="relative w-full h-64 bg-zinc-950 rounded-lg overflow-hidden border border-zinc-800">
                <img
                  src={fullUrl}
                  alt="Cover preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const parent = target.parentElement;
                    if (parent) {
                      parent.innerHTML = '<div class="w-full h-full flex items-center justify-center text-zinc-500"><div class="text-center"><div class="text-4xl mb-2">🎬</div><div class="text-sm">Cover image</div></div></div>';
                    }
                  }}
                />
                {hasPendingChanges && (
                  <div className="absolute top-2 right-2 bg-amber-600 text-white text-xs px-2 py-1 rounded">
                    Preview
                  </div>
                )}
              </div>
              {hasPendingChanges && (
                <div className="mt-3 flex gap-2">
                  {generatedPreview ? (
                    <button
                      onClick={handleConfirmGenerated}
                      disabled={uploading}
                      className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Save Generated Cover
                    </button>
                  ) : (
                    <button
                      onClick={handleConfirmUpload}
                      disabled={uploading || !selectedFile}
                      className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {uploading ? 'Uploading...' : 'Save Cover Image'}
                    </button>
                  )}
                  <button
                    onClick={handleCancelPreview}
                    disabled={uploading}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-zinc-300 font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Upload Section */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Upload Cover Image</h3>
            <div className="space-y-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                disabled={uploading}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || hasPendingChanges}
                className="w-full px-4 py-3 bg-amber-600 hover:bg-amber-500 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M9.25 13.25a.75.75 0 001.5 0V4.636l2.955 3.129a.75.75 0 001.09-1.03l-4.25-4.5a.75.75 0 00-1.09 0l-4.25 4.5a.75.75 0 001.09 1.03L9.25 4.636v8.614z" />
                  <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                </svg>
                <span>Choose Image File</span>
              </button>
              <p className="text-xs text-zinc-500 text-center">JPG, PNG, GIF, or WebP (max 10MB)</p>
            </div>
          </div>

          {/* Generate from Characters */}
          <div>
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Auto-Generate</h3>
            <button
              onClick={handleGenerateFromCharacters}
              disabled={generating}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647A7.962 7.962 0 0112 20a7.962 7.962 0 01-8-8H4z"></path>
                  </svg>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                  </svg>
                  <span>Generate from Characters</span>
                </>
              )}
            </button>
            <p className="text-xs text-zinc-500 text-center mt-2">Creates a composite image from all character photos</p>
          </div>

          {/* Remove Cover */}
          {currentCoverUrl && (
            <div>
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">Remove</h3>
              <button
                onClick={handleRemoveCover}
                className="w-full px-4 py-3 bg-red-900/30 hover:bg-red-900/50 rounded-lg text-red-400 font-medium transition-colors flex items-center justify-center gap-2 border border-red-900/50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                </svg>
                <span>Remove Cover Image</span>
              </button>
              <p className="text-xs text-zinc-500 text-center mt-2">Will use auto-generated character composite instead</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CoverImageManager;

