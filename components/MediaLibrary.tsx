import React, { useState, useEffect, useRef, useCallback } from 'react';
import { mediaService } from '../apiServices';

interface MediaLibraryProps {
  projectId: string;
  sceneId?: string;
  onSelect?: (mediaId: string) => void;
  onClose: () => void;
  allowUpload?: boolean;
}

interface MediaItem {
  id: string;
  file_name: string;
  file_path: string;
  thumbnail_path: string;
  alt_text?: string;
  description?: string;
  is_primary: boolean;
  width: number;
  height: number;
}

const MediaLibrary: React.FC<MediaLibraryProps> = ({ 
  projectId, 
  sceneId, 
  onSelect, 
  onClose,
  allowUpload = true 
}) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    loadMedia();
  }, [projectId, sceneId]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const items = sceneId 
        ? await mediaService.getSceneMedia(sceneId)
        : await mediaService.getProjectMedia(projectId);
      // Ensure we have an array and filter out any null/undefined items
      const validItems = Array.isArray(items) ? items.filter(item => item && item.id) : [];
      setMedia(validItems);
    } catch (error: any) {
      console.error('Failed to load media:', error);
      setMedia([]);
      // Don't show alert on every load, just log the error
      if (error.message && !error.message.includes('401')) {
        console.warn('Media load warning:', error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    try {
      setUploading(true);
      // Prevent modal from closing during upload
      await mediaService.uploadImage(projectId, file, sceneId);
      // Reload media after successful upload
      await loadMedia();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert('Failed to upload image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (mediaId: string) => {
    if (!window.confirm('Delete this image?')) return;

    try {
      await mediaService.deleteMedia(mediaId);
      await loadMedia();
    } catch (error: any) {
      console.error('Delete failed:', error);
      alert('Failed to delete image');
    }
  };

  const handleSetPrimary = async (mediaId: string) => {
    try {
      await mediaService.updateMedia(mediaId, { is_primary: true });
      await loadMedia();
    } catch (error: any) {
      console.error('Failed to set primary:', error);
      alert('Failed to set primary image');
    }
  };

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Memoize close handler to prevent re-renders
  const handleClose = useCallback(() => {
    if (!uploading) {
      onClose();
    }
  }, [uploading, onClose]);

  // Handle overlay click - only close on actual click, not hover
  const handleOverlayClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on the overlay (not a child)
    if (e.target === e.currentTarget && !uploading) {
      handleClose();
    }
  }, [uploading, handleClose]);

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      onMouseDown={handleOverlayClick}
      onMouseUp={(e) => {
        // Prevent any mouse events from bubbling
        if (e.target !== e.currentTarget) {
          e.stopPropagation();
        }
      }}
    >
      <div 
        className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col shadow-2xl"
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        style={{ 
          willChange: 'transform'
        }}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Media Library</h2>
          <div className="flex items-center gap-2">
            {allowUpload && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload Image'}
                </button>
              </>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClose();
              }}
              disabled={uploading}
              className="text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-2"></div>
              <div className="text-zinc-500">Loading media...</div>
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              {allowUpload ? 'No images yet. Upload your first image!' : 'No images in this scene.'}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {media.map((item) => (
                <div
                  key={item.id}
                  className={`bg-zinc-800 border rounded-lg overflow-hidden cursor-pointer transition-all ${
                    selectedMedia === item.id ? 'border-amber-500 ring-2 ring-amber-500' : 'border-zinc-700'
                  } ${item.is_primary ? 'ring-2 ring-blue-500' : ''}`}
                  onClick={() => {
                    setSelectedMedia(item.id);
                    if (onSelect) {
                      onSelect(item.id);
                    }
                  }}
                >
                  <div className="relative aspect-square bg-zinc-900">
                    <img
                      src={`${API_BASE_URL.replace('/api', '')}${item.thumbnail_path}`}
                      alt={item.alt_text || item.file_name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        // Fallback to full image if thumbnail fails
                        const target = e.target as HTMLImageElement;
                        if (target.src !== `${API_BASE_URL.replace('/api', '')}${item.file_path}`) {
                          target.src = `${API_BASE_URL.replace('/api', '')}${item.file_path}`;
                        }
                      }}
                      loading="lazy"
                    />
                    {item.is_primary && (
                      <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        Primary
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="text-xs text-zinc-400 truncate" title={item.file_name}>
                      {item.file_name}
                    </div>
                    {item.description && (
                      <div className="text-xs text-zinc-500 mt-1 line-clamp-2">
                        {item.description}
                      </div>
                    )}
                    <div className="flex items-center gap-1 mt-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSetPrimary(item.id);
                        }}
                        className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 rounded"
                        title="Set as primary"
                      >
                        ⭐
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="text-xs px-2 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded"
                        title="Delete"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedMedia && onSelect && (
          <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
            <button
              onClick={() => {
                onSelect(selectedMedia);
                onClose();
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm"
            >
              Use Selected Image
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaLibrary;

