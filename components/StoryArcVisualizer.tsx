import React, { useState, useEffect, useRef } from 'react';
import { Scene, StoryContext } from '../types';

interface StoryArcVisualizerProps {
  scenes: Scene[];
  storyContext: StoryContext;
  onClose: () => void;
}

interface StoryBeat {
  type: 'inciting_incident' | 'rising_action' | 'climax' | 'falling_action' | 'resolution' | 'plot_point';
  sceneIndex: number;
  description: string;
  confidence: number;
}

interface ArcData {
  act1: Scene[];
  act2: Scene[];
  act3: Scene[];
  beats: StoryBeat[];
  pacing: {
    action: number;
    dialogue: number;
    transition: number;
  };
}

const StoryArcVisualizer: React.FC<StoryArcVisualizerProps> = ({
  scenes,
  storyContext,
  onClose
}) => {
  const [arcData, setArcData] = useState<ArcData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedBeat, setSelectedBeat] = useState<StoryBeat | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    analyzeStoryArc();
  }, [scenes]);

  useEffect(() => {
    if (arcData && canvasRef.current) {
      drawArcVisualization();
    }
  }, [arcData]);

  const analyzeStoryArc = () => {
    if (scenes.length === 0) {
      setArcData(null);
      setLoading(false);
      return;
    }

    // Divide into three acts
    const totalScenes = scenes.length;
    const act1End = Math.ceil(totalScenes * 0.25);
    const act2End = Math.ceil(totalScenes * 0.75);

    const act1 = scenes.slice(0, act1End);
    const act2 = scenes.slice(act1End, act2End);
    const act3 = scenes.slice(act2End);

    // Detect story beats
    const beats: StoryBeat[] = [];

    // Inciting Incident (usually in Act 1, first 20%)
    if (act1.length > 0) {
      const incitingIndex = Math.floor(act1.length * 0.5);
      beats.push({
        type: 'inciting_incident',
        sceneIndex: incitingIndex,
        description: `Inciting Incident: ${act1[incitingIndex]?.rawIdea?.substring(0, 100) || 'Story begins'}...`,
        confidence: 0.8
      });
    }

    // Plot Point 1 (end of Act 1)
    if (act1.length > 0) {
      beats.push({
        type: 'plot_point',
        sceneIndex: act1.length - 1,
        description: `Plot Point 1: End of Act 1 - ${act1[act1.length - 1]?.rawIdea?.substring(0, 100) || 'Act 1 conclusion'}...`,
        confidence: 0.9
      });
    }

    // Rising Action (Act 2, first half)
    if (act2.length > 0) {
      const risingIndex = Math.floor(act2.length * 0.3);
      beats.push({
        type: 'rising_action',
        sceneIndex: act1.length + risingIndex,
        description: `Rising Action: ${act2[risingIndex]?.rawIdea?.substring(0, 100) || 'Conflict escalates'}...`,
        confidence: 0.7
      });
    }

    // Climax (Act 2, end or Act 3, beginning)
    const climaxIndex = act1.length + act2.length - Math.ceil(act2.length * 0.2);
    if (scenes[climaxIndex]) {
      beats.push({
        type: 'climax',
        sceneIndex: climaxIndex,
        description: `Climax: ${scenes[climaxIndex]?.rawIdea?.substring(0, 100) || 'Peak conflict'}...`,
        confidence: 0.85
      });
    }

    // Plot Point 2 (end of Act 2)
    if (act2.length > 0) {
      beats.push({
        type: 'plot_point',
        sceneIndex: act1.length + act2.length - 1,
        description: `Plot Point 2: End of Act 2 - ${act2[act2.length - 1]?.rawIdea?.substring(0, 100) || 'Act 2 conclusion'}...`,
        confidence: 0.9
      });
    }

    // Resolution (Act 3)
    if (act3.length > 0) {
      beats.push({
        type: 'resolution',
        sceneIndex: act1.length + act2.length + Math.floor(act3.length * 0.5),
        description: `Resolution: ${act3[Math.floor(act3.length * 0.5)]?.rawIdea?.substring(0, 100) || 'Story resolves'}...`,
        confidence: 0.8
      });
    }

    // Analyze pacing
    let actionCount = 0;
    let dialogueCount = 0;
    let transitionCount = 0;

    scenes.forEach(scene => {
      const idea = (scene.rawIdea || '').toLowerCase();
      const dialogue = scene.directorSettings?.dialogue || '';
      
      if (idea.includes('fight') || idea.includes('battle') || idea.includes('action') || idea.includes('chase')) {
        actionCount++;
      } else if (dialogue.length > 50 || idea.includes('talk') || idea.includes('conversation')) {
        dialogueCount++;
      } else {
        transitionCount++;
      }
    });

    const total = scenes.length || 1;
    const pacing = {
      action: (actionCount / total) * 100,
      dialogue: (dialogueCount / total) * 100,
      transition: (transitionCount / total) * 100
    };

    setArcData({
      act1,
      act2,
      act3,
      beats,
      pacing
    });
    setLoading(false);
  };

  const drawArcVisualization = () => {
    const canvas = canvasRef.current;
    if (!canvas || !arcData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const padding = 40;
    const plotWidth = width - padding * 2;
    const plotHeight = height - padding * 2;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      const y = padding + (plotHeight / 10) * i;
      ctx.beginPath();
      ctx.moveTo(padding, y);
      ctx.lineTo(width - padding, y);
      ctx.stroke();
    }

    // Draw three-act structure
    const act1Width = (arcData.act1.length / scenes.length) * plotWidth;
    const act2Width = (arcData.act2.length / scenes.length) * plotWidth;
    const act3Width = (arcData.act3.length / scenes.length) * plotWidth;

    // Act 1 background
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(padding, padding, act1Width, plotHeight);

    // Act 2 background
    ctx.fillStyle = '#2d1b3d';
    ctx.fillRect(padding + act1Width, padding, act2Width, plotHeight);

    // Act 3 background
    ctx.fillStyle = '#1e3a5f';
    ctx.fillRect(padding + act1Width + act2Width, padding, act3Width, plotHeight);

    // Draw arc curve
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const points: { x: number; y: number }[] = [];
    const totalScenes = scenes.length;

    scenes.forEach((scene, index) => {
      const x = padding + (index / totalScenes) * plotWidth;
      
      // Calculate tension (height) based on story position
      let tension = 0.3; // Base tension
      
      // Act 1: Rising
      if (index < arcData.act1.length) {
        tension = 0.3 + (index / arcData.act1.length) * 0.3;
      }
      // Act 2: Rising to climax, then falling
      else if (index < arcData.act1.length + arcData.act2.length) {
        const act2Index = index - arcData.act1.length;
        const act2Progress = act2Index / arcData.act2.length;
        if (act2Progress < 0.7) {
          // Rising to climax
          tension = 0.6 + act2Progress * 0.4;
        } else {
          // Falling from climax
          tension = 1.0 - (act2Progress - 0.7) * 0.3;
        }
      }
      // Act 3: Falling to resolution
      else {
        const act3Index = index - arcData.act1.length - arcData.act2.length;
        const act3Progress = act3Index / arcData.act3.length;
        tension = 0.7 - act3Progress * 0.4;
      }

      const y = padding + plotHeight - (tension * plotHeight);
      points.push({ x, y });
    });

    // Draw smooth curve
    if (points.length > 1) {
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const next = points[i + 1] || curr;
        
        const cp1x = prev.x + (curr.x - prev.x) * 0.5;
        const cp1y = prev.y;
        const cp2x = curr.x - (next.x - curr.x) * 0.5;
        const cp2y = curr.y;
        
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, curr.x, curr.y);
      }
    }
    ctx.stroke();

    // Draw story beats
    arcData.beats.forEach(beat => {
      const x = padding + (beat.sceneIndex / scenes.length) * plotWidth;
      const scene = scenes[beat.sceneIndex];
      const index = beat.sceneIndex;
      
      let tension = 0.3;
      if (index < arcData.act1.length) {
        tension = 0.3 + (index / arcData.act1.length) * 0.3;
      } else if (index < arcData.act1.length + arcData.act2.length) {
        const act2Index = index - arcData.act1.length;
        const act2Progress = act2Index / arcData.act2.length;
        tension = act2Progress < 0.7 ? 0.6 + act2Progress * 0.4 : 1.0 - (act2Progress - 0.7) * 0.3;
      } else {
        const act3Index = index - arcData.act1.length - arcData.act2.length;
        tension = 0.7 - (act3Index / arcData.act3.length) * 0.4;
      }
      
      const y = padding + plotHeight - (tension * plotHeight);

      // Draw marker
      const colors: Record<string, string> = {
        inciting_incident: '#3b82f6',
        rising_action: '#10b981',
        climax: '#ef4444',
        falling_action: '#f59e0b',
        resolution: '#8b5cf6',
        plot_point: '#ec4899'
      };

      ctx.fillStyle = colors[beat.type] || '#fbbf24';
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw labels
    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Act 1', padding + act1Width / 2, height - 10);
    ctx.fillText('Act 2', padding + act1Width + act2Width / 2, height - 10);
    ctx.fillText('Act 3', padding + act1Width + act2Width + act3Width / 2, height - 10);

    // Y-axis label
    ctx.save();
    ctx.translate(15, height / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Tension', 0, 0);
    ctx.restore();
  };

  const getBeatColor = (type: string) => {
    const colors: Record<string, string> = {
      inciting_incident: 'bg-blue-900/30 text-blue-400 border-blue-500/50',
      rising_action: 'bg-green-900/30 text-green-400 border-green-500/50',
      climax: 'bg-red-900/30 text-red-400 border-red-500/50',
      falling_action: 'bg-yellow-900/30 text-yellow-400 border-yellow-500/50',
      resolution: 'bg-purple-900/30 text-purple-400 border-purple-500/50',
      plot_point: 'bg-pink-900/30 text-pink-400 border-pink-500/50'
    };
    return colors[type] || 'bg-zinc-800 text-zinc-400 border-zinc-700';
  };

  const formatBeatType = (type: string) => {
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col m-2 sm:m-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-zinc-800 gap-2 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Story Arc Visualizer</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">Three-act structure and story beats</p>
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
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                <p className="text-zinc-500">Analyzing story structure...</p>
              </div>
            </div>
          ) : !arcData ? (
            <div className="text-center py-12 text-zinc-500">
              <p>No scenes available</p>
              <p className="text-sm mt-2">Add scenes to visualize the story arc</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Arc Visualization */}
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <h3 className="text-sm font-bold text-white mb-4">Story Arc</h3>
                <canvas
                  ref={canvasRef}
                  width={800}
                  height={400}
                  className="w-full h-auto bg-zinc-900 rounded border border-zinc-700"
                  style={{ maxHeight: '400px' }}
                />
              </div>

              {/* Three-Act Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-blue-400 mb-2">Act 1: Setup</h4>
                  <p className="text-xs text-zinc-400 mb-2">{arcData.act1.length} scenes</p>
                  <p className="text-xs text-zinc-500">
                    {arcData.act1.length > 0 ? arcData.act1[0]?.rawIdea?.substring(0, 80) + '...' : 'No scenes'}
                  </p>
                </div>
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-purple-400 mb-2">Act 2: Confrontation</h4>
                  <p className="text-xs text-zinc-400 mb-2">{arcData.act2.length} scenes</p>
                  <p className="text-xs text-zinc-500">
                    {arcData.act2.length > 0 ? arcData.act2[0]?.rawIdea?.substring(0, 80) + '...' : 'No scenes'}
                  </p>
                </div>
                <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4">
                  <h4 className="text-sm font-bold text-green-400 mb-2">Act 3: Resolution</h4>
                  <p className="text-xs text-zinc-400 mb-2">{arcData.act3.length} scenes</p>
                  <p className="text-xs text-zinc-500">
                    {arcData.act3.length > 0 ? arcData.act3[0]?.rawIdea?.substring(0, 80) + '...' : 'No scenes'}
                  </p>
                </div>
              </div>

              {/* Story Beats */}
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <h3 className="text-sm font-bold text-white mb-4">Story Beats</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {arcData.beats.map((beat, idx) => (
                    <div
                      key={idx}
                      className={`border rounded-lg p-3 cursor-pointer hover:border-amber-500 transition-colors ${getBeatColor(beat.type)}`}
                      onClick={() => setSelectedBeat(beat)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold">{formatBeatType(beat.type)}</span>
                        <span className="text-xs opacity-70">Scene {beat.sceneIndex + 1}</span>
                      </div>
                      <p className="text-xs opacity-90">{beat.description}</p>
                      <div className="mt-2 text-xs opacity-60">
                        Confidence: {Math.round(beat.confidence * 100)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pacing Analysis */}
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <h3 className="text-sm font-bold text-white mb-4">Scene Pacing</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-400">Action Scenes</span>
                      <span className="text-xs text-zinc-400">{Math.round(arcData.pacing.action)}%</span>
                    </div>
                    <div className="w-full bg-zinc-700 rounded-full h-2">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{ width: `${arcData.pacing.action}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-400">Dialogue Scenes</span>
                      <span className="text-xs text-zinc-400">{Math.round(arcData.pacing.dialogue)}%</span>
                    </div>
                    <div className="w-full bg-zinc-700 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${arcData.pacing.dialogue}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-zinc-400">Transition Scenes</span>
                      <span className="text-xs text-zinc-400">{Math.round(arcData.pacing.transition)}%</span>
                    </div>
                    <div className="w-full bg-zinc-700 rounded-full h-2">
                      <div
                        className="bg-yellow-500 h-2 rounded-full"
                        style={{ width: `${arcData.pacing.transition}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Beat Detail Modal */}
        {selectedBeat && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-10 p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">{formatBeatType(selectedBeat.type)}</h3>
                <button
                  onClick={() => setSelectedBeat(null)}
                  className="text-zinc-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-zinc-300 mb-4">{selectedBeat.description}</p>
              <div className="text-xs text-zinc-500">
                Scene {selectedBeat.sceneIndex + 1} • Confidence: {Math.round(selectedBeat.confidence * 100)}%
              </div>
              {scenes[selectedBeat.sceneIndex] && (
                <div className="mt-4 p-3 bg-zinc-800 rounded border border-zinc-700">
                  <p className="text-xs text-zinc-400 mb-1">Full Scene:</p>
                  <p className="text-sm text-zinc-300">{scenes[selectedBeat.sceneIndex].rawIdea}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryArcVisualizer;

