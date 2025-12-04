
import React, { useEffect, useMemo, useRef, useState, startTransition } from 'react';
import { apiService, checkApiAvailability } from './apiService';
import { activityService, sceneTemplatesService, tagsService } from './apiServices';
import { generateStoryConcept, suggestNextScene } from './clientGeminiService';
import ActivityPanel from './components/ActivityPanel';
import AdminDashboard from './components/AdminDashboard';
import AdvancedAnalyticsDashboard from './components/AdvancedAnalyticsDashboard';
import AdvancedSearchPanel from './components/AdvancedSearchPanel';
import AISceneSuggestionsPanel from './components/AISceneSuggestionsPanel';
import AIStoryAnalysisPanel from './components/AIStoryAnalysisPanel';
import AnalyticsPanel from './components/AnalyticsPanel';
import Auth from './components/Auth';
import BudgetEstimator from './components/BudgetEstimator';
import CallSheetGenerator from './components/CallSheetGenerator';
import CharacterRelationshipGraph from './components/CharacterRelationshipGraph';
import CharactersPanel from './components/CharactersPanel';
import CommandPalette from './components/CommandPalette';
import CommentsPanel from './components/CommentsPanel';
import ContentTypeSelector from './components/ContentTypeSelector';
import CopyButton from './components/CopyButton';
import CopySceneSettingsModal from './components/CopySceneSettingsModal';
import CoverImageManager from './components/CoverImageManager';
import CoverImageSelector from './components/CoverImageSelector';
import DirectorPanel from './components/DirectorPanel';
import EnhancedSceneNotesPanel from './components/EnhancedSceneNotesPanel';
import ExportHistoryPanel from './components/ExportHistoryPanel';
import ExportPresetsPanel from './components/ExportPresetsPanel';
import ExportQueuePanel from './components/ExportQueuePanel';
import ForgotPassword from './components/ForgotPassword';
import LocationsPanel from './components/LocationsPanel';
import NotificationCenter from './components/NotificationCenter';
import ProjectHealthScore from './components/ProjectHealthScore';
import ProjectQuickActionsMenu from './components/ProjectQuickActionsMenu';
import ProjectStatisticsPanel from './components/ProjectStatisticsPanel';
import ProjectStatsTooltip from './components/ProjectStatsTooltip';
import ProjectTemplatesLibrary from './components/ProjectTemplatesLibrary';
import QuickActionsMenuWrapper, { setShowToast as setQuickActionsToast } from './components/QuickActionsMenuWrapper';
import ResetPassword from './components/ResetPassword';
import SceneBookmarksPanel from './components/SceneBookmarksPanel';
import SceneCard from './components/SceneCard';
import SceneComparisonView from './components/SceneComparisonView';
import SceneDependencyTracker from './components/SceneDependencyTracker';
import ScenePreviewModal from './components/ScenePreviewModal';
import SceneTemplatesModal from './components/SceneTemplatesModal';
import SettingsPanel from './components/SettingsPanel';
import SharingModal from './components/SharingModal';
import ShootingScheduleGenerator from './components/ShootingScheduleGenerator';
import ShotListGenerator from './components/ShotListGenerator';
import StoryArcVisualizer from './components/StoryArcVisualizer';
import StoryboardPlayback from './components/StoryboardPlayback';
import TemplateSelector from './components/TemplateSelector';
import TimelineView from './components/TimelineView';
import { ToastContainer } from './components/Toast';
import UserDashboard from './components/UserDashboard';
import VersionHistoryPanel from './components/VersionHistoryPanel';
import VideoSlideshowExport from './components/VideoSlideshowExport';
import { getProjectsFromDB, ProjectData, saveProjectToDB } from './db';
import { useAppState } from './hooks/useAppState';
import { useAuth } from './hooks/useAuth';
import { useDataLoading } from './hooks/useDataLoading';
import { useExportOperations } from './hooks/useExportOperations';
import { useLibraryState } from './hooks/useLibraryState';
import { useProjectOperations } from './hooks/useProjectOperations';
import { useSceneOperations } from './hooks/useSceneOperations';
import { useToast } from './hooks/useToast';
import { useSSE, generateConnectionId } from './hooks/useSSE';
import LibraryView from './modules/LibraryView';
import SetupView from './modules/SetupView';
import StudioView from './modules/StudioView';
import SaveProgressModal from './components/SaveProgressModal';
import { DirectorSettings, Scene, StoryContext } from './types';
import { getStatusesCount } from './utils/arrayUtils';
import { DEFAULT_CONTEXT, DEFAULT_DIRECTOR_SETTINGS } from './utils/constants';
import { getContentTypeBadgeClass, getContentTypeInfo, getContentTypeTerminology } from './utils/contentTypeUtils';
import { promptText } from './utils/dialogUtils';
import { calculateProjectHealthScore, generateId } from './utils/helpers';
import { matchesFilters } from './utils/libraryUtils';
import { getApiBaseUrl, reloadProjects } from './utils/uiUtils';

// createImmediateHandler is now imported from utils/uiUtils

