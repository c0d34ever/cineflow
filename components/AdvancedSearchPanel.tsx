import React, { useState, useEffect, useMemo } from 'react';
import { Scene, ProjectData } from '../types';
import { savedSearchesService, tagsService, charactersService, locationsService } from '../apiServices';
import { exportToCSV } from '../utils/exportUtils';

interface AdvancedSearchPanelProps {
  projects: ProjectData[];
  scenes: Scene[];
  currentProjectId?: string;
  onClose: () => void;
  onSelectProject?: (projectId: string) => void;
  onSelectScene?: (sceneId: string, projectId: string) => void;
}

interface SearchResult {
  type: 'project' | 'scene';
  id: string;
  projectId?: string;
  title?: string;
  content: string;
  matchType: 'title' | 'prompt' | 'dialogue' | 'character' | 'location' | 'context';
  scene?: Scene;
  project?: ProjectData;
}

const AdvancedSearchPanel: React.FC<AdvancedSearchPanelProps> = ({
  projects,
  scenes,
  currentProjectId,
  onClose,
  onSelectProject,
  onSelectScene,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchScope, setSearchScope] = useState<'all' | 'current' | 'projects'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedResultIndex, setSelectedResultIndex] = useState(0);
  
  // Enhanced filters
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [selectedCharacters, setSelectedCharacters] = useState<string[]>([]);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start?: string; end?: string }>({});
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Saved searches
  const [savedSearches, setSavedSearches] = useState<any[]>([]);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  const [showSaveSearchModal, setShowSaveSearchModal] = useState(false);
  const [saveSearchName, setSaveSearchName] = useState('');
  
  // Available options for filters
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [availableCharacters, setAvailableCharacters] = useState<any[]>([]);
  const [availableLocations, setAvailableLocations] = useState<any[]>([]);

  // Search across projects and scenes
  const performSearch = useMemo(() => {
    if (!searchQuery.trim()) {
      return () => [];
    }

    return () => {
      const query = searchQuery.toLowerCase().trim();
      const searchResults: SearchResult[] = [];

      // Search in projects
      if (searchScope === 'all' || searchScope === 'projects') {
        projects.forEach((project) => {
          const context = project.context;
          let matched = false;
          let matchType: SearchResult['matchType'] = 'title';

          // Search in title
          if (context.title.toLowerCase().includes(query)) {
            matched = true;
            matchType = 'title';
          }

          // Search in plot summary
          if (context.plotSummary?.toLowerCase().includes(query)) {
            matched = true;
            matchType = 'title';
          }

          // Search in characters
          if (context.characters?.toLowerCase().includes(query)) {
            matched = true;
            matchType = 'character';
          }

          if (matched) {
            searchResults.push({
              type: 'project',
              id: context.id,
              projectId: context.id,
              title: context.title,
              content: context.title,
              matchType,
              project,
            });
          }
        });
      }

      // Search in scenes
      const scenesToSearch = searchScope === 'current' && currentProjectId
        ? scenes
        : searchScope === 'all'
        ? scenes
        : [];

      scenesToSearch.forEach((scene) => {
        let matched = false;
        let matchType: SearchResult['matchType'] = 'prompt';
        let content = '';

        // Search in enhanced prompt
        if (scene.enhancedPrompt?.toLowerCase().includes(query)) {
          matched = true;
          matchType = 'prompt';
          content = scene.enhancedPrompt;
        }

        // Search in dialogue
        if (scene.directorSettings.dialogue?.toLowerCase().includes(query)) {
          matched = true;
          matchType = 'dialogue';
          content = scene.directorSettings.dialogue;
        }

        // Search in context summary
        if (scene.contextSummary?.toLowerCase().includes(query)) {
          matched = true;
          matchType = 'context';
          content = scene.contextSummary;
        }

        // Search in raw idea
        if (scene.rawIdea?.toLowerCase().includes(query)) {
          matched = true;
          matchType = 'prompt';
          content = scene.rawIdea;
        }

        // Filter by status
        if (matched && filterStatus !== 'all' && scene.status !== filterStatus) {
          matched = false;
        }

        if (matched) {
          const project = projects.find(p => p.context.id === currentProjectId);
          searchResults.push({
            type: 'scene',
            id: scene.id,
            projectId: currentProjectId,
            title: `Scene ${scene.sequenceNumber}`,
            content: content || scene.enhancedPrompt || '',
            matchType,
            scene,
            project,
          });
        }
      });

      // Filter by type
      if (filterType !== 'all') {
        return searchResults.filter(r => r.type === filterType);
      }

      // Apply additional filters (tags, characters, locations, date range)
      // Note: Full tag/character/location filtering would require loading associations for all projects/scenes
      // For now, we apply basic filtering where data is available
      
      let filteredResults = searchResults;

      // Filter by date range if specified
      if (dateRange.start || dateRange.end) {
        filteredResults = filteredResults.filter(result => {
          if (result.type === 'scene' && result.scene) {
            const sceneDate = new Date(result.scene.created_at || 0);
            if (dateRange.start && sceneDate < new Date(dateRange.start)) return false;
            if (dateRange.end && sceneDate > new Date(dateRange.end + 'T23:59:59')) return false;
          }
          return true;
        });
      }

      return filteredResults;
    };
  }, [searchQuery, searchScope, filterStatus, filterType, selectedTags, selectedCharacters, selectedLocations, dateRange, projects, scenes, currentProjectId]);

  // Load saved searches and filter options
  useEffect(() => {
    loadSavedSearches();
    if (currentProjectId) {
      loadFilterOptions();
    }
  }, [currentProjectId]);

  const loadSavedSearches = async () => {
    try {
      const searches = await savedSearchesService.getAll();
      setSavedSearches(Array.isArray(searches) ? searches : []);
    } catch (error) {
      console.error('Failed to load saved searches:', error);
    }
  };

  const loadFilterOptions = async () => {
    if (!currentProjectId) return;
    try {
      const [tags, characters, locations] = await Promise.all([
        tagsService.getAll().catch(() => ({ tags: [] })),
        charactersService.getByProject(currentProjectId).catch(() => []),
        locationsService.getByProject(currentProjectId).catch(() => [])
      ]);
      setAvailableTags(Array.isArray(tags) ? tags : (tags.tags || []));
      setAvailableCharacters(Array.isArray(characters) ? characters : []);
      setAvailableLocations(Array.isArray(locations) ? locations : []);
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  useEffect(() => {
    const searchResults = performSearch();
    setResults(searchResults);
    setSelectedResultIndex(0);
  }, [performSearch]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedResultIndex(prev => Math.min(prev + 1, results.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedResultIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && results[selectedResultIndex]) {
        e.preventDefault();
        handleSelectResult(results[selectedResultIndex]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [results, selectedResultIndex]);

  const handleSelectResult = (result: SearchResult) => {
    if (result.type === 'project' && onSelectProject && result.projectId) {
      onSelectProject(result.projectId);
      onClose();
    } else if (result.type === 'scene' && onSelectScene && result.projectId) {
      onSelectScene(result.id, result.projectId);
      onClose();
    }
  };

  const handleSaveSearch = async () => {
    if (!saveSearchName.trim()) return;
    try {
      const filters = {
        scope: searchScope,
        type: filterType,
        status: filterStatus,
        tags: selectedTags,
        characters: selectedCharacters,
        locations: selectedLocations,
        dateRange
      };
      await savedSearchesService.create({
        name: saveSearchName.trim(),
        search_query: searchQuery,
        filters
      });
      setShowSaveSearchModal(false);
      setSaveSearchName('');
      await loadSavedSearches();
    } catch (error: any) {
      alert('Failed to save search: ' + (error.message || 'Unknown error'));
    }
  };

  const handleLoadSavedSearch = async (savedSearch: any) => {
    try {
      setSearchQuery(savedSearch.search_query || '');
      const filters = savedSearch.filters ? (typeof savedSearch.filters === 'string' ? JSON.parse(savedSearch.filters) : savedSearch.filters) : {};
      setSearchScope(filters.scope || 'all');
      setFilterType(filters.type || 'all');
      setFilterStatus(filters.status || 'all');
      setSelectedTags(filters.tags || []);
      setSelectedCharacters(filters.characters || []);
      setSelectedLocations(filters.locations || []);
      setDateRange(filters.dateRange || {});
      await savedSearchesService.recordUsage(savedSearch.id);
      await loadSavedSearches();
    } catch (error) {
      console.error('Failed to load saved search:', error);
    }
  };

  const handleDeleteSavedSearch = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this saved search?')) return;
    try {
      await savedSearchesService.delete(id);
      await loadSavedSearches();
    } catch (error) {
      alert('Failed to delete saved search');
    }
  };

  const handleExportResults = () => {
    const exportData = results.map(r => ({
      Type: r.type,
      Title: r.title || `Scene ${r.scene?.sequenceNumber}`,
      Match: r.matchType,
      Content: r.content.substring(0, 200),
      Status: r.scene?.status || '',
      Project: r.project?.context.title || ''
    }));
    exportToCSV(exportData, `search-results-${Date.now()}.csv`);
  };

  const highlightMatch = (text: string, query: string): React.ReactNode => {
    if (!query) return text;
    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-500/30 text-amber-200">{part}</mark>
      ) : (
        part
      )
    );
  };

  const getMatchTypeIcon = (type: SearchResult['matchType']): string => {
    switch (type) {
      case 'title':
        return '📄';
      case 'prompt':
        return '🎬';
      case 'dialogue':
        return '💬';
      case 'character':
        return '👤';
      case 'location':
        return '📍';
      case 'context':
        return '🔗';
      default:
        return '🔍';
    }
  };

  const getMatchTypeLabel = (type: SearchResult['matchType']): string => {
    switch (type) {
      case 'title':
        return 'Title';
      case 'prompt':
        return 'Scene Prompt';
      case 'dialogue':
        return 'Dialogue';
      case 'character':
        return 'Character';
      case 'location':
        return 'Location';
      case 'context':
        return 'Context';
      default:
        return 'Match';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex m-2 sm:m-0">
        {/* Saved Searches Sidebar */}
        {showSavedSearches && (
          <div className="w-64 border-r border-zinc-800 flex flex-col">
            <div className="p-3 border-b border-zinc-800 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Saved Searches</h3>
              <button
                onClick={() => setShowSavedSearches(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {savedSearches.length === 0 ? (
                <div className="text-center py-8 text-zinc-500 text-xs">
                  No saved searches yet
                </div>
              ) : (
                <div className="space-y-1">
                  {savedSearches.map(search => (
                    <div
                      key={search.id}
                      onClick={() => handleLoadSavedSearch(search)}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded cursor-pointer group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-semibold text-white truncate">
                            {search.name}
                          </div>
                          {search.search_query && (
                            <div className="text-xs text-zinc-400 truncate mt-1">
                              {search.search_query}
                            </div>
                          )}
                          <div className="text-xs text-zinc-500 mt-1">
                            Used {search.use_count || 0} times
                          </div>
                        </div>
                        <button
                          onClick={(e) => handleDeleteSavedSearch(search.id, e)}
                          className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 ml-2"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Search Panel */}
        <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <h2 className="text-lg sm:text-xl font-bold text-white">Advanced Search</h2>
            <button
              onClick={() => setShowSavedSearches(!showSavedSearches)}
              className="text-xs px-2 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300"
              title="Saved Searches"
            >
              💾 {savedSearches.length}
            </button>
          </div>
          <div className="flex items-center gap-2">
            {results.length > 0 && (
              <button
                onClick={handleExportResults}
                className="text-xs px-2 py-1 bg-amber-600 hover:bg-amber-700 rounded text-white"
                title="Export Results"
              >
                Export
              </button>
            )}
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-zinc-800">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search projects, scenes, dialogue, characters..."
              className="w-full px-4 py-3 pl-10 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-zinc-800 space-y-3">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Scope</label>
              <select
                value={searchScope}
                onChange={(e) => setSearchScope(e.target.value as any)}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All Projects</option>
                <option value="current">Current Project</option>
                <option value="projects">Projects Only</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-zinc-400 mb-1 block">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="all">All</option>
                <option value="project">Projects</option>
                <option value="scene">Scenes</option>
              </select>
            </div>

            {searchScope === 'current' && (
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                >
                  <option value="all">All Status</option>
                  <option value="planning">Planning</option>
                  <option value="generating">Generating</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            )}

            <button
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className="text-xs px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 mt-6"
            >
              {showAdvancedFilters ? '▼' : '▶'} Advanced Filters
            </button>

            {searchQuery.trim() && (
              <button
                onClick={() => setShowSaveSearchModal(true)}
                className="text-xs px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded text-white mt-6"
              >
                Save Search
              </button>
            )}
          </div>

          {/* Advanced Filters */}
          {showAdvancedFilters && currentProjectId && (
            <div className="mt-4 pt-4 border-t border-zinc-700 space-y-3">
              {availableTags.length > 0 && (
                <div>
                  <label className="text-xs text-zinc-400 mb-2 block">Tags</label>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => (
                      <button
                        key={tag.id}
                        onClick={() => {
                          setSelectedTags(prev => 
                            prev.includes(tag.id) 
                              ? prev.filter(id => id !== tag.id)
                              : [...prev, tag.id]
                          );
                        }}
                        className={`text-xs px-2 py-1 rounded ${
                          selectedTags.includes(tag.id)
                            ? 'bg-amber-600 text-white'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {availableCharacters.length > 0 && (
                <div>
                  <label className="text-xs text-zinc-400 mb-2 block">Characters</label>
                  <div className="flex flex-wrap gap-2">
                    {availableCharacters.map(char => (
                      <button
                        key={char.id || char.name}
                        onClick={() => {
                          const name = char.name || char.id;
                          setSelectedCharacters(prev => 
                            prev.includes(name)
                              ? prev.filter(n => n !== name)
                              : [...prev, name]
                          );
                        }}
                        className={`text-xs px-2 py-1 rounded ${
                          selectedCharacters.includes(char.name || char.id)
                            ? 'bg-amber-600 text-white'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {char.name || char.id}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {availableLocations.length > 0 && (
                <div>
                  <label className="text-xs text-zinc-400 mb-2 block">Locations</label>
                  <div className="flex flex-wrap gap-2">
                    {availableLocations.map(loc => (
                      <button
                        key={loc.id || loc.name}
                        onClick={() => {
                          const name = loc.name || loc.id;
                          setSelectedLocations(prev => 
                            prev.includes(name)
                              ? prev.filter(n => n !== name)
                              : [...prev, name]
                          );
                        }}
                        className={`text-xs px-2 py-1 rounded ${
                          selectedLocations.includes(loc.name || loc.id)
                            ? 'bg-amber-600 text-white'
                            : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                        }`}
                      >
                        {loc.name || loc.id}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Date From</label>
                  <input
                    type="date"
                    value={dateRange.start || ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-400 mb-1 block">Date To</label>
                  <input
                    type="date"
                    value={dateRange.end || ''}
                    onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-sm text-white"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {searchQuery.trim() === '' ? (
            <div className="text-center py-12 text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <p className="text-lg">Start typing to search</p>
              <p className="text-sm mt-2">Search across projects, scenes, dialogue, and more</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-lg">No results found</p>
              <p className="text-sm mt-2">Try different keywords or adjust filters</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-zinc-400 mb-3">
                {results.length} result{results.length !== 1 ? 's' : ''} found
              </div>
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => handleSelectResult(result)}
                  className={`w-full text-left p-4 rounded-lg border transition-all ${
                    index === selectedResultIndex
                      ? 'bg-amber-900/20 border-amber-500/50'
                      : 'bg-zinc-800 border-zinc-700 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-2xl">{getMatchTypeIcon(result.matchType)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white">
                          {result.type === 'project' ? result.title : `Scene ${result.scene?.sequenceNumber}`}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded bg-zinc-700 text-zinc-300">
                          {getMatchTypeLabel(result.matchType)}
                        </span>
                        {result.type === 'scene' && result.scene && (
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            result.scene.status === 'completed' ? 'bg-green-900/30 text-green-400' :
                            result.scene.status === 'generating' ? 'bg-blue-900/30 text-blue-400' :
                            result.scene.status === 'planning' ? 'bg-yellow-900/30 text-yellow-400' :
                            'bg-red-900/30 text-red-400'
                          }`}>
                            {result.scene.status}
                          </span>
                        )}
                      </div>
                      {result.project && result.type === 'scene' && (
                        <div className="text-xs text-zinc-400 mb-2">
                          {result.project.context.title}
                        </div>
                      )}
                      <div className="text-sm text-zinc-300 line-clamp-2">
                        {highlightMatch(result.content.substring(0, 200), searchQuery)}
                        {result.content.length > 200 && '...'}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <div className="flex items-center gap-4">
            <span>↑↓ Navigate</span>
            <span>Enter Select</span>
            <span>Esc Close</span>
          </div>
          {results.length > 0 && (
            <div>
              {selectedResultIndex + 1} of {results.length}
            </div>
          )}
        </div>
        </div>
      </div>

      {/* Save Search Modal */}
      {showSaveSearchModal && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Save Search</h3>
            <input
              type="text"
              value={saveSearchName}
              onChange={(e) => setSaveSearchName(e.target.value)}
              placeholder="Search name..."
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded text-white mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveSearch();
                if (e.key === 'Escape') setShowSaveSearchModal(false);
              }}
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveSearch}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded text-white"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowSaveSearchModal(false);
                  setSaveSearchName('');
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedSearchPanel;

