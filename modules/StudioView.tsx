import React, { useState } from 'react';
import { startTransition } from 'react';
import { apiService, checkApiAvailability } from '../apiService';
import { generateScenePrompt, generateSceneImagePrompt } from '../utils/promptGenerators';
import ActivityPanel from '../components/ActivityPanel';
import AdvancedAnalyticsDashboard from '../components/AdvancedAnalyticsDashboard';
import AdvancedSearchPanel from '../components/AdvancedSearchPanel';
import AISceneSuggestionsPanel from '../components/AISceneSuggestionsPanel';
import AIStoryAnalysisPanel from '../components/AIStoryAnalysisPanel';
import AnalyticsPanel from '../components/AnalyticsPanel';
import BudgetEstimator from '../components/BudgetEstimator';
import CallSheetGenerator from '../components/CallSheetGenerator';
import CharacterRelationshipGraph from '../components/CharacterRelationshipGraph';
import CharactersPanel from '../components/CharactersPanel';
import CommandPalette from '../components/CommandPalette';
import CommentsPanel from '../components/CommentsPanel';
import ContentTypeSelector from '../components/ContentTypeSelector';
import CopySceneSettingsModal from '../components/CopySceneSettingsModal';
import CoverImageManager from '../components/CoverImageManager';
import DirectorPanel from '../components/DirectorPanel';
import EnhancedSceneNotesPanel from '../components/EnhancedSceneNotesPanel';
import ExportHistoryPanel from '../components/ExportHistoryPanel';
import ExportPresetsPanel from '../components/ExportPresetsPanel';
import ExportQueuePanel from '../components/ExportQueuePanel';
import LocationsPanel from '../components/LocationsPanel';
import NotificationCenter from '../components/NotificationCenter';
import ProjectHealthScore from '../components/ProjectHealthScore';
import ProjectQuickActionsMenu from '../components/ProjectQuickActionsMenu';
import ProjectStatisticsPanel from '../components/ProjectStatisticsPanel';
import ProjectTemplatesLibrary from '../components/ProjectTemplatesLibrary';
import QuickActionsMenuWrapper, { setShowToast as setQuickActionsToast } from '../components/QuickActionsMenuWrapper';
import SceneBookmarksPanel from '../components/SceneBookmarksPanel';
import SceneCard from '../components/SceneCard';
import SceneComparisonView from '../components/SceneComparisonView';
import SceneDependencyTracker from '../components/SceneDependencyTracker';
import ScenePreviewModal from '../components/ScenePreviewModal';
import SceneTemplatesModal from '../components/SceneTemplatesModal';
import SettingsPanel from '../components/SettingsPanel';
import SharingModal from '../components/SharingModal';
import ShootingScheduleGenerator from '../components/ShootingScheduleGenerator';
import ShotListGenerator from '../components/ShotListGenerator';
import StoryArcVisualizer from '../components/StoryArcVisualizer';
import StoryboardPlayback from '../components/StoryboardPlayback';
import TemplateSelector from '../components/TemplateSelector';
import TimelineView from '../components/TimelineView';
import { ToastContainer } from '../components/Toast';
import VersionHistoryPanel from '../components/VersionHistoryPanel';
import VideoSlideshowExport from '../components/VideoSlideshowExport';
import { getProjectsFromDB, ProjectData } from '../db';
import { DirectorSettings, Scene, StoryContext } from '../types';
import { getStatusesCount } from '../utils/arrayUtils';
import { DEFAULT_CONTEXT, DEFAULT_DIRECTOR_SETTINGS } from '../utils/constants';
import { getContentTypeBadgeClass, getContentTypeInfo, getContentTypeTerminology } from '../utils/contentTypeUtils';
import { promptText } from '../utils/dialogUtils';
import { generateId } from '../utils/helpers';
import { getApiBaseUrl, reloadProjects } from '../utils/uiUtils';

