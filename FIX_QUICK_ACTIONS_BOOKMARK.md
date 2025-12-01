# Fix Quick Actions Bookmark Integration

The QuickActionsMenu in App.tsx currently uses an async function in the render, which won't work properly. It needs to be replaced with the QuickActionsMenuWrapper component.

## Current Issue
Line 3450 in App.tsx has:
```typescript
{quickActionsMenu && (async () => {
  // async code...
  return <QuickActionsMenu ... />
})()}
```

This pattern doesn't work in React - async functions in render return Promises, not JSX.

## Solution
Replace with QuickActionsMenuWrapper component that handles bookmark state properly.

## Manual Fix Required
Replace lines 3449-3520 in App.tsx with:

```typescript
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
```

