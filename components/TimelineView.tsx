import React from 'react';
import { Scene } from '../types';

interface TimelineViewProps {
  scenes: Scene[];
  onSceneClick?: (scene: Scene) => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({ scenes, onSceneClick }) => {
  const totalDuration = scenes.length * 8; // Each scene is 8 seconds

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
        <div className="relative mb-8" style={{ height: '120px' }}>
          {/* Scene Blocks */}
          {scenes.map((scene, index) => {
            const startTime = index * 8;
            const width = (8 / totalDuration) * 100;
            const left = (startTime / totalDuration) * 100;

            return (
              <div
                key={scene.id}
                onClick={() => onSceneClick?.(scene)}
                className="absolute top-0 bg-amber-600/20 border border-amber-500/50 rounded p-2 cursor-pointer hover:bg-amber-600/30 transition-all group"
                style={{
                  left: `${left}%`,
                  width: `${width}%`,
                  minWidth: '120px',
                  maxWidth: '200px'
                }}
                title={`Scene ${index + 1}: ${scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`}`}
              >
                <div className="text-xs font-bold text-amber-400 mb-1">
                  {scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`}
                </div>
                <div className="text-[10px] text-zinc-400 line-clamp-2">
                  {scene.enhancedPrompt.substring(0, 60)}...
                </div>
                <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
                  <span>{scene.directorSettings.transition || 'Cut'}</span>
                  {scene.directorSettings.dialogue && (
                    <span className="text-amber-500">💬</span>
                  )}
                </div>
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
          {scenes.map((scene, index) => (
            <div
              key={scene.id}
              onClick={() => onSceneClick?.(scene)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 cursor-pointer hover:border-amber-500/50 transition-all"
            >
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
          ))}
        </div>
      </div>
    </div>
  );
};

export default TimelineView;

