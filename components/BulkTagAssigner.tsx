import React, { useState, useEffect } from 'react';
import { tagsService } from '../apiServices';
import { ProjectData } from '../db';

interface BulkTagAssignerProps {
  projects: ProjectData[];
  selectedProjectIds: Set<string>;
  onClose: () => void;
  onUpdate?: () => void;
}

const BulkTagAssigner: React.FC<BulkTagAssignerProps> = ({ projects, selectedProjectIds, onClose, onUpdate }) => {
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [operation, setOperation] = useState<'add' | 'remove' | 'replace'>('add');
  const [newTagName, setNewTagName] = useState('');
  const [showCreateTag, setShowCreateTag] = useState(false);

  const selectedProjects = projects.filter(p => selectedProjectIds.has(p.context.id));

  useEffect(() => {
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      setLoading(true);
      const tags = await tagsService.getAll();
      const allTags = Array.isArray(tags) ? tags : (tags as any)?.tags || [];
      setAvailableTags(allTags);
    } catch (error) {
      console.error('Failed to load tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTag = (tagId: number) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const handleSave = async () => {
    if (selectedTags.length === 0) {
      alert('Please select at least one tag');
      return;
    }

    setSaving(true);
    try {
      let successCount = 0;
      let failCount = 0;

      for (const project of selectedProjects) {
        try {
          // Get current project tags
          const projectTagsResponse = await fetch(`${(import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api'}/tags/project/${project.context.id}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          const projectTagsData = projectTagsResponse.ok ? await projectTagsResponse.json() : { tags: [] };
          const currentTagIds = Array.isArray(projectTagsData.tags) 
            ? projectTagsData.tags.map((t: any) => t.id || t.tag_id)
            : [];

          if (operation === 'add') {
            // Add tags that aren't already present
            const tagsToAdd = selectedTags.filter(id => !currentTagIds.includes(id));
            for (const tagId of tagsToAdd) {
              await tagsService.addToProject(tagId, project.context.id);
            }
          } else if (operation === 'remove') {
            // Remove tags that are present
            const tagsToRemove = selectedTags.filter(id => currentTagIds.includes(id));
            for (const tagId of tagsToRemove) {
              await tagsService.removeFromProject(tagId, project.context.id);
            }
          } else if (operation === 'replace') {
            // Remove all current tags, then add selected tags
            for (const tagId of currentTagIds) {
              await tagsService.removeFromProject(tagId, project.context.id);
            }
            for (const tagId of selectedTags) {
              await tagsService.addToProject(tagId, project.context.id);
            }
          }

          successCount++;
        } catch (error) {
          console.error(`Failed to update tags for project ${project.context.id}:`, error);
          failCount++;
        }
      }

      onUpdate?.();
      onClose();
      
      if (successCount > 0) {
        alert(`Successfully updated ${successCount} project(s)${failCount > 0 ? `, ${failCount} failed` : ''}`);
      } else {
        alert('Failed to update projects');
      }
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
        setSelectedTags(prev => [...prev, tagId]);
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
          <h3 className="text-lg font-bold text-white">Bulk Assign Tags</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="mb-4 p-3 bg-zinc-800/50 rounded text-sm text-zinc-400">
          <strong className="text-white">{selectedProjects.length}</strong> project{selectedProjects.length !== 1 ? 's' : ''} selected
        </div>

        <div className="mb-4">
          <label className="block text-sm text-zinc-400 mb-2">Operation</label>
          <select
            value={operation}
            onChange={(e) => setOperation(e.target.value as any)}
            className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none"
          >
            <option value="add">Add Tags (keep existing)</option>
            <option value="remove">Remove Tags</option>
            <option value="replace">Replace All Tags</option>
          </select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-zinc-400">Loading tags...</div>
        ) : (
          <>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm text-zinc-400">Select Tags</label>
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

              <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto">
                {availableTags.map(tag => {
                  const isSelected = selectedTags.includes(tag.id);
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
            disabled={saving || loading || selectedTags.length === 0}
            className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Applying...' : `Apply to ${selectedProjects.length} Project(s)`}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkTagAssigner;

