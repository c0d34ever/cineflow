import React, { useState, useEffect, useRef } from 'react';
import { Scene, StoryContext } from '../types';
import { charactersService } from '../apiServices';

interface CharacterRelationshipGraphProps {
  scenes: Scene[];
  projectId: string;
  storyContext: StoryContext;
  onClose: () => void;
}

interface Character {
  id: number;
  name: string;
  description?: string;
  role?: string;
}

interface Relationship {
  character1: string;
  character2: string;
  strength: number; // 0-1, based on interaction frequency
  scenes: number[]; // Scene IDs where they interact
  type: 'allies' | 'enemies' | 'neutral' | 'romantic' | 'family';
}

const CharacterRelationshipGraph: React.FC<CharacterRelationshipGraphProps> = ({
  scenes,
  projectId,
  storyContext,
  onClose
}) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<'all' | 'allies' | 'enemies' | 'neutral'>('all');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    loadCharacters();
  }, [projectId]);

  useEffect(() => {
    if (characters.length > 0 && scenes.length > 0) {
      analyzeRelationships();
    }
  }, [characters, scenes]);

  useEffect(() => {
    if (canvasRef.current && relationships.length > 0) {
      drawGraph();
    }
  }, [relationships, selectedCharacter, filterType]);

  const loadCharacters = async () => {
    try {
      const response = await charactersService.getByProject(projectId);
      // Handle both response formats: { characters: [...] } or direct array
      const chars = (response as any)?.characters || (Array.isArray(response) ? response : []);
      setCharacters(Array.isArray(chars) ? chars : []);
    } catch (error) {
      console.error('Failed to load characters:', error);
      setCharacters([]);
    } finally {
      setLoading(false);
    }
  };

  const analyzeRelationships = () => {
    // Build character map from database characters
    const charMap = new Map<string, Character>();
    characters.forEach(char => {
      charMap.set(char.name.toLowerCase(), char);
    });

    // Also extract character names from scenes if no characters in database
    const extractedChars = new Set<string>();
    const charNamePattern = /(?:^|\s)([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\s*:|\s+said|\s+says)/g;
    
    scenes.forEach(scene => {
      const text = `${scene.directorSettings?.dialogue || ''} ${scene.enhancedPrompt || ''} ${scene.contextSummary || ''} ${scene.rawIdea || ''}`;
      
      // Extract potential character names (capitalized words before colons or dialogue markers)
      const dialogueMatches = text.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*[:"]/g) || [];
      dialogueMatches.forEach(match => {
        const name = match.replace(/[:"]/g, '').trim();
        if (name.length > 1 && name.length < 30) {
          extractedChars.add(name);
        }
      });
      
      // Also check for common character patterns
      const commonPatterns = [
        /(?:character|protagonist|antagonist|hero|villain|person|man|woman|boy|girl)\s+([A-Z][a-z]+)/gi,
        /([A-Z][a-z]+)\s+(?:said|says|replied|answered|whispered|shouted)/gi,
      ];
      
      commonPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          const name = match[1] || match[0];
          if (name && name.length > 1 && name.length < 30) {
            extractedChars.add(name);
          }
        }
      });
    });

    // Combine database characters with extracted ones
    const allChars = new Set<string>();
    characters.forEach(char => allChars.add(char.name));
    extractedChars.forEach(name => {
      // Only add if it looks like a proper name (not common words)
      const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
      if (!commonWords.includes(name.toLowerCase()) && name.length > 1) {
        allChars.add(name);
      }
    });

    if (allChars.size === 0) {
      setRelationships([]);
      return;
    }

    // Extract character mentions from scenes
    const interactions = new Map<string, { count: number; scenes: number[] }>();

    scenes.forEach(scene => {
      const mentionedChars = new Set<string>();
      const sceneText = `${scene.directorSettings?.dialogue || ''} ${scene.enhancedPrompt || ''} ${scene.contextSummary || ''} ${scene.rawIdea || ''}`.toLowerCase();
      
      // Check for character mentions
      allChars.forEach(charName => {
        const lowerName = charName.toLowerCase();
        // Check if character name appears in scene (whole word match)
        const regex = new RegExp(`\\b${lowerName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(sceneText)) {
          mentionedChars.add(charName);
        }
      });

      // Create relationships between all mentioned characters in this scene
      const charArray = Array.from(mentionedChars);
      for (let i = 0; i < charArray.length; i++) {
        for (let j = i + 1; j < charArray.length; j++) {
          const char1 = charArray[i];
          const char2 = charArray[j];
          const key = [char1, char2].sort().join('|');
          
          if (!interactions.has(key)) {
            interactions.set(key, { count: 0, scenes: [] });
          }
          const data = interactions.get(key)!;
          data.count++;
          if (!data.scenes.includes(scene.sequenceNumber)) {
            data.scenes.push(scene.sequenceNumber);
          }
        }
      }
    });

    // Convert to relationship array
    const rels: Relationship[] = [];
    const maxInteractions = Math.max(...Array.from(interactions.values()).map(d => d.count), 1);

    interactions.forEach((data, key) => {
      const [char1, char2] = key.split('|');
      const strength = data.count / maxInteractions;
      
      // Determine relationship type
      let type: Relationship['type'] = 'neutral';
      if (strength > 0.7) type = 'allies';
      else if (strength > 0.4) type = 'neutral';
      
      rels.push({
        character1: char1,
        character2: char2,
        strength,
        scenes: data.scenes,
        type
      });
    });

    setRelationships(rels);
  };

  const drawGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = Math.max(600, canvas.offsetHeight || 600);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Filter relationships
    const filteredRels = relationships.filter(rel => {
      if (filterType !== 'all' && rel.type !== filterType) return false;
      if (selectedCharacter) {
        return rel.character1 === selectedCharacter || rel.character2 === selectedCharacter;
      }
      return true;
    });

    // Get unique characters from filtered relationships
    const activeChars = new Set<string>();
    filteredRels.forEach(rel => {
      activeChars.add(rel.character1);
      activeChars.add(rel.character2);
    });

    // Also include characters from database that might not have relationships yet
    if (activeChars.size === 0 && characters.length > 0) {
      characters.forEach(char => activeChars.add(char.name));
    }

    const charArray = Array.from(activeChars);
    if (charArray.length === 0) {
      ctx.fillStyle = '#71717a';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('No characters found', canvas.width / 2, canvas.height / 2 - 20);
      ctx.font = '12px Arial';
      ctx.fillText('Add characters or ensure scenes mention character names', canvas.width / 2, canvas.height / 2 + 10);
      return;
    }

    // Calculate positions in a circle
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(canvas.width, canvas.height) * 0.3;
    const positions = new Map<string, { x: number; y: number }>();

    charArray.forEach((char, index) => {
      const angle = (2 * Math.PI * index) / charArray.length - Math.PI / 2;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      positions.set(char, { x, y });
    });

    // Draw relationships (edges)
    filteredRels.forEach(rel => {
      const pos1 = positions.get(rel.character1);
      const pos2 = positions.get(rel.character2);
      if (!pos1 || !pos2) return;

      // Color based on relationship type
      let color = '#71717a'; // neutral
      if (rel.type === 'allies') color = '#10b981'; // green
      else if (rel.type === 'enemies') color = '#ef4444'; // red
      else if (rel.type === 'romantic') color = '#ec4899'; // pink
      else if (rel.type === 'family') color = '#8b5cf6'; // purple

      // Opacity based on strength
      const alpha = 0.3 + rel.strength * 0.5;
      ctx.strokeStyle = color;
      ctx.globalAlpha = alpha;
      ctx.lineWidth = 2 + rel.strength * 3;

      ctx.beginPath();
      ctx.moveTo(pos1.x, pos1.y);
      ctx.lineTo(pos2.x, pos2.y);
      ctx.stroke();
    });

    ctx.globalAlpha = 1;

    // Draw character nodes
    charArray.forEach(char => {
      const pos = positions.get(char)!;
      const isSelected = selectedCharacter === char;

      // Draw circle
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isSelected ? 25 : 20, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? '#f59e0b' : '#3b82f6';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw character name
      ctx.fillStyle = '#ffffff';
      ctx.font = isSelected ? 'bold 12px Arial' : '11px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(char, pos.x, pos.y);
    });

    // Add click handler
    canvas.onclick = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      charArray.forEach(char => {
        const pos = positions.get(char)!;
        const distance = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
        if (distance <= 25) {
          setSelectedCharacter(selectedCharacter === char ? null : char);
        }
      });
    };
  };

  const getCharacterRelationships = (charName: string) => {
    return relationships.filter(rel => 
      rel.character1 === charName || rel.character2 === charName
    );
  };

  const exportGraph = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = `character-relationship-graph-${Date.now()}.png`;
    a.click();
  };

  const selectedRelationships = selectedCharacter ? getCharacterRelationships(selectedCharacter) : [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col m-2 sm:m-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-zinc-800 gap-2 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Character Relationship Graph</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">Visual representation of character interactions</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="text-xs px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-white"
            >
              <option value="all">All Relationships</option>
              <option value="allies">Allies</option>
              <option value="enemies">Enemies</option>
              <option value="neutral">Neutral</option>
            </select>
            <button
              onClick={exportGraph}
              className="text-xs px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors"
            >
              Export
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                <p className="text-zinc-500">Analyzing character relationships...</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Graph Canvas */}
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <canvas
                  ref={canvasRef}
                  className="w-full h-[600px] cursor-pointer"
                  style={{ maxHeight: '600px' }}
                />
                <p className="text-xs text-zinc-500 mt-2 text-center">
                  Click on a character to see their relationships. Click again to deselect.
                </p>
              </div>

              {/* Selected Character Info */}
              {selectedCharacter && (
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-white mb-3">
                    Relationships for: <span className="text-amber-500">{selectedCharacter}</span>
                  </h3>
                  <div className="space-y-2">
                    {selectedRelationships.map((rel, idx) => {
                      const otherChar = rel.character1 === selectedCharacter ? rel.character2 : rel.character1;
                      return (
                        <div key={idx} className="flex items-center justify-between p-2 bg-zinc-900 rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-white">{otherChar}</span>
                            <span className={`text-xs px-2 py-1 rounded ${
                              rel.type === 'allies' ? 'bg-green-900/30 text-green-400' :
                              rel.type === 'enemies' ? 'bg-red-900/30 text-red-400' :
                              'bg-zinc-700 text-zinc-400'
                            }`}>
                              {rel.type}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-500">
                            {rel.scenes.length} scene{rel.scenes.length > 1 ? 's' : ''} (Scenes: {rel.scenes.join(', ')})
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Legend */}
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <h3 className="text-sm font-bold text-white mb-3">Legend</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-green-500"></div>
                    <span className="text-zinc-400">Allies</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-red-500"></div>
                    <span className="text-zinc-400">Enemies</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-zinc-500"></div>
                    <span className="text-zinc-400">Neutral</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-amber-500"></div>
                    <span className="text-zinc-400">Selected</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-3">
                  Line thickness indicates relationship strength. Thicker lines = more interactions.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CharacterRelationshipGraph;