interface StudioViewProps {
  // State props
  currentUser: any;
  storyContext: StoryContext;
  setStoryContext: React.Dispatch<React.SetStateAction<StoryContext>>;
  scenes: Scene[];
  setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
  currentSettings: DirectorSettings;
  setCurrentSettings: React.Dispatch<React.SetStateAction<DirectorSettings>>;
  studioViewMode: 'storyboard' | 'timeline';
  setStudioViewMode: React.Dispatch<React.SetStateAction<'storyboard' | 'timeline'>>;
  isProcessing: boolean;
  isAutoFilling: boolean;
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  lastSavedTime: Date | null;
  currentInput: string;
  setCurrentInput: React.Dispatch<React.SetStateAction<string>>;
  showExportMenu: boolean;
  setShowExportMenu: React.Dispatch<React.SetStateAction<boolean>>;
  availableTags: any[];
  showTagsMenu: boolean;
  setShowTagsMenu: React.Dispatch<React.SetStateAction<boolean>>;
  comicExists: boolean;
  isRegeneratingComic: boolean;
  showCoverImageSelector: boolean;
  selectedCoverImageId: string | null;
  draggedSceneIndex: number | null;
  setDraggedSceneIndex: React.Dispatch<React.SetStateAction<number | null>>;
  batchMode: boolean;
  setBatchMode: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSceneIds: Set<string>;
  setSelectedSceneIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  dragOverIndex: number | null;
  setDragOverIndex: React.Dispatch<React.SetStateAction<number | null>>;
  showCommentsPanel: boolean;
  setShowCommentsPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showSceneNotesPanel: boolean;
  setShowSceneNotesPanel: React.Dispatch<React.SetStateAction<boolean>>;
  selectedSceneId: string | null;
  setSelectedSceneId: React.Dispatch<React.SetStateAction<string | null>>;
  showTemplateSelector: boolean;
  setShowTemplateSelector: React.Dispatch<React.SetStateAction<boolean>>;
  showSaveTemplateModal: boolean;
  setShowSaveTemplateModal: React.Dispatch<React.SetStateAction<boolean>>;
  templateName: string;
  setTemplateName: React.Dispatch<React.SetStateAction<string>>;
  showContentTypeSelector: boolean;
  setShowContentTypeSelector: React.Dispatch<React.SetStateAction<boolean>>;
  showCharactersPanel: boolean;
  setShowCharactersPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showLocationsPanel: boolean;
  setShowLocationsPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showAnalyticsPanel: boolean;
  setShowAnalyticsPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showAdvancedAnalytics: boolean;
  setShowAdvancedAnalytics: React.Dispatch<React.SetStateAction<boolean>>;
  showProjectStatisticsPanel: boolean;
  setShowProjectStatisticsPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showScenePreviewModal: boolean;
  setShowScenePreviewModal: React.Dispatch<React.SetStateAction<boolean>>;
  previewSceneIndex: number;
  setPreviewSceneIndex: React.Dispatch<React.SetStateAction<number>>;
  showStoryboardPlayback: boolean;
  setShowStoryboardPlayback: React.Dispatch<React.SetStateAction<boolean>>;
  showAdvancedSearchPanel: boolean;
  setShowAdvancedSearchPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showAIStoryAnalysis: boolean;
  setShowAIStoryAnalysis: React.Dispatch<React.SetStateAction<boolean>>;
  showShotListGenerator: boolean;
  setShowShotListGenerator: React.Dispatch<React.SetStateAction<boolean>>;
  showShootingSchedule: boolean;
  setShowShootingSchedule: React.Dispatch<React.SetStateAction<boolean>>;
  showCallSheet: boolean;
  setShowCallSheet: React.Dispatch<React.SetStateAction<boolean>>;
  callSheetDay: any;
  setCallSheetDay: React.Dispatch<React.SetStateAction<any>>;
  showBudgetEstimator: boolean;
  setShowBudgetEstimator: React.Dispatch<React.SetStateAction<boolean>>;
  showVideoExport: boolean;
  setShowVideoExport: React.Dispatch<React.SetStateAction<boolean>>;
  showSceneComparison: boolean;
  setShowSceneComparison: React.Dispatch<React.SetStateAction<boolean>>;
  showCharacterGraph: boolean;
  setShowCharacterGraph: React.Dispatch<React.SetStateAction<boolean>>;
  showVersionHistory: boolean;
  setShowVersionHistory: React.Dispatch<React.SetStateAction<boolean>>;
  showProjectHealth: boolean;
  setShowProjectHealth: React.Dispatch<React.SetStateAction<boolean>>;
  quickActionsMenu: any;
  setQuickActionsMenu: React.Dispatch<React.SetStateAction<any>>;
  showCopySettingsModal: boolean;
  setShowCopySettingsModal: React.Dispatch<React.SetStateAction<boolean>>;
  sourceSceneForCopy: Scene | null;
  setSourceSceneForCopy: React.Dispatch<React.SetStateAction<Scene | null>>;
  showExportPresets: boolean;
  setShowExportPresets: React.Dispatch<React.SetStateAction<boolean>>;
  showAISceneSuggestions: boolean;
  setShowAISceneSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
  showStoryArcVisualizer: boolean;
  setShowStoryArcVisualizer: React.Dispatch<React.SetStateAction<boolean>>;
  projectQuickActions: any;
  setProjectQuickActions: React.Dispatch<React.SetStateAction<any>>;
  showCoverImageManager: boolean;
  setShowCoverImageManager: React.Dispatch<React.SetStateAction<boolean>>;
  coverImageProjectId: string | null;
  setCoverImageProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  coverImageProjectUrl: string | null;
  setCoverImageProjectUrl: React.Dispatch<React.SetStateAction<string | null>>;
  showSceneBookmarks: boolean;
  setShowSceneBookmarks: React.Dispatch<React.SetStateAction<boolean>>;
  showExportQueue: boolean;
  setShowExportQueue: React.Dispatch<React.SetStateAction<boolean>>;
  exportQueue: any[];
  setExportQueue: React.Dispatch<React.SetStateAction<any[]>>;
  showSceneDependencyTracker: boolean;
  setShowSceneDependencyTracker: React.Dispatch<React.SetStateAction<boolean>>;
  showSceneTemplates: boolean;
  setShowSceneTemplates: React.Dispatch<React.SetStateAction<boolean>>;
  sceneTemplates: any[];
  setSceneTemplates: React.Dispatch<React.SetStateAction<any[]>>;
  sceneTemplateName: string;
  setSceneTemplateName: React.Dispatch<React.SetStateAction<string>>;
  showSaveSceneTemplateModal: boolean;
  setShowSaveSceneTemplateModal: React.Dispatch<React.SetStateAction<boolean>>;
  showTemplatesLibrary: boolean;
  setShowTemplatesLibrary: React.Dispatch<React.SetStateAction<boolean>>;
  showSharingModal: boolean;
  setShowSharingModal: React.Dispatch<React.SetStateAction<boolean>>;
  selectedProjectForSharing: ProjectData | null;
  setSelectedProjectForSharing: React.Dispatch<React.SetStateAction<ProjectData | null>>;
  showExportHistoryPanel: boolean;
  setShowExportHistoryPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showCommandPalette: boolean;
  setShowCommandPalette: React.Dispatch<React.SetStateAction<boolean>>;
  commandPaletteQuery: string;
  setCommandPaletteQuery: React.Dispatch<React.SetStateAction<string>>;
  projects: ProjectData[];
  setView: (view: 'library' | 'setup' | 'studio' | 'dashboard' | 'admin') => void;
  
