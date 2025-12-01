import React, { useState, useEffect } from 'react';
import { Scene } from '../types';

interface SceneBookmark {
  id: number;
  project_id: string;
  scene_id: string;
  category: 'general' | 'important' | 'review' | 'edit';
  notes: string;
  created_at: string;
}

interface SceneBookmarksPanelProps {
  projectId: string;
  scenes: Scene[];
  onClose: () => void;
  onNavigateToScene: (sceneId: string) => void;
}

const categoryColors = {
  general: 'bg-blue-900/30 text-blue-400 border-blue-500/50',
  important: 'bg-red-900/30 text-red-400 border-red-500/50',
  review: 'bg-yellow-900/30 text-yellow-400 border-yellow-500/50',
  edit: 'bg-purple-900/30 text-purple-400 border-purple-500/50'
};

const SceneBookmarksPanel: React.FC<SceneBookmarksPanelProps> = ({
  projectId,
  scenes,
  onClose,
  onNavigateToScene
}) => {
  const [bookmarks, setBookmarks] = useState<SceneBookmark[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'general' | 'important' | 'review' | 'edit'>('all');
  const [editingBookmark, setEditingBookmark] = useState<SceneBookmark | null>(null);
  const [notes, setNotes] = useState('');
  const [category, setCategory] = useState<'general' | 'important' | 'review' | 'edit'>('general');

  useEffect(() => {
    loadBookmarks();
  }, [projectId]);

  const loadBookmarks = async () => {
    setLoading(true);
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('auth_token');

      const response = await fetch(`${API_BASE_URL}/scene-bookmarks/project/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to load bookmarks');

      const data = await response.json();
      setBookmarks(data.bookmarks || []);
    } catch (error) {
      console.error('Failed to load bookmarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBookmark = async (sceneId: string) => {
    const existingBookmark = bookmarks.find(b => b.scene_id === sceneId);
    
    if (existingBookmark) {
      // Remove bookmark
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('auth_token');

        await fetch(`${API_BASE_URL}/scene-bookmarks/scene/${sceneId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        setBookmarks(bookmarks.filter(b => b.scene_id !== sceneId));
      } catch (error) {
        console.error('Failed to remove bookmark:', error);
      }
    } else {
      // Add bookmark
      try {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('auth_token');

        await fetch(`${API_BASE_URL}/scene-bookmarks`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            project_id: projectId,
            scene_id: sceneId,
            category: 'general'
          })
        });

        await loadBookmarks();
      } catch (error) {
        console.error('Failed to add bookmark:', error);
      }
    }
  };

  const handleUpdateBookmark = async () => {
    if (!editingBookmark) return;

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('auth_token');

      await fetch(`${API_BASE_URL}/scene-bookmarks/${editingBookmark.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          category,
          notes
        })
      });

      await loadBookmarks();
      setEditingBookmark(null);
      setNotes('');
      setCategory('general');
    } catch (error) {
      console.error('Failed to update bookmark:', error);
    }
  };

  const filteredBookmarks = selectedCategory === 'all'
    ? bookmarks
    : bookmarks.filter(b => b.category === selectedCategory);

  const getScene = (sceneId: string) => {
    return scenes.find(s => s.id === sceneId);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col m-2 sm:m-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-zinc-800 gap-2 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Scene Bookmarks</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">Mark important scenes for quick access</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="p-3 sm:p-4 border-b border-zinc-800">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-zinc-400">Filter:</span>
            {(['all', 'general', 'important', 'review', 'edit'] as const).map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 text-xs rounded transition-colors ${
                  selectedCategory === cat
                    ? 'bg-amber-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
            </div>
          ) : filteredBookmarks.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p>No bookmarks found</p>
              <p className="text-sm mt-2">
                {selectedCategory === 'all' 
                  ? 'Right-click a scene card and select "Bookmark" to add one'
                  : `No ${selectedCategory} bookmarks`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookmarks.map((bookmark) => {
                const scene = getScene(bookmark.scene_id);
                if (!scene) return null;

                return (
                  <div
                    key={bookmark.id}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs px-2 py-1 rounded border ${categoryColors[bookmark.category]}`}>
                            {bookmark.category}
                          </span>
                          <span className="text-sm font-bold text-white">
                            Scene {scene.sequenceNumber}
                          </span>
                          <button
                            onClick={() => onNavigateToScene(scene.id)}
                            className="text-xs text-amber-400 hover:text-amber-300 underline"
                          >
                            Go to Scene
                          </button>
                        </div>
                        <p className="text-sm text-zinc-300 mb-2 line-clamp-2">{scene.rawIdea}</p>
                        {bookmark.notes && (
                          <p className="text-xs text-zinc-400 italic">"{bookmark.notes}"</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingBookmark(bookmark);
                            setNotes(bookmark.notes || '');
                            setCategory(bookmark.category);
                          }}
                          className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleToggleBookmark(bookmark.scene_id)}
                          className="text-xs px-2 py-1 rounded bg-red-900/30 hover:bg-red-900/50 text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Edit Modal */}
        {editingBookmark && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-10 p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-bold text-white mb-4">Edit Bookmark</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-2">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
                  >
                    <option value="general">General</option>
                    <option value="important">Important</option>
                    <option value="review">Review</option>
                    <option value="edit">Edit</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-2">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add notes about this scene..."
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none min-h-[100px]"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingBookmark(null);
                      setNotes('');
                      setCategory('general');
                    }}
                    className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateBookmark}
                    className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SceneBookmarksPanel;

