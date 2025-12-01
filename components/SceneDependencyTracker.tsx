import React, { useState, useEffect, useMemo } from 'react';
import { Scene, StoryContext } from '../types';

interface SceneDependencyTrackerProps {
  scenes: Scene[];
  storyContext: StoryContext;
  projectId?: string;
  onClose: () => void;
}

interface Dependency {
  fromSceneId: string;
  toSceneId: string;
  type: 'context' | 'character' | 'location' | 'plot_point' | 'continuity';
  strength: number;
  description: string;
}

interface SceneNode {
  sceneId: string;
  sequenceNumber: number;
  dependencies: Dependency[];
  dependents: Dependency[];
  characters: string[];
  locations: string[];
  plotPoints: string[];
}

const SceneDependencyTracker: React.FC<SceneDependencyTrackerProps> = ({
  scenes,
  storyContext,
  projectId,
  onClose
}) => {
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'graph' | 'list' | 'issues'>('graph');
  const [filterType, setFilterType] = useState<'all' | 'context' | 'character' | 'location' | 'plot_point'>('all');

  // Extract characters from story context
  const characters = useMemo(() => {
    return storyContext.characters || [];
  }, [storyContext.characters]);

  // Extract locations from story context
  const locations = useMemo(() => {
    return storyContext.locations || [];
  }, [storyContext.locations]);

  // Analyze scene dependencies
  const sceneNodes = useMemo(() => {
    const nodes: Map<string, SceneNode> = new Map();

    scenes.forEach(scene => {
      const charactersInScene: string[] = [];
      const locationsInScene: string[] = [];
      const plotPoints: string[] = [];

      // Extract characters mentioned in scene
      const sceneText = `${scene.rawIdea} ${scene.enhancedPrompt} ${scene.contextSummary} ${scene.directorSettings?.dialogue || ''}`.toLowerCase();
      characters.forEach(char => {
        if (sceneText.includes(char.name.toLowerCase())) {
          charactersInScene.push(char.name);
        }
      });

      // Extract locations mentioned in scene
      locations.forEach(loc => {
        if (sceneText.includes(loc.name.toLowerCase())) {
          locationsInScene.push(loc.name);
        }
      });

      // Detect plot points (keywords that indicate story beats)
      const plotKeywords = ['reveal', 'twist', 'climax', 'confrontation', 'resolution', 'conflict', 'tension', 'discovery'];
      plotKeywords.forEach(keyword => {
        if (sceneText.includes(keyword)) {
          plotPoints.push(keyword);
        }
      });

      nodes.set(scene.id, {
        sceneId: scene.id,
        sequenceNumber: scene.sequenceNumber,
        dependencies: [],
        dependents: [],
        characters: charactersInScene,
        locations: locationsInScene,
        plotPoints
      });
    });

    // Build dependency graph
    scenes.forEach((scene, index) => {
      const node = nodes.get(scene.id);
      if (!node) return;

      // Context dependency: each scene depends on previous scenes
      if (index > 0) {
        const prevScene = scenes[index - 1];
        const prevNode = nodes.get(prevScene.id);
        if (prevNode) {
          const contextDep: Dependency = {
            fromSceneId: prevScene.id,
            toSceneId: scene.id,
            type: 'context',
            strength: 1.0,
            description: `Context flow from Scene ${prevScene.sequenceNumber}`
          };
          node.dependencies.push(contextDep);
          prevNode.dependents.push(contextDep);
        }
      }

      // Character dependencies: scenes with same characters
      scenes.forEach(otherScene => {
        if (otherScene.id === scene.id || otherScene.sequenceNumber >= scene.sequenceNumber) return;
        
        const sharedCharacters = node.characters.filter(char => 
          nodes.get(otherScene.id)?.characters.includes(char)
        );

        if (sharedCharacters.length > 0) {
          const charDep: Dependency = {
            fromSceneId: otherScene.id,
            toSceneId: scene.id,
            type: 'character',
            strength: sharedCharacters.length / Math.max(node.characters.length, 1),
            description: `Shared characters: ${sharedCharacters.join(', ')}`
          };
          node.dependencies.push(charDep);
          const otherNode = nodes.get(otherScene.id);
          if (otherNode) {
            otherNode.dependents.push(charDep);
          }
        }
      });

      // Location dependencies: scenes in same location
      scenes.forEach(otherScene => {
        if (otherScene.id === scene.id || otherScene.sequenceNumber >= scene.sequenceNumber) return;
        
        const sharedLocations = node.locations.filter(loc => 
          nodes.get(otherScene.id)?.locations.includes(loc)
        );

        if (sharedLocations.length > 0) {
          const locDep: Dependency = {
            fromSceneId: otherScene.id,
            toSceneId: scene.id,
            type: 'location',
            strength: 0.7,
            description: `Same location: ${sharedLocations.join(', ')}`
          };
          node.dependencies.push(locDep);
          const otherNode = nodes.get(otherScene.id);
          if (otherNode) {
            otherNode.dependents.push(locDep);
          }
        }
      });
    });

    return Array.from(nodes.values());
  }, [scenes, characters, locations]);

  // Detect potential issues
  const issues = useMemo(() => {
    const detectedIssues: Array<{
      type: 'missing_context' | 'orphan_scene' | 'circular_dependency' | 'character_continuity' | 'location_continuity';
      sceneId: string;
      severity: 'low' | 'medium' | 'high';
      message: string;
    }> = [];

    sceneNodes.forEach(node => {
      // Check for missing context
      if (node.sequenceNumber > 1 && node.dependencies.filter(d => d.type === 'context').length === 0) {
        detectedIssues.push({
          type: 'missing_context',
          sceneId: node.sceneId,
          severity: 'medium',
          message: `Scene ${node.sequenceNumber} may be missing context from previous scenes`
        });
      }

      // Check for orphan scenes (no dependencies or dependents)
      if (node.dependencies.length === 0 && node.dependents.length === 0 && scenes.length > 1) {
        detectedIssues.push({
          type: 'orphan_scene',
          sceneId: node.sceneId,
          severity: 'low',
          message: `Scene ${node.sequenceNumber} appears isolated from the story flow`
        });
      }

      // Check character continuity
      node.characters.forEach(char => {
        const prevScenesWithChar = sceneNodes.filter(n => 
          n.sequenceNumber < node.sequenceNumber && n.characters.includes(char)
        );
        if (prevScenesWithChar.length > 0) {
          const lastSceneWithChar = prevScenesWithChar[prevScenesWithChar.length - 1];
          const gap = node.sequenceNumber - lastSceneWithChar.sequenceNumber;
          if (gap > 5) {
            detectedIssues.push({
              type: 'character_continuity',
              sceneId: node.sceneId,
              severity: 'low',
              message: `${char} reappears after ${gap} scenes - check continuity`
            });
          }
        }
      });
    });

    return detectedIssues;
  }, [sceneNodes, scenes]);

  const selectedNode = selectedSceneId ? sceneNodes.find(n => n.sceneId === selectedSceneId) : null;
  const filteredDependencies = selectedNode 
    ? selectedNode.dependencies.filter(d => filterType === 'all' || d.type === filterType)
    : [];

  const getDependencyColor = (type: Dependency['type']) => {
    switch (type) {
      case 'context': return 'text-blue-400';
      case 'character': return 'text-purple-400';
      case 'location': return 'text-green-400';
      case 'plot_point': return 'text-amber-400';
      case 'continuity': return 'text-red-400';
      default: return 'text-zinc-400';
    }
  };

  const getSeverityColor = (severity: 'low' | 'medium' | 'high') => {
    switch (severity) {
      case 'high': return 'text-red-400 bg-red-900/20 border-red-800';
      case 'medium': return 'text-amber-400 bg-amber-900/20 border-amber-800';
      case 'low': return 'text-blue-400 bg-blue-900/20 border-blue-800';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Scene Dependency Tracker</h2>
            <p className="text-sm text-zinc-400 mt-1">
              {scenes.length} scenes • {sceneNodes.reduce((sum, n) => sum + n.dependencies.length, 0)} dependencies • {issues.length} issues
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {/* View Mode Tabs */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                viewMode === 'graph' ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              Dependency Graph
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                viewMode === 'list' ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              Scene List
            </button>
            <button
              onClick={() => setViewMode('issues')}
              className={`px-3 py-1.5 text-xs rounded transition-colors relative ${
                viewMode === 'issues' ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              Issues
              {issues.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {issues.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {viewMode === 'graph' && (
            <div className="space-y-6">
              {/* Scene Timeline */}
              <div className="relative">
                <div className="flex gap-4 overflow-x-auto pb-4">
                  {sceneNodes.map((node, index) => {
                    const scene = scenes.find(s => s.id === node.sceneId);
                    const isSelected = selectedSceneId === node.sceneId;
                    const hasIssues = issues.some(i => i.sceneId === node.sceneId);

                    return (
                      <div
                        key={node.sceneId}
                        onClick={() => setSelectedSceneId(isSelected ? null : node.sceneId)}
                        className={`flex-shrink-0 w-32 bg-zinc-800 border-2 rounded-lg p-3 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-amber-500 bg-amber-900/20' 
                            : hasIssues
                            ? 'border-red-500/50 bg-red-900/10'
                            : 'border-zinc-700 hover:border-zinc-600'
                        }`}
                      >
                        <div className="text-xs font-bold text-amber-500 mb-2">
                          Scene {node.sequenceNumber}
                        </div>
                        {hasIssues && (
                          <div className="text-[10px] text-red-400 mb-1">
                            ⚠ {issues.filter(i => i.sceneId === node.sceneId).length} issue{issues.filter(i => i.sceneId === node.sceneId).length > 1 ? 's' : ''}
                          </div>
                        )}
                        <div className="text-[10px] text-zinc-400 space-y-1">
                          <div>{node.dependencies.length} deps</div>
                          <div>{node.dependents.length} dependents</div>
                          {node.characters.length > 0 && (
                            <div className="text-purple-400">{node.characters.length} chars</div>
                          )}
                          {node.locations.length > 0 && (
                            <div className="text-green-400">{node.locations.length} locs</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Dependency Lines Visualization */}
                {selectedNode && (
                  <div className="mt-4 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-white">Scene {selectedNode.sequenceNumber} Dependencies</h3>
                      <select
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="text-xs bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-zinc-300"
                      >
                        <option value="all">All Types</option>
                        <option value="context">Context</option>
                        <option value="character">Character</option>
                        <option value="location">Location</option>
                        <option value="plot_point">Plot Point</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      {filteredDependencies.length === 0 ? (
                        <p className="text-sm text-zinc-500">No dependencies found</p>
                      ) : (
                        filteredDependencies.map((dep, idx) => {
                          const fromScene = scenes.find(s => s.id === dep.fromSceneId);
                          return (
                            <div
                              key={idx}
                              className="flex items-center gap-3 p-2 bg-zinc-900 rounded border border-zinc-800"
                            >
                              <div className={`text-xs font-semibold ${getDependencyColor(dep.type)}`}>
                                {dep.type.toUpperCase()}
                              </div>
                              <div className="flex-1 text-sm text-zinc-300">
                                <span className="text-amber-400">Scene {fromScene?.sequenceNumber}</span>
                                {' → '}
                                <span className="text-blue-400">Scene {selectedNode.sequenceNumber}</span>
                              </div>
                              <div className="text-xs text-zinc-500">{dep.description}</div>
                              <div className="text-xs text-zinc-600">
                                {(dep.strength * 100).toFixed(0)}%
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {viewMode === 'list' && (
            <div className="space-y-3">
              {sceneNodes.map(node => {
                const scene = scenes.find(s => s.id === node.sceneId);
                const sceneIssues = issues.filter(i => i.sceneId === node.sceneId);

                return (
                  <div
                    key={node.sceneId}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-white">Scene {node.sequenceNumber}</h3>
                        <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                          {scene?.rawIdea || 'No description'}
                        </p>
                      </div>
                      {sceneIssues.length > 0 && (
                        <span className="text-xs bg-red-900/30 text-red-400 px-2 py-1 rounded">
                          {sceneIssues.length} issue{sceneIssues.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <div className="text-zinc-500 mb-1">Dependencies</div>
                        <div className="space-y-1">
                          {node.dependencies.length === 0 ? (
                            <span className="text-zinc-600">None</span>
                          ) : (
                            node.dependencies.map((dep, idx) => {
                              const fromScene = scenes.find(s => s.id === dep.fromSceneId);
                              return (
                                <div key={idx} className={`${getDependencyColor(dep.type)}`}>
                                  Scene {fromScene?.sequenceNumber} ({dep.type})
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                      <div>
                        <div className="text-zinc-500 mb-1">Elements</div>
                        <div className="space-y-1">
                          {node.characters.length > 0 && (
                            <div className="text-purple-400">
                              Characters: {node.characters.join(', ')}
                            </div>
                          )}
                          {node.locations.length > 0 && (
                            <div className="text-green-400">
                              Locations: {node.locations.join(', ')}
                            </div>
                          )}
                          {node.plotPoints.length > 0 && (
                            <div className="text-amber-400">
                              Plot Points: {node.plotPoints.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {viewMode === 'issues' && (
            <div className="space-y-3">
              {issues.length === 0 ? (
                <div className="text-center py-12 text-zinc-500">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>No issues detected! All scenes are properly connected.</p>
                </div>
              ) : (
                issues.map((issue, idx) => {
                  const scene = scenes.find(s => s.id === issue.sceneId);
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${getSeverityColor(issue.severity)}`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase">
                            {issue.severity}
                          </span>
                          <span className="text-xs text-zinc-500">
                            Scene {scene?.sequenceNumber}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-500">
                          {issue.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300">{issue.message}</p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SceneDependencyTracker;

