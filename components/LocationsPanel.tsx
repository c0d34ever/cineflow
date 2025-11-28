import React, { useState, useEffect } from 'react';
import { locationsService } from '../apiServices';
import { extractLocations } from '../clientGeminiService';
import { StoryContext, Scene } from '../types';

interface Location {
  id: number;
  name: string;
  description?: string;
  location_type?: string;
  address?: string;
  image_url?: string;
  notes?: string;
}

interface LocationsPanelProps {
  projectId: string;
  storyContext?: StoryContext;
  scenes?: Scene[];
  onClose: () => void;
}

const LocationsPanel: React.FC<LocationsPanelProps> = ({ projectId, storyContext, scenes, onClose }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    location_type: '',
    address: '',
    image_url: '',
    notes: ''
  });

  useEffect(() => {
    loadLocations();
  }, [projectId]);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const response = await locationsService.getByProject(projectId);
      const data = (response as any)?.locations || [];
      setLocations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingLocation) {
        await locationsService.update(editingLocation.id, formData);
      } else {
        await locationsService.create({ project_id: projectId, ...formData });
      }
      await loadLocations();
      resetForm();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      name: location.name || '',
      description: location.description || '',
      location_type: location.location_type || '',
      address: location.address || '',
      image_url: location.image_url || '',
      notes: location.notes || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this location?')) return;
    try {
      await locationsService.delete(id);
      await loadLocations();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      location_type: '',
      address: '',
      image_url: '',
      notes: ''
    });
    setEditingLocation(null);
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Location Management</h2>
          <div className="flex gap-2">
            {storyContext && (
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const extracted = await extractLocations(storyContext, scenes || []);
                    for (const loc of extracted) {
                      await locationsService.create({ project_id: projectId, ...loc });
                    }
                    await loadLocations();
                    alert(`Extracted and created ${extracted.length} locations from the complete story!`);
                  } catch (error: any) {
                    alert('Error: ' + error.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                title="Auto-extract locations from entire story (all scenes)"
              >
                ✨ Auto-Extract
              </button>
            )}
            <button
              onClick={() => {
                resetForm();
                setShowAddForm(true);
              }}
              className="px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-sm"
            >
              + Add Location
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

        <div className="flex-1 overflow-y-auto p-4">
          {showAddForm ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 uppercase mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 uppercase mb-1">Type</label>
                  <input
                    type="text"
                    value={formData.location_type}
                    onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                    className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                    placeholder="e.g. Interior, Exterior, Studio"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase mb-1">Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                  placeholder="Physical address or description"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase mb-1">Image URL</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm"
                >
                  {editingLocation ? 'Update' : 'Create'} Location
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <>
              {loading ? (
                <div className="text-center py-8 text-zinc-500">Loading...</div>
              ) : locations.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  No locations yet. Click "Add Location" to create one.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {locations.map((location) => (
                    <div
                      key={location.id}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-white">{location.name}</h3>
                          {location.location_type && (
                            <p className="text-xs text-amber-500 uppercase">{location.location_type}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(location)}
                            className="text-xs text-zinc-400 hover:text-amber-500"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(location.id)}
                            className="text-xs text-zinc-400 hover:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {location.description && (
                        <p className="text-sm text-zinc-400 mb-2">{location.description}</p>
                      )}
                      {location.address && (
                        <div className="text-xs text-zinc-500 mb-1">
                          <strong>Address:</strong> {location.address}
                        </div>
                      )}
                      {location.notes && (
                        <div className="text-xs text-zinc-500">
                          <strong>Notes:</strong> {location.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocationsPanel;