  // Handler props
  handleExitToLibrary: () => void;
  handleManualSave: () => void;
  handleGenerateScene: () => void;
  handleAutoDraft: () => void;
  handleExport: (format: string) => void;
  handleExportSelectedScenes: (format: string) => void;
  addExportToQueue: (job: any) => void;
  cancelExportJob: (jobId: string) => void;
  retryExportJob: (jobId: string) => void;
  clearCompletedExports: () => void;
  handleAddTag: (tagId: number) => void;
  handleRemoveTag: (tagId: number) => void;
  handleSelectSceneTemplate: (template: any) => void;
  handleSaveCurrentAsSceneTemplate: () => void;
  handleCopySceneSettings: (scene: Scene) => void;
  handleApplyCopiedSettings: (targetSceneIds: string[], fields: string[]) => void;
  handleEditScene: (sceneId: string) => void;
  handleExportScene: (sceneId: string, format: string) => void;
  handleDragStart: (e: React.DragEvent, index: number) => void;
  handleDragOver: (e: React.DragEvent, index: number) => void;
  handleDragLeave: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent, index: number) => void;
  handleSceneReorder: (fromIndex: number, toIndex: number) => void;
  handleToggleSceneSelection: (sceneId: string) => void;
  handleSelectAll: () => void;
  handleBulkDelete: () => void;
  handleBulkStatusUpdate: (status: string) => void;
  handleBulkTagAssignment: (tagId: number) => void;
  handleDuplicateScene: (sceneId: string) => void;
  handleAutoSuggestSettings: () => void;
  handleClearSettings: () => void;
  handleSceneContextMenu: (e: React.MouseEvent, scene: Scene) => void;
  handleCoverImageSelect: (imageUrl: string) => void;
  handleRegenerateComic: () => void;
  handleOpenProject: (project: ProjectData) => void;
  handleDuplicateProject: (e: React.MouseEvent, project: ProjectData) => void;
  handleDeleteProject: (e: React.MouseEvent, id: string) => void;
  handleSaveAsTemplate: () => void;
  handleTemplateSelect: (template: any) => void;
  handleContentTypeSelect: (contentType: string) => void;
  handleUndo: () => void;
  handleRedo: () => void;
  history: any[];
  historyIndex: number;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  exportMenuRef: React.RefObject<HTMLDivElement>;
  bottomRef: React.RefObject<HTMLDivElement>;
  contentTypeTerminology: any;
  toasts: any[];
  removeToast: (id: string) => void;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  notifications: any[];
  unreadNotificationCount: number;
  showActivityPanel: boolean;
  setShowActivityPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showSettingsPanel: boolean;
  setShowSettingsPanel: React.Dispatch<React.SetStateAction<boolean>>;
  showNotificationCenter: boolean;
  setShowNotificationCenter: React.Dispatch<React.SetStateAction<boolean>>;
  handleMarkNotificationRead: (id: number) => void;
  handleMarkAllNotificationsRead: () => void;
  handleDeleteNotification: (id: number) => void;
  loadNotifications: () => Promise<void>;
  setupTab: 'new' | 'resume';
  setSetupTab: React.Dispatch<React.SetStateAction<'new' | 'resume'>>;
  setProjects: React.Dispatch<React.SetStateAction<ProjectData[]>>;
  hoveredProjectForTooltip?: any;
  view?: string;
}

