import React, { useState, useEffect } from 'react';
import { mediaService } from '../apiServices';
import { getThumbnailUrl, getFullImageUrl } from '../utils/imageUtils';

interface MediaItem {
  id: string;
  file_name: string;
  file_path: string | null;
  thumbnail_path: string | null;
  imagekit_file_id?: string;
  imagekit_url?: string;
  imagekit_thumbnail_url?: string;
  alt_text?: string;
  description?: string;
  is_primary: boolean;
  width: number;
  height: number;
}

interface CoverImageSelectorProps {
  projectId: string;
  currentCoverImageId?: string | null;
  onSelect: (imageId: string | null) => void;
  onClose: () => void;
}

const CoverImageSelector: React.FC<CoverImageSelectorProps> = ({
  projectId,
  currentCoverImageId,
  onSelect,
  onClose
}) => {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(currentCoverImageId || null);

  useEffect(() => {
    loadMedia();
  }, [projectId]);

  const loadMedia = async () => {
    try {
      setLoading(true);
      const response = await mediaService.getByProject(projectId);
      const mediaItems = (response as any)?.media || (Array.isArray(response) ? response : []);
      setMedia(Array.isArray(mediaItems) ? mediaItems : []);
    } catch (error) {
      console.error('Failed to load media:', error);
      setMedia([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (imageId: string | null) => {
    setSelectedImageId(imageId);
  };

  const handleConfirm = () => {
    onSelect(selectedImageId);
    onClose();
  };

  const handleUseDefault = () => {
    onSelect(null); // null means use project cover image (or first scene's primary image as fallback)
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Select Cover Image for Comic</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-zinc-400">Loading images...</div>
          ) : media.length === 0 ? (
            <div className="text-center py-8 text-zinc-400">
              <p>No images available in this project.</p>
              <p className="text-sm mt-2">The comic will use the project cover image (or first scene's primary image if no cover is set).</p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <button
                  onClick={handleUseDefault}
                  className={`px-4 py-2 rounded text-sm ${
                    selectedImageId === null
                      ? 'bg-amber-600 text-white'
                      : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  Use Project Cover
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {media.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImageId === item.id
                        ? 'border-amber-500 ring-2 ring-amber-500 ring-opacity-50'
                        : 'border-zinc-700 hover:border-zinc-600'
                    }`}
                  >
                    <div className="aspect-square relative">
                      <img
                        src={getThumbnailUrl(item)}
                        alt={item.alt_text || item.file_name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = getFullImageUrl(item);
                        }}
                      />
                      {selectedImageId === item.id && (
                        <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                          <div className="bg-amber-500 text-white rounded-full p-2">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>
                    {item.is_primary && (
                      <div className="absolute top-2 left-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                        Primary
                      </div>
                    )}
                    <div className="p-2 bg-zinc-800">
                      <p className="text-xs text-zinc-300 truncate">{item.file_name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm font-medium"
            disabled={loading}
          >
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  );
};

export default CoverImageSelector;

