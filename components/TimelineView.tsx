import React, { useState, useEffect, useCallback } from 'react';
import { Scene } from '../types';
import { mediaService } from '../apiServices';
import { getThumbnailUrl } from '../utils/imageUtils';

interface TimelineViewProps {
  scenes: Scene[];
  projectId?: string;
  onSceneClick?: (scene: Scene) => void;
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

const TimelineView: React.FC<TimelineViewProps> = ({ scenes, projectId, onSceneClick }) => {
  const [sceneImages, setSceneImages] = useState<Record<string, MediaItem[]>>({});
  const [hoveredSceneId, setHoveredSceneId] = useState<string | null>(null);
  const totalDuration = scenes.length * 8; // Each scene is 8 seconds

  useEffect(() => {
    if (projectId) {
      loadAllSceneImages();
    }
  }, [projectId, scenes]);

  const loadAllSceneImages = useCallback(async () => {
    if (!projectId) return;
    
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
  }, [projectId, scenes]);

  return (
    <div className="w-full h-full overflow-x-auto overflow-y-auto bg-zinc-950 p-6">
      <div className="min-w-full">
        {/* Timeline Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Timeline View</h2>
          <div className="flex items-center gap-4 text-sm text-zinc-400">
            <span>Total Duration: {totalDuration}s ({Math.round(totalDuration / 60)}m {totalDuration % 60}s)</span>
            <span>Scenes: {scenes.length}</span>
          </div>
        </div>

        {/* Timeline Scale */}
        <div className="relative mb-4 border-b border-zinc-800 pb-2">
          <div className="flex">
            {Array.from({ length: Math.ceil(totalDuration / 10) + 1 }).map((_, i) => (
              <div key={i} className="flex-1 relative">
                <div className="absolute left-0 top-0 w-px h-4 bg-zinc-700"></div>
                <div className="absolute left-0 top-4 text-xs text-zinc-500">{i * 10}s</div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline Track */}
        <div className="relative mb-8" style={{ height: '180px' }}>
          {/* Scene Blocks */}
          {scenes.map((scene, index) => {
            const startTime = index * 8;
            const width = (8 / totalDuration) * 100;
            const left = (startTime / totalDuration) * 100;
            const sceneImgs = sceneImages[scene.id] || [];
            const primaryImage = sceneImgs.find(img => img.is_primary) || sceneImgs[0];

            return (
              <div
                key={scene.id}
                onClick={() => onSceneClick?.(scene)}
                onMouseEnter={() => setHoveredSceneId(scene.id)}
                onMouseLeave={() => setHoveredSceneId(null)}
                className="absolute top-0 bg-zinc-900 border border-amber-500/50 rounded-lg overflow-hidden cursor-pointer hover:border-amber-500 hover:shadow-lg hover:shadow-amber-500/20 transition-all group"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  minWidth: '160px',
                  maxWidth: '240px'
                }}
                title={`Scene ${index + 1}: ${scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`}`}
              >
                {/* Thumbnail */}
                {primaryImage ? (
                  <div className="relative h-24 bg-zinc-950 overflow-hidden">
                    <img
                      src={getThumbnailUrl(primaryImage)}
                      alt={primaryImage.alt_text || `Scene ${scene.sequenceNumber}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-transparent to-transparent"></div>
                    <div className="absolute top-1 left-1 bg-amber-900/80 text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold">
                      {scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`}
                    </div>
                  </div>
                ) : (
                  <div className="relative h-24 bg-zinc-950 flex items-center justify-center">
                    <div className="text-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-1 text-zinc-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <div className="text-[10px] text-zinc-600 font-mono font-bold">
                        {scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Scene Info */}
                <div className="p-2 bg-zinc-900">
                  <div className="text-[10px] text-zinc-400 line-clamp-2 mb-1">
                    {scene.enhancedPrompt.substring(0, 80)}...
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-zinc-500">{scene.directorSettings.transition || 'Cut'}</span>
                    {scene.directorSettings.dialogue && (
                      <span className="text-amber-500">💬</span>
                    )}
                    <span className="text-zinc-600">{index * 8}s</span>
                  </div>
                </div>

                {/* Hover Preview */}
                {hoveredSceneId === scene.id && (
                  <div className="absolute top-full left-0 mt-2 w-80 bg-zinc-900 border border-amber-500 rounded-lg shadow-2xl z-50 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="bg-amber-900/30 text-amber-500 px-2 py-1 rounded text-xs font-mono font-bold">
                        {scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`}
                      </div>
                      <div className="text-xs text-zinc-400">
                        {index * 8}s - {(index + 1) * 8}s
                      </div>
                    </div>
                    {primaryImage && (
                      <div className="mb-2 rounded overflow-hidden">
                        <img
                          src={getThumbnailUrl(primaryImage)}
                          alt={primaryImage.alt_text || `Scene ${scene.sequenceNumber}`}
                          className="w-full h-32 object-cover"
                        />
                      </div>
                    )}
                    <p className="text-sm text-zinc-300 mb-2 line-clamp-3">{scene.enhancedPrompt}</p>
                    {scene.directorSettings.dialogue && (
                      <p className="text-xs text-amber-400 italic">"{scene.directorSettings.dialogue}"</p>
                    )}
                    <div className="mt-2 pt-2 border-t border-zinc-800 text-xs text-zinc-500">
                      <div>Lens: {scene.directorSettings.lens} / {scene.directorSettings.angle}</div>
                      <div>Movement: {scene.directorSettings.movement}</div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Time Markers */}
          <div className="absolute inset-0 pointer-events-none">
            {Array.from({ length: Math.ceil(totalDuration / 10) + 1 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 w-px h-full bg-zinc-800/50"
                style={{ left: `${(i * 10 / totalDuration) * 100}%` }}
              ></div>
            ))}
          </div>
        </div>

        {/* Scene List (Alternative View) */}
        <div className="mt-12 space-y-2">
          <h3 className="text-lg font-bold mb-4">Scene Breakdown</h3>
          {scenes.map((scene, index) => {
            const sceneImgs = sceneImages[scene.id] || [];
            const primaryImage = sceneImgs.find(img => img.is_primary) || sceneImgs[0];
            
            return (
              <div
                key={scene.id}
                onClick={() => onSceneClick?.(scene)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-amber-500/50 transition-all flex gap-3"
              >
                {/* Thumbnail */}
                {primaryImage ? (
                  <div className="flex-shrink-0 w-24 h-16 rounded overflow-hidden bg-zinc-950">
                    <img
                      src={getThumbnailUrl(primaryImage)}
                      alt={primaryImage.alt_text || `Scene ${scene.sequenceNumber}`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex-shrink-0 w-24 h-16 rounded bg-zinc-950 flex items-center justify-center">
                    <div className="text-zinc-700 text-xs font-mono">
                      {scene.sequenceNumber}
                    </div>
                  </div>
                )}
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="bg-amber-900/30 text-amber-500 px-2 py-1 rounded text-xs font-mono border border-amber-900/50 font-bold">
                        {scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {index * 8}s - {(index + 1) * 8}s ({8}s)
                      </div>
                    </div>
                    <div className="text-xs text-zinc-600">
                      {scene.directorSettings.transition || 'Cut'}
                    </div>
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-2">
                    {scene.enhancedPrompt}
                  </p>
                  {scene.directorSettings.dialogue && (
                    <div className="mt-2 text-xs text-amber-400 italic">
                      "{scene.directorSettings.dialogue}"
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TimelineView;

