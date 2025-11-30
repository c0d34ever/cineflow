import React, { useState, useEffect, useRef } from 'react';
import { Scene } from '../types';
import { mediaService } from '../apiServices';
import { getThumbnailUrl, getFullImageUrl } from '../utils/imageUtils';

interface StoryboardPlaybackProps {
  scenes: Scene[];
  projectId: string;
  onClose: () => void;
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

const StoryboardPlayback: React.FC<StoryboardPlaybackProps> = ({ scenes, projectId, onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(5); // seconds per scene
  const [showDetails, setShowDetails] = useState(true);
  const [sceneImages, setSceneImages] = useState<Record<string, MediaItem[]>>({});
  const [loadingImages, setLoadingImages] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    // Load images for all scenes
    loadAllSceneImages();
    
    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        handlePrevious();
      } else if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        if (e.key === ' ') {
          togglePlayback();
        } else {
          handleNext();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying && scenes.length > 0) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex(prev => {
          if (prev >= scenes.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed * 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, scenes.length]);

  const loadAllSceneImages = async () => {
    try {
      setLoadingImages(true);
      const imagesMap: Record<string, MediaItem[]> = {};
      
      await Promise.all(
        scenes.map(async (scene) => {
          try {
            const media = await mediaService.getSceneMedia(scene.id);
            const validMedia = Array.isArray(media) ? media.filter(item => item && item.id) : [];
            imagesMap[scene.id] = validMedia;
          } catch (error) {
            imagesMap[scene.id] = [];
          }
        })
      );
      
      setSceneImages(imagesMap);
    } catch (error: any) {
      console.error('Failed to load scene images:', error);
    } finally {
      setLoadingImages(false);
    }
  };

  const currentScene = scenes[currentIndex];
  const currentSceneImages = currentScene ? sceneImages[currentScene.id] || [] : [];
  const primaryImage = currentSceneImages.find(img => img.is_primary) || currentSceneImages[0];

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsPlaying(false);
    }
  };

  const handleNext = () => {
    if (currentIndex < scenes.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setIsPlaying(false);
    }
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    setIsPlaying(false);
  };

  const goToScene = (index: number) => {
    setCurrentIndex(index);
    setIsPlaying(false);
  };

  if (!currentScene) {
    return null;
  }

  return (
    <div 
      ref={containerRef}
      className="fixed inset-0 bg-black z-50 flex flex-col"
      onClick={(e) => {
        // Click outside details to toggle
        if (e.target === containerRef.current) {
          setShowDetails(!showDetails);
        }
      }}
    >
      {/* Scene Image - Fullscreen */}
      <div className="flex-1 flex items-center justify-center relative overflow-hidden">
        {loadingImages ? (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <div className="text-zinc-500">Loading images...</div>
          </div>
        ) : primaryImage ? (
          <img
            src={getThumbnailUrl(primaryImage)}
            alt={primaryImage.alt_text || `Scene ${currentScene.sequenceNumber}`}
            className="max-w-full max-h-full object-contain"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              const fullUrl = getFullImageUrl(primaryImage);
              if (fullUrl && target.src !== fullUrl) {
                target.src = fullUrl;
              }
            }}
          />
        ) : (
          <div className="text-center text-zinc-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xl">No image available</p>
          </div>
        )}

        {/* Scene Number Overlay */}
        <div className="absolute top-4 left-4 bg-black/70 text-white px-4 py-2 rounded-lg font-mono text-lg">
          {currentScene.directorSettings.customSceneId || `SEQ #${currentScene.sequenceNumber.toString().padStart(2, '0')}`}
        </div>

        {/* Scene Counter */}
        <div className="absolute top-4 right-4 bg-black/70 text-white px-4 py-2 rounded-lg text-sm">
          {currentIndex + 1} / {scenes.length}
        </div>
      </div>

      {/* Details Panel (Toggleable) */}
      {showDetails && (
        <div className="bg-black/90 backdrop-blur-sm border-t border-zinc-800 p-6 max-h-[40vh] overflow-y-auto">
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Enhanced Prompt */}
            <div>
              <h3 className="text-xs text-zinc-400 uppercase tracking-wider mb-2">Visual Direction</h3>
              <p className="text-zinc-200 font-mono text-sm leading-relaxed">{currentScene.enhancedPrompt}</p>
            </div>

            {/* Dialogue */}
            {currentScene.directorSettings.dialogue && (
              <div className="border-l-4 border-amber-500 pl-4">
                <h3 className="text-xs text-zinc-400 uppercase tracking-wider mb-2">Dialogue</h3>
                <p className="text-amber-100 font-serif italic text-lg">"{currentScene.directorSettings.dialogue}"</p>
              </div>
            )}

            {/* Technical Details */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-zinc-400">Lens & Angle</span>
                <div className="text-zinc-200">{currentScene.directorSettings.lens} / {currentScene.directorSettings.angle}</div>
              </div>
              <div>
                <span className="text-zinc-400">Movement</span>
                <div className="text-zinc-200">{currentScene.directorSettings.movement}</div>
              </div>
              <div>
                <span className="text-zinc-400">Transition</span>
                <div className="text-amber-400">{currentScene.directorSettings.transition || "Cut"}</div>
              </div>
              <div>
                <span className="text-zinc-400">Sound</span>
                <div className="text-zinc-200">{currentScene.directorSettings.sound || "Not specified"}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls Bar */}
      <div className="bg-black/90 backdrop-blur-sm border-t border-zinc-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Previous
            </button>

            <button
              onClick={togglePlayback}
              className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded flex items-center gap-2"
            >
              {isPlaying ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Pause
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                  Play
                </>
              )}
            </button>

            <button
              onClick={handleNext}
              disabled={currentIndex === scenes.length - 1}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Next
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Speed Control */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Speed:</span>
            {[3, 5, 8, 10].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-3 py-1 rounded text-xs ${
                  playbackSpeed === speed
                    ? 'bg-amber-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {speed}s
              </button>
            ))}
          </div>

          {/* Options */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className={`px-3 py-1 rounded text-xs ${
                showDetails
                  ? 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                  : 'bg-zinc-700 text-zinc-400'
              }`}
            >
              {showDetails ? 'Hide' : 'Show'} Details
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Scene Thumbnails Strip (Bottom) */}
      <div className="bg-black/90 backdrop-blur-sm border-t border-zinc-800 p-2 overflow-x-auto">
        <div className="flex gap-2 max-w-4xl mx-auto">
          {scenes.map((scene, index) => {
            const sceneImgs = sceneImages[scene.id] || [];
            const img = sceneImgs.find(i => i.is_primary) || sceneImgs[0];
            return (
              <button
                key={scene.id}
                onClick={() => goToScene(index)}
                className={`flex-shrink-0 w-20 h-14 rounded overflow-hidden border-2 transition-all ${
                  index === currentIndex
                    ? 'border-amber-500 scale-110'
                    : 'border-zinc-700 hover:border-zinc-600'
                }`}
              >
                {img ? (
                  <img
                    src={getThumbnailUrl(img)}
                    alt={`Scene ${scene.sequenceNumber}`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-zinc-600 text-xs">
                    {scene.sequenceNumber}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default StoryboardPlayback;

