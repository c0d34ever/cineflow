import React, { useState } from 'react';
import { Scene, StoryContext } from '../types';
import { analyzeStory, suggestNextScene } from '../clientGeminiService';

interface AIStoryAnalysisPanelProps {
  projectId: string;
  storyContext: StoryContext;
  scenes: Scene[];
  onClose: () => void;
  onCreateScene?: (sceneIdea: string, purpose?: string) => void;
  onShowToast?: (message: string, type?: 'success' | 'error' | 'warning') => void;
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
  onCreateScene,
  onShowToast,
}) => {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fixing, setFixing] = useState<string | null>(null);

  const performAnalysis = async () => {
    if (scenes.length === 0) {
      setError('No scenes to analyze');
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const result = await analyzeStory(storyContext, scenes);
      setAnalysis(result);
    } catch (error: any) {
      console.error('Analysis error:', error);
      setError(error.message || 'Failed to analyze story. Please try again.');
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

  const handleGenerateFixScene = async (purpose: string, issue: string) => {
    if (!onCreateScene) {
      onShowToast?.('Scene creation not available', 'error');
      return;
    }

    setFixing(purpose);
    try {
      // Use AI to generate a scene idea that addresses the issue
      const recentScenes = scenes.slice(-5);
      
      // Modify context to include the fix requirement
      const modifiedContext: StoryContext = {
        ...storyContext,
        plotSummary: `${storyContext.plotSummary}\n\n[FIX NEEDED: ${purpose}]\nIssue: ${issue}\n\nGenerate a scene that addresses this specific issue.`,
      };
      
      const sceneIdea = await suggestNextScene(modifiedContext, recentScenes);
      onCreateScene(sceneIdea, purpose);
      onShowToast?.(`Generated scene idea to address: ${purpose}`, 'success');
    } catch (error: any) {
      console.error('Error generating fix scene:', error);
      // Fallback: create a simple scene idea based on the issue
      const fallbackIdea = `Scene to address ${purpose.toLowerCase()}: ${issue}`;
      onCreateScene(fallbackIdea, purpose);
      onShowToast?.(`Created scene idea (using fallback)`, 'warning');
    } finally {
      setFixing(null);
    }
  };

  const handleApplySuggestion = async (suggestion: string, category: string) => {
    if (!onCreateScene) {
      onShowToast?.('Scene creation not available', 'error');
      return;
    }

    setFixing(`${category}-${suggestion.substring(0, 20)}`);
    try {
      const recentScenes = scenes.slice(-5);
      const sceneIdea = await suggestNextScene(storyContext, recentScenes);
      onCreateScene(sceneIdea, `Apply suggestion: ${suggestion.substring(0, 50)}`);
      onShowToast?.(`Applied suggestion: ${category}`, 'success');
    } catch (error: any) {
      console.error('Error applying suggestion:', error);
      onShowToast?.(`Failed to apply suggestion: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setFixing(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col m-2 sm:m-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-zinc-800 gap-2 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">AI Story Analysis</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">Analyze pacing, structure, characters, and more</p>
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
                      <div className="text-sm font-semibold text-red-400 mb-2 flex items-center justify-between">
                        <span>Issues:</span>
                        {onCreateScene && (
                          <button
                            onClick={() => handleGenerateFixScene('Fix Pacing', analysis.pacing.issues[0])}
                            disabled={fixing === 'Fix Pacing'}
                            className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded disabled:opacity-50 flex items-center gap-1"
                          >
                            {fixing === 'Fix Pacing' ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                Generating...
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                </svg>
                                Generate Fix Scene
                              </>
                            )}
                          </button>
                        )}
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
                        {analysis.pacing.issues.map((issue, i) => (
                          <li key={i} className="flex items-start justify-between gap-2">
                            <span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.pacing.suggestions.length > 0 && (
                    <div>
                      <div className="text-sm font-semibold text-amber-400 mb-2">Suggestions:</div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
                        {analysis.pacing.suggestions.map((suggestion, i) => (
                          <li key={i} className="flex items-start justify-between gap-2">
                            <span>{suggestion}</span>
                            {onCreateScene && (
                              <button
                                onClick={() => handleApplySuggestion(suggestion, 'Pacing')}
                                disabled={fixing?.startsWith('Pacing')}
                                className="text-xs px-2 py-0.5 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 rounded disabled:opacity-50 shrink-0"
                                title="Apply this suggestion"
                              >
                                Apply
                              </button>
                            )}
                          </li>
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
                      <div className="text-sm font-semibold text-red-400 mb-2 flex items-center justify-between">
                        <span>Issues:</span>
                        {onCreateScene && (
                          <button
                            onClick={() => handleGenerateFixScene('Improve Character Development', analysis.characterDevelopment.issues[0])}
                            disabled={fixing === 'Improve Character Development'}
                            className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded disabled:opacity-50 flex items-center gap-1"
                          >
                            {fixing === 'Improve Character Development' ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                Generating...
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                </svg>
                                Generate Fix Scene
                              </>
                            )}
                          </button>
                        )}
                      </div>
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
                          <li key={i} className="flex items-start justify-between gap-2">
                            <span>{suggestion}</span>
                            {onCreateScene && (
                              <button
                                onClick={() => handleApplySuggestion(suggestion, 'Character Development')}
                                disabled={fixing?.startsWith('Character Development')}
                                className="text-xs px-2 py-0.5 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 rounded disabled:opacity-50 shrink-0"
                                title="Apply this suggestion"
                              >
                                Apply
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Plot Holes */}
                {analysis.plotHoles.found && (
                  <div className="bg-red-900/20 border border-red-800/50 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-bold text-red-400">⚠️ Plot Holes Detected</h3>
                      {onCreateScene && (
                        <button
                          onClick={() => handleGenerateFixScene('Fix Plot Hole', analysis.plotHoles.issues[0])}
                          disabled={fixing === 'Fix Plot Hole'}
                          className="text-xs px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded disabled:opacity-50 flex items-center gap-1"
                        >
                          {fixing === 'Fix Plot Hole' ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              Generating...
                            </>
                          ) : (
                            <>
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                              </svg>
                              Generate Fix Scene
                            </>
                          )}
                        </button>
                      )}
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
                      {analysis.plotHoles.issues.map((issue, i) => (
                        <li key={i} className="flex items-start justify-between gap-2">
                          <span>{issue}</span>
                          {onCreateScene && (
                            <button
                              onClick={() => handleGenerateFixScene(`Fix Plot Hole ${i + 1}`, issue)}
                              disabled={fixing?.includes('Plot Hole')}
                              className="text-xs px-2 py-0.5 bg-red-600/20 hover:bg-red-600/40 text-red-300 rounded disabled:opacity-50 shrink-0"
                              title="Generate scene to fix this plot hole"
                            >
                              Fix
                            </button>
                          )}
                        </li>
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
                          <li key={i} className="flex items-start justify-between gap-2">
                            <span>{suggestion}</span>
                            {onCreateScene && (
                              <button
                                onClick={() => handleApplySuggestion(suggestion, 'Structure')}
                                disabled={fixing?.startsWith('Structure')}
                                className="text-xs px-2 py-0.5 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 rounded disabled:opacity-50 shrink-0"
                                title="Apply this suggestion"
                              >
                                Apply
                              </button>
                            )}
                          </li>
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
                      <div className="text-sm font-semibold text-red-400 mb-2 flex items-center justify-between">
                        <span>Issues:</span>
                        {onCreateScene && (
                          <button
                            onClick={() => handleGenerateFixScene('Improve Dialogue', analysis.dialogue.issues[0])}
                            disabled={fixing === 'Improve Dialogue'}
                            className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded disabled:opacity-50 flex items-center gap-1"
                          >
                            {fixing === 'Improve Dialogue' ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                                Generating...
                              </>
                            ) : (
                              <>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                                </svg>
                                Generate Fix Scene
                              </>
                            )}
                          </button>
                        )}
                      </div>
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
                          <li key={i} className="flex items-start justify-between gap-2">
                            <span>{suggestion}</span>
                            {onCreateScene && (
                              <button
                                onClick={() => handleApplySuggestion(suggestion, 'Dialogue')}
                                disabled={fixing?.startsWith('Dialogue')}
                                className="text-xs px-2 py-0.5 bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 rounded disabled:opacity-50 shrink-0"
                                title="Apply this suggestion"
                              >
                                Apply
                              </button>
                            )}
                          </li>
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

