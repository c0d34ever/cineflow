
import React, { useState, useEffect, useRef } from 'react';
import { TechnicalStyle, DirectorSettings, Scene, StoryContext } from './types';
import DirectorPanel from './components/DirectorPanel';
import SceneCard from './components/SceneCard';
import Auth from './components/Auth';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import { enhanceScenePrompt, suggestDirectorSettings, generateStoryConcept, suggestNextScene } from './clientGeminiService';
import { saveProjectToDB, getProjectsFromDB, ProjectData, deleteProjectFromDB } from './db';
import { apiService, checkApiAvailability } from './apiService';
import { authService } from './apiServices';

const DEFAULT_DIRECTOR_SETTINGS: DirectorSettings = {
  customSceneId: '',
  lens: '35mm Prime',
  angle: 'Eye Level',
  lighting: 'Natural Cinematic',
  movement: 'Static',
  zoom: '',
  sound: 'Atmospheric ambient',
  dialogue: '',
  stuntInstructions: '',
  physicsFocus: true,
  style: TechnicalStyle.CINEMATIC,
  transition: 'Cut'
};

const DEFAULT_CONTEXT: StoryContext = {
  id: '',
  lastUpdated: 0,
  title: '',
  genre: '',
  plotSummary: '',
  characters: '',
  initialContext: ''
};

