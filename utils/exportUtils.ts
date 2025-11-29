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
 * Supports both comic-book style and raw/plain style
 */
export type PDFStyle = 'comic' | 'raw';

/**
 * Convert image URL to base64 data URI for PDF embedding
 */
async function imageToBase64(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.warn(`Failed to fetch image: ${url}`);
      return url; // Return original URL if fetch fails
    }
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error(`Error converting image to base64: ${url}`, error);
    return url; // Return original URL on error
  }
}

/**
 * Convert all image URLs in HTML to base64 data URIs
 */
async function convertImagesToBase64(html: string): Promise<string> {
  // Find all img src attributes
  const imgRegex = /<img([^>]*)\ssrc=["']([^"']+)["']([^>]*)>/gi;
  const matches = Array.from(html.matchAll(imgRegex));
  
  if (matches.length === 0) {
    return html; // No images to convert
  }
  
  // Convert each image URL to base64
  let convertedHtml = html;
  for (const match of matches) {
    const fullMatch = match[0];
    const beforeSrc = match[1];
    const imageUrl = match[2];
    const afterSrc = match[3];
    
    // Skip if already base64
    if (imageUrl.startsWith('data:')) {
      continue;
    }
    
    // Skip if it's an external URL (http/https) - try to convert it
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      try {
        const base64 = await imageToBase64(imageUrl);
        convertedHtml = convertedHtml.replace(fullMatch, `<img${beforeSrc} src="${base64}"${afterSrc}>`);
      } catch (error) {
        console.warn(`Failed to convert image ${imageUrl} to base64, keeping original URL`);
      }
    } else {
      // Relative URL - construct full URL
      const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
      const baseUrl = API_BASE_URL.replace('/api', '');
      const fullUrl = imageUrl.startsWith('/') ? `${baseUrl}${imageUrl}` : `${baseUrl}/${imageUrl}`;
      
      try {
        const base64 = await imageToBase64(fullUrl);
        convertedHtml = convertedHtml.replace(fullMatch, `<img${beforeSrc} src="${base64}"${afterSrc}>`);
      } catch (error) {
        console.warn(`Failed to convert image ${fullUrl} to base64, keeping original URL`);
      }
    }
  }
  
  return convertedHtml;
}

export async function exportToPDF(data: ExportData, style: PDFStyle = 'comic', episodeId?: string): Promise<void> {
  // For comic style, check if comic exists in database first
  if (style === 'comic') {
    try {
      const { comicsService } = await import('../apiServices');
      const existing = await comicsService.get(data.context.id, episodeId);
      
      if (existing.exists && existing.comic?.htmlContent) {
        // Use existing comic - convert images to base64
        const htmlWithBase64Images = await convertImagesToBase64(existing.comic.htmlContent);
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          alert('Please allow popups to export PDF');
          return;
        }
        
        printWindow.document.write(htmlWithBase64Images);
        printWindow.document.close();
        
        // Wait for images to load (they're now base64, so should be instant)
        setTimeout(() => {
          printWindow.print();
        }, 500);
        return;
      }
      
      // Generate new comic if it doesn't exist
      const response = await comicsService.generate({
        projectId: data.context.id,
        episodeId: episodeId,
        projectContext: data.context,
        scenes: data.scenes
      });
      
      if (response.comic?.htmlContent) {
        // Convert images to base64
        const htmlWithBase64Images = await convertImagesToBase64(response.comic.htmlContent);
        
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          alert('Please allow popups to export PDF');
          return;
        }
        
        printWindow.document.write(htmlWithBase64Images);
        printWindow.document.close();
        
        // Wait for images to load (they're now base64, so should be instant)
        setTimeout(() => {
          printWindow.print();
        }, 500);
        
        // Trigger custom event to notify App.tsx that comic was generated
        window.dispatchEvent(new CustomEvent('comicGenerated'));
        return;
      }
    } catch (error) {
      console.error('Error with comic export:', error);
      // Fall through to regular export
    }
  }
  
  // Regular export (raw style or fallback)
  const markdown = exportToMarkdown(data);
  
  // Convert markdown to HTML with chosen style
  const html = style === 'comic' 
    ? await markdownToHTMLComic(markdown, data.context.title, data)
    : await markdownToHTMLRaw(markdown, data.context.title, data);
  
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
  }, style === 'comic' ? 1500 : 1000);
}

