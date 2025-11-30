import React, { useState, useEffect } from 'react';
import { apiService, checkApiAvailability } from '../apiService';

interface ExportPreset {
  id: string;
  name: string;
  format: 'pdf' | 'csv' | 'markdown' | 'json' | 'fountain';
  includeSettings: boolean;
  includeMedia: boolean;
  includeNotes: boolean;
  style?: string;
  customFields?: string[];
  created_at?: string;
}

interface ExportPresetsPanelProps {
  onClose: () => void;
  onApply: (preset: ExportPreset) => void;
}

const ExportPresetsPanel: React.FC<ExportPresetsPanelProps> = ({
  onClose,
  onApply
}) => {
  const [presets, setPresets] = useState<ExportPreset[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPreset, setEditingPreset] = useState<ExportPreset | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    format: 'pdf' as ExportPreset['format'],
    includeSettings: true,
    includeMedia: false,
    includeNotes: true,
    style: 'default',
    customFields: [] as string[],
  });

  useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = () => {
    try {
      const stored = localStorage.getItem('export_presets');
      if (stored) {
        setPresets(JSON.parse(stored));
      } else {
        // Default presets
        const defaults: ExportPreset[] = [
          {
            id: 'default-pdf',
            name: 'Standard PDF Export',
            format: 'pdf',
            includeSettings: true,
            includeMedia: false,
            includeNotes: true,
            style: 'default',
          },
          {
            id: 'detailed-csv',
            name: 'Detailed CSV',
            format: 'csv',
            includeSettings: true,
            includeMedia: false,
            includeNotes: true,
          },
          {
            id: 'screenplay-fountain',
            name: 'Screenplay Format',
            format: 'fountain',
            includeSettings: false,
            includeMedia: false,
            includeNotes: false,
          },
        ];
        setPresets(defaults);
        localStorage.setItem('export_presets', JSON.stringify(defaults));
      }
    } catch (error) {
      console.error('Failed to load presets:', error);
    }
  };

  const savePresets = (newPresets: ExportPreset[]) => {
    localStorage.setItem('export_presets', JSON.stringify(newPresets));
    setPresets(newPresets);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      alert('Please enter a preset name');
      return;
    }

    const preset: ExportPreset = {
      id: editingPreset?.id || `preset-${Date.now()}`,
      name: formData.name,
      format: formData.format,
      includeSettings: formData.includeSettings,
      includeMedia: formData.includeMedia,
      includeNotes: formData.includeNotes,
      style: formData.style,
      customFields: formData.customFields,
      created_at: editingPreset?.created_at || new Date().toISOString(),
    };

    if (editingPreset) {
      const updated = presets.map(p => p.id === editingPreset.id ? preset : p);
      savePresets(updated);
    } else {
      savePresets([...presets, preset]);
    }

    setShowCreateModal(false);
    setEditingPreset(null);
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this export preset?')) return;
    const updated = presets.filter(p => p.id !== id);
    savePresets(updated);
  };

  const handleEdit = (preset: ExportPreset) => {
    setEditingPreset(preset);
    setFormData({
      name: preset.name,
      format: preset.format,
      includeSettings: preset.includeSettings,
      includeMedia: preset.includeMedia,
      includeNotes: preset.includeNotes,
      style: preset.style || 'default',
      customFields: preset.customFields || [],
    });
    setShowCreateModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      format: 'pdf',
      includeSettings: true,
      includeMedia: false,
      includeNotes: true,
      style: 'default',
      customFields: [],
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col m-2 sm:m-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-zinc-800 gap-2 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Export Presets</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">Save and reuse export configurations</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                resetForm();
                setEditingPreset(null);
                setShowCreateModal(true);
              }}
              className="text-xs px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white transition-colors"
            >
              New Preset
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
          {presets.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p className="mb-4">No export presets yet</p>
              <p className="text-sm">Create a preset to save your export configuration</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {presets.map((preset) => (
                <div
                  key={preset.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-white mb-1">{preset.name}</h3>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-1 rounded bg-zinc-700 text-zinc-300 uppercase">
                          {preset.format}
                        </span>
                        {preset.style && (
                          <span className="text-xs text-zinc-500">{preset.style}</span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1 mb-3 text-xs text-zinc-400">
                    {preset.includeSettings && (
                      <div className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Settings
                      </div>
                    )}
                    {preset.includeMedia && (
                      <div className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Media
                      </div>
                    )}
                    {preset.includeNotes && (
                      <div className="flex items-center gap-1">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        Notes
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onApply(preset)}
                      className="flex-1 px-3 py-1.5 rounded bg-amber-600 hover:bg-amber-500 text-white text-xs transition-colors"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => handleEdit(preset)}
                      className="px-3 py-1.5 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300 text-xs transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(preset.id)}
                      className="px-3 py-1.5 rounded bg-red-900/30 hover:bg-red-900/50 text-red-400 text-xs transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Create/Edit Modal */}
        {showCreateModal && (
          <div className="absolute inset-0 bg-black/90 flex items-center justify-center z-10">
            <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-bold text-white mb-4">
                {editingPreset ? 'Edit Preset' : 'Create Export Preset'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Preset Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Client Presentation PDF"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:border-amber-500 outline-none"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Export Format</label>
                  <select
                    value={formData.format}
                    onChange={(e) => setFormData({ ...formData, format: e.target.value as any })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-white focus:border-amber-500 outline-none"
                  >
                    <option value="pdf">PDF</option>
                    <option value="csv">CSV</option>
                    <option value="markdown">Markdown</option>
                    <option value="json">JSON</option>
                    <option value="fountain">Fountain (Screenplay)</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-sm text-zinc-400 mb-2">Include</label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.includeSettings}
                      onChange={(e) => setFormData({ ...formData, includeSettings: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-sm text-zinc-300">Director Settings</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.includeMedia}
                      onChange={(e) => setFormData({ ...formData, includeMedia: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-sm text-zinc-300">Media References</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.includeNotes}
                      onChange={(e) => setFormData({ ...formData, includeNotes: e.target.checked })}
                      className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-amber-500 focus:ring-amber-500"
                    />
                    <span className="text-sm text-zinc-300">Scene Notes</span>
                  </label>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCreateModal(false);
                      setEditingPreset(null);
                      resetForm();
                    }}
                    className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm"
                  >
                    {editingPreset ? 'Update' : 'Create'}
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

export default ExportPresetsPanel;

