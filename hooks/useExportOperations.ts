import { useState } from 'react';
import { Scene, StoryContext, DirectorSettings, ExportData } from '../types';
import { ExportJob } from '../components/ExportQueuePanel';
import { checkApiAvailability } from '../apiService';
import { mediaService, comicsService } from '../apiServices';
import { exportToMarkdown, exportToCSV, exportToPDF, exportToFountain, downloadFile, PDFStyle } from '../utils/exportUtils';

interface UseExportOperationsProps {
  scenes: Scene[];
  storyContext: StoryContext;
  currentSettings: DirectorSettings;
  selectedSceneIds: Set<string>;
  exportQueue: ExportJob[];
  setExportQueue: (queue: ExportJob[] | ((prev: ExportJob[]) => ExportJob[])) => void;
  processingJobId: string | null;
  setProcessingJobId: (id: string | null) => void;
  showCoverImageSelector: boolean;
  setShowCoverImageSelector: (show: boolean) => void;
  selectedCoverImageId: string | null;
  setSelectedCoverImageId: (id: string | null) => void;
  setShowExportMenu: (show: boolean) => void;
  comicExists: boolean;
  setComicExists: (exists: boolean) => void;
  isRegeneratingComic: boolean;
  setIsRegeneratingComic: (regenerating: boolean) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const useExportOperations = ({
  scenes,
  storyContext,
  currentSettings,
  selectedSceneIds,
  exportQueue,
  setExportQueue,
  processingJobId,
  setProcessingJobId,
  showCoverImageSelector,
  setShowCoverImageSelector,
  selectedCoverImageId,
  setSelectedCoverImageId,
  setShowExportMenu,
  comicExists,
  setComicExists,
  isRegeneratingComic,
  setIsRegeneratingComic,
  showToast
}: UseExportOperationsProps) => {
  const getExportData = async (): Promise<ExportData> => {
    const sceneMediaMap = new Map<string, any[]>();
    
    try {
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable && storyContext.id) {
        for (const scene of scenes) {
          try {
            const media = await mediaService.getSceneMedia(scene.id);
            if (media && media.length > 0) {
              sceneMediaMap.set(scene.id, media);
            }
          } catch (error) {
            console.warn(`Failed to load media for scene ${scene.id}:`, error);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load media for export:', error);
    }
    
    return {
      context: storyContext,
      scenes: scenes,
      settings: currentSettings,
      exportedAt: new Date().toISOString(),
      sceneMedia: sceneMediaMap
    };
  };

  const handleExport = async (format: 'json' | 'markdown' | 'csv' | 'pdf' | 'fountain') => {
    const filename = `${storyContext.title.replace(/\s+/g, '_')}_storyboard`;
    
    try {
      const data = await getExportData();
      
      switch (format) {
        case 'json':
          downloadFile(
            JSON.stringify(data, null, 2),
            `${filename}.json`,
            'application/json'
          );
          break;
        case 'markdown':
          downloadFile(
            exportToMarkdown(data),
            `${filename}.md`,
            'text/markdown'
          );
          break;
        case 'csv':
          downloadFile(
            exportToCSV(data),
            `${filename}.csv`,
            'text/csv'
          );
          break;
        case 'fountain':
          downloadFile(
            exportToFountain(data),
            `${filename}.fountain`,
            'text/plain'
          );
          break;
        case 'pdf':
          const styleChoice = window.prompt(
            'Choose PDF Export Style:\n\n' +
            'Enter "1" for Comic Book Style (DC/Marvel style with panels, speech bubbles, dramatic design)\n' +
            'Enter "2" for Raw/Plain Style (Traditional document format)\n\n' +
            'Your choice (1 or 2):',
            '1'
          );
          const pdfStyle: PDFStyle = (styleChoice === '2') ? 'raw' : 'comic';
          
          if (pdfStyle === 'comic') {
            if (storyContext.coverImageUrl) {
              await exportToPDF(data, pdfStyle, undefined, null);
            } else {
              setShowCoverImageSelector(true);
              return;
            }
            break;
          }
          
          await exportToPDF(data, pdfStyle);
          break;
      }
      
      // Track export in database if API available
      try {
        const apiAvailable = await checkApiAvailability();
        if (apiAvailable && storyContext.id) {
          const token = localStorage.getItem('auth_token');
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/exports`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              project_id: storyContext.id,
              export_type: format,
              file_name: `${filename}.${format === 'pdf' ? 'pdf' : format}`,
            }),
          });
        }
      } catch (e) {
        console.error('Failed to track export:', e);
      }
      
      setShowExportMenu(false);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    }
  };

  const handleExportSelectedScenes = async (format: 'json' | 'markdown' | 'csv' | 'pdf' | 'fountain') => {
    if (selectedSceneIds.size === 0) {
      showToast('Please select scenes to export', 'error');
      return;
    }

    const selectedScenes = scenes.filter(s => selectedSceneIds.has(s.id));
    if (selectedScenes.length === 0) return;

    try {
      const exportData: any = {
        context: storyContext,
        scenes: selectedScenes,
        settings: currentSettings,
      };

      switch (format) {
        case 'json':
          const jsonStr = JSON.stringify(exportData, null, 2);
          const jsonBlob = new Blob([jsonStr], { type: 'application/json' });
          const jsonUrl = URL.createObjectURL(jsonBlob);
          const jsonA = document.createElement('a');
          jsonA.href = jsonUrl;
          jsonA.download = `${storyContext.title || 'project'}-selected-scenes.json`;
          jsonA.click();
          URL.revokeObjectURL(jsonUrl);
          break;

        case 'markdown':
          const { exportToMarkdown } = await import('../utils/exportUtils');
          exportToMarkdown(exportData, `${storyContext.title || 'project'}-selected-scenes`);
          break;

        case 'csv':
          const { exportToCSV } = await import('../utils/exportUtils');
          exportToCSV(exportData, `${storyContext.title || 'project'}-selected-scenes`);
          break;

        case 'pdf':
          const { exportToPDF } = await import('../utils/exportUtils');
          await exportToPDF(exportData, `${storyContext.title || 'project'}-selected-scenes`);
          break;

        case 'fountain':
          const { exportToFountain } = await import('../utils/exportUtils');
          exportToFountain(exportData, `${storyContext.title || 'project'}-selected-scenes`);
          break;
      }

      showToast(`Exported ${selectedScenes.length} selected scene(s) as ${format.toUpperCase()}`, 'success');
    } catch (error: any) {
      showToast(`Failed to export scenes: ${error.message}`, 'error');
    }
  };

  const addExportToQueue = (job: Omit<ExportJob, 'id' | 'status' | 'progress' | 'createdAt'>) => {
    const newJob: ExportJob = {
      ...job,
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      status: 'queued',
      progress: 0,
      createdAt: new Date()
    };
    setExportQueue(prev => [...prev, newJob]);
    processExportQueue();
    showToast(`Export added to queue`, 'info');
  };

  const processExportQueue = async () => {
    if (processingJobId) return;

    const nextJob = exportQueue.find(j => j.status === 'queued');
    if (!nextJob) return;

    setProcessingJobId(nextJob.id);
    setExportQueue(prev => prev.map(j => 
      j.id === nextJob.id ? { ...j, status: 'processing' as const, progress: 10 } : j
    ));

    try {
      const filename = `${nextJob.projectTitle.replace(/\s+/g, '_')}_storyboard`;
      const data = await getExportData();
      
      setExportQueue(prev => prev.map(j => 
        j.id === nextJob.id ? { ...j, progress: 30 } : j
      ));

      let fileDownloaded = false;
      switch (nextJob.format) {
        case 'json':
          downloadFile(JSON.stringify(data, null, 2), `${filename}.json`, 'application/json');
          fileDownloaded = true;
          break;
        case 'markdown':
          downloadFile(exportToMarkdown(data), `${filename}.md`, 'text/markdown');
          fileDownloaded = true;
          break;
        case 'csv':
          downloadFile(exportToCSV(data), `${filename}.csv`, 'text/csv');
          fileDownloaded = true;
          break;
        case 'fountain':
          downloadFile(exportToFountain(data), `${filename}.fountain`, 'text/plain');
          fileDownloaded = true;
          break;
        case 'pdf':
          setExportQueue(prev => prev.map(j => 
            j.id === nextJob.id ? { ...j, progress: 50 } : j
          ));
          const styleChoice = window.prompt(
            'Choose PDF Export Style:\n\n' +
            'Enter "1" for Comic Book Style\n' +
            'Enter "2" for Raw/Plain Style\n\n' +
            'Your choice (1 or 2):',
            '1'
          );
          const pdfStyle: PDFStyle = (styleChoice === '2') ? 'raw' : 'comic';
          if (pdfStyle === 'comic') {
            setSelectedCoverImageId(null);
            setShowCoverImageSelector(true);
            (window as any).pendingPdfExportJob = nextJob.id;
            setExportQueue(prev => prev.map(j => 
              j.id === nextJob.id ? { ...j, progress: 70 } : j
            ));
            return;
          }
          await exportToPDF(data, pdfStyle);
          fileDownloaded = true;
          break;
      }

      setExportQueue(prev => prev.map(j => 
        j.id === nextJob.id ? { 
          ...j, 
          status: 'completed' as const, 
          progress: 100,
          fileName: `${filename}.${nextJob.format === 'pdf' ? 'pdf' : nextJob.format}`
        } : j
      ));

      // Track export in database
      try {
        const apiAvailable = await checkApiAvailability();
        if (apiAvailable && storyContext.id) {
          const token = localStorage.getItem('auth_token');
          await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/exports`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              project_id: storyContext.id,
              export_type: nextJob.format,
              file_name: `${filename}.${nextJob.format === 'pdf' ? 'pdf' : nextJob.format}`,
            }),
          });
        }
      } catch (e) {
        console.error('Failed to track export:', e);
      }

      showToast(`Export completed: ${filename}`, 'success');
    } catch (error: any) {
      setExportQueue(prev => prev.map(j => 
        j.id === nextJob.id ? { 
          ...j, 
          status: 'failed' as const,
          error: error.message || 'Export failed'
        } : j
      ));
      showToast(`Export failed: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      setProcessingJobId(null);
      setTimeout(() => processExportQueue(), 500);
    }
  };

  const cancelExportJob = (jobId: string) => {
    setExportQueue(prev => prev.map(j => 
      j.id === jobId ? { ...j, status: 'cancelled' as const } : j
    ));
    if (processingJobId === jobId) {
      setProcessingJobId(null);
      setTimeout(() => processExportQueue(), 500);
    }
    showToast('Export cancelled', 'info');
  };

  const retryExportJob = (jobId: string) => {
    setExportQueue(prev => prev.map(j => 
      j.id === jobId ? { 
        ...j, 
        status: 'queued' as const, 
        progress: 0,
        error: undefined
      } : j
    ));
    processExportQueue();
    showToast('Export retried', 'info');
  };

  const clearCompletedExports = () => {
    setExportQueue(prev => prev.filter(j => j.status !== 'completed'));
    showToast('Completed exports cleared', 'info');
  };

  const checkComicExists = async () => {
    if (!storyContext.id) return;
    try {
      const apiAvailable = await checkApiAvailability();
      if (apiAvailable) {
        const response = await comicsService.get(storyContext.id);
        setComicExists((response as any)?.exists || false);
      }
    } catch (error) {
      console.error('Failed to check comic existence:', error);
      setComicExists(false);
    }
  };

  const handleCoverImageSelect = async (imageId: string | null) => {
    setSelectedCoverImageId(imageId);
    setShowCoverImageSelector(false);
    
    const pendingJobId = (window as any).pendingPdfExportJob;
    if (pendingJobId) {
      const job = exportQueue.find(j => j.id === pendingJobId);
      if (job) {
        try {
          setExportQueue(prev => prev.map(j => 
            j.id === pendingJobId ? { ...j, progress: 80 } : j
          ));
          const data = await getExportData();
          await exportToPDF(data, 'comic', undefined, imageId);
          const filename = `${job.projectTitle.replace(/\s+/g, '_')}_storyboard`;
          setExportQueue(prev => prev.map(j => 
            j.id === pendingJobId ? { 
              ...j, 
              status: 'completed' as const, 
              progress: 100,
              fileName: `${filename}.pdf`
            } : j
          ));
          showToast(`Export completed: ${filename}`, 'success');
          
          try {
            const apiAvailable = await checkApiAvailability();
            if (apiAvailable && storyContext.id) {
              const token = localStorage.getItem('auth_token');
              await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/exports`, {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  project_id: storyContext.id,
                  export_type: 'pdf',
                  file_name: `${filename}.pdf`,
                }),
              });
            }
          } catch (e) {
            console.error('Failed to track export:', e);
          }
          setProcessingJobId(null);
          setTimeout(() => processExportQueue(), 500);
        } catch (error: any) {
          setExportQueue(prev => prev.map(j => 
            j.id === pendingJobId ? { 
              ...j, 
              status: 'failed' as const,
              error: error.message || 'Export failed'
            } : j
          ));
          showToast(`Export failed: ${error.message || 'Unknown error'}`, 'error');
          setProcessingJobId(null);
          setTimeout(() => processExportQueue(), 500);
        }
        (window as any).pendingPdfExportJob = null;
        return;
      }
    }
    
    // Regular export (not queued)
    try {
      const data = await getExportData();
      await exportToPDF(data, 'comic', undefined, imageId);
      setTimeout(() => checkComicExists(), 1000);
    } catch (error: any) {
      console.error('Export error:', error);
      showToast('Failed to export comic: ' + (error.message || 'Unknown error'), 'error');
    }
  };

  const handleRegenerateComic = async () => {
    if (!storyContext.id) return;
    
    if (!window.confirm('Regenerate comic? This will create a new version using the latest scenes.')) {
      return;
    }

    setIsRegeneratingComic(true);
    try {
      const apiAvailable = await checkApiAvailability();
      if (!apiAvailable) {
        alert('API not available. Please check your connection.');
        return;
      }

      await comicsService.delete(storyContext.id);
      
      const data = await getExportData();
      
      const response = await comicsService.generate({
        project_id: storyContext.id,
        cover_image_id: selectedCoverImageId || undefined
      });

      if (response) {
        setComicExists(true);
        showToast('Comic regenerated successfully!', 'success');
        window.dispatchEvent(new Event('comicGenerated'));
      }
    } catch (error: any) {
      console.error('Failed to regenerate comic:', error);
      showToast('Failed to regenerate comic: ' + (error.message || 'Unknown error'), 'error');
    } finally {
      setIsRegeneratingComic(false);
    }
  };

  return {
    getExportData,
    handleExport,
    handleExportSelectedScenes,
    addExportToQueue,
    processExportQueue,
    cancelExportJob,
    retryExportJob,
    clearCompletedExports,
    checkComicExists,
    handleCoverImageSelect,
    handleRegenerateComic
  };
};