/**
 * Convert markdown to HTML for PDF export with DC/Marvel comic-book style
 */
async function markdownToHTMLComic(markdown: string, title: string, data: ExportData): Promise<string> {
  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
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
  
  // Process dialogue for speech bubbles
  html = html.replace(/\*\*Dialogue:\*\* "([^"]+)"/g, (match, dialogue) => {
    return `<div class="speech-bubble">${dialogue}</div>`;
  });
  
  // Process scene headers for dramatic styling
  html = html.replace(/<h3>(Scene \d+[^<]+)<\/h3>/g, (match, content) => {
    return `<div class="comic-scene-header">${content}</div>`;
  });
  
  // Process Visual Direction
  html = html.replace(/\*\*Visual Direction:\*\*<br>([^<]+(?:<br>[^<]+)*)/g, (match, content) => {
    return `<div class="visual-direction"><strong>Visual Direction:</strong><br>${content}</div>`;
  });
  
  // Process Flow Link
  html = html.replace(/\*\*Flow Link:\*\* ([^<]+)/g, (match, content) => {
    return `<div class="flow-link"><strong>Flow Link:</strong> ${content}</div>`;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Comic+Neue:wght@400;700&display=swap');
        
        @media print {
          @page {
            margin: 1cm;
            size: A4;
          }
          body {
            margin: 0;
            padding: 0;
          }
          .comic-page {
            page-break-after: always;
          }
          .comic-panel {
            page-break-inside: avoid;
          }
        }
        
        * {
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Comic Neue', 'Comic Sans MS', cursive, sans-serif;
          line-height: 1.4;
          max-width: 1000px;
          margin: 0 auto;
          padding: 15px;
          color: #1a1a1a;
          background: linear-gradient(180deg, #FFFFFF 0%, #F5F5F5 50%, #E0E0E0 100%); /* Subtle gradient background */
        }
        
        /* DC/Marvel Style Title - Bold Red/Blue */
        h1 {
          font-family: 'Bangers', cursive;
          font-size: 4em;
          text-transform: uppercase;
          letter-spacing: 3px;
          text-align: center;
          margin: 20px 0 30px;
          color: #DC143C; /* Crimson Red - Classic Comic Red */
          text-shadow: 4px 4px 0px #000, 6px 6px 0px rgba(0,0,0,0.5), 0 0 10px rgba(220,20,60,0.3);
          border: none;
          padding: 0;
          background: linear-gradient(180deg, #FF1744 0%, #C51162 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          filter: drop-shadow(4px 4px 0px #000);
        }
        
        h2 {
          font-family: 'Bangers', cursive;
          font-size: 2.5em;
          text-transform: uppercase;
          letter-spacing: 2px;
          margin: 25px 0 15px;
          color: #1E88E5; /* Bright Blue - Classic Comic Blue */
          text-shadow: 3px 3px 0px #000, 0 0 8px rgba(30,136,229,0.4);
          border: none;
          padding: 0;
        }
        
        /* Scene Header - Dramatic Comic Style - DC/Marvel Colors */
        .comic-scene-header {
          font-family: 'Bangers', cursive;
          font-size: 2em;
          text-transform: uppercase;
          letter-spacing: 1px;
          background: linear-gradient(135deg, #FF1744 0%, #D50000 50%, #C51162 100%); /* Marvel Red Gradient */
          color: #FFD700; /* Gold text - Classic Comic Gold */
          padding: 15px 25px;
          margin: 30px 0 20px;
          border: 5px solid #000;
          border-top: 6px solid #FFD700; /* Gold accent */
          box-shadow: 8px 8px 0px rgba(0,0,0,0.4), 0 0 15px rgba(255,23,68,0.3);
          text-align: center;
          position: relative;
          text-shadow: 2px 2px 0px #000, 4px 4px 0px rgba(0,0,0,0.5);
        }
        
        .comic-scene-header::before {
          content: '';
          position: absolute;
          top: -4px;
          left: -4px;
          right: -4px;
          bottom: -4px;
          border: 2px solid #fff;
          z-index: -1;
        }
        
        /* Comic Panel - DC/Marvel Style */
        .comic-panel {
          margin: 25px 0;
          page-break-inside: avoid;
          background: #FFFFFF;
          border: 6px solid #000;
          border-top: 8px solid #FFD700; /* Gold top border - Classic comic style */
          border-radius: 4px;
          box-shadow: 10px 10px 0px rgba(0,0,0,0.5), 
                      15px 15px 0px rgba(0,0,0,0.2),
                      0 0 0 2px #FFD700; /* Gold outer glow */
          overflow: hidden;
          position: relative;
          padding: 10px;
          background: linear-gradient(180deg, #FFFFFF 0%, #FAFAFA 100%);
        }
        
        .comic-panel::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(45deg, #FFD700, #FFA000, #FFD700);
          z-index: -1;
          border-radius: 4px;
        }
        
        .comic-panel::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          border: 3px solid #000;
          pointer-events: none;
          border-radius: 2px;
        }
        
        .comic-image {
          width: 100%;
          height: auto;
          display: block;
          max-height: 600px;
          object-fit: cover;
          background: #e0e0e0;
          border: 2px solid #000;
        }
        
        .comic-caption {
          padding: 12px 20px;
          background: linear-gradient(180deg, #0D47A1 0%, #1565C0 50%, #1976D2 100%); /* DC Blue Gradient */
          color: #FFD700; /* Gold text */
          font-size: 1em;
          font-weight: bold;
          text-align: center;
          margin: 0;
          border-top: 4px solid #000;
          border-bottom: 2px solid #FFD700; /* Gold accent */
          font-style: italic;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-shadow: 1px 1px 0px #000, 2px 2px 0px rgba(0,0,0,0.3);
        }
        
        /* Speech Bubbles - Classic Comic Style - DC/Marvel */
        .speech-bubble {
          background: #FFFFFF;
          border: 5px solid #000;
          border-radius: 30px;
          padding: 18px 25px;
          margin: 20px 0;
          position: relative;
          font-size: 1.2em;
          font-weight: 900;
          color: #000;
          box-shadow: 6px 6px 0px rgba(0,0,0,0.3), 0 0 0 2px #FFD700; /* Gold outline */
          max-width: 75%;
          margin-left: auto;
          margin-right: auto;
          background: linear-gradient(180deg, #FFFFFF 0%, #F5F5F5 100%);
        }
        
        .speech-bubble::before {
          content: '';
          position: absolute;
          bottom: -15px;
          left: 30px;
          width: 0;
          height: 0;
          border-left: 15px solid transparent;
          border-right: 15px solid transparent;
          border-top: 15px solid #000;
        }
        
        .speech-bubble::after {
          content: '';
          position: absolute;
          bottom: -11px;
          left: 32px;
          width: 0;
          height: 0;
          border-left: 13px solid transparent;
          border-right: 13px solid transparent;
          border-top: 13px solid #fff;
        }
        
        /* Visual Direction - Narration Box - DC/Marvel Yellow */
        .visual-direction {
          background: linear-gradient(135deg, #FFD700 0%, #FFC107 50%, #FFB300 100%); /* Classic Comic Yellow */
          border: 4px solid #000;
          border-left: 8px solid #FF6F00; /* Orange accent */
          padding: 18px 20px;
          margin: 20px 0;
          font-weight: 900;
          color: #000;
          box-shadow: 6px 6px 0px rgba(0,0,0,0.3), 0 0 0 2px #FF6F00;
          text-shadow: 1px 1px 0px rgba(255,255,255,0.3);
        }
        
        /* Technical Details - Info Box - DC Blue */
        ul {
          background: linear-gradient(135deg, #1E88E5 0%, #1565C0 50%, #0D47A1 100%); /* DC Blue Gradient */
          border: 4px solid #000;
          border-left: 10px solid #FFD700; /* Gold accent */
          padding: 18px 30px;
          margin: 20px 0;
          list-style: none;
          box-shadow: 6px 6px 0px rgba(0,0,0,0.3), 0 0 0 2px #FFD700;
        }
        
        li {
          margin: 10px 0;
          padding-left: 30px;
          position: relative;
          color: #FFFFFF;
          font-weight: bold;
          text-shadow: 2px 2px 0px rgba(0,0,0,0.5);
        }
        
        li::before {
          content: '⚡';
          position: absolute;
          left: 0;
          font-size: 1.5em;
          color: #FFD700; /* Gold lightning */
          text-shadow: 2px 2px 0px #000;
        }
        
        /* Flow Link - Thought Bubble Style - Marvel Purple */
        .flow-link {
          background: linear-gradient(135deg, #E91E63 0%, #C2185B 50%, #AD1457 100%); /* Marvel Pink/Purple */
          border: 4px dashed #000;
          border-top: 5px solid #FFD700; /* Gold accent */
          padding: 15px 18px;
          margin: 20px 0;
          border-radius: 20px;
          font-style: italic;
          color: #FFFFFF;
          font-weight: bold;
          text-shadow: 2px 2px 0px rgba(0,0,0,0.5);
          box-shadow: 4px 4px 0px rgba(0,0,0,0.2);
        }
        
        /* Page Gutter */
        .comic-gutter {
          height: 30px;
          background: repeating-linear-gradient(
            45deg,
            #f5f5f5,
            #f5f5f5 10px,
            #e0e0e0 10px,
            #e0e0e0 20px
          );
          margin: 20px 0;
        }
        
        hr {
          border: none;
          height: 4px;
          background: repeating-linear-gradient(
            90deg,
            #000,
            #000 10px,
            transparent 10px,
            transparent 20px
          );
          margin: 40px 0;
        }
        
        strong {
          color: #d32f2f;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        em {
          font-style: italic;
          color: #555;
        }
      </style>
    </head>
    <body>
      <div class="comic-page">
        ${html}
      </div>
    </body>
    </html>
  `;
}

/**
 * Convert markdown to HTML for raw/plain PDF export
 */
async function markdownToHTMLRaw(markdown: string, title: string, data: ExportData): Promise<string> {
  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
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
  
  // Process images - simple inline style
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)(?:\*([^*]+)\*)?/g, (match, alt, path, caption) => {
    const imageUrl = path.startsWith('http') ? path : `${baseUrl}${path}`;
    const captionHtml = caption ? `<figcaption style="text-align: center; font-style: italic; color: #666; margin-top: 5px;">${caption}</figcaption>` : '';
    return `
      <figure style="margin: 20px 0; text-align: center;">
        <img src="${imageUrl}" alt="${alt || 'Scene image'}" style="max-width: 100%; height: auto; border: 1px solid #ddd;" />
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
            margin: 2cm;
            size: A4;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
        body {
          font-family: 'Times New Roman', serif;
          line-height: 1.8;
          max-width: 800px;
          margin: 0 auto;
          padding: 40px;
          color: #333;
          background: #fff;
        }
        h1 {
          font-size: 2.5em;
          margin-bottom: 20px;
          color: #000;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        h2 {
          font-size: 1.8em;
          margin-top: 30px;
          margin-bottom: 15px;
          color: #333;
          border-bottom: 1px solid #666;
          padding-bottom: 5px;
        }
        h3 {
          font-size: 1.3em;
          margin-top: 25px;
          margin-bottom: 10px;
          color: #555;
        }
        p {
          margin: 12px 0;
          text-align: justify;
        }
        ul {
          margin: 15px 0;
          padding-left: 40px;
        }
        li {
          margin: 8px 0;
        }
        hr {
          border: none;
          border-top: 1px solid #ddd;
          margin: 30px 0;
        }
        strong {
          color: #000;
          font-weight: bold;
        }
        em {
          font-style: italic;
        }
        figure {
          margin: 25px 0;
        }
        img {
          max-width: 100%;
          height: auto;
        }
      </style>
    </head>
    <body>
      ${html}
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
  const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';
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
  
  // Convert images to base64 for PDF printing
  const htmlWithBase64Images = await convertImagesToBase64(fullHtml);
  
  printWindow.document.write(htmlWithBase64Images);
  printWindow.document.close();
  
  // Wait for images to load (they're now base64, so should be instant)
  setTimeout(() => {
    printWindow.print();
  }, 500);
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

