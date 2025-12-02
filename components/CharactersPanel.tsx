import React, { useState, useEffect, useRef } from 'react';
import { charactersService, mediaService } from '../apiServices';
import { extractCharacters } from '../clientGeminiService';
import { StoryContext, Scene } from '../types';
import { getFullImageUrl } from '../utils/imageUtils';

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
  const [uploading, setUploading] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bulkFileInputRef = useRef<HTMLInputElement>(null);

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
    setImagePreview(character.image_url || null);
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

  const handleImageUpload = async (file: File, removeBg: boolean = false) => {
    setUploading(true);
    try {
      let imageUrl = '';

      if (removeBg) {
        setRemovingBg(true);
        try {
          const result = await mediaService.removeBackground(file);
          // Use the processed image URL
          imageUrl = result.imagekit_url || result.processedPath || '';
          if (imageUrl && !imageUrl.startsWith('http')) {
            const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
            imageUrl = `${API_BASE_URL.replace('/api', '')}${imageUrl}`;
          }
        } catch (error: any) {
          console.error('Background removal failed:', error);
          alert('Background removal failed: ' + error.message);
          // Fall through to regular upload
        } finally {
          setRemovingBg(false);
        }
      }

      // If background removal wasn't requested or failed, do regular upload
      if (!imageUrl) {
        const result = await mediaService.uploadImage(projectId, file);
        imageUrl = result.imagekit_url || result.file_path || '';
        if (imageUrl && !imageUrl.startsWith('http')) {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
          imageUrl = `${API_BASE_URL.replace('/api', '')}${imageUrl}`;
        }
      }

      if (imageUrl) {
        setFormData({ ...formData, image_url: imageUrl });
        setImagePreview(imageUrl);
      }
    } catch (error: any) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleBulkImageUpload = async (files: FileList | null, removeBg: boolean = false) => {
    if (!files || files.length === 0) return;

    setBulkUploading(true);
    try {
      const fileArray = Array.from(files);
      const results = await mediaService.bulkUpload(projectId, fileArray, undefined, removeBg);

      if (results.success && results.results) {
        const uploaded = results.results.filter((r: any) => !r.error);
        const imageUrls = uploaded.map((r: any) => r.imagekit_url || r.file_path || '').filter(Boolean);
        
        if (imageUrls.length > 0) {
          // Update form with first image, or show selection
          setFormData({ ...formData, image_url: imageUrls[0] });
          setImagePreview(imageUrls[0]);
          alert(`Successfully uploaded ${uploaded.length} image(s). Using first image.`);
        }
      }
    } catch (error: any) {
      alert('Error uploading images: ' + error.message);
    } finally {
      setBulkUploading(false);
      if (bulkFileInputRef.current) {
        bulkFileInputRef.current.value = '';
      }
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
    setImagePreview(null);
    setEditingCharacter(null);
    setShowAddForm(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (bulkFileInputRef.current) bulkFileInputRef.current.value = '';
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
                <label className="block text-xs text-zinc-400 uppercase mb-1">Character Image</label>
                <div className="space-y-2">
                  {imagePreview && (
                    <div className="relative w-32 h-32 border border-zinc-700 rounded overflow-hidden">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreview(null);
                          setFormData({ ...formData, image_url: '' });
                        }}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    <label className="px-3 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm cursor-pointer">
                      {uploading ? 'Uploading...' : 'Upload Image'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, false);
                          }
                        }}
                        disabled={uploading}
                      />
                    </label>
                    <label className="px-3 py-2 bg-purple-600 hover:bg-purple-500 rounded text-sm cursor-pointer">
                      {removingBg ? 'Removing BG...' : 'Upload & Remove BG'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            handleImageUpload(file, true);
                          }
                        }}
                        disabled={removingBg || uploading}
                      />
                    </label>
                    <label className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm cursor-pointer">
                      {bulkUploading ? 'Uploading...' : 'Bulk Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        ref={bulkFileInputRef}
                        onChange={(e) => {
                          handleBulkImageUpload(e.target.files, false);
                        }}
                        disabled={bulkUploading}
                      />
                    </label>
                  </div>
                  <input
                    type="url"
                    value={formData.image_url}
                    onChange={(e) => {
                      setFormData({ ...formData, image_url: e.target.value });
                      setImagePreview(e.target.value || null);
                    }}
                    className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                    placeholder="Or enter image URL manually..."
                  />
                </div>
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
                      {character.image_url && (
                        <div className="mb-3">
                          <img
                            src={character.image_url}
                            alt={character.name}
                            className="w-full h-48 object-cover rounded border border-zinc-700"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
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

