import React, { useState, useEffect } from 'react';
import { tagsService } from '../apiServices';
import { ProjectData } from '../db';

interface QuickTagAssignerProps {
  project: ProjectData;
  onClose: () => void;
  onUpdate?: () => void;
}

const QuickTagAssigner: React.FC<QuickTagAssignerProps> = ({ project, onClose, onUpdate }) => {
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [projectTags, setProjectTags] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [showCreateTag, setShowCreateTag] = useState(false);

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const tags = await tagsService.getAll();
      const projectTagsResponse = await fetch(`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api'}/tags/project/${project.context.id}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });
      const projectTagsData = projectTagsResponse.ok ? await projectTagsResponse.json() : { tags: [] };

      const allTags = Array.isArray(tags) ? tags : (tags as any)?.tags || [];
      setAvailableTags(allTags);
      
      const projectTagIds = Array.isArray(projectTagsData) 
        ? projectTagsData.map((t: any) => t.id || t.tag_id)
        : (projectTagsData.tags || []).map((t: any) => t.id || t.tag_id);
      setProjectTags(projectTagIds);
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTag = (tagId: number) => {
    setProjectTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Get current project tags
      const currentTags = await fetch(`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api'}/projects/${project.context.id}/tags`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      }).then(r => r.ok ? r.json() : { tags: [] });

      const currentTagIds = Array.isArray(currentTags) 
        ? currentTags.map((t: any) => t.id || t.tag_id)
        : (currentTags.tags || []).map((t: any) => t.id || t.tag_id);

      // Add new tags
      const tagsToAdd = projectTags.filter(id => !currentTagIds.includes(id));
      for (const tagId of tagsToAdd) {
        await tagsService.addToProject(tagId, project.context.id);
      }

      // Remove tags
      const tagsToRemove = currentTagIds.filter((id: number) => !projectTags.includes(id));
      for (const tagId of tagsToRemove) {
        await tagsService.removeFromProject(tagId, project.context.id);
      }

      onUpdate?.();
      onClose();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) {
      alert('Please enter a tag name');
      return;
    }

    try {
      const newTag = await tagsService.create({ name: newTagName.trim() });
      const tagId = (newTag as any).id || (newTag as any).tag?.id;
      if (tagId) {
        setAvailableTags(prev => [...prev, { id: tagId, name: newTagName.trim(), color: '#6366f1' }]);
        setProjectTags(prev => [...prev, tagId]);
        setNewTagName('');
        setShowCreateTag(false);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Assign Tags</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8 text-zinc-400">Loading tags...</div>
        ) : (
          <>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-zinc-400">Available Tags</label>
                <button
                  onClick={() => setShowCreateTag(!showCreateTag)}
                  className="text-xs text-amber-500 hover:text-amber-400"
                >
                  + New Tag
                </button>
              </div>

              {showCreateTag && (
                <div className="flex gap-2 mb-3">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleCreateTag()}
                    placeholder="Tag name"
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-white focus:border-amber-500 outline-none"
                    autoFocus
                  />
                  <button
                    onClick={handleCreateTag}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 rounded text-sm"
                  >
                    Add
                  </button>
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                {availableTags.map(tag => {
                  const isSelected = projectTags.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleToggleTag(tag.id)}
                      className={`px-3 py-1.5 rounded text-sm border transition-all ${
                        isSelected
                          ? 'bg-amber-600/20 border-amber-500 text-amber-400'
                          : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                      }`}
                      style={isSelected ? {} : { borderColor: tag.color || '#6366f1' }}
                    >
                      {tag.name}
                      {isSelected && ' ✓'}
                    </button>
                  );
                })}
              </div>

              {availableTags.length === 0 && !showCreateTag && (
                <div className="text-center py-4 text-zinc-500 text-sm">
                  No tags available. Create one to get started.
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Tags'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickTagAssigner;

