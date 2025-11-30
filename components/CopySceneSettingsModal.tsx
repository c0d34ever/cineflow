import React, { useState } from 'react';
import { Scene, DirectorSettings } from '../types';

interface CopySceneSettingsModalProps {
  sourceScene: Scene;
  targetScenes: Scene[];
  onClose: () => void;
  onCopy: (targetSceneIds: string[], settings: DirectorSettings) => void;
}

const CopySceneSettingsModal: React.FC<CopySceneSettingsModalProps> = ({
  sourceScene,
  targetScenes,
  onClose,
  onCopy
}) => {
  const [selectedTargets, setSelectedTargets] = useState<Set<string>>(
    new Set(targetScenes.map(s => s.id))
  );
  const [settingsToCopy, setSettingsToCopy] = useState({
    lens: true,
    angle: true,
    lighting: true,
    movement: true,
    zoom: true,
    sound: true,
    dialogue: false,
    stuntInstructions: false,
    physicsFocus: true,
    style: true,
    transition: true,
    customSceneId: false,
  });

  const toggleTarget = (sceneId: string) => {
    const newSet = new Set(selectedTargets);
    if (newSet.has(sceneId)) {
      newSet.delete(sceneId);
    } else {
      newSet.add(sceneId);
    }
    setSelectedTargets(newSet);
  };

  const handleSelectAll = () => {
    if (selectedTargets.size === targetScenes.length) {
      setSelectedTargets(new Set());
    } else {
      setSelectedTargets(new Set(targetScenes.map(s => s.id)));
    }
  };

  const handleCopy = () => {
    if (selectedTargets.size === 0) {
      alert('Please select at least one scene to copy settings to');
      return;
    }

    const settings: Partial<DirectorSettings> = {};
    if (settingsToCopy.lens) settings.lens = sourceScene.directorSettings?.lens;
    if (settingsToCopy.angle) settings.angle = sourceScene.directorSettings?.angle;
    if (settingsToCopy.lighting) settings.lighting = sourceScene.directorSettings?.lighting;
    if (settingsToCopy.movement) settings.movement = sourceScene.directorSettings?.movement;
    if (settingsToCopy.zoom) settings.zoom = sourceScene.directorSettings?.zoom;
    if (settingsToCopy.sound) settings.sound = sourceScene.directorSettings?.sound;
    if (settingsToCopy.dialogue) settings.dialogue = sourceScene.directorSettings?.dialogue;
    if (settingsToCopy.stuntInstructions) settings.stuntInstructions = sourceScene.directorSettings?.stuntInstructions;
    if (settingsToCopy.physicsFocus !== undefined) settings.physicsFocus = sourceScene.directorSettings?.physicsFocus;
    if (settingsToCopy.style) settings.style = sourceScene.directorSettings?.style;
    if (settingsToCopy.transition) settings.transition = sourceScene.directorSettings?.transition;
    if (settingsToCopy.customSceneId) settings.customSceneId = sourceScene.directorSettings?.customSceneId;

    onCopy(Array.from(selectedTargets), settings as DirectorSettings);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col m-2 sm:m-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-zinc-800 gap-2 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Copy Scene Settings</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Copy settings from Scene {sourceScene.sequenceNumber} to other scenes
            </p>
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
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* Source Scene Info */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-bold text-white mb-2">Source Scene</h3>
            <div className="text-sm text-zinc-300">
              <div className="font-bold text-amber-500">Scene {sourceScene.sequenceNumber}</div>
              <div className="text-xs text-zinc-500 mt-1">{sourceScene.rawIdea.substring(0, 100)}...</div>
            </div>
          </div>

          {/* Settings to Copy */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-bold text-white mb-3">Settings to Copy</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(settingsToCopy).map(([key, value]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => setSettingsToCopy({ ...settingsToCopy, [key]: e.target.checked })}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                  />
                  <span className="text-xs text-zinc-300 capitalize">
                    {key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Target Scenes */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white">Target Scenes</h3>
              <button
                onClick={handleSelectAll}
                className="text-xs px-3 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
              >
                {selectedTargets.size === targetScenes.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {targetScenes.map((scene) => (
                <label
                  key={scene.id}
                  className="flex items-center gap-3 p-2 bg-zinc-900 rounded hover:bg-zinc-800 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTargets.has(scene.id)}
                    onChange={() => toggleTarget(scene.id)}
                    className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <div className="text-sm font-bold text-amber-500">Scene {scene.sequenceNumber}</div>
                    <div className="text-xs text-zinc-500">{scene.rawIdea.substring(0, 60)}...</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-800 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-sm transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-sm transition-colors"
          >
            Copy to {selectedTargets.size} Scene{selectedTargets.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CopySceneSettingsModal;