// Robust UUID generator fallback
const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const App: React.FC = () => {
  // --- Authentication State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- View State ---
  const [view, setView] = useState<'library' | 'setup' | 'studio' | 'dashboard'>('library');
  
  // --- Data State ---
  const [storyContext, setStoryContext] = useState<StoryContext>(DEFAULT_CONTEXT);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [currentSettings, setCurrentSettings] = useState<DirectorSettings>(DEFAULT_DIRECTOR_SETTINGS);

  // --- UI State ---
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const [setupTab, setSetupTab] = useState<'new' | 'resume'>('new');
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Inputs
  const [currentInput, setCurrentInput] = useState('');
  const [storySeed, setStorySeed] = useState(''); // For auto-generating story

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      setAuthLoading(false);
      return;
    }

    try {
      const data = await authService.getMe();
      setCurrentUser(data.user);
      setIsAuthenticated(true);
    } catch (error) {
      localStorage.removeItem('auth_token');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = (token: string, user: any) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    setCurrentUser(null);
    setIsAuthenticated(false);
    setView('library');
  };

  // --- Persistence & Lifecycle ---

  // Load projects when entering library view
  useEffect(() => {
    if (view === 'library') {
      loadLibrary();
      
      const onFocus = () => loadLibrary();
      window.addEventListener('focus', onFocus);
      return () => window.removeEventListener('focus', onFocus);
    }
  }, [view]);

  // Auto-save when in studio mode
  // Triggers whenever context, scenes, or settings change (including after generation completes)
  useEffect(() => {
    if (view === 'studio' && storyContext.id) {
      const saveData = async () => {
        try {
          const updatedContext = { ...storyContext, lastUpdated: Date.now() };
          const apiAvailable = await checkApiAvailability();
          if (apiAvailable) {
            await apiService.saveProject({
              context: updatedContext,
              scenes,
              settings: currentSettings
            });
          } else {
            await saveProjectToDB({
              context: updatedContext,
              scenes,
              settings: currentSettings
            });
          }
          // Update local context timestamp silently to keep sync
          setStoryContext(updatedContext);
        } catch (e) {
          console.error("Auto-save failed:", e);
          // Fallback to IndexedDB
          try {
            const updatedContext = { ...storyContext, lastUpdated: Date.now() };
            await saveProjectToDB({
              context: updatedContext,
              scenes,
              settings: currentSettings
            });
            setStoryContext(updatedContext);
          } catch (fallbackError) {
            console.error("IndexedDB fallback also failed:", fallbackError);
          }
        }
      };
      
      const timeout = setTimeout(saveData, 2000); // Debounce 2s
      return () => clearTimeout(timeout);
    }
  }, [storyContext.title, storyContext.plotSummary, scenes, currentSettings, view, storyContext.id]);

  // Scroll to bottom when scenes change
  useEffect(() => {
    if (bottomRef.current && view === 'studio') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scenes, view]);

  const loadLibrary = async () => {
    try {
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        const list = await apiService.getProjects();
        setProjects(list);
      } else {
        const list = await getProjectsFromDB();
        setProjects(list);
      }
    } catch (e) {
      console.error("Failed to load library", e);
      // Fallback to IndexedDB
      try {
        const list = await getProjectsFromDB();
        setProjects(list);
      } catch (fallbackError) {
        console.error("IndexedDB fallback also failed:", fallbackError);
      }
    }
  };

  const handleOpenProject = (project: ProjectData) => {
    setStoryContext(project.context);
    setScenes(project.scenes);
    setCurrentSettings(project.settings);
    setView('studio');
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this story?")) {
      try {
        const apiAvailable = await checkApiAvailability();
        if (apiAvailable) {
          await apiService.deleteProject(id);
        } else {
          await deleteProjectFromDB(id);
        }
        loadLibrary();
      } catch (error) {
        console.error("Failed to delete project:", error);
        // Fallback to IndexedDB
        try {
          await deleteProjectFromDB(id);
          loadLibrary();
        } catch (fallbackError) {
          console.error("IndexedDB fallback also failed:", fallbackError);
          alert("Failed to delete project");
        }
      }
    }
  };

  const handleCreateNew = () => {
    setStoryContext({ ...DEFAULT_CONTEXT, id: generateId() });
    setScenes([]);
    setCurrentSettings(DEFAULT_DIRECTOR_SETTINGS);
    setSetupTab('new');
    setView('setup');
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.context && json.scenes && json.settings) {
        const projectData: ProjectData = {
          context: { ...json.context, lastUpdated: Date.now() },
          scenes: json.scenes,
          settings: json.settings
        };
        
        const apiAvailable = await checkApiAvailability();
        if (apiAvailable) {
          await apiService.saveProject(projectData);
        } else {
          await saveProjectToDB(projectData);
        }
        await loadLibrary();
        alert("Project imported successfully!");
        } else {
          alert("Invalid project file format.");
        }
      } catch (error) {
        console.error("Import failed", error);
        alert("Failed to parse project file.");
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // --- Setup Actions ---

  const handleAutoGenerateStory = async () => {
    setIsAutoFilling(true);
    try {
      const generated = await generateStoryConcept(storySeed);
      setStoryContext(prev => ({
        ...prev,
        title: generated.title || prev.title,
        genre: generated.genre || prev.genre,
        plotSummary: generated.plotSummary || prev.plotSummary,
        characters: generated.characters || prev.characters,
        initialContext: generated.initialContext || prev.initialContext
      }));
    } catch (e) {
      console.error(e);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const finalizeSetup = async () => {
    if (!storyContext.title || !storyContext.characters) {
      alert("Please provide at least a Title and Characters to start.");
      return;
    }
    // Validation for resume mode
    if (setupTab === 'resume' && !storyContext.initialContext?.trim()) {
       alert("Please describe the last clip to continue from (or use Auto-Generate).");
       return;
    }

    // Prepare final initial state
    const timestamp = Date.now();
    const finalContext: StoryContext = { 
      ...storyContext, 
      lastUpdated: timestamp,
      // Clear initial context if explicit new story (to avoid carrying over garbage)
      initialContext: setupTab === 'new' ? '' : storyContext.initialContext
    };
    
    try {
      // Wait for save to complete before switching views
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        await apiService.saveProject({
          context: finalContext,
          scenes,
          settings: currentSettings
        });
      } else {
        await saveProjectToDB({
          context: finalContext,
          scenes,
          settings: currentSettings
        });
      }

      setStoryContext(finalContext);
      setView('studio');
    } catch (e) {
      console.error("Failed to initialize project:", e);
      // Fallback to IndexedDB
      try {
        await saveProjectToDB({
          context: finalContext,
          scenes,
          settings: currentSettings
        });
        setStoryContext(finalContext);
        setView('studio');
      } catch (fallbackError) {
        console.error("IndexedDB fallback also failed:", fallbackError);
        alert("Could not save project. Please check your connection and browser storage settings.");
      }
    }
  };

  // --- Studio Actions ---

  const handleManualSave = async () => {
    setSaveStatus('saving');
    try {
      const updatedContext = { ...storyContext, lastUpdated: Date.now() };
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        await apiService.saveProject({
          context: updatedContext,
          scenes,
          settings: currentSettings
        });
      } else {
        await saveProjectToDB({
          context: updatedContext,
          scenes,
          settings: currentSettings
        });
      }
      setStoryContext(updatedContext);
      setSaveStatus('saved');
      
      // Reset status after 2 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    } catch (error) {
      console.error("Manual save failed:", error);
      // Fallback to IndexedDB
      try {
        const updatedContext = { ...storyContext, lastUpdated: Date.now() };
        await saveProjectToDB({
          context: updatedContext,
          scenes,
          settings: currentSettings
        });
        setStoryContext(updatedContext);
        setSaveStatus('saved');
        setTimeout(() => {
          setSaveStatus('idle');
        }, 2000);
      } catch (fallbackError) {
        console.error("IndexedDB fallback also failed:", fallbackError);
        setSaveStatus('error');
        setTimeout(() => {
          setSaveStatus('idle');
        }, 3000);
      }
    }
  };

  const handleExitToLibrary = () => {
    setView('library');
  };

  const downloadStoryJSON = () => {
    const data = {
      context: storyContext,
      scenes: scenes,
      settings: currentSettings,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${storyContext.title.replace(/\s+/g, '_')}_storyboard.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAutoSuggestSettings = async () => {
    setIsAutoFilling(true);
    try {
      const prevContext = scenes.length > 0 
        ? scenes[scenes.length - 1].contextSummary 
        : (storyContext.initialContext || null);
        
      const newSettings = await suggestDirectorSettings(
        currentInput,
        storyContext,
        prevContext,
        currentSettings
      );
      
      setCurrentSettings(newSettings);
    } catch (error) {
      console.error("Error auto-suggesting settings:", error);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleClearSettings = () => {
    setCurrentSettings(DEFAULT_DIRECTOR_SETTINGS);
  };

  const handleAutoDraft = async () => {
    setIsAutoFilling(true);
    try {
      // Pass the last 5 scenes for better continuity awareness
      const recentHistory = scenes.slice(-5);
      const idea = await suggestNextScene(storyContext, recentHistory);
      setCurrentInput(idea);
    } catch (error) {
      console.error("Error auto-drafting scene:", error);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleGenerateScene = async () => {
    if (!currentInput.trim()) return;
    setIsProcessing(true);
    setSaveStatus('saving'); 

    // Snapshot current scenes to ensure we build the valid list for saving later
    const currentScenesSnapshot = scenes; 

    try {
      // Auto-populate settings based on the input text before generation
      const prevContext = currentScenesSnapshot.length > 0 
        ? currentScenesSnapshot[currentScenesSnapshot.length - 1].contextSummary 
        : (storyContext.initialContext || null);

      const optimizedSettings = await suggestDirectorSettings(
        currentInput,
        storyContext,
        prevContext,
        currentSettings
      );
      
      // Update UI to reflect the choices made by AI
      setCurrentSettings(optimizedSettings);

      const newSequenceNumber = currentScenesSnapshot.length + 1;
      const sceneId = `scene-${Date.now()}`;
      
      const newScene: Scene = {
        id: sceneId,
        sequenceNumber: newSequenceNumber,
        rawIdea: currentInput,
        enhancedPrompt: 'Generating director specs...',
        status: 'generating',
        directorSettings: { ...optimizedSettings }, // Use optimized settings
        contextSummary: ''
      };

      // Optimistic UI update to show card
      setScenes(prev => [...prev, newScene]);
      setCurrentInput('');

      const { enhancedPrompt, contextSummary } = await enhanceScenePrompt(
        newScene.rawIdea,
        storyContext,
        prevContext,
        optimizedSettings // Use optimized settings
      );

      const completedScene: Scene = { 
        ...newScene, 
        enhancedPrompt, 
        contextSummary,
        status: 'completed' 
      };

      // 1. Update UI State with completed scene
      setScenes(prev => prev.map(s => s.id === sceneId ? completedScene : s));

      // 2. Immediate Database Save
      const updatedScenesList = [...currentScenesSnapshot, completedScene];
      const updatedContext = { ...storyContext, lastUpdated: Date.now() };
      
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        await apiService.saveProject({
          context: updatedContext,
          scenes: updatedScenesList,
          settings: optimizedSettings
        });
      } else {
        await saveProjectToDB({
          context: updatedContext,
          scenes: updatedScenesList,
          settings: optimizedSettings
        });
      }
      
      // Update context timestamp in state
      setStoryContext(updatedContext);
      setSaveStatus('saved');
      
      setTimeout(() => setSaveStatus('idle'), 2000);

    } catch (error) {
      console.error("Critical error in flow:", error);
      setScenes(prev => prev.map(s => s.status === 'generating' ? { ...s, status: 'failed', enhancedPrompt: 'Error generating prompt.' } : s));
      setSaveStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Views ---

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication if not logged in
  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />;
  }

  // Show admin dashboard for admin users
  if (currentUser?.role === 'admin') {
    return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
  }

  // Show user dashboard
  if (view === 'dashboard') {
    return <UserDashboard user={currentUser} onLogout={handleLogout} />;
  }

  if (view === 'library') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-6 font-sans flex flex-col items-center">
        <main className="max-w-4xl w-full">
          <div className="text-center mb-10 pt-10">
            <h1 className="text-5xl font-serif text-amber-500 mb-2 tracking-tight">CINEFLOW AI</h1>
            <p className="text-zinc-500 uppercase tracking-widest text-xs">Production Library & Director Suite</p>
            <div className="mt-4 flex items-center justify-center gap-4">
              <span className="text-xs text-zinc-600">Logged in as: {currentUser?.username}</span>
              <button
                onClick={() => setView('dashboard')}
                className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={handleLogout}
                className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* New Project Card */}
            <button 
              onClick={handleCreateNew}
              className="bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-[200px] hover:border-amber-500/50 hover:bg-zinc-900 transition-all group"
            >
               <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-amber-600 group-hover:text-white transition-colors mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                 </svg>
               </div>
               <span className="text-sm font-bold text-zinc-400 group-hover:text-white">Start New Project</span>
            </button>

            {/* Import Project Card */}
            <button 
              onClick={handleImportClick}
              className="bg-zinc-900/50 border-2 border-dashed border-zinc-800 rounded-xl p-8 flex flex-col items-center justify-center min-h-[200px] hover:border-zinc-500 hover:bg-zinc-900 transition-all group"
            >
               <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".json"
                  className="hidden" 
               />
               <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 group-hover:bg-zinc-600 group-hover:text-white transition-colors mb-4">
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                 </svg>
               </div>
               <span className="text-sm font-bold text-zinc-400 group-hover:text-white">Import JSON</span>
            </button>

            {/* Existing Projects */}
            {projects.length === 0 ? (
                <div className="col-span-full text-center py-10 text-zinc-500 text-sm">
                   No projects found. Create or import one to begin.
                </div>
            ) : (
                projects.map(p => (
                  <div 
                    key={p.context.id} 
                    onClick={() => handleOpenProject(p)}
                    className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-zinc-600 transition-all cursor-pointer relative group flex flex-col min-h-[200px]"
                  >
                    <div className="h-2 bg-gradient-to-r from-amber-600 to-amber-800"></div>
                    <div className="p-6 flex-1 flex flex-col">
                      <h3 className="text-lg font-serif font-bold text-white mb-1 line-clamp-1">{p.context.title}</h3>
                      <p className="text-xs text-amber-500 uppercase tracking-wider mb-4">{p.context.genre}</p>
                      <p className="text-sm text-zinc-500 line-clamp-3 mb-4 flex-1">{p.context.plotSummary}</p>
                      
                      <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800/50">
                        <span className="text-[10px] text-zinc-600">
                          {new Date(p.context.lastUpdated).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                          {p.scenes.length} Scenes
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteProject(e, p.context.id)}
                      className="absolute top-4 right-4 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Delete Project"
                    >
                       <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                       </svg>
                    </button>
                  </div>
                ))
            )}
          </div>
        </main>
      </div>
    );
  }

  if (view === 'setup') {
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

            <div className="p-8 space-y-6">
              
              {/* Magic Generate Section (Now Available for Both) */}
              <div className="bg-zinc-950 p-4 rounded-lg border border-zinc-800/50 flex flex-col gap-2">
                 <label className="text-xs font-bold text-amber-500 uppercase flex items-center gap-2">
                   ✨ Magic Auto-Creator
                 </label>
                 <div className="flex gap-2">
                   <input 
                     value={storySeed}
                     onChange={(e) => setStorySeed(e.target.value)}
                     placeholder={setupTab === 'new' ? "Enter a simple idea (e.g. 'Cyberpunk detective finds a lost android')" : "Describe the story to resume from (e.g. 'Mid-battle in space, hero is losing')"}
                     className="flex-1 bg-black border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
                   />
                   <button 
                     onClick={handleAutoGenerateStory}
                     className="bg-zinc-800 hover:bg-zinc-700 text-white text-xs px-4 py-2 rounded border border-zinc-600 transition-colors"
                   >
                     Generate
                   </button>
                 </div>
                 <p className="text-[10px] text-zinc-500 italic">
                   {setupTab === 'resume' ? "Auto-generates context AND the last scene visual for continuity." : "Generates full story bible."}
                 </p>
              </div>

              {/* Common Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                  className="flex-1 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold text-lg rounded-lg transition-colors uppercase tracking-wide shadow-lg shadow-amber-900/20"
                >
                  {setupTab === 'new' ? 'Initialize Storyboard' : 'Resume Production'}
                </button>
              </div>

            </div>
          </div>
        </main>
      </div>
    );
  }

  // --- Studio UI (view === 'studio') ---
  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 flex items-center px-6 justify-between flex-shrink-0 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <button onClick={handleExitToLibrary} className="p-2 text-zinc-400 hover:text-white" title="Back to Library">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
          <div className="font-serif text-xl font-bold tracking-widest text-amber-500">CINEFLOW</div>
          <div className="h-4 w-px bg-zinc-700 mx-2"></div>
          <div className="text-sm text-zinc-300 hidden md:block">
            <span className="text-zinc-500 mr-2">PROJECT:</span>
            {storyContext.title}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('dashboard')}
            className="text-xs px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1"
            title="User Dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            {currentUser?.username}
          </button>
          {/* Manual Save Button */}
          <button
            onClick={handleManualSave}
            disabled={saveStatus === 'saving'}
            className={`text-xs px-3 py-1.5 rounded border transition-colors flex items-center gap-2 font-bold uppercase tracking-wider ${
              saveStatus === 'saved' 
                ? 'bg-green-900/30 text-green-400 border-green-800' 
                : saveStatus === 'error'
                ? 'bg-red-900/30 text-red-400 border-red-800'
                : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border-zinc-700'
            }`}
          >
             {saveStatus === 'saving' ? (
               <>
                 <div className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse"></div>
                 Saving...
               </>
             ) : saveStatus === 'saved' ? (
               <>
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                 </svg>
                 Saved
               </>
             ) : saveStatus === 'error' ? (
                <>Error</>
             ) : (
               <>
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6A2.25 2.25 0 016 3.75h1.5m9 0h-9" />
                 </svg>
                 Save Story
               </>
             )}
          </button>

          <button 
             onClick={downloadStoryJSON}
             className="text-xs px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
              <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
            </svg>
            Export JSON
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Feed / Storyboard */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
          <div className="max-w-5xl mx-auto space-y-6 pb-32">
            {scenes.length === 0 ? (
               <div className="flex flex-col items-center justify-center h-96 text-zinc-600 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/50">
                  <p className="font-serif text-xl mb-2 text-zinc-400">The Storyboard is Empty</p>
                  <p className="text-sm max-w-md text-center">
                    {storyContext.initialContext 
                      ? "Ready to continue. The Director AI knows the context of your previous clip. Describe the next 8 seconds below." 
                      : "Describe the opening 8-second clip below."}
                  </p>
               </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {scenes.map((scene) => (
                  <div key={scene.id} className="w-full">
                    <SceneCard scene={scene} />
                  </div>
                ))}
                <div ref={bottomRef}></div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Bottom Control Deck */}
      <div className="border-t border-zinc-800 bg-black p-4 flex-shrink-0 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-6">
          
          {/* Director Settings */}
          <div className="w-full lg:w-1/3 order-2 lg:order-1 relative">
             {isAutoFilling && (
               <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center rounded-lg">
                  <div className="text-amber-500 text-xs font-mono animate-pulse">AI IS CONFIGURING SPECS...</div>
               </div>
             )}
             <DirectorPanel 
               settings={currentSettings} 
               onChange={setCurrentSettings} 
               onAutoSuggest={handleAutoSuggestSettings}
               onClear={handleClearSettings}
               disabled={isProcessing} 
             />
          </div>

          {/* Prompt Input */}
          <div className="w-full lg:w-2/3 flex flex-col justify-between order-1 lg:order-2">
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-1 flex-1 flex flex-col h-full min-h-[200px] lg:min-h-0 relative group">
              
              {/* Auto-Draft Button (Top Right) */}
              <button 
                onClick={handleAutoDraft}
                className="absolute top-3 right-3 text-xs bg-zinc-800 hover:bg-zinc-700 text-amber-500 border border-amber-500/30 px-3 py-1.5 rounded-full transition-all flex items-center gap-1 z-10 shadow-lg opacity-80 hover:opacity-100"
                disabled={isProcessing || isAutoFilling}
                title="Let the AI suggest the next scene idea based on the story"
              >
                 <span className="text-lg leading-none">✨</span>
                 <span className="font-bold">Auto-Write Idea</span>
              </button>

              <textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                disabled={isProcessing}
                placeholder="Describe the next 8 seconds... (e.g., 'Close up on hero's face, sweating, physics of debris floating in zero-g, muffled heartbeat sound')"
                className="w-full h-full bg-transparent p-4 text-white outline-none resize-none placeholder-zinc-600 font-sans text-lg pr-32"
              />
              <div className="p-2 flex justify-between items-center border-t border-zinc-800/50 bg-zinc-900/50">
                <span className="text-xs text-zinc-500 pl-2">
                  {currentInput.length > 0 ? 'Director AI ready to write specs.' : 'Waiting for input...'}
                </span>
                <button
                  onClick={handleGenerateScene}
                  disabled={isProcessing || !currentInput.trim()}
                  className={`px-8 py-3 rounded font-bold text-sm tracking-wide transition-all ${
                    isProcessing || !currentInput.trim()
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-900/20'
                  }`}
                >
                  {isProcessing ? 'WRITING...' : 'GENERATE FLOW'}
                </button>
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

export default App;
