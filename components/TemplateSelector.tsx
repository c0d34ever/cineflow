import React, { useState, useEffect } from 'react';
import { templatesService } from '../apiServices';
import { StoryContext, DirectorSettings } from '../types';

interface Template {
  id: number;
  name: string;
  description?: string;
  genre?: string;
  plot_summary?: string;
  characters?: string;
  initial_context?: string;
  director_settings?: any;
  is_system_template: boolean;
}

interface TemplateSelectorProps {
  onSelect: (template: Template) => void;
  onClose: () => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ onSelect, onClose }) => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const response = await templatesService.getAll();
      const data = (response as any)?.templates || [];
      setTemplates(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (template: Template) => {
    onSelect(template);
    onClose();
  };

  const systemTemplates = templates.filter(t => t.is_system_template);
  const userTemplates = templates.filter(t => !t.is_system_template);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-4xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Choose a Template</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-zinc-500">Loading templates...</div>
          ) : (
            <>
              {/* System Templates */}
              {systemTemplates.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-zinc-400 uppercase mb-3">System Templates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {systemTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleSelect(template)}
                        className="text-left p-4 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-amber-500 hover:bg-zinc-800/50 transition-all"
                      >
                        <div className="font-bold text-white mb-1">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-zinc-400 mb-2">{template.description}</div>
                        )}
                        {template.genre && (
                          <div className="text-xs text-amber-500 uppercase">{template.genre}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* User Templates */}
              {userTemplates.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-zinc-400 uppercase mb-3">Your Templates</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {userTemplates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleSelect(template)}
                        className="text-left p-4 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-amber-500 hover:bg-zinc-800/50 transition-all"
                      >
                        <div className="font-bold text-white mb-1">{template.name}</div>
                        {template.description && (
                          <div className="text-xs text-zinc-400 mb-2">{template.description}</div>
                        )}
                        {template.genre && (
                          <div className="text-xs text-amber-500 uppercase">{template.genre}</div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {templates.length === 0 && (
                <div className="text-center py-8 text-zinc-500">
                  No templates available. Start with a blank project or create your own template.
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-zinc-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
          >
            Start Blank Project
          </button>
        </div>
      </div>
    </div>
  );
};

export default TemplateSelector;

