import { ProjectData } from '../db';

// Robust UUID generator fallback
export const generateId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Calculate health score for a project
export const calculateProjectHealthScore = (project: ProjectData): number => {
  const { context, scenes } = project;

  // Scene Completion (40%)
  const totalScenes = scenes.length;
  const completedScenes = scenes.filter(s => s.status === 'completed').length;
  const sceneCompletion = totalScenes > 0 ? (completedScenes / totalScenes) * 100 : 0;

  // Director Settings Completeness (20%)
  const settingsCount = scenes.filter(s => {
    const ds = s.directorSettings;
    return ds && (ds.lens || ds.angle || ds.lighting || ds.movement || ds.sound || ds.dialogue);
  }).length;
  const settingsScore = totalScenes > 0 ? (settingsCount / totalScenes) * 100 : 0;

  // Character Development (15%)
  const hasCharacters = context.characters && context.characters.trim().length > 0;
  const scenesWithDialogue = scenes.filter(s => s.directorSettings?.dialogue).length;
  const characterDevelopment = (hasCharacters ? 50 : 0) + (totalScenes > 0 ? (scenesWithDialogue / totalScenes) * 50 : 0);

  // Story Structure (15%)
  const hasTitle = context.title && context.title.trim().length > 0;
  const hasGenre = context.genre && context.genre.trim().length > 0;
  const hasPlot = context.plotSummary && context.plotSummary.trim().length > 0;
  const hasContext = context.initialContext && context.initialContext.trim().length > 0;
  const structureScore = (hasTitle ? 25 : 0) + (hasGenre ? 25 : 0) + (hasPlot ? 25 : 0) + (hasContext ? 25 : 0);

  // Export Readiness (10%)
  const exportReadiness = (totalScenes > 0 ? 50 : 0) + 50; // Simplified: assume ready if scenes exist

  // Calculate overall score
  const overall = (
    sceneCompletion * 0.40 +
    settingsScore * 0.20 +
    characterDevelopment * 0.15 +
    structureScore * 0.15 +
    exportReadiness * 0.10
  );

  return Math.round(overall);
};

