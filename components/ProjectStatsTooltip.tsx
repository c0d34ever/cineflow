import React from 'react';
import { ProjectData } from '../db';

interface ProjectStatsTooltipProps {
  project: ProjectData;
  position: { x: number; y: number };
}

const ProjectStatsTooltip: React.FC<ProjectStatsTooltipProps> = ({ project, position }) => {
  const totalScenes = project.scenes.length;
  const completedScenes = project.scenes.filter(s => s.status === 'completed').length;
  const planningScenes = project.scenes.filter(s => s.status === 'planning').length;
  const generatingScenes = project.scenes.filter(s => s.status === 'generating').length;
  const failedScenes = project.scenes.filter(s => s.status === 'failed').length;
  const completionPercentage = totalScenes > 0 ? Math.round((completedScenes / totalScenes) * 100) : 0;
  const estimatedDuration = totalScenes * 8; // 8 seconds per scene
  const hasCover = !!project.context.coverImageUrl;
  const hasCharacters = project.context.characters && project.context.characters.trim().length > 0;
  const hasLocations = project.context.locations && project.context.locations.trim().length > 0;

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div
      className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl p-4 min-w-[280px] pointer-events-none"
      style={{
        left: `${position.x + 10}px`,
        top: `${position.y + 10}px`,
        transform: 'translateY(-50%)'
      }}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="border-b border-zinc-800 pb-2">
          <h4 className="text-sm font-bold text-white">{project.context.title}</h4>
          <p className="text-xs text-zinc-400">{project.context.genre}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <div className="text-zinc-500">Total Scenes</div>
            <div className="text-white font-semibold">{totalScenes}</div>
          </div>
          <div>
            <div className="text-zinc-500">Completion</div>
            <div className="text-green-400 font-semibold">{completionPercentage}%</div>
          </div>
          <div>
            <div className="text-zinc-500">Duration</div>
            <div className="text-white font-semibold">{formatDuration(estimatedDuration)}</div>
          </div>
          <div>
            <div className="text-zinc-500">Last Updated</div>
            <div className="text-white font-semibold">
              {new Date(project.context.lastUpdated).toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Status Breakdown */}
        <div className="space-y-1">
          <div className="text-xs text-zinc-500 mb-1">Status Breakdown</div>
          <div className="flex gap-2 flex-wrap">
            {completedScenes > 0 && (
              <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded border border-green-900/50">
                {completedScenes} Done
              </span>
            )}
            {planningScenes > 0 && (
              <span className="text-xs bg-yellow-900/30 text-yellow-400 px-2 py-0.5 rounded border border-yellow-900/50">
                {planningScenes} Planning
              </span>
            )}
            {generatingScenes > 0 && (
              <span className="text-xs bg-blue-900/30 text-blue-400 px-2 py-0.5 rounded border border-blue-900/50">
                {generatingScenes} Generating
              </span>
            )}
            {failedScenes > 0 && (
              <span className="text-xs bg-red-900/30 text-red-400 px-2 py-0.5 rounded border border-red-900/50">
                {failedScenes} Failed
              </span>
            )}
          </div>
        </div>

        {/* Project Info */}
        <div className="space-y-1 pt-2 border-t border-zinc-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Cover Image</span>
            <span className={hasCover ? 'text-green-400' : 'text-zinc-600'}>
              {hasCover ? '✓' : '✗'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Characters</span>
            <span className={hasCharacters ? 'text-green-400' : 'text-zinc-600'}>
              {hasCharacters ? '✓' : '✗'}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Locations</span>
            <span className={hasLocations ? 'text-green-400' : 'text-zinc-600'}>
              {hasLocations ? '✓' : '✗'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectStatsTooltip;

