import React, { useMemo, useRef } from 'react';
import { flushSync } from 'react-dom';
import { ProjectData } from '../db';
import { useLibraryState } from '../hooks/useLibraryState';
import { matchesFilters, getFilteredProjectIds, generateProjectCover, toggleProjectFavorite, batchGenerateCovers } from '../utils/libraryUtils';
import { getImageUrl, createShowHandler, createHideHandler } from '../utils/uiUtils';
import { formatDate } from '../utils/formatUtils';
import { promptText, confirmAction } from '../utils/dialogUtils';
import { getCompletedScenesCount, hasCompletedScenes, getProjectsWithoutCover, getProjectsWithoutCoverCount, updateArrayItemById, removeArrayItemById, addArrayItem, formatSceneCount } from '../utils/arrayUtils';
import { cn, getSelectedClassName, getCheckboxClassName, getFavoriteButtonClassName, getCardHeightClass, getCoverImageHeightClass, getGridColumnsClass, getStatusBadgeClassName } from '../utils/styleUtils';
import { getContentTypeInfo, getContentTypeBadgeClass } from '../utils/contentTypeUtils';
import { highlightSearchTerm, highlightAndTruncate } from '../utils/searchHighlight';
import { calculateProjectHealthScore } from '../utils/helpers';
import LazyImage from '../components/LazyImage';
import { apiService } from '../apiService';
import { favoritesService } from '../apiServices';

interface LibraryViewProps {
  currentUser: any;
  projects: ProjectData[];
  favoritedProjects: Set<string>;
  setFavoritedProjects: React.Dispatch<React.SetStateAction<Set<string>>>;
  setView: (view: 'library' | 'setup' | 'studio' | 'dashboard' | 'timeline') => void;
  handleLogout: () => void;
  handleOpenProject: (project: ProjectData) => void;
  handleDuplicateProject: (e: React.MouseEvent, project: ProjectData) => void;
  handleArchiveProject: (e: React.MouseEvent, projectId: string, archived: boolean) => void;
  handleDeleteProject: (e: React.MouseEvent, id: string) => void;
  handleCreateNew: () => void;
  handleImportClick: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  loadNotifications: () => Promise<void>;
  setShowNotificationCenter: (show: boolean) => void;
  unreadNotificationCount: number;
  setShowSettingsPanel: (show: boolean) => void;
  availableTags: any[];
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  setShowBulkTagAssigner: (show: boolean) => void;
  batchGeneratingCovers: boolean;
  setBatchGeneratingCovers: (generating: boolean) => void;
  setProjectQuickActions: (actions: { project: ProjectData; position: { x: number; y: number } } | null) => void;
  setSelectedProjectForSharing: (project: ProjectData | null) => void;
  setShowSharingModal: (show: boolean) => void;
  setProjects: React.Dispatch<React.SetStateAction<ProjectData[]>>;
}

