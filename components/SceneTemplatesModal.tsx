import React, { useState } from 'react';
import { StoryContext } from '../types';

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
  storyContext?: StoryContext;
  onSelect: (template: SceneTemplate, processedIdea: string) => void;
  onClose: () => void;
  onSaveCurrentAsTemplate: () => void;
}

const SceneTemplatesModal: React.FC<SceneTemplatesModalProps> = ({
  templates,
  storyContext,
  onSelect,
  onClose,
  onSaveCurrentAsTemplate
}) => {
  const [filter, setFilter] = useState<'all' | 'system' | 'user'>('all');
  const [showVariableEditor, setShowVariableEditor] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SceneTemplate | null>(null);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  // Extract variables from template text (e.g., {{character_name}}, {{location}})
  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/[{}]/g, '')))];
  };

  // Replace variables in template text
  const processTemplate = (template: SceneTemplate): string => {
    let processed = template.raw_idea;
    const variables = extractVariables(template.raw_idea);
    
    // Auto-fill from story context if available
    const autoFill: Record<string, string> = {};
    if (storyContext) {
      // Extract character names
      const characters = storyContext.characters?.split(',').map(c => c.trim()).filter(Boolean) || [];
      if (characters.length > 0) {
        autoFill['character'] = characters[0];
        autoFill['character_name'] = characters[0];
        autoFill['protagonist'] = characters[0];
      }
      
      // Extract location from context
      if (storyContext.initialContext) {
        const locationMatch = storyContext.initialContext.match(/(?:at|in|on)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
        if (locationMatch) {
          autoFill['location'] = locationMatch[1];
        }
      }
      
      // Genre-based defaults
      autoFill['genre'] = storyContext.genre || 'Action';
      autoFill['time_of_day'] = 'Day'; // Default
    }

    // Merge auto-fill with user-provided values
    const allValues = { ...autoFill, ...variableValues };
    
    variables.forEach(variable => {
      const value = allValues[variable] || `[${variable}]`;
      processed = processed.replace(new RegExp(`\\{\\{${variable}\\}\\}`, 'g'), value);
    });

    return processed;
  };

  const handleTemplateSelect = (template: SceneTemplate) => {
    const variables = extractVariables(template.raw_idea);
    
    if (variables.length > 0) {
      // Show variable editor
      setSelectedTemplate(template);
      setShowVariableEditor(true);
      
      // Pre-fill with auto-detected values
      const autoFill: Record<string, string> = {};
      if (storyContext) {
        const characters = storyContext.characters?.split(',').map(c => c.trim()).filter(Boolean) || [];
        if (characters.length > 0) {
          autoFill['character'] = characters[0];
          autoFill['character_name'] = characters[0];
          autoFill['protagonist'] = characters[0];
        }
        autoFill['genre'] = storyContext.genre || '';
      }
      setVariableValues(autoFill);
    } else {
      // No variables, use directly
      onSelect(template, template.raw_idea);
      onClose();
    }
  };

  const handleApplyWithVariables = () => {
    if (!selectedTemplate) return;
    const processed = processTemplate(selectedTemplate);
    onSelect(selectedTemplate, processed);
    setShowVariableEditor(false);
    setSelectedTemplate(null);
    setVariableValues({});
    onClose();
  };

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
              {filteredTemplates.map((template) => {
                const hasVariables = extractVariables(template.raw_idea).length > 0;
                return (
                  <div
                    key={template.id}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-amber-500 cursor-pointer transition-colors"
                    onClick={() => handleTemplateSelect(template)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-white">{template.name}</h3>
                        {hasVariables && (
                          <span className="text-xs text-cyan-400 mt-1 flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                            Variables
                          </span>
                        )}
                      </div>
                      {template.is_system && (
                        <span className="text-xs bg-amber-900/30 text-amber-500 px-2 py-0.5 rounded">System</span>
                      )}
                    </div>
                    {template.description && (
                      <p className="text-sm text-zinc-400 mb-2">{template.description}</p>
                    )}
                    <p className="text-xs text-zinc-500 line-clamp-2">{template.raw_idea}</p>
                    {hasVariables && (
                      <div className="mt-2 text-xs text-zinc-600">
                        Variables: {extractVariables(template.raw_idea).join(', ')}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Variable Editor Modal */}
      {showVariableEditor && selectedTemplate && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-10">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-white mb-4">Fill Template Variables</h3>
            <div className="space-y-4">
              {extractVariables(selectedTemplate.raw_idea).map((variable) => (
                <div key={variable}>
                  <label className="block text-sm text-zinc-400 mb-2 capitalize">
                    {variable.replace(/_/g, ' ')}
                  </label>
                  <input
                    type="text"
                    value={variableValues[variable] || ''}
                    onChange={(e) => setVariableValues({ ...variableValues, [variable]: e.target.value })}
                    placeholder={`Enter ${variable.replace(/_/g, ' ')}`}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:border-amber-500 outline-none"
                    autoFocus={variable === extractVariables(selectedTemplate.raw_idea)[0]}
                  />
                </div>
              ))}
              
              {/* Preview */}
              <div className="mt-4 p-3 bg-zinc-800 rounded border border-zinc-700">
                <label className="block text-xs text-zinc-400 mb-2">Preview:</label>
                <p className="text-sm text-zinc-300">{processTemplate(selectedTemplate)}</p>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowVariableEditor(false);
                    setSelectedTemplate(null);
                    setVariableValues({});
                  }}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyWithVariables}
                  className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm"
                >
                  Apply Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SceneTemplatesModal;

