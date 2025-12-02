
import React, { useState, useEffect, useRef } from 'react';
import { TechnicalStyle, DirectorSettings, Scene, StoryContext } from './types';
import DirectorPanel from './components/DirectorPanel';
import SceneCard from './components/SceneCard';
import Auth from './components/Auth';
import ForgotPassword from './components/ForgotPassword';
import ResetPassword from './components/ResetPassword';
import UserDashboard from './components/UserDashboard';
import AdminDashboard from './components/AdminDashboard';
import CommentsPanel from './components/CommentsPanel';
import SceneNotesPanel from './components/SceneNotesPanel';
import EnhancedSceneNotesPanel from './components/EnhancedSceneNotesPanel';
import TemplateSelector from './components/TemplateSelector';
import CharactersPanel from './components/CharactersPanel';
import TimelineView from './components/TimelineView';
import SharingModal from './components/SharingModal';
import LocationsPanel from './components/LocationsPanel';
import AnalyticsPanel from './components/AnalyticsPanel';
import AdvancedAnalyticsDashboard from './components/AdvancedAnalyticsDashboard';
import NotificationCenter from './components/NotificationCenter';
import SceneTemplatesModal from './components/SceneTemplatesModal';
import ActivityPanel from './components/ActivityPanel';
import SettingsPanel from './components/SettingsPanel';
import CommandPalette from './components/CommandPalette';
import CopyButton from './components/CopyButton';
import { ToastContainer } from './components/Toast';
import CoverImageSelector from './components/CoverImageSelector';
import ExportHistoryPanel from './components/ExportHistoryPanel';
import ProjectStatisticsPanel from './components/ProjectStatisticsPanel';
import ScenePreviewModal from './components/ScenePreviewModal';
import StoryboardPlayback from './components/StoryboardPlayback';
import AdvancedSearchPanel from './components/AdvancedSearchPanel';
import ProjectTemplatesLibrary from './components/ProjectTemplatesLibrary';
import AIStoryAnalysisPanel from './components/AIStoryAnalysisPanel';
import ShotListGenerator from './components/ShotListGenerator';
import ShootingScheduleGenerator from './components/ShootingScheduleGenerator';
import CallSheetGenerator from './components/CallSheetGenerator';
import BudgetEstimator from './components/BudgetEstimator';
import VideoSlideshowExport from './components/VideoSlideshowExport';
import SceneComparisonView from './components/SceneComparisonView';
import CharacterRelationshipGraph from './components/CharacterRelationshipGraph';
import VersionHistoryPanel from './components/VersionHistoryPanel';
import ProjectHealthScore from './components/ProjectHealthScore';
import QuickActionsMenu from './components/QuickActionsMenu';
import CopySceneSettingsModal from './components/CopySceneSettingsModal';
import ExportPresetsPanel from './components/ExportPresetsPanel';
import AISceneSuggestionsPanel from './components/AISceneSuggestionsPanel';
import StoryArcVisualizer from './components/StoryArcVisualizer';
import ProjectQuickActionsMenu from './components/ProjectQuickActionsMenu';
import CoverImageManager from './components/CoverImageManager';
import LazyImage from './components/LazyImage';
import ProjectStatsTooltip from './components/ProjectStatsTooltip';
import SceneBookmarksPanel from './components/SceneBookmarksPanel';
import QuickTemplateCreator from './components/QuickTemplateCreator';
import QuickTagAssigner from './components/QuickTagAssigner';
import BulkTagAssigner from './components/BulkTagAssigner';
import { highlightSearchTerm, highlightAndTruncate } from './utils/searchHighlight';
import QuickActionsMenuWrapper, { setShowToast as setQuickActionsToast } from './components/QuickActionsMenuWrapper';
import ExportQueuePanel, { ExportJob } from './components/ExportQueuePanel';
import SceneDependencyTracker from './components/SceneDependencyTracker';
import { enhanceScenePrompt, suggestDirectorSettings, generateStoryConcept, suggestNextScene } from './clientGeminiService';
import { saveProjectToDB, getProjectsFromDB, ProjectData, deleteProjectFromDB } from './db';
import { apiService, checkApiAvailability } from './apiService';
import { authService, tagsService, templatesService, charactersService, sharingService, locationsService, sceneTemplatesService, activityService, archiveProject, favoritesService } from './apiServices';
import { exportToMarkdown, exportToCSV, exportToPDF, exportToFountain, downloadFile, ExportData, exportEpisodeToPDF, EpisodeExportData, PDFStyle } from './utils/exportUtils';
import { mediaService, episodesService, comicsService } from './apiServices';

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

// Calculate health score for a project (same logic as ProjectHealthScore component)
const calculateProjectHealthScore = (project: ProjectData): number => {
  const { context, scenes } = project;
  
  // Scene Completion (40%)
  const totalScenes = scenes.length;
  const completedScenes = scenes.filter(s => s.status === 'completed').length;
  const sceneCompletion = totalScenes > 0 ? (completedScenes / totalScenes) * 100 : 0;

  // Director Settings Completeness (20%)
  const settingsCount = scenes.filter(s => {
    const ds = s.directorSettings;
    return ds && ds.lens && ds.angle && ds.lighting && ds.movement;
  }).length;
  const settingsScore = totalScenes > 0 ? (settingsCount / totalScenes) * 100 : 0;

  // Character Development (15%)
  const hasCharacters = context.characters && context.characters.trim().length > 0;
  const scenesWithDialogue = scenes.filter(s => s.directorSettings?.dialogue).length;
  const characterDevelopment = (hasCharacters ? 50 : 0) + (totalScenes > 0 ? (scenesWithDialogue / totalScenes) * 50 : 0);

  // Story Structure (15%)
  const hasTitle = context.title && context.title.trim().length > 0;
  const hasGenre = context.genre && context.genre.trim().length > 0;
  const hasPlot = context.plotSummary && context.plotSummary.trim().length > 0;
  const hasContext = context.initialContext && context.initialContext.trim().length > 0;
  const structureScore = (hasTitle ? 25 : 0) + (hasGenre ? 25 : 0) + (hasPlot ? 25 : 0) + (hasContext ? 25 : 0);

  // Export Readiness (10%)
  const exportReadiness = (totalScenes > 0 ? 50 : 0) + 50; // Simplified: assume ready if scenes exist

  // Calculate overall score
  const overall = (
    sceneCompletion * 0.40 +
    settingsScore * 0.20 +
    characterDevelopment * 0.15 +
    structureScore * 0.15 +
    exportReadiness * 0.10
  );

  return Math.round(overall);
};

