import React, { useState, useEffect } from 'react';
import { Scene } from '../types';

interface ProjectStatisticsPanelProps {
  projectId: string;
  scenes: Scene[];
  onClose: () => void;
}

interface Statistics {
  totalScenes: number;
  estimatedDuration: number; // in seconds
  statusBreakdown: {
    planning: number;
    generating: number;
    completed: number;
    failed: number;
  };
  characterAppearances: Record<string, number>;
  locationUsage: Record<string, number>;
  dialogueWordCount: number;
  completionPercentage: number;
}

const ProjectStatisticsPanel: React.FC<ProjectStatisticsPanelProps> = ({ projectId, scenes, onClose }) => {
  const [stats, setStats] = useState<Statistics | null>(null);

  useEffect(() => {
    calculateStatistics();
  }, [scenes]);

  const calculateStatistics = () => {
    const totalScenes = scenes.length;
    const estimatedDuration = totalScenes * 8; // 8 seconds per scene

    // Status breakdown
    const statusBreakdown = {
      planning: scenes.filter(s => s.status === 'planning').length,
      generating: scenes.filter(s => s.status === 'generating').length,
      completed: scenes.filter(s => s.status === 'completed').length,
      failed: scenes.filter(s => s.status === 'failed').length,
    };

    // Character appearances (extract from dialogue and context)
    const characterAppearances: Record<string, number> = {};
    scenes.forEach(scene => {
      // Simple extraction - look for character names in dialogue
      const dialogue = scene.directorSettings.dialogue || '';
      const context = scene.contextSummary || '';
      const text = `${dialogue} ${context}`.toLowerCase();
      
      // Common character name patterns (this is simplified - could be enhanced)
      const characterPatterns = /(?:character|actor|person|protagonist|antagonist|hero|villain)\s+(\w+)/gi;
      let match;
      while ((match = characterPatterns.exec(text)) !== null) {
        const name = match[1];
        characterAppearances[name] = (characterAppearances[name] || 0) + 1;
      }
    });

    // Location usage (extract from enhanced prompt and context)
    const locationUsage: Record<string, number> = {};
    scenes.forEach(scene => {
      const prompt = scene.enhancedPrompt.toLowerCase();
      const context = scene.contextSummary?.toLowerCase() || '';
      const text = `${prompt} ${context}`;
      
      // Common location patterns
      const locationPatterns = /(?:in|at|inside|outside|on|near)\s+(?:the\s+)?([a-z]+(?:\s+[a-z]+)?)\s+(?:room|building|house|street|park|forest|beach|office|car|train|plane)/gi;
      let match;
      while ((match = locationPatterns.exec(text)) !== null) {
        const location = match[1];
        locationUsage[location] = (locationUsage[location] || 0) + 1;
      }
    });

    // Dialogue word count
    const dialogueWordCount = scenes.reduce((count, scene) => {
      const dialogue = scene.directorSettings.dialogue || '';
      return count + dialogue.split(/\s+/).filter(word => word.length > 0).length;
    }, 0);

    // Completion percentage
    const completedScenes = statusBreakdown.completed;
    const completionPercentage = totalScenes > 0 
      ? Math.round((completedScenes / totalScenes) * 100) 
      : 0;

    setStats({
      totalScenes,
      estimatedDuration,
      statusBreakdown,
      characterAppearances,
      locationUsage,
      dialogueWordCount,
      completionPercentage,
    });
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-500';
      case 'generating':
        return 'bg-blue-500';
      case 'planning':
        return 'bg-yellow-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-zinc-500';
    }
  };

  if (!stats) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  const topCharacters = Object.entries(stats.characterAppearances)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const topLocations = Object.entries(stats.locationUsage)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Project Statistics</h2>
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
          {/* Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <div className="text-sm text-zinc-400 mb-1">Total Scenes</div>
              <div className="text-3xl font-bold text-white">{stats.totalScenes}</div>
            </div>
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <div className="text-sm text-zinc-400 mb-1">Estimated Duration</div>
              <div className="text-3xl font-bold text-white">{formatDuration(stats.estimatedDuration)}</div>
            </div>
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <div className="text-sm text-zinc-400 mb-1">Completion</div>
              <div className="text-3xl font-bold text-white">{stats.completionPercentage}%</div>
            </div>
          </div>

          {/* Status Breakdown */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-4">Status Breakdown</h3>
            <div className="space-y-3">
              {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                <div key={status} className="flex items-center gap-3">
                  <div className="w-24 text-sm text-zinc-400 capitalize">{status}</div>
                  <div className="flex-1 bg-zinc-900 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full ${getStatusColor(status)} transition-all flex items-center justify-end pr-2`}
                      style={{
                        width: `${stats.totalScenes > 0 ? (count / stats.totalScenes) * 100 : 0}%`,
                      }}
                    >
                      {count > 0 && (
                        <span className="text-xs text-white font-semibold">{count}</span>
                      )}
                    </div>
                  </div>
                  <div className="w-12 text-right text-sm text-zinc-300">{count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Dialogue Stats */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <h3 className="text-lg font-bold text-white mb-2">Dialogue</h3>
            <div className="text-2xl font-bold text-amber-400">{stats.dialogueWordCount.toLocaleString()}</div>
            <div className="text-sm text-zinc-400">Total words across all scenes</div>
          </div>

          {/* Character Appearances */}
          {topCharacters.length > 0 && (
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <h3 className="text-lg font-bold text-white mb-4">Top Characters</h3>
              <div className="space-y-2">
                {topCharacters.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-zinc-300 capitalize">{name}</span>
                    <span className="text-amber-400 font-semibold">{count} appearance{count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location Usage */}
          {topLocations.length > 0 && (
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <h3 className="text-lg font-bold text-white mb-4">Top Locations</h3>
              <div className="space-y-2">
                {topLocations.map(([location, count]) => (
                  <div key={location} className="flex items-center justify-between">
                    <span className="text-zinc-300 capitalize">{location}</span>
                    <span className="text-amber-400 font-semibold">{count} scene{count !== 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProjectStatisticsPanel;

