import { ContentType } from '../components/ContentTypeSelector';
import { StoryContext, DirectorSettings, TechnicalStyle } from '../types';

export const CONTENT_TYPE_INFO: Record<ContentType, { icon: string; name: string; color: string }> = {
  'film': { icon: '🎬', name: 'Film', color: 'amber' },
  'news': { icon: '📰', name: 'News', color: 'blue' },
  'sports': { icon: '⚽', name: 'Sports', color: 'green' },
  'documentary': { icon: '📹', name: 'Documentary', color: 'purple' },
  'commercial': { icon: '📺', name: 'Commercial', color: 'pink' },
  'music-video': { icon: '🎵', name: 'Music Video', color: 'indigo' },
  'web-series': { icon: '📱', name: 'Web Series', color: 'cyan' },
  'podcast': { icon: '🎙️', name: 'Podcast', color: 'orange' },
  'other': { icon: '✨', name: 'Other', color: 'zinc' },
};

export function getContentTypeInfo(contentType?: string) {
  if (!contentType) return CONTENT_TYPE_INFO['other'];
  return CONTENT_TYPE_INFO[contentType as ContentType] || CONTENT_TYPE_INFO['other'];
}

export function getContentTypeBadgeClass(contentType?: string) {
  const info = getContentTypeInfo(contentType);
  const colorMap: Record<string, string> = {
    amber: 'bg-amber-900/30 text-amber-400 border-amber-800/50',
    blue: 'bg-blue-900/30 text-blue-400 border-blue-800/50',
    green: 'bg-green-900/30 text-green-400 border-green-800/50',
    purple: 'bg-purple-900/30 text-purple-400 border-purple-800/50',
    pink: 'bg-pink-900/30 text-pink-400 border-pink-800/50',
    indigo: 'bg-indigo-900/30 text-indigo-400 border-indigo-800/50',
    cyan: 'bg-cyan-900/30 text-cyan-400 border-cyan-800/50',
    orange: 'bg-orange-900/30 text-orange-400 border-orange-800/50',
    zinc: 'bg-zinc-900/30 text-zinc-400 border-zinc-800/50',
  };
  return colorMap[info.color] || colorMap.zinc;
}

// Content-type specific terminology
export function getContentTypeTerminology(contentType?: string): {
  scene: string;
  scenes: string;
  addScene: string;
  newScene: string;
} {
  const type = contentType || 'film';
  const terminology: Record<string, { scene: string; scenes: string; addScene: string; newScene: string }> = {
    'film': { scene: 'Scene', scenes: 'Scenes', addScene: 'Add Scene', newScene: 'New Scene' },
    'news': { scene: 'Segment', scenes: 'Segments', addScene: 'Add Segment', newScene: 'New Segment' },
    'sports': { scene: 'Clip', scenes: 'Clips', addScene: 'Add Clip', newScene: 'New Clip' },
    'documentary': { scene: 'Segment', scenes: 'Segments', addScene: 'Add Segment', newScene: 'New Segment' },
    'commercial': { scene: 'Shot', scenes: 'Shots', addScene: 'Add Shot', newScene: 'New Shot' },
    'music-video': { scene: 'Sequence', scenes: 'Sequences', addScene: 'Add Sequence', newScene: 'New Sequence' },
    'web-series': { scene: 'Episode', scenes: 'Episodes', addScene: 'Add Episode', newScene: 'New Episode' },
    'podcast': { scene: 'Segment', scenes: 'Segments', addScene: 'Add Segment', newScene: 'New Segment' },
    'other': { scene: 'Scene', scenes: 'Scenes', addScene: 'Add Scene', newScene: 'New Scene' },
  };
  return terminology[type] || terminology['film'];
}

