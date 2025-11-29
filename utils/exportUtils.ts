import { StoryContext, Scene, DirectorSettings } from '../types';

export interface MediaItem {
  id: string;
  file_path: string;
  thumbnail_path?: string;
  alt_text?: string;
  description?: string;
  is_primary: boolean;
}

export interface SceneWithMedia extends Scene {
  media?: MediaItem[];
}

export interface ExportData {
  context: StoryContext;
  scenes: Scene[];
  settings: DirectorSettings;
  exportedAt: string;
  sceneMedia?: Map<string, MediaItem[]>; // Map of scene ID to media items
}

/**
 * Export to Markdown format
 */
export function exportToMarkdown(data: ExportData): string {
  const { context, scenes, settings, sceneMedia } = data;
  
  let markdown = `# ${context.title}\n\n`;
  
  if (context.genre) {
    markdown += `**Genre:** ${context.genre}\n\n`;
  }
  
  if (context.plotSummary) {
    markdown += `## Plot Summary\n\n${context.plotSummary}\n\n`;
  }
  
  if (context.characters) {
    markdown += `## Characters\n\n${context.characters}\n\n`;
  }
  
  markdown += `## Director Settings\n\n`;
  markdown += `- **Lens:** ${settings.lens}\n`;
  markdown += `- **Angle:** ${settings.angle}\n`;
  markdown += `- **Lighting:** ${settings.lighting}\n`;
  markdown += `- **Movement:** ${settings.movement}\n`;
  markdown += `- **Style:** ${settings.style}\n`;
  markdown += `- **Transition:** ${settings.transition}\n\n`;
  
  markdown += `## Scenes\n\n`;
  
  scenes.forEach((scene, index) => {
    markdown += `### Scene ${index + 1}: ${scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`}\n\n`;
    
    // Include images if available
    const media = sceneMedia?.get(scene.id) || [];
    if (media.length > 0) {
      const primaryImage = media.find(img => img.is_primary) || media[0];
      markdown += `![${primaryImage.alt_text || `Scene ${index + 1} Image`}](${primaryImage.file_path})\n\n`;
      if (primaryImage.description) {
        markdown += `*${primaryImage.description}*\n\n`;
      }
    }
    
    if (scene.directorSettings.dialogue) {
      markdown += `**Dialogue:** "${scene.directorSettings.dialogue}"\n\n`;
    }
    
    markdown += `**Visual Direction:**\n\n${scene.enhancedPrompt}\n\n`;
    
    markdown += `**Technical Details:**\n`;
    markdown += `- Lens & Angle: ${scene.directorSettings.lens} / ${scene.directorSettings.angle}\n`;
    markdown += `- Movement: ${scene.directorSettings.movement}\n`;
    if (scene.directorSettings.zoom) {
      markdown += `- Zoom: ${scene.directorSettings.zoom}\n`;
    }
    markdown += `- Sound: ${scene.directorSettings.sound || 'Not specified'}\n`;
    markdown += `- Transition: ${scene.directorSettings.transition || 'Cut'}\n`;
    if (scene.directorSettings.stuntInstructions) {
      markdown += `- Stunts: ${scene.directorSettings.stuntInstructions}\n`;
    }
    markdown += `\n`;
    
    if (scene.contextSummary) {
      markdown += `**Flow Link:** ${scene.contextSummary}\n\n`;
    }
    
    markdown += `---\n\n`;
  });
  
  markdown += `\n*Exported on ${new Date(data.exportedAt).toLocaleString()}*\n`;
  
  return markdown;
}

/**
 * Export to CSV format
 */
export function exportToCSV(data: ExportData): string {
  const { context, scenes } = data;
  
  const headers = [
    'Scene Number',
    'Scene ID',
    'Dialogue',
    'Visual Direction',
    'Lens',
    'Angle',
    'Movement',
    'Zoom',
    'Sound',
    'Transition',
    'Stunt Instructions',
    'Context Summary'
  ];
  
  const rows = scenes.map((scene, index) => [
    (index + 1).toString(),
    scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`,
    scene.directorSettings.dialogue || '',
    scene.enhancedPrompt.replace(/"/g, '""'), // Escape quotes for CSV
    scene.directorSettings.lens,
    scene.directorSettings.angle,
    scene.directorSettings.movement,
    scene.directorSettings.zoom || '',
    scene.directorSettings.sound || '',
    scene.directorSettings.transition || 'Cut',
    scene.directorSettings.stuntInstructions || '',
    scene.contextSummary || ''
  ]);
  
  // CSV format: escape commas and quotes
  const escapeCSV = (value: string) => {
    if (value.includes(',') || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };
  
  const csvRows = [
    headers.map(escapeCSV).join(','),
    ...rows.map(row => row.map(escapeCSV).join(','))
  ];
  
  return csvRows.join('\n');
}

/**
 * Export to PDF format (using browser print functionality)
 * Now includes images in comic-book style layout
 */
export async function exportToPDF(data: ExportData): Promise<void> {
  const markdown = exportToMarkdown(data);
  
  // Convert markdown to HTML with comic-book style images
  const html = await markdownToHTML(markdown, data.context.title, data);
  
  // Create a new window with the HTML
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for images to load, then print
  setTimeout(() => {
    printWindow.print();
  }, 1000);
}

/**
 * Convert markdown to HTML for PDF export with comic-book style images
 */
async function markdownToHTML(markdown: string, title: string, data: ExportData): Promise<string> {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const baseUrl = API_BASE_URL.replace('/api', '');
  
  let html = markdown
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^\- (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br>');
  
  // Wrap list items
  html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');
  
  // Process images in comic-book style - replace markdown image syntax with styled HTML
  // Pattern: ![alt](path) or ![alt](path)*caption*
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)(?:\*([^*]+)\*)?/g, (match, alt, path, caption) => {
    // Get full image URL
    const imageUrl = path.startsWith('http') ? path : `${baseUrl}${path}`;
    const captionHtml = caption ? `<figcaption class="comic-caption">${caption}</figcaption>` : '';
    return `
      <figure class="comic-panel">
        <img src="${imageUrl}" alt="${alt || 'Scene image'}" class="comic-image" />
        ${captionHtml}
      </figure>
    `;
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @media print {
          @page {
            margin: 1.5cm;
            size: A4;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .comic-panel {
            page-break-inside: avoid;
            margin: 20px 0;
          }
        }
        body {
          font-family: 'Georgia', serif;
          line-height: 1.6;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
          background: #fff;
        }
        h1 {
          border-bottom: 3px solid #333;
          padding-bottom: 10px;
          margin-bottom: 20px;
          font-size: 2.5em;
        }
        h2 {
          border-bottom: 2px solid #666;
          padding-bottom: 5px;
          margin-top: 30px;
          margin-bottom: 15px;
          font-size: 1.8em;
        }
        h3 {
          color: #555;
          margin-top: 25px;
          margin-bottom: 15px;
          font-size: 1.3em;
          background: #f5f5f5;
          padding: 10px;
          border-left: 4px solid #333;
        }
        p {
          margin: 10px 0;
        }
        ul {
          margin: 10px 0;
          padding-left: 30px;
        }
        li {
          margin: 5px 0;
        }
        hr {
          border: none;
          border-top: 2px solid #ddd;
          margin: 30px 0;
        }
        strong {
          color: #000;
        }
        /* Comic-book style panel */
        .comic-panel {
          margin: 25px 0;
          page-break-inside: avoid;
          background: #fff;
          border: 3px solid #000;
          box-shadow: 4px 4px 0px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .comic-image {
          width: 100%;
          height: auto;
          display: block;
          max-height: 500px;
          object-fit: contain;
          background: #f9f9f9;
        }
        .comic-caption {
          padding: 10px 15px;
          background: #000;
          color: #fff;
          font-size: 0.9em;
          font-style: italic;
          text-align: center;
          margin: 0;
          border-top: 2px solid #333;
        }
        /* Scene container styling */
        .scene-container {
          margin: 30px 0;
          padding: 20px;
          border: 2px dashed #ccc;
          background: #fafafa;
        }
        /* Dialogue styling */
        em {
          font-style: italic;
          color: #555;
        }
      </style>
    </head>
    <body>
      <div>${html}</div>
    </body>
    </html>
  `;
}

/**
 * Export episode to PDF format with images
 */
export interface EpisodeExportData {
  episode: {
    id: string;
    title?: string;
    episode_number: number;
    description?: string;
    duration_seconds?: number;
    air_date?: string;
    status?: string;
  };
  clips: Array<{
    id: string;
    sequence_number: number;
    raw_idea?: string;
    enhanced_prompt?: string;
    context_summary?: string;
    status?: string;
    custom_scene_id?: string;
    lens?: string;
    angle?: string;
    lighting?: string;
    movement?: string;
    zoom?: string;
    sound?: string;
    dialogue?: string;
    stunt_instructions?: string;
    physics_focus?: boolean;
    style?: string;
    transition?: string;
  }>;
  projectContext?: StoryContext;
  clipMedia?: Map<string, MediaItem[]>; // Map of clip/scene ID to media items
}

export async function exportEpisodeToPDF(data: EpisodeExportData): Promise<void> {
  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  const baseUrl = API_BASE_URL.replace('/api', '');
  
  const { episode, clips, projectContext, clipMedia } = data;
  
  let html = `
    <div class="episode-header">
      <h1>Episode ${episode.episode_number}${episode.title ? `: ${episode.title}` : ''}</h1>
      ${episode.description ? `<p class="episode-description">${episode.description}</p>` : ''}
      ${episode.air_date ? `<p class="episode-meta"><strong>Air Date:</strong> ${episode.air_date}</p>` : ''}
      ${episode.duration_seconds ? `<p class="episode-meta"><strong>Duration:</strong> ${Math.floor(episode.duration_seconds / 60)}:${(episode.duration_seconds % 60).toString().padStart(2, '0')}</p>` : ''}
    </div>
  `;
  
  if (projectContext) {
    html += `
      <div class="project-context">
        <h2>Project Context</h2>
        ${projectContext.genre ? `<p><strong>Genre:</strong> ${projectContext.genre}</p>` : ''}
        ${projectContext.plotSummary ? `<p><strong>Plot Summary:</strong> ${projectContext.plotSummary}</p>` : ''}
        ${projectContext.characters ? `<p><strong>Characters:</strong> ${projectContext.characters}</p>` : ''}
      </div>
    `;
  }
  
  html += `<h2>Clips</h2>`;
  
  clips.forEach((clip, index) => {
    const sceneId = clip.custom_scene_id || `SEQ #${clip.sequence_number.toString().padStart(2, '0')}`;
    
    html += `<div class="clip-container">`;
    html += `<h3>Clip ${index + 1}: ${sceneId}</h3>`;
    
    // Include images if available
    const media = clipMedia?.get(clip.id) || [];
    if (media.length > 0) {
      const primaryImage = media.find(img => img.is_primary) || media[0];
      const imageUrl = primaryImage.file_path.startsWith('http') 
        ? primaryImage.file_path 
        : `${baseUrl}${primaryImage.file_path}`;
      const caption = primaryImage.description || primaryImage.alt_text || '';
      
      html += `
        <figure class="comic-panel">
          <img src="${imageUrl}" alt="${primaryImage.alt_text || `Clip ${index + 1} Image`}" class="comic-image" />
          ${caption ? `<figcaption class="comic-caption">${caption}</figcaption>` : ''}
        </figure>
      `;
    }
    
    if (clip.dialogue) {
      html += `<div class="dialogue-box"><strong>Dialogue:</strong> "${clip.dialogue}"</div>`;
    }
    
    if (clip.enhanced_prompt) {
      html += `<div class="visual-direction"><strong>Visual Direction:</strong><br>${clip.enhanced_prompt.replace(/\n/g, '<br>')}</div>`;
    }
    
    html += `<div class="technical-details">`;
    html += `<strong>Technical Details:</strong><ul>`;
    if (clip.lens && clip.angle) {
      html += `<li><strong>Lens & Angle:</strong> ${clip.lens} / ${clip.angle}</li>`;
    }
    if (clip.movement) {
      html += `<li><strong>Movement:</strong> ${clip.movement}</li>`;
    }
    if (clip.zoom) {
      html += `<li><strong>Zoom:</strong> ${clip.zoom}</li>`;
    }
    if (clip.sound) {
      html += `<li><strong>Sound:</strong> ${clip.sound}</li>`;
    }
    if (clip.transition) {
      html += `<li><strong>Transition:</strong> ${clip.transition}</li>`;
    }
    if (clip.stunt_instructions) {
      html += `<li><strong>Stunts:</strong> ${clip.stunt_instructions}</li>`;
    }
    html += `</ul></div>`;
    
    if (clip.context_summary) {
      html += `<div class="flow-link"><strong>Flow Link:</strong> ${clip.context_summary}</div>`;
    }
    
    html += `</div>`;
    html += `<hr>`;
  });
  
  const fullHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Episode ${episode.episode_number}${episode.title ? `: ${episode.title}` : ''}</title>
      <style>
        @media print {
          @page {
            margin: 1.5cm;
            size: A4;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .comic-panel {
            page-break-inside: avoid;
            margin: 20px 0;
          }
          .clip-container {
            page-break-inside: avoid;
          }
        }
        body {
          font-family: 'Georgia', serif;
          line-height: 1.6;
          max-width: 900px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
          background: #fff;
        }
        .episode-header {
          border-bottom: 4px solid #000;
          padding-bottom: 20px;
          margin-bottom: 30px;
        }
        h1 {
          font-size: 2.5em;
          margin-bottom: 10px;
          color: #000;
        }
        h2 {
          border-bottom: 2px solid #666;
          padding-bottom: 5px;
          margin-top: 30px;
          margin-bottom: 15px;
          font-size: 1.8em;
        }
        h3 {
          color: #555;
          margin-top: 25px;
          margin-bottom: 15px;
          font-size: 1.3em;
          background: #f5f5f5;
          padding: 10px;
          border-left: 4px solid #333;
        }
        .episode-description {
          font-size: 1.1em;
          color: #555;
          margin: 10px 0;
        }
        .episode-meta {
          margin: 5px 0;
          color: #666;
        }
        .project-context {
          background: #f9f9f9;
          padding: 15px;
          border-left: 4px solid #666;
          margin-bottom: 30px;
        }
        .clip-container {
          margin: 30px 0;
          padding: 20px;
          border: 2px dashed #ccc;
          background: #fafafa;
        }
        .comic-panel {
          margin: 25px 0;
          page-break-inside: avoid;
          background: #fff;
          border: 3px solid #000;
          box-shadow: 4px 4px 0px rgba(0,0,0,0.2);
          overflow: hidden;
        }
        .comic-image {
          width: 100%;
          height: auto;
          display: block;
          max-height: 500px;
          object-fit: contain;
          background: #f9f9f9;
        }
        .comic-caption {
          padding: 10px 15px;
          background: #000;
          color: #fff;
          font-size: 0.9em;
          font-style: italic;
          text-align: center;
          margin: 0;
          border-top: 2px solid #333;
        }
        .dialogue-box {
          background: #fffacd;
          border: 2px solid #333;
          padding: 15px;
          margin: 15px 0;
          font-style: italic;
          border-radius: 5px;
        }
        .visual-direction {
          background: #f0f0f0;
          padding: 15px;
          margin: 15px 0;
          border-left: 4px solid #666;
        }
        .technical-details {
          margin: 15px 0;
        }
        .technical-details ul {
          list-style: none;
          padding-left: 0;
        }
        .technical-details li {
          padding: 5px 0;
          border-bottom: 1px dotted #ccc;
        }
        .flow-link {
          background: #e8f4f8;
          padding: 10px;
          margin: 15px 0;
          border-left: 3px solid #4a90e2;
          font-size: 0.9em;
        }
        hr {
          border: none;
          border-top: 2px solid #ddd;
          margin: 30px 0;
        }
      </style>
    </head>
    <body>
      ${html}
    </body>
    </html>
  `;
  
  // Create a new window with the HTML
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }
  
  printWindow.document.write(fullHtml);
  printWindow.document.close();
  
  // Wait for images to load, then print
  setTimeout(() => {
    printWindow.print();
  }, 1000);
}

/**
 * Helper function to export an episode with images
 * Fetches episode data, clips, and media, then exports to PDF
 */
export async function exportEpisodeWithImages(
  episodeId: string,
  getEpisodeData: (id: string) => Promise<{ episode: any; clips: any[] }>,
  getMediaForClip: (clipId: string) => Promise<MediaItem[]>,
  projectContext?: StoryContext
): Promise<void> {
  try {
    // Fetch episode data
    const { episode, clips } = await getEpisodeData(episodeId);
    
    // Fetch media for all clips
    const clipMediaMap = new Map<string, MediaItem[]>();
    for (const clip of clips) {
      try {
        const media = await getMediaForClip(clip.id);
        if (media && media.length > 0) {
          clipMediaMap.set(clip.id, media);
        }
      } catch (error) {
        console.warn(`Failed to load media for clip ${clip.id}:`, error);
      }
    }
    
    // Prepare export data
    const exportData: EpisodeExportData = {
      episode,
      clips,
      projectContext,
      clipMedia: clipMediaMap
    };
    
    // Export to PDF
    await exportEpisodeToPDF(exportData);
  } catch (error) {
    console.error('Failed to export episode:', error);
    throw error;
  }
}

/**
 * Download file helper
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

