import React, { useState } from 'react';
import { Scene, StoryContext } from '../types';
import { enhanceScenePrompt } from '../clientGeminiService';

interface AIStoryAnalysisPanelProps {
  projectId: string;
  storyContext: StoryContext;
  scenes: Scene[];
  onClose: () => void;
}

interface AnalysisResult {
  pacing: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
  characterDevelopment: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
  plotHoles: {
    found: boolean;
    issues: string[];
  };
  structure: {
    score: number;
    analysis: string;
    suggestions: string[];
  };
  dialogue: {
    score: number;
    issues: string[];
    suggestions: string[];
  };
}

const AIStoryAnalysisPanel: React.FC<AIStoryAnalysisPanelProps> = ({
  projectId,
  storyContext,
  scenes,
  onClose,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const performAnalysis = async () => {
    if (scenes.length === 0) {
      setError('No scenes to analyze');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      // Prepare story data for analysis
      const storyData = {
        title: storyContext.title,
        genre: storyContext.genre,
        plotSummary: storyContext.plotSummary,
        characters: storyContext.characters,
        scenes: scenes.map(scene => ({
          sequenceNumber: scene.sequenceNumber,
          prompt: scene.enhancedPrompt,
          dialogue: scene.directorSettings.dialogue,
          context: scene.contextSummary,
        })),
      };

      // Create analysis prompt
      const analysisPrompt = `Analyze this storyboard project and provide detailed feedback:

Title: ${storyData.title}
Genre: ${storyData.genre}
Plot Summary: ${storyData.plotSummary}
Characters: ${storyData.characters}

Scenes (${storyData.scenes.length} total):
${storyData.scenes.map((s, i) => `
Scene ${i + 1}:
- Prompt: ${s.prompt}
- Dialogue: ${s.dialogue || 'None'}
- Context: ${s.context || 'None'}
`).join('\n')}

Please provide a comprehensive analysis in JSON format with the following structure:
{
  "pacing": {
    "score": 0-100,
    "issues": ["issue1", "issue2"],
    "suggestions": ["suggestion1", "suggestion2"]
  },
  "characterDevelopment": {
    "score": 0-100,
    "issues": ["issue1"],
    "suggestions": ["suggestion1"]
  },
  "plotHoles": {
    "found": true/false,
    "issues": ["hole1", "hole2"]
  },
  "structure": {
    "score": 0-100,
    "analysis": "detailed analysis text",
    "suggestions": ["suggestion1"]
  },
  "dialogue": {
    "score": 0-100,
    "issues": ["issue1"],
    "suggestions": ["suggestion1"]
  }
}

Focus on:
1. Pacing - Are scenes well-paced? Too fast/slow?
2. Character Development - Are characters well-developed? Consistent?
3. Plot Holes - Any inconsistencies or missing connections?
4. Structure - Does it follow good story structure (three-act, etc.)?
5. Dialogue - Is dialogue natural and character-appropriate?

Return ONLY valid JSON, no markdown formatting.`;

      const response = await enhanceScenePrompt(analysisPrompt, '');
      
      // Try to extract JSON from response
      let jsonText = response;
      const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
      }

      const result = JSON.parse(jsonText) as AnalysisResult;
      setAnalysis(result);
    } catch (error: any) {
      console.error('Analysis error:', error);
      setError('Failed to analyze story. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreBg = (score: number): string => {
    if (score >= 80) return 'bg-green-900/20 border-green-800/50';
    if (score >= 60) return 'bg-yellow-900/20 border-yellow-800/50';
    return 'bg-red-900/20 border-red-800/50';
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white">AI Story Analysis</h2>
            <p className="text-sm text-zinc-400 mt-1">Analyze pacing, structure, characters, and more</p>
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
        <div className="flex-1 overflow-y-auto p-6">
          {!analysis ? (
            <div className="text-center py-12">
              {error ? (
                <div className="mb-4">
                  <div className="text-red-400 mb-2">{error}</div>
                  <button
                    onClick={performAnalysis}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded"
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-lg text-zinc-400 mb-4">Ready to analyze your story</p>
                  <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
                    Get AI-powered insights on pacing, character development, plot structure, and more.
                  </p>
                  <button
                    onClick={performAnalysis}
                    disabled={analyzing || scenes.length === 0}
                    className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
                  >
                    {analyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                        </svg>
                        Start Analysis
                      </>
                    )}
                  </button>
                  {scenes.length === 0 && (
                    <p className="text-xs text-zinc-500 mt-4">Add scenes to your project first</p>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Overall Scores */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className={`p-4 rounded-lg border ${getScoreBg(analysis.pacing.score)}`}>
                  <div className="text-xs text-zinc-400 mb-1">Pacing</div>
                  <div className={`text-2xl font-bold ${getScoreColor(analysis.pacing.score)}`}>
                    {analysis.pacing.score}
                  </div>
                </div>
                <div className={`p-4 rounded-lg border ${getScoreBg(analysis.characterDevelopment.score)}`}>
                  <div className="text-xs text-zinc-400 mb-1">Characters</div>
                  <div className={`text-2xl font-bold ${getScoreColor(analysis.characterDevelopment.score)}`}>
                    {analysis.characterDevelopment.score}
                  </div>
                </div>
                <div className={`p-4 rounded-lg border ${getScoreBg(analysis.structure.score)}`}>
                  <div className="text-xs text-zinc-400 mb-1">Structure</div>
                  <div className={`text-2xl font-bold ${getScoreColor(analysis.structure.score)}`}>
                    {analysis.structure.score}
                  </div>
                </div>
                <div className={`p-4 rounded-lg border ${getScoreBg(analysis.dialogue.score)}`}>
                  <div className="text-xs text-zinc-400 mb-1">Dialogue</div>
                  <div className={`text-2xl font-bold ${getScoreColor(analysis.dialogue.score)}`}>
                    {analysis.dialogue.score}
                  </div>
                </div>
                <div className={`p-4 rounded-lg border ${analysis.plotHoles.found ? 'bg-red-900/20 border-red-800/50' : 'bg-green-900/20 border-green-800/50'}`}>
                  <div className="text-xs text-zinc-400 mb-1">Plot Holes</div>
                  <div className={`text-2xl font-bold ${analysis.plotHoles.found ? 'text-red-400' : 'text-green-400'}`}>
                    {analysis.plotHoles.found ? 'Yes' : 'No'}
                  </div>
                </div>
              </div>

              {/* Detailed Analysis */}
              <div className="space-y-4">
                {/* Pacing */}
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <span className={`text-2xl ${getScoreColor(analysis.pacing.score)}`}>{analysis.pacing.score}</span>
                    <span>Pacing Analysis</span>
                  </h3>
                  {analysis.pacing.issues.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-red-400 mb-2">Issues:</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
                        {analysis.pacing.issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.pacing.suggestions.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-amber-400 mb-2">Suggestions:</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
                        {analysis.pacing.suggestions.map((suggestion, i) => (
                          <li key={i}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Character Development */}
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <span className={`text-2xl ${getScoreColor(analysis.characterDevelopment.score)}`}>{analysis.characterDevelopment.score}</span>
                    <span>Character Development</span>
                  </h3>
                  {analysis.characterDevelopment.issues.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-red-400 mb-2">Issues:</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
                        {analysis.characterDevelopment.issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.characterDevelopment.suggestions.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-amber-400 mb-2">Suggestions:</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
                        {analysis.characterDevelopment.suggestions.map((suggestion, i) => (
                          <li key={i}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Plot Holes */}
                {analysis.plotHoles.found && (
                  <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
                    <h3 className="text-lg font-bold text-red-400 mb-3">⚠️ Plot Holes Detected</h3>
                    <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
                      {analysis.plotHoles.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Structure */}
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <span className={`text-2xl ${getScoreColor(analysis.structure.score)}`}>{analysis.structure.score}</span>
                    <span>Story Structure</span>
                  </h3>
                  <p className="text-sm text-zinc-300 mb-3">{analysis.structure.analysis}</p>
                  {analysis.structure.suggestions.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-amber-400 mb-2">Suggestions:</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
                        {analysis.structure.suggestions.map((suggestion, i) => (
                          <li key={i}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Dialogue */}
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
                    <span className={`text-2xl ${getScoreColor(analysis.dialogue.score)}`}>{analysis.dialogue.score}</span>
                    <span>Dialogue Quality</span>
                  </h3>
                  {analysis.dialogue.issues.length > 0 && (
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-red-400 mb-2">Issues:</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
                        {analysis.dialogue.issues.map((issue, i) => (
                          <li key={i}>{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.dialogue.suggestions.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-amber-400 mb-2">Suggestions:</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
                        {analysis.dialogue.suggestions.map((suggestion, i) => (
                          <li key={i}>{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
          {analysis && (
            <button
              onClick={performAnalysis}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
            >
              Re-analyze
            </button>
          )}
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

export default AIStoryAnalysisPanel;

