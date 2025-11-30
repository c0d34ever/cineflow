import React, { useState, useEffect } from 'react';
import { Scene } from '../types';
import { mediaService } from '../apiServices';
import { getImageUrl } from '../utils/imageUtils';

interface SceneComparisonViewProps {
  scenes: Scene[];
  projectId: string;
  onClose: () => void;
  initialScenes?: string[]; // Scene IDs to compare
}

interface MediaItem {
  id: string;
  file_path: string;
  thumbnail_path?: string;
  imagekit_url?: string | null;
  imagekit_thumbnail_url?: string | null;
  alt_text?: string;
  is_primary: boolean;
}

const SceneComparisonView: React.FC<SceneComparisonViewProps> = ({
  scenes,
  projectId,
  onClose,
  initialScenes = []
}) => {
  const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(
    new Set(initialScenes.length > 0 ? initialScenes : scenes.slice(0, 2).map(s => s.id))
  );
  const [sceneImages, setSceneImages] = useState<Record<string, MediaItem[]>>({});
  const [loading, setLoading] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'2-way' | '3-way'>('2-way');

  useEffect(() => {
    loadSceneImages();
  }, [selectedSceneIds]);

  useEffect(() => {
    // Adjust selected scenes based on comparison mode
    const selectedArray = Array.from(selectedSceneIds);
    if (comparisonMode === '2-way' && selectedArray.length > 2) {
      setSelectedSceneIds(new Set(selectedArray.slice(0, 2)));
    } else if (comparisonMode === '3-way' && selectedArray.length > 3) {
      setSelectedSceneIds(new Set(selectedArray.slice(0, 3)));
    }
  }, [comparisonMode]);

  const loadSceneImages = async () => {
    setLoading(true);
    try {
      const imagesMap: Record<string, MediaItem[]> = {};
      await Promise.all(
        Array.from(selectedSceneIds).map(async (sceneId) => {
          try {
            const media = await mediaService.getSceneMedia(sceneId);
            const validMedia = Array.isArray(media) ? media.filter(item => item && item.id) : [];
            imagesMap[sceneId] = validMedia;
          } catch (error) {
            imagesMap[sceneId] = [];
          }
        })
      );
      setSceneImages(imagesMap);
    } catch (error) {
      console.error('Failed to load scene images:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSceneSelection = (sceneId: string) => {
    const newSelection = new Set(selectedSceneIds);
    const maxScenes = comparisonMode === '2-way' ? 2 : 3;
    
    if (newSelection.has(sceneId)) {
      newSelection.delete(sceneId);
    } else {
      if (newSelection.size >= maxScenes) {
        // Remove the first selected scene
        const firstId = Array.from(newSelection)[0];
        newSelection.delete(firstId);
      }
      newSelection.add(sceneId);
    }
    setSelectedSceneIds(newSelection);
  };

  const getSelectedScenes = () => {
    return scenes.filter(s => selectedSceneIds.has(s.id));
  };

  const selectedScenes = getSelectedScenes();

  const getPrimaryImage = (sceneId: string) => {
    const media = sceneImages[sceneId] || [];
    const primaryImage = media.find(img => img.is_primary) || media[0];
    return primaryImage ? getImageUrl(primaryImage, false) : null;
  };

  const highlightDifferences = (text1: string, text2: string): { text: string; isDiff: boolean }[] => {
    // Simple word-by-word comparison
    const words1 = text1.split(/\s+/);
    const words2 = text2.split(/\s+/);
    const maxLen = Math.max(words1.length, words2.length);
    const result: { text: string; isDiff: boolean }[] = [];
    
    for (let i = 0; i < maxLen; i++) {
      const word1 = words1[i] || '';
      const word2 = words2[i] || '';
      if (word1 !== word2) {
        result.push({ text: word1 || word2, isDiff: true });
      } else {
        result.push({ text: word1, isDiff: false });
      }
    }
    
    return result;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-7xl max-h-[90vh] flex flex-col m-2 sm:m-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-zinc-800 gap-2 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Scene Comparison</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">Compare scenes side-by-side</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Comparison Mode Toggle */}
            <div className="flex bg-zinc-800 border border-zinc-700 rounded-lg p-1">
              <button
                onClick={() => setComparisonMode('2-way')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  comparisonMode === '2-way'
                    ? 'bg-amber-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                2-Way
              </button>
              <button
                onClick={() => setComparisonMode('3-way')}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  comparisonMode === '3-way'
                    ? 'bg-amber-600 text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                3-Way
              </button>
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
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* Scene Selector */}
          <div className="mb-4 bg-zinc-800 border border-zinc-700 rounded-lg p-3 sm:p-4">
            <h3 className="text-sm font-bold text-white mb-3">Select Scenes to Compare</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {scenes.map((scene) => {
                const isSelected = selectedSceneIds.has(scene.id);
                const isDisabled = !isSelected && selectedSceneIds.size >= (comparisonMode === '2-way' ? 2 : 3);
                return (
                  <button
                    key={scene.id}
                    onClick={() => !isDisabled && toggleSceneSelection(scene.id)}
                    disabled={isDisabled}
                    className={`p-2 rounded border-2 transition-all text-left ${
                      isSelected
                        ? 'border-amber-500 bg-amber-500/10'
                        : isDisabled
                        ? 'border-zinc-700 bg-zinc-900/50 opacity-50 cursor-not-allowed'
                        : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    <div className="text-xs font-bold text-amber-500 mb-1">
                      Scene {scene.sequenceNumber}
                    </div>
                    <div className="text-xs text-zinc-400 truncate">
                      {scene.rawIdea.substring(0, 30)}...
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Comparison View */}
          {selectedScenes.length > 0 && (
            <div className={`grid gap-4 ${
              comparisonMode === '2-way' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1 md:grid-cols-3'
            }`}>
              {selectedScenes.map((scene, index) => {
                const imageUrl = getPrimaryImage(scene.id);
                return (
                  <div
                    key={scene.id}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg overflow-hidden"
                  >
                    {/* Scene Header */}
                    <div className="bg-zinc-900 p-3 border-b border-zinc-700">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-amber-500">
                            Scene {scene.sequenceNumber}
                          </span>
                          {scene.directorSettings?.customSceneId && (
                            <span className="text-xs text-zinc-500">
                              ({scene.directorSettings.customSceneId})
                            </span>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          scene.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                          scene.status === 'planning' ? 'bg-yellow-900/30 text-yellow-400' :
                          'bg-zinc-700 text-zinc-400'
                        }`}>
                          {scene.status}
                        </span>
                      </div>
                    </div>

                    {/* Scene Image */}
                    {imageUrl && (
                      <div className="relative aspect-video bg-black">
                        <img
                          src={imageUrl}
                          alt={`Scene ${scene.sequenceNumber}`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    {/* Scene Details */}
                    <div className="p-3 sm:p-4 space-y-3">
                      {/* Raw Idea */}
                      <div>
                        <label className="text-xs font-bold text-zinc-400 uppercase mb-1 block">
                          Raw Idea
                        </label>
                        <p className="text-sm text-white">{scene.rawIdea}</p>
                      </div>

                      {/* Enhanced Prompt */}
                      <div>
                        <label className="text-xs font-bold text-zinc-400 uppercase mb-1 block">
                          Enhanced Prompt
                        </label>
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                          {scene.enhancedPrompt}
                        </p>
                      </div>

                      {/* Director Settings */}
                      {scene.directorSettings && (
                        <div>
                          <label className="text-xs font-bold text-zinc-400 uppercase mb-2 block">
                            Director Settings
                          </label>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-zinc-500">Lens:</span>
                              <span className="text-white ml-1">{scene.directorSettings.lens}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Angle:</span>
                              <span className="text-white ml-1">{scene.directorSettings.angle}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Lighting:</span>
                              <span className="text-white ml-1">{scene.directorSettings.lighting}</span>
                            </div>
                            <div>
                              <span className="text-zinc-500">Movement:</span>
                              <span className="text-white ml-1">{scene.directorSettings.movement}</span>
                            </div>
                            {scene.directorSettings.dialogue && (
                              <div className="col-span-2">
                                <span className="text-zinc-500">Dialogue:</span>
                                <span className="text-white ml-1 italic">{scene.directorSettings.dialogue}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Context Summary */}
                      {scene.contextSummary && (
                        <div>
                          <label className="text-xs font-bold text-zinc-400 uppercase mb-1 block">
                            Context Summary
                          </label>
                          <p className="text-sm text-zinc-300">{scene.contextSummary}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {selectedScenes.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <p>Select scenes from above to compare</p>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        {selectedScenes.length > 0 && (
          <div className="p-3 sm:p-4 border-t border-zinc-800 flex items-center justify-between gap-2 flex-wrap">
            <div className="text-xs text-zinc-500">
              Comparing {selectedScenes.length} scene{selectedScenes.length > 1 ? 's' : ''}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  // Export comparison as PDF
                  const printWindow = window.open('', '_blank');
                  if (!printWindow) return;
                  
                  let html = `
                    <!DOCTYPE html>
                    <html>
                    <head>
                      <title>Scene Comparison</title>
                      <style>
                        body { font-family: Arial, sans-serif; padding: 20px; background: #fff; color: #000; }
                        .comparison { display: grid; grid-template-columns: repeat(${selectedScenes.length}, 1fr); gap: 20px; }
                        .scene { border: 1px solid #ddd; padding: 15px; }
                        .scene-header { font-weight: bold; margin-bottom: 10px; }
                        .scene-image { max-width: 100%; margin: 10px 0; }
                        h1 { text-align: center; }
                      </style>
                    </head>
                    <body>
                      <h1>Scene Comparison</h1>
                      <div class="comparison">
                  `;
                  
                  selectedScenes.forEach(scene => {
                    html += `
                      <div class="scene">
                        <div class="scene-header">Scene ${scene.sequenceNumber}</div>
                        <div><strong>Raw Idea:</strong> ${scene.rawIdea}</div>
                        <div><strong>Enhanced Prompt:</strong><br>${scene.enhancedPrompt}</div>
                        ${scene.directorSettings ? `
                          <div><strong>Settings:</strong> ${scene.directorSettings.lens}, ${scene.directorSettings.angle}</div>
                        ` : ''}
                      </div>
                    `;
                  });
                  
                  html += `
                      </div>
                    </body>
                    </html>
                  `;
                  
                  printWindow.document.write(html);
                  printWindow.document.close();
                  setTimeout(() => printWindow.print(), 500);
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-sm transition-colors"
              >
                Export as PDF
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SceneComparisonView;

