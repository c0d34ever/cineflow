import React, { useState } from 'react';

interface ProjectDuplicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (options: {
    includeScenes: boolean;
    includeMedia: boolean;
    newTitle: string;
  }) => Promise<void>;
  projectTitle: string;
}

const ProjectDuplicateModal: React.FC<ProjectDuplicateModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  projectTitle
}) => {
  const [includeScenes, setIncludeScenes] = useState(true);
  const [includeMedia, setIncludeMedia] = useState(false);
  const [newTitle, setNewTitle] = useState(`${projectTitle} (Copy)`);
  const [isDuplicating, setIsDuplicating] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDuplicating(true);
    try {
      await onConfirm({
        includeScenes,
        includeMedia,
        newTitle: newTitle.trim() || `${projectTitle} (Copy)`
      });
      onClose();
    } catch (error) {
      console.error('Error duplicating project:', error);
    } finally {
      setIsDuplicating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-md shadow-xl">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Duplicate Project</h2>
          <p className="text-zinc-400 mb-6">
            Create a copy of <span className="font-semibold text-white">{projectTitle}</span>
          </p>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                New Project Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                placeholder="Enter new project title"
                autoFocus
              />
            </div>

            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeScenes}
                  onChange={(e) => setIncludeScenes(e.target.checked)}
                  className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                />
                <div className="flex-1">
                  <div className="text-white font-medium">Include Scenes</div>
                  <div className="text-sm text-zinc-400">
                    Copy all scenes with their prompts and settings
                  </div>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeMedia}
                  onChange={(e) => setIncludeMedia(e.target.checked)}
                  className="w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 focus:ring-offset-zinc-900"
                />
                <div className="flex-1">
                  <div className="text-white font-medium">Include Media</div>
                  <div className="text-sm text-zinc-400">
                    Copy all images and media files (may take longer)
                  </div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              onClick={onClose}
              disabled={isDuplicating}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={isDuplicating || !newTitle.trim()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isDuplicating ? (
                <>
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Duplicating...
                </>
              ) : (
                'Duplicate Project'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDuplicateModal;

