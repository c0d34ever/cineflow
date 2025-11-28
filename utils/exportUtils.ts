import { StoryContext, Scene, DirectorSettings } from '../types';

export interface ExportData {
  context: StoryContext;
  scenes: Scene[];
  settings: DirectorSettings;
  exportedAt: string;
}

/**
 * Export to Markdown format
 */
export function exportToMarkdown(data: ExportData): string {
  const { context, scenes, settings } = data;
  
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
 */
export function exportToPDF(data: ExportData): void {
  const markdown = exportToMarkdown(data);
  
  // Convert markdown to HTML
  const html = markdownToHTML(markdown, data.context.title);
  
  // Create a new window with the HTML
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to export PDF');
    return;
  }
  
  printWindow.document.write(html);
  printWindow.document.close();
  
  // Wait for content to load, then print
  setTimeout(() => {
    printWindow.print();
  }, 250);
}

/**
 * Convert markdown to HTML for PDF export
 */
function markdownToHTML(markdown: string, title: string): string {
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
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        @media print {
          @page {
            margin: 2cm;
          }
          body {
            margin: 0;
            padding: 0;
          }
        }
        body {
          font-family: 'Georgia', serif;
          line-height: 1.6;
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
          color: #333;
        }
        h1 {
          border-bottom: 3px solid #333;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        h2 {
          border-bottom: 2px solid #666;
          padding-bottom: 5px;
          margin-top: 30px;
          margin-bottom: 15px;
        }
        h3 {
          color: #555;
          margin-top: 25px;
          margin-bottom: 10px;
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
          border-top: 1px solid #ddd;
          margin: 20px 0;
        }
        strong {
          color: #000;
        }
      </style>
    </head>
    <body>
      <p>${html}</p>
    </body>
    </html>
  `;
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

