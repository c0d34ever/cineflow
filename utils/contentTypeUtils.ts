import { ContentType } from '../components/ContentTypeSelector';

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

