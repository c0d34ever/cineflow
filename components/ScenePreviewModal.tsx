import React, { useState, useEffect } from 'react';
import { Scene } from '../types';
import { mediaService } from '../apiServices';
import CopyButton from './CopyButton';
import { getThumbnailUrl, getFullImageUrl } from '../utils/imageUtils';

interface ScenePreviewModalProps {
  scene: Scene;
  projectId: string;
  scenes: Scene[];
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
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

const ScenePreviewModal: React.FC<ScenePreviewModalProps> = ({
  scene,
  projectId,
  scenes,
  onClose,
  onPrevious,
  onNext,
}) => {
  const [sceneImages, setSceneImages] = useState<MediaItem[]>([]);
  const [loadingImages, setLoadingImages] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    loadSceneImages();
  }, [scene.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && onPrevious) {
        onPrevious();
      } else if (e.key === 'ArrowRight' && onNext) {
        onNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrevious, onNext]);

  const loadSceneImages = async () => {
    try {
      setLoadingImages(true);
      const media = await mediaService.getSceneMedia(scene.id);
      const validMedia = Array.isArray(media) ? media.filter(item => item && item.id) : [];
      setSceneImages(validMedia);
      setCurrentImageIndex(0);
    } catch (error: any) {
      console.error('Failed to load scene images:', error);
      setSceneImages([]);
    } finally {
      setLoadingImages(false);
    }
  };

  const currentImage = sceneImages[currentImageIndex];
  const currentSceneIndex = scenes.findIndex(s => s.id === scene.id);
  const hasPrevious = currentSceneIndex > 0;
  const hasNext = currentSceneIndex < scenes.length - 1;

  return (
    <div className="fixed inset-0 bg-black/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="bg-amber-900/30 text-amber-500 px-3 py-1 rounded text-sm font-mono border border-amber-900/50 font-bold">
              {scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`}
            </div>
            <div className="text-sm text-zinc-400">
              Scene {currentSceneIndex + 1} of {scenes.length}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Scene Image */}
          {loadingImages ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
            </div>
          ) : currentImage ? (
            <div className="relative">
              <div className="relative bg-zinc-950 rounded-lg overflow-hidden border-2 border-zinc-700">
                <img
                  src={getThumbnailUrl(currentImage)}
                  alt={currentImage.alt_text || `Scene ${scene.sequenceNumber}`}
                  className="w-full h-auto max-h-[60vh] object-contain mx-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    const fullUrl = getFullImageUrl(currentImage);
                    if (fullUrl && target.src !== fullUrl) {
                      target.src = fullUrl;
                    }
                  }}
                />
                {sceneImages.length > 1 && (
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded text-sm">
                    Image {currentImageIndex + 1} of {sceneImages.length}
                  </div>
                )}
              </div>
              {sceneImages.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4">
                  <button
                    onClick={() => setCurrentImageIndex(prev => Math.max(0, prev - 1))}
                    disabled={currentImageIndex === 0}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setCurrentImageIndex(prev => Math.min(sceneImages.length - 1, prev + 1))}
                    disabled={currentImageIndex === sceneImages.length - 1}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64 bg-zinc-950 rounded-lg border-2 border-zinc-700">
              <div className="text-center text-zinc-600">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">No image available</p>
              </div>
            </div>
          )}

          {/* Enhanced Prompt */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Visual Direction</h3>
              <CopyButton text={scene.enhancedPrompt} size="sm" />
            </div>
            <p className="text-zinc-300 font-mono text-sm leading-relaxed whitespace-pre-wrap">
              {scene.enhancedPrompt}
            </p>
          </div>

          {/* Dialogue */}
          {scene.directorSettings.dialogue && (
            <div className="bg-zinc-800 border-l-4 border-amber-500 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Dialogue</h3>
                <CopyButton text={scene.directorSettings.dialogue} size="sm" />
              </div>
              <p className="text-amber-100 font-serif italic text-lg">"{scene.directorSettings.dialogue}"</p>
            </div>
          )}

          {/* Technical Details */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Technical Details</h3>
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
            <div className="grid grid-cols-2 gap-3 text-sm">
              {scene.directorSettings.customSceneId && (
                <div>
                  <span className="text-zinc-500">Scene ID</span>
                  <div className="text-zinc-300 font-mono">{scene.directorSettings.customSceneId}</div>
                </div>
              )}
              <div>
                <span className="text-zinc-500">Lens & Angle</span>
                <div className="text-zinc-300">{scene.directorSettings.lens} / {scene.directorSettings.angle}</div>
              </div>
              <div>
                <span className="text-zinc-500">Camera Movement</span>
                <div className="text-zinc-300">{scene.directorSettings.movement}</div>
              </div>
              {scene.directorSettings.zoom && (
                <div>
                  <span className="text-zinc-500">Zoom</span>
                  <div className="text-zinc-300">{scene.directorSettings.zoom}</div>
                </div>
              )}
              <div>
                <span className="text-zinc-500">Transition</span>
                <div className="text-amber-400">{scene.directorSettings.transition || "Cut"}</div>
              </div>
              <div className="col-span-2">
                <span className="text-zinc-500">Sound Design</span>
                <div className="text-zinc-300">{scene.directorSettings.sound || "Not specified"}</div>
              </div>
              {scene.directorSettings.stuntInstructions && (
                <div className="col-span-2">
                  <span className="text-zinc-500">Stunts</span>
                  <div className="text-zinc-300">{scene.directorSettings.stuntInstructions}</div>
                </div>
              )}
            </div>
          </div>

          {/* Context Summary */}
          {scene.contextSummary && (
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider">Flow Link</h3>
                <CopyButton text={scene.contextSummary} size="sm" />
              </div>
              <p className="text-zinc-400 italic text-sm">{scene.contextSummary}</p>
            </div>
          )}
        </div>

        {/* Footer with Navigation */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={onPrevious}
            disabled={!hasPrevious}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Previous
          </button>
          <div className="text-sm text-zinc-400">
            Use arrow keys to navigate • Esc to close
          </div>
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            Next
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScenePreviewModal;