const App: React.FC = () => {
  // --- Authentication State ---
  const {
    isAuthenticated,
    currentUser,
    authLoading,
    handleLogin,
    handleLogout,
    setCurrentUser,
    setIsAuthenticated
  } = useAuth();

  // --- Main Application State (using useAppState hook) ---
  const appState = useAppState();
  
  // Destructure app state for easier access
  const {
    view, setView,
    adminViewMode, setAdminViewMode,
    studioViewMode, setStudioViewMode,
    storyContext, setStoryContext,
    scenes, setScenes,
    currentSettings, setCurrentSettings,
    projects, setProjects,
    isProcessing, setIsProcessing,
    isAutoFilling, setIsAutoFilling,
    setupTab, setSetupTab,
    saveStatus, setSaveStatus,
    lastSavedTime, setLastSavedTime,
    autoSaveEnabled, setAutoSaveEnabled,
    showCommandPalette, setShowCommandPalette,
    commandPaletteQuery, setCommandPaletteQuery,
    currentInput, setCurrentInput,
    storySeed, setStorySeed,
    showExportMenu, setShowExportMenu,
    availableTags, setAvailableTags,
    projectTags, setProjectTags,
    showTagsMenu, setShowTagsMenu,
    comicExists, setComicExists,
    isRegeneratingComic, setIsRegeneratingComic,
    showCoverImageSelector, setShowCoverImageSelector,
    selectedCoverImageId, setSelectedCoverImageId,
    draggedSceneIndex, setDraggedSceneIndex,
    batchMode, setBatchMode,
    selectedSceneIds, setSelectedSceneIds,
    dragOverIndex, setDragOverIndex,
    showCommentsPanel, setShowCommentsPanel,
    showSceneNotesPanel, setShowSceneNotesPanel,
    selectedSceneId, setSelectedSceneId,
    showTemplateSelector, setShowTemplateSelector,
    showSaveTemplateModal, setShowSaveTemplateModal,
    templateName, setTemplateName,
    showContentTypeSelector, setShowContentTypeSelector,
    selectedContentType, setSelectedContentType,
    showCharactersPanel, setShowCharactersPanel,
    showLocationsPanel, setShowLocationsPanel,
    showAnalyticsPanel, setShowAnalyticsPanel,
    showAdvancedAnalytics, setShowAdvancedAnalytics,
    showActivityPanel, setShowActivityPanel,
    showNotificationCenter, setShowNotificationCenter,
    activities, setActivities,
    notifications, setNotifications,
    unreadNotificationCount, setUnreadNotificationCount,
    showSettingsPanel, setShowSettingsPanel,
    showSceneTemplates, setShowSceneTemplates,
    sceneTemplates, setSceneTemplates,
    showSaveSceneTemplateModal, setShowSaveSceneTemplateModal,
    sceneTemplateName, setSceneTemplateName,
    currentHash, setCurrentHash,
    showSharingModal, setShowSharingModal,
    showExportHistoryPanel, setShowExportHistoryPanel,
    showProjectStatisticsPanel, setShowProjectStatisticsPanel,
    showScenePreviewModal, setShowScenePreviewModal,
    previewSceneIndex, setPreviewSceneIndex,
    showStoryboardPlayback, setShowStoryboardPlayback,
    showAdvancedSearchPanel, setShowAdvancedSearchPanel,
    showTemplatesLibrary, setShowTemplatesLibrary,
    showAIStoryAnalysis, setShowAIStoryAnalysis,
    showShotListGenerator, setShowShotListGenerator,
    showShootingSchedule, setShowShootingSchedule,
    showCallSheet, setShowCallSheet,
    callSheetDay, setCallSheetDay,
    showBudgetEstimator, setShowBudgetEstimator,
    showVideoExport, setShowVideoExport,
    showSceneComparison, setShowSceneComparison,
    showCharacterGraph, setShowCharacterGraph,
    showVersionHistory, setShowVersionHistory,
    showProjectHealth, setShowProjectHealth,
    quickActionsMenu, setQuickActionsMenu,
    showCopySettingsModal, setShowCopySettingsModal,
    sourceSceneForCopy, setSourceSceneForCopy,
    showExportPresets, setShowExportPresets,
    showAISceneSuggestions, setShowAISceneSuggestions,
    showStoryArcVisualizer, setShowStoryArcVisualizer,
    selectedProjectForSharing, setSelectedProjectForSharing,
    projectQuickActions, setProjectQuickActions,
    showCoverImageManager, setShowCoverImageManager,
    coverImageProjectId, setCoverImageProjectId,
    coverImageProjectUrl, setCoverImageProjectUrl,
    showSceneBookmarks, setShowSceneBookmarks,
    showExportQueue, setShowExportQueue,
    exportQueue, setExportQueue,
    processingJobId, setProcessingJobId,
    showSceneDependencyTracker, setShowSceneDependencyTracker,
    hoveredProjectForTooltip, setHoveredProjectForTooltip,
    batchGeneratingCovers, setBatchGeneratingCovers,
    showQuickTemplateCreator, setShowQuickTemplateCreator,
    templateCreatorProject, setTemplateCreatorProject,
    showQuickTagAssigner, setShowQuickTagAssigner,
    tagAssignerProject, setTagAssignerProject,
    favoritedProjects, setFavoritedProjects,
    showBulkTagAssigner, setShowBulkTagAssigner,
    history, setHistory,
    historyIndex, setHistoryIndex,
    maxHistorySize,
  } = appState;

  // SSE connection for save progress
  const [saveConnectionId, setSaveConnectionId] = useState<string | null>(null);

  // Memoize content type terminology to avoid recalculating on every render
  const contentTypeTerminology = useMemo(() => {
    return getContentTypeTerminology(storyContext.contentType);
  }, [storyContext.contentType]);

  // Library View State (using hook)
  const {
    libraryViewMode,
    setLibraryViewMode,
    librarySortBy,
    setLibrarySortBy,
    librarySortOrder,
    setLibrarySortOrder,
    librarySearchTerm,
    setLibrarySearchTerm,
    showAdvancedSearch,
    setShowAdvancedSearch,
    libraryFilterGenre,
    setLibraryFilterGenre,
    libraryFilterTags,
    setLibraryFilterTags,
    libraryFilterHasCover,
    setLibraryFilterHasCover,
    libraryFilterSceneCount,
    setLibraryFilterSceneCount,
    libraryFilterFavorites,
    setLibraryFilterFavorites,
    libraryFilterContentType,
    setLibraryFilterContentType,
    libraryCardSize,
    setLibraryCardSize,
    filterPresets,
    setFilterPresets,
    libraryBatchMode,
    setLibraryBatchMode,
    selectedLibraryProjectIds,
    setSelectedLibraryProjectIds,
    showFilterPresetsDropdown,
    setShowFilterPresetsDropdown
  } = useLibraryState();

  // All state above is now managed by useAppState hook

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
  const { toasts, showToast, removeToast } = useToast();

  // All sharing and modal state is now managed by useAppState hook

  // Compute filtered and sorted projects (memoized for performance)
  const filteredProjects = useMemo(() => {
    const filterCriteria = {
      searchTerm: librarySearchTerm,
      genre: libraryFilterGenre,
      tags: libraryFilterTags,
      hasCover: libraryFilterHasCover,
      sceneCount: libraryFilterSceneCount,
      favorites: libraryFilterFavorites,
      contentType: libraryFilterContentType,
    };

    const filtered = projects.filter(p => matchesFilters(p, filterCriteria, favoritedProjects));

    // Sort projects
    return [...filtered].sort((a, b) => {
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
          comparison = bFavorited - aFavorited;
          break;
        case 'updated':
        case 'date':
        default:
          comparison = a.context.lastUpdated - b.context.lastUpdated;
          break;
      }

      return librarySortOrder === 'asc' ? comparison : -comparison;
    });
  }, [projects, librarySearchTerm, libraryFilterGenre, libraryFilterHasCover, libraryFilterSceneCount, libraryFilterFavorites, libraryFilterContentType, librarySortBy, librarySortOrder, favoritedProjects]);

  // Undo/Redo state is now managed by useAppState hook

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

  // Use the hook's logout directly (it does a hard reload which resets everything)
  // If additional cleanup is needed before reload, it can be added here

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
        scenes: Array.isArray(scenes) ? [...scenes] : [],
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
          ? `Library Shortcuts:\n\nCtrl+F - Advanced search\nCtrl+N - New project\nCtrl+A - Select all (in batch mode)\nCtrl+/ - Show this help\nEsc - Close modals\n\nStudio Shortcuts:\nCtrl+S - Save project\nCtrl+E - Export menu\nCtrl+N - Focus new scene input\nCtrl+C - Comments panel\nCtrl+↑/↓ - Move scene up/down\nCtrl+Z - Undo\nCtrl+Shift+Z / Ctrl+Y - Redo`
          : `Keyboard Shortcuts:\n\nCtrl+S - Save project\nCtrl+E - Export menu\nCtrl+N - Focus new scene input\nCtrl+C - Comments panel\nCtrl+F - Advanced search\nCtrl+↑/↓ - Move scene up/down\nCtrl+Z - Undo\nCtrl+Shift+Z / Ctrl+Y - Redo\nCtrl+/ - Show this help\nEsc - Close modals`;
        alert(shortcuts);
      }

      // Ctrl/Cmd + A - Select all (in batch mode)
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && view === 'library' && libraryBatchMode) {
        e.preventDefault();
        // Select all filtered projects
        const filteredIds = new Set(
          projects
            .filter(p => {
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
              if (libraryFilterGenre && !p.context.genre?.toLowerCase().includes(libraryFilterGenre.toLowerCase())) return false;
              if (libraryFilterHasCover !== null) {
                const hasCover = !!p.context.coverImageUrl;
                if (libraryFilterHasCover !== hasCover) return false;
              }
              if (libraryFilterSceneCount) {
                const sceneCount = p.scenes.length;
                if (libraryFilterSceneCount.min !== undefined && sceneCount < libraryFilterSceneCount.min) return false;
                if (libraryFilterSceneCount.max !== undefined && sceneCount > libraryFilterSceneCount.max) return false;
              }
              if (libraryFilterFavorites !== null) {
                const isFavorited = favoritedProjects.has(p.context.id);
                if (libraryFilterFavorites !== isFavorited) return false;
              }
              return true;
            })
            .map(p => p.context.id)
        );
        setSelectedLibraryProjectIds(filteredIds);
        return;
      }

      // Escape - Close modals
      if (e.key === 'Escape') {
        setShowFilterPresetsDropdown(false);
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
  }, [view, storyContext.id, showExportMenu, libraryBatchMode, projects, librarySearchTerm, libraryFilterGenre, libraryFilterHasCover, libraryFilterSceneCount, libraryFilterFavorites, favoritedProjects]);

  // Data Loading
  const { loadLibrary, loadFavorites, loadNotifications } = useDataLoading({
    isAuthenticated,
    setProjects,
    setFavoritedProjects: (projects: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      if (typeof projects === 'function') {
        setFavoritedProjects(projects);
      } else {
        setFavoritedProjects(projects);
      }
    },
    setNotifications,
    setUnreadNotificationCount
  });

  // Project Operations
  const {
    handleOpenProject,
    handleDuplicateProject,
    handleArchiveProject,
    handleDeleteProject,
    handleCreateNew,
    handleContentTypeSelect,
    handleTemplateSelect,
    handleSaveAsTemplate: handleSaveAsTemplateHook,
    handleImportProject
  } = useProjectOperations({
    setStoryContext,
    setScenes,
    setCurrentSettings,
    setView,
    setSetupTab,
    setProjects,
    loadLibrary,
    showToast,
    setShowContentTypeSelector,
    setSelectedContentType
  });
  
  // Wrapper for handleSaveAsTemplate to use hook function
  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) {
      showToast('Please enter a template name', 'warning');
      return;
    }
    const success = await handleSaveAsTemplateHook(templateName, storyContext, currentSettings);
    if (success) {
      setShowSaveTemplateModal(false);
      setTemplateName('');
    }
  };
  
  // Wrapper for handleImportClick to use handleImportProject
  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImportProject(file);
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Scene Operations
  const {
    handleGenerateScene,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleSceneReorder,
    handleToggleSceneSelection,
    handleSelectAll,
    handleBulkDelete,
    handleBulkStatusUpdate,
    handleBulkTagAssignment,
    handleDuplicateScene,
    handleAutoSuggestSettings,
    handleClearSettings,
    handleSceneContextMenu,
    isAutoFilling: isAutoFillingScene
  } = useSceneOperations({
    scenes,
    setScenes,
    storyContext,
    setStoryContext,
    currentSettings,
    setCurrentSettings,
    currentInput,
    setCurrentInput,
    setIsProcessing,
    setSaveStatus,
    batchMode,
    selectedSceneIds,
    setSelectedSceneIds,
    draggedSceneIndex,
    setDraggedSceneIndex,
    dragOverIndex,
    setDragOverIndex,
    view,
    showToast,
    setQuickActionsMenu
  });

  // Export Operations
  const {
    getExportData,
    handleExport,
    handleExportSelectedScenes: handleExportSelectedScenesHook,
    addExportToQueue,
    processExportQueue,
    cancelExportJob,
    retryExportJob,
    clearCompletedExports,
    checkComicExists,
    handleCoverImageSelect,
    handleRegenerateComic
  } = useExportOperations({
    scenes,
    storyContext,
    currentSettings,
    selectedSceneIds,
    exportQueue,
    setExportQueue,
    processingJobId,
    setProcessingJobId,
    showCoverImageSelector,
    setShowCoverImageSelector,
    selectedCoverImageId,
    setSelectedCoverImageId,
    setShowExportMenu,
    comicExists,
    setComicExists,
    isRegeneratingComic,
    setIsRegeneratingComic,
    showToast
  });

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

  // Project operations are now handled by useProjectOperations hook (see above)

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

  // Export operations are now handled by useExportOperations hook (see above)
  
  // Load tags when project is loaded
  useEffect(() => {
    if (view === 'studio' && storyContext.id) {
      loadTags();
      checkComicExists();
    }
  }, [view, storyContext.id]);

  // Load notifications on mount and connect to SSE stream
  useEffect(() => {
    if (isAuthenticated) {
      // Initial load
      loadNotifications();
      
      // Connect to SSE stream for real-time notifications
      const connectionId = `notifications-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const token = localStorage.getItem('auth_token');
      const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
      const eventSource = new EventSource(`${API_BASE_URL}/activity/notifications/stream?token=${token}`);
      
      eventSource.addEventListener('notifications', (e) => {
        try {
          const data = JSON.parse(e.data);
          setNotifications(data.notifications || []);
          setUnreadNotificationCount(data.unread_count || 0);
        } catch (error) {
          console.error('Error parsing notifications:', error);
        }
      });
      
      eventSource.addEventListener('new_notification', (e) => {
        try {
          const notification = JSON.parse(e.data);
          setNotifications(prev => [notification, ...prev]);
          setUnreadNotificationCount(prev => prev + 1);
        } catch (error) {
          console.error('Error parsing new notification:', error);
        }
      });
      
      eventSource.addEventListener('unread_count', (e) => {
        try {
          const data = JSON.parse(e.data);
          setUnreadNotificationCount(data.count || 0);
        } catch (error) {
          console.error('Error parsing unread count:', error);
        }
      });
      
      eventSource.addEventListener('notification_deleted', (e) => {
        try {
          const data = JSON.parse(e.data);
          setNotifications(prev => prev.filter(n => n.id !== data.notificationId));
        } catch (error) {
          console.error('Error parsing notification deleted:', error);
        }
      });
      
      eventSource.onerror = (error) => {
        console.error('Notifications SSE error:', error);
        // Fallback to polling if SSE fails
        const interval = setInterval(() => {
          loadNotifications();
        }, 30000);
        return () => {
          clearInterval(interval);
          eventSource.close();
        };
      };
      
      return () => {
        eventSource.close();
      };
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

  // Scene operations are now handled by useSceneOperations hook (see above)
  
  // Removed duplicate functions: handleDragStart, handleDragOver, handleDragLeave, handleDrop, 
  // handleSceneReorder, handleToggleSceneSelection, handleSelectAll, handleBulkDelete,
  // handleBulkStatusUpdate, handleBulkTagAssignment, handleDuplicateScene, handleAutoSuggestSettings,
  // handleClearSettings, handleSceneContextMenu, handleGenerateScene

  // Use handleExportSelectedScenes from useExportOperations hook
  const handleExportSelectedScenes = handleExportSelectedScenesHook;

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

  // Removed duplicate functions: handleAutoSuggestSettings, handleClearSettings, 
  // handleSceneContextMenu, handleDuplicateScene (now from useSceneOperations hook)

  // Additional scene handlers for QuickActionsMenu
  const handleCopySceneSettings = (scene: Scene) => {
    setSourceSceneForCopy(scene);
    setShowCopySettingsModal(true);
  };

  const handleApplyCopiedSettings = async (targetSceneIds: string[], settings: DirectorSettings) => {
    if (!sourceSceneForCopy) return;
    const updatedScenes = scenes.map(scene => {
      if (targetSceneIds.includes(scene.id)) {
        // Merge the copied settings with existing scene settings
        return { ...scene, directorSettings: { ...scene.directorSettings, ...settings } };
      }
      return scene;
    });

    setScenes(updatedScenes);
    setShowCopySettingsModal(false);
    setSourceSceneForCopy(null);
    showToast('Settings copied successfully!', 'success');

    try {
      const updatedContext = { ...storyContext, lastUpdated: Date.now() };
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
    } catch (error) {
      console.error('Failed to save copied settings:', error);
      showToast('Failed to save copied settings', 'error');
    }
  };

  const handleEditScene = (scene: Scene) => {
    // Open scene editor - this would typically open a modal or navigate to edit view
    // For now, we'll just set the current input to the scene's raw idea
    setCurrentInput(scene.rawIdea);
    if (scene.directorSettings) {
      setCurrentSettings(scene.directorSettings);
    }
    showToast('Scene loaded for editing', 'info');
  };

  const handleExportScene = async (scene: Scene, format: 'json' | 'markdown' | 'csv' | 'pdf' | 'fountain') => {
    // Export single scene
      const exportData: any = {
        context: storyContext,
      scenes: [scene],
        settings: currentSettings,
      };

    try {
      switch (format) {
        case 'json':
          const jsonStr = JSON.stringify(exportData, null, 2);
          const jsonBlob = new Blob([jsonStr], { type: 'application/json' });
          const jsonUrl = URL.createObjectURL(jsonBlob);
          const jsonA = document.createElement('a');
          jsonA.href = jsonUrl;
          jsonA.download = `${storyContext.title || 'project'}-scene-${scene.sequenceNumber}.json`;
          jsonA.click();
          URL.revokeObjectURL(jsonUrl);
          break;
        case 'markdown':
          const { exportToMarkdown } = await import('./utils/exportUtils');
          const markdownContent = exportToMarkdown(exportData);
          const markdownBlob = new Blob([markdownContent], { type: 'text/markdown' });
          const markdownUrl = URL.createObjectURL(markdownBlob);
          const markdownA = document.createElement('a');
          markdownA.href = markdownUrl;
          markdownA.download = `${storyContext.title || 'project'}-scene-${scene.sequenceNumber}.md`;
          markdownA.click();
          URL.revokeObjectURL(markdownUrl);
          break;
        case 'csv':
          const { exportToCSV } = await import('./utils/exportUtils');
          const csvContent = exportToCSV(exportData);
          const csvBlob = new Blob([csvContent], { type: 'text/csv' });
          const csvUrl = URL.createObjectURL(csvBlob);
          const csvA = document.createElement('a');
          csvA.href = csvUrl;
          csvA.download = `${storyContext.title || 'project'}-scene-${scene.sequenceNumber}.csv`;
          csvA.click();
          URL.revokeObjectURL(csvUrl);
          break;
        case 'pdf':
          const { exportToPDF } = await import('./utils/exportUtils');
          await exportToPDF(exportData, 'comic');
          break;
        case 'fountain':
          const { exportToFountain } = await import('./utils/exportUtils');
          const fountainContent = exportToFountain(exportData);
          const fountainBlob = new Blob([fountainContent], { type: 'text/plain' });
          const fountainUrl = URL.createObjectURL(fountainBlob);
          const fountainA = document.createElement('a');
          fountainA.href = fountainUrl;
          fountainA.download = `${storyContext.title || 'project'}-scene-${scene.sequenceNumber}.fountain`;
          fountainA.click();
          URL.revokeObjectURL(fountainUrl);
          break;
      }
      showToast(`Scene exported as ${format.toUpperCase()}`, 'success');
    } catch (error: any) {
      showToast(`Failed to export scene: ${error.message}`, 'error');
    }
  };

  // Removed duplicate handleCopySceneSettings - already defined above

  const handleAutoDraft = async () => {
      setIsAutoFilling(true);
    try {
      // Pass the last 5 scenes for better continuity awareness
      const recentHistory = scenes.slice(-5);
      const idea = await suggestNextScene(storyContext, recentHistory);
      setCurrentInput(idea);
    } catch (error: any) {
      console.error("Error auto-drafting scene:", error);
      showToast(`Failed to generate idea: ${error.message || 'Please check your Gemini API key and ensure the Generative Language API is enabled in Google Cloud Console.'}`, 'error');
    } finally {
      setIsAutoFilling(false);
    }
  };

  // Removed handleGenerateScene - now from useSceneOperations hook

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
      <>
        {showContentTypeSelector && (
          <ContentTypeSelector
            onSelect={handleContentTypeSelect}
            onClose={() => setShowContentTypeSelector(false)}
          />
        )}
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
        {showSettingsPanel && (
          <div className="fixed inset-0 z-[100]">
            <SettingsPanel
              onClose={() => setShowSettingsPanel(false)}
              theme={theme}
              onThemeChange={setTheme}
            />
          </div>
        )}
        <LibraryView
        currentUser={currentUser}
        projects={projects}
        favoritedProjects={favoritedProjects}
        setFavoritedProjects={setFavoritedProjects}
        setView={setView}
        handleLogout={handleLogout}
        handleOpenProject={handleOpenProject}
        handleDuplicateProject={handleDuplicateProject}
        handleArchiveProject={handleArchiveProject}
        handleDeleteProject={handleDeleteProject}
        handleCreateNew={handleCreateNew}
        handleImportClick={handleImportClick}
        handleFileChange={handleFileChange}
        fileInputRef={fileInputRef}
        theme={theme}
        setTheme={setTheme}
        loadNotifications={loadNotifications}
        setShowNotificationCenter={setShowNotificationCenter}
        unreadNotificationCount={unreadNotificationCount}
        setShowSettingsPanel={setShowSettingsPanel}
        availableTags={availableTags}
        showToast={showToast}
        setShowBulkTagAssigner={setShowBulkTagAssigner}
        batchGeneratingCovers={batchGeneratingCovers}
        setBatchGeneratingCovers={setBatchGeneratingCovers}
        setProjectQuickActions={setProjectQuickActions}
        setSelectedProjectForSharing={setSelectedProjectForSharing}
        setShowSharingModal={setShowSharingModal}
        setProjects={setProjects}
        />
      </>
    );
  }

  // OLD LIBRARY VIEW CODE REMOVED - now in modules/LibraryView.tsx
  // Removed ~975 lines of duplicate library view JSX

  if (view === 'setup') {
    return (
      <SetupView
        storyContext={storyContext}
        setStoryContext={setStoryContext}
        setupTab={setupTab}
        setSetupTab={setSetupTab}
        storySeed={storySeed}
        setStorySeed={setStorySeed}
        isAutoFilling={isAutoFilling}
        setIsAutoFilling={setIsAutoFilling}
        handleExitToLibrary={handleExitToLibrary}
        finalizeSetup={finalizeSetup}
        showToast={showToast}
        showSceneTemplates={showSceneTemplates}
        setShowSceneTemplates={setShowSceneTemplates}
        sceneTemplates={sceneTemplates}
        setSceneTemplates={setSceneTemplates}
      />
    );
  }

  // --- Studio UI (view === 'studio') ---
  // Studio view extracted to modules/StudioView.tsx
  return (
    <>
      <StudioView
    // State
    currentUser={currentUser}
    storyContext={storyContext}
    setStoryContext={setStoryContext}
    scenes={scenes}
    setScenes={setScenes}
    currentSettings={currentSettings}
    setCurrentSettings={setCurrentSettings}
    studioViewMode={studioViewMode}
    setStudioViewMode={setStudioViewMode}
    isProcessing={isProcessing}
    isAutoFilling={isAutoFilling}
    saveStatus={saveStatus}
    lastSavedTime={lastSavedTime}
    currentInput={currentInput}
    setCurrentInput={setCurrentInput}
    showExportMenu={showExportMenu}
    setShowExportMenu={setShowExportMenu}
    availableTags={availableTags}
    showTagsMenu={showTagsMenu}
    setShowTagsMenu={setShowTagsMenu}
    comicExists={comicExists}
    isRegeneratingComic={isRegeneratingComic}
    showCoverImageSelector={showCoverImageSelector}
    selectedCoverImageId={selectedCoverImageId}
    draggedSceneIndex={draggedSceneIndex}
    setDraggedSceneIndex={setDraggedSceneIndex}
    batchMode={batchMode}
    setBatchMode={setBatchMode}
    selectedSceneIds={selectedSceneIds}
    setSelectedSceneIds={setSelectedSceneIds}
    dragOverIndex={dragOverIndex}
    setDragOverIndex={setDragOverIndex}
    showCommentsPanel={showCommentsPanel}
    setShowCommentsPanel={setShowCommentsPanel}
    showSceneNotesPanel={showSceneNotesPanel}
    setShowSceneNotesPanel={setShowSceneNotesPanel}
    selectedSceneId={selectedSceneId}
    setSelectedSceneId={setSelectedSceneId}
    showTemplateSelector={showTemplateSelector}
    setShowTemplateSelector={setShowTemplateSelector}
    showSaveTemplateModal={showSaveTemplateModal}
    setShowSaveTemplateModal={setShowSaveTemplateModal}
    templateName={templateName}
    setTemplateName={setTemplateName}
    showContentTypeSelector={showContentTypeSelector}
    setShowContentTypeSelector={setShowContentTypeSelector}
    showCharactersPanel={showCharactersPanel}
    setShowCharactersPanel={setShowCharactersPanel}
    showLocationsPanel={showLocationsPanel}
    setShowLocationsPanel={setShowLocationsPanel}
    showAnalyticsPanel={showAnalyticsPanel}
    setShowAnalyticsPanel={setShowAnalyticsPanel}
    showAdvancedAnalytics={showAdvancedAnalytics}
    setShowAdvancedAnalytics={setShowAdvancedAnalytics}
    showProjectStatisticsPanel={showProjectStatisticsPanel}
    setShowProjectStatisticsPanel={setShowProjectStatisticsPanel}
    showScenePreviewModal={showScenePreviewModal}
    setShowScenePreviewModal={setShowScenePreviewModal}
    previewSceneIndex={previewSceneIndex}
    setPreviewSceneIndex={setPreviewSceneIndex}
    showStoryboardPlayback={showStoryboardPlayback}
    setShowStoryboardPlayback={setShowStoryboardPlayback}
    showAdvancedSearchPanel={showAdvancedSearchPanel}
    setShowAdvancedSearchPanel={setShowAdvancedSearchPanel}
    showAIStoryAnalysis={showAIStoryAnalysis}
    setShowAIStoryAnalysis={setShowAIStoryAnalysis}
    showShotListGenerator={showShotListGenerator}
    setShowShotListGenerator={setShowShotListGenerator}
    showShootingSchedule={showShootingSchedule}
    setShowShootingSchedule={setShowShootingSchedule}
    showCallSheet={showCallSheet}
    setShowCallSheet={setShowCallSheet}
    callSheetDay={callSheetDay}
    setCallSheetDay={setCallSheetDay}
    showBudgetEstimator={showBudgetEstimator}
    setShowBudgetEstimator={setShowBudgetEstimator}
    showVideoExport={showVideoExport}
    setShowVideoExport={setShowVideoExport}
    showSceneComparison={showSceneComparison}
    setShowSceneComparison={setShowSceneComparison}
    showCharacterGraph={showCharacterGraph}
    setShowCharacterGraph={setShowCharacterGraph}
    showVersionHistory={showVersionHistory}
    setShowVersionHistory={setShowVersionHistory}
    showProjectHealth={showProjectHealth}
    setShowProjectHealth={setShowProjectHealth}
    quickActionsMenu={quickActionsMenu}
    setQuickActionsMenu={setQuickActionsMenu}
    showCopySettingsModal={showCopySettingsModal}
    setShowCopySettingsModal={setShowCopySettingsModal}
    sourceSceneForCopy={sourceSceneForCopy}
    setSourceSceneForCopy={setSourceSceneForCopy}
    showExportPresets={showExportPresets}
    setShowExportPresets={setShowExportPresets}
    showAISceneSuggestions={showAISceneSuggestions}
    setShowAISceneSuggestions={setShowAISceneSuggestions}
    showStoryArcVisualizer={showStoryArcVisualizer}
    setShowStoryArcVisualizer={setShowStoryArcVisualizer}
    projectQuickActions={projectQuickActions}
    setProjectQuickActions={setProjectQuickActions}
    showCoverImageManager={showCoverImageManager}
    setShowCoverImageManager={setShowCoverImageManager}
    coverImageProjectId={coverImageProjectId}
    setCoverImageProjectId={setCoverImageProjectId}
    coverImageProjectUrl={coverImageProjectUrl}
    setCoverImageProjectUrl={setCoverImageProjectUrl}
    showSceneBookmarks={showSceneBookmarks}
    setShowSceneBookmarks={setShowSceneBookmarks}
    showExportQueue={showExportQueue}
    setShowExportQueue={setShowExportQueue}
    exportQueue={exportQueue}
    setExportQueue={setExportQueue}
    showSceneDependencyTracker={showSceneDependencyTracker}
    setShowSceneDependencyTracker={setShowSceneDependencyTracker}
    showSceneTemplates={showSceneTemplates}
    setShowSceneTemplates={setShowSceneTemplates}
    sceneTemplates={sceneTemplates}
    setSceneTemplates={setSceneTemplates}
    sceneTemplateName={sceneTemplateName}
    setSceneTemplateName={setSceneTemplateName}
    showSaveSceneTemplateModal={showSaveSceneTemplateModal}
    setShowSaveSceneTemplateModal={setShowSaveSceneTemplateModal}
    showTemplatesLibrary={showTemplatesLibrary}
    setShowTemplatesLibrary={setShowTemplatesLibrary}
    showSharingModal={showSharingModal}
    setShowSharingModal={setShowSharingModal}
    selectedProjectForSharing={selectedProjectForSharing}
    setSelectedProjectForSharing={setSelectedProjectForSharing}
    showExportHistoryPanel={showExportHistoryPanel}
    setShowExportHistoryPanel={setShowExportHistoryPanel}
    showCommandPalette={showCommandPalette}
    setShowCommandPalette={setShowCommandPalette}
    commandPaletteQuery={commandPaletteQuery}
    setCommandPaletteQuery={setCommandPaletteQuery}
    projects={projects}
    setView={setView}
    // Handlers
    handleExitToLibrary={handleExitToLibrary}
    handleManualSave={handleManualSave}
    handleGenerateScene={handleGenerateScene}
    handleAutoDraft={handleAutoDraft}
    handleExport={handleExport}
    handleExportSelectedScenes={handleExportSelectedScenes}
    addExportToQueue={addExportToQueue}
    cancelExportJob={cancelExportJob}
    retryExportJob={retryExportJob}
    clearCompletedExports={clearCompletedExports}
    handleAddTag={handleAddTag}
    handleRemoveTag={handleRemoveTag}
    handleSelectSceneTemplate={handleSelectSceneTemplate}
    handleSaveCurrentAsSceneTemplate={handleSaveCurrentAsSceneTemplate}
    handleCopySceneSettings={handleCopySceneSettings}
    handleApplyCopiedSettings={handleApplyCopiedSettings}
    handleEditScene={handleEditScene}
    handleExportScene={handleExportScene}
    handleDragStart={handleDragStart}
    handleDragOver={handleDragOver}
    handleDragLeave={handleDragLeave}
    handleDrop={handleDrop}
    handleSceneReorder={handleSceneReorder}
    handleToggleSceneSelection={handleToggleSceneSelection}
    handleSelectAll={handleSelectAll}
    handleBulkDelete={handleBulkDelete}
    handleBulkStatusUpdate={handleBulkStatusUpdate}
    handleBulkTagAssignment={handleBulkTagAssignment}
    handleDuplicateScene={handleDuplicateScene}
    handleAutoSuggestSettings={handleAutoSuggestSettings}
    handleClearSettings={handleClearSettings}
    handleSceneContextMenu={handleSceneContextMenu}
    handleCoverImageSelect={handleCoverImageSelect}
    handleRegenerateComic={handleRegenerateComic}
    handleOpenProject={handleOpenProject}
    handleDuplicateProject={handleDuplicateProject}
    handleDeleteProject={handleDeleteProject}
    handleSaveAsTemplate={handleSaveAsTemplate}
    handleTemplateSelect={handleTemplateSelect}
    handleContentTypeSelect={handleContentTypeSelect}
    handleUndo={handleUndo}
    handleRedo={handleRedo}
    history={history}
    historyIndex={historyIndex}
    showToast={showToast}
    exportMenuRef={exportMenuRef}
    bottomRef={bottomRef}
    contentTypeTerminology={contentTypeTerminology}
    toasts={toasts}
    removeToast={removeToast}
    theme={theme}
    setTheme={setTheme}
    notifications={notifications}
    unreadNotificationCount={unreadNotificationCount}
    showActivityPanel={showActivityPanel}
    setShowActivityPanel={setShowActivityPanel}
    showSettingsPanel={showSettingsPanel}
    setShowSettingsPanel={setShowSettingsPanel}
    showNotificationCenter={showNotificationCenter}
    setShowNotificationCenter={setShowNotificationCenter}
    handleMarkNotificationRead={handleMarkNotificationRead}
    handleMarkAllNotificationsRead={handleMarkAllNotificationsRead}
    handleDeleteNotification={handleDeleteNotification}
    loadNotifications={loadNotifications}
    setupTab={setupTab}
    setSetupTab={setSetupTab}
    setProjects={setProjects}
  />
  
  {/* Save Progress Modal (SSE) */}
  <SaveProgressModal
    connectionId={saveConnectionId}
    onComplete={() => {
      setSaveConnectionId(null);
      setSaveStatus('saved');
      setLastSavedTime(new Date());
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }}
    onError={(error) => {
      setSaveConnectionId(null);
      setSaveStatus('error');
      showToast(`Save failed: ${error}`, 'error');
      setTimeout(() => {
        setSaveStatus('idle');
      }, 2000);
    }}
  />
  </>
  );
};

export default App;
