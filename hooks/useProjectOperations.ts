import { useState } from 'react';
import { ProjectData } from '../db';
import { StoryContext, DirectorSettings, Scene } from '../types';
import { ContentType } from '../components/ContentTypeSelector';
import { generateId } from '../utils/helpers';
import { DEFAULT_CONTEXT, DEFAULT_DIRECTOR_SETTINGS } from '../utils/constants';
import { apiService, checkApiAvailability } from '../apiService';
import { getProjectsFromDB, saveProjectToDB, deleteProjectFromDB } from '../db';
import { activityService, archiveProject, templatesService } from '../apiServices';

interface UseProjectOperationsProps {
  setStoryContext: (context: StoryContext) => void;
  setScenes: (scenes: Scene[]) => void;
  setCurrentSettings: (settings: DirectorSettings) => void;
  setView: (view: 'library' | 'setup' | 'studio' | 'dashboard' | 'timeline') => void;
  setSetupTab: (tab: 'new' | 'resume') => void;
  setProjects: (projects: ProjectData[]) => void;
  loadLibrary: () => Promise<void>;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  setShowContentTypeSelector: (show: boolean) => void;
  setSelectedContentType: (type: ContentType | null) => void;
}

export const useProjectOperations = ({
  setStoryContext,
  setScenes,
  setCurrentSettings,
  setView,
  setSetupTab,
  setProjects,
  loadLibrary,
  showToast,
  setShowContentTypeSelector,
  setSelectedContentType
}: UseProjectOperationsProps) => {
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  const handleOpenProject = async (project: ProjectData) => {
    setStoryContext(project.context);
    setScenes(project.scenes);
    setCurrentSettings(project.settings);
    setView('studio');
    
    // Track view
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/analytics/project/${project.context.id}/view`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      // Silent fail
    }
  };

  const handleDuplicateProject = async (e: React.MouseEvent, project: ProjectData) => {
    e.stopPropagation();
    try {
      const newId = generateId();
      const duplicatedProject: ProjectData = {
        context: {
          ...project.context,
          id: newId,
          title: `${project.context.title} (Copy)`,
          lastUpdated: Date.now()
        },
        scenes: project.scenes.map(scene => ({
          ...scene,
          id: generateId()
        })),
        settings: project.settings
      };

      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        await apiService.saveProject(duplicatedProject);
        // Log activity
        try {
          await activityService.logActivity({
            project_id: newId,
            activity_type: 'project_duplicated',
            activity_description: `Duplicated project: ${project.context.title}`
          });
        } catch (e) {
          // Silent fail
        }
      } else {
        await saveProjectToDB(duplicatedProject);
      }
      loadLibrary();
      showToast('Project duplicated successfully!', 'success');
    } catch (error) {
      console.error("Failed to duplicate project:", error);
      showToast('Failed to duplicate project', 'error');
    }
  };

  const handleArchiveProject = async (e: React.MouseEvent, projectId: string, archived: boolean) => {
    e.stopPropagation();
    try {
      await archiveProject(projectId, archived);
      await loadLibrary();
      showToast(`Project ${archived ? 'archived' : 'unarchived'} successfully!`, 'success');
    } catch (error: any) {
      showToast('Error: ' + error.message, 'error');
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm("Are you sure you want to delete this story?")) {
      try {
        const apiAvailable = await checkApiAvailability();
        if (apiAvailable) {
          await apiService.deleteProject(id);
        } else {
          await deleteProjectFromDB(id);
        }
        loadLibrary();
      } catch (error) {
        console.error("Failed to delete project:", error);
        // Fallback to IndexedDB
        try {
          await deleteProjectFromDB(id);
          loadLibrary();
        } catch (fallbackError) {
          console.error("IndexedDB fallback also failed:", fallbackError);
          alert("Failed to delete project");
        }
      }
    }
  };

  const handleCreateNew = () => {
    // Show content type selector immediately
    setShowContentTypeSelector(true);
  };

  const handleContentTypeSelect = (contentType: ContentType) => {
    // Close selector
    setSelectedContentType(contentType);
    setShowContentTypeSelector(false);
    
    // Create new project with selected content type
    const newContext: StoryContext = {
      ...DEFAULT_CONTEXT,
      id: generateId(),
      lastUpdated: Date.now(),
      contentType: contentType // Store content type
    };

    // Update state and navigate to setup
    setStoryContext(newContext);
    setScenes([]);
    setCurrentSettings(DEFAULT_DIRECTOR_SETTINGS);
    setSetupTab('new');
    setView('setup');
  };

  const handleTemplateSelect = (template: any) => {
    const newContext: StoryContext = {
      id: generateId(),
      title: '',
      genre: template.genre || '',
      plotSummary: template.plot_summary || '',
      characters: template.characters || '',
      initialContext: template.initial_context || '',
      lastUpdated: Date.now()
    };

    const templateSettings: DirectorSettings = template.director_settings 
      ? { ...DEFAULT_DIRECTOR_SETTINGS, ...template.director_settings }
      : DEFAULT_DIRECTOR_SETTINGS;

    setStoryContext(newContext);
    setScenes([]);
    setCurrentSettings(templateSettings);
    setSetupTab('new');
    setView('setup');
  };

  const handleSaveAsTemplate = async (templateName: string, storyContext: StoryContext, currentSettings: DirectorSettings) => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    try {
      await templatesService.create({
        name: templateName,
        description: `Template based on "${storyContext.title}"`,
        genre: storyContext.genre,
        plot_summary: storyContext.plotSummary,
        characters: storyContext.characters,
        initial_context: storyContext.initialContext,
        director_settings: currentSettings
      });
      alert('Template saved successfully!');
      return true;
    } catch (error: any) {
      alert('Error: ' + error.message);
      return false;
    }
  };

  const handleImportProject = async (file: File): Promise<boolean> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const json = JSON.parse(event.target?.result as string);
          if (json.context && json.scenes && json.settings) {
            const projectData: ProjectData = {
              context: { ...json.context, lastUpdated: Date.now() },
              scenes: json.scenes,
              settings: json.settings
            };
            
            const apiAvailable = await checkApiAvailability();
            if (apiAvailable) {
              await apiService.saveProject(projectData);
            } else {
              await saveProjectToDB(projectData);
            }
            await loadLibrary();
            showToast('Project imported successfully!', 'success');
            resolve(true);
          } else {
            showToast('Invalid project file format', 'error');
            resolve(false);
          }
        } catch (error) {
          console.error("Import failed", error);
          showToast('Failed to parse project file', 'error');
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  };

  return {
    isAutoFilling,
    setIsAutoFilling,
    handleOpenProject,
    handleDuplicateProject,
    handleArchiveProject,
    handleDeleteProject,
    handleCreateNew,
    handleContentTypeSelect,
    handleTemplateSelect,
    handleSaveAsTemplate,
    handleImportProject
  };
};

