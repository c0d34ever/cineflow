
import React from 'react';
import { Scene } from '../types';

interface SceneCardProps {
  scene: Scene;
}

const SceneCard: React.FC<SceneCardProps> = ({ scene }) => {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col h-full shadow-lg transition-transform hover:scale-[1.01]">
      {/* Header / Meta */}
      <div className="bg-black/50 p-3 border-b border-zinc-800 flex justify-between items-center">
        <div className="flex items-center gap-2">
           <div className="bg-amber-900/30 text-amber-500 px-2 py-1 rounded text-xs font-mono border border-amber-900/50 font-bold">
             {scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`}
           </div>
           <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">8 Second Clip</div>
        </div>
        <div className="text-[10px] text-zinc-600 font-mono">
           {scene.status === 'generating' ? 'DIRECTING...' : 'LOCKED'}
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

        {/* Enhanced Prompt */}
        <div className="flex-1 min-h-[120px]">
          <h4 className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mb-2 flex items-center gap-2">
            <span>Visual Direction</span>
            <div className="h-px bg-zinc-800 flex-1"></div>
          </h4>
          <div className="text-sm text-zinc-300 font-mono leading-relaxed whitespace-pre-wrap max-h-[400px] overflow-y-auto pr-2 scrollbar-thin border-l-2 border-zinc-800 pl-3">
            {scene.enhancedPrompt}
          </div>
        </div>
        
        {/* Dialogue Section */}
        {scene.directorSettings.dialogue && (
          <div className="bg-zinc-950 border-l-2 border-zinc-700 p-3 my-2">
            <span className="block text-[9px] text-zinc-500 uppercase font-bold mb-1">Dialogue</span>
            <p className="text-sm text-amber-100/90 font-serif italic">"{scene.directorSettings.dialogue}"</p>
          </div>
        )}

        {/* Specs Grid */}
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-zinc-800/50">
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

        {/* Footer: Context */}
        <div className="mt-2 bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
          <div className="flex gap-2">
            <span className="text-[10px] text-zinc-600 uppercase font-bold shrink-0 mt-0.5">Flow Link:</span>
            <p className="text-[10px] text-zinc-500 italic leading-tight line-clamp-2">
              {scene.contextSummary || "Waiting for context..."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SceneCard;
