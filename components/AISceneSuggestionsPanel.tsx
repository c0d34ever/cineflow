import React, { useState, useEffect } from 'react';
import { Scene, StoryContext } from '../types';
import { analyzeCharacterRelationships } from '../clientGeminiService';

interface AISceneSuggestionsPanelProps {
  scenes: Scene[];
  storyContext: StoryContext;
  projectId: string;
  onClose: () => void;
  onApplySuggestion: (suggestion: string) => void;
}

interface SceneSuggestion {
  id: string;
  suggestion: string;
  reasoning: string;
  confidence: number;
  type: 'continuation' | 'improvement' | 'transition' | 'climax' | 'resolution';
}

const AISceneSuggestionsPanel: React.FC<AISceneSuggestionsPanelProps> = ({
  scenes,
  storyContext,
  projectId,
  onClose,
  onApplySuggestion
}) => {
  const [suggestions, setSuggestions] = useState<SceneSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggestionType, setSuggestionType] = useState<'next' | 'improve' | 'transition'>('next');
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);

  useEffect(() => {
    if (scenes.length > 0) {
      generateSuggestions();
    }
  }, [suggestionType, selectedScene]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('auth_token');

      let prompt = '';
      let contextScenes = scenes;

      if (suggestionType === 'next') {
        // Suggest next scene
        const recentScenes = scenes.slice(-5); // Last 5 scenes for context
        prompt = `Based on the story so far, suggest 3-5 compelling next scenes. Consider:
- Story progression and pacing
- Character development needs
- Plot advancement
- Scene variety (action, dialogue, transition)
- Story arc completion`;
        contextScenes = recentScenes;
      } else if (suggestionType === 'improve' && selectedScene) {
        // Suggest improvements to selected scene
        prompt = `Analyze this scene and suggest 3-5 improvements:
- Enhance dialogue
- Improve visual description
- Add character development
- Strengthen conflict
- Better pacing`;
        contextScenes = [selectedScene];
      } else if (suggestionType === 'transition') {
        // Suggest transition scenes
        const lastScene = scenes[scenes.length - 1];
        prompt = `Suggest 3-5 transition scenes that bridge the current story to the next major plot point:
- Smooth narrative flow
- Character movement
- Time/location changes
- Emotional transitions`;
        contextScenes = scenes.slice(-3);
      }

      const response = await fetch(`${API_BASE_URL}/gemini/suggest-scenes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          storyContext,
          scenes: contextScenes,
          prompt,
          suggestionType,
          selectedSceneId: selectedScene?.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate suggestions');
      }

      const data = await response.json();
      const generatedSuggestions: SceneSuggestion[] = (data.suggestions || []).map((s: any, idx: number) => ({
        id: `suggestion-${Date.now()}-${idx}`,
        suggestion: s.suggestion || s.text || s,
        reasoning: s.reasoning || s.explanation || '',
        confidence: s.confidence || 0.8,
        type: s.type || 'continuation',
      }));

      setSuggestions(generatedSuggestions);
    } catch (error: any) {
      console.error('Failed to generate suggestions:', error);
      // Fallback: Generate simple suggestions
      generateFallbackSuggestions();
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackSuggestions = () => {
    const lastScene = scenes[scenes.length - 1];
    const fallbackSuggestions: SceneSuggestion[] = [
      {
        id: 'fallback-1',
        suggestion: `Continue the story from Scene ${scenes.length}. Build on the momentum and develop the conflict further.`,
        reasoning: 'Based on story progression, this maintains narrative flow.',
        confidence: 0.7,
        type: 'continuation',
      },
      {
        id: 'fallback-2',
        suggestion: `Introduce a new challenge or obstacle for the main character. Raise the stakes.`,
        reasoning: 'Adding conflict keeps the story engaging.',
        confidence: 0.7,
        type: 'improvement',
      },
      {
        id: 'fallback-3',
        suggestion: `Create a transition scene that moves the story to a new location or time period.`,
        reasoning: 'Transitions help maintain pacing and story flow.',
        confidence: 0.7,
        type: 'transition',
      },
    ];
    setSuggestions(fallbackSuggestions);
  };

  const getTypeColor = (type: SceneSuggestion['type']) => {
    switch (type) {
      case 'continuation':
        return 'bg-blue-900/30 text-blue-400 border-blue-800/50';
      case 'improvement':
        return 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50';
      case 'transition':
        return 'bg-purple-900/30 text-purple-400 border-purple-800/50';
      case 'climax':
        return 'bg-red-900/30 text-red-400 border-red-800/50';
      case 'resolution':
        return 'bg-green-900/30 text-green-400 border-green-800/50';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col m-2 sm:m-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-zinc-800 gap-2 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">AI Scene Suggestions</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">Get AI-powered suggestions for your story</p>
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

        {/* Controls */}
        <div className="p-3 sm:p-4 border-b border-zinc-800 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs text-zinc-400">Suggestion Type:</label>
              <div className="flex bg-zinc-800 border border-zinc-700 rounded-lg p-1">
                <button
                  onClick={() => {
                    setSuggestionType('next');
                    setSelectedScene(null);
                  }}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    suggestionType === 'next'
                      ? 'bg-amber-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Next Scene
                </button>
                <button
                  onClick={() => {
                    setSuggestionType('improve');
                  }}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    suggestionType === 'improve'
                      ? 'bg-amber-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Improve Scene
                </button>
                <button
                  onClick={() => {
                    setSuggestionType('transition');
                    setSelectedScene(null);
                  }}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    suggestionType === 'transition'
                      ? 'bg-amber-600 text-white'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Transition
                </button>
              </div>
            </div>
            <button
              onClick={generateSuggestions}
              disabled={loading}
              className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                  Generating...
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Regenerate
                </>
              )}
            </button>
          </div>

          {/* Scene Selector for Improve Mode */}
          {suggestionType === 'improve' && (
            <div>
              <label className="text-xs text-zinc-400 mb-2 block">Select Scene to Improve:</label>
              <select
                value={selectedScene?.id || ''}
                onChange={(e) => {
                  const scene = scenes.find(s => s.id === e.target.value);
                  setSelectedScene(scene || null);
                }}
                className="w-full sm:w-64 bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
              >
                <option value="">Select a scene...</option>
                {scenes.map(scene => (
                  <option key={scene.id} value={scene.id}>
                    Scene {scene.sequenceNumber}: {scene.rawIdea.substring(0, 50)}...
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                <p className="text-zinc-500">AI is analyzing your story and generating suggestions...</p>
                <p className="text-xs text-zinc-600 mt-2">This may take a moment</p>
              </div>
            </div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p>No suggestions available</p>
              <p className="text-sm mt-2">Click "Regenerate" to get AI suggestions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs px-2 py-1 rounded border ${getTypeColor(suggestion.type)}`}>
                          {suggestion.type}
                        </span>
                        <span className="text-xs text-zinc-500">
                          Confidence: {Math.round(suggestion.confidence * 100)}%
                        </span>
                      </div>
                      <p className="text-sm text-white font-medium mb-2">{suggestion.suggestion}</p>
                      {suggestion.reasoning && (
                        <p className="text-xs text-zinc-400 italic">"{suggestion.reasoning}"</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        onApplySuggestion(suggestion.suggestion);
                        onClose();
                      }}
                      className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-sm transition-colors"
                    >
                      Use This Suggestion
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(suggestion.suggestion);
                      }}
                      className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded text-sm transition-colors"
                      title="Copy to clipboard"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-zinc-800 text-xs text-zinc-500">
          <p>💡 Tip: Use suggestions as inspiration. You can modify them to fit your story perfectly.</p>
        </div>
      </div>
    </div>
  );
};

export default AISceneSuggestionsPanel;