const App: React.FC = () => {
  // --- Authentication State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // --- View State ---
  const [view, setView] = useState<'library' | 'setup' | 'studio' | 'dashboard' | 'timeline'>('library');
  const [adminViewMode, setAdminViewMode] = useState<'admin' | 'website'>('admin');
  const [studioViewMode, setStudioViewMode] = useState<'storyboard' | 'timeline'>('storyboard');
  
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
  const [lastSavedTime, setLastSavedTime] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandPaletteQuery, setCommandPaletteQuery] = useState('');
  
  // Inputs
  const [currentInput, setCurrentInput] = useState('');
  const [storySeed, setStorySeed] = useState(''); // For auto-generating story

  // Export & Tags
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [projectTags, setProjectTags] = useState<any[]>([]);
  const [showTagsMenu, setShowTagsMenu] = useState(false);
  const [comicExists, setComicExists] = useState(false);
  const [isRegeneratingComic, setIsRegeneratingComic] = useState(false);
  const [showCoverImageSelector, setShowCoverImageSelector] = useState(false);
  const [selectedCoverImageId, setSelectedCoverImageId] = useState<string | null>(null);
  const [draggedSceneIndex, setDraggedSceneIndex] = useState<number | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(new Set());
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Comments & Notes
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [showSceneNotesPanel, setShowSceneNotesPanel] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  // Library View
  const [libraryViewMode, setLibraryViewMode] = useState<'grid' | 'list'>('grid');
  const [librarySortBy, setLibrarySortBy] = useState<'date' | 'title' | 'genre' | 'scenes' | 'updated' | 'favorites' | 'health'>('date');
  const [librarySortOrder, setLibrarySortOrder] = useState<'asc' | 'desc'>('desc');
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [libraryFilterGenre, setLibraryFilterGenre] = useState('');
  const [libraryFilterTags, setLibraryFilterTags] = useState<string[]>([]);
  const [libraryFilterHasCover, setLibraryFilterHasCover] = useState<boolean | null>(null);
  const [libraryFilterSceneCount, setLibraryFilterSceneCount] = useState<{ min?: number; max?: number } | null>(null);
  const [libraryFilterFavorites, setLibraryFilterFavorites] = useState<boolean | null>(null);
  const [libraryCardSize, setLibraryCardSize] = useState<'small' | 'medium' | 'large'>('medium');

  // Templates
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');

  // Characters
  const [showCharactersPanel, setShowCharactersPanel] = useState(false);

  // Locations
  const [showLocationsPanel, setShowLocationsPanel] = useState(false);

  // Analytics
  const [showAnalyticsPanel, setShowAnalyticsPanel] = useState(false);
  const [showAdvancedAnalytics, setShowAdvancedAnalytics] = useState(false);

  // Activity & Notifications
  const [showActivityPanel, setShowActivityPanel] = useState(false);
  const [showNotificationCenter, setShowNotificationCenter] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Settings
  const [showSettingsPanel, setShowSettingsPanel] = useState(false);

  // Scene Templates
  const [showSceneTemplates, setShowSceneTemplates] = useState(false);
  const [sceneTemplates, setSceneTemplates] = useState<any[]>([]);
  const [showSaveSceneTemplateModal, setShowSaveSceneTemplateModal] = useState(false);
  const [sceneTemplateName, setSceneTemplateName] = useState('');

  // Password reset routing state
  const [currentHash, setCurrentHash] = useState(window.location.hash);

  const handleSelectSceneTemplate = (template: any, processedIdea?: string) => {
    setCurrentInput(processedIdea || template.raw_idea);
    if (template.director_settings) {
      setCurrentSettings({ ...currentSettings, ...template.director_settings });
    }
    setShowSceneTemplates(false);
    showToast('Scene template applied!', 'success');
  };

  const handleSaveCurrentAsSceneTemplate = async () => {
    if (!currentInput.trim()) {
      showToast('Please enter a scene idea first', 'warning');
      return;
    }

    if (!sceneTemplateName.trim()) {
      showToast('Please enter a template name', 'warning');
      return;
    }

    try {
      await sceneTemplatesService.create({
        name: sceneTemplateName,
        raw_idea: currentInput,
        director_settings: currentSettings
      });
      showToast('Scene template saved!', 'success');
      setShowSaveSceneTemplateModal(false);
      setSceneTemplateName('');
      // Reload templates
      const templates = await sceneTemplatesService.getAll();
      setSceneTemplates((templates as any)?.templates || []);
    } catch (error: any) {
      showToast('Error: ' + error.message, 'error');
    }
  };

  // Set up toast callback for QuickActionsMenuWrapper
  useEffect(() => {
    setQuickActionsToast(showToast);
  }, []);

  // Toast Notifications
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: 'success' | 'error' | 'info' | 'warning' }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info') => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Sharing
  const [showSharingModal, setShowSharingModal] = useState(false);
  const [showExportHistoryPanel, setShowExportHistoryPanel] = useState(false);
  const [showProjectStatisticsPanel, setShowProjectStatisticsPanel] = useState(false);
  const [showScenePreviewModal, setShowScenePreviewModal] = useState(false);
  const [previewSceneIndex, setPreviewSceneIndex] = useState(0);
  const [showStoryboardPlayback, setShowStoryboardPlayback] = useState(false);
  const [showAdvancedSearchPanel, setShowAdvancedSearchPanel] = useState(false);
  const [showTemplatesLibrary, setShowTemplatesLibrary] = useState(false);
  const [showAIStoryAnalysis, setShowAIStoryAnalysis] = useState(false);
  const [showShotListGenerator, setShowShotListGenerator] = useState(false);
  const [showShootingSchedule, setShowShootingSchedule] = useState(false);
  const [showCallSheet, setShowCallSheet] = useState(false);
  const [callSheetDay, setCallSheetDay] = useState<any>(null);
  const [showBudgetEstimator, setShowBudgetEstimator] = useState(false);
  const [showVideoExport, setShowVideoExport] = useState(false);
  const [showSceneComparison, setShowSceneComparison] = useState(false);
  const [showCharacterGraph, setShowCharacterGraph] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showProjectHealth, setShowProjectHealth] = useState(false);
  const [quickActionsMenu, setQuickActionsMenu] = useState<{ scene: Scene; position: { x: number; y: number } } | null>(null);
  const [showCopySettingsModal, setShowCopySettingsModal] = useState(false);
  const [sourceSceneForCopy, setSourceSceneForCopy] = useState<Scene | null>(null);
  const [showExportPresets, setShowExportPresets] = useState(false);
  const [showAISceneSuggestions, setShowAISceneSuggestions] = useState(false);
  const [showStoryArcVisualizer, setShowStoryArcVisualizer] = useState(false);
  const [selectedProjectForSharing, setSelectedProjectForSharing] = useState<ProjectData | null>(null);
  const [projectQuickActions, setProjectQuickActions] = useState<{ project: ProjectData; position: { x: number; y: number } } | null>(null);
  const [showCoverImageManager, setShowCoverImageManager] = useState(false);
  const [coverImageProjectId, setCoverImageProjectId] = useState<string | null>(null);
  const [coverImageProjectUrl, setCoverImageProjectUrl] = useState<string | null>(null);
  const [showSceneBookmarks, setShowSceneBookmarks] = useState(false);
  const [showExportQueue, setShowExportQueue] = useState(false);
  const [exportQueue, setExportQueue] = useState<ExportJob[]>([]);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [showSceneDependencyTracker, setShowSceneDependencyTracker] = useState(false);
  const [hoveredProjectForTooltip, setHoveredProjectForTooltip] = useState<{ project: ProjectData; position: { x: number; y: number } } | null>(null);
  const [batchGeneratingCovers, setBatchGeneratingCovers] = useState(false);
  const [showQuickTemplateCreator, setShowQuickTemplateCreator] = useState(false);
  const [templateCreatorProject, setTemplateCreatorProject] = useState<ProjectData | null>(null);
  const [showQuickTagAssigner, setShowQuickTagAssigner] = useState(false);
  const [tagAssignerProject, setTagAssignerProject] = useState<ProjectData | null>(null);
  const [favoritedProjects, setFavoritedProjects] = useState<Set<string>>(new Set());
  const [libraryBatchMode, setLibraryBatchMode] = useState(false);
  const [selectedLibraryProjectIds, setSelectedLibraryProjectIds] = useState<Set<string>>(new Set());
  const [showBulkTagAssigner, setShowBulkTagAssigner] = useState(false);

  // Undo/Redo
  const [history, setHistory] = useState<ProjectData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySize = 50;

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Check admin view mode preference
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      const viewMode = localStorage.getItem('admin_view_mode') || 'admin';
      setAdminViewMode(viewMode as 'admin' | 'website');
    }
  }, [currentUser]);

  // Check admin view mode preference (must be before conditional returns)
  useEffect(() => {
    if (currentUser?.role === 'admin') {
      const viewMode = localStorage.getItem('admin_view_mode') || 'admin';
      setAdminViewMode(viewMode as 'admin' | 'website');
    }
  }, [currentUser]);

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
    } catch (error: any) {
      // Clear invalid token
      localStorage.removeItem('auth_token');
      setIsAuthenticated(false);
      setCurrentUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogin = (token: string, user: any) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    // Clear auth token and any per-session state
    localStorage.removeItem('auth_token');
    // Optional: clear admin view preference so next login starts fresh
    localStorage.removeItem('admin_view_mode');

    // Reset in-memory state
    setCurrentUser(null);
    setIsAuthenticated(false);
    setView('library');
    setStoryContext(DEFAULT_CONTEXT);
    setScenes([]);
    setCurrentSettings(DEFAULT_DIRECTOR_SETTINGS);
    setProjects([]);
    setShowCommentsPanel(false);
    setShowSceneNotesPanel(false);
    setSelectedSceneId(null);

    // Hard reload to ensure all components reset and any stale data is cleared
    window.location.href = '/';
  };

  // --- Persistence & Lifecycle ---

  // Load projects when entering library view (only if authenticated)
  useEffect(() => {
    if (view === 'library' && isAuthenticated) {
      loadLibrary();
      loadFavorites();
      
      const onFocus = () => {
        if (isAuthenticated) {
          loadLibrary();
          loadFavorites();
        }
      };
      window.addEventListener('focus', onFocus);
      return () => window.removeEventListener('focus', onFocus);
    }
  }, [view, isAuthenticated]);

  // History management for undo/redo
  const addToHistory = useRef(false); // Flag to prevent adding during undo/redo

  const saveToHistory = (projectData: ProjectData) => {
    if (addToHistory.current) return; // Skip if we're in the middle of undo/redo
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(projectData))); // Deep clone
      if (newHistory.length > maxHistorySize) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex(prev => {
      const newIndex = prev + 1;
      return newIndex >= maxHistorySize ? maxHistorySize - 1 : newIndex;
    });
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      addToHistory.current = true;
      const prevState = history[historyIndex - 1];
      setStoryContext({ ...prevState.context });
      setScenes([...prevState.scenes]);
      setCurrentSettings({ ...prevState.settings });
      setHistoryIndex(prev => prev - 1);
      setTimeout(() => { addToHistory.current = false; }, 100);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      addToHistory.current = true;
      const nextState = history[historyIndex + 1];
      setStoryContext({ ...nextState.context });
      setScenes([...nextState.scenes]);
      setCurrentSettings({ ...nextState.settings });
      setHistoryIndex(prev => prev + 1);
      setTimeout(() => { addToHistory.current = false; }, 100);
    }
  };

  // Initialize history when project opens
  useEffect(() => {
    if (view === 'studio' && storyContext.id) {
      const currentState: ProjectData = {
        context: { ...storyContext },
        scenes: [...scenes],
        settings: { ...currentSettings }
      };
      setHistory([currentState]);
      setHistoryIndex(0);
    }
  }, [view, storyContext.id]); // Only when opening project

  // Add to history when scenes/context change (debounced)
  useEffect(() => {
    if (view === 'studio' && storyContext.id && !addToHistory.current) {
      const timeout = setTimeout(() => {
        const currentState: ProjectData = {
          context: { ...storyContext },
          scenes: [...scenes],
          settings: { ...currentSettings }
        };
        saveToHistory(currentState);
      }, 2000); // Debounce history additions
      return () => clearTimeout(timeout);
    }
  }, [scenes.length, storyContext.title, storyContext.plotSummary, currentSettings]);

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

      const timeout = setTimeout(saveData, 1500); // Debounce 1.5s
      return () => clearTimeout(timeout);
    }
  }, [storyContext.title, storyContext.plotSummary, storyContext.genre, storyContext.characters, scenes, currentSettings, view, storyContext.id]);

  // Scroll to bottom when scenes change
  useEffect(() => {
    if (bottomRef.current && view === 'studio') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [scenes, view]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle shortcuts when not typing in inputs (except Ctrl+F for search)
      if ((e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) && 
          !((e.ctrlKey || e.metaKey) && e.key === 'f')) {
        return;
      }

      // Ctrl+F or Cmd+F - Open Advanced Search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (view === 'library') {
          setShowAdvancedSearch(true);
        } else if (view === 'studio') {
          setShowAdvancedSearchPanel(true);
        }
        return;
      }

      // Ctrl/Cmd + S - Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        if (view === 'studio' && storyContext.id) {
          handleManualSave();
        }
      }

      // Ctrl/Cmd + E - Export
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        if (view === 'studio') {
          setShowExportMenu(!showExportMenu);
        }
      }

      // Ctrl/Cmd + N - New scene (if in studio)
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault();
        if (view === 'studio') {
          // Focus on input field
          const input = document.querySelector('textarea[placeholder*="idea"]') as HTMLTextAreaElement;
          if (input) input.focus();
        }
      }

      // Ctrl/Cmd + C - Comments (if in studio)
      if ((e.ctrlKey || e.metaKey) && e.key === 'c' && view === 'studio' && storyContext.id) {
        e.preventDefault();
        setShowCommentsPanel(true);
      }

      // Ctrl/Cmd + Z - Undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (view === 'studio') {
          handleUndo();
        }
      }

      // Ctrl/Cmd + Shift + Z - Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        if (view === 'studio') {
          handleRedo();
        }
      }

      // Ctrl/Cmd + Y - Redo (alternative)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        if (view === 'studio') {
          handleRedo();
        }
      }

      // Ctrl/Cmd + F - Advanced Search
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        if (view === 'library') {
          setShowAdvancedSearch(true);
        } else if (view === 'studio') {
          setShowAdvancedSearchPanel(true);
        }
      }

      // Ctrl/Cmd + Arrow Up/Down - Reorder scenes
      if ((e.ctrlKey || e.metaKey) && (e.key === 'ArrowUp' || e.key === 'ArrowDown') && view === 'studio' && !batchMode) {
        e.preventDefault();
        handleSceneReorder(e.key === 'ArrowUp' ? 'up' : 'down');
      }

      // Ctrl/Cmd + / - Show shortcuts help
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        const shortcuts = view === 'library' 
          ? `Library Shortcuts:\n\nCtrl+F - Advanced search\nCtrl+N - New project\nCtrl+/ - Show this help\nEsc - Close modals\n\nStudio Shortcuts:\nCtrl+S - Save project\nCtrl+E - Export menu\nCtrl+N - Focus new scene input\nCtrl+C - Comments panel\nCtrl+↑/↓ - Move scene up/down\nCtrl+Z - Undo\nCtrl+Shift+Z / Ctrl+Y - Redo`
          : `Keyboard Shortcuts:\n\nCtrl+S - Save project\nCtrl+E - Export menu\nCtrl+N - Focus new scene input\nCtrl+C - Comments panel\nCtrl+F - Advanced search\nCtrl+↑/↓ - Move scene up/down\nCtrl+Z - Undo\nCtrl+Shift+Z / Ctrl+Y - Redo\nCtrl+/ - Show this help\nEsc - Close modals`;
        alert(shortcuts);
      }


      // Escape - Close modals
      if (e.key === 'Escape') {
        setShowExportMenu(false);
        setShowTagsMenu(false);
        setShowCommentsPanel(false);
        setShowSceneNotesPanel(false);
        if (view === 'library') {
          setShowAdvancedSearch(false);
        } else {
          setShowAdvancedSearchPanel(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, storyContext.id, showExportMenu]);

  const loadFavorites = async () => {
    try {
      const favorites = await favoritesService.getAll();
      const favoriteIds = new Set<string>();
      if (Array.isArray(favorites)) {
        favorites.forEach((f: any) => {
          if (f.id || f.project_id) favoriteIds.add(f.id || f.project_id);
        });
      } else if (favorites && (favorites as any).favorites) {
        ((favorites as any).favorites as any[]).forEach((f: any) => {
          if (f.id || f.project_id) favoriteIds.add(f.id || f.project_id);
        });
      }
      setFavoritedProjects(favoriteIds);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  const loadLibrary = async () => {
    // Don't load if not authenticated
    if (!isAuthenticated) {
      return;
    }
    try {
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        const list = await apiService.getProjects();
        setProjects(list);
      } else {
        const list = await getProjectsFromDB();
        setProjects(list);
      }
    } catch (e: any) {
      console.error("Failed to load library", e);
      // If it's an auth error, clear token and reload
      if (e.message && (e.message.includes('Authentication required') || e.message.includes('401'))) {
        localStorage.removeItem('auth_token');
        setIsAuthenticated(false);
        setCurrentUser(null);
        return;
      }
      // Fallback to IndexedDB
      try {
        const list = await getProjectsFromDB();
        setProjects(list);
      } catch (fallbackError) {
        console.error("IndexedDB fallback also failed:", fallbackError);
      }
    }
  };

  // Load notifications
  const loadNotifications = async () => {
    if (!isAuthenticated) return;
    try {
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        const data = await activityService.getNotifications(50);
        setNotifications((data as any)?.notifications || []);
        setUnreadNotificationCount((data as any)?.unread_count || 0);
      }
    } catch (error) {
      console.error('Failed to load notifications:', error);
    }
  };

  // Notification handlers
  const handleMarkNotificationRead = async (id: number) => {
    try {
      await activityService.markNotificationRead(id);
      await loadNotifications();
    } catch (error) {
      showToast('Failed to mark notification as read', 'error');
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await activityService.markAllNotificationsRead();
      await loadNotifications();
      showToast('All notifications marked as read', 'success');
    } catch (error) {
      showToast('Failed to mark all as read', 'error');
    }
  };

  const handleDeleteNotification = async (id: number) => {
    try {
      await activityService.deleteNotification(id);
      await loadNotifications();
      showToast('Notification deleted', 'success');
    } catch (error) {
      showToast('Failed to delete notification', 'error');
    }
  };

  const handleOpenProject = async (project: ProjectData) => {
    setStoryContext(project.context);
    setScenes(project.scenes);
    setCurrentSettings(project.settings);
    setView('studio');
    
    // Track view
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/analytics/project/${project.context.id}/view`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      // Silent fail
    }
  };

  const handleDuplicateProject = async (e: React.MouseEvent, project: ProjectData) => {
    e.stopPropagation();
    try {
      const newId = generateId();
      const duplicatedProject: ProjectData = {
        context: {
          ...project.context,
          id: newId,
          title: `${project.context.title} (Copy)`,
          lastUpdated: Date.now()
        },
        scenes: project.scenes.map(scene => ({
          ...scene,
          id: generateId()
        })),
        settings: project.settings
      };

      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        await apiService.saveProject(duplicatedProject);
        // Log activity
        try {
          await activityService.logActivity({
            project_id: newId,
            activity_type: 'project_duplicated',
            activity_description: `Duplicated project: ${project.context.title}`
          });
        } catch (e) {
          // Silent fail
        }
      } else {
        await saveProjectToDB(duplicatedProject);
      }
      loadLibrary();
      showToast('Project duplicated successfully!', 'success');
    } catch (error) {
      console.error("Failed to duplicate project:", error);
      showToast('Failed to duplicate project', 'error');
    }
  };

  const handleArchiveProject = async (e: React.MouseEvent, projectId: string, archived: boolean) => {
    e.stopPropagation();
    try {
      await archiveProject(projectId, archived);
      await loadLibrary();
      showToast(`Project ${archived ? 'archived' : 'unarchived'} successfully!`, 'success');
    } catch (error: any) {
      showToast('Error: ' + error.message, 'error');
    }
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
    // Immediately start a blank project without requiring templates to load
    const newContext: StoryContext = {
      ...DEFAULT_CONTEXT,
      id: generateId(),
      lastUpdated: Date.now()
    };

    setStoryContext(newContext);
    setScenes([]);
    setCurrentSettings(DEFAULT_DIRECTOR_SETTINGS);
    setSetupTab('new');
    setView('setup');
  };

  const handleTemplateSelect = (template: any) => {
    const newContext: StoryContext = {
      id: generateId(),
      title: '',
      genre: template.genre || '',
      plotSummary: template.plot_summary || '',
      characters: template.characters || '',
      initialContext: template.initial_context || '',
      lastUpdated: Date.now()
    };

    const templateSettings: DirectorSettings = template.director_settings 
      ? { ...DEFAULT_DIRECTOR_SETTINGS, ...template.director_settings }
      : DEFAULT_DIRECTOR_SETTINGS;

    setStoryContext(newContext);
    setScenes([]);
    setCurrentSettings(templateSettings);
    setSetupTab('new');
    setView('setup');
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    try {
      await templatesService.create({
        name: templateName,
        description: `Template based on "${storyContext.title}"`,
        genre: storyContext.genre,
        plot_summary: storyContext.plotSummary,
        characters: storyContext.characters,
        initial_context: storyContext.initialContext,
        director_settings: currentSettings
      });
      alert('Template saved successfully!');
      setShowSaveTemplateModal(false);
      setTemplateName('');
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
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
      showToast('Project imported successfully!', 'success');
        } else {
          showToast('Invalid project file format', 'error');
        }
      } catch (error) {
        console.error("Import failed", error);
        showToast('Failed to parse project file', 'error');
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  // --- Setup Actions ---

  const handleAutoGenerateStory = async () => {
    if (!storySeed.trim()) {
      showToast('Please enter a story idea first', 'error');
      return;
    }
    
    setIsAutoFilling(true);
    try {
      const generated = await generateStoryConcept(storySeed);
      
      // Log what we received for debugging
      console.log('Generated story concept:', {
        title: generated.title,
        genre: generated.genre,
        hasPlotSummary: !!generated.plotSummary,
        hasCharacters: !!generated.characters,
        hasInitialContext: !!generated.initialContext
      });
      
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
      setLastSavedTime(new Date());
      
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
        setLastSavedTime(new Date());
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

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled || !storyContext.id || view !== 'studio') return;

    const autoSaveInterval = setInterval(async () => {
      // Only auto-save if there are changes
      if (scenes.length > 0 || storyContext.title) {
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
          setLastSavedTime(new Date());
          // Silent save - don't show status unless there's an error
        } catch (error) {
          console.error("Auto-save failed:", error);
          // Try IndexedDB fallback
          try {
            const updatedContext = { ...storyContext, lastUpdated: Date.now() };
            await saveProjectToDB({
              context: updatedContext,
              scenes,
              settings: currentSettings
            });
            setStoryContext(updatedContext);
            setLastSavedTime(new Date());
          } catch (fallbackError) {
            console.error("Auto-save fallback failed:", fallbackError);
          }
        }
      }
    }, 30000); // Auto-save every 30 seconds

    return () => clearInterval(autoSaveInterval);
  }, [autoSaveEnabled, storyContext, scenes, currentSettings, view]);

  const handleExitToLibrary = () => {
    setView('library');
  };

  const getExportData = async (): Promise<ExportData> => {
    const sceneMediaMap = new Map<string, any[]>();
    
    // Fetch media for all scenes if API is available
    try {
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable && storyContext.id) {
        for (const scene of scenes) {
          try {
            const media = await mediaService.getSceneMedia(scene.id);
            if (media && media.length > 0) {
              sceneMediaMap.set(scene.id, media);
            }
          } catch (error) {
            console.warn(`Failed to load media for scene ${scene.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load media for export:', error);
    }
    
    return {
      context: storyContext,
      scenes: scenes,
      settings: currentSettings,
      exportedAt: new Date().toISOString(),
      sceneMedia: sceneMediaMap
    };
  };

  const handleExport = async (format: 'json' | 'markdown' | 'csv' | 'pdf' | 'fountain') => {
    const filename = `${storyContext.title.replace(/\s+/g, '_')}_storyboard`;
    
    try {
      const data = await getExportData();
      
      switch (format) {
        case 'json':
          downloadFile(
            JSON.stringify(data, null, 2),
            `${filename}.json`,
            'application/json'
          );
          break;
        case 'markdown':
          downloadFile(
            exportToMarkdown(data),
            `${filename}.md`,
            'text/markdown'
          );
          break;
        case 'csv':
          downloadFile(
            exportToCSV(data),
            `${filename}.csv`,
            'text/csv'
          );
          break;
        case 'fountain':
          downloadFile(
            exportToFountain(data),
            `${filename}.fountain`,
            'text/plain'
          );
          break;
          case 'pdf':
          // Ask user for PDF style preference with a better dialog
          const styleChoice = window.prompt(
            'Choose PDF Export Style:\n\n' +
            'Enter "1" for Comic Book Style (DC/Marvel style with panels, speech bubbles, dramatic design)\n' +
            'Enter "2" for Raw/Plain Style (Traditional document format)\n\n' +
            'Your choice (1 or 2):',
            '1'
          );
          const pdfStyle: PDFStyle = (styleChoice === '2') ? 'raw' : 'comic';
          
          // If comic style, use project cover image automatically (or show selector if user wants to choose)
          if (pdfStyle === 'comic') {
            // Check if project has a cover image - if so, use it automatically
            if (storyContext.coverImageUrl) {
              // Use project cover image (pass null to use projectContext.coverImageUrl in backend)
              await exportToPDF(data, pdfStyle, undefined, null);
            } else {
              // No project cover, show selector to choose from media
              setShowCoverImageSelector(true);
              // The actual export will happen after cover image is selected
              return; // Exit early, export will continue in handleCoverImageSelect
            }
            break;
          }
          
          await exportToPDF(data, pdfStyle);
          break;
      }
      
      // Track export in database if API available
      try {
        const apiAvailable = await checkApiAvailability();
        if (apiAvailable && storyContext.id) {
          const token = localStorage.getItem('auth_token');
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/exports`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              project_id: storyContext.id,
              export_type: format,
              file_name: `${filename}.${format === 'pdf' ? 'pdf' : format}`,
            }),
          });
        }
      } catch (e) {
        console.error('Failed to track export:', e);
      }
      
      setShowExportMenu(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  // Export Queue Management
  const addExportToQueue = (job: Omit<ExportJob, 'id' | 'status' | 'progress' | 'createdAt'>) => {
    const newJob: ExportJob = {
      ...job,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      status: 'queued',
      progress: 0,
      createdAt: new Date()
    };
    setExportQueue(prev => [...prev, newJob]);
    processExportQueue();
    showToast(`Export added to queue`, 'info');
  };

  const processExportQueue = async () => {
    if (processingJobId) return; // Already processing

    const nextJob = exportQueue.find(j => j.status === 'queued');
    if (!nextJob) return;

    setProcessingJobId(nextJob.id);
    setExportQueue(prev => prev.map(j => 
      j.id === nextJob.id ? { ...j, status: 'processing' as const, progress: 10 } : j
    ));

    try {
      const filename = `${nextJob.projectTitle.replace(/\s+/g, '_')}_storyboard`;
      const data = await getExportData();
      
      // Update progress
      setExportQueue(prev => prev.map(j => 
        j.id === nextJob.id ? { ...j, progress: 30 } : j
      ));

      let fileDownloaded = false;
      switch (nextJob.format) {
        case 'json':
          downloadFile(JSON.stringify(data, null, 2), `${filename}.json`, 'application/json');
          fileDownloaded = true;
          break;
        case 'markdown':
          downloadFile(exportToMarkdown(data), `${filename}.md`, 'text/markdown');
          fileDownloaded = true;
          break;
        case 'csv':
          downloadFile(exportToCSV(data), `${filename}.csv`, 'text/csv');
          fileDownloaded = true;
          break;
        case 'fountain':
          downloadFile(exportToFountain(data), `${filename}.fountain`, 'text/plain');
          fileDownloaded = true;
          break;
        case 'pdf':
          setExportQueue(prev => prev.map(j => 
            j.id === nextJob.id ? { ...j, progress: 50 } : j
          ));
          const styleChoice = window.prompt(
            'Choose PDF Export Style:\n\n' +
            'Enter "1" for Comic Book Style\n' +
            'Enter "2" for Raw/Plain Style\n\n' +
            'Your choice (1 or 2):',
            '1'
          );
          const pdfStyle: PDFStyle = (styleChoice === '2') ? 'raw' : 'comic';
          if (pdfStyle === 'comic') {
            setSelectedCoverImageId(null);
            setShowCoverImageSelector(true);
            // Store job info for later completion
            (window as any).pendingPdfExportJob = nextJob.id;
            setExportQueue(prev => prev.map(j => 
              j.id === nextJob.id ? { ...j, progress: 70 } : j
            ));
            return; // Will complete after cover image selection
          }
          await exportToPDF(data, pdfStyle);
          fileDownloaded = true;
          break;
      }

      setExportQueue(prev => prev.map(j => 
        j.id === nextJob.id ? { 
          ...j, 
          status: 'completed' as const, 
          progress: 100,
          fileName: `${filename}.${nextJob.format === 'pdf' ? 'pdf' : nextJob.format}`
        } : j
      ));

      // Track export in database
      try {
        const apiAvailable = await checkApiAvailability();
        if (apiAvailable && storyContext.id) {
          const token = localStorage.getItem('auth_token');
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/exports`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              project_id: storyContext.id,
              export_type: nextJob.format,
              file_name: `${filename}.${nextJob.format === 'pdf' ? 'pdf' : nextJob.format}`,
            }),
          });
        }
      } catch (e) {
        console.error('Failed to track export:', e);
      }

      showToast(`Export completed: ${filename}`, 'success');
    } catch (error: any) {
      setExportQueue(prev => prev.map(j => 
        j.id === nextJob.id ? { 
          ...j, 
          status: 'failed' as const,
          error: error.message || 'Export failed'
        } : j
      ));
      showToast(`Export failed: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setProcessingJobId(null);
      // Process next job
      setTimeout(() => processExportQueue(), 500);
    }
  };

  const cancelExportJob = (jobId: string) => {
    setExportQueue(prev => prev.map(j => 
      j.id === jobId ? { ...j, status: 'cancelled' as const } : j
    ));
    if (processingJobId === jobId) {
      setProcessingJobId(null);
      setTimeout(() => processExportQueue(), 500);
    }
    showToast('Export cancelled', 'info');
  };

  const retryExportJob = (jobId: string) => {
    setExportQueue(prev => prev.map(j => 
      j.id === jobId ? { 
        ...j, 
        status: 'queued' as const, 
        progress: 0,
        error: undefined
      } : j
    ));
    processExportQueue();
    showToast('Export retried', 'info');
  };

  const clearCompletedExports = () => {
    setExportQueue(prev => prev.filter(j => j.status !== 'completed'));
    showToast('Completed exports cleared', 'info');
  };

  // Load tags and check comic existence when project is loaded
  useEffect(() => {
    if (view === 'studio' && storyContext.id) {
      loadTags();
      checkComicExists();
    }
  }, [view, storyContext.id]);

  // Load notifications on mount and poll for updates
  useEffect(() => {
    if (isAuthenticated) {
      loadNotifications();
      // Poll for new notifications every 30 seconds
      const interval = setInterval(() => {
        loadNotifications();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  // Listen for comic generation events
  useEffect(() => {
    const handleComicGenerated = () => {
      checkComicExists();
    };
    window.addEventListener('comicGenerated', handleComicGenerated);
    return () => window.removeEventListener('comicGenerated', handleComicGenerated);
  }, []);

  const checkComicExists = async () => {
    if (!storyContext.id) return;
    try {
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        const response = await comicsService.get(storyContext.id);
        setComicExists((response as any)?.exists || false);
      }
    } catch (error) {
      console.error('Failed to check comic existence:', error);
      setComicExists(false);
    }
  };

  const handleCoverImageSelect = async (imageId: string | null) => {
    setSelectedCoverImageId(imageId);
    setShowCoverImageSelector(false);
    
    // Check if this is for a queued export
    const pendingJobId = (window as any).pendingPdfExportJob;
    if (pendingJobId) {
      const job = exportQueue.find(j => j.id === pendingJobId);
      if (job) {
        try {
          setExportQueue(prev => prev.map(j => 
            j.id === pendingJobId ? { ...j, progress: 80 } : j
          ));
          const data = await getExportData();
          await exportToPDF(data, 'comic', undefined, imageId);
          const filename = `${job.projectTitle.replace(/\s+/g, '_')}_storyboard`;
          setExportQueue(prev => prev.map(j => 
            j.id === pendingJobId ? { 
              ...j, 
              status: 'completed' as const, 
              progress: 100,
              fileName: `${filename}.pdf`
            } : j
          ));
          showToast(`Export completed: ${filename}`, 'success');
          // Track export
          try {
            const apiAvailable = await checkApiAvailability();
            if (apiAvailable && storyContext.id) {
              const token = localStorage.getItem('auth_token');
              await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/exports`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  project_id: storyContext.id,
                  export_type: 'pdf',
                  file_name: `${filename}.pdf`,
                }),
              });
            }
          } catch (e) {
            console.error('Failed to track export:', e);
          }
          setProcessingJobId(null);
          setTimeout(() => processExportQueue(), 500);
        } catch (error: any) {
          setExportQueue(prev => prev.map(j => 
            j.id === pendingJobId ? { 
              ...j, 
              status: 'failed' as const,
              error: error.message || 'Export failed'
            } : j
          ));
          showToast(`Export failed: ${error.message || 'Unknown error'}`, 'error');
          setProcessingJobId(null);
          setTimeout(() => processExportQueue(), 500);
        }
        (window as any).pendingPdfExportJob = null;
        return;
      }
    }
    
    // Regular export (not queued)
    try {
      const data = await getExportData();
      await exportToPDF(data, 'comic', undefined, imageId);
      // Refresh comic existence status after export
      setTimeout(() => checkComicExists(), 1000);
    } catch (error: any) {
      console.error('Export error:', error);
      showToast('Failed to export comic: ' + (error.message || 'Unknown error'), 'error');
    }
  };

  const handleRegenerateComic = async () => {
    if (!storyContext.id) return;
    
    if (!window.confirm('Regenerate comic? This will create a new version using the latest scenes.')) {
      return;
    }

    setIsRegeneratingComic(true);
    try {
      const apiAvailable = await checkApiAvailability();
      if (!apiAvailable) {
        alert('API not available. Please check your connection.');
        return;
      }

      // Delete existing comic
      await comicsService.delete(storyContext.id);
      
      // Get export data
      const data = await getExportData();
      
      // Generate new comic (use previously selected cover image if available)
      const response = await comicsService.generate({
        projectId: storyContext.id,
        projectContext: data.context,
        scenes: data.scenes,
        coverImageId: selectedCoverImageId || undefined
      });

      if (response.comic?.htmlContent) {
        // Display the new comic
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          alert('Please allow popups to export PDF');
          return;
        }
        
        printWindow.document.write(response.comic.htmlContent);
        printWindow.document.close();
        
        setTimeout(() => {
          printWindow.print();
        }, 1500);

        setComicExists(true);
        showToast('Comic regenerated successfully!', 'success');
      }
    } catch (error: any) {
      console.error('Error regenerating comic:', error);
      showToast('Failed to regenerate comic: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setIsRegeneratingComic(false);
      setShowExportMenu(false);
    }
  };

  const loadTags = async () => {
    try {
      const response = await tagsService.getAll();
      // Tags service returns { tags: [...] } or just the array
      const tags = (response as any)?.tags || (Array.isArray(response) ? response : []);
      setAvailableTags(Array.isArray(tags) ? tags : []);
    } catch (error) {
      console.error('Failed to load tags:', error);
      setAvailableTags([]);
    }
  };

  const handleAddTag = async (tagId: number) => {
    if (!storyContext.id) return;
    try {
      await tagsService.addToProject(tagId, storyContext.id);
      await loadTags();
      setShowTagsMenu(false);
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    if (!storyContext.id) return;
    try {
      await tagsService.removeFromProject(tagId, storyContext.id);
      await loadTags();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!batchMode) {
      setDraggedSceneIndex(index);
      // Set drag image for better visual feedback
      const target = e.currentTarget as HTMLElement;
      const dragImage = target.cloneNode(true) as HTMLElement;
      dragImage.style.opacity = '0.8';
      dragImage.style.transform = 'rotate(2deg)';
      dragImage.style.width = `${target.offsetWidth}px`;
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, e.clientX - target.getBoundingClientRect().left, e.clientY - target.getBoundingClientRect().top);
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => document.body.removeChild(dragImage), 0);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!batchMode && draggedSceneIndex !== null && draggedSceneIndex !== index) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear if we're actually leaving the drop zone
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    setDragOverIndex(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (batchMode || draggedSceneIndex === null || draggedSceneIndex === dropIndex) {
      setDraggedSceneIndex(null);
      return;
    }

    const newScenes = [...scenes];
    const draggedScene = newScenes[draggedSceneIndex];
    newScenes.splice(draggedSceneIndex, 1);
    newScenes.splice(dropIndex, 0, draggedScene);

    // Update sequence numbers
    const updatedScenes = newScenes.map((scene, idx) => ({
      ...scene,
      sequenceNumber: idx + 1,
    }));

    setScenes(updatedScenes);
    setDraggedSceneIndex(null);

    // Save reordered scenes to backend using batch endpoint
    try {
      const updatedContext = { ...storyContext, lastUpdated: Date.now() };
      const apiAvailable = await checkApiAvailability();
      
      if (apiAvailable) {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('auth_token');
        
        // Update sequence numbers using batch endpoint
        const sequenceUpdates = updatedScenes.map((scene, idx) => ({
          id: scene.id,
          sequence_number: idx + 1,
        }));

        await fetch(`${API_BASE_URL}/clips/batch`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clip_ids: updatedScenes.map(s => s.id),
            operation: 'update_sequence',
            data: { sequence_updates: sequenceUpdates },
          }),
        });

        // Also save project metadata
        await apiService.saveProject({
          context: updatedContext,
          scenes: updatedScenes,
          settings: currentSettings
        });
      } else {
        await saveProjectToDB({
          context: updatedContext,
          scenes: updatedScenes,
          settings: currentSettings
        });
      }
      setStoryContext(updatedContext);
      const movedFrom = draggedSceneIndex + 1;
      const movedTo = dropIndex + 1;
      showToast(`Scene moved from position ${movedFrom} to ${movedTo}`, 'success');
    } catch (error) {
      console.error('Failed to save reordered scenes:', error);
      showToast('Failed to save reordered scenes', 'error');
    }
  };

  // Keyboard shortcuts for scene reordering
  const handleSceneReorder = (direction: 'up' | 'down') => {
    if (batchMode || scenes.length === 0 || view !== 'studio') return;
    
    // Find the first selected scene, or use the first scene if none selected
    const selectedSceneId = selectedSceneIds.size > 0 
      ? Array.from(selectedSceneIds)[0] 
      : scenes[0]?.id;
    
    if (!selectedSceneId) return;
    
    const currentIndex = scenes.findIndex(s => s.id === selectedSceneId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= scenes.length) return;
    
    // Simulate drag and drop
    const newScenes = [...scenes];
    const draggedScene = newScenes[currentIndex];
    newScenes.splice(currentIndex, 1);
    newScenes.splice(newIndex, 0, draggedScene);
    
    const updatedScenes = newScenes.map((scene, idx) => ({
      ...scene,
      sequenceNumber: idx + 1,
    }));
    
    setScenes(updatedScenes);
    
    // Save to backend
    (async () => {
      try {
        const updatedContext = { ...storyContext, lastUpdated: Date.now() };
        const apiAvailable = await checkApiAvailability();
        
        if (apiAvailable) {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
          const token = localStorage.getItem('auth_token');
          
          const sequenceUpdates = updatedScenes.map((scene, idx) => ({
            id: scene.id,
            sequence_number: idx + 1,
          }));
          
          await fetch(`${API_BASE_URL}/clips/batch`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clip_ids: updatedScenes.map(s => s.id),
              operation: 'update_sequence',
              data: { sequence_updates: sequenceUpdates },
            }),
          });
          
          await apiService.saveProject({
            context: updatedContext,
            scenes: updatedScenes,
            settings: currentSettings
          });
        } else {
          await saveProjectToDB({
            context: updatedContext,
            scenes: updatedScenes,
            settings: currentSettings
          });
        }
        
        setStoryContext(updatedContext);
        showToast(`Scene moved ${direction === 'up' ? 'up' : 'down'}`, 'success');
      } catch (error: any) {
        console.error('Failed to reorder scene:', error);
        showToast('Failed to reorder scene', 'error');
        setScenes(scenes);
      }
    })();
  };

  // Batch selection handlers
  const handleToggleSceneSelection = (sceneId: string) => {
    setSelectedSceneIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sceneId)) {
        newSet.delete(sceneId);
      } else {
        newSet.add(sceneId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedSceneIds.size === scenes.length) {
      setSelectedSceneIds(new Set());
    } else {
      setSelectedSceneIds(new Set(scenes.map(s => s.id)));
    }
  };

  // Bulk operations
  const handleBulkDelete = async () => {
    if (selectedSceneIds.size === 0) return;
    const count = selectedSceneIds.size;
    if (!window.confirm(`Delete ${count} selected scene(s)?`)) return;

    try {
      const apiAvailable = await checkApiAvailability();
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('auth_token');
      const idsToDelete = Array.from(selectedSceneIds);

      // Delete from backend using batch endpoint
      if (apiAvailable) {
        const response = await fetch(`${API_BASE_URL}/clips/batch`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clip_ids: idsToDelete,
            operation: 'delete',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to delete scenes');
        }
      }

      // Update local state
      setScenes(prev => {
        const filtered = prev.filter(s => !selectedSceneIds.has(s.id));
        return filtered.map((s, idx) => ({
          ...s,
          sequenceNumber: idx + 1
        }));
      });

      setSelectedSceneIds(new Set());
      showToast(`${count} scene(s) deleted successfully`, 'success');
    } catch (error: any) {
      showToast('Failed to delete scenes', 'error');
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedSceneIds.size === 0) return;

    try {
      const apiAvailable = await checkApiAvailability();
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('auth_token');

      // Update in backend using batch endpoint
      if (apiAvailable) {
        const response = await fetch(`${API_BASE_URL}/clips/batch`, {
          method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
              },
          body: JSON.stringify({
            clip_ids: Array.from(selectedSceneIds),
            operation: 'update_status',
            data: { status },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update scenes');
        }
      }

      // Update local state
      setScenes(prev =>
        prev.map(scene =>
          selectedSceneIds.has(scene.id)
            ? { ...scene, status: status as any }
            : scene
        )
      );

      showToast(`${selectedSceneIds.size} scene(s) updated to ${status}`, 'success');
    } catch (error: any) {
      showToast('Failed to update scenes', 'error');
    }
  };

  const handleBulkTagAssignment = async (tagId: number) => {
    if (selectedSceneIds.size === 0) return;

    try {
      const apiAvailable = await checkApiAvailability();
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('auth_token');

      // Assign tag to all selected scenes
      if (apiAvailable) {
        await Promise.all(
          Array.from(selectedSceneIds).map(async (sceneId) => {
            try {
              await fetch(`${API_BASE_URL}/clips/${sceneId}/tags`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tag_id: tagId }),
              });
            } catch (error) {
              console.warn(`Failed to assign tag to scene ${sceneId}:`, error);
            }
          })
        );
      }

      showToast(`Tag assigned to ${selectedSceneIds.size} scene(s)`, 'success');
    } catch (error: any) {
      showToast('Failed to assign tags', 'error');
    }
  };

  const handleExportSelectedScenes = async (format: 'json' | 'markdown' | 'csv' | 'pdf' | 'fountain') => {
    if (selectedSceneIds.size === 0) {
      showToast('Please select scenes to export', 'error');
      return;
    }

    const selectedScenes = scenes.filter(s => selectedSceneIds.has(s.id));
    if (selectedScenes.length === 0) return;

    try {
      // Use existing export functions but with selected scenes only
      const exportData: any = {
        context: storyContext,
        scenes: selectedScenes,
        settings: currentSettings,
      };

      switch (format) {
        case 'json':
          const jsonStr = JSON.stringify(exportData, null, 2);
          const jsonBlob = new Blob([jsonStr], { type: 'application/json' });
          const jsonUrl = URL.createObjectURL(jsonBlob);
          const jsonA = document.createElement('a');
          jsonA.href = jsonUrl;
          jsonA.download = `${storyContext.title || 'project'}-selected-scenes.json`;
          jsonA.click();
          URL.revokeObjectURL(jsonUrl);
          break;

        case 'markdown':
          const { exportToMarkdown } = await import('./utils/exportUtils');
          exportToMarkdown(exportData, `${storyContext.title || 'project'}-selected-scenes`);
          break;

        case 'csv':
          const { exportToCSV } = await import('./utils/exportUtils');
          exportToCSV(exportData, `${storyContext.title || 'project'}-selected-scenes`);
          break;

        case 'pdf':
          const { exportToPDF } = await import('./utils/exportUtils');
          await exportToPDF(exportData, `${storyContext.title || 'project'}-selected-scenes`);
          break;

        case 'fountain':
          const { exportToFountain } = await import('./utils/exportUtils');
          exportToFountain(exportData, `${storyContext.title || 'project'}-selected-scenes`);
          break;
      }

      showToast(`Exported ${selectedScenes.length} selected scene(s) as ${format.toUpperCase()}`, 'success');
    } catch (error: any) {
      showToast(`Failed to export scenes: ${error.message}`, 'error');
    }
  };

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    } catch (error: any) {
      console.error("Error auto-suggesting settings:", error);
      alert(`Failed to suggest settings: ${error.message || 'Please check your Gemini API key and ensure the Generative Language API is enabled.'}`);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleClearSettings = () => {
    setCurrentSettings(DEFAULT_DIRECTOR_SETTINGS);
  };

  // Scene context menu handler
  const handleSceneContextMenu = (e: React.MouseEvent, scene: Scene) => {
    e.preventDefault();
    setQuickActionsMenu({
      scene,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  // Duplicate scene handler
  const handleDuplicateScene = async (scene: Scene) => {
    try {
      const newSequenceNumber = scenes.length + 1;
      const duplicatedScene: Scene = {
        ...scene,
        id: `scene-${Date.now()}`,
        sequenceNumber: newSequenceNumber,
        is_ai_generated: false, // User-created duplicate, not AI-generated
      };

      setScenes(prev => [...prev, duplicatedScene]);

      // Save to backend
      const updatedContext = { ...storyContext, lastUpdated: Date.now() };
      const updatedScenes = [...scenes, duplicatedScene];
      
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        await apiService.saveProject({
          context: updatedContext,
          scenes: updatedScenes,
          settings: currentSettings
        });
      } else {
        await saveProjectToDB({
          context: updatedContext,
          scenes: updatedScenes,
          settings: currentSettings
        });
      }

      setStoryContext(updatedContext);
      showToast('Scene duplicated successfully', 'success');
    } catch (error: any) {
      showToast('Failed to duplicate scene', 'error');
      console.error('Failed to duplicate scene:', error);
    }
  };

  // Copy scene settings handler
  const handleCopySceneSettings = (scene: Scene) => {
    setSourceSceneForCopy(scene);
    setShowCopySettingsModal(true);
  };

  const handleAutoDraft = async () => {
    setIsAutoFilling(true);
    try {
      // Pass the last 5 scenes for better continuity awareness
      const recentHistory = scenes.slice(-5);
      const idea = await suggestNextScene(storyContext, recentHistory);
      setCurrentInput(idea);
    } catch (error: any) {
      console.error("Error auto-drafting scene:", error);
      alert(`Failed to generate idea: ${error.message || 'Please check your Gemini API key and ensure the Generative Language API is enabled in Google Cloud Console.'}`);
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

      let optimizedSettings: DirectorSettings;
      try {
        optimizedSettings = await suggestDirectorSettings(
        currentInput,
        storyContext,
        prevContext,
        currentSettings
      );
        
        // Validate that we got valid settings
        if (!optimizedSettings || typeof optimizedSettings !== 'object' || Object.keys(optimizedSettings).length === 0) {
          console.warn('suggestDirectorSettings returned invalid result, using currentSettings');
          optimizedSettings = currentSettings;
        }
      } catch (error: any) {
        console.warn('Failed to get optimized settings, using current settings:', error);
        optimizedSettings = currentSettings;
      }
      
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

      // Validate inputs before calling enhanceScenePrompt
      if (!storyContext || typeof storyContext !== 'object' || !storyContext.id) {
        throw new Error('Invalid story context. Please ensure your project is properly initialized.');
      }

      if (!optimizedSettings || typeof optimizedSettings !== 'object') {
        throw new Error('Invalid director settings. Please try again.');
      }

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
        status: 'completed',
        is_ai_generated: true // Mark as AI-generated since enhanceScenePrompt was used
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
      
      // Update context timestamp in state - this will trigger auto-save useEffect
      setStoryContext(updatedContext);
      setSaveStatus('saved');
      
      // Also trigger immediate save to ensure it's saved
      setTimeout(async () => {
        try {
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
        } catch (e) {
          console.error("Post-generation save failed:", e);
        }
        setSaveStatus('idle');
      }, 2000);

    } catch (error: any) {
      console.error("Critical error in flow:", error);
      const errorMessage = error.message || 'Failed to generate scene. Please check your Gemini API key and ensure the Generative Language API is enabled in Google Cloud Console.';
      alert(`Error: ${errorMessage}`);
      setScenes(prev => prev.map(s => s.status === 'generating' ? { ...s, status: 'failed', enhancedPrompt: errorMessage } : s));
      setSaveStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  // --- Views ---

  // Theme state
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Handle password reset routing - must be before any early returns
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash);
    };
    
    window.addEventListener('hashchange', handleHashChange);
    // Also check immediately in case hash was set before component mounted
    handleHashChange();
    
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, []);

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
  
  // Handle password reset routing (before auth check)
  // Check both hash and pathname for routing
  const isForgotPassword = currentHash === '#forgot-password' || window.location.pathname === '/forgot-password';
  const isResetPassword = currentHash.startsWith('#reset-password') || 
                          currentHash.includes('token=') || 
                          window.location.search.includes('token=') ||
                          window.location.pathname === '/reset-password';
  
  if (isForgotPassword) {
    return <ForgotPassword onBack={() => { 
      window.location.hash = ''; 
      window.history.pushState('', '', '/');
      setCurrentHash(''); 
    }} />;
  }
  
  if (isResetPassword) {
    const urlParams = new URLSearchParams(currentHash.substring(1));
    const searchParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token') || searchParams.get('token');
    const email = urlParams.get('email') || searchParams.get('email');
    return (
      <ResetPassword 
        token={token || undefined} 
        email={email ? decodeURIComponent(email) : undefined}
        onSuccess={() => { 
          window.location.hash = ''; 
          window.location.search = '';
          window.history.pushState('', '', '/');
          setCurrentHash(''); 
        }}
      />
    );
  }

  // Show authentication if not logged in
  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />;
  }

  // Show admin dashboard for admin users
  if (currentUser?.role === 'admin' && adminViewMode === 'admin') {
    return <AdminDashboard user={currentUser} onLogout={handleLogout} />;
  }

  // Show user dashboard
  if (view === 'dashboard') {
    return <UserDashboard user={currentUser} onLogout={handleLogout} />;
  }

  if (view === 'library') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-3 sm:p-6 font-sans flex flex-col items-center">
        <main className="max-w-4xl w-full">
          <div className="text-center mb-6 sm:mb-10 pt-6 sm:pt-10">
            <h1 className="text-3xl sm:text-5xl font-serif text-amber-500 mb-2 tracking-tight">CINEFLOW AI</h1>
            <p className="text-zinc-500 uppercase tracking-widest text-xs">Production Library & Director Suite</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-4">
              <span className="text-xs text-zinc-600">Logged in as: {currentUser?.username}</span>
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => {
                    localStorage.setItem('admin_view_mode', 'admin');
                    window.location.reload();
                  }}
                  className="text-xs px-3 py-1 rounded bg-amber-600 text-white hover:bg-amber-500 transition-colors"
                >
                  Admin Panel
                </button>
              )}
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
              {/* Theme Toggle */}
              <button
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
              >
                {theme === 'dark' ? '☀️' : '🌙'}
              </button>
              {/* Notifications Button */}
              <button
                onClick={async () => {
                  await loadNotifications();
                  setShowNotificationCenter(true);
                }}
                className="relative text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                title="Notifications"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10 2a6 6 0 00-6 6c0 1.887-.454 3.665-1.257 5.234a.75.75 0 00.515 1.076 32.94 32.94 0 003.256.508 3.5 3.5 0 006.972 0 32.933 32.933 0 003.256-.508.75.75 0 00.515-1.076A11.71 11.71 0 0116 8a6 6 0 00-6-6zM8.05 14.943a33.54 33.54 0 003.9 0 2 2 0 01-3.9 0z" clipRule="evenodd" />
                </svg>
                {unreadNotificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center animate-pulse">
                    {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                  </span>
                )}
              </button>
              {/* Settings Button */}
              <button
                onClick={() => setShowSettingsPanel(true)}
                className="text-xs px-3 py-1 rounded bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                title="Settings"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M7.84 1.804A1 1 0 018.82 1h2.36a1 1 0 01.98.804l.331 1.652a6.993 6.993 0 011.929 1.115l1.598-.54a1 1 0 011.186.447l1.18 2.044a1 1 0 01-.205 1.251l-1.267 1.113a7.047 7.047 0 010 2.228l1.267 1.113a1 1 0 01.206 1.25l-1.18 2.045a1 1 0 01-1.187.447l-1.598-.54a6.993 6.993 0 01-1.93 1.115l-.33 1.652a1 1 0 01-.98.804H8.82a1 1 0 01-.98-.804l-.331-1.652a6.993 6.993 0 01-1.929-1.115l-1.598.54a1 1 0 01-1.186-.447l-1.18-2.044a1 1 0 01.205-1.251l1.267-1.114a7.05 7.05 0 010-2.227L1.821 7.773a1 1 0 01-.206-1.25l1.18-2.045a1 1 0 011.187-.447l1.598.54A6.993 6.993 0 017.51 3.456l.33-1.652zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>

          {/* Library Controls */}
          {projects.length > 0 && (
            <div className="mb-4 sm:mb-6 space-y-3">
              {/* Batch Mode Toggle */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setLibraryBatchMode(!libraryBatchMode);
                    if (libraryBatchMode) {
                      setSelectedLibraryProjectIds(new Set());
                    }
                  }}
                  className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                    libraryBatchMode
                      ? 'bg-amber-600 border-amber-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  {libraryBatchMode ? (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 inline mr-1">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                      Batch Mode ({selectedLibraryProjectIds.size} selected)
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 inline mr-1">
                        <path d="M1 1.75A.75.75 0 011.75 1h1.628a1.75 1.75 0 011.734 2.006L6.58 3.5h9.92a1.75 1.75 0 011.734 2.006l-1.064 7.5a1.75 1.75 0 01-1.734 1.994H3.75a.75.75 0 010-1.5h12.226a.25.25 0 00.248-.216L16.5 5.5H5.5a.75.75 0 01-.734-.606L3.5 2.5H1.75A.75.75 0 011 1.75z" />
                      </svg>
                      Select Multiple
                    </>
                  )}
                </button>

                {libraryBatchMode && selectedLibraryProjectIds.size > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowBulkTagAssigner(true)}
                      className="px-3 py-1.5 rounded text-xs bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 border border-purple-900/50 transition-colors"
                    >
                      Assign Tags ({selectedLibraryProjectIds.size})
                    </button>
                    <button
                      onClick={() => setSelectedLibraryProjectIds(new Set())}
                      className="px-3 py-1.5 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                    >
                      Clear Selection
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center justify-between">
              {/* Search */}
              <div className="flex-1 w-full sm:max-w-md">
                <input
                  type="text"
                  value={librarySearchTerm}
                  onChange={(e) => setLibrarySearchTerm(e.target.value)}
                  placeholder="Search projects..."
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 sm:px-4 py-2 text-sm focus:border-amber-500 outline-none"
                />
              </div>

              {/* Sort & View Toggle */}
              <div className="flex gap-2 items-center flex-wrap">
                <button
                  onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
                  className={`px-3 py-1.5 rounded text-xs border transition-colors ${
                    showAdvancedSearch || libraryFilterGenre || libraryFilterTags.length > 0 || libraryFilterHasCover !== null || libraryFilterSceneCount !== null || libraryFilterFavorites !== null
                      ? 'bg-amber-600 border-amber-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 inline mr-1">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                  </svg>
                  Advanced
                </button>
                <select
                  value={librarySortBy}
                  onChange={(e) => setLibrarySortBy(e.target.value as any)}
                  className="bg-zinc-900 border border-zinc-700 rounded-lg px-2 sm:px-3 py-2 text-xs sm:text-sm focus:border-amber-500 outline-none"
                >
                  <option value="date">Sort by Date</option>
                  <option value="title">Sort by Title</option>
                  <option value="genre">Sort by Genre</option>
                  <option value="scenes">Sort by Scene Count</option>
                  <option value="updated">Sort by Last Updated</option>
                  <option value="health">Sort by Health Score</option>
                  <option value="favorites">Sort by Favorites</option>
                </select>
                <button
                  onClick={() => setLibrarySortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded text-sm hover:bg-zinc-800 transition-colors"
                  title={`Sort ${librarySortOrder === 'asc' ? 'Ascending' : 'Descending'}`}
                >
                  {librarySortOrder === 'asc' ? '↑' : '↓'}
                </button>

                <div className="flex bg-zinc-900 border border-zinc-700 rounded-lg p-1">
                  <button
                    onClick={() => setLibraryViewMode('grid')}
                    className={`p-2 rounded ${libraryViewMode === 'grid' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    title="Grid View"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M2 4.5A1.5 1.5 0 013.5 3h13A1.5 1.5 0 0118 4.5v11a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 012 15.5v-11zM3.5 4a.5.5 0 00-.5.5v11a.5.5 0 00.5.5h13a.5.5 0 00.5-.5v-11a.5.5 0 00-.5-.5h-13z" />
                      <path d="M6 6a.5.5 0 01.5-.5h7a.5.5 0 01.5.5v7a.5.5 0 01-.5.5h-7A.5.5 0 016 13V6z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setLibraryViewMode('list')}
                    className={`p-2 rounded ${libraryViewMode === 'list' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white'}`}
                    title="List View"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M2 4.75A.75.75 0 012.75 4h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 4.75zm0 10.5a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zM2 10a.75.75 0 01.75-.75h14.5a.75.75 0 010 1.5H2.75A.75.75 0 012 10z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
              </div>
            </div>
          )}

          {/* Advanced Search Panel */}
          {showAdvancedSearch && (
            <div className="mb-6 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold">Advanced Search & Filters</h3>
                <button
                  onClick={() => setShowAdvancedSearch(false)}
                  className="text-zinc-400 hover:text-white"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 uppercase mb-1">Genre Filter</label>
                  <input
                    type="text"
                    value={libraryFilterGenre}
                    onChange={(e) => setLibraryFilterGenre(e.target.value)}
                    placeholder="Filter by genre..."
                    className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 uppercase mb-1">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.slice(0, 5).map((tag: any) => (
                      <button
                        key={tag.id}
                        onClick={() => {
                          setLibraryFilterTags(prev =>
                            prev.includes(tag.id)
                              ? prev.filter(id => id !== tag.id)
                              : [...prev, tag.id]
                          );
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          libraryFilterTags.includes(tag.id)
                            ? 'bg-amber-600 text-white'
                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                        style={{ color: libraryFilterTags.includes(tag.id) ? undefined : tag.color }}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setLibraryFilterGenre('');
                      setLibraryFilterTags([]);
                      setLibrarySearchTerm('');
                    }}
                    className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={libraryViewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-3'}>
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

            {/* Advanced Search Panel */}
            {showAdvancedSearch && (
              <div className="col-span-full bg-zinc-900 border border-zinc-800 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold">Advanced Search & Filters</h3>
                  <button
                    onClick={() => setShowAdvancedSearch(false)}
                    className="text-zinc-400 hover:text-white"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 uppercase mb-1">Genre Filter</label>
                    <input
                      type="text"
                      value={libraryFilterGenre}
                      onChange={(e) => setLibraryFilterGenre(e.target.value)}
                      placeholder="Filter by genre..."
                      className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 uppercase mb-1">Tags</label>
                    <div className="flex flex-wrap gap-2">
                      {availableTags.slice(0, 5).map((tag: any) => (
                        <button
                          key={tag.id}
                          onClick={() => {
                            setLibraryFilterTags(prev =>
                              prev.includes(tag.id)
                                ? prev.filter(id => id !== tag.id)
                                : [...prev, tag.id]
                            );
                          }}
                          className={`px-2 py-1 text-xs rounded ${
                            libraryFilterTags.includes(tag.id)
                              ? 'bg-amber-600 text-white'
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                          style={{ color: libraryFilterTags.includes(tag.id) ? undefined : tag.color }}
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    {/* Cover Image Filter */}
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Cover Image</label>
                      <select
                        value={libraryFilterHasCover === null ? 'all' : libraryFilterHasCover ? 'yes' : 'no'}
                        onChange={(e) => {
                          const value = e.target.value;
                          setLibraryFilterHasCover(value === 'all' ? null : value === 'yes');
                        }}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm"
                      >
                        <option value="all">All Projects</option>
                        <option value="yes">Has Cover</option>
                        <option value="no">No Cover</option>
                      </select>
                    </div>

                    {/* Scene Count Filter */}
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Scene Count</label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          placeholder="Min"
                          min="0"
                          value={libraryFilterSceneCount?.min || ''}
                          onChange={(e) => {
                            const min = e.target.value ? parseInt(e.target.value) : undefined;
                            setLibraryFilterSceneCount(prev => ({
                              min,
                              max: prev?.max
                            }));
                          }}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm"
                        />
                        <input
                          type="number"
                          placeholder="Max"
                          min="0"
                          value={libraryFilterSceneCount?.max || ''}
                          onChange={(e) => {
                            const max = e.target.value ? parseInt(e.target.value) : undefined;
                            setLibraryFilterSceneCount(prev => ({
                              min: prev?.min,
                              max
                            }));
                          }}
                          className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-sm"
                        />
                      </div>
                    </div>

                    {/* Favorites Filter */}
                    <div>
                      <label className="block text-xs text-zinc-400 mb-1">Favorites</label>
                      <select
                        value={libraryFilterFavorites === null ? 'all' : libraryFilterFavorites ? 'yes' : 'no'}
                        onChange={(e) => {
                          const value = e.target.value;
                          setLibraryFilterFavorites(value === 'all' ? null : value === 'yes');
                        }}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm"
                      >
                        <option value="all">All Projects</option>
                        <option value="yes">Favorites Only</option>
                        <option value="no">Not Favorited</option>
                      </select>
                    </div>

                    <button
                      onClick={() => {
                        setLibraryFilterGenre('');
                        setLibraryFilterTags([]);
                        setLibrarySearchTerm('');
                        setLibraryFilterHasCover(null);
                        setLibraryFilterSceneCount(null);
                        setLibraryFilterFavorites(null);
                      }}
                      className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
                    >
                      Clear All Filters
                    </button>

                    {/* Batch Generate Covers */}
                    {filteredProjects.filter(p => !p.context.coverImageUrl).length > 0 && (
                      <button
                        onClick={async () => {
                          const projectsWithoutCover = filteredProjects.filter(p => !p.context.coverImageUrl);
                          if (projectsWithoutCover.length === 0) {
                            showToast('All projects already have cover images', 'info');
                            return;
                          }
                          
                          if (!window.confirm(`Generate cover images for ${projectsWithoutCover.length} project(s)?`)) {
                            return;
                          }

                          setBatchGeneratingCovers(true);
                          let successCount = 0;
                          let failCount = 0;

                          for (const project of projectsWithoutCover) {
                            try {
                              const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects/${project.context.id}/generate-cover`, {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                                  'Content-Type': 'application/json'
                                }
                              });
                              if (response.ok) {
                                successCount++;
                              } else {
                                failCount++;
                              }
                            } catch (error) {
                              failCount++;
                            }
                          }

                          setBatchGeneratingCovers(false);
                          const list = await apiService.getProjects();
                          setProjects(list);
                          
                          if (successCount > 0) {
                            showToast(`Generated ${successCount} cover image(s)${failCount > 0 ? `, ${failCount} failed` : ''}`, 'success');
                          } else {
                            showToast('Failed to generate cover images', 'error');
                          }
                        }}
                        disabled={batchGeneratingCovers}
                        className="w-full px-4 py-2 bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 border border-purple-900/50 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {batchGeneratingCovers ? (
                          <>
                            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Generating...
                          </>
                        ) : (
                          <>
                            ✨ Generate Covers ({filteredProjects.filter(p => !p.context.coverImageUrl).length})
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Existing Projects */}
            {(() => {
              // Filter and sort projects
              let filteredProjects = projects.filter(p => {
                // Text search
                if (librarySearchTerm) {
                  const search = librarySearchTerm.toLowerCase();
                  const matchesSearch = (
                    p.context.title.toLowerCase().includes(search) ||
                    p.context.genre?.toLowerCase().includes(search) ||
                    p.context.plotSummary?.toLowerCase().includes(search) ||
                    p.context.characters?.toLowerCase().includes(search) ||
                    p.scenes.some(s => s.rawIdea.toLowerCase().includes(search))
                  );
                  if (!matchesSearch) return false;
                }

                // Genre filter
                if (libraryFilterGenre) {
                  const genre = libraryFilterGenre.toLowerCase();
                  if (!p.context.genre?.toLowerCase().includes(genre)) return false;
                }

                // Tag filter (would need to fetch project tags - simplified for now)
                // This would require joining with project_tags table

                return true;
              });

              // Additional filters
              filteredProjects = filteredProjects.filter(p => {
                // Cover image filter
                if (libraryFilterHasCover !== null) {
                  const hasCover = !!p.context.coverImageUrl;
                  if (libraryFilterHasCover !== hasCover) return false;
                }

                // Scene count filter
                if (libraryFilterSceneCount) {
                  const sceneCount = p.scenes.length;
                  if (libraryFilterSceneCount.min !== undefined && sceneCount < libraryFilterSceneCount.min) return false;
                  if (libraryFilterSceneCount.max !== undefined && sceneCount > libraryFilterSceneCount.max) return false;
                }

                // Favorites filter
                if (libraryFilterFavorites !== null) {
                  const isFavorited = favoritedProjects.has(p.context.id);
                  if (libraryFilterFavorites !== isFavorited) return false;
                }

                return true;
              });

              // Sort projects
              filteredProjects = [...filteredProjects].sort((a, b) => {
                let comparison = 0;
                
                switch (librarySortBy) {
                  case 'title':
                    comparison = (a.context.title || '').localeCompare(b.context.title || '');
                    break;
                  case 'genre':
                    comparison = (a.context.genre || '').localeCompare(b.context.genre || '');
                    break;
                  case 'scenes':
                    comparison = a.scenes.length - b.scenes.length;
                    break;
                  case 'health':
                    comparison = calculateProjectHealthScore(a) - calculateProjectHealthScore(b);
                    break;
                  case 'favorites':
                    const aFavorited = favoritedProjects.has(a.context.id) ? 1 : 0;
                    const bFavorited = favoritedProjects.has(b.context.id) ? 1 : 0;
                    comparison = bFavorited - aFavorited; // Favorites first
                    break;
                  case 'updated':
                  case 'date':
                  default:
                    comparison = a.context.lastUpdated - b.context.lastUpdated;
                    break;
                }

                // Apply sort order
                return librarySortOrder === 'asc' ? comparison : -comparison;
              });

              if (filteredProjects.length === 0) {
                return (
                  <div className={`${libraryViewMode === 'grid' ? 'col-span-full' : 'w-full'} text-center py-10 text-zinc-500 text-sm`}>
                    {librarySearchTerm ? 'No projects match your search.' : 'No projects found. Create or import one to begin.'}
                  </div>
                );
              }

              return (
                <>
                  {filteredProjects.length > 0 && (
                    <div className={`${libraryViewMode === 'grid' ? 'col-span-full' : 'w-full'} text-xs text-zinc-500 mb-2`}>
                      Showing {filteredProjects.length} of {projects.length} project{projects.length !== 1 ? 's' : ''}
                      {libraryBatchMode && selectedLibraryProjectIds.size > 0 && (
                        <span className="ml-2 text-amber-400">
                          • {selectedLibraryProjectIds.size} selected
                        </span>
                      )}
                    </div>
                  )}
                  {filteredProjects.map((p) => {
                    const isSelected = selectedLibraryProjectIds.has(p.context.id);
                    return (
                  <div 
                    key={p.context.id} 
                    onClick={() => {
                      if (libraryBatchMode) {
                        setSelectedLibraryProjectIds(prev => {
                          const next = new Set(prev);
                          if (next.has(p.context.id)) {
                            next.delete(p.context.id);
                          } else {
                            next.add(p.context.id);
                          }
                          return next;
                        });
                      } else {
                        handleOpenProject(p);
                      }
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      if (!libraryBatchMode) {
                        setProjectQuickActions({
                          project: p,
                          position: { x: e.clientX, y: e.clientY }
                        });
                      }
                    }}
                    className={`bg-zinc-900 border rounded-xl overflow-hidden transition-all relative group flex flex-col ${
                      libraryBatchMode 
                        ? 'cursor-pointer' 
                        : 'cursor-pointer hover:border-zinc-600'
                      } ${
                        isSelected
                          ? 'border-amber-500 ring-2 ring-amber-500 ring-offset-2 ring-offset-zinc-900'
                          : 'border-zinc-800'
                      } ${
                        libraryViewMode === 'grid' 
                          ? libraryCardSize === 'small'
                            ? 'min-h-[150px]'
                            : libraryCardSize === 'large'
                            ? 'min-h-[300px]'
                            : 'min-h-[200px]'
                          : 'flex-row min-h-[120px]'
                      }`}
                  >
                    {libraryViewMode === 'grid' ? (
                      <>
                        {/* Cover Image */}
                        {p.context.coverImageUrl ? (
                          <div className={`w-full bg-zinc-950 overflow-hidden ${
                            libraryCardSize === 'small' ? 'h-24' : libraryCardSize === 'large' ? 'h-64' : 'h-48'
                          }`}>
                            <LazyImage
                              src={p.context.coverImageUrl.startsWith('http') 
                                ? p.context.coverImageUrl 
                                : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${p.context.coverImageUrl.startsWith('/') ? '' : '/'}${p.context.coverImageUrl}`}
                              alt={p.context.title}
                              className="w-full h-full"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="h-2 bg-gradient-to-r from-amber-600 to-amber-800"></div>
                        )}
                        
                        {/* Selection Checkbox (Batch Mode) */}
                        {libraryBatchMode && (
                          <div className="absolute top-4 left-4 z-10">
                            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                              isSelected
                                ? 'bg-amber-600 border-amber-500'
                                : 'bg-zinc-900/80 border-zinc-600'
                            }`}>
                              {isSelected && (
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Favorite Button */}
                        {!libraryBatchMode && (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const isFavorited = favoritedProjects.has(p.context.id);
                                if (isFavorited) {
                                  await favoritesService.remove(p.context.id);
                                  setFavoritedProjects(prev => {
                                    const next = new Set(prev);
                                    next.delete(p.context.id);
                                    return next;
                                  });
                                  showToast('Removed from favorites', 'success');
                                } else {
                                  await favoritesService.add(p.context.id);
                                  setFavoritedProjects(prev => new Set(prev).add(p.context.id));
                                  showToast('Added to favorites', 'success');
                                }
                              } catch (error: any) {
                                showToast('Failed to update favorite: ' + error.message, 'error');
                              }
                            }}
                            className={`absolute ${libraryBatchMode ? 'top-4 right-4' : 'top-4 left-4'} p-1.5 rounded transition-all z-10 ${
                              favoritedProjects.has(p.context.id)
                                ? 'bg-amber-600/20 text-amber-400 opacity-100'
                                : 'bg-zinc-900/80 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-amber-400'
                            }`}
                            title={favoritedProjects.has(p.context.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
                            </svg>
                          </button>
                        )}

                        <div className="p-6 flex-1 flex flex-col">
                          <h3 className="text-lg font-serif font-bold text-white mb-1 line-clamp-1">
                            {librarySearchTerm ? highlightSearchTerm(p.context.title, librarySearchTerm) : p.context.title}
                          </h3>
                          <p className="text-xs text-amber-500 uppercase tracking-wider mb-4">
                            {librarySearchTerm && p.context.genre ? highlightSearchTerm(p.context.genre, librarySearchTerm) : p.context.genre}
                          </p>
                          <p className="text-sm text-zinc-500 line-clamp-3 mb-4 flex-1">
                            {librarySearchTerm && p.context.plotSummary ? highlightAndTruncate(p.context.plotSummary, librarySearchTerm, 150) : (p.context.plotSummary || '')}
                          </p>
                          
                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800/50">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-600">
                                {new Date(p.context.lastUpdated).toLocaleDateString()}
                              </span>
                              {p.scenes.length > 0 && (
                                <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                                  {p.scenes.length} Scene{p.scenes.length !== 1 ? 's' : ''}
                                </span>
                              )}
                              {p.scenes.filter(s => s.status === 'completed').length > 0 && (
                                <span className="text-[10px] bg-green-900/30 text-green-400 px-2 py-0.5 rounded border border-green-900/50">
                                  {p.scenes.filter(s => s.status === 'completed').length} Done
                                </span>
                              )}
                            </div>
                            {!p.context.coverImageUrl && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  try {
                                    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects/${p.context.id}/generate-cover`, {
                                      method: 'POST',
                                      headers: {
                                        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                                        'Content-Type': 'application/json'
                                      }
                                    });
                                    if (response.ok) {
                                      const list = await apiService.getProjects();
                                      setProjects(list);
                                      showToast('Cover image generated!', 'success');
                                    } else {
                                      const error = await response.json();
                                      showToast(error.error || 'Failed to generate cover', 'error');
                                    }
                                  } catch (error: any) {
                                    showToast('Failed to generate cover: ' + error.message, 'error');
                                  }
                                }}
                                className="text-[10px] bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded border border-purple-900/50 transition-colors"
                                title="Generate cover from characters"
                              >
                                ✨ Cover
                              </button>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Cover Image in List View */}
                        {p.context.coverImageUrl ? (
                          <div className="w-32 h-24 bg-zinc-950 overflow-hidden flex-shrink-0">
                            <LazyImage
                              src={p.context.coverImageUrl.startsWith('http') 
                                ? p.context.coverImageUrl 
                                : `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${p.context.coverImageUrl.startsWith('/') ? '' : '/'}${p.context.coverImageUrl}`}
                              alt={p.context.title}
                              className="w-full h-full"
                              loading="lazy"
                            />
                          </div>
                        ) : (
                          <div className="w-2 bg-gradient-to-b from-amber-600 to-amber-800"></div>
                        )}
                        <div className="p-4 flex-1 flex flex-col">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="text-lg font-serif font-bold text-white mb-1">
                                {librarySearchTerm ? highlightSearchTerm(p.context.title, librarySearchTerm) : p.context.title}
                              </h3>
                              <p className="text-xs text-amber-500 uppercase tracking-wider">
                                {librarySearchTerm && p.context.genre ? highlightSearchTerm(p.context.genre, librarySearchTerm) : p.context.genre}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-zinc-500">{new Date(p.context.lastUpdated).toLocaleDateString()}</span>
                              {p.scenes.length > 0 && (
                                <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                                  {p.scenes.length} Scene{p.scenes.length !== 1 ? 's' : ''}
                                </span>
                              )}
                              {p.scenes.filter(s => s.status === 'completed').length > 0 && (
                                <span className="text-xs bg-green-900/30 text-green-400 px-2 py-0.5 rounded border border-green-900/50">
                                  {p.scenes.filter(s => s.status === 'completed').length} Done
                                </span>
                              )}
                              {!p.context.coverImageUrl && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects/${p.context.id}/generate-cover`, {
                                        method: 'POST',
                                        headers: {
                                          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                                          'Content-Type': 'application/json'
                                        }
                                      });
                                      if (response.ok) {
                                        const list = await apiService.getProjects();
                                        setProjects(list);
                                        showToast('Cover image generated!', 'success');
                                      } else {
                                        const error = await response.json();
                                        showToast(error.error || 'Failed to generate cover', 'error');
                                      }
                                    } catch (error: any) {
                                      showToast('Failed to generate cover: ' + error.message, 'error');
                                    }
                                  }}
                                  className="text-xs bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded border border-purple-900/50 transition-colors"
                                  title="Generate cover from characters"
                                >
                                  ✨ Cover
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-zinc-500 line-clamp-2">
                            {librarySearchTerm && p.context.plotSummary ? highlightAndTruncate(p.context.plotSummary, librarySearchTerm, 200) : (p.context.plotSummary || '')}
                          </p>
                        </div>
                      </>
                    )}
                    {/* Favorite Button */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const isFavorited = favoritedProjects.has(p.context.id);
                          if (isFavorited) {
                            await favoritesService.remove(p.context.id);
                            setFavoritedProjects(prev => {
                              const next = new Set(prev);
                              next.delete(p.context.id);
                              return next;
                            });
                            showToast('Removed from favorites', 'success');
                          } else {
                            await favoritesService.add(p.context.id);
                            setFavoritedProjects(prev => new Set(prev).add(p.context.id));
                            showToast('Added to favorites', 'success');
                          }
                        } catch (error: any) {
                          showToast('Failed to update favorite: ' + error.message, 'error');
                        }
                      }}
                      className={`absolute top-4 left-4 p-1.5 rounded transition-all ${
                        favoritedProjects.has(p.context.id)
                          ? 'bg-amber-600/20 text-amber-400 opacity-100'
                          : 'bg-zinc-900/80 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-amber-400'
                      }`}
                      title={favoritedProjects.has(p.context.id) ? 'Remove from favorites' : 'Add to favorites'}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
                      </svg>
                    </button>

                    <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!p.context.coverImageUrl && (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/projects/${p.context.id}/generate-cover`, {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
                                  'Content-Type': 'application/json'
                                }
                              });
                              if (response.ok) {
                                const list = await apiService.getProjects();
                                setProjects(list);
                                showToast('Cover image generated!', 'success');
                              } else {
                                const error = await response.json();
                                showToast(error.error || 'Failed to generate cover', 'error');
                              }
                            } catch (error: any) {
                              showToast('Failed to generate cover: ' + error.message, 'error');
                            }
                          }}
                          className="p-1.5 bg-purple-900/30 hover:bg-purple-900/50 rounded text-purple-400 hover:text-purple-300 border border-purple-900/50"
                          title="Generate cover from characters"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                      <button
                        onClick={(e) => handleDuplicateProject(e, p)}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
                        title="Duplicate Project"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                          <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedProjectForSharing(p);
                          setShowSharingModal(true);
                        }}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-amber-500"
                        title="Share Project"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.518 2.518 0 010 .792l6.733 3.367a2.5 2.5 0 11-.671 1.341l-6.733-3.367a2.5 2.5 0 110-3.475l6.733-3.366A2.52 2.52 0 0113 4.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleArchiveProject(e, p.context.id, true)}
                        className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-yellow-500"
                        title="Archive Project"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path d="M2 3a1 1 0 00-1 1v1a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1H2z" />
                          <path fillRule="evenodd" d="M2 7.5h16l-.811 7.71a2 2 0 01-1.99 1.79H4.801a2 2 0 01-1.99-1.79L2 7.5zM10 9a.75.75 0 01.75.75v2.546l.975-.243a.75.75 0 11.15 1.494l-2.25.562a.75.75 0 01-.65-.75V9.75A.75.75 0 0110 9z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => handleDeleteProject(e, p.context.id)}
                        className="p-1.5 bg-red-900/30 hover:bg-red-900/50 rounded text-red-400 hover:text-red-300"
                        title="Delete Project"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  );
                })}
                </>
              );
            })()}
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

            <div className="p-4 sm:p-8 space-y-4 sm:space-y-6">
              {/* Scene Templates Button */}
              {view === 'studio' && storyContext.id && (
                <div className="flex justify-end">
                  <button
                    onClick={async () => {
                      try {
                        const templates = await sceneTemplatesService.getAll();
                        setSceneTemplates((templates as any)?.templates || []);
                        setShowSceneTemplates(true);
                      } catch (error) {
                        showToast('Failed to load scene templates', 'error');
                      }
                    }}
                    className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1"
                    title="Use Scene Template"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                      <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                    </svg>
                    <span className="hidden sm:inline">Scene Templates</span>
                    <span className="sm:hidden">Templates</span>
                  </button>
                </div>
              )}
              
              {/* Magic Generate Section (Now Available for Both) */}
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
  }

  // --- Studio UI (view === 'studio') ---
  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <header className="h-auto min-h-16 border-b border-zinc-800 bg-zinc-900/50 flex flex-col sm:flex-row items-start sm:items-center px-3 sm:px-6 py-2 sm:py-0 justify-between flex-shrink-0 backdrop-blur-md z-20">
        <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-between sm:justify-start mb-2 sm:mb-0">
          <div className="flex items-center gap-2 sm:gap-4">
          <button onClick={handleExitToLibrary} className="p-2 text-zinc-400 hover:text-white" title="Back to Library">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
          </button>
            <div className="font-serif text-lg sm:text-xl font-bold tracking-widest text-amber-500">CINEFLOW</div>
            <div className="h-4 w-px bg-zinc-700 mx-1 sm:mx-2 hidden sm:block"></div>
            <div className="text-xs sm:text-sm text-zinc-300 hidden lg:flex items-center gap-2">
            <span className="text-zinc-500 mr-2">PROJECT:</span>
              <span className="truncate max-w-[200px]">{storyContext.title}</span>
            {storyContext.title && <CopyButton text={storyContext.title} size="sm" />}
          </div>
        </div>
          <div className="text-xs text-zinc-400 sm:hidden truncate max-w-[150px]">{storyContext.title}</div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap w-full sm:w-auto justify-end">
          <button
            onClick={() => setView('dashboard')}
            className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1"
            title="User Dashboard"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
            </svg>
            <span className="hidden sm:inline">{currentUser?.username}</span>
          </button>
          {/* Manual Save Button */}
          <div className="relative group">
            <button
              onClick={handleManualSave}
              disabled={saveStatus === 'saving'}
              className={`text-xs px-2 sm:px-3 py-1.5 rounded border transition-colors flex items-center gap-1 sm:gap-2 font-bold uppercase tracking-wider ${
                saveStatus === 'saved' 
                  ? 'bg-green-900/30 text-green-400 border-green-800' 
                  : saveStatus === 'error'
                  ? 'bg-red-900/30 text-red-400 border-red-800'
                  : 'bg-amber-600 hover:bg-amber-500 text-white border-amber-500'
              }`}
              title={lastSavedTime ? `Last saved: ${lastSavedTime.toLocaleTimeString()} (Ctrl+S)` : 'Save project (Ctrl+S)'}
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
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                    </svg>
                    Error
                  </>
               ) : (
                 <>
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                     <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 3.75V16.5L12 14.25 7.5 16.5V3.75m9 0H18A2.25 2.25 0 0120.25 6v12A2.25 2.25 0 0118 20.25H6A2.25 2.25 0 013.75 18V6A2.25 2.25 0 016 3.75h1.5m9 0h-9" />
                   </svg>
                   <span className="hidden sm:inline">Save Story</span>
                   <span className="sm:hidden">Save</span>
                 </>
               )}
            </button>
            {lastSavedTime && saveStatus === 'idle' && (
              <div className="absolute top-full left-0 mt-1 px-2 py-1 bg-zinc-800 text-xs text-zinc-400 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                Auto-saved {lastSavedTime.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1"
              title="Export"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
              </svg>
              <span className="hidden sm:inline">Export</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 011.06 0L10 11.94l3.72-3.72a.75.75 0 111.06 1.06l-4.25 4.25a.75.75 0 01-1.06 0L5.22 9.28a.75.75 0 010-1.06z" clipRule="evenodd" />
              </svg>
            </button>
            
            {showExportMenu && (
              <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 max-h-[80vh] overflow-y-auto">
                <button
                  onClick={() => handleExport('json')}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                >
                  <span>📄</span> Export as JSON
                </button>
                <button
                  onClick={() => handleExport('markdown')}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                >
                  <span>📝</span> Export as Markdown
                </button>
                <button
                  onClick={() => handleExport('csv')}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                >
                  <span>📊</span> Export as CSV
                </button>
                <button
                  onClick={() => handleExport('pdf')}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                >
                  <span>📄</span> Export as PDF
                </button>
                <button
                  onClick={() => handleExport('fountain')}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                >
                  <span>🎬</span> Export as Fountain (Screenplay)
                </button>
                <div className="border-t border-zinc-700 my-1"></div>
                <div className="px-4 py-2 text-xs text-zinc-500 uppercase font-semibold">Queue Export</div>
                <button
                  onClick={() => {
                    if (!storyContext.id) {
                      showToast('No project loaded', 'warning');
                      return;
                    }
                    addExportToQueue({
                      projectId: storyContext.id,
                      projectTitle: storyContext.title,
                      format: 'json'
                    });
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                >
                  <span>📄</span> Queue JSON Export
                </button>
                <button
                  onClick={() => {
                    if (!storyContext.id) {
                      showToast('No project loaded', 'warning');
                      return;
                    }
                    addExportToQueue({
                      projectId: storyContext.id,
                      projectTitle: storyContext.title,
                      format: 'markdown'
                    });
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                >
                  <span>📝</span> Queue Markdown Export
                </button>
                <button
                  onClick={() => {
                    if (!storyContext.id) {
                      showToast('No project loaded', 'warning');
                      return;
                    }
                    addExportToQueue({
                      projectId: storyContext.id,
                      projectTitle: storyContext.title,
                      format: 'csv'
                    });
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                >
                  <span>📊</span> Queue CSV Export
                </button>
                <button
                  onClick={() => {
                    if (!storyContext.id) {
                      showToast('No project loaded', 'warning');
                      return;
                    }
                    addExportToQueue({
                      projectId: storyContext.id,
                      projectTitle: storyContext.title,
                      format: 'pdf'
                    });
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                >
                  <span>📄</span> Queue PDF Export
                </button>
                <button
                  onClick={() => {
                    if (!storyContext.id) {
                      showToast('No project loaded', 'warning');
                      return;
                    }
                    addExportToQueue({
                      projectId: storyContext.id,
                      projectTitle: storyContext.title,
                      format: 'fountain'
                    });
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                >
                  <span>🎬</span> Queue Fountain Export
                </button>
                {comicExists && (
                  <>
                    <div className="border-t border-zinc-700 my-1"></div>
                    <button
                      onClick={handleRegenerateComic}
                      disabled={isRegeneratingComic}
                      className="w-full text-left px-4 py-2 text-sm text-amber-400 hover:bg-zinc-800 hover:text-amber-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Regenerate comic with latest scenes"
                    >
                      {isRegeneratingComic ? (
                        <>
                          <span className="animate-spin">⚙️</span> Regenerating...
                        </>
                      ) : (
                        <>
                          <span>🔄</span> Regenerate Comic
                        </>
                      )}
                    </button>
                  </>
                )}
                <div className="border-t border-zinc-700 my-1"></div>
                <button
                  onClick={() => {
                    setShowExportMenu(false);
                    setShowExportPresets(true);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-amber-400 hover:bg-zinc-800 hover:text-amber-300 flex items-center gap-2"
                >
                  <span>⚙️</span> Export Presets
                </button>
              </div>
            )}
          </div>

          {/* Characters Button */}
          {view === 'studio' && storyContext.id && (
            <button
              onClick={() => setShowCharactersPanel(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1"
              title="Character Management"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM3 18a6 6 0 1112 0v1H3v-1z" />
              </svg>
              <span className="hidden sm:inline">Characters</span>
            </button>
          )}

          {/* Locations Button */}
          {view === 'studio' && storyContext.id && (
            <button
              onClick={() => setShowLocationsPanel(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1"
              title="Location Management"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Locations</span>
            </button>
          )}

          {/* Project Settings / Cover Image Button */}
          {view === 'studio' && storyContext.id && (
            <button
              onClick={() => {
                setCoverImageProjectId(storyContext.id);
                setCoverImageProjectUrl(storyContext.coverImageUrl || null);
                setShowCoverImageManager(true);
              }}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1"
              title="Project Settings - Cover Image"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.97zM12 7a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Cover</span>
            </button>
          )}

          {/* Analytics Button */}
          {view === 'studio' && storyContext.id && (
            <div className="relative group">
            <button
                onClick={() => setShowAdvancedAnalytics(true)}
                className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1"
                title="Advanced Analytics Dashboard"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path d="M10 2a.75.75 0 01.75.75v12.5a.75.75 0 01-1.5 0V2.75A.75.75 0 0110 2zM5.404 4.343a.75.75 0 010 1.06 6.5 6.5 0 109.192 0 .75.75 0 111.06-1.06 8 8 0 11-11.313 0 .75.75 0 011.06 0zM8 8a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 8zm3.25.75a.75.75 0 00-1.5 0v5.5a.75.75 0 001.5 0v-5.5z" />
              </svg>
                <span className="hidden sm:inline">Analytics</span>
            </button>
              {/* Advanced Analytics Dropdown */}
              <div className="absolute right-0 mt-1 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <button
                  onClick={() => {
                    setShowAnalyticsPanel(true);
                    setShowAdvancedAnalytics(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path d="M10 2a.75.75 0 01.75.75v5.5h5.5a.75.75 0 010 1.5h-5.5v5.5a.75.75 0 01-1.5 0v-5.5H4.25a.75.75 0 010-1.5h5.5v-5.5A.75.75 0 0110 2z" />
                  </svg>
                  Basic Analytics
                </button>
                <button
                  onClick={() => {
                    setShowAdvancedAnalytics(true);
                    setShowAnalyticsPanel(false);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2 border-t border-zinc-800"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M3 3.5A1.5 1.5 0 014.5 2h6.879a1.5 1.5 0 011.06.44l4.122 4.12A1.5 1.5 0 0116 7.622V16.5a1.5 1.5 0 01-1.5 1.5h-11A1.5 1.5 0 013 16.5v-13zM13.25 9a.75.75 0 01-.75.75H9.5v2.75a.75.75 0 01-1.5 0V9.75H5.5a.75.75 0 010-1.5h2.5V5.5a.75.75 0 011.5 0v2.75h3a.75.75 0 01.75.75z" clipRule="evenodd" />
                  </svg>
                  Advanced Dashboard
                </button>
              </div>
            </div>
          )}

          {/* Statistics Button */}
          {view === 'studio' && storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => setShowProjectStatisticsPanel(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1"
              title="Project Statistics"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Stats</span>
            </button>
          )}

          {/* AI Story Analysis Button */}
          {view === 'studio' && storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => setShowAIStoryAnalysis(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white border border-purple-500 transition-colors flex items-center gap-1"
              title="AI Story Analysis"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="hidden sm:inline">AI Analysis</span>
            </button>
          )}

          {/* Shot List Generator Button */}
          {view === 'studio' && storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => setShowShotListGenerator(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 transition-colors flex items-center gap-1"
              title="Generate Shot List"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Shot List</span>
            </button>
          )}

          {/* Shooting Schedule Button */}
          {view === 'studio' && storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => setShowShootingSchedule(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-green-600 hover:bg-green-700 text-white border border-green-500 transition-colors flex items-center gap-1"
              title="Generate Shooting Schedule"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Schedule</span>
            </button>
          )}

          {/* Budget Estimator Button */}
          {view === 'studio' && storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => setShowBudgetEstimator(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500 transition-colors flex items-center gap-1"
              title="Budget Estimator"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="hidden sm:inline">Budget</span>
            </button>
          )}

          {/* Video Export Button */}
          {view === 'studio' && storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => setShowVideoExport(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-pink-600 hover:bg-pink-700 text-white border border-pink-500 transition-colors flex items-center gap-1"
              title="Export Video Slideshow"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
              <span className="hidden sm:inline">Video</span>
            </button>
          )}

          {/* Scene Comparison Button */}
          {view === 'studio' && storyContext.id && scenes.length > 1 && (
            <button
              onClick={() => setShowSceneComparison(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500 transition-colors flex items-center gap-1"
              title="Compare Scenes Side-by-Side"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
              <span className="hidden sm:inline">Compare</span>
            </button>
          )}

          {/* Character Relationship Graph Button */}
          {view === 'studio' && storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => setShowCharacterGraph(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-700 text-white border border-purple-500 transition-colors flex items-center gap-1"
              title="Character Relationship Graph"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM3 18a6 6 0 1112 0v1H3v-1zM15 9a2 2 0 100-4 2 2 0 000 4zM17 18v-1a2 2 0 00-2-2H5a2 2 0 00-2 2v1h14z" />
              </svg>
              <span className="hidden sm:inline">Relations</span>
            </button>
          )}

          {/* Version History Button */}
          {view === 'studio' && storyContext.id && (
            <button
              onClick={() => setShowVersionHistory(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white border border-teal-500 transition-colors flex items-center gap-1"
              title="Version History & Rollback"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">History</span>
            </button>
          )}

          {/* Project Health Score Button */}
          {view === 'studio' && storyContext.id && (
            <button
              onClick={() => setShowProjectHealth(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 transition-colors flex items-center gap-1"
              title="Project Health Score"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Health</span>
            </button>
          )}

          {/* AI Scene Suggestions Button */}
          {view === 'studio' && storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => setShowAISceneSuggestions(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-cyan-600 hover:bg-cyan-700 text-white border border-cyan-500 transition-colors flex items-center gap-1"
              title="AI Scene Suggestions"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="hidden sm:inline">AI Ideas</span>
            </button>
          )}

          {/* Story Arc Visualizer Button */}
          {view === 'studio' && storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => setShowStoryArcVisualizer(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500 transition-colors flex items-center gap-1"
              title="Story Arc Visualizer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Arc</span>
            </button>
          )}

          {/* Scene Bookmarks Button */}
          {view === 'studio' && storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => setShowSceneBookmarks(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-violet-600 hover:bg-violet-700 text-white border border-violet-500 transition-colors flex items-center gap-1"
              title="Scene Bookmarks"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path fillRule="evenodd" d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 001.075.676L10 15.082l5.925 2.844A.75.75 0 0017 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0010 2z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Bookmarks</span>
            </button>
          )}

          {/* Scene Dependency Tracker Button */}
          {view === 'studio' && storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => setShowSceneDependencyTracker(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500 transition-colors flex items-center gap-1"
              title="Scene Dependency Tracker"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 01-9.201 2.466l-.312-.311h2.433a.75.75 0 000-1.5H3.989a.75.75 0 00-.75.75v4.242a.75.75 0 001.5 0v-2.43l.31.31a7 7 0 0011.712-3.138.75.75 0 00-1.449-.39zm1.23-3.723a.75.75 0 00.219-.53V2.929a.75.75 0 00-1.5 0V5.36l-.31-.31A7 7 0 003.239 8.188a.75.75 0 101.448.389A5.5 5.5 0 0113.89 6.11l.311.31h-2.432a.75.75 0 000 1.5h4.243a.75.75 0 00.53-.219z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Dependencies</span>
            </button>
          )}

          {/* Export History Button */}
          {view === 'studio' && (
            <button
              onClick={() => setShowExportHistoryPanel(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1"
              title="Export History"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v5.5h5.5a.75.75 0 010 1.5h-5.5v5.5a.75.75 0 01-1.5 0v-5.5H4.25a.75.75 0 010-1.5h5.5v-5.5A.75.75 0 0110 2z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Exports</span>
            </button>
          )}

          {/* Export Queue Button */}
          {view === 'studio' && (
            <button
              onClick={() => setShowExportQueue(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1 relative"
              title="Export Queue"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Queue</span>
              {exportQueue.filter(j => j.status === 'queued' || j.status === 'processing').length > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {exportQueue.filter(j => j.status === 'queued' || j.status === 'processing').length}
                </span>
              )}
            </button>
          )}

          {/* Storyboard Playback Button */}
          {view === 'studio' && scenes.length > 0 && (
            <button
              onClick={() => setShowStoryboardPlayback(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-700 text-white border border-amber-500 transition-colors flex items-center gap-1"
              title="Playback Storyboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Playback</span>
            </button>
          )}

          {/* Advanced Search Button */}
          <button
            onClick={() => setShowAdvancedSearchPanel(true)}
            className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1"
            title="Advanced Search (Ctrl+F)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">Search</span>
          </button>

          {/* Comments Button */}
          {view === 'studio' && storyContext.id && (
            <button
              onClick={() => setShowCommentsPanel(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1"
              title="Project Comments (Ctrl+C)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902.848.137 1.705.248 2.57.331v4.091c0 .868.706 1.57 1.576 1.57a1.57 1.57 0 00.428-.06l4.344-1.16c.808-.216 1.632-.392 2.47-.523 1.437-.232 2.43-1.49 2.43-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.926 41.926 0 0010 2zm0 1.5c-2.1 0-4.2.16-6.3.48C2.5 4.18 2 4.75 2 5.426v5.148c0 .676.5 1.246 1.7 1.446a40.4 40.4 0 006.3.48c2.1 0 4.2-.16 6.3-.48 1.2-.2 1.7-.77 1.7-1.446V5.426c0-.676-.5-1.246-1.7-1.446a40.4 40.4 0 00-6.3-.48z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Comments</span>
            </button>
          )}

          {/* Undo/Redo Buttons */}
          {view === 'studio' && (
            <div className="flex gap-1">
              <button
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Undo (Ctrl+Z)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                  <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 01-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 010 10.75H10.75a.75.75 0 010-1.5h2.875a3.875 3.875 0 000-7.75H3.622l4.146 3.957a.75.75 0 01-1.036 1.086l-5.5-5.25a.75.75 0 010-1.086l5.5-5.25a.75.75 0 011.06.025z" clipRule="evenodd" />
                </svg>
              </button>
              <button
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Redo (Ctrl+Shift+Z)"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                  <path fillRule="evenodd" d="M12.207 2.232a.75.75 0 00.025 1.06l4.146 3.958H6.375a5.375 5.375 0 000 10.75H9.25a.75.75 0 000-1.5H6.375a3.875 3.875 0 010-7.75h10.003l-4.146 3.957a.75.75 0 001.036 1.086l5.5-5.25a.75.75 0 000-1.086l-5.5-5.25a.75.75 0 00-1.06.025z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          )}

          {/* Save as Template Button */}
          {view === 'studio' && storyContext.id && (
            <button
              onClick={() => setShowSaveTemplateModal(true)}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1"
              title="Save as Template"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
              </svg>
              <span className="hidden sm:inline">Template</span>
            </button>
          )}

          {/* Batch Mode Toggle */}
          {view === 'studio' && scenes.length > 0 && (
            <button
              onClick={() => {
                setBatchMode(!batchMode);
                if (batchMode) {
                  setSelectedSceneIds(new Set());
                }
              }}
              className={`text-xs px-2 sm:px-3 py-1.5 rounded border transition-colors flex items-center gap-1 ${
                batchMode
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border-zinc-700'
              }`}
              title="Batch Selection Mode"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path d="M1 1.75C1 1.33579 1.33579 1 1.75 1H4.25C4.66421 1 5 1.33579 5 1.75V4.25C5 4.66421 4.66421 5 4.25 5H1.75C1.33579 5 1 4.66421 1 4.25V1.75ZM6.5 1.75C6.5 1.33579 6.83579 1 7.25 1H9.75C10.1642 1 10.5 1.33579 10.5 1.75V4.25C10.5 4.66421 10.1642 5 9.75 5H7.25C6.83579 5 6.5 4.66421 6.5 4.25V1.75ZM12 1.75C12 1.33579 12.3358 1 12.75 1H15.25C15.6642 1 16 1.33579 16 1.75V4.25C16 4.66421 15.6642 5 15.25 5H12.75C12.3358 5 12 4.66421 12 4.25V1.75ZM1 7.25C1 6.83579 1.33579 6.5 1.75 6.5H4.25C4.66421 6.5 5 6.83579 5 7.25V9.75C5 10.1642 4.66421 10.5 4.25 10.5H1.75C1.33579 10.5 1 10.1642 1 9.75V7.25ZM6.5 7.25C6.5 6.83579 6.83579 6.5 7.25 6.5H9.75C10.1642 6.5 10.5 6.83579 10.5 7.25V9.75C10.5 10.1642 10.1642 10.5 9.75 10.5H7.25C6.83579 10.5 6.5 10.1642 6.5 9.75V7.25ZM12 7.25C12 6.83579 12.3358 6.5 12.75 6.5H15.25C15.6642 6.5 16 6.83579 16 7.25V9.75C16 10.1642 15.6642 10.5 15.25 10.5H12.75C12.3358 10.5 12 10.1642 12 9.75V7.25ZM1 12.75C1 12.3358 1.33579 12 1.75 12H4.25C4.66421 12 5 12.3358 5 12.75V15.25C5 15.6642 4.66421 16 4.25 16H1.75C1.33579 16 1 15.6642 1 15.25V12.75ZM6.5 12.75C6.5 12.3358 6.83579 12 7.25 12H9.75C10.1642 12 10.5 12.3358 10.5 12.75V15.25C10.5 15.6642 10.1642 16 9.75 16H7.25C6.83579 16 6.5 15.6642 6.5 15.25V12.75ZM12 12.75C12 12.3358 12.3358 12 12.75 12H15.25C15.6642 12 16 12.3358 16 12.75V15.25C16 15.6642 15.6642 16 15.25 16H12.75C12.3358 16 12 15.6642 12 15.25V12.75Z" />
              </svg>
              <span className="hidden sm:inline">Batch</span>
            </button>
          )}

          {/* Tags Button */}
          {view === 'studio' && storyContext.id && (
            <div className="relative">
              <button
                onClick={() => setShowTagsMenu(!showTagsMenu)}
                className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1"
                title="Tags"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                  <path fillRule="evenodd" d="M5.5 3A2.5 2.5 0 003 5.5v2.879a2.5 2.5 0 00.732 1.732l4.5 4.5a2.5 2.5 0 003.536 0l2.878-2.878a2.5 2.5 0 001.732-.732V16.5a2.5 2.5 0 01-2.5 2.5h-11A2.5 2.5 0 013 16.5V13.621a2.5 2.5 0 00-.732-1.732L.464 9.464A2.5 2.5 0 010 7.879V5.5A2.5 2.5 0 012.5 3h3z" clipRule="evenodd" />
                </svg>
                <span className="hidden sm:inline">Tags</span>
              </button>
              
              {showTagsMenu && (
                <div className="absolute right-0 mt-2 w-64 sm:w-72 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 p-3 max-h-[80vh] overflow-y-auto">
                  <div className="text-xs text-zinc-500 uppercase mb-2">Available Tags</div>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {availableTags.length === 0 ? (
                      <div className="text-xs text-zinc-500 py-2">No tags available. Create tags in your dashboard.</div>
                    ) : (
                      availableTags.map((tag: any) => (
                        <button
                          key={tag.id}
                          onClick={() => handleAddTag(tag.id)}
                          className="w-full text-left px-2 py-1 text-xs rounded hover:bg-zinc-800 flex items-center gap-2"
                          style={{ color: tag.color || '#6366f1' }}
                        >
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || '#6366f1' }}></span>
                          {tag.name}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* View Toggle */}
        {scenes.length > 0 && (
          <div className="absolute top-20 right-6 z-10 flex gap-2 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setStudioViewMode('storyboard')}
              className={`px-2 sm:px-3 py-1 text-xs rounded transition-colors ${
                studioViewMode === 'storyboard'
                  ? 'bg-amber-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Storyboard
            </button>
            <button
              onClick={() => setStudioViewMode('timeline')}
              className={`px-2 sm:px-3 py-1 text-xs rounded transition-colors ${
                studioViewMode === 'timeline'
                  ? 'bg-amber-600 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Timeline
            </button>
          </div>
        )}

        {/* Feed / Storyboard or Timeline */}
        {studioViewMode === 'timeline' ? (
          <TimelineView
            scenes={scenes}
            projectId={storyContext.id}
            onSceneClick={(scene) => {
              // Scroll to scene in storyboard view
              setStudioViewMode('storyboard');
              setTimeout(() => {
                const sceneElement = document.querySelector(`[data-scene-id="${scene.id}"]`);
                if (sceneElement) {
                  sceneElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }, 100);
            }}
          />
        ) : (
          <div className="flex-1 overflow-y-auto p-3 sm:p-6 scroll-smooth bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]">
            {/* Batch Operations Toolbar */}
            {batchMode && selectedSceneIds.size > 0 && (
              <div className="sticky top-2 sm:top-4 z-20 mb-4 bg-zinc-900 border border-amber-500/50 rounded-lg p-2 sm:p-3 shadow-xl">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0">
                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                    <span className="text-xs sm:text-sm font-bold text-amber-500">
                      {selectedSceneIds.size} scene{selectedSceneIds.size > 1 ? 's' : ''} selected
                    </span>
                    <button
                      onClick={handleSelectAll}
                      className="text-xs px-2 py-1 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700"
                    >
                      {selectedSceneIds.size === scenes.length ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                    <button
                      onClick={() => handleBulkStatusUpdate('completed')}
                      className="text-xs px-2 sm:px-3 py-1.5 rounded bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-800/50"
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => handleBulkStatusUpdate('planning')}
                      className="text-xs px-2 sm:px-3 py-1.5 rounded bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50 border border-yellow-800/50"
                    >
                      Planning
                    </button>
                    {/* Bulk Tag Assignment */}
                    {availableTags.length > 0 && (
                      <div className="relative group">
                        <button
                          className="text-xs px-2 sm:px-3 py-1.5 rounded bg-purple-900/30 text-purple-400 hover:bg-purple-900/50 border border-purple-800/50"
                        >
                          Add Tag
                        </button>
                        <div className="absolute right-0 mt-1 w-48 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity max-h-60 overflow-y-auto">
                          {availableTags.slice(0, 10).map((tag: any) => (
                            <button
                              key={tag.id}
                              onClick={() => handleBulkTagAssignment(tag.id)}
                              className="w-full text-left px-3 py-2 text-xs hover:bg-zinc-800 flex items-center gap-2"
                              style={{ color: tag.color || '#6366f1' }}
                            >
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color || '#6366f1' }}></span>
                              {tag.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Export Selected */}
                    <div className="relative group">
                      <button
                        className="text-xs px-2 sm:px-3 py-1.5 rounded bg-blue-900/30 text-blue-400 hover:bg-blue-900/50 border border-blue-800/50"
                      >
                        Export
                      </button>
                      <div className="absolute right-0 mt-1 w-40 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity">
                        <button
                          onClick={() => handleExportSelectedScenes('pdf')}
                          className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
                        >
                          PDF
                        </button>
                        <button
                          onClick={() => handleExportSelectedScenes('csv')}
                          className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
                        >
                          CSV
                        </button>
                        <button
                          onClick={() => handleExportSelectedScenes('markdown')}
                          className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
                        >
                          Markdown
                        </button>
                        <button
                          onClick={() => handleExportSelectedScenes('json')}
                          className="w-full text-left px-3 py-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white"
                        >
                          JSON
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={handleBulkDelete}
                      className="text-xs px-2 sm:px-3 py-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800/50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 pb-20 sm:pb-32">
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
                  {scenes.map((scene, index) => (
                    <div
                      key={scene.id}
                      data-scene-id={scene.id}
                      draggable={!batchMode}
                      onDragStart={(e) => handleDragStart(e, index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={(e) => handleDragLeave(e)}
                      onDrop={(e) => handleDrop(e, index)}
                      onContextMenu={(e) => !batchMode && handleSceneContextMenu(e, scene)}
                      className={`w-full transition-all duration-200 ${
                        batchMode ? 'cursor-pointer' : 'cursor-move'
                      } ${
                        draggedSceneIndex === index ? 'opacity-30 scale-95 rotate-1 shadow-2xl' : ''
                      } ${
                        dragOverIndex === index && draggedSceneIndex !== null 
                          ? 'translate-y-4 border-t-4 border-amber-500 bg-amber-900/10' 
                          : ''
                      } ${
                        selectedSceneIds.has(scene.id) ? 'ring-2 ring-amber-500 ring-offset-2 ring-offset-zinc-900' : ''
                      } ${
                        !batchMode ? 'hover:shadow-xl' : ''
                      }`}
                    >
                      <SceneCard 
                        scene={scene}
                        projectId={storyContext.id}
                        batchMode={batchMode}
                        isSelected={selectedSceneIds.has(scene.id)}
                        onToggleSelection={() => handleToggleSceneSelection(scene.id)}
                        onNotesClick={(sceneId) => {
                          setSelectedSceneId(sceneId);
                          setShowSceneNotesPanel(true);
                        }}
                        onPreview={!batchMode ? () => {
                          const sceneIndex = scenes.findIndex(s => s.id === scene.id);
                          if (sceneIndex >= 0) {
                            setPreviewSceneIndex(sceneIndex);
                            setShowScenePreviewModal(true);
                          }
                        } : undefined}
                        onDelete={async (sceneId) => {
                          try {
                            const apiAvailable = await checkApiAvailability();
                            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
                            if (apiAvailable) {
                              const token = localStorage.getItem('auth_token');
                              await fetch(`${API_BASE_URL}/clips/${sceneId}`, {
                                method: 'DELETE',
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                },
                              });
                            }
                            setScenes(prev => {
                              const filtered = prev.filter(s => s.id !== sceneId);
                              // Re-sequence remaining scenes
                              return filtered.map((s, idx) => ({
                                ...s,
                                sequenceNumber: idx + 1
                              }));
                            });
                            showToast('Scene deleted successfully', 'success');
                          } catch (error: any) {
                            showToast('Failed to delete scene', 'error');
                          }
                        }}
                      />
                    </div>
                  ))}
                  <div ref={bottomRef}></div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Characters Panel */}
      {showCharactersPanel && storyContext.id && (
        <CharactersPanel
          projectId={storyContext.id}
          storyContext={storyContext}
          scenes={scenes}
          onClose={() => setShowCharactersPanel(false)}
        />
      )}

      {/* Locations Panel */}
      {showLocationsPanel && storyContext.id && (
        <LocationsPanel
          projectId={storyContext.id}
          storyContext={storyContext}
          scenes={scenes}
          onClose={() => setShowLocationsPanel(false)}
        />
      )}

      {/* Analytics Panel */}
      {showAnalyticsPanel && storyContext.id && (
        <AnalyticsPanel
          projectId={storyContext.id}
          onClose={() => setShowAnalyticsPanel(false)}
        />
      )}

      {/* Advanced Analytics Dashboard */}
      {showAdvancedAnalytics && storyContext.id && scenes.length > 0 && (
        <AdvancedAnalyticsDashboard
          projectId={storyContext.id}
          scenes={scenes}
          storyContext={storyContext}
          onClose={() => setShowAdvancedAnalytics(false)}
        />
      )}

      {/* Project Statistics Panel */}
      {showProjectStatisticsPanel && storyContext.id && (
        <ProjectStatisticsPanel
          projectId={storyContext.id}
          scenes={scenes}
          onClose={() => setShowProjectStatisticsPanel(false)}
        />
      )}

      {/* Export History Panel */}
      {showExportHistoryPanel && (
        <ExportHistoryPanel
          onClose={() => setShowExportHistoryPanel(false)}
        />
      )}

      {/* Export Queue Panel */}
      {showExportQueue && (
        <ExportQueuePanel
          isOpen={showExportQueue}
          onClose={() => setShowExportQueue(false)}
          onAddExport={addExportToQueue}
          jobs={exportQueue}
          onCancelJob={cancelExportJob}
          onRetryJob={retryExportJob}
          onClearCompleted={clearCompletedExports}
        />
      )}

      {/* Scene Preview Modal */}
      {showScenePreviewModal && scenes[previewSceneIndex] && (
        <ScenePreviewModal
          scene={scenes[previewSceneIndex]}
          projectId={storyContext.id}
          scenes={scenes}
          onClose={() => setShowScenePreviewModal(false)}
          onPrevious={() => {
            if (previewSceneIndex > 0) {
              setPreviewSceneIndex(previewSceneIndex - 1);
            }
          }}
          onNext={() => {
            if (previewSceneIndex < scenes.length - 1) {
              setPreviewSceneIndex(previewSceneIndex + 1);
            }
          }}
        />
      )}

      {/* Storyboard Playback */}
      {showStoryboardPlayback && storyContext.id && scenes.length > 0 && (
        <StoryboardPlayback
          scenes={scenes}
          projectId={storyContext.id}
          onClose={() => setShowStoryboardPlayback(false)}
        />
      )}

      {/* AI Story Analysis Panel */}
      {showAIStoryAnalysis && storyContext.id && (
        <AIStoryAnalysisPanel
          projectId={storyContext.id}
          storyContext={storyContext}
          scenes={scenes}
          onClose={() => setShowAIStoryAnalysis(false)}
          onCreateScene={async (sceneIdea: string, purpose?: string) => {
            // Set the scene idea in the input and trigger generation
            setCurrentInput(sceneIdea);
            // Close the analysis panel
            setShowAIStoryAnalysis(false);
            // Show toast
            showToast(purpose ? `Generated scene idea: ${purpose}` : 'Scene idea ready to generate', 'success');
            // Optionally auto-generate the scene
            // You can uncomment this to auto-generate:
            // setTimeout(() => handleGenerateScene(), 500);
          }}
          onShowToast={showToast}
        />
      )}

      {/* Shot List Generator */}
      {showShotListGenerator && storyContext.id && (
        <ShotListGenerator
          scenes={scenes}
          projectId={storyContext.id}
          onClose={() => setShowShotListGenerator(false)}
        />
      )}

      {/* Shooting Schedule Generator */}
      {showShootingSchedule && storyContext.id && (
        <ShootingScheduleGenerator
          scenes={scenes}
          projectId={storyContext.id}
          storyContext={storyContext}
          onClose={() => setShowShootingSchedule(false)}
          onGenerateCallSheet={(day) => {
            setCallSheetDay(day);
            setShowShootingSchedule(false);
            setShowCallSheet(true);
          }}
        />
      )}

      {/* Call Sheet Generator */}
      {showCallSheet && storyContext.id && (
        <CallSheetGenerator
          scenes={scenes}
          projectId={storyContext.id}
          storyContext={storyContext}
          scheduleDay={callSheetDay}
          onClose={() => {
            setShowCallSheet(false);
            setCallSheetDay(null);
          }}
        />
      )}

      {/* Budget Estimator */}
      {showBudgetEstimator && storyContext.id && (
        <BudgetEstimator
          scenes={scenes}
          projectId={storyContext.id}
          onClose={() => setShowBudgetEstimator(false)}
        />
      )}

      {/* Video Slideshow Export */}
      {showVideoExport && storyContext.id && (
        <VideoSlideshowExport
          scenes={scenes}
          projectId={storyContext.id}
          onClose={() => setShowVideoExport(false)}
        />
      )}

      {/* Scene Comparison View */}
      {showSceneComparison && storyContext.id && scenes.length > 0 && (
        <SceneComparisonView
          scenes={scenes}
          projectId={storyContext.id}
          onClose={() => setShowSceneComparison(false)}
        />
      )}

      {/* Character Relationship Graph */}
      {showCharacterGraph && storyContext.id && scenes.length > 0 && (
        <CharacterRelationshipGraph
          scenes={scenes}
          projectId={storyContext.id}
          storyContext={storyContext}
          onClose={() => setShowCharacterGraph(false)}
        />
      )}

      {/* Version History Panel */}
      {showVersionHistory && storyContext.id && (
        <VersionHistoryPanel
          projectId={storyContext.id}
          currentContext={storyContext}
          currentScenes={scenes}
          currentSettings={currentSettings}
          onClose={() => setShowVersionHistory(false)}
          onRestore={async (version) => {
            setStoryContext(version.context);
            setScenes(version.scenes || []);
            setCurrentSettings(version.settings);
            showToast('Version restored successfully', 'success');
          }}
        />
      )}

      {/* Project Health Score */}
      {showProjectHealth && storyContext.id && (
        <ProjectHealthScore
          scenes={scenes}
          storyContext={storyContext}
          settings={currentSettings}
          onClose={() => setShowProjectHealth(false)}
        />
      )}

      {/* Quick Actions Menu */}
      {quickActionsMenu && (
        <QuickActionsMenuWrapper
          scene={quickActionsMenu.scene}
          position={quickActionsMenu.position}
          projectId={storyContext.id}
          onClose={() => setQuickActionsMenu(null)}
          onDuplicate={handleDuplicateScene}
          onCopySettings={handleCopySceneSettings}
          onDelete={async (sceneId) => {
            const scene = scenes.find(s => s.id === sceneId);
            if (!scene) return;
            
            try {
              const apiAvailable = await checkApiAvailability();
              const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
              const token = localStorage.getItem('auth_token');

              if (apiAvailable) {
                const response = await fetch(`${API_BASE_URL}/clips/${sceneId}`, {
                  method: 'DELETE',
                  headers: {
                    'Authorization': `Bearer ${token}`,
                  },
                });
                if (!response.ok) throw new Error('Failed to delete scene');
              }

              setScenes(prev => {
                const filtered = prev.filter(s => s.id !== sceneId);
                return filtered.map((s, idx) => ({
                  ...s,
                  sequenceNumber: idx + 1
                }));
              });

              showToast('Scene deleted successfully', 'success');
            } catch (error: any) {
              showToast('Failed to delete scene', 'error');
            }
          }}
          onEdit={handleEditScene}
          onExport={handleExportScene}
        />
      )}

      {/* Copy Scene Settings Modal */}
      {showCopySettingsModal && sourceSceneForCopy && (
        <CopySceneSettingsModal
          sourceScene={sourceSceneForCopy}
          targetScenes={scenes.filter(s => s.id !== sourceSceneForCopy.id)}
          onClose={() => {
            setShowCopySettingsModal(false);
            setSourceSceneForCopy(null);
          }}
          onCopy={handleApplyCopiedSettings}
        />
      )}

      {/* AI Scene Suggestions Panel */}
      {showAISceneSuggestions && storyContext.id && scenes.length > 0 && (
        <AISceneSuggestionsPanel
          scenes={scenes}
          storyContext={storyContext}
          projectId={storyContext.id}
          onClose={() => setShowAISceneSuggestions(false)}
          onApplySuggestion={(suggestion) => {
            // Set the suggestion as the current input
            setCurrentInput(suggestion);
            // Focus the input field
            setTimeout(() => {
              const input = document.querySelector('textarea[placeholder*="Describe"]') as HTMLTextAreaElement;
              if (input) {
                input.focus();
                input.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }, 100);
          }}
        />
      )}

      {/* Story Arc Visualizer */}
      {showStoryArcVisualizer && storyContext.id && scenes.length > 0 && (
        <StoryArcVisualizer
          scenes={scenes}
          storyContext={storyContext}
          onClose={() => setShowStoryArcVisualizer(false)}
        />
      )}

      {/* Project Quick Actions Menu */}
      {projectQuickActions && (
        <ProjectQuickActionsMenu
          project={projectQuickActions.project}
          position={projectQuickActions.position}
          onClose={() => setProjectQuickActions(null)}
          onOpen={(project) => handleOpenProject(project)}
          onDuplicate={async (project) => {
            try {
              const event = { stopPropagation: () => {} } as React.MouseEvent;
              await handleDuplicateProject(event, project);
              showToast('Project duplicated successfully', 'success');
            } catch (error: any) {
              showToast('Failed to duplicate project', 'error');
            }
          }}
          onArchive={(project) => {
            showToast('Archive feature coming soon', 'info');
          }}
          onShare={(project) => {
            setSelectedProjectForSharing(project);
            setShowSharingModal(true);
          }}
          onDelete={async (project) => {
            try {
              await handleDeleteProject(project.context.id);
              showToast('Project deleted successfully', 'success');
            } catch (error: any) {
              showToast('Failed to delete project', 'error');
            }
          }}
          onExport={async (project) => {
            try {
              const projectData = await apiService.getProject(project.context.id);
              setStoryContext(projectData.context);
              setScenes(projectData.scenes || []);
              setCurrentSettings(projectData.settings || DEFAULT_DIRECTOR_SETTINGS);
              setView('studio');
              setTimeout(() => {
                handleExport('pdf');
              }, 500);
            } catch (error: any) {
              showToast('Failed to export project', 'error');
            }
          }}
          onManageCover={(project) => {
            setCoverImageProjectId(project.context.id);
            setCoverImageProjectUrl(project.context.coverImageUrl || null);
            setShowCoverImageManager(true);
          }}
        />
      )}

      {/* Cover Image Manager */}
      {/* Project Stats Tooltip */}
      {hoveredProjectForTooltip && view === 'library' && (
        <ProjectStatsTooltip
          project={hoveredProjectForTooltip.project}
          position={hoveredProjectForTooltip.position}
        />
      )}

      {showCoverImageManager && coverImageProjectId && (
        <CoverImageManager
          projectId={coverImageProjectId}
          currentCoverUrl={coverImageProjectUrl}
          onClose={() => {
            setShowCoverImageManager(false);
            setCoverImageProjectId(null);
            setCoverImageProjectUrl(null);
          }}
          onUpdate={async () => {
            // Reload projects to show updated cover
            try {
              const list = await apiService.getProjects();
              setProjects(list);
            } catch (error) {
              console.error('Failed to reload projects:', error);
            }
          }}
        />
      )}

      {/* Scene Dependency Tracker */}
      {showSceneDependencyTracker && storyContext.id && scenes.length > 0 && (
        <SceneDependencyTracker
          scenes={scenes}
          storyContext={storyContext}
          projectId={storyContext.id}
          onClose={() => setShowSceneDependencyTracker(false)}
        />
      )}

      {/* Scene Bookmarks Panel */}
      {showSceneBookmarks && storyContext.id && scenes.length > 0 && (
        <SceneBookmarksPanel
          projectId={storyContext.id}
          scenes={scenes}
          onClose={() => setShowSceneBookmarks(false)}
          onNavigateToScene={(sceneId) => {
            setShowSceneBookmarks(false);
            setTimeout(() => {
              const sceneElement = document.querySelector(`[data-scene-id="${sceneId}"]`);
              if (sceneElement) {
                sceneElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                sceneElement.classList.add('ring-2', 'ring-amber-500');
                setTimeout(() => {
                  sceneElement.classList.remove('ring-2', 'ring-amber-500');
                }, 2000);
              }
            }, 100);
          }}
        />
      )}

      {/* Export Presets Panel */}
      {showExportPresets && (
        <ExportPresetsPanel
          onClose={() => setShowExportPresets(false)}
          onApply={async (preset) => {
            try {
              const exportData: any = {
                context: storyContext,
                scenes: scenes,
                settings: currentSettings,
              };

              // Apply preset settings
              if (!preset.includeSettings) {
                exportData.settings = undefined;
              }

              switch (preset.format) {
                case 'pdf':
                  const { exportToPDF } = await import('./utils/exportUtils');
                  await exportToPDF(exportData, `${storyContext.title || 'project'}-${preset.name}`);
                  break;
                case 'csv':
                  const { exportToCSV } = await import('./utils/exportUtils');
                  exportToCSV(exportData, `${storyContext.title || 'project'}-${preset.name}`);
                  break;
                case 'markdown':
                  const { exportToMarkdown } = await import('./utils/exportUtils');
                  exportToMarkdown(exportData, `${storyContext.title || 'project'}-${preset.name}`);
                  break;
                case 'json':
                  const jsonStr = JSON.stringify(exportData, null, 2);
                  const jsonBlob = new Blob([jsonStr], { type: 'application/json' });
                  const jsonUrl = URL.createObjectURL(jsonBlob);
                  const jsonA = document.createElement('a');
                  jsonA.href = jsonUrl;
                  jsonA.download = `${storyContext.title || 'project'}-${preset.name}.json`;
                  jsonA.click();
                  URL.revokeObjectURL(jsonUrl);
                  break;
                case 'fountain':
                  const { exportToFountain } = await import('./utils/exportUtils');
                  exportToFountain(exportData, `${storyContext.title || 'project'}-${preset.name}`);
                  break;
              }

              showToast(`Exported using preset: ${preset.name}`, 'success');
              setShowExportPresets(false);
            } catch (error: any) {
              showToast(`Failed to export: ${error.message}`, 'error');
            }
          }}
        />
      )}

      {/* Project Templates Library */}
      {showTemplatesLibrary && (
        <ProjectTemplatesLibrary
          onClose={() => setShowTemplatesLibrary(false)}
          onSelectTemplate={async (template) => {
            try {
              const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
              const token = localStorage.getItem('auth_token');
              
              // Create project from template
              const response = await fetch(`${API_BASE_URL}/templates/${template.id}/create-project`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (!response.ok) throw new Error('Failed to create project from template');

              const result = await response.json();
              
              // Load the newly created project
              const projectData = await apiService.getProject(result.id);
              setStoryContext(projectData.context);
              setScenes(projectData.scenes || []);
              setCurrentSettings(projectData.settings || DEFAULT_DIRECTOR_SETTINGS);
              setView('studio');
              setShowTemplatesLibrary(false);
              showToast('Project created from template!', 'success');
            } catch (error: any) {
              showToast('Failed to create project from template', 'error');
            }
          }}
          onSaveCurrentAsTemplate={async () => {
            if (!storyContext.id || !storyContext.title) {
              showToast('Please save your project first', 'error');
              return;
            }

            const templateName = window.prompt('Enter template name:');
            if (!templateName) return;

            try {
              const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
              const token = localStorage.getItem('auth_token');
              
              await fetch(`${API_BASE_URL}/templates`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  name: templateName,
                  description: `Template based on: ${storyContext.title}`,
                  genre: storyContext.genre,
                  plot_summary: storyContext.plotSummary,
                  characters: storyContext.characters,
                  initial_context: storyContext.initialContext,
                  director_settings: currentSettings,
                }),
              });

              showToast('Template saved successfully!', 'success');
              setShowTemplatesLibrary(false);
            } catch (error: any) {
              showToast('Failed to save template', 'error');
            }
          }}
        />
      )}

      {/* Advanced Search Panel */}
      {showAdvancedSearchPanel && (
        <AdvancedSearchPanel
          projects={projects}
          scenes={scenes}
          currentProjectId={storyContext.id}
          onClose={() => setShowAdvancedSearchPanel(false)}
          onSelectProject={async (projectId) => {
            try {
              const apiAvailable = await checkApiAvailability();
              let projectData: ProjectData | null = null;

              if (apiAvailable) {
                projectData = await apiService.getProject(projectId);
              } else {
                const allProjects = await getProjectsFromDB();
                projectData = allProjects.find(p => p.context.id === projectId) || null;
              }

              if (projectData) {
                setStoryContext(projectData.context);
                setScenes(projectData.scenes || []);
                setCurrentSettings(projectData.settings || DEFAULT_DIRECTOR_SETTINGS);
                setView('studio');
                showToast('Project loaded', 'success');
              }
            } catch (error: any) {
              showToast('Failed to load project', 'error');
            }
          }}
          onSelectScene={(sceneId, projectId) => {
            // If it's the current project, just scroll to scene
            if (projectId === storyContext.id) {
              const sceneElement = document.querySelector(`[data-scene-id="${sceneId}"]`);
              if (sceneElement) {
                sceneElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                // Highlight the scene briefly
                sceneElement.classList.add('ring-2', 'ring-amber-500');
                setTimeout(() => {
                  sceneElement.classList.remove('ring-2', 'ring-amber-500');
                }, 2000);
              }
            } else {
              // Load the project first
              const loadProject = async () => {
                try {
                  const apiAvailable = await checkApiAvailability();
                  let projectData: ProjectData | null = null;

                  if (apiAvailable) {
                    projectData = await apiService.getProject(projectId);
                  } else {
                    const allProjects = await getProjectsFromDB();
                    projectData = allProjects.find(p => p.context.id === projectId) || null;
                  }

                  if (projectData) {
                    setStoryContext(projectData.context);
                    setScenes(projectData.scenes || []);
                    setCurrentSettings(projectData.settings || DEFAULT_DIRECTOR_SETTINGS);
                    setView('studio');
                    
                    // Scroll to scene after a short delay
                    setTimeout(() => {
                      const sceneElement = document.querySelector(`[data-scene-id="${sceneId}"]`);
                      if (sceneElement) {
                        sceneElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        sceneElement.classList.add('ring-2', 'ring-amber-500');
                        setTimeout(() => {
                          sceneElement.classList.remove('ring-2', 'ring-amber-500');
                        }, 2000);
                      }
                    }, 500);
                    
                    showToast('Project loaded', 'success');
                  }
                } catch (error: any) {
                  showToast('Failed to load project', 'error');
                }
              };
              loadProject();
            }
          }}
        />
      )}

      {/* Scene Templates Modal */}
      {showSceneTemplates && (
        <SceneTemplatesModal
          templates={sceneTemplates}
          storyContext={storyContext}
          onSelect={handleSelectSceneTemplate}
          onClose={() => setShowSceneTemplates(false)}
          onSaveCurrentAsTemplate={() => {
            setShowSceneTemplates(false);
            setShowSaveSceneTemplateModal(true);
          }}
        />
      )}

      {/* Save Scene Template Modal */}
      {showSaveSceneTemplateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-md p-4 sm:p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-4">Save Scene as Template</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-400 uppercase mb-1">Template Name</label>
                <input
                  type="text"
                  value={sceneTemplateName}
                  onChange={(e) => setSceneTemplateName(e.target.value)}
                  className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                  placeholder="e.g. Action Chase Scene"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleSaveCurrentAsSceneTemplate}
                  className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm"
                >
                  Save Template
                </button>
                <button
                  onClick={() => {
                    setShowSaveSceneTemplateModal(false);
                    setSceneTemplateName('');
                  }}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Panel */}
      {showActivityPanel && (
        <div className="fixed inset-0 z-[100]">
          <ActivityPanel
            onClose={() => setShowActivityPanel(false)}
          />
        </div>
      )}

      {/* Notification Center */}
      {showNotificationCenter && (
        <NotificationCenter
          isOpen={showNotificationCenter}
          onClose={() => setShowNotificationCenter(false)}
          notifications={notifications}
          unreadCount={unreadNotificationCount}
          onMarkAsRead={handleMarkNotificationRead}
          onMarkAllAsRead={handleMarkAllNotificationsRead}
          onDelete={handleDeleteNotification}
          onRefresh={loadNotifications}
        />
      )}

      {/* Settings Panel */}
      {showSettingsPanel && (
        <div className="fixed inset-0 z-[100]">
          <SettingsPanel
            onClose={() => setShowSettingsPanel(false)}
            theme={theme}
            onThemeChange={setTheme}
          />
        </div>
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => {
          setShowCommandPalette(false);
          setCommandPaletteQuery('');
        }}
        commands={[
          {
            id: 'save',
            label: 'Save Project',
            description: 'Save current project',
            icon: '💾',
            keywords: ['save', 'store'],
            action: () => {
              handleManualSave();
              setShowCommandPalette(false);
            }
          },
          {
            id: 'export',
            label: 'Export Project',
            description: 'Export as JSON, PDF, CSV, or Markdown',
            icon: '📤',
            keywords: ['export', 'download'],
            action: () => {
              setShowExportMenu(true);
              setShowCommandPalette(false);
            }
          },
          {
            id: 'new-scene',
            label: 'New Scene',
            description: 'Create a new scene',
            icon: '➕',
            keywords: ['new', 'scene', 'add'],
            action: () => {
              if (view === 'studio') {
                const input = document.querySelector('textarea[placeholder*="idea"]') as HTMLTextAreaElement;
                if (input) input.focus();
              }
              setShowCommandPalette(false);
            }
          },
          {
            id: 'characters',
            label: 'Characters Panel',
            description: 'Manage characters',
            icon: '👥',
            keywords: ['characters', 'people'],
            action: () => {
              setShowCharactersPanel(true);
              setShowCommandPalette(false);
            }
          },
          {
            id: 'locations',
            label: 'Locations Panel',
            description: 'Manage locations',
            icon: '📍',
            keywords: ['locations', 'places'],
            action: () => {
              setShowLocationsPanel(true);
              setShowCommandPalette(false);
            }
          },
          {
            id: 'comments',
            label: 'Comments Panel',
            description: 'View project comments',
            icon: '💬',
            keywords: ['comments', 'notes'],
            action: () => {
              setShowCommentsPanel(true);
              setShowCommandPalette(false);
            }
          },
          {
            id: 'analytics',
            label: 'Analytics Panel',
            description: 'View project analytics',
            icon: '📊',
            keywords: ['analytics', 'stats', 'statistics'],
            action: () => {
              setShowAnalyticsPanel(true);
              setShowCommandPalette(false);
            }
          },
          {
            id: 'search',
            label: 'Advanced Search',
            description: 'Search across projects and scenes',
            icon: '🔍',
            keywords: ['search', 'find', 'look'],
            action: () => {
              setShowAdvancedSearchPanel(true);
              setShowCommandPalette(false);
            }
          },
          {
            id: 'library',
            label: 'Go to Library',
            description: 'View all projects',
            icon: '📚',
            keywords: ['library', 'projects', 'home'],
            action: () => {
              setView('library');
              setShowCommandPalette(false);
            }
          }
        ]}
        projects={projects.map(p => ({
          id: p.context.id,
          title: p.context.title,
          genre: p.context.genre
        }))}
        onSelectProject={(projectId) => {
          const project = projects.find(p => p.context.id === projectId);
          if (project) {
            handleOpenProject(project);
          }
        }}
        onCreateNew={() => {
          setView('setup');
          setShowCommandPalette(false);
        }}
      />

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Comments Panel */}
      {showCommentsPanel && storyContext.id && (
        <CommentsPanel
          projectId={storyContext.id}
          onClose={() => setShowCommentsPanel(false)}
        />
      )}

      {/* Scene Notes Panel */}
      {showSceneNotesPanel && selectedSceneId && (
        <EnhancedSceneNotesPanel
          sceneId={selectedSceneId}
          onClose={() => {
            setShowSceneNotesPanel(false);
            setSelectedSceneId(null);
          }}
        />
      )}

      {/* Template Selector */}
      {showTemplateSelector && (
        <TemplateSelector
          onSelect={handleTemplateSelect}
          onClose={() => {
            setShowTemplateSelector(false);
            // If closed without selecting, create blank project
            setStoryContext({ ...DEFAULT_CONTEXT, id: generateId() });
            setScenes([]);
            setCurrentSettings(DEFAULT_DIRECTOR_SETTINGS);
            setSetupTab('new');
            setView('setup');
          }}
        />
      )}

      {/* Sharing Modal */}
      {showSharingModal && selectedProjectForSharing && (
        <SharingModal
          project={selectedProjectForSharing}
          onClose={() => {
            setShowSharingModal(false);
            setSelectedProjectForSharing(null);
          }}
        />
      )}

      {/* Save Template Modal */}
      {showSaveTemplateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-xl font-bold">Save as Template</h2>
              <button
                onClick={() => {
                  setShowSaveTemplateModal(false);
                  setTemplateName('');
                }}
                className="text-zinc-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            <div className="p-4">
              <label className="block text-sm font-medium text-zinc-400 mb-2">Template Name</label>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g. My Action Template"
                className="w-full bg-black border border-zinc-700 rounded-lg px-3 py-2 text-white focus:border-amber-500 outline-none"
                autoFocus
              />
              <p className="text-xs text-zinc-500 mt-2">
                This will save your current project settings, genre, characters, and plot summary as a reusable template.
              </p>
            </div>
            <div className="p-4 border-t border-zinc-800 flex gap-2">
              <button
                onClick={() => {
                  setShowSaveTemplateModal(false);
                  setTemplateName('');
                }}
                className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveAsTemplate}
                disabled={!templateName.trim()}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm disabled:opacity-50"
              >
                Save Template
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Control Deck */}
      <div className="border-t border-zinc-800 bg-black p-2 sm:p-4 flex-shrink-0 z-30 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-3 sm:gap-6">
          
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
            <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-1 flex-1 flex flex-col h-full min-h-[150px] sm:min-h-[200px] lg:min-h-0 relative group">
              
              {/* Auto-Draft Button (Top Right) */}
              <button 
                onClick={handleAutoDraft}
                className="absolute top-2 right-2 sm:top-3 sm:right-3 text-xs bg-zinc-800 hover:bg-zinc-700 text-amber-500 border border-amber-500/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-all flex items-center gap-1 z-10 shadow-lg opacity-80 hover:opacity-100"
                disabled={isProcessing || isAutoFilling}
                title="Let the AI suggest the next scene idea based on the story"
              >
                 <span className="text-base sm:text-lg leading-none">✨</span>
                 <span className="font-bold hidden sm:inline">Auto-Write Idea</span>
                 <span className="font-bold sm:hidden">Auto</span>
              </button>

              <textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                disabled={isProcessing}
                placeholder="Describe the next 8 seconds... (e.g., 'Close up on hero's face, sweating, physics of debris floating in zero-g, muffled heartbeat sound')"
                className="w-full h-full bg-transparent p-3 sm:p-4 text-white outline-none resize-none placeholder-zinc-600 font-sans text-base sm:text-lg pr-20 sm:pr-32"
              />
              <div className="p-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 border-t border-zinc-800/50 bg-zinc-900/50">
                <span className="text-xs text-zinc-500 pl-2">
                  {currentInput.length > 0 ? 'Director AI ready to write specs.' : 'Waiting for input...'}
                </span>
                <button
                  onClick={handleGenerateScene}
                  disabled={isProcessing || !currentInput.trim()}
                  className={`w-full sm:w-auto px-6 sm:px-8 py-2 sm:py-3 rounded font-bold text-xs sm:text-sm tracking-wide transition-all ${
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
      
      {/* Cover Image Selector Modal */}
      {showCoverImageSelector && storyContext.id && (
        <CoverImageSelector
          projectId={storyContext.id}
          currentCoverImageId={selectedCoverImageId}
          onSelect={handleCoverImageSelect}
          onClose={() => setShowCoverImageSelector(false)}
        />
      )}
    </div>
  );
};

export default App;
