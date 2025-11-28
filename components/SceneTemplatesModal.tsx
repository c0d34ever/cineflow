import React, { useState } from 'react';

interface SceneTemplate {
  id: number;
  name: string;
  description?: string;
  raw_idea: string;
  director_settings?: any;
  is_system: boolean;
}

interface SceneTemplatesModalProps {
  templates: SceneTemplate[];
  onSelect: (template: SceneTemplate) => void;
  onClose: () => void;
  onSaveCurrentAsTemplate: () => void;
}

const SceneTemplatesModal: React.FC<SceneTemplatesModalProps> = ({
  templates,
  onSelect,
  onClose,
  onSaveCurrentAsTemplate
}) => {
  const [filter, setFilter] = useState<'all' | 'system' | 'user'>('all');

  const filteredTemplates = templates.filter(t => {
    if (filter === 'system') return t.is_system;
    if (filter === 'user') return !t.is_system;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Scene Templates</h2>
          <div className="flex gap-2">
            <button
              onClick={onSaveCurrentAsTemplate}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-sm"
            >
              Save Current as Template
            </button>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-zinc-800">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 text-xs rounded ${filter === 'all' ? 'bg-amber-600' : 'bg-zinc-800'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('system')}
              className={`px-3 py-1 text-xs rounded ${filter === 'system' ? 'bg-amber-600' : 'bg-zinc-800'}`}
            >
              System
            </button>
            <button
              onClick={() => setFilter('user')}
              className={`px-3 py-1 text-xs rounded ${filter === 'user' ? 'bg-amber-600' : 'bg-zinc-800'}`}
            >
              My Templates
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredTemplates.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">No templates found</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-amber-500 cursor-pointer transition-colors"
                  onClick={() => onSelect(template)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-white">{template.name}</h3>
                    {template.is_system && (
                      <span className="text-xs bg-amber-900/30 text-amber-500 px-2 py-0.5 rounded">System</span>
                    )}
                  </div>
                  {template.description && (
                    <p className="text-sm text-zinc-400 mb-2">{template.description}</p>
                  )}
                  <p className="text-xs text-zinc-500 line-clamp-2">{template.raw_idea}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SceneTemplatesModal;

