import React, { useEffect, useRef } from 'react';
import { Scene } from '../types';

interface QuickActionsMenuProps {
  scene: Scene;
  position: { x: number; y: number };
  onClose: () => void;
  onDuplicate: (scene: Scene) => void;
  onCopySettings: (scene: Scene) => void;
  onDelete: (sceneId: string) => void;
  onEdit: (scene: Scene) => void;
  onExport: (scene: Scene) => void;
  onBookmark?: () => void;
  isBookmarked?: boolean;
}

const QuickActionsMenu: React.FC<QuickActionsMenuProps> = ({
  scene,
  position,
  onClose,
  onDuplicate,
  onCopySettings,
  onDelete,
  onEdit,
  onExport,
  onBookmark,
  isBookmarked = false
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to keep menu in viewport
  const adjustedPosition = {
    x: Math.min(position.x, window.innerWidth - 200),
    y: Math.min(position.y, window.innerHeight - 300),
  };

  const handleAction = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl py-2 min-w-[200px]"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`,
      }}
    >
      <div className="px-2 py-1.5 text-xs text-zinc-500 border-b border-zinc-800 mb-1">
        Scene {scene.sequenceNumber}
      </div>
      
      <button
        onClick={() => handleAction(() => onEdit(scene))}
        className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
        </svg>
        Edit Scene
      </button>

      <button
        onClick={() => handleAction(() => onDuplicate(scene))}
        className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" />
          <path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h10a2 2 0 00-2-2H5z" />
        </svg>
        Duplicate Scene
      </button>

      <button
        onClick={() => handleAction(() => onCopySettings(scene))}
        className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M8 2a1 1 0 000 2h2a1 1 0 100-2H8z" />
          <path d="M3 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v6h-4.586l1.293-1.293a1 1 0 00-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L10.414 13H15v3a2 2 0 01-2 2H5a2 2 0 01-2-2V5zM15 11h2a1 1 0 100-2h-2v2z" />
        </svg>
        Copy Settings
      </button>

      <div className="border-t border-zinc-800 my-1"></div>

      <button
        onClick={() => handleAction(() => onExport(scene))}
        className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white flex items-center gap-2 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
        Export Scene
      </button>

      {onBookmark && (
        <>
          <div className="border-t border-zinc-800 my-1"></div>
          <button
            onClick={() => handleAction(onBookmark)}
            className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
              isBookmarked
                ? 'text-amber-400 hover:bg-amber-900/20 hover:text-amber-300'
                : 'text-violet-400 hover:bg-violet-900/20 hover:text-violet-300'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 2c-1.716 0-3.408.106-5.07.31C3.806 2.45 3 3.414 3 4.517V17.25a.75.75 0 001.075.676L10 15.082l5.925 2.844A.75.75 0 0017 17.25V4.517c0-1.103-.806-2.068-1.93-2.207A41.403 41.403 0 0010 2z" clipRule="evenodd" />
            </svg>
            {isBookmarked ? 'Remove Bookmark' : 'Bookmark'}
          </button>
        </>
      )}

      <div className="border-t border-zinc-800 my-1"></div>

      <button
        onClick={() => {
          if (window.confirm(`Delete Scene ${scene.sequenceNumber}?`)) {
            handleAction(() => onDelete(scene.id));
          }
        }}
        className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-900/20 hover:text-red-300 flex items-center gap-2 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Delete Scene
      </button>
    </div>
  );
};

export default QuickActionsMenu;

