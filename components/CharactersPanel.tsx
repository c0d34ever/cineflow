import React, { useState, useEffect, useRef } from 'react';
import { charactersService, mediaService } from '../apiServices';
import { extractCharacters } from '../clientGeminiService';
import { StoryContext, Scene } from '../types';
import { getFullImageUrl } from '../utils/imageUtils';
import { generateCharacterPrompt, generateCharacterImagePrompt } from '../utils/promptGenerators';
import BackgroundRemovalModal from './BackgroundRemovalModal';

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
  const [showBgRemovalModal, setShowBgRemovalModal] = useState(false);
  const [bgRemovalFile, setBgRemovalFile] = useState<File | null>(null);
  const [extractionProgress, setExtractionProgress] = useState<{ progress: number; message: string } | null>(null);
  const [generatingPrompt, setGeneratingPrompt] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [generatingImagePrompt, setGeneratingImagePrompt] = useState(false);
  const [generatedImagePrompt, setGeneratedImagePrompt] = useState<string | null>(null);
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
    if (removeBg) {
      // Show preview modal instead of processing immediately
      setBgRemovalFile(file);
      setShowBgRemovalModal(true);
      return;
    }

    setUploading(true);
    try {
      const result = await mediaService.uploadImage(projectId, file);
      const imageUrl = result.imagekit_url || result.file_path || '';
      const fullUrl = imageUrl && !imageUrl.startsWith('http')
        ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${imageUrl}`
        : imageUrl;

      if (fullUrl) {
        setFormData({ ...formData, image_url: fullUrl });
        setImagePreview(fullUrl);
      }
    } catch (error: any) {
      alert('Error uploading image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleBgRemovalConfirm = async (processedFile: File, processedUrl: string) => {
    setUploading(true);
    try {
      // Upload the processed file
      const result = await mediaService.uploadImage(projectId, processedFile);
      const imageUrl = result.imagekit_url || result.file_path || processedUrl;
      const fullUrl = imageUrl && !imageUrl.startsWith('http')
        ? `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000'}${imageUrl}`
        : imageUrl;

      if (fullUrl) {
        setFormData({ ...formData, image_url: fullUrl });
        setImagePreview(fullUrl);
      }
    } catch (error: any) {
      alert('Error uploading processed image: ' + error.message);
    } finally {
      setUploading(false);
      setBgRemovalFile(null);
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
        <div className="p-4 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-xl font-bold">Character Management</h2>
              {extractionProgress && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-sm text-zinc-400">
                    <span>{extractionProgress.message}</span>
                    <span className="text-amber-500">{extractionProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-1">
                    <div 
                      className="bg-amber-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${extractionProgress.progress}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-2">
            {storyContext && (
              <button
                onClick={async () => {
                  setLoading(true);
                  setExtractionProgress({ progress: 0, message: 'Starting extraction...' });
                  try {
                    const extracted = await extractCharacters(storyContext, scenes, (progress, message) => {
                      setExtractionProgress({ progress, message });
                    });
                    setExtractionProgress({ progress: 100, message: 'Creating characters...' });
                    for (const char of extracted) {
                      await charactersService.create({ project_id: projectId, ...char });
                    }
                    await loadCharacters();
                    setExtractionProgress(null);
                    alert(`Extracted and created ${extracted.length} characters from the complete story!`);
                  } catch (error: any) {
                    setExtractionProgress(null);
                    alert('Error: ' + error.message);
                  } finally {
                    setLoading(false);
                    setExtractionProgress(null);
                  }
                }}
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm"
                title="Auto-extract characters from entire story (all scenes)"
                disabled={loading}
              >
                {loading ? '⏳ Extracting...' : '✨ Auto-Extract'}
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
              
              {/* AI Prompt Generator */}
              <div className="border-t border-zinc-800 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs text-zinc-400 uppercase">AI Prompt Generator</label>
                  <div className="flex gap-2">
                    <button
                    type="button"
                    onClick={async () => {
                      if (!storyContext) {
                        alert('Story context is required to generate prompts');
                        return;
                      }
                      setGeneratingPrompt(true);
                      setGeneratedPrompt(null);
                      try {
                        const existingChars = characters.map(c => ({ name: c.name, role: c.role }));
                        const prompt = await generateCharacterPrompt(
                          storyContext,
                          existingChars,
                          {
                            name: formData.name || undefined,
                            role: formData.role || undefined,
                            purpose: formData.description || undefined
                          }
                        );
                        setGeneratedPrompt(prompt);
                      } catch (error: any) {
                        alert(`Failed to generate prompt: ${error.message}`);
                      } finally {
                        setGeneratingPrompt(false);
                      }
                    }}
                    disabled={generatingPrompt || !storyContext}
                    className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {generatingPrompt ? (
                      <>
                        <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                          <path d="M15.98 1.804a1 1 0 00-1.96 0l-.84 4.42a1 1 0 01-.82.67l-4.83.49a1 1 0 00-.9 1.2l1.08 5.64a1 1 0 01-.72 1.15l-4.57 1.29a1 1 0 00-.7 1.23l.53 2.9a1 1 0 001.3 1.13l5.28-2.12a1 1 0 01.8 0l5.28 2.12a1 1 0 001.3-1.13l-.53-2.9a1 1 0 00-.7-1.23l-4.57-1.29a1 1 0 01-.72-1.15l1.08-5.64a1 1 0 00-.9-1.2l-4.83-.49a1 1 0 01-.82-.67l-.84-4.42z" />
                        </svg>
                        Text Prompt
                      </>
                    )}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!storyContext) {
                          alert('Story context is required to generate prompts');
                          return;
                        }
                        setGeneratingImagePrompt(true);
                        setGeneratedImagePrompt(null);
                        try {
                          const prompt = await generateCharacterImagePrompt(
                            storyContext,
                            {
                              name: formData.name || undefined,
                              role: formData.role || undefined,
                              appearance: formData.appearance || undefined,
                              personality: formData.personality || undefined
                            }
                          );
                          setGeneratedImagePrompt(prompt);
                        } catch (error: any) {
                          alert(`Failed to generate image prompt: ${error.message}`);
                        } finally {
                          setGeneratingImagePrompt(false);
                        }
                      }}
                      disabled={generatingImagePrompt || !storyContext}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      title="Generate prompt optimized for AI image generation (DALL-E, Stable Diffusion, Midjourney, etc.)"
                    >
                      {generatingImagePrompt ? (
                        <>
                          <svg className="animate-spin h-3 w-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                            <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909a.75.75 0 01-1.06 0l-1.78-1.78a.75.75 0 00-1.06 0l-2.22 2.22zm12-2.62a.75.75 0 00-1.06 0l-1.91 1.91a.75.75 0 01-1.06 0l-1.78-1.78a.75.75 0 00-1.06 0L4.5 8.94v-.19a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v.19l2.22-2.22a.75.75 0 011.06 0l1.78 1.78a.75.75 0 001.06 0l1.91-1.91a.75.75 0 011.06 0z" clipRule="evenodd" />
                          </svg>
                          Image Prompt
                        </>
                      )}
                    </button>
                  </div>
                </div>
                {generatedPrompt && (
                  <div className="mb-3 p-3 bg-zinc-950 border border-zinc-700 rounded text-sm text-zinc-300 max-h-60 overflow-y-auto">
                    <div className="whitespace-pre-wrap">{generatedPrompt}</div>
                    <button
                      type="button"
                      onClick={() => {
                        // Parse the prompt and fill form fields
                        const lines = generatedPrompt.split('\n');
                        let currentField = '';
                        const parsed: any = {};
                        
                        lines.forEach(line => {
                          const trimmed = line.trim();
                          if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
                            currentField = trimmed.replace(/\*\*/g, '').toLowerCase();
                          } else if (trimmed && currentField) {
                            if (!parsed[currentField]) parsed[currentField] = [];
                            parsed[currentField].push(trimmed);
                          }
                        });
                        
                        // Build new form data object with extracted values
                        const newFormData = { ...formData };
                        
                        // Extract and fill fields
                        if (parsed['character name'] || parsed['name']) {
                          const nameMatch = generatedPrompt.match(/\*\*Character Name\*\*[:\s]+([^\n]+)/i) || 
                                           generatedPrompt.match(/\*\*Name\*\*[:\s]+([^\n]+)/i) ||
                                           generatedPrompt.match(/Name[:\s]+([^\n]+)/i);
                          if (nameMatch) newFormData.name = nameMatch[1].trim();
                        }
                        if (parsed['role in story'] || parsed['role']) {
                          const roleMatch = generatedPrompt.match(/\*\*Role in Story\*\*[:\s]+([^\n]+)/i) ||
                                           generatedPrompt.match(/\*\*Role\*\*[:\s]+([^\n]+)/i);
                          if (roleMatch) newFormData.role = roleMatch[1].trim();
                        }
                        if (parsed['physical appearance'] || parsed['appearance']) {
                          const appearanceText = generatedPrompt.match(/\*\*Physical Appearance\*\*[:\s]+([\s\S]+?)(?=\*\*|$)/i) ||
                                                generatedPrompt.match(/\*\*Appearance\*\*[:\s]+([\s\S]+?)(?=\*\*|$)/i);
                          if (appearanceText) newFormData.appearance = appearanceText[1].trim();
                        }
                        if (parsed['personality traits'] || parsed['personality']) {
                          const personalityText = generatedPrompt.match(/\*\*Personality Traits\*\*[:\s]+([\s\S]+?)(?=\*\*|$)/i) ||
                                                  generatedPrompt.match(/\*\*Personality\*\*[:\s]+([\s\S]+?)(?=\*\*|$)/i);
                          if (personalityText) newFormData.personality = personalityText[1].trim();
                        }
                        if (parsed['background/backstory'] || parsed['backstory']) {
                          const backstoryText = generatedPrompt.match(/\*\*Background\/Backstory\*\*[:\s]+([\s\S]+?)(?=\*\*|$)/i) ||
                                               generatedPrompt.match(/\*\*Backstory\*\*[:\s]+([\s\S]+?)(?=\*\*|$)/i);
                          if (backstoryText) newFormData.backstory = backstoryText[1].trim();
                        }
                        if (parsed['description']) {
                          const descriptionText = generatedPrompt.match(/\*\*Description\*\*[:\s]+([\s\S]+?)(?=\*\*|$)/i);
                          if (descriptionText) newFormData.description = descriptionText[1].trim();
                        }
                        
                        // Update state with new object
                        setFormData(newFormData);
                        setGeneratedPrompt(null);
                        alert('Prompt details extracted and filled into form!');
                      }}
                      className="mt-2 px-3 py-1 bg-amber-600 hover:bg-amber-500 rounded text-xs"
                    >
                      Use This Prompt to Fill Form
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedPrompt);
                        alert('Prompt copied to clipboard!');
                      }}
                      className="mt-2 ml-2 px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs"
                    >
                      Copy Prompt
                    </button>
                  </div>
                )}
                {generatedImagePrompt && (
                  <div className="mb-3 p-3 bg-zinc-950 border border-zinc-700 rounded text-sm text-zinc-300 max-h-60 overflow-y-auto">
                    <div className="whitespace-pre-wrap">{generatedImagePrompt}</div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(generatedImagePrompt);
                        alert('Image prompt copied to clipboard!');
                      }}
                      className="mt-2 ml-2 px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs"
                    >
                      Copy Image Prompt
                    </button>
                  </div>
                )}
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
                      Upload & Remove BG
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
                        disabled={uploading}
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

      {/* Background Removal Modal */}
      {showBgRemovalModal && bgRemovalFile && (
        <BackgroundRemovalModal
          file={bgRemovalFile}
          onClose={() => {
            setShowBgRemovalModal(false);
            setBgRemovalFile(null);
          }}
          onConfirm={handleBgRemovalConfirm}
          projectId={projectId}
        />
      )}
    </div>
  );
};

export default CharactersPanel;

