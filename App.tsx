
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
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
import LibraryView from './modules/LibraryView';
import SetupView from './modules/SetupView';
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
          exportToMarkdown(exportData, `${storyContext.title || 'project'}-scene-${scene.sequenceNumber}`);
          break;
        case 'csv':
          const { exportToCSV } = await import('./utils/exportUtils');
          exportToCSV(exportData, `${storyContext.title || 'project'}-scene-${scene.sequenceNumber}`);
          break;
        case 'pdf':
          const { exportToPDF } = await import('./utils/exportUtils');
          await exportToPDF(exportData, `${storyContext.title || 'project'}-scene-${scene.sequenceNumber}`);
          break;
        case 'fountain':
          const { exportToFountain } = await import('./utils/exportUtils');
          exportToFountain(exportData, `${storyContext.title || 'project'}-scene-${scene.sequenceNumber}`);
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
            {storyContext.contentType && (
              <span className={`text-xs px-2 py-0.5 rounded border flex items-center gap-1 ${getContentTypeBadgeClass(storyContext.contentType)}`}>
                <span>{getContentTypeInfo(storyContext.contentType).icon}</span>
                <span>{getContentTypeInfo(storyContext.contentType).name}</span>
              </span>
            )}
          </div>
        </div>
          <div className="text-xs text-zinc-400 sm:hidden truncate max-w-[150px]">{storyContext.title}</div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap w-full sm:w-auto justify-end">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              flushSync(() => {
                setView('dashboard');
              });
            }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => {
                  setShowExportMenu(prev => !prev);
                });
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => {
                  setShowCharactersPanel(prev => !prev);
                });
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => {
                  setShowLocationsPanel(prev => !prev);
                });
              }}
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
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  flushSync(() => setShowAdvancedAnalytics(true));
                }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setShowAIStoryAnalysis(true));
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setShowShotListGenerator(true));
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setShowShootingSchedule(true));
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setShowBudgetEstimator(true));
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setShowVideoExport(true));
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setShowSceneComparison(true));
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setShowCharacterGraph(true));
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setShowVersionHistory(true));
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setShowProjectHealth(true));
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setShowAISceneSuggestions(true));
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setShowStoryArcVisualizer(true));
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setShowSceneBookmarks(true));
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setShowSceneDependencyTracker(true));
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setShowExportHistoryPanel(true));
              }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setShowExportQueue(true));
              }}
              className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1 relative"
              title="Export Queue"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Queue</span>
              {getStatusesCount(exportQueue, ['queued', 'processing']) > 0 && (
                <span className="absolute -top-1 -right-1 bg-amber-600 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                  {getStatusesCount(exportQueue, ['queued', 'processing'])}
                </span>
              )}
            </button>
          )}

          {/* Storyboard Playback Button */}
          {view === 'studio' && scenes.length > 0 && (
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setShowStoryboardPlayback(true));
              }}
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
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              flushSync(() => setShowAdvancedSearchPanel(true));
            }}
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setShowCommentsPanel(true));
              }}
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
                      {selectedSceneIds.size} {contentTypeTerminology.scene.toLowerCase()}{selectedSceneIds.size > 1 ? 's' : ''} selected
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
                        ? `Ready to continue. The Director AI knows the context of your previous ${contentTypeTerminology.scene.toLowerCase()}. Describe the next ${contentTypeTerminology.scene.toLowerCase()} below.` 
                        : `Describe the opening ${contentTypeTerminology.scene.toLowerCase()} below.`}
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
                            const API_BASE_URL = getApiBaseUrl();
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
                            showToast(`${contentTypeTerminology.scene} deleted successfully`, 'success');
                          } catch (error: any) {
                            showToast(`Failed to delete ${contentTypeTerminology.scene.toLowerCase()}`, 'error');
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
          onClose={() => {
            flushSync(() => setShowCharactersPanel(false));
          }}
        />
      )}

      {/* Locations Panel */}
      {showLocationsPanel && storyContext.id && (
        <LocationsPanel
          projectId={storyContext.id}
          storyContext={storyContext}
          scenes={scenes}
          onClose={() => {
            flushSync(() => setShowLocationsPanel(false));
          }}
        />
      )}

      {/* Analytics Panel */}
      {showAnalyticsPanel && storyContext.id && (
        <AnalyticsPanel
          projectId={storyContext.id}
          onClose={() => {
            flushSync(() => setShowAnalyticsPanel(false));
          }}
        />
      )}

      {/* Advanced Analytics Dashboard */}
      {showAdvancedAnalytics && storyContext.id && scenes.length > 0 && (
        <AdvancedAnalyticsDashboard
          projectId={storyContext.id}
          scenes={scenes}
          storyContext={storyContext}
          onClose={() => {
            flushSync(() => setShowAdvancedAnalytics(false));
          }}
        />
      )}

      {/* Project Statistics Panel */}
      {showProjectStatisticsPanel && storyContext.id && (
        <ProjectStatisticsPanel
          projectId={storyContext.id}
          scenes={scenes}
          onClose={() => {
            flushSync(() => setShowProjectStatisticsPanel(false));
          }}
        />
      )}

      {/* Export History Panel */}
      {showExportHistoryPanel && (
        <ExportHistoryPanel
          onClose={() => {
            flushSync(() => setShowExportHistoryPanel(false));
          }}
        />
      )}

      {/* Export Queue Panel */}
      {showExportQueue && (
        <ExportQueuePanel
          isOpen={showExportQueue}
          onClose={() => {
            flushSync(() => setShowExportQueue(false));
          }}
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
          onClose={() => {
            flushSync(() => setShowAIStoryAnalysis(false));
          }}
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
          onClose={() => {
            flushSync(() => setShowShotListGenerator(false));
          }}
        />
      )}

      {/* Shooting Schedule Generator */}
      {showShootingSchedule && storyContext.id && (
        <ShootingScheduleGenerator
          scenes={scenes}
          projectId={storyContext.id}
          storyContext={storyContext}
          onClose={() => {
            flushSync(() => setShowShootingSchedule(false));
          }}
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
          onClose={() => {
            flushSync(() => setShowBudgetEstimator(false));
          }}
        />
      )}

      {/* Video Slideshow Export */}
      {showVideoExport && storyContext.id && (
        <VideoSlideshowExport
          scenes={scenes}
          projectId={storyContext.id}
          onClose={() => {
            flushSync(() => setShowVideoExport(false));
          }}
        />
      )}

      {/* Scene Comparison View */}
      {showSceneComparison && storyContext.id && scenes.length > 0 && (
        <SceneComparisonView
          scenes={scenes}
          projectId={storyContext.id}
          onClose={() => {
            flushSync(() => setShowSceneComparison(false));
          }}
        />
      )}

      {/* Character Relationship Graph */}
      {showCharacterGraph && storyContext.id && scenes.length > 0 && (
        <CharacterRelationshipGraph
          scenes={scenes}
          projectId={storyContext.id}
          storyContext={storyContext}
          onClose={() => {
            flushSync(() => setShowCharacterGraph(false));
          }}
        />
      )}

      {/* Version History Panel */}
      {showVersionHistory && storyContext.id && (
        <VersionHistoryPanel
          projectId={storyContext.id}
          currentContext={storyContext}
          currentScenes={scenes}
          currentSettings={currentSettings}
          onClose={() => {
            flushSync(() => setShowVersionHistory(false));
          }}
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
          onClose={() => {
            flushSync(() => setShowProjectHealth(false));
          }}
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

              showToast(`${contentTypeTerminology.scene} deleted successfully`, 'success');
            } catch (error: any) {
              showToast(`Failed to delete ${contentTypeTerminology.scene.toLowerCase()}`, 'error');
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
          onClose={() => {
            flushSync(() => setShowAISceneSuggestions(false));
          }}
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
          onClose={() => {
            flushSync(() => setShowStoryArcVisualizer(false));
          }}
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
              await reloadProjects(apiService, setProjects);
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
          onClose={() => {
            flushSync(() => setShowSceneDependencyTracker(false));
          }}
        />
      )}

      {/* Scene Bookmarks Panel */}
      {showSceneBookmarks && storyContext.id && scenes.length > 0 && (
        <SceneBookmarksPanel
          projectId={storyContext.id}
          scenes={scenes}
          onClose={() => {
            flushSync(() => setShowSceneBookmarks(false));
          }}
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
          onClose={() => {
            flushSync(() => setShowExportPresets(false));
          }}
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

      {/* Content Type Selector */}
      {showContentTypeSelector && (
        <ContentTypeSelector
          onSelect={handleContentTypeSelect}
          onClose={() => {
            flushSync(() => {
              setShowContentTypeSelector(false);
            });
          }}
        />
      )}

      {/* Project Templates Library */}
      {showTemplatesLibrary && (
        <ProjectTemplatesLibrary
          onClose={() => {
            flushSync(() => setShowTemplatesLibrary(false));
          }}
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

            const templateName = promptText('Enter template name:');
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
          onClose={() => {
            flushSync(() => setShowAdvancedSearchPanel(false));
          }}
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
          onClose={() => {
            flushSync(() => setShowSceneTemplates(false));
          }}
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
            onClose={() => {
              flushSync(() => setShowActivityPanel(false));
            }}
          />
        </div>
      )}

      {/* Notification Center */}
      {showNotificationCenter && (
        <NotificationCenter
          isOpen={showNotificationCenter}
          onClose={() => {
            flushSync(() => setShowNotificationCenter(false));
          }}
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
            onClose={() => {
              flushSync(() => setShowSettingsPanel(false));
            }}
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
            label: `New ${contentTypeTerminology.scene}`,
            description: `Create a new ${contentTypeTerminology.scene.toLowerCase()}`,
            icon: '➕',
            keywords: ['new', 'scene', 'add', contentTypeTerminology.scene.toLowerCase()],
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
          onClose={() => {
            flushSync(() => setShowCommentsPanel(false));
          }}
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
