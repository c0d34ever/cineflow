# LibraryView Component Extraction Plan

## Overview
The library view in `App.tsx` (lines 1409-2577, ~1,168 lines) will be extracted into a separate `modules/LibraryView.tsx` component.

## Component Props Interface

The `LibraryView` component will accept the following props:

### Data Props
- `projects: ProjectData[]` - All projects
- `filteredProjects: ProjectData[]` - Filtered and sorted projects
- `favoritedProjects: Set<string>` - Set of favorited project IDs
- `availableTags: any[]` - Available tags for filtering
- `currentUser: any` - Current user object

### State Props (from useLibraryState hook)
- All library state getters and setters from `useLibraryState` hook

### Handler Props
- `handleOpenProject: (project: ProjectData) => void`
- `handleDuplicateProject: (e: React.MouseEvent, project: ProjectData) => void`
- `handleArchiveProject: (e: React.MouseEvent, projectId: string, archived: boolean) => void`
- `handleDeleteProject: (e: React.MouseEvent, id: string) => void`
- `handleCreateNew: () => void`
- `handleImportClick: () => void`
- `handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void`
- `handleLogout: () => void`
- `setView: (view: 'library' | 'setup' | 'studio' | 'dashboard' | 'timeline') => void`
- `setShowBulkTagAssigner: (show: boolean) => void`
- `setProjectQuickActions: (actions: { project: ProjectData; position: { x: number; y: number } } | null) => void`
- `setSelectedProjectForSharing: (project: ProjectData | null) => void`
- `setShowSharingModal: (show: boolean) => void`
- `setShowSettingsPanel: (show: boolean) => void`
- `setShowNotificationCenter: (show: boolean) => void`
- `loadNotifications: () => Promise<void>`
- `setFavoritedProjects: (projects: Set<string> | ((prev: Set<string>) => Set<string>)) => void`
- `setProjects: (projects: ProjectData[]) => void`
- `showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void`
- `setBatchGeneratingCovers: (generating: boolean) => void`
- `batchGeneratingCovers: boolean`

### UI State Props
- `theme: 'dark' | 'light'`
- `setTheme: (theme: 'dark' | 'light') => void`
- `unreadNotificationCount: number`
- `fileInputRef: React.RefObject<HTMLInputElement>`

### Utility Functions
- `apiService` - API service instance
- `favoritesService` - Favorites service instance

## Implementation Steps

1. Create `modules/LibraryView.tsx` with all necessary imports
2. Define the component interface with all props
3. Copy the JSX from `App.tsx` (lines 1410-2576)
4. Replace all state/handler references with props
5. Update `App.tsx` to import and use `LibraryView`
6. Pass all necessary props from `App.tsx` to `LibraryView`
7. Test to ensure all functionality works

## Expected Benefits

- **App.tsx size reduction**: ~1,168 lines removed
- **Better organization**: Library view logic isolated
- **Easier maintenance**: Changes to library view don't affect other views
- **Potential for lazy loading**: Can lazy load LibraryView component

## Files to Create/Modify

1. **Create**: `modules/LibraryView.tsx` (~1,200 lines)
2. **Modify**: `App.tsx` - Replace library view JSX with `<LibraryView ... />` component

