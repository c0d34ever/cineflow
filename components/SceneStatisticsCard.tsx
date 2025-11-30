import React from 'react';
import { Scene } from '../types';

interface SceneStatisticsCardProps {
  scene: Scene;
  className?: string;
}

const SceneStatisticsCard: React.FC<SceneStatisticsCardProps> = ({ scene, className = '' }) => {
  // Calculate statistics
  const wordCount = (scene.rawIdea || '').split(/\s+/).filter(Boolean).length;
  const enhancedWordCount = (scene.enhancedPrompt || '').split(/\s+/).filter(Boolean).length;
  const dialogueWordCount = (scene.directorSettings?.dialogue || '').split(/\s+/).filter(Boolean).length;
  const dialogueLines = (scene.directorSettings?.dialogue || '').split('\n').filter(Boolean).length;
  
  // Calculate complexity score (0-100)
  const complexityScore = Math.min(100, Math.round(
    (wordCount * 0.3) +
    (enhancedWordCount * 0.2) +
    (dialogueWordCount * 0.3) +
    (dialogueLines * 2) +
    (scene.directorSettings?.stuntInstructions ? 10 : 0) +
    (scene.directorSettings?.physicsFocus ? 5 : 0)
  ));

  // Determine scene type
  const getSceneType = (): string => {
    const idea = (scene.rawIdea || '').toLowerCase();
    const dialogue = scene.directorSettings?.dialogue || '';
    
    if (idea.includes('fight') || idea.includes('battle') || idea.includes('action') || idea.includes('chase')) {
      return 'Action';
    } else if (dialogue.length > 100 || idea.includes('talk') || idea.includes('conversation')) {
      return 'Dialogue';
    } else if (idea.includes('transition') || idea.includes('cut to')) {
      return 'Transition';
    } else {
      return 'Narrative';
    }
  };

  const sceneType = getSceneType();
  const typeColors: Record<string, string> = {
    Action: 'bg-red-900/30 text-red-400 border-red-500/50',
    Dialogue: 'bg-blue-900/30 text-blue-400 border-blue-500/50',
    Transition: 'bg-yellow-900/30 text-yellow-400 border-yellow-500/50',
    Narrative: 'bg-green-900/30 text-green-400 border-green-500/50'
  };

  return (
    <div className={`bg-zinc-800 border border-zinc-700 rounded-lg p-3 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-xs font-bold text-zinc-400 uppercase">Scene Statistics</h4>
        <span className={`text-xs px-2 py-1 rounded border ${typeColors[sceneType]}`}>
          {sceneType}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <div className="text-xs text-zinc-500 mb-1">Word Count</div>
          <div className="text-sm font-bold text-white">{wordCount}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-1">Enhanced Words</div>
          <div className="text-sm font-bold text-white">{enhancedWordCount}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-1">Dialogue Words</div>
          <div className="text-sm font-bold text-white">{dialogueWordCount}</div>
        </div>
        <div>
          <div className="text-xs text-zinc-500 mb-1">Dialogue Lines</div>
          <div className="text-sm font-bold text-white">{dialogueLines}</div>
        </div>
      </div>

      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-zinc-500">Complexity Score</span>
          <span className="text-xs font-bold text-white">{complexityScore}/100</span>
        </div>
        <div className="w-full bg-zinc-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              complexityScore < 30 ? 'bg-green-500' :
              complexityScore < 60 ? 'bg-yellow-500' :
              complexityScore < 80 ? 'bg-orange-500' : 'bg-red-500'
            }`}
            style={{ width: `${complexityScore}%` }}
          />
        </div>
      </div>

      <div className="text-xs text-zinc-600 space-y-1">
        <div className="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
          <span>Duration: ~8 seconds</span>
        </div>
        {scene.directorSettings?.stuntInstructions && (
          <div className="flex items-center gap-2 text-red-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>Contains Stunts</span>
          </div>
        )}
        {scene.directorSettings?.physicsFocus && (
          <div className="flex items-center gap-2 text-blue-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
            <span>Physics Focus</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default SceneStatisticsCard;

