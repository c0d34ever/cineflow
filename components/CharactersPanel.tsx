import React, { useState, useEffect } from 'react';
import { charactersService } from '../apiServices';
import { extractCharacters } from '../clientGeminiService';
import { StoryContext, Scene } from '../types';

interface Character {
  id: number;
  name: string;
  description?: string;
  role?: string;
  appearance?: string;
  personality?: string;
  backstory?: string;
  image_url?: string;
}

interface CharactersPanelProps {
  projectId: string;
  storyContext?: StoryContext;
  scenes?: Scene[];
  onClose: () => void;
}

const CharactersPanel: React.FC<CharactersPanelProps> = ({ projectId, storyContext, scenes = [], onClose }) => {
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState<Character | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    role: '',
    appearance: '',
    personality: '',
    backstory: '',
    image_url: ''
  });

  useEffect(() => {
    loadCharacters();
  }, [projectId]);

  const loadCharacters = async () => {
    setLoading(true);
    try {
      const response = await charactersService.getByProject(projectId);
      const data = (response as any)?.characters || [];
      setCharacters(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load characters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingCharacter) {
        await charactersService.update(editingCharacter.id, formData);
      } else {
        await charactersService.create({ project_id: projectId, ...formData });
      }
      await loadCharacters();
      resetForm();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleEdit = (character: Character) => {
    setEditingCharacter(character);
    setFormData({
      name: character.name || '',
      description: character.description || '',
      role: character.role || '',
      appearance: character.appearance || '',
      personality: character.personality || '',
      backstory: character.backstory || '',
      image_url: character.image_url || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this character?')) return;
    try {
      await charactersService.delete(id);
      await loadCharacters();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      role: '',
      appearance: '',
      personality: '',
      backstory: '',
      image_url: ''
    });
    setEditingCharacter(null);
    setShowAddForm(false);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Character Management</h2>
          <div className="flex gap-2">
            {storyContext && (
              <button
                onClick={async () => {
                  setLoading(true);
                  try {
                    const extracted = await extractCharacters(storyContext, scenes);
                    for (const char of extracted) {
                      await charactersService.create({ project_id: projectId, ...char });
                    }
                    await loadCharacters();
                    alert(`Extracted and created ${extracted.length} characters from the complete story!`);
                  } catch (error: any) {
                    alert('Error: ' + error.message);
                  } finally {
                    setLoading(false);
                  }
                }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                title="Auto-extract characters from entire story (all scenes)"
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
              + Add Character
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
                  <label className="block text-xs text-zinc-400 uppercase mb-1">Role</label>
                  <input
                    type="text"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                    placeholder="e.g. Protagonist, Antagonist"
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
                <label className="block text-xs text-zinc-400 uppercase mb-1">Appearance</label>
                <textarea
                  value={formData.appearance}
                  onChange={(e) => setFormData({ ...formData, appearance: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                  rows={2}
                  placeholder="Physical description, clothing, etc."
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase mb-1">Personality</label>
                <textarea
                  value={formData.personality}
                  onChange={(e) => setFormData({ ...formData, personality: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 uppercase mb-1">Backstory</label>
                <textarea
                  value={formData.backstory}
                  onChange={(e) => setFormData({ ...formData, backstory: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                  rows={3}
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
              <div className="flex gap-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm"
                >
                  {editingCharacter ? 'Update' : 'Create'} Character
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
              ) : characters.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  No characters yet. Click "Add Character" to create one.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {characters.map((character) => (
                    <div
                      key={character.id}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg p-4"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-bold text-white">{character.name}</h3>
                          {character.role && (
                            <p className="text-xs text-amber-500 uppercase">{character.role}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(character)}
                            className="text-xs text-zinc-400 hover:text-amber-500"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(character.id)}
                            className="text-xs text-zinc-400 hover:text-red-400"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      {character.description && (
                        <p className="text-sm text-zinc-400 mb-2">{character.description}</p>
                      )}
                      {character.appearance && (
                        <div className="text-xs text-zinc-500 mb-1">
                          <strong>Appearance:</strong> {character.appearance}
                        </div>
                      )}
                      {character.personality && (
                        <div className="text-xs text-zinc-500">
                          <strong>Personality:</strong> {character.personality}
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

export default CharactersPanel;

