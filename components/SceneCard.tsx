
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Scene } from '../types';
import { mediaService } from '../apiServices';
import MediaLibrarySidebar from './MediaLibrarySidebar';
import SceneGallerySidebar from './SceneGallerySidebar';
import CopyButton from './CopyButton';
import SceneStatisticsCard from './SceneStatisticsCard';
import { getThumbnailUrl, getFullImageUrl } from '../utils/imageUtils';

interface SceneCardProps {
  scene: Scene;
  projectId?: string;
  onNotesClick?: (sceneId: string) => void;
  onDelete?: (sceneId: string) => void;
  onPreview?: () => void;
  batchMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

interface MediaItem {
  id: string;
  file_path: string;
  thumbnail_path: string;
  imagekit_url?: string | null;
  imagekit_thumbnail_url?: string | null;
  alt_text?: string;
  is_primary: boolean;
}

const SceneCard: React.FC<SceneCardProps> = ({ scene, projectId, onNotesClick, onDelete, onPreview, batchMode = false, isSelected = false, onToggleSelection }) => {
  const [sceneImages, setSceneImages] = useState<MediaItem[]>([]);
  const [showMediaLibrary, setShowMediaLibrary] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [showQuickPreview, setShowQuickPreview] = useState(false);
  const [previewPosition, setPreviewPosition] = useState({ x: 0, y: 0 });

  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

  const loadSceneImages = useCallback(async () => {
    try {
      setLoadingImages(true);
      const media = await mediaService.getSceneMedia(scene.id);
      // Ensure we have an array and filter out any null/undefined items
      const validMedia = Array.isArray(media) ? media.filter(item => item && item.id) : [];
      setSceneImages(validMedia);
      if (validMedia.length > 0) {
        console.log(`Loaded ${validMedia.length} images for scene ${scene.id}`, validMedia);
      }
    } catch (error: any) {
      console.error('Failed to load scene images:', error);
      // Don't show error to user - just log it and set empty array
      setSceneImages([]);
    } finally {
      setLoadingImages(false);
    }
  }, [scene.id]);

  useEffect(() => {
    if (projectId && scene.id) {
      loadSceneImages();
    }
  }, [projectId, scene.id, loadSceneImages]);

  // Memoize close handler to prevent re-renders
  const handleMediaLibraryClose = useCallback(() => {
    setShowMediaLibrary(false);
    // Reload images after a short delay to ensure backend has processed
    setTimeout(() => {
      loadSceneImages();
    }, 500);
  }, [loadSceneImages]);

  const primaryImage = sceneImages.find(img => img.is_primary) || sceneImages[0];

  return (
    <div 
      className={`bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col h-full shadow-lg transition-all ${
        batchMode ? 'hover:border-amber-500' : 'hover:scale-[1.01]'
      } ${isSelected ? 'border-amber-500 bg-amber-900/10' : ''}`}
      onMouseEnter={(e) => {
        if (!batchMode && !showQuickPreview) {
          const rect = e.currentTarget.getBoundingClientRect();
          setPreviewPosition({ x: rect.right + 10, y: rect.top });
          setShowQuickPreview(true);
        }
      }}
      onMouseLeave={() => {
        setShowQuickPreview(false);
      }}
      onClick={batchMode && onToggleSelection ? onToggleSelection : undefined}
    >
      {/* Header / Meta */}
      <div className="bg-black/50 p-3 border-b border-zinc-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
          {batchMode && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelection?.();
              }}
              onClick={(e) => e.stopPropagation()}
              className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-zinc-900 cursor-pointer"
            />
          )}
           <div className="bg-amber-900/30 text-amber-500 px-2 py-1 rounded text-xs font-mono border border-amber-900/50 font-bold">
             {scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`}
           </div>
           <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">8 Second Clip</div>
        </div>
        <div className="flex items-center gap-2">
          {projectId && !batchMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMediaLibrary(true);
              }}
              className="text-zinc-400 hover:text-blue-500 transition-colors"
              title="Manage Images"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.97zM12 7a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          {onPreview && !batchMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPreview();
              }}
              className="text-zinc-400 hover:text-blue-500 transition-colors"
              title="Preview Scene"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                <path fillRule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          {onNotesClick && !batchMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNotesClick(scene.id);
              }}
              className="text-zinc-400 hover:text-amber-500 transition-colors"
              title="Scene Notes"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          {onDelete && !batchMode && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm('Delete this scene?')) {
                  onDelete(scene.id);
                }
              }}
              className="text-zinc-400 hover:text-red-500 transition-colors"
              title="Delete Scene"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
              </svg>
            </button>
          )}
          <div className="text-[10px] text-zinc-600 font-mono">
             {scene.status === 'generating' ? 'DIRECTING...' : 'LOCKED'}
          </div>
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col gap-4 relative">
        {scene.status === 'generating' && (
             <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-3"></div>
                    <p className="text-amber-500 text-xs font-mono animate-pulse">WRITING DIRECTORIAL SCRIPT...</p>
                </div>
             </div>
        )}

        {/* Scene Image - Comic Book Style */}
        {(primaryImage || scene.thumbnailUrl) ? (
          <div 
            className="w-full mb-4 rounded-lg overflow-hidden border-2 border-zinc-700 bg-zinc-950 cursor-pointer group relative"
            onClick={(e) => {
              if (!batchMode && projectId) {
                e.stopPropagation();
                setShowGallery(true);
              }
            }}
          >
            <img
              src={primaryImage ? getThumbnailUrl(primaryImage) : (scene.thumbnailUrl ? `${API_BASE_URL.replace('/api', '')}${scene.thumbnailUrl}` : '')}
              alt={primaryImage?.alt_text || `Scene ${scene.sequenceNumber}`}
              className="w-full h-auto object-cover transition-transform group-hover:scale-105"
              loading="lazy"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (primaryImage) {
                  // Try full image as fallback
                  const fullUrl = getFullImageUrl(primaryImage);
                  if (fullUrl && target.src !== fullUrl) {
                    target.src = fullUrl;
                  }
                }
              }}
            />
            {sceneImages.length > 1 && (
              <div className="text-xs text-zinc-500 text-center py-1 bg-zinc-900">
                {sceneImages.length} image{sceneImages.length > 1 ? 's' : ''}
              </div>
            )}
            {!batchMode && projectId && (
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                <div className="opacity-0 group-hover:opacity-100 transition-opacity text-white text-sm font-semibold">
                  Click to view gallery
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="w-full mb-4 rounded-lg overflow-hidden border-2 border-zinc-700 bg-zinc-950 aspect-video flex items-center justify-center">
            <div className="text-center text-zinc-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-xs">No image</p>
            </div>
          </div>
        )}

        {/* Enhanced Prompt */}
        <div className="flex-1 min-h-[120px]">
          <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2 flex items-center gap-2">
            <span>Visual Direction</span>
            <div className="h-px bg-zinc-800 flex-1"></div>
            <CopyButton text={scene.enhancedPrompt} size="sm" />
          </h4>
          <div className="text-sm text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto pr-2 scrollbar-thin border-l-2 border-zinc-800 pl-3">
            {scene.enhancedPrompt}
          </div>
        </div>
        
        {/* Dialogue Section */}
        {scene.directorSettings.dialogue && (
          <div className="bg-zinc-950 border-l-2 border-zinc-700 p-3 my-2">
            <div className="flex items-center justify-between mb-1">
              <span className="block text-[9px] text-zinc-500 uppercase font-bold">Dialogue</span>
              <CopyButton text={scene.directorSettings.dialogue} size="sm" />
            </div>
            <p className="text-sm text-amber-100/90 font-serif italic">"{scene.directorSettings.dialogue}"</p>
          </div>
        )}

        {/* Specs Grid */}
        <div className="mt-4 pt-4 border-t border-zinc-800/50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Technical Details</h4>
            <CopyButton 
              text={[
                scene.directorSettings.customSceneId && `Scene ID: ${scene.directorSettings.customSceneId}`,
                `Lens & Angle: ${scene.directorSettings.lens} / ${scene.directorSettings.angle}`,
                `Camera Movement: ${scene.directorSettings.movement}`,
                scene.directorSettings.zoom && `Zoom: ${scene.directorSettings.zoom}`,
                `Transition: ${scene.directorSettings.transition || "Cut"}`,
                `Sound Design: ${scene.directorSettings.sound || "Not specified"}`,
                scene.directorSettings.stuntInstructions && `Stunts: ${scene.directorSettings.stuntInstructions}`
              ].filter(Boolean).join('\n')}
              size="sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            {/* Explicit Scene ID if custom */}
            {scene.directorSettings.customSceneId && (
              <div>
                <span className="block text-[10px] text-zinc-500 uppercase font-bold">Scene ID</span>
                <span className="text-xs text-zinc-300 font-mono">{scene.directorSettings.customSceneId}</span>
              </div>
            )}

            <div>
               <span className="block text-[10px] text-zinc-500 uppercase font-bold">Lens & Angle</span>
               <span className="text-xs text-zinc-400">{scene.directorSettings.lens} / {scene.directorSettings.angle}</span>
            </div>
             <div>
               <span className="block text-[10px] text-zinc-500 uppercase font-bold">Camera Movement</span>
               <span className="text-xs text-zinc-400">{scene.directorSettings.movement}</span>
            </div>
             {scene.directorSettings.zoom && (
               <div>
                 <span className="block text-[10px] text-zinc-500 uppercase font-bold">Zoom</span>
                 <span className="text-xs text-zinc-400">{scene.directorSettings.zoom}</span>
               </div>
             )}
            <div>
               <span className="block text-[10px] text-zinc-500 uppercase font-bold">Transition Out</span>
               <span className="text-xs text-amber-400 border border-amber-500/30 px-1.5 rounded inline-block bg-amber-900/10">
                 {scene.directorSettings.transition || "Cut"}
               </span>
            </div>
             <div className="col-span-2">
               <span className="block text-[10px] text-zinc-500 uppercase font-bold">Sound Design</span>
               <span className="text-xs text-zinc-400">{scene.directorSettings.sound || "Not specified"}</span>
            </div>
            {scene.directorSettings.stuntInstructions && (
              <div className="col-span-2">
                <span className="block text-[10px] text-zinc-500 uppercase font-bold">Stunts</span>
                <span className="text-xs text-zinc-400">{scene.directorSettings.stuntInstructions}</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer: Context */}
        <div className="mt-2 bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
          <div className="flex gap-2 items-start">
            <span className="text-[10px] text-zinc-600 uppercase font-bold shrink-0 mt-0.5">Flow Link:</span>
            <p className="text-[10px] text-zinc-500 italic leading-tight line-clamp-2 flex-1">
              {scene.contextSummary || "Waiting for context..."}
            </p>
            {scene.contextSummary && (
              <CopyButton text={scene.contextSummary} size="sm" className="shrink-0 mt-0.5" />
            )}
          </div>
        </div>

        {/* Scene Statistics Card */}
        {!batchMode && (
          <div className="mt-4">
            <SceneStatisticsCard scene={scene} />
          </div>
        )}
      </div>

      {/* Media Library Sidebar - for uploads */}
      {showMediaLibrary && projectId && (
        <MediaLibrarySidebar
          key={`media-library-${scene.id}`}
          projectId={projectId}
          sceneId={scene.id}
          onClose={handleMediaLibraryClose}
          allowUpload={true}
        />
      )}

      {/* Scene Gallery Sidebar - for viewing, editing, and deleting */}
      {showGallery && projectId && (
        <SceneGallerySidebar
          key={`gallery-${scene.id}`}
          sceneId={scene.id}
          projectId={projectId}
          onClose={() => {
            setShowGallery(false);
            // Reload images after closing gallery
            setTimeout(() => {
              loadSceneImages();
            }, 300);
          }}
          onUpdate={() => {
            loadSceneImages();
          }}
        />
      )}

      {/* Quick Preview on Hover */}
      {showQuickPreview && !batchMode && (
        <div
          className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-4 max-w-md pointer-events-none"
          style={{
            left: `${previewPosition.x}px`,
            top: `${previewPosition.y}px`,
            transform: previewPosition.x + 400 > window.innerWidth ? 'translateX(-100%)' : 'translateX(0)'
          }}
        >
          <div className="text-xs font-bold text-white mb-2">Scene {scene.sequenceNumber}</div>
          {primaryImage && (
            <img
              src={getThumbnailUrl(primaryImage)}
              alt={primaryImage.alt_text || `Scene ${scene.sequenceNumber}`}
              className="w-full rounded mb-2"
            />
          )}
          <div className="text-sm text-zinc-300 mb-2 line-clamp-3">{scene.rawIdea}</div>
          {scene.directorSettings.dialogue && (
            <div className="text-xs text-amber-400 italic line-clamp-2">"{scene.directorSettings.dialogue}"</div>
          )}
          <div className="mt-2 text-xs text-zinc-500">
            {scene.directorSettings.lens} / {scene.directorSettings.angle} • {scene.directorSettings.movement}
          </div>
        </div>
      )}
    </div>
  );
};

export default SceneCard;
