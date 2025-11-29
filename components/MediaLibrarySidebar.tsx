import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import { mediaService } from '../apiServices';

interface MediaLibrarySidebarProps {
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

const MediaLibrarySidebar: React.FC<MediaLibrarySidebarProps> = ({ 
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
  const sidebarRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const isInteractingRef = useRef(false);

  // Use ref for onClose to prevent re-renders
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Memoize loadMedia to prevent re-renders
  const loadMedia = useCallback(async () => {
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
      if (error.message && !error.message.includes('401')) {
        console.warn('Media load warning:', error.message);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, sceneId]);

  useEffect(() => {
    loadMedia();
  }, [loadMedia]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    try {
      setUploading(true);
      console.log('Uploading image:', { projectId, sceneId, fileName: file.name });
      const result = await mediaService.uploadImage(projectId, file, sceneId);
      console.log('Upload successful:', result);
      await loadMedia();
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // Show success message
      console.log('Image uploaded successfully and media list refreshed');
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
      onClose(); // Close sidebar after setting primary
    } catch (error: any) {
      console.error('Failed to set primary:', error);
      alert('Failed to set primary image');
    }
  };

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  // Handle backdrop click - only close if not interacting with sidebar
  const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking directly on backdrop (not a child) and not uploading/interacting
    if (
      e.target === backdropRef.current && 
      !uploading && 
      !isInteractingRef.current &&
      !sidebarRef.current?.contains(e.target as Node)
    ) {
      onCloseRef.current();
    }
  }, [uploading]);

  // Track interaction state
  const handleMouseDown = useCallback(() => {
    isInteractingRef.current = true;
  }, []);

  const handleMouseUp = useCallback(() => {
    // Reset after a short delay
    setTimeout(() => {
      isInteractingRef.current = false;
    }, 100);
  }, []);

  // Memoize close handler
  const handleClose = useCallback(() => {
    if (!uploading && !isInteractingRef.current) {
      onCloseRef.current();
    }
  }, [uploading]);

  return (
    <>
      {/* Backdrop */}
      <div 
        ref={backdropRef}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
        onMouseDown={handleBackdropClick}
        onClick={(e) => {
          // Prevent click if it was a drag
          if (e.target === backdropRef.current) {
            handleBackdropClick(e as any);
          }
        }}
      />
      
      {/* Sidebar */}
      <div 
        ref={sidebarRef}
        className="fixed right-0 top-0 h-full w-full max-w-md bg-zinc-900 border-l border-zinc-700 shadow-2xl z-[101] flex flex-col"
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <h2 className="text-xl font-bold text-white">Media Library</h2>
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
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded text-sm disabled:opacity-50 text-white"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </>
            )}
            <button
              onClick={handleClose}
              disabled={uploading}
              className="text-zinc-400 hover:text-white transition-colors p-1 disabled:opacity-50"
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
            <div className="grid grid-cols-2 gap-3">
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
                      src={`${API_BASE_URL.replace('/api', '')}${item.thumbnail_path || item.file_path}`}
                      alt={item.alt_text || item.file_name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `${API_BASE_URL.replace('/api', '')}${item.file_path}`;
                      }}
                    />
                    {item.is_primary && (
                      <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">
                        Primary
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <div className="text-xs text-zinc-400 truncate" title={item.file_name}>
                      {item.file_name}
                    </div>
                    <div className="flex items-center gap-1 mt-1.5">
                      {!item.is_primary && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetPrimary(item.id);
                          }}
                          className="text-xs px-1.5 py-0.5 bg-zinc-700 hover:bg-zinc-600 rounded text-yellow-400"
                          title="Set as primary"
                        >
                          ⭐
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(item.id);
                        }}
                        className="text-xs px-1.5 py-0.5 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded"
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
          <div className="p-4 border-t border-zinc-800 flex justify-end gap-2 bg-zinc-950">
            <button
              onClick={() => {
                onSelect(selectedMedia);
                onClose();
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm text-white"
            >
              Use Selected Image
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default memo(MediaLibrarySidebar);

