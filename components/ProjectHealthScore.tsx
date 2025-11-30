import React, { useState, useEffect } from 'react';
import { Scene, StoryContext, DirectorSettings } from '../types';

interface ProjectHealthScoreProps {
  scenes: Scene[];
  storyContext: StoryContext;
  settings: DirectorSettings;
  onClose: () => void;
}

interface HealthMetrics {
  overall: number;
  sceneCompletion: number;
  settingsCompleteness: number;
  characterDevelopment: number;
  storyStructure: number;
  exportReadiness: number;
}

interface Suggestion {
  category: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

const ProjectHealthScore: React.FC<ProjectHealthScoreProps> = ({
  scenes,
  storyContext,
  settings,
  onClose
}) => {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    calculateHealthScore();
  }, [scenes, storyContext, settings]);

  const calculateHealthScore = () => {
    // Scene Completion (40%)
    const totalScenes = scenes.length;
    const completedScenes = scenes.filter(s => s.status === 'completed').length;
    const sceneCompletion = totalScenes > 0 ? (completedScenes / totalScenes) * 100 : 0;

    // Director Settings Completeness (20%)
    let settingsScore = 0;
    const settingsCount = scenes.filter(s => {
      const ds = s.directorSettings;
      return ds && ds.lens && ds.angle && ds.lighting && ds.movement;
    }).length;
    settingsScore = totalScenes > 0 ? (settingsCount / totalScenes) * 100 : 0;

    // Character Development (15%)
    const hasCharacters = storyContext.characters && storyContext.characters.trim().length > 0;
    const scenesWithDialogue = scenes.filter(s => s.directorSettings?.dialogue).length;
    const characterDevelopment = (hasCharacters ? 50 : 0) + (totalScenes > 0 ? (scenesWithDialogue / totalScenes) * 50 : 0);

    // Story Structure (15%)
    const hasTitle = storyContext.title && storyContext.title.trim().length > 0;
    const hasGenre = storyContext.genre && storyContext.genre.trim().length > 0;
    const hasPlot = storyContext.plotSummary && storyContext.plotSummary.trim().length > 0;
    const hasContext = storyContext.initialContext && storyContext.initialContext.trim().length > 0;
    const structureScore = (hasTitle ? 25 : 0) + (hasGenre ? 25 : 0) + (hasPlot ? 25 : 0) + (hasContext ? 25 : 0);

    // Export Readiness (10%)
    const hasImages = scenes.some(s => {
      // Check if scene has associated media (simplified check)
      return true; // Assume ready if scenes exist
    });
    const exportReadiness = (totalScenes > 0 ? 50 : 0) + (hasImages ? 50 : 0);

    // Calculate overall score
    const overall = (
      sceneCompletion * 0.40 +
      settingsScore * 0.20 +
      characterDevelopment * 0.15 +
      structureScore * 0.15 +
      exportReadiness * 0.10
    );

    const calculatedMetrics: HealthMetrics = {
      overall: Math.round(overall),
      sceneCompletion: Math.round(sceneCompletion),
      settingsCompleteness: Math.round(settingsScore),
      characterDevelopment: Math.round(characterDevelopment),
      storyStructure: Math.round(structureScore),
      exportReadiness: Math.round(exportReadiness),
    };

    setMetrics(calculatedMetrics);
    generateSuggestions(calculatedMetrics);
  };

  const generateSuggestions = (metrics: HealthMetrics) => {
    const suggs: Suggestion[] = [];

    if (metrics.sceneCompletion < 80) {
      suggs.push({
        category: 'Scene Completion',
        message: `Only ${metrics.sceneCompletion}% of scenes are completed. Complete more scenes to improve your project health.`,
        priority: metrics.sceneCompletion < 50 ? 'high' : 'medium',
      });
    }

    if (metrics.settingsCompleteness < 80) {
      suggs.push({
        category: 'Director Settings',
        message: `Only ${metrics.settingsCompleteness}% of scenes have complete director settings. Add technical specifications to scenes.`,
        priority: metrics.settingsCompleteness < 50 ? 'high' : 'medium',
      });
    }

    if (metrics.characterDevelopment < 70) {
      suggs.push({
        category: 'Character Development',
        message: 'Add character information and dialogue to scenes to improve character development.',
        priority: 'medium',
      });
    }

    if (metrics.storyStructure < 80) {
      suggs.push({
        category: 'Story Structure',
        message: 'Complete project title, genre, plot summary, and initial context for better story structure.',
        priority: 'high',
      });
    }

    if (metrics.overall < 60) {
      suggs.push({
        category: 'Overall',
        message: 'Your project needs attention in multiple areas. Focus on completing scenes and adding details.',
        priority: 'high',
      });
    }

    if (metrics.overall >= 80) {
      suggs.push({
        category: 'Great Job!',
        message: 'Your project is in excellent shape! Consider adding more scenes or refining details.',
        priority: 'low',
      });
    }

    setSuggestions(suggs);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!metrics) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-zinc-500">Calculating health score...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col m-2 sm:m-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-zinc-800 gap-2 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Project Health Score</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">Overall project quality indicator</p>
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
          {/* Overall Score */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-4 border-zinc-700 mb-4 relative">
              <div className={`absolute inset-0 rounded-full ${getScoreBgColor(metrics.overall)} opacity-20`}></div>
              <span className={`text-5xl font-bold ${getScoreColor(metrics.overall)} relative z-10`}>
                {metrics.overall}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Overall Health Score</h3>
            <p className="text-sm text-zinc-400">
              {metrics.overall >= 80 ? 'Excellent' : metrics.overall >= 60 ? 'Good' : 'Needs Improvement'}
            </p>
          </div>

          {/* Metrics Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Scene Completion</span>
                <span className={`text-lg font-bold ${getScoreColor(metrics.sceneCompletion)}`}>
                  {metrics.sceneCompletion}%
                </span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getScoreBgColor(metrics.sceneCompletion)}`}
                  style={{ width: `${metrics.sceneCompletion}%` }}
                ></div>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Weight: 40%</p>
            </div>

            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Settings Completeness</span>
                <span className={`text-lg font-bold ${getScoreColor(metrics.settingsCompleteness)}`}>
                  {metrics.settingsCompleteness}%
                </span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getScoreBgColor(metrics.settingsCompleteness)}`}
                  style={{ width: `${metrics.settingsCompleteness}%` }}
                ></div>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Weight: 20%</p>
            </div>

            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Character Development</span>
                <span className={`text-lg font-bold ${getScoreColor(metrics.characterDevelopment)}`}>
                  {metrics.characterDevelopment}%
                </span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getScoreBgColor(metrics.characterDevelopment)}`}
                  style={{ width: `${metrics.characterDevelopment}%` }}
                ></div>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Weight: 15%</p>
            </div>

            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Story Structure</span>
                <span className={`text-lg font-bold ${getScoreColor(metrics.storyStructure)}`}>
                  {metrics.storyStructure}%
                </span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getScoreBgColor(metrics.storyStructure)}`}
                  style={{ width: `${metrics.storyStructure}%` }}
                ></div>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Weight: 15%</p>
            </div>

            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 sm:col-span-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-zinc-400">Export Readiness</span>
                <span className={`text-lg font-bold ${getScoreColor(metrics.exportReadiness)}`}>
                  {metrics.exportReadiness}%
                </span>
              </div>
              <div className="w-full bg-zinc-900 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${getScoreBgColor(metrics.exportReadiness)}`}
                  style={{ width: `${metrics.exportReadiness}%` }}
                ></div>
              </div>
              <p className="text-xs text-zinc-500 mt-1">Weight: 10%</p>
            </div>
          </div>

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <h3 className="text-sm font-bold text-white mb-3">Suggestions to Improve</h3>
              <div className="space-y-2">
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded border ${
                      suggestion.priority === 'high'
                        ? 'bg-red-900/20 border-red-800/50'
                        : suggestion.priority === 'medium'
                        ? 'bg-yellow-900/20 border-yellow-800/50'
                        : 'bg-green-900/20 border-green-800/50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-zinc-400">{suggestion.category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        suggestion.priority === 'high'
                          ? 'bg-red-900/30 text-red-400'
                          : suggestion.priority === 'medium'
                          ? 'bg-yellow-900/30 text-yellow-400'
                          : 'bg-green-900/30 text-green-400'
                      }`}>
                        {suggestion.priority.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-300">{suggestion.message}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectHealthScore;