const StudioView: React.FC<StudioViewProps> = (props) => {
  const {
    currentUser, storyContext, setStoryContext, scenes, setScenes,
    currentSettings, setCurrentSettings, studioViewMode, setStudioViewMode,
    isProcessing, isAutoFilling, saveStatus, lastSavedTime, currentInput, setCurrentInput,
    showExportMenu, setShowExportMenu, availableTags, showTagsMenu, setShowTagsMenu,
    comicExists, isRegeneratingComic, batchMode, setBatchMode,
    selectedSceneIds, setSelectedSceneIds, draggedSceneIndex, setDraggedSceneIndex,
    dragOverIndex, setDragOverIndex, showCommentsPanel, setShowCommentsPanel,
    showSceneNotesPanel, setShowSceneNotesPanel, selectedSceneId, setSelectedSceneId,
    showTemplateSelector, setShowTemplateSelector,
    showSaveTemplateModal, setShowSaveTemplateModal, templateName, setTemplateName,
    showContentTypeSelector, setShowContentTypeSelector,
    showCharactersPanel, setShowCharactersPanel, showLocationsPanel, setShowLocationsPanel,
    showAnalyticsPanel, setShowAnalyticsPanel, showAdvancedAnalytics, setShowAdvancedAnalytics,
    showProjectStatisticsPanel, setShowProjectStatisticsPanel,
    showScenePreviewModal, setShowScenePreviewModal, previewSceneIndex, setPreviewSceneIndex,
    showStoryboardPlayback, setShowStoryboardPlayback,
    showAdvancedSearchPanel, setShowAdvancedSearchPanel,
    showAIStoryAnalysis, setShowAIStoryAnalysis,
    showShotListGenerator, setShowShotListGenerator,
    showShootingSchedule, setShowShootingSchedule, showCallSheet, setShowCallSheet, callSheetDay, setCallSheetDay,
    showBudgetEstimator, setShowBudgetEstimator, showVideoExport, setShowVideoExport,
    showSceneComparison, setShowSceneComparison, showCharacterGraph, setShowCharacterGraph,
    showVersionHistory, setShowVersionHistory, showProjectHealth, setShowProjectHealth,
    quickActionsMenu, setQuickActionsMenu,
    showCopySettingsModal, setShowCopySettingsModal, sourceSceneForCopy, setSourceSceneForCopy,
    showExportPresets, setShowExportPresets,
    showAISceneSuggestions, setShowAISceneSuggestions,
    showStoryArcVisualizer, setShowStoryArcVisualizer,
    projectQuickActions, setProjectQuickActions,
    showCoverImageManager, setShowCoverImageManager,
    coverImageProjectId, setCoverImageProjectId,
    coverImageProjectUrl, setCoverImageProjectUrl,
    showSceneBookmarks, setShowSceneBookmarks,
    showExportQueue, setShowExportQueue, exportQueue, setExportQueue,
    showSceneDependencyTracker, setShowSceneDependencyTracker,
    showSceneTemplates, setShowSceneTemplates, sceneTemplates, setSceneTemplates,
    sceneTemplateName, setSceneTemplateName,
    showSaveSceneTemplateModal, setShowSaveSceneTemplateModal,
    showTemplatesLibrary, setShowTemplatesLibrary,
    showSharingModal, setShowSharingModal,
    selectedProjectForSharing, setSelectedProjectForSharing,
    showExportHistoryPanel, setShowExportHistoryPanel,
    showCommandPalette, setShowCommandPalette,
    commandPaletteQuery, setCommandPaletteQuery,
    projects, setView,
    handleExitToLibrary, handleManualSave, handleGenerateScene, handleAutoDraft,
    handleExport, handleExportSelectedScenes,
    addExportToQueue, cancelExportJob, retryExportJob, clearCompletedExports,
    handleAddTag, handleRemoveTag,
    handleSelectSceneTemplate, handleSaveCurrentAsSceneTemplate,
    handleCopySceneSettings, handleApplyCopiedSettings,
    handleEditScene, handleExportScene,
    handleDragStart, handleDragOver, handleDragLeave, handleDrop,
    handleSceneReorder, handleToggleSceneSelection, handleSelectAll,
    handleBulkDelete, handleBulkStatusUpdate, handleBulkTagAssignment,
    handleDuplicateScene, handleAutoSuggestSettings, handleClearSettings,
    handleSceneContextMenu, handleCoverImageSelect, handleRegenerateComic,
    handleOpenProject, handleDuplicateProject, handleDeleteProject,
    handleSaveAsTemplate, handleTemplateSelect, handleContentTypeSelect,
    handleUndo, handleRedo, history, historyIndex,
    showToast, exportMenuRef, bottomRef, contentTypeTerminology,
    toasts, removeToast, theme, setTheme, notifications, unreadNotificationCount,
    showActivityPanel, setShowActivityPanel, showSettingsPanel, setShowSettingsPanel,
    showNotificationCenter, setShowNotificationCenter,
    handleMarkNotificationRead, handleMarkAllNotificationsRead, handleDeleteNotification,
    loadNotifications, setupTab, setSetupTab, setProjects,
    hoveredProjectForTooltip, view
  } = props;

  // State for scene prompt generation
  const [generatingScenePrompt, setGeneratingScenePrompt] = useState(false);
  const [generatedScenePrompt, setGeneratedScenePrompt] = useState<string | null>(null);

  // Debug: Log scenes changes
  React.useEffect(() => {
    console.log('[StudioView] Scenes updated:', {
      count: scenes?.length || 0,
      isArray: Array.isArray(scenes),
      scenes: scenes?.slice(0, 3).map(s => ({ id: s?.id, seq: s?.sequenceNumber, hasId: !!s?.id }))
    });
  }, [scenes]);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-black px-3 sm:px-6 py-2 sm:py-3 flex-shrink-0 z-20 shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 max-w-full">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            <button 
              onClick={handleExitToLibrary}
              className="text-xs text-zinc-500 hover:text-white flex items-center gap-1 flex-shrink-0"
              title="Back to Library"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
              </svg>
              <span className="hidden sm:inline">Library</span>
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
              <h1 className="text-base sm:text-xl font-bold text-amber-500 truncate max-w-[200px] sm:max-w-md" title={storyContext.title}>
                {storyContext.title || 'Untitled Project'}
              </h1>
              {storyContext.contentType && (
                <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded uppercase tracking-wider font-bold flex-shrink-0 ${getContentTypeBadgeClass(storyContext.contentType)}`}>
                  <span>{getContentTypeInfo(storyContext.contentType).name}</span>
                </span>
              )}
            </div>
          </div>
          <div className="text-xs text-zinc-400 sm:hidden truncate max-w-[150px]">{storyContext.title}</div>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3 flex-wrap w-full sm:w-auto justify-end">
          <button
            onClick={() => {
              setView('dashboard');
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
              onClick={() => {
                setShowExportMenu(prev => !prev);
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
          {storyContext.id && (
            <button
              onClick={() => {
                startTransition(() => {
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
          {storyContext.id && (
            <button
              onClick={() => {
                startTransition(() => {
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
          {storyContext.id && (
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
          {storyContext.id && (
            <div className="relative group">
            <button
                onClick={(e) => {
                  startTransition(() => setShowAdvancedAnalytics(true));
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
          {storyContext.id && scenes.length > 0 && (
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
          {storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => {
                startTransition(() => setShowAIStoryAnalysis(true));
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
          {storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => {
                startTransition(() => setShowShotListGenerator(true));
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
          {storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => {
                startTransition(() => setShowShootingSchedule(true));
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
          {storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => {
                startTransition(() => setShowBudgetEstimator(true));
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
          {storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => {
                startTransition(() => setShowVideoExport(true));
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
          {storyContext.id && scenes.length > 1 && (
            <button
              onClick={() => {
                startTransition(() => setShowSceneComparison(true));
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
          {storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => {
                startTransition(() => setShowCharacterGraph(true));
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
          {storyContext.id && (
            <button
              onClick={() => {
                startTransition(() => setShowVersionHistory(true));
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
          {storyContext.id && (
            <button
              onClick={() => {
                startTransition(() => setShowProjectHealth(true));
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
          {storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => {
                startTransition(() => setShowAISceneSuggestions(true));
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
          {storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => {
                startTransition(() => setShowStoryArcVisualizer(true));
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
          {storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => {
                startTransition(() => setShowSceneBookmarks(true));
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
          {storyContext.id && scenes.length > 0 && (
            <button
              onClick={() => {
                startTransition(() => setShowSceneDependencyTracker(true));
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
          <button
            onClick={() => {
              startTransition(() => setShowExportHistoryPanel(true));
            }}
            className="text-xs px-2 sm:px-3 py-1.5 rounded bg-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-700 border border-zinc-700 transition-colors flex items-center gap-1"
            title="Export History"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 sm:w-4 sm:h-4">
              <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v5.5h5.5a.75.75 0 010 1.5h-5.5v5.5a.75.75 0 01-1.5 0v-5.5H4.25a.75.75 0 010-1.5h5.5v-5.5A.75.75 0 0110 2z" clipRule="evenodd" />
            </svg>
            <span className="hidden sm:inline">Exports</span>
          </button>

          {/* Export Queue Button */}
          <button
            onClick={() => {
              startTransition(() => setShowExportQueue(true));
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

          {/* Storyboard Playback Button */}
          {scenes.length > 0 && (
            <button
              onClick={() => {
                startTransition(() => setShowStoryboardPlayback(true));
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
            onClick={() => {
              startTransition(() => setShowAdvancedSearchPanel(true));
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
          {storyContext.id && (
            <button
              onClick={() => {
                startTransition(() => setShowCommentsPanel(true));
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

          {/* Save as Template Button */}
          {storyContext.id && (
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
          {scenes.length > 0 && (
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
          {storyContext.id && (
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
              {(() => {
                // Debug logging
                if (process.env.NODE_ENV === 'development') {
                  console.log('[StudioView] Scenes state:', {
                    scenes,
                    isArray: Array.isArray(scenes),
                    length: scenes?.length,
                    type: typeof scenes,
                    firstScene: scenes?.[0]
                  });
                }
                
                if (!scenes || !Array.isArray(scenes) || scenes.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center h-96 text-zinc-600 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/50">
                      <p className="font-serif text-xl mb-2 text-zinc-400">The Storyboard is Empty</p>
                      <p className="text-sm max-w-md text-center">
                        {storyContext.initialContext 
                          ? `Ready to continue. The Director AI knows the context of your previous ${contentTypeTerminology.scene.toLowerCase()}. Describe the next ${contentTypeTerminology.scene.toLowerCase()} below.` 
                          : `Describe the opening ${contentTypeTerminology.scene.toLowerCase()} below.`}
                      </p>
                      {scenes && !Array.isArray(scenes) && (
                        <p className="text-xs text-red-400 mt-2">Debug: scenes is not an array: {typeof scenes}</p>
                      )}
                      {scenes && Array.isArray(scenes) && scenes.length === 0 && (
                        <p className="text-xs text-zinc-500 mt-2">No scenes found in project</p>
                      )}
                    </div>
                  );
                }
                
                return (
                  <div className="grid grid-cols-1 gap-6">
                    {scenes.map((scene, index) => {
                      if (!scene || !scene.id) {
                        console.warn('Invalid scene at index', index, scene);
                        return null;
                      }
                      return (
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
                      );
                    })}
                    <div ref={bottomRef}></div>
                  </div>
                );
              })()}
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
            setShowCharactersPanel(false);
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
            setShowLocationsPanel(false);
          }}
        />
      )}

      {/* Analytics Panel */}
      {showAnalyticsPanel && storyContext.id && (
        <AnalyticsPanel
          projectId={storyContext.id}
          onClose={() => {
            setShowAnalyticsPanel(false);
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
            setShowAdvancedAnalytics(false);
          }}
        />
      )}

      {/* Project Statistics Panel */}
      {showProjectStatisticsPanel && storyContext.id && (
        <ProjectStatisticsPanel
          projectId={storyContext.id}
          scenes={scenes}
          onClose={() => {
            setShowProjectStatisticsPanel(false);
          }}
        />
      )}

      {/* Export History Panel */}
      {showExportHistoryPanel && (
        <ExportHistoryPanel
          onClose={() => {
            setShowExportHistoryPanel(false);
          }}
        />
      )}

      {/* Export Queue Panel */}
      {showExportQueue && (
        <ExportQueuePanel
          isOpen={showExportQueue}
          onClose={() => {
            setShowExportQueue(false);
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
            setShowAIStoryAnalysis(false);
          }}
          onCreateScene={async (sceneIdea: string, purpose?: string) => {
            setCurrentInput(sceneIdea);
            setShowAIStoryAnalysis(false);
            showToast(purpose ? `Generated scene idea: ${purpose}` : 'Scene idea ready to generate', 'success');
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
            setShowShotListGenerator(false);
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
            setShowShootingSchedule(false);
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
            setShowBudgetEstimator(false);
          }}
        />
      )}

      {/* Video Slideshow Export */}
      {showVideoExport && storyContext.id && (
        <VideoSlideshowExport
          scenes={scenes}
          projectId={storyContext.id}
          onClose={() => {
            setShowVideoExport(false);
          }}
        />
      )}

      {/* Scene Comparison View */}
      {showSceneComparison && storyContext.id && scenes.length > 0 && (
        <SceneComparisonView
          scenes={scenes}
          projectId={storyContext.id}
          onClose={() => {
            setShowSceneComparison(false);
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
            setShowCharacterGraph(false);
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
            setShowVersionHistory(false);
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
            setShowProjectHealth(false);
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
              const API_BASE_URL = getApiBaseUrl();
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
            setShowAISceneSuggestions(false);
          }}
          onApplySuggestion={(suggestion) => {
            setCurrentInput(suggestion);
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
            setShowStoryArcVisualizer(false);
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
              const event = { stopPropagation: () => {} } as React.MouseEvent;
              await handleDeleteProject(event, project.context.id);
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
            setShowSceneDependencyTracker(false);
          }}
        />
      )}

      {/* Scene Bookmarks Panel */}
      {showSceneBookmarks && storyContext.id && scenes.length > 0 && (
        <SceneBookmarksPanel
          projectId={storyContext.id}
          scenes={scenes}
          onClose={() => {
            setShowSceneBookmarks(false);
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
            setShowExportPresets(false);
          }}
          onApply={async (preset) => {
            try {
              const exportData: any = {
                context: storyContext,
                scenes: scenes,
                settings: currentSettings,
              };

              if (!preset.includeSettings) {
                exportData.settings = undefined;
              }

              switch (preset.format) {
                case 'pdf':
                  const { exportToPDF } = await import('../utils/exportUtils');
                  await exportToPDF(exportData, 'comic');
                  break;
                case 'csv':
                  const { exportToCSV } = await import('../utils/exportUtils');
                  const csvContent = exportToCSV(exportData);
                  const csvBlob = new Blob([csvContent], { type: 'text/csv' });
                  const csvUrl = URL.createObjectURL(csvBlob);
                  const csvA = document.createElement('a');
                  csvA.href = csvUrl;
                  csvA.download = `${storyContext.title || 'project'}-${preset.name}.csv`;
                  csvA.click();
                  URL.revokeObjectURL(csvUrl);
                  break;
                case 'markdown':
                  const { exportToMarkdown } = await import('../utils/exportUtils');
                  const markdownContent = exportToMarkdown(exportData);
                  const markdownBlob = new Blob([markdownContent], { type: 'text/markdown' });
                  const markdownUrl = URL.createObjectURL(markdownBlob);
                  const markdownA = document.createElement('a');
                  markdownA.href = markdownUrl;
                  markdownA.download = `${storyContext.title || 'project'}-${preset.name}.md`;
                  markdownA.click();
                  URL.revokeObjectURL(markdownUrl);
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
                  const { exportToFountain } = await import('../utils/exportUtils');
                  const fountainContent = exportToFountain(exportData);
                  const fountainBlob = new Blob([fountainContent], { type: 'text/plain' });
                  const fountainUrl = URL.createObjectURL(fountainBlob);
                  const fountainA = document.createElement('a');
                  fountainA.href = fountainUrl;
                  fountainA.download = `${storyContext.title || 'project'}-${preset.name}.fountain`;
                  fountainA.click();
                  URL.revokeObjectURL(fountainUrl);
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
            setShowContentTypeSelector(false);
          }}
        />
      )}

      {/* Project Templates Library */}
      {showTemplatesLibrary && (
        <ProjectTemplatesLibrary
          onClose={() => {
            setShowTemplatesLibrary(false);
          }}
          onSelectTemplate={async (template) => {
            try {
              const API_BASE_URL = getApiBaseUrl();
              const token = localStorage.getItem('auth_token');
              
              const response = await fetch(`${API_BASE_URL}/templates/${template.id}/create-project`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
              });

              if (!response.ok) throw new Error('Failed to create project from template');

              const result = await response.json();
              
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
              const API_BASE_URL = getApiBaseUrl();
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
            setShowAdvancedSearchPanel(false);
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
            if (projectId === storyContext.id) {
              const sceneElement = document.querySelector(`[data-scene-id="${sceneId}"]`);
              if (sceneElement) {
                sceneElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                sceneElement.classList.add('ring-2', 'ring-amber-500');
                setTimeout(() => {
                  sceneElement.classList.remove('ring-2', 'ring-amber-500');
                }, 2000);
              }
            } else {
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
            setShowSceneTemplates(false);
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
              setShowActivityPanel(false);
            }}
          />
        </div>
      )}

      {/* Notification Center */}
      {showNotificationCenter && (
        <NotificationCenter
          isOpen={showNotificationCenter}
          onClose={() => {
            setShowNotificationCenter(false);
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
              setShowSettingsPanel(false);
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
              const input = document.querySelector('textarea[placeholder*="idea"]') as HTMLTextAreaElement;
              if (input) input.focus();
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

      {/* Comments Panel */}
      {showCommentsPanel && storyContext.id && (
        <CommentsPanel
          projectId={storyContext.id}
          onClose={() => {
            setShowCommentsPanel(false);
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
              <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex flex-col gap-2 z-10">
                <div className="flex gap-2">
                  <button 
                    onClick={async () => {
                      if (!storyContext) {
                        showToast('Story context is required', 'warning');
                        return;
                      }
                      setGeneratingScenePrompt(true);
                      setGeneratedScenePrompt(null);
                      try {
                        const prompt = await generateScenePrompt(
                          storyContext,
                          scenes,
                          {
                            purpose: currentInput || undefined,
                            action: currentInput || undefined
                          }
                        );
                        setGeneratedScenePrompt(prompt);
                      } catch (error: any) {
                        showToast(`Failed to generate prompt: ${error.message}`, 'error');
                      } finally {
                        setGeneratingScenePrompt(false);
                      }
                    }}
                    className="text-xs bg-purple-800 hover:bg-purple-700 text-purple-200 border border-purple-500/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-all flex items-center gap-1 shadow-lg opacity-80 hover:opacity-100"
                    disabled={isProcessing || isAutoFilling || generatingScenePrompt}
                    title="Generate detailed text prompt for scene creation"
                  >
                    {generatingScenePrompt ? (
                      <>
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="hidden sm:inline">Generating...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                          <path d="M15.98 1.804a1 1 0 00-1.96 0l-.84 4.42a1 1 0 01-.82.67l-4.83.49a1 1 0 00-.9 1.2l1.08 5.64a1 1 0 01-.72 1.15l-4.57 1.29a1 1 0 00-.7 1.23l.53 2.9a1 1 0 001.3 1.13l5.28-2.12a1 1 0 01.8 0l5.28 2.12a1 1 0 001.3-1.13l-.53-2.9a1 1 0 00-.7-1.23l-4.57-1.29a1 1 0 01-.72-1.15l1.08-5.64a1 1 0 00-.9-1.2l-4.83-.49a1 1 0 01-.82-.67l-.84-4.42z" />
                        </svg>
                        <span className="hidden sm:inline">Text Prompt</span>
                        <span className="sm:hidden">Text</span>
                      </>
                    )}
                  </button>
                  <button 
                    onClick={async () => {
                      if (!storyContext) {
                        showToast('Story context is required', 'warning');
                        return;
                      }
                      setGeneratingScenePrompt(true);
                      setGeneratedScenePrompt(null);
                      try {
                        const prompt = await generateSceneImagePrompt(
                          storyContext,
                          scenes,
                          {
                            purpose: currentInput || undefined,
                            location: undefined,
                            characters: undefined,
                            mood: undefined,
                            action: currentInput || undefined
                          }
                        );
                        setGeneratedScenePrompt(prompt);
                      } catch (error: any) {
                        showToast(`Failed to generate image prompt: ${error.message}`, 'error');
                      } finally {
                        setGeneratingScenePrompt(false);
                      }
                    }}
                    className="text-xs bg-blue-800 hover:bg-blue-700 text-blue-200 border border-blue-500/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-all flex items-center gap-1 shadow-lg opacity-80 hover:opacity-100"
                    disabled={isProcessing || isAutoFilling || generatingScenePrompt}
                    title="Generate prompt optimized for AI image generation (DALL-E, Stable Diffusion, Midjourney, etc.)"
                  >
                    {generatingScenePrompt ? (
                      <>
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="hidden sm:inline">Generating...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                          <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909a.75.75 0 01-1.06 0l-1.78-1.78a.75.75 0 00-1.06 0l-2.22 2.22zm12-2.62a.75.75 0 00-1.06 0l-1.91 1.91a.75.75 0 01-1.06 0l-1.78-1.78a.75.75 0 00-1.06 0L4.5 8.94v-.19a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v.19l2.22-2.22a.75.75 0 011.06 0l1.78 1.78a.75.75 0 001.06 0l1.91-1.91a.75.75 0 011.06 0z" clipRule="evenodd" />
                        </svg>
                        <span className="hidden sm:inline">Image Prompt</span>
                        <span className="sm:hidden">Image</span>
                      </>
                    )}
                  </button>
                </div>
                <button 
                  onClick={handleAutoDraft}
                  className="text-xs bg-zinc-800 hover:bg-zinc-700 text-amber-500 border border-amber-500/30 px-2 sm:px-3 py-1 sm:py-1.5 rounded-full transition-all flex items-center gap-1 shadow-lg opacity-80 hover:opacity-100"
                  disabled={isProcessing || isAutoFilling}
                  title="Let the AI suggest the next scene idea based on the story"
                >
                   <span className="text-base sm:text-lg leading-none">✨</span>
                   <span className="font-bold hidden sm:inline">Auto-Write Idea</span>
                   <span className="font-bold sm:hidden">Auto</span>
                </button>
              </div>
              
              {/* Generated Prompt Display */}
              {generatedScenePrompt && (
                <div className="absolute top-12 right-2 sm:right-3 left-2 sm:left-auto sm:w-96 bg-zinc-950 border border-purple-700 rounded-lg p-3 text-sm text-zinc-300 max-h-60 overflow-y-auto z-20 shadow-xl">
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-xs text-purple-400 font-semibold">Generated Scene Prompt</span>
                    <button
                      onClick={() => setGeneratedScenePrompt(null)}
                      className="text-zinc-500 hover:text-white"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                      </svg>
                    </button>
                  </div>
                  <div className="whitespace-pre-wrap text-xs mb-2">{generatedScenePrompt}</div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setCurrentInput(generatedScenePrompt);
                        setGeneratedScenePrompt(null);
                        showToast('Prompt loaded into input field', 'success');
                      }}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs"
                    >
                      Use This Prompt
                    </button>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(generatedScenePrompt);
                        showToast('Prompt copied to clipboard!', 'success');
                      }}
                      className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

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
      
      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default StudioView;
