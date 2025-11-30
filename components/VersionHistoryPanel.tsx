import React, { useState, useEffect } from 'react';
import { StoryContext, Scene, DirectorSettings } from '../types';
import { apiService, checkApiAvailability } from '../apiService';

interface VersionHistoryPanelProps {
  projectId: string;
  currentContext: StoryContext;
  currentScenes: Scene[];
  currentSettings: DirectorSettings;
  onClose: () => void;
  onRestore: (version: ProjectVersion) => void;
}

interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  context: StoryContext;
  scenes: Scene[];
  settings: DirectorSettings;
  created_at: string;
  note?: string;
  user_id?: number;
}

const VersionHistoryPanel: React.FC<VersionHistoryPanelProps> = ({
  projectId,
  currentContext,
  currentScenes,
  currentSettings,
  onClose,
  onRestore
}) => {
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [versionNote, setVersionNote] = useState('');
  const [showSaveModal, setShowSaveModal] = useState(false);

  useEffect(() => {
    loadVersions();
  }, [projectId]);

  const loadVersions = async () => {
    setLoading(true);
    try {
      const apiAvailable = await checkApiAvailability();
      if (!apiAvailable) {
        // Load from localStorage as fallback
        const stored = localStorage.getItem(`project_versions_${projectId}`);
        if (stored) {
          setVersions(JSON.parse(stored));
        }
        setLoading(false);
        return;
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/versions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setVersions(Array.isArray(data.versions) ? data.versions : []);
      }
    } catch (error) {
      console.error('Failed to load versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveCurrentVersion = async () => {
    if (!versionNote.trim()) {
      alert('Please enter a note for this version');
      return;
    }

    setSaving(true);
    try {
      const apiAvailable = await checkApiAvailability();
      if (!apiAvailable) {
        // Save to localStorage as fallback
        const newVersion: ProjectVersion = {
          id: `v_${Date.now()}`,
          project_id: projectId,
          version_number: versions.length + 1,
          context: currentContext,
          scenes: currentScenes,
          settings: currentSettings,
          created_at: new Date().toISOString(),
          note: versionNote,
        };
        const updated = [newVersion, ...versions].slice(0, 10); // Keep last 10
        localStorage.setItem(`project_versions_${projectId}`, JSON.stringify(updated));
        setVersions(updated);
        setShowSaveModal(false);
        setVersionNote('');
        setSaving(false);
        return;
      }

      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('auth_token');
      
      const response = await fetch(`${API_BASE_URL}/projects/${projectId}/versions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: currentContext,
          scenes: currentScenes,
          settings: currentSettings,
          note: versionNote,
        }),
      });

      if (response.ok) {
        await loadVersions();
        setShowSaveModal(false);
        setVersionNote('');
      } else {
        throw new Error('Failed to save version');
      }
    } catch (error: any) {
      alert('Failed to save version: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const deleteVersion = async (versionId: string) => {
    if (!confirm('Delete this version? This cannot be undone.')) return;

    try {
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('auth_token');
        
        await fetch(`${API_BASE_URL}/projects/${projectId}/versions/${versionId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      } else {
        // Remove from localStorage
        const updated = versions.filter(v => v.id !== versionId);
        localStorage.setItem(`project_versions_${projectId}`, JSON.stringify(updated));
        setVersions(updated);
        return;
      }

      await loadVersions();
    } catch (error: any) {
      alert('Failed to delete version: ' + error.message);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col m-2 sm:m-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-zinc-800 gap-2 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Version History</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">Save and restore project versions</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSaveModal(true)}
              className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white transition-colors"
            >
              Save Current Version
            </button>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
                <p className="text-zinc-500">Loading versions...</p>
              </div>
            </div>
          ) : versions.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p className="mb-4">No saved versions yet</p>
              <p className="text-sm">Save a version to create a restore point</p>
            </div>
          ) : (
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm font-bold text-amber-500">
                          Version {version.version_number}
                        </span>
                        <span className="text-xs text-zinc-500">
                          {formatDate(version.created_at)}
                        </span>
                      </div>
                      {version.note && (
                        <p className="text-sm text-zinc-300 mb-2">{version.note}</p>
                      )}
                      <div className="text-xs text-zinc-500 space-y-1">
                        <div>Scenes: {version.scenes?.length || 0}</div>
                        <div>Project: {version.context?.title || 'Untitled'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (confirm('Restore this version? Current changes will be lost.')) {
                            onRestore(version);
                            onClose();
                          }
                        }}
                        className="text-xs px-3 py-1.5 rounded bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-800/50 transition-colors"
                      >
                        Restore
                      </button>
                      <button
                        onClick={() => deleteVersion(version.id)}
                        className="text-xs px-3 py-1.5 rounded bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800/50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Save Version Modal */}
        {showSaveModal && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-10">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-white mb-4">Save Current Version</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Version Note (Optional)</label>
                  <input
                    type="text"
                    value={versionNote}
                    onChange={(e) => setVersionNote(e.target.value)}
                    placeholder="e.g., Before major rewrite, After client feedback"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:border-amber-500 outline-none"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowSaveModal(false);
                      setVersionNote('');
                    }}
                    className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={saveCurrentVersion}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Version'}
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

export default VersionHistoryPanel;

