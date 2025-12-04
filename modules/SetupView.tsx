import React from 'react';
import { flushSync } from 'react-dom';
import { StoryContext } from '../types';
import { getContentTypeTerminology } from '../utils/contentTypeUtils';
import { generateStoryConcept } from '../clientGeminiService';
import { sceneTemplatesService } from '../apiServices';

interface SetupViewProps {
  storyContext: StoryContext;
  setStoryContext: (context: StoryContext) => void;
  setupTab: 'new' | 'resume';
  setSetupTab: (tab: 'new' | 'resume') => void;
  storySeed: string;
  setStorySeed: (seed: string) => void;
  isAutoFilling: boolean;
  setIsAutoFilling: (filling: boolean) => void;
  handleExitToLibrary: () => void;
  finalizeSetup: () => Promise<void>;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  showSceneTemplates: boolean;
  setShowSceneTemplates: (show: boolean) => void;
  sceneTemplates: any[];
  setSceneTemplates: (templates: any[]) => void;
}

const SetupView: React.FC<SetupViewProps> = ({
  storyContext,
  setStoryContext,
  setupTab,
  setSetupTab,
  storySeed,
  setStorySeed,
  isAutoFilling,
  setIsAutoFilling,
  handleExitToLibrary,
  finalizeSetup,
  showToast,
  showSceneTemplates,
  setShowSceneTemplates,
  sceneTemplates,
  setSceneTemplates,
}) => {
  const contentTypeTerminology = getContentTypeTerminology(storyContext.contentType);

  const handleAutoGenerateStory = async () => {
    if (!storySeed.trim()) {
      showToast('Please enter a story idea first', 'error');
      return;
    }
    
    setIsAutoFilling(true);
    try {
      const generated = await generateStoryConcept(storySeed);
      
      // Update all fields, only use previous values if generated ones are truly empty
      setStoryContext(prev => ({
        ...prev,
        title: generated.title?.trim() || prev.title || '',
        genre: generated.genre?.trim() || prev.genre || '',
        plotSummary: generated.plotSummary?.trim() || prev.plotSummary || '',
        characters: generated.characters?.trim() || prev.characters || '',
        initialContext: generated.initialContext?.trim() || prev.initialContext || ''
      }));
      
      showToast('Story concept generated successfully!', 'success');
    } catch (e: any) {
      console.error('Error generating story:', e);
      showToast(e.message || 'Failed to generate story concept. Please try again.', 'error');
    } finally {
      setIsAutoFilling(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6 font-sans flex flex-col items-center justify-center">
      <main className="max-w-2xl w-full">
        <button onClick={handleExitToLibrary} className="mb-6 text-xs text-zinc-500 hover:text-white flex items-center gap-1">
          ← Back to Library
        </button>
        
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden relative">
          {isAutoFilling && (
            <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mb-4"></div>
              <div className="text-amber-500 font-mono animate-pulse">GENERATING STORY BIBLE...</div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex border-b border-zinc-800">
            <button 
              onClick={() => setSetupTab('new')}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${setupTab === 'new' ? 'bg-amber-600/10 text-amber-500 border-b-2 border-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Start New Story
            </button>
            <button 
              onClick={() => setSetupTab('resume')}
              className={`flex-1 py-4 text-sm font-bold uppercase tracking-wide transition-colors ${setupTab === 'resume' ? 'bg-amber-600/10 text-amber-500 border-b-2 border-amber-500' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Continue Sequence
            </button>
          </div>

          <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
            {/* Magic Generate Section */}
            <div className="bg-zinc-950 p-3 sm:p-4 rounded-lg border border-zinc-800/50 flex flex-col gap-2">
              <label className="text-xs font-bold text-amber-500 uppercase flex items-center gap-2">
                ✨ Magic Auto-Creator
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input 
                  value={storySeed}
                  onChange={(e) => setStorySeed(e.target.value)}
                  placeholder={setupTab === 'new' ? "Enter a simple idea (e.g. 'Cyberpunk detective finds a lost android')" : "Describe the story to resume from (e.g. 'Mid-battle in space, hero is losing')"}
                  className="flex-1 bg-black border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
                />
                <button 
                  onClick={handleAutoGenerateStory}
                  className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-4 py-2 rounded border border-zinc-600 transition-colors whitespace-nowrap"
                >
                  Generate
                </button>
              </div>
              <p className="text-[10px] text-zinc-500 italic">
                {setupTab === 'resume' ? "Auto-generates context AND the last scene visual for continuity." : "Generates full story bible."}
              </p>
            </div>

            {/* Common Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">Project Title</label>
                <input 
                  value={storyContext.title}
                  onChange={(e) => setStoryContext({...storyContext, title: e.target.value})}
                  className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none transition-colors"
                  placeholder="e.g. The Last Horizon"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">Genre</label>
                <input 
                  value={storyContext.genre}
                  onChange={(e) => setStoryContext({...storyContext, genre: e.target.value})}
                  className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none"
                  placeholder="e.g. Sci-Fi Noir"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">Key Characters</label>
                <input 
                  value={storyContext.characters}
                  onChange={(e) => setStoryContext({...storyContext, characters: e.target.value})}
                  className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none"
                  placeholder="Protagonist, Antagonist..."
                />
              </div>
            </div>

            {/* Conditional Fields */}
            {setupTab === 'new' ? (
              <div className="animate-fade-in">
                <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">Core Plot Summary</label>
                <textarea 
                  value={storyContext.plotSummary}
                  onChange={(e) => setStoryContext({...storyContext, plotSummary: e.target.value})}
                  className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none h-32 resize-none"
                  placeholder="Briefly describe the overall story arc..."
                />
              </div>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">Story So Far (Context)</label>
                  <textarea 
                    value={storyContext.plotSummary}
                    onChange={(e) => setStoryContext({...storyContext, plotSummary: e.target.value})}
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none h-20 resize-none"
                    placeholder="Briefly summarize what led to this moment..."
                  />
                </div>
                <div className="p-4 bg-amber-900/10 border border-amber-500/30 rounded-lg">
                  <label className="block text-xs font-bold text-amber-500 uppercase mb-2">
                    Last Clip Visuals (Continuity Source)
                  </label>
                  <textarea 
                    value={storyContext.initialContext || ''}
                    onChange={(e) => setStoryContext({...storyContext, initialContext: e.target.value})}
                    className="w-full bg-black border border-amber-500/50 rounded-lg p-3 text-white focus:border-amber-500 outline-none h-32 resize-none placeholder-zinc-500"
                    placeholder="Describe the EXACT ending of the previous clip. E.g. 'Hero hanging off a cliff ledge, heavy rain, looking down at the abyss'. The AI will pick up from here."
                  />
                </div>
              </div>
            )}

            <div className="flex gap-4 mt-4">
              <button 
                onClick={finalizeSetup}
                className="flex-1 py-3 sm:py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-base sm:text-lg rounded-lg transition-colors uppercase tracking-wide shadow-lg shadow-amber-900/20"
              >
                {setupTab === 'new' ? 'Initialize Storyboard' : 'Resume Production'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SetupView;