const LibraryView: React.FC<LibraryViewProps> = ({
  currentUser,
  projects,
  favoritedProjects,
  setFavoritedProjects,
  setView,
  handleLogout,
  handleOpenProject,
  handleDuplicateProject,
  handleArchiveProject,
  handleDeleteProject,
  handleCreateNew,
  handleImportClick,
  handleFileChange,
  fileInputRef,
  theme,
  setTheme,
  loadNotifications,
  setShowNotificationCenter,
  unreadNotificationCount,
  setShowSettingsPanel,
  availableTags,
  showToast,
  setShowBulkTagAssigner,
  batchGeneratingCovers,
  setBatchGeneratingCovers,
  setProjectQuickActions,
  setSelectedProjectForSharing,
  setShowSharingModal,
  setProjects,
}) => {
  // Use library state hook
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
    filterPresets,
    setFilterPresets,
    libraryBatchMode,
    setLibraryBatchMode,
    selectedLibraryProjectIds,
    setSelectedLibraryProjectIds,
    showFilterPresetsDropdown,
    setShowFilterPresetsDropdown,
  } = useLibraryState();

  // Compute filtered and sorted projects
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
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                flushSync(() => setView('dashboard'));
              }}
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
              onClick={createShowHandler(setShowSettingsPanel)}
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
                className={cn('px-3 py-1.5 rounded text-xs border transition-colors', libraryBatchMode
                  ? 'bg-amber-600 border-amber-500 text-white'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700')}
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

              {libraryBatchMode && (
                <div className="flex items-center gap-2">
                  {selectedLibraryProjectIds.size > 0 ? (
                    <>
                      <button
                        onClick={createShowHandler(setShowBulkTagAssigner)}
                        className="px-3 py-1.5 rounded text-xs bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 border border-purple-900/50 transition-colors"
                      >
                        Assign Tags ({selectedLibraryProjectIds.size})
                      </button>
                      <button
                        onClick={() => {
                          const filterCriteria = {
                            searchTerm: librarySearchTerm,
                            genre: libraryFilterGenre,
                            tags: libraryFilterTags,
                            hasCover: libraryFilterHasCover,
                            sceneCount: libraryFilterSceneCount,
                            favorites: libraryFilterFavorites,
                            contentType: libraryFilterContentType,
                          };
                          const filteredIds = getFilteredProjectIds(projects, filterCriteria, favoritedProjects);
                          setSelectedLibraryProjectIds(filteredIds);
                        }}
                        className="px-3 py-1.5 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      >
                        Select All Filtered
                      </button>
                      <button
                        onClick={() => setSelectedLibraryProjectIds(new Set())}
                        className="px-3 py-1.5 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                      >
                        Clear Selection
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        const filterCriteria = {
                          searchTerm: librarySearchTerm,
                          genre: libraryFilterGenre,
                          tags: libraryFilterTags,
                          hasCover: libraryFilterHasCover,
                          sceneCount: libraryFilterSceneCount,
                          favorites: libraryFilterFavorites,
                          contentType: libraryFilterContentType,
                        };
                        const filteredIds = getFilteredProjectIds(projects, filterCriteria, favoritedProjects);
                        setSelectedLibraryProjectIds(filteredIds);
                      }}
                      className="px-3 py-1.5 rounded text-xs bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-600/50 transition-colors"
                    >
                      Select All Filtered
                    </button>
                  )}
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
                <div className="relative filter-presets-container">
                  <button
                    onClick={() => {
                      setShowAdvancedSearch(!showAdvancedSearch);
                      if (filterPresets.length > 0) {
                        setShowFilterPresetsDropdown(!showFilterPresetsDropdown);
                      }
                    }}
                    className={cn('px-3 py-1.5 rounded text-xs border transition-colors', showAdvancedSearch || libraryFilterGenre || libraryFilterTags.length > 0 || libraryFilterHasCover !== null || libraryFilterSceneCount !== null || libraryFilterFavorites !== null || libraryFilterContentType !== null
                      ? 'bg-amber-600 border-amber-500 text-white'
                      : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700')}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 inline mr-1">
                      <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                    </svg>
                    Advanced
                    {filterPresets.length > 0 && (
                      <span className="ml-1 text-xs opacity-75">({filterPresets.length})</span>
                    )}
                  </button>
                  {filterPresets.length > 0 && showFilterPresetsDropdown && (
                    <div 
                      className="absolute top-full left-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-lg z-50 min-w-[200px] max-h-[300px] overflow-y-auto"
                    >
                      <div className="p-2 text-xs text-zinc-400 border-b border-zinc-800 sticky top-0 bg-zinc-900">Quick Filters</div>
                      {filterPresets.map(preset => (
                        <div
                          key={preset.id}
                          className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 flex items-center justify-between group"
                        >
                          <button
                            onClick={() => {
                              setLibraryFilterGenre(preset.filters.genre || '');
                              setLibraryFilterTags(preset.filters.tags || []);
                              setLibraryFilterHasCover(preset.filters.hasCover ?? null);
                              setLibraryFilterSceneCount(preset.filters.sceneCount ?? null);
                              setLibraryFilterFavorites(preset.filters.favorites ?? null);
                              setLibraryFilterContentType(preset.filters.contentType || null);
                              setShowAdvancedSearch(true);
                              setShowFilterPresetsDropdown(false);
                            }}
                            className="flex-1 text-left"
                          >
                            {preset.name}
                          </button>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                const newName = promptText(`Edit preset name:`, preset.name);
                                if (newName && newName !== preset.name) {
                                  setFilterPresets(prev => updateArrayItemById(prev, preset.id, p => ({ ...p, name: newName })));
                                }
                              }}
                              className="text-zinc-500 hover:text-amber-400 p-1"
                              title="Edit preset name"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z" />
                              </svg>
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirmAction(`Delete preset "${preset.name}"?`)) {
                                  setFilterPresets(prev => removeArrayItemById(prev, preset.id));
                                  if (filterPresets.length === 1) {
                                    setShowFilterPresetsDropdown(false);
                                  }
                                }
                              }}
                              className="text-zinc-500 hover:text-red-400 p-1"
                              title="Delete preset"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443a.75.75 0 01-.298.604L6 4.75v10.5A2.75 2.75 0 008.75 18h2.5A2.75 2.75 0 0014 15.25V4.75l-.452-.197A.75.75 0 0113.25 4.193V3.75A2.75 2.75 0 0010.5 1h-1.75zM9 3.25a.25.25 0 01.25-.25h1.5a.25.25 0 01.25.25v.5a.25.25 0 01-.25.25h-1.5A.25.25 0 019 3.75v-.5zM7.5 7.25a.75.75 0 00-1.5 0v7.5a.75.75 0 001.5 0v-7.5zm3 0a.75.75 0 00-1.5 0v7.5a.75.75 0 001.5 0v-7.5z" clipRule="evenodd" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      flushSync(() => setLibraryViewMode('grid'));
                    }}
                    className={cn('p-2 rounded', libraryViewMode === 'grid' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white')}
                    title="Grid View"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M2 4.5A1.5 1.5 0 013.5 3h13A1.5 1.5 0 0118 4.5v11a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 012 15.5v-11zM3.5 4a.5.5 0 00-.5.5v11a.5.5 0 00.5.5h13a.5.5 0 00.5-.5v-11a.5.5 0 00-.5-.5h-13z" />
                      <path d="M6 6a.5.5 0 01.5-.5h7a.5.5 0 01.5.5v7a.5.5 0 01-.5.5h-7A.5.5 0 016 13V6z" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      flushSync(() => setLibraryViewMode('list'));
                    }}
                    className={cn('p-2 rounded', libraryViewMode === 'list' ? 'bg-amber-600 text-white' : 'text-zinc-400 hover:text-white')}
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
                onClick={createHideHandler(setShowAdvancedSearch)}
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
                      className={cn('px-2 py-1 text-xs rounded', libraryFilterTags.includes(tag.id)
                        ? 'bg-amber-600 text-white'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700')}
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

                {/* Content Type Filter */}
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Content Type</label>
                  <select
                    value={libraryFilterContentType || 'all'}
                    onChange={(e) => {
                      const value = e.target.value;
                      setLibraryFilterContentType(value === 'all' ? null : value);
                    }}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm"
                  >
                    <option value="all">All Types</option>
                    <option value="film">🎬 Film / Storyboard</option>
                    <option value="news">📰 News Reporting</option>
                    <option value="sports">⚽ Sports Content</option>
                    <option value="documentary">📹 Documentary</option>
                    <option value="commercial">📺 Commercial / Ad</option>
                    <option value="music-video">🎵 Music Video</option>
                    <option value="web-series">📱 Web Series</option>
                    <option value="podcast">🎙️ Podcast / Audio</option>
                    <option value="other">✨ Other</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setLibraryFilterGenre('');
                      setLibraryFilterTags([]);
                      setLibrarySearchTerm('');
                      setLibraryFilterHasCover(null);
                      setLibraryFilterSceneCount(null);
                      setLibraryFilterFavorites(null);
                      setLibraryFilterContentType(null);
                    }}
                    className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
                  >
                    Clear All Filters
                  </button>
                  <button
                    onClick={() => {
                      const presetName = promptText('Enter preset name:');
                      if (presetName) {
                        const newPreset = {
                          id: Date.now().toString(),
                          name: presetName.trim(),
                          filters: {
                            genre: libraryFilterGenre || undefined,
                            tags: libraryFilterTags.length > 0 ? libraryFilterTags : undefined,
                            hasCover: libraryFilterHasCover,
                            sceneCount: libraryFilterSceneCount,
                            favorites: libraryFilterFavorites,
                            contentType: libraryFilterContentType || undefined,
                          }
                        };
                        setFilterPresets(prev => addArrayItem(prev, newPreset));
                        showToast('Filter preset saved!', 'success');
                      }
                    }}
                    className="w-full px-4 py-2 bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/50 rounded text-sm text-amber-400"
                  >
                    💾 Save Current Filters
                  </button>
                </div>

                {/* Batch Generate Covers */}
                {getProjectsWithoutCoverCount(filteredProjects) > 0 && (
                  <button
                    onClick={async () => {
                      const projectsWithoutCover = getProjectsWithoutCover(filteredProjects);
                      if (projectsWithoutCover.length === 0) {
                        showToast('All projects already have cover images', 'info');
                        return;
                      }
                      
                      if (!confirmAction(`Generate cover images for ${projectsWithoutCover.length} project(s)?`)) {
                        return;
                      }

                      const projectIds = projectsWithoutCover.map(project => project.context.id);
                      await batchGenerateCovers(projectIds, apiService, setProjects, showToast, setBatchGeneratingCovers);
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
                        ✨ Generate Covers ({getProjectsWithoutCoverCount(filteredProjects)})
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={getGridColumnsClass(libraryViewMode, libraryCardSize)}>
          {/* New Project Card */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCreateNew();
            }}
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
          {filteredProjects.length === 0 ? (
            <div className={cn(libraryViewMode === 'grid' ? 'col-span-full' : 'w-full', 'text-center py-10 text-zinc-500 text-sm')}>
              {librarySearchTerm ? 'No projects match your search.' : 'No projects found. Create or import one to begin.'}
            </div>
          ) : (
            <>
              {filteredProjects.length > 0 && (
                <div className={cn(libraryViewMode === 'grid' ? 'col-span-full' : 'w-full', 'flex items-center justify-between mb-2')}>
                  <div className="text-xs text-zinc-500">
                    <span className="font-medium text-zinc-300">{filteredProjects.length}</span> of <span className="font-medium text-zinc-300">{projects.length}</span> project{projects.length !== 1 ? 's' : ''}
                    {libraryBatchMode && selectedLibraryProjectIds.size > 0 && (
                      <span className="ml-2 text-amber-400">
                        • <span className="font-medium">{selectedLibraryProjectIds.size}</span> selected
                      </span>
                    )}
                    {(libraryFilterGenre || libraryFilterTags.length > 0 || libraryFilterHasCover !== null || libraryFilterSceneCount !== null || libraryFilterFavorites !== null) && (
                      <span className="ml-2 text-zinc-600">
                        • Filtered
                      </span>
                    )}
                  </div>
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
                    className={cn(
                      'bg-zinc-900 border rounded-xl overflow-hidden transition-all relative group flex flex-col',
                      libraryBatchMode ? 'cursor-pointer' : 'cursor-pointer hover:border-zinc-600',
                      getSelectedClassName(isSelected),
                      libraryViewMode === 'grid' 
                        ? getCardHeightClass(libraryCardSize)
                        : 'flex-row min-h-[120px]'
                    )}
                  >
                    {libraryViewMode === 'grid' ? (
                      <>
                        {/* Cover Image */}
                        {p.context.coverImageUrl ? (
                          <div className={cn('w-full bg-zinc-950 overflow-hidden', getCoverImageHeightClass(libraryCardSize))}>
                            <LazyImage
                              src={getImageUrl(p.context.coverImageUrl)}
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
                            <div className={cn('w-6 h-6 rounded border-2 flex items-center justify-center transition-all', getCheckboxClassName(isSelected))}>
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
                              await toggleProjectFavorite(
                                p.context.id,
                                favoritedProjects.has(p.context.id),
                                favoritesService,
                                setFavoritedProjects,
                                showToast
                              );
                            }}
                            className={getFavoriteButtonClassName(
                              favoritedProjects.has(p.context.id),
                              libraryBatchMode,
                              'top-left'
                            )}
                            title={favoritedProjects.has(p.context.id) ? 'Remove from favorites' : 'Add to favorites'}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                              <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
                            </svg>
                          </button>
                        )}

                        <div className="p-6 flex-1 flex flex-col">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="text-lg font-serif font-bold text-white line-clamp-1 flex-1">
                              {librarySearchTerm ? highlightSearchTerm(p.context.title, librarySearchTerm) : p.context.title}
                            </h3>
                            {p.context.contentType && (
                              <span className={cn('text-xs px-2 py-0.5 rounded border flex items-center gap-1 flex-shrink-0', getContentTypeBadgeClass(p.context.contentType))}>
                                <span>{getContentTypeInfo(p.context.contentType).icon}</span>
                                <span className="hidden sm:inline">{getContentTypeInfo(p.context.contentType).name}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-amber-500 uppercase tracking-wider mb-4">
                            {librarySearchTerm && p.context.genre ? highlightSearchTerm(p.context.genre, librarySearchTerm) : p.context.genre}
                          </p>
                          <p className="text-sm text-zinc-500 line-clamp-3 mb-4 flex-1">
                            {librarySearchTerm && p.context.plotSummary ? highlightAndTruncate(p.context.plotSummary, librarySearchTerm, 150) : (p.context.plotSummary || '')}
                          </p>
                          
                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800/50">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-zinc-600">
                                {formatDate(p.context.lastUpdated)}
                              </span>
                              {p.scenes.length > 0 && (
                                <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                                  {formatSceneCount(p.scenes.length)}
                                </span>
                              )}
                              {hasCompletedScenes(p) && (
                                <span className={cn('text-[10px] px-2 py-0.5 rounded border', getStatusBadgeClassName('completed'))}>
                                  {getCompletedScenesCount(p.scenes)} Done
                                </span>
                              )}
                            </div>
                            {!p.context.coverImageUrl && (
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  await generateProjectCover(p.context.id, apiService, setProjects, showToast);
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
                              src={getImageUrl(p.context.coverImageUrl)}
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
                              <span className="text-xs text-zinc-500">{formatDate(p.context.lastUpdated)}</span>
                              {p.scenes.length > 0 && (
                                <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                                  {formatSceneCount(p.scenes.length)}
                                </span>
                              )}
                              {hasCompletedScenes(p) && (
                                <span className={cn('text-xs px-2 py-0.5 rounded border', getStatusBadgeClassName('completed'))}>
                                  {getCompletedScenesCount(p.scenes)} Done
                                </span>
                              )}
                              {!p.context.coverImageUrl && (
                                <button
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    await generateProjectCover(p.context.id, apiService, setProjects, showToast);
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
                    {/* Favorite Button for List View */}
                    <button
                      onClick={async (e) => {
                        e.stopPropagation();
                        await toggleProjectFavorite(
                          p.context.id,
                          favoritedProjects.has(p.context.id),
                          favoritesService,
                          setFavoritedProjects,
                          showToast
                        );
                      }}
                      className={cn('absolute top-4 left-4 p-1.5 rounded transition-all', favoritedProjects.has(p.context.id)
                        ? 'bg-amber-600/20 text-amber-400 opacity-100'
                        : 'bg-zinc-900/80 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-amber-400')}
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
                            await generateProjectCover(p.context.id, apiService, (projects) => {}, showToast);
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
          )}
        </div>
      </main>
    </div>
  );
};

export default LibraryView;

