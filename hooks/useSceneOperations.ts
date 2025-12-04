import { useState } from 'react';
import { Scene, StoryContext, DirectorSettings } from '../types';
import { DEFAULT_DIRECTOR_SETTINGS } from '../utils/constants';
import { apiService, checkApiAvailability } from '../apiService';
import { saveProjectToDB } from '../db';
import { enhanceScenePrompt, suggestDirectorSettings } from '../clientGeminiService';

interface UseSceneOperationsProps {
  scenes: Scene[];
  setScenes: (scenes: Scene[] | ((prev: Scene[]) => Scene[])) => void;
  storyContext: StoryContext;
  setStoryContext: (context: StoryContext) => void;
  currentSettings: DirectorSettings;
  setCurrentSettings: (settings: DirectorSettings) => void;
  currentInput: string;
  setCurrentInput: (input: string) => void;
  setIsProcessing: (processing: boolean) => void;
  setSaveStatus: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
  batchMode: boolean;
  selectedSceneIds: Set<string>;
  setSelectedSceneIds: (ids: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  draggedSceneIndex: number | null;
  setDraggedSceneIndex: (index: number | null) => void;
  dragOverIndex: number | null;
  setDragOverIndex: (index: number | null) => void;
  view: 'library' | 'setup' | 'studio' | 'dashboard' | 'timeline';
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  setQuickActionsMenu: (menu: { scene: Scene; position: { x: number; y: number } } | null) => void;
}

export const useSceneOperations = ({
  scenes,
  setScenes,
  storyContext,
  setStoryContext,
  currentSettings,
  setCurrentSettings,
  currentInput,
  setCurrentInput,
  setIsProcessing,
  setSaveStatus,
  batchMode,
  selectedSceneIds,
  setSelectedSceneIds,
  draggedSceneIndex,
  setDraggedSceneIndex,
  dragOverIndex,
  setDragOverIndex,
  view,
  showToast,
  setQuickActionsMenu
}: UseSceneOperationsProps) => {
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const handleGenerateScene = async () => {
    if (!currentInput.trim()) return;
    setIsProcessing(true);
    setSaveStatus('saving'); 

    const currentScenesSnapshot = scenes; 

    try {
      const prevContext = currentScenesSnapshot.length > 0 
        ? currentScenesSnapshot[currentScenesSnapshot.length - 1].contextSummary 
        : (storyContext.initialContext || null);

      let optimizedSettings: DirectorSettings;
      try {
        optimizedSettings = await suggestDirectorSettings(
          currentInput,
          storyContext,
          prevContext,
          currentSettings
        );
        
        if (!optimizedSettings || typeof optimizedSettings !== 'object' || Object.keys(optimizedSettings).length === 0) {
          console.warn('suggestDirectorSettings returned invalid result, using currentSettings');
          optimizedSettings = currentSettings;
        }
      } catch (error: any) {
        console.warn('Failed to get optimized settings, using current settings:', error);
        optimizedSettings = currentSettings;
      }
      
      setCurrentSettings(optimizedSettings);

      const newSequenceNumber = currentScenesSnapshot.length + 1;
      const sceneId = `scene-${Date.now()}`;
      
      const newScene: Scene = {
        id: sceneId,
        sequenceNumber: newSequenceNumber,
        rawIdea: currentInput,
        enhancedPrompt: 'Generating director specs...',
        status: 'generating',
        directorSettings: { ...optimizedSettings },
        contextSummary: ''
      };

      setScenes(prev => [...prev, newScene]);
      setCurrentInput('');

      if (!storyContext || typeof storyContext !== 'object' || !storyContext.id) {
        throw new Error('Invalid story context. Please ensure your project is properly initialized.');
      }

      if (!optimizedSettings || typeof optimizedSettings !== 'object') {
        throw new Error('Invalid director settings. Please try again.');
      }

      const { enhancedPrompt, contextSummary } = await enhanceScenePrompt(
        newScene.rawIdea,
        storyContext,
        prevContext,
        optimizedSettings
      );

      const completedScene: Scene = { 
        ...newScene, 
        enhancedPrompt, 
        contextSummary,
        status: 'completed',
        is_ai_generated: true
      };

      setScenes(prev => prev.map(s => s.id === sceneId ? completedScene : s));

      const updatedScenesList = [...currentScenesSnapshot, completedScene];
      const updatedContext = { ...storyContext, lastUpdated: Date.now() };
      
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        await apiService.saveProject({
          context: updatedContext,
          scenes: updatedScenesList,
          settings: optimizedSettings
        });
      } else {
        await saveProjectToDB({
          context: updatedContext,
          scenes: updatedScenesList,
          settings: optimizedSettings
        });
      }
      
      setStoryContext(updatedContext);
      setSaveStatus('saved');
      
      setTimeout(async () => {
        try {
          const apiAvailable = await checkApiAvailability();
          if (apiAvailable) {
            await apiService.saveProject({
              context: updatedContext,
              scenes: updatedScenesList,
              settings: optimizedSettings
            });
          } else {
            await saveProjectToDB({
              context: updatedContext,
              scenes: updatedScenesList,
              settings: optimizedSettings
            });
          }
        } catch (e) {
          console.error("Post-generation save failed:", e);
        }
        setSaveStatus('idle');
      }, 2000);

    } catch (error: any) {
      console.error("Critical error in flow:", error);
      const errorMessage = error.message || 'Failed to generate scene. Please check your Gemini API key and ensure the Generative Language API is enabled in Google Cloud Console.';
      alert(`Error: ${errorMessage}`);
      setScenes(prev => prev.map(s => s.status === 'generating' ? { ...s, status: 'failed', enhancedPrompt: errorMessage } : s));
      setSaveStatus('error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (!batchMode) {
      setDraggedSceneIndex(index);
      const target = e.currentTarget as HTMLElement;
      const dragImage = target.cloneNode(true) as HTMLElement;
      dragImage.style.opacity = '0.8';
      dragImage.style.transform = 'rotate(2deg)';
      dragImage.style.width = `${target.offsetWidth}px`;
      document.body.appendChild(dragImage);
      e.dataTransfer.setDragImage(dragImage, e.clientX - target.getBoundingClientRect().left, e.clientY - target.getBoundingClientRect().top);
      e.dataTransfer.effectAllowed = 'move';
      setTimeout(() => document.body.removeChild(dragImage), 0);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!batchMode && draggedSceneIndex !== null && draggedSceneIndex !== index) {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (batchMode || draggedSceneIndex === null || draggedSceneIndex === dropIndex) {
      setDraggedSceneIndex(null);
      return;
    }

    const newScenes = [...scenes];
    const draggedScene = newScenes[draggedSceneIndex];
    newScenes.splice(draggedSceneIndex, 1);
    newScenes.splice(dropIndex, 0, draggedScene);

    const updatedScenes = newScenes.map((scene, idx) => ({
      ...scene,
      sequenceNumber: idx + 1,
    }));

    setScenes(updatedScenes);
    setDraggedSceneIndex(null);

    try {
      const updatedContext = { ...storyContext, lastUpdated: Date.now() };
      const apiAvailable = await checkApiAvailability();
      
      if (apiAvailable) {
        const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const token = localStorage.getItem('auth_token');
        
        const sequenceUpdates = updatedScenes.map((scene, idx) => ({
          id: scene.id,
          sequence_number: idx + 1,
        }));

        await fetch(`${API_BASE_URL}/clips/batch`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clip_ids: updatedScenes.map(s => s.id),
            operation: 'update_sequence',
            data: { sequence_updates: sequenceUpdates },
          }),
        });

        await apiService.saveProject({
          context: updatedContext,
          scenes: updatedScenes,
          settings: currentSettings
        });
      } else {
        await saveProjectToDB({
          context: updatedContext,
          scenes: updatedScenes,
          settings: currentSettings
        });
      }
      setStoryContext(updatedContext);
      const movedFrom = draggedSceneIndex + 1;
      const movedTo = dropIndex + 1;
      showToast(`Scene moved from position ${movedFrom} to ${movedTo}`, 'success');
    } catch (error) {
      console.error('Failed to save reordered scenes:', error);
      showToast('Failed to save reordered scenes', 'error');
    }
  };

  const handleSceneReorder = (direction: 'up' | 'down') => {
    if (batchMode || scenes.length === 0 || view !== 'studio') return;
    
    const selectedSceneId = selectedSceneIds.size > 0 
      ? Array.from(selectedSceneIds)[0] 
      : scenes[0]?.id;
    
    if (!selectedSceneId) return;
    
    const currentIndex = scenes.findIndex(s => s.id === selectedSceneId);
    if (currentIndex === -1) return;
    
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= scenes.length) return;
    
    const newScenes = [...scenes];
    const draggedScene = newScenes[currentIndex];
    newScenes.splice(currentIndex, 1);
    newScenes.splice(newIndex, 0, draggedScene);
    
    const updatedScenes = newScenes.map((scene, idx) => ({
      ...scene,
      sequenceNumber: idx + 1,
    }));
    
    setScenes(updatedScenes);
    
    (async () => {
      try {
        const updatedContext = { ...storyContext, lastUpdated: Date.now() };
        const apiAvailable = await checkApiAvailability();
        
        if (apiAvailable) {
          const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
          const token = localStorage.getItem('auth_token');
          
          const sequenceUpdates = updatedScenes.map((scene, idx) => ({
            id: scene.id,
            sequence_number: idx + 1,
          }));
          
          await fetch(`${API_BASE_URL}/clips/batch`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              clip_ids: updatedScenes.map(s => s.id),
              operation: 'update_sequence',
              data: { sequence_updates: sequenceUpdates },
            }),
          });
          
          await apiService.saveProject({
            context: updatedContext,
            scenes: updatedScenes,
            settings: currentSettings
          });
        } else {
          await saveProjectToDB({
            context: updatedContext,
            scenes: updatedScenes,
            settings: currentSettings
          });
        }
        
        setStoryContext(updatedContext);
        showToast(`Scene moved ${direction === 'up' ? 'up' : 'down'}`, 'success');
      } catch (error: any) {
        console.error('Failed to reorder scene:', error);
        showToast('Failed to reorder scene', 'error');
        setScenes(scenes);
      }
    })();
  };

  const handleToggleSceneSelection = (sceneId: string) => {
    setSelectedSceneIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sceneId)) {
        newSet.delete(sceneId);
      } else {
        newSet.add(sceneId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedSceneIds.size === scenes.length) {
      setSelectedSceneIds(new Set());
    } else {
      setSelectedSceneIds(new Set(scenes.map(s => s.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSceneIds.size === 0) return;
    const count = selectedSceneIds.size;
    if (!window.confirm(`Delete ${count} selected scene(s)?`)) return;

    try {
      const apiAvailable = await checkApiAvailability();
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('auth_token');
      const idsToDelete = Array.from(selectedSceneIds);

      if (apiAvailable) {
        const response = await fetch(`${API_BASE_URL}/clips/batch`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clip_ids: idsToDelete,
            operation: 'delete',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to delete scenes');
        }
      }

      setScenes(prev => {
        const filtered = prev.filter(s => !selectedSceneIds.has(s.id));
        return filtered.map((s, idx) => ({
          ...s,
          sequenceNumber: idx + 1
        }));
      });

      setSelectedSceneIds(new Set());
      showToast(`${count} scene(s) deleted successfully`, 'success');
    } catch (error: any) {
      showToast('Failed to delete scenes', 'error');
    }
  };

  const handleBulkStatusUpdate = async (status: string) => {
    if (selectedSceneIds.size === 0) return;

    try {
      const apiAvailable = await checkApiAvailability();
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('auth_token');

      if (apiAvailable) {
        const response = await fetch(`${API_BASE_URL}/clips/batch`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clip_ids: Array.from(selectedSceneIds),
            operation: 'update_status',
            data: { status },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update scenes');
        }
      }

      setScenes(prev =>
        prev.map(scene =>
          selectedSceneIds.has(scene.id)
            ? { ...scene, status: status as any }
            : scene
        )
      );

      showToast(`${selectedSceneIds.size} scene(s) updated to ${status}`, 'success');
    } catch (error: any) {
      showToast('Failed to update scenes', 'error');
    }
  };

  const handleBulkTagAssignment = async (tagId: number) => {
    if (selectedSceneIds.size === 0) return;

    try {
      const apiAvailable = await checkApiAvailability();
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('auth_token');

      if (apiAvailable) {
        await Promise.all(
          Array.from(selectedSceneIds).map(async (sceneId) => {
            try {
              await fetch(`${API_BASE_URL}/clips/${sceneId}/tags`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ tag_id: tagId }),
              });
            } catch (error) {
              console.warn(`Failed to assign tag to scene ${sceneId}:`, error);
            }
          })
        );
      }

      showToast(`Tag assigned to ${selectedSceneIds.size} scene(s)`, 'success');
    } catch (error: any) {
      showToast('Failed to assign tags', 'error');
    }
  };

  const handleDuplicateScene = async (scene: Scene) => {
    try {
      const newSequenceNumber = scenes.length + 1;
      const duplicatedScene: Scene = {
        ...scene,
        id: `scene-${Date.now()}`,
        sequenceNumber: newSequenceNumber,
        is_ai_generated: false,
      };

      setScenes(prev => [...prev, duplicatedScene]);

      const updatedContext = { ...storyContext, lastUpdated: Date.now() };
      const updatedScenes = [...scenes, duplicatedScene];
      
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        await apiService.saveProject({
          context: updatedContext,
          scenes: updatedScenes,
          settings: currentSettings
        });
      } else {
        await saveProjectToDB({
          context: updatedContext,
          scenes: updatedScenes,
          settings: currentSettings
        });
      }

      setStoryContext(updatedContext);
      showToast('Scene duplicated successfully', 'success');
    } catch (error: any) {
      console.error('Failed to duplicate scene:', error);
      showToast('Failed to duplicate scene', 'error');
    }
  };

  const handleAutoSuggestSettings = async () => {
    setIsAutoFilling(true);
    try {
      const prevContext = scenes.length > 0 
        ? scenes[scenes.length - 1].contextSummary 
        : (storyContext.initialContext || null);
        
      const newSettings = await suggestDirectorSettings(
        currentInput,
        storyContext,
        prevContext,
        currentSettings
      );
      
      setCurrentSettings(newSettings);
    } catch (error: any) {
      console.error("Error auto-suggesting settings:", error);
      alert(`Failed to suggest settings: ${error.message || 'Please check your Gemini API key and ensure the Generative Language API is enabled.'}`);
    } finally {
      setIsAutoFilling(false);
    }
  };

  const handleClearSettings = () => {
    setCurrentSettings(DEFAULT_DIRECTOR_SETTINGS);
  };

  const handleSceneContextMenu = (e: React.MouseEvent, scene: Scene) => {
    e.preventDefault();
    setQuickActionsMenu({
      scene,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  return {
    isAutoFilling,
    setIsAutoFilling,
    handleGenerateScene,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleSceneReorder,
    handleToggleSceneSelection,
    handleSelectAll,
    handleBulkDelete,
    handleBulkStatusUpdate,
    handleBulkTagAssignment,
    handleDuplicateScene,
    handleAutoSuggestSettings,
    handleClearSettings,
    handleSceneContextMenu
  };
};

