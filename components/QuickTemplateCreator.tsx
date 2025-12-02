import React, { useState } from 'react';
import { ProjectData } from '../db';

interface QuickTemplateCreatorProps {
  project: ProjectData;
  onClose: () => void;
  onSuccess?: () => void;
}

const QuickTemplateCreator: React.FC<QuickTemplateCreatorProps> = ({ project, onClose, onSuccess }) => {
  const [templateName, setTemplateName] = useState(project.context.title || '');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    setSaving(true);
    try {
      const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${API_BASE_URL}/templates`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: templateName,
          description: description || undefined,
          genre: project.context.genre || undefined,
          plot_summary: project.context.plotSummary || undefined,
          characters: project.context.characters || undefined,
          initial_context: project.context.initialContext || undefined,
          director_settings: project.settings || undefined
        })
      });

      if (response.ok) {
        onSuccess?.();
        onClose();
      } else {
        const error = await response.json();
        alert('Error: ' + (error.error || 'Failed to create template'));
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Create Template from Project</h3>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm text-zinc-400 mb-2">Template Name *</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              placeholder="e.g., Action Thriller Template"
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:border-amber-500 outline-none"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm text-zinc-400 mb-2">Description (Optional)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template..."
              className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:border-amber-500 outline-none h-20 resize-none"
            />
          </div>

          <div className="bg-zinc-800/50 border border-zinc-700 rounded p-3 text-xs text-zinc-400">
            <div className="font-semibold text-zinc-300 mb-1">Will include:</div>
            <ul className="list-disc list-inside space-y-1">
              <li>Genre: {project.context.genre || 'None'}</li>
              <li>Plot Summary: {project.context.plotSummary ? 'Yes' : 'No'}</li>
              <li>Characters: {project.context.characters ? 'Yes' : 'No'}</li>
              <li>Initial Context: {project.context.initialContext ? 'Yes' : 'No'}</li>
              <li>Director Settings: {project.settings ? 'Yes' : 'No'}</li>
            </ul>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!templateName.trim() || saving}
            className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Creating...' : 'Create Template'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickTemplateCreator;

