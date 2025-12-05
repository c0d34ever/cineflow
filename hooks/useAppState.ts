import { useState, useMemo } from 'react';
import { StoryContext, DirectorSettings, Scene, ProjectData } from '../types';
import { ContentType } from '../components/ContentTypeSelector';
import { DEFAULT_CONTEXT, DEFAULT_DIRECTOR_SETTINGS } from '../utils/constants';

export const useAppState = () => {
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
  
  // Scene operations state
  const [draggedSceneIndex, setDraggedSceneIndex] = useState<number | null>(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(new Set());
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Comments & Notes
  const [showCommentsPanel, setShowCommentsPanel] = useState(false);
  const [showSceneNotesPanel, setShowSceneNotesPanel] = useState(false);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);

  // Templates
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showSaveTemplateModal, setShowSaveTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [showContentTypeSelector, setShowContentTypeSelector] = useState(false);
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null);

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

  // Sharing & Modals
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
  const [exportQueue, setExportQueue] = useState<any[]>([]);
  const [processingJobId, setProcessingJobId] = useState<string | null>(null);
  const [showSceneDependencyTracker, setShowSceneDependencyTracker] = useState(false);
  const [hoveredProjectForTooltip, setHoveredProjectForTooltip] = useState<{ project: ProjectData; position: { x: number; y: number } } | null>(null);
  const [batchGeneratingCovers, setBatchGeneratingCovers] = useState(false);
  const [showQuickTemplateCreator, setShowQuickTemplateCreator] = useState(false);
  const [templateCreatorProject, setTemplateCreatorProject] = useState<ProjectData | null>(null);
  const [showQuickTagAssigner, setShowQuickTagAssigner] = useState(false);
  const [tagAssignerProject, setTagAssignerProject] = useState<ProjectData | null>(null);
  const [favoritedProjects, setFavoritedProjects] = useState<Set<string>>(new Set());
  const [showBulkTagAssigner, setShowBulkTagAssigner] = useState(false);
  const [showQuickTemplateSelector, setShowQuickTemplateSelector] = useState(false);

  // Undo/Redo
  const [history, setHistory] = useState<ProjectData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const maxHistorySize = 50;

  // Memoize content type terminology to avoid recalculating on every render
  const contentTypeTerminology = useMemo(() => {
    // This will be computed in App.tsx where getContentTypeTerminology is available
    return null;
  }, [storyContext.contentType]);

  return {
    // View State
    view,
    setView,
    adminViewMode,
    setAdminViewMode,
    studioViewMode,
    setStudioViewMode,
    
    // Data State
    storyContext,
    setStoryContext,
    scenes,
    setScenes,
    currentSettings,
    setCurrentSettings,
    
    // UI State
    projects,
    setProjects,
    isProcessing,
    setIsProcessing,
    isAutoFilling,
    setIsAutoFilling,
    setupTab,
    setSetupTab,
    saveStatus,
    setSaveStatus,
    lastSavedTime,
    setLastSavedTime,
    autoSaveEnabled,
    setAutoSaveEnabled,
    showCommandPalette,
    setShowCommandPalette,
    commandPaletteQuery,
    setCommandPaletteQuery,
    
    // Inputs
    currentInput,
    setCurrentInput,
    storySeed,
    setStorySeed,
    
    // Export & Tags
    showExportMenu,
    setShowExportMenu,
    availableTags,
    setAvailableTags,
    projectTags,
    setProjectTags,
    showTagsMenu,
    setShowTagsMenu,
    comicExists,
    setComicExists,
    isRegeneratingComic,
    setIsRegeneratingComic,
    showCoverImageSelector,
    setShowCoverImageSelector,
    selectedCoverImageId,
    setSelectedCoverImageId,
    
    // Scene operations state
    draggedSceneIndex,
    setDraggedSceneIndex,
    batchMode,
    setBatchMode,
    selectedSceneIds,
    setSelectedSceneIds,
    dragOverIndex,
    setDragOverIndex,
    
    // Comments & Notes
    showCommentsPanel,
    setShowCommentsPanel,
    showSceneNotesPanel,
    setShowSceneNotesPanel,
    selectedSceneId,
    setSelectedSceneId,
    
    // Templates
    showTemplateSelector,
    setShowTemplateSelector,
    showSaveTemplateModal,
    setShowSaveTemplateModal,
    templateName,
    setTemplateName,
    showContentTypeSelector,
    setShowContentTypeSelector,
    selectedContentType,
    setSelectedContentType,
    
    // Characters
    showCharactersPanel,
    setShowCharactersPanel,
    
    // Locations
    showLocationsPanel,
    setShowLocationsPanel,
    
    // Analytics
    showAnalyticsPanel,
    setShowAnalyticsPanel,
    showAdvancedAnalytics,
    setShowAdvancedAnalytics,
    
    // Activity & Notifications
    showActivityPanel,
    setShowActivityPanel,
    showNotificationCenter,
    setShowNotificationCenter,
    activities,
    setActivities,
    notifications,
    setNotifications,
    unreadNotificationCount,
    setUnreadNotificationCount,
    
    // Settings
    showSettingsPanel,
    setShowSettingsPanel,
    
    // Scene Templates
    showSceneTemplates,
    setShowSceneTemplates,
    sceneTemplates,
    setSceneTemplates,
    showSaveSceneTemplateModal,
    setShowSaveSceneTemplateModal,
    sceneTemplateName,
    setSceneTemplateName,
    
    // Password reset routing
    currentHash,
    setCurrentHash,
    
    // Sharing & Modals
    showSharingModal,
    setShowSharingModal,
    showExportHistoryPanel,
    setShowExportHistoryPanel,
    showProjectStatisticsPanel,
    setShowProjectStatisticsPanel,
    showScenePreviewModal,
    setShowScenePreviewModal,
    previewSceneIndex,
    setPreviewSceneIndex,
    showStoryboardPlayback,
    setShowStoryboardPlayback,
    showAdvancedSearchPanel,
    setShowAdvancedSearchPanel,
    showTemplatesLibrary,
    setShowTemplatesLibrary,
    showAIStoryAnalysis,
    setShowAIStoryAnalysis,
    showShotListGenerator,
    setShowShotListGenerator,
    showShootingSchedule,
    setShowShootingSchedule,
    showCallSheet,
    setShowCallSheet,
    callSheetDay,
    setCallSheetDay,
    showBudgetEstimator,
    setShowBudgetEstimator,
    showVideoExport,
    setShowVideoExport,
    showSceneComparison,
    setShowSceneComparison,
    showCharacterGraph,
    setShowCharacterGraph,
    showVersionHistory,
    setShowVersionHistory,
    showProjectHealth,
    setShowProjectHealth,
    quickActionsMenu,
    setQuickActionsMenu,
    showCopySettingsModal,
    setShowCopySettingsModal,
    sourceSceneForCopy,
    setSourceSceneForCopy,
    showExportPresets,
    setShowExportPresets,
    showAISceneSuggestions,
    setShowAISceneSuggestions,
    showStoryArcVisualizer,
    setShowStoryArcVisualizer,
    selectedProjectForSharing,
    setSelectedProjectForSharing,
    projectQuickActions,
    setProjectQuickActions,
    showCoverImageManager,
    setShowCoverImageManager,
    coverImageProjectId,
    setCoverImageProjectId,
    coverImageProjectUrl,
    setCoverImageProjectUrl,
    showSceneBookmarks,
    setShowSceneBookmarks,
    showExportQueue,
    setShowExportQueue,
    exportQueue,
    setExportQueue,
    processingJobId,
    setProcessingJobId,
    showSceneDependencyTracker,
    setShowSceneDependencyTracker,
    hoveredProjectForTooltip,
    setHoveredProjectForTooltip,
    batchGeneratingCovers,
    setBatchGeneratingCovers,
    showQuickTemplateCreator,
    setShowQuickTemplateCreator,
    templateCreatorProject,
    setTemplateCreatorProject,
    showQuickTagAssigner,
    setShowQuickTagAssigner,
    tagAssignerProject,
    setTagAssignerProject,
    favoritedProjects,
    setFavoritedProjects,
    showBulkTagAssigner,
    setShowBulkTagAssigner,
    showQuickTemplateSelector,
    setShowQuickTemplateSelector,
    
    // Undo/Redo
    history,
    setHistory,
    historyIndex,
    setHistoryIndex,
    maxHistorySize,
    
    // Computed
    contentTypeTerminology,
  };
};

