import React, { useState, useEffect } from 'react';
import { StoryContext, DirectorSettings } from '../types';

interface ProjectTemplate {
  id: number;
  name: string;
  description: string | null;
  genre: string | null;
  plot_summary: string | null;
  characters: string | null;
  initial_context: string | null;
  director_settings: DirectorSettings | null;
  is_system_template: boolean;
  created_by_user_id: number | null;
  created_at: string;
}

interface ProjectTemplatesLibraryProps {
  onClose: () => void;
  onSelectTemplate: (template: ProjectTemplate) => void;
  onSaveCurrentAsTemplate?: () => void;
}

const ProjectTemplatesLibrary: React.FC<ProjectTemplatesLibraryProps> = ({
  onClose,
  onSelectTemplate,
  onSaveCurrentAsTemplate,
}) => {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'system' | 'my'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load templates');

      const result = await response.json();
      const templatesData = (result.templates || []).map((t: any) => ({
        ...t,
        director_settings: t.director_settings ? (typeof t.director_settings === 'string' ? JSON.parse(t.director_settings) : t.director_settings) : null,
      }));
      setTemplates(templatesData);
    } catch (error: any) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTemplates = templates.filter(template => {
    // Filter by type
    if (filter === 'system' && !template.is_system_template) return false;
    if (filter === 'my' && template.is_system_template) return false;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        template.name.toLowerCase().includes(query) ||
        template.description?.toLowerCase().includes(query) ||
        template.genre?.toLowerCase().includes(query) ||
        template.plot_summary?.toLowerCase().includes(query)
      );
    }

    return true;
  });

  const systemTemplates = filteredTemplates.filter(t => t.is_system_template);
  const userTemplates = filteredTemplates.filter(t => !t.is_system_template);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white">Project Templates Library</h2>
            <p className="text-sm text-zinc-400 mt-1">Choose a template to start a new project</p>
          </div>
          <div className="flex items-center gap-2">
            {onSaveCurrentAsTemplate && (
              <button
                onClick={onSaveCurrentAsTemplate}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm transition-colors"
              >
                Save Current as Template
              </button>
            )}
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

        {/* Search and Filters */}
        <div className="p-4 border-b border-zinc-800 space-y-3">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full px-4 py-2 pl-10 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-zinc-500"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-zinc-400">Filter:</span>
            {(['all', 'system', 'my'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filter === type
                    ? 'bg-amber-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {type === 'all' ? 'All' : type === 'system' ? 'System' : 'My Templates'}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-2"></div>
              <div className="text-zinc-500">Loading templates...</div>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg">No templates found</p>
              <p className="text-sm mt-2">
                {searchQuery ? 'Try a different search query' : 'Create your first template to get started'}
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* System Templates */}
              {systemTemplates.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                    </svg>
                    System Templates
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {systemTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={() => onSelectTemplate(template)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* User Templates */}
              {userTemplates.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    My Templates
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {userTemplates.map((template) => (
                      <TemplateCard
                        key={template.id}
                        template={template}
                        onSelect={() => onSelectTemplate(template)}
                        onDelete={async () => {
                          if (window.confirm(`Delete template "${template.name}"?`)) {
                            try {
                              const token = localStorage.getItem('auth_token');
                              await fetch(`${API_BASE_URL}/templates/${template.id}`, {
                                method: 'DELETE',
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                },
                              });
                              loadTemplates();
                            } catch (error) {
                              console.error('Failed to delete template:', error);
                            }
                          }
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface TemplateCardProps {
  template: ProjectTemplate;
  onSelect: () => void;
  onDelete?: () => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onSelect, onDelete }) => {
  return (
    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-amber-500/50 transition-all cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-lg font-bold text-white mb-1">{template.name}</h4>
          {template.genre && (
            <span className="text-xs px-2 py-0.5 rounded bg-amber-900/30 text-amber-400 border border-amber-800/50">
              {template.genre}
            </span>
          )}
        </div>
        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-300 p-1"
            title="Delete template"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {template.description && (
        <p className="text-sm text-zinc-400 mb-3 line-clamp-2">{template.description}</p>
      )}

      {template.plot_summary && (
        <div className="mb-3">
          <p className="text-xs text-zinc-500 uppercase mb-1">Plot</p>
          <p className="text-sm text-zinc-300 line-clamp-2">{template.plot_summary}</p>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 pt-4 border-t border-zinc-700">
        <div className="text-xs text-zinc-500">
          {template.is_system_template ? 'System Template' : 'Your Template'}
        </div>
        <button
          onClick={onSelect}
          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm transition-colors"
        >
          Use Template
        </button>
      </div>
    </div>
  );
};

export default ProjectTemplatesLibrary;