// Content-type specific default contexts
export function getContentTypeDefaultContext(contentType: ContentType): Partial<StoryContext> {
  const defaults: Record<ContentType, Partial<StoryContext>> = {
    'film': {
      genre: 'Drama',
      plotSummary: 'A compelling narrative waiting to be developed...',
      characters: 'Main characters to be defined',
      initialContext: 'Traditional film production with cinematic storytelling'
    },
    'news': {
      genre: 'News',
      plotSummary: 'Breaking news story or investigative piece...',
      characters: 'Reporters, interviewees, subjects',
      initialContext: 'News reporting format with segments, interviews, and field reporting'
    },
    'sports': {
      genre: 'Sports',
      plotSummary: 'Sports event coverage or analysis...',
      characters: 'Athletes, coaches, commentators',
      initialContext: 'Sports content with match highlights, analysis, and commentary'
    },
    'documentary': {
      genre: 'Documentary',
      plotSummary: 'Documentary subject matter and narrative...',
      characters: 'Subjects, interviewees, narrator',
      initialContext: 'Documentary format with investigative segments and real-world storytelling'
    },
    'commercial': {
      genre: 'Commercial',
      plotSummary: 'Product or service promotion...',
      characters: 'Actors, spokesperson, target audience',
      initialContext: 'Commercial production with focused messaging and brand storytelling'
    },
    'music-video': {
      genre: 'Music',
      plotSummary: 'Music video concept and visual narrative...',
      characters: 'Artist, performers, actors',
      initialContext: 'Music video production with visual sequences synchronized to music'
    },
    'web-series': {
      genre: 'Series',
      plotSummary: 'Episodic narrative arc...',
      characters: 'Series characters and recurring cast',
      initialContext: 'Web series format with episodic structure and character development'
    },
    'podcast': {
      genre: 'Podcast',
      plotSummary: 'Podcast episode topics and themes...',
      characters: 'Hosts, guests, interviewees',
      initialContext: 'Podcast format with audio segments, interviews, and discussions'
    },
    'other': {
      genre: '',
      plotSummary: '',
      characters: '',
      initialContext: 'Custom content type'
    }
  };
  return defaults[contentType] || defaults['other'];
}

// Content-type specific default director settings
export function getContentTypeDefaultSettings(contentType: ContentType): Partial<DirectorSettings> {
  const defaults: Record<ContentType, Partial<DirectorSettings>> = {
    'film': {
      style: TechnicalStyle.CINEMATIC,
      lens: '35mm Prime',
      angle: 'Eye Level',
      lighting: 'Natural Cinematic',
      movement: 'Static'
    },
    'news': {
      style: TechnicalStyle.DOCUMENTARY,
      lens: '24-70mm Zoom',
      angle: 'Eye Level',
      lighting: 'Natural',
      movement: 'Handheld'
    },
    'sports': {
      style: TechnicalStyle.DOCUMENTARY,
      lens: '70-200mm Telephoto',
      angle: 'Low Angle',
      lighting: 'Natural',
      movement: 'Tracking'
    },
    'documentary': {
      style: TechnicalStyle.DOCUMENTARY,
      lens: '24-70mm Zoom',
      angle: 'Eye Level',
      lighting: 'Natural',
      movement: 'Handheld'
    },
    'commercial': {
      style: TechnicalStyle.CINEMATIC,
      lens: '50mm Prime',
      angle: 'Eye Level',
      lighting: 'Studio',
      movement: 'Static'
    },
    'music-video': {
      style: TechnicalStyle.CINEMATIC,
      lens: '35mm Prime',
      angle: 'Dynamic',
      lighting: 'Creative',
      movement: 'Dynamic'
    },
    'web-series': {
      style: TechnicalStyle.CINEMATIC,
      lens: '35mm Prime',
      angle: 'Eye Level',
      lighting: 'Natural Cinematic',
      movement: 'Static'
    },
    'podcast': {
      style: TechnicalStyle.DOCUMENTARY,
      lens: 'N/A',
      angle: 'N/A',
      lighting: 'N/A',
      movement: 'N/A'
    },
    'other': {}
  };
  return defaults[contentType] || {};
}

