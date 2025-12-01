import React, { useState, useEffect } from 'react';
import { Scene } from '../types';
import QuickActionsMenu from './QuickActionsMenu';
import { sceneBookmarksService } from '../apiServices';

// Import showToast if available, otherwise use a simple callback
let showToastCallback: ((message: string, type: 'success' | 'error' | 'info' | 'warning') => void) | null = null;

export const setShowToast = (callback: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void) => {
  showToastCallback = callback;
};

interface QuickActionsMenuWrapperProps {
  scene: Scene;
  position: { x: number; y: number };
  projectId: string | undefined;
  onClose: () => void;
  onDuplicate: (scene: Scene) => void;
  onCopySettings: (scene: Scene) => void;
  onDelete: (sceneId: string) => void;
  onEdit: (scene: Scene) => void;
  onExport: (scene: Scene) => void;
  onBookmarkUpdate?: () => void;
}

const QuickActionsMenuWrapper: React.FC<QuickActionsMenuWrapperProps> = ({
  scene,
  position,
  projectId,
  onClose,
  onDuplicate,
  onCopySettings,
  onDelete,
  onEdit,
  onExport,
  onBookmarkUpdate
}) => {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkBookmark = async () => {
      if (!projectId) {
        setLoading(false);
        return;
      }
      try {
        const bookmarks = await sceneBookmarksService.getByProject(projectId);
        const bookmark = (bookmarks as any).bookmarks?.find((b: any) => b.scene_id === scene.id);
        setIsBookmarked(!!bookmark);
      } catch (error) {
        // Ignore errors
      } finally {
        setLoading(false);
      }
    };
    checkBookmark();
  }, [scene.id, projectId]);

  const handleBookmark = async () => {
    if (!projectId) return;
    try {
      if (isBookmarked) {
        const bookmarks = await sceneBookmarksService.getByProject(projectId);
        const bookmark = (bookmarks as any).bookmarks?.find((b: any) => b.scene_id === scene.id);
        if (bookmark) {
          await sceneBookmarksService.delete(bookmark.id);
          setIsBookmarked(false);
          if (showToastCallback) showToastCallback('Bookmark removed', 'success');
          onBookmarkUpdate?.();
        }
      } else {
        await sceneBookmarksService.create({
          project_id: projectId,
          scene_id: scene.id,
          category: 'general'
        });
        setIsBookmarked(true);
        if (showToastCallback) showToastCallback('Scene bookmarked', 'success');
        onBookmarkUpdate?.();
      }
    } catch (error: any) {
      console.error('Failed to update bookmark:', error);
      if (showToastCallback) showToastCallback('Failed to update bookmark', 'error');
    }
  };

  if (loading) {
    return null; // Don't show menu while checking bookmark status
  }

  return (
    <QuickActionsMenu
      scene={scene}
      position={position}
      onClose={onClose}
      onDuplicate={onDuplicate}
      onCopySettings={onCopySettings}
      onDelete={onDelete}
      onEdit={onEdit}
      onExport={onExport}
      onBookmark={handleBookmark}
      isBookmarked={isBookmarked}
    />
  );
};

export default QuickActionsMenuWrapper;

