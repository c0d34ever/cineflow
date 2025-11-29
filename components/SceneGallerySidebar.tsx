import React, { useState, useEffect, useCallback } from 'react';
import { mediaService } from '../apiServices';

interface SceneGallerySidebarProps {
  sceneId: string;
  projectId: string;
  onClose: () => void;
  onUpdate?: () => void;
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
  created_at?: string;
}

const SceneGallerySidebar: React.FC<SceneGallerySidebarProps> = ({ sceneId, projectId, onClose, onUpdate }) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingMedia, setEditingMedia] = useState<MediaItem | null>(null);
  const [editForm, setEditForm] = useState({ alt_text: '', description: '', is_primary: false });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  const loadMedia = useCallback(async () => {
    try {
      setLoading(true);
      console.log('Loading media for scene:', sceneId);
      const items = await mediaService.getSceneMedia(sceneId);
      const validItems = Array.isArray(items) ? items.filter(item => item && item.id) : [];
      console.log(`SceneGallery: Loaded ${validItems.length} items for scene ${sceneId}`, validItems);
      setMedia(validItems);
    } catch (error: any) {
      console.error('Failed to load scene media:', error);
      setMedia([]);
    } finally {
      setLoading(false);
    }
  }, [sceneId]);

  useEffect(() => {
    // Load media when component mounts or sceneId changes
    loadMedia();
  }, [loadMedia, sceneId]); // Include sceneId to reload when it changes

  const handleEdit = (item: MediaItem) => {
    setEditingMedia(item);
    setEditForm({
      alt_text: item.alt_text || '',
      description: item.description || '',
      is_primary: item.is_primary || false,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingMedia) return;

    try {
      setSaving(true);
      await mediaService.updateMedia(editingMedia.id, {
        alt_text: editForm.alt_text || undefined,
        description: editForm.description || undefined,
        is_primary: editForm.is_primary,
      });
      await loadMedia();
      setEditingMedia(null);
      onUpdate?.();
    } catch (error: any) {
      console.error('Failed to update media:', error);
      alert('Failed to update image: ' + (error.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mediaId: string, fileName: string) => {
    if (!window.confirm(`Are you sure you want to delete "${fileName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setDeleting(mediaId);
      await mediaService.deleteMedia(mediaId);
      await loadMedia();
      onUpdate?.();
    } catch (error: any) {
      console.error('Failed to delete media:', error);
      alert('Failed to delete image: ' + (error.message || 'Unknown error'));
    } finally {
      setDeleting(null);
    }
  };

  const handleSetPrimary = async (mediaId: string) => {
    try {
      await mediaService.updateMedia(mediaId, { is_primary: true });
      await loadMedia();
      onUpdate?.();
    } catch (error: any) {
      console.error('Failed to set primary:', error);
      alert('Failed to set as primary image');
    }
  };

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
        onClick={onClose}
      />
      
      {/* Sidebar */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-zinc-900 border-l border-zinc-700 shadow-2xl z-[101] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
          <h2 className="text-xl font-bold text-white">Scene Gallery</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-2"></div>
              <div className="text-zinc-500">Loading gallery...</div>
            </div>
          ) : media.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-lg">No images in this scene</p>
              <p className="text-sm mt-2">Upload images using the image icon in the scene card</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {media.map((item) => (
                <div
                  key={item.id}
                  className={`bg-zinc-800 border rounded-lg overflow-hidden transition-all hover:border-zinc-600 ${
                    item.is_primary ? 'ring-2 ring-blue-500 border-blue-500' : 'border-zinc-700'
                  }`}
                >
                  {/* Image */}
                  <div className="relative aspect-square bg-zinc-900 group">
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
                    
                    {/* Primary Badge */}
                    {item.is_primary && (
                      <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded font-semibold">
                        Primary
                      </div>
                    )}

                    {/* Hover Overlay with Actions */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded transition-colors"
                        title="Edit"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                      </button>
                      {!item.is_primary && (
                        <button
                          onClick={() => handleSetPrimary(item.id)}
                          className="bg-amber-600 hover:bg-amber-700 text-white p-2 rounded transition-colors"
                          title="Set as Primary"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(item.id, item.file_name)}
                        disabled={deleting === item.id}
                        className="bg-red-600 hover:bg-red-700 text-white p-2 rounded transition-colors disabled:opacity-50"
                        title="Delete"
                      >
                        {deleting === item.id ? (
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Image Info */}
                  <div className="p-2">
                    <p className="text-xs text-zinc-400 truncate" title={item.file_name}>
                      {item.file_name}
                    </p>
                    {item.alt_text && (
                      <p className="text-xs text-zinc-500 mt-1 truncate" title={item.alt_text}>
                        {item.alt_text}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {editingMedia && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[102] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-md">
            <div className="p-4 border-b border-zinc-800">
              <h3 className="text-lg font-bold text-white">Edit Image</h3>
            </div>
            <div className="p-4 space-y-4">
              {/* Preview */}
              <div className="relative aspect-video bg-zinc-800 rounded overflow-hidden">
                <img
                  src={`${API_BASE_URL.replace('/api', '')}${editingMedia.thumbnail_path || editingMedia.file_path}`}
                  alt={editingMedia.alt_text || editingMedia.file_name}
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Form */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Alt Text
                  </label>
                  <input
                    type="text"
                    value={editForm.alt_text}
                    onChange={(e) => setEditForm({ ...editForm, alt_text: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    placeholder="Describe the image for accessibility"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    placeholder="Additional details about this image"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="is_primary"
                    checked={editForm.is_primary}
                    onChange={(e) => setEditForm({ ...editForm, is_primary: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900 cursor-pointer"
                  />
                  <label htmlFor="is_primary" className="ml-2 text-sm text-zinc-300 cursor-pointer">
                    Set as primary image for this scene
                  </label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={() => setEditingMedia(null)}
                disabled={saving}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SceneGallerySidebar;

