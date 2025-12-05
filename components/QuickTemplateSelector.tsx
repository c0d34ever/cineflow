import React, { useState, useEffect } from 'react';

interface ProjectTemplate {
  id: number;
  name: string;
  description: string | null;
  genre: string | null;
  plot_summary: string | null;
  characters: string | null;
  initial_context: string | null;
  director_settings: any | null;
  is_system_template: boolean;
  created_by_user_id: number | null;
  created_at: string;
}

interface QuickTemplateSelectorProps {
  onSelectTemplate: (template: ProjectTemplate) => void;
  onClose: () => void;
  onShowFullLibrary: () => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

const QuickTemplateSelector: React.FC<QuickTemplateSelectorProps> = ({
  onSelectTemplate,
  onClose,
  onShowFullLibrary,
  showToast,
}) => {
  const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredTemplate, setHoveredTemplate] = useState<number | null>(null);

  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

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
      
      // Get recent templates from localStorage
      const recentTemplateIds = JSON.parse(localStorage.getItem('recent_templates') || '[]') as number[];
      
      // Get top 6 templates (recent first, then system templates, then user templates)
      const systemTemplates = templatesData.filter((t: ProjectTemplate) => t.is_system_template);
      const userTemplates = templatesData.filter((t: ProjectTemplate) => !t.is_system_template);
      
      // Prioritize recent templates
      const recentTemplates = templatesData.filter((t: ProjectTemplate) => recentTemplateIds.includes(t.id));
      const nonRecentSystem = systemTemplates.filter((t: ProjectTemplate) => !recentTemplateIds.includes(t.id));
      const nonRecentUser = userTemplates.filter((t: ProjectTemplate) => !recentTemplateIds.includes(t.id));
      
      // Combine: recent (up to 3) + system (up to 3) + user (up to 2) = max 6
      const topTemplates = [
        ...recentTemplates.slice(0, 3),
        ...nonRecentSystem.slice(0, 3),
        ...nonRecentUser.slice(0, 2)
      ].slice(0, 6);
      
      setTemplates(topTemplates);
    } catch (error: any) {
      console.error('Failed to load templates:', error);
      if (showToast) {
        showToast('Failed to load templates. Please try again.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: ProjectTemplate) => {
    // Track recent template usage
    try {
      const recentTemplateIds = JSON.parse(localStorage.getItem('recent_templates') || '[]') as number[];
      // Remove if already exists, then add to front
      const updated = [template.id, ...recentTemplateIds.filter(id => id !== template.id)].slice(0, 10);
      localStorage.setItem('recent_templates', JSON.stringify(updated));
    } catch (e) {
      // Ignore localStorage errors
    }
    
    onSelectTemplate(template);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white">Quick Start from Template</h2>
            <p className="text-sm text-zinc-400 mt-1">Choose a template to start your project</p>
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-2"></div>
              <div className="text-zinc-500">Loading templates...</div>
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p className="mb-4">No templates available</p>
              <button
                onClick={onShowFullLibrary}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-sm transition-colors"
              >
                Browse Template Library
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => {
                const isRecent = JSON.parse(localStorage.getItem('recent_templates') || '[]').includes(template.id);
                return (
                  <div
                    key={template.id}
                    className="relative"
                    onMouseEnter={() => setHoveredTemplate(template.id)}
                    onMouseLeave={() => setHoveredTemplate(null)}
                  >
                    <button
                      onClick={() => handleTemplateSelect(template)}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-amber-500 hover:bg-zinc-750 transition-all text-left group"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors">
                          {template.name}
                        </h3>
                        <div className="flex items-center gap-1">
                          {isRecent && (
                            <span className="text-xs px-2 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-900/50" title="Recently used">
                              Recent
                            </span>
                          )}
                          {template.is_system_template && (
                            <span className="text-xs px-2 py-0.5 rounded bg-amber-900/30 text-amber-400 border border-amber-900/50">
                              System
                            </span>
                          )}
                        </div>
                      </div>
                      {template.genre && (
                        <div className="text-xs text-zinc-500 mb-2">{template.genre}</div>
                      )}
                      {template.description && (
                        <p className="text-xs text-zinc-400 line-clamp-2 mb-2">{template.description}</p>
                      )}
                      {template.plot_summary && (
                        <p className="text-xs text-zinc-500 line-clamp-2">{template.plot_summary}</p>
                      )}
                      <div className="mt-3 pt-3 border-t border-zinc-700">
                        <span className="text-xs text-amber-400 group-hover:text-amber-300">Use Template →</span>
                      </div>
                    </button>
                    {/* Preview Tooltip */}
                    {hoveredTemplate === template.id && (template.plot_summary || template.description) && (
                      <div className="absolute z-10 left-0 right-0 top-full mt-2 p-3 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                        <div className="text-xs text-zinc-300 space-y-2">
                          {template.description && (
                            <div>
                              <strong className="text-amber-400">Description:</strong>
                              <p className="mt-1">{template.description}</p>
                            </div>
                          )}
                          {template.plot_summary && (
                            <div>
                              <strong className="text-amber-400">Plot:</strong>
                              <p className="mt-1">{template.plot_summary}</p>
                            </div>
                          )}
                          {template.characters && (
                            <div>
                              <strong className="text-amber-400">Characters:</strong>
                              <p className="mt-1 line-clamp-2">{template.characters}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={onShowFullLibrary}
            className="text-sm text-zinc-400 hover:text-white transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Browse All Templates
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickTemplateSelector;

