import { useState, useEffect } from 'react';

export type LibraryViewMode = 'grid' | 'list';
export type LibrarySortBy = 'date' | 'title' | 'genre' | 'scenes' | 'updated' | 'favorites' | 'health' | 'contentType';
export type LibrarySortOrder = 'asc' | 'desc';
export type LibraryCardSize = 'small' | 'medium' | 'large';

export interface FilterPreset {
  id: string;
  name: string;
  filters: {
    genre?: string;
    tags?: string[];
    hasCover?: boolean | null;
    sceneCount?: { min?: number; max?: number } | null;
    favorites?: boolean | null;
    contentType?: string | null;
  };
}

export const useLibraryState = () => {
  const [libraryViewMode, setLibraryViewMode] = useState<LibraryViewMode>(() => {
    const saved = localStorage.getItem('library_view_mode');
    return (saved as LibraryViewMode) || 'grid';
  });
  const [librarySortBy, setLibrarySortBy] = useState<LibrarySortBy>(() => {
    const saved = localStorage.getItem('library_sort_by');
    return (saved as LibrarySortBy) || 'date';
  });
  const [librarySortOrder, setLibrarySortOrder] = useState<LibrarySortOrder>(() => {
    const saved = localStorage.getItem('library_sort_order');
    return (saved as LibrarySortOrder) || 'desc';
  });
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(() => {
    const saved = localStorage.getItem('library_show_advanced_search');
    return saved === 'true';
  });
  const [libraryFilterGenre, setLibraryFilterGenre] = useState('');
  const [libraryFilterTags, setLibraryFilterTags] = useState<string[]>([]);
  const [libraryFilterHasCover, setLibraryFilterHasCover] = useState<boolean | null>(null);
  const [libraryFilterSceneCount, setLibraryFilterSceneCount] = useState<{ min?: number; max?: number } | null>(null);
  const [libraryFilterFavorites, setLibraryFilterFavorites] = useState<boolean | null>(null);
  const [libraryFilterContentType, setLibraryFilterContentType] = useState<string | null>(null);
  const [libraryCardSize, setLibraryCardSize] = useState<LibraryCardSize>(() => {
    const saved = localStorage.getItem('library_card_size');
    return (saved as LibraryCardSize) || 'medium';
  });
  const [filterPresets, setFilterPresets] = useState<FilterPreset[]>(() => {
    const saved = localStorage.getItem('library_filter_presets');
    return saved ? JSON.parse(saved) : [];
  });
  const [libraryBatchMode, setLibraryBatchMode] = useState(false);
  const [selectedLibraryProjectIds, setSelectedLibraryProjectIds] = useState<Set<string>>(new Set());
  const [showFilterPresetsDropdown, setShowFilterPresetsDropdown] = useState(false);

  // Persist view mode changes
  useEffect(() => {
    localStorage.setItem('library_view_mode', libraryViewMode);
  }, [libraryViewMode]);

  // Persist sort changes
  useEffect(() => {
    localStorage.setItem('library_sort_by', librarySortBy);
    localStorage.setItem('library_sort_order', librarySortOrder);
  }, [librarySortBy, librarySortOrder]);

  // Persist advanced search visibility
  useEffect(() => {
    localStorage.setItem('library_show_advanced_search', showAdvancedSearch.toString());
  }, [showAdvancedSearch]);

  // Persist card size
  useEffect(() => {
    localStorage.setItem('library_card_size', libraryCardSize);
  }, [libraryCardSize]);

  // Persist filter presets
  useEffect(() => {
    localStorage.setItem('library_filter_presets', JSON.stringify(filterPresets));
  }, [filterPresets]);

  return {
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
  };
};

