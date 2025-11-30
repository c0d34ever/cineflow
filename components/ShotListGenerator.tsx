import React, { useState } from 'react';
import { Scene } from '../types';
import { downloadFile } from '../utils/exportUtils';

interface ShotListGeneratorProps {
  scenes: Scene[];
  projectId: string;
  onClose: () => void;
}

interface ShotListItem {
  sceneNumber: number;
  sceneId: string;
  shotType: string;
  lens: string;
  angle: string;
  movement: string;
  zoom: string;
  notes: string;
  dialogue: string;
  transition: string;
}

const ShotListGenerator: React.FC<ShotListGeneratorProps> = ({ scenes, projectId, onClose }) => {
  const [shotList, setShotList] = useState<ShotListItem[]>([]);
  const [generated, setGenerated] = useState(false);

  const generateShotList = () => {
    const items: ShotListItem[] = scenes.map((scene) => {
      // Determine shot type from angle and movement
      let shotType = 'WIDE';
      const angle = scene.directorSettings.angle.toLowerCase();
      const movement = scene.directorSettings.movement.toLowerCase();
      
      if (angle.includes('close') || angle.includes('cu')) {
        shotType = 'CLOSE UP';
      } else if (angle.includes('medium') || angle.includes('ms')) {
        shotType = 'MEDIUM SHOT';
      } else if (angle.includes('wide') || angle.includes('ws')) {
        shotType = 'WIDE SHOT';
      } else if (angle.includes('extreme')) {
        shotType = 'EXTREME WIDE';
      }

      return {
        sceneNumber: scene.sequenceNumber,
        sceneId: scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`,
        shotType,
        lens: scene.directorSettings.lens || 'Not specified',
        angle: scene.directorSettings.angle || 'Not specified',
        movement: scene.directorSettings.movement || 'Static',
        zoom: scene.directorSettings.zoom || 'None',
        notes: scene.enhancedPrompt.substring(0, 100) + (scene.enhancedPrompt.length > 100 ? '...' : ''),
        dialogue: scene.directorSettings.dialogue || '',
        transition: scene.directorSettings.transition || 'Cut',
      };
    });

    setShotList(items);
    setGenerated(true);
  };

  const exportToCSV = () => {
    const headers = ['Scene #', 'Scene ID', 'Shot Type', 'Lens', 'Angle', 'Movement', 'Zoom', 'Dialogue', 'Notes', 'Transition'];
    const rows = shotList.map(item => [
      item.sceneNumber.toString(),
      item.sceneId,
      item.shotType,
      item.lens,
      item.angle,
      item.movement,
      item.zoom,
      item.dialogue,
      item.notes,
      item.transition,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    downloadFile(csvContent, `shot_list_${projectId}.csv`, 'text/csv');
  };

  const exportToPDF = async () => {
    // Create HTML for shot list
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Courier New', monospace; margin: 40px; }
          h1 { text-align: center; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 11px; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .scene-number { font-weight: bold; }
          .shot-type { text-transform: uppercase; }
        </style>
      </head>
      <body>
        <h1>SHOT LIST</h1>
        <table>
          <thead>
            <tr>
              <th>Scene #</th>
              <th>Scene ID</th>
              <th>Shot Type</th>
              <th>Lens</th>
              <th>Angle</th>
              <th>Movement</th>
              <th>Zoom</th>
              <th>Dialogue</th>
              <th>Notes</th>
              <th>Transition</th>
            </tr>
          </thead>
          <tbody>
    `;

    shotList.forEach(item => {
      html += `
        <tr>
          <td class="scene-number">${item.sceneNumber}</td>
          <td>${item.sceneId}</td>
          <td class="shot-type">${item.shotType}</td>
          <td>${item.lens}</td>
          <td>${item.angle}</td>
          <td>${item.movement}</td>
          <td>${item.zoom}</td>
          <td>${item.dialogue || '-'}</td>
          <td>${item.notes}</td>
          <td>${item.transition}</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow popups to export PDF');
      return;
    }

    printWindow.document.write(html);
    printWindow.document.close();

    setTimeout(() => {
      printWindow.print();
    }, 500);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white">Shot List Generator</h2>
            <p className="text-sm text-zinc-400 mt-1">Camera department planning document</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!generated ? (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-lg text-zinc-400 mb-4">Ready to generate shot list</p>
              <p className="text-sm text-zinc-500 mb-6 max-w-md mx-auto">
                Extract camera specifications from all scenes and generate a professional shot list for the camera department.
              </p>
              <button
                onClick={generateShotList}
                disabled={scenes.length === 0}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate Shot List
              </button>
              {scenes.length === 0 && (
                <p className="text-xs text-zinc-500 mt-4">Add scenes to your project first</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Export Buttons */}
              <div className="flex items-center justify-end gap-2 mb-4">
                <button
                  onClick={exportToCSV}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded text-sm transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                    <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                  </svg>
                  Export CSV
                </button>
                <button
                  onClick={exportToPDF}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-sm transition-colors flex items-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4z" clipRule="evenodd" />
                  </svg>
                  Export PDF
                </button>
              </div>

              {/* Shot List Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse bg-zinc-800">
                  <thead>
                    <tr className="bg-zinc-900 border-b border-zinc-700">
                      <th className="px-3 py-2 text-left text-xs font-bold text-zinc-300 uppercase">Scene #</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-zinc-300 uppercase">Scene ID</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-zinc-300 uppercase">Shot Type</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-zinc-300 uppercase">Lens</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-zinc-300 uppercase">Angle</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-zinc-300 uppercase">Movement</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-zinc-300 uppercase">Zoom</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-zinc-300 uppercase">Dialogue</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-zinc-300 uppercase">Notes</th>
                      <th className="px-3 py-2 text-left text-xs font-bold text-zinc-300 uppercase">Transition</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shotList.map((item, index) => (
                      <tr
                        key={index}
                        className="border-b border-zinc-700 hover:bg-zinc-800/50 transition-colors"
                      >
                        <td className="px-3 py-2 text-sm text-amber-400 font-mono font-bold">{item.sceneNumber}</td>
                        <td className="px-3 py-2 text-sm text-zinc-300 font-mono">{item.sceneId}</td>
                        <td className="px-3 py-2 text-sm text-zinc-200 uppercase font-semibold">{item.shotType}</td>
                        <td className="px-3 py-2 text-sm text-zinc-400">{item.lens}</td>
                        <td className="px-3 py-2 text-sm text-zinc-400">{item.angle}</td>
                        <td className="px-3 py-2 text-sm text-zinc-400">{item.movement}</td>
                        <td className="px-3 py-2 text-sm text-zinc-400">{item.zoom}</td>
                        <td className="px-3 py-2 text-sm text-amber-300 italic max-w-xs truncate" title={item.dialogue}>
                          {item.dialogue || '-'}
                        </td>
                        <td className="px-3 py-2 text-sm text-zinc-400 max-w-xs truncate" title={item.notes}>
                          {item.notes}
                        </td>
                        <td className="px-3 py-2 text-sm text-zinc-400">{item.transition}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                <h3 className="text-sm font-bold text-white mb-3">Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-zinc-400">Total Shots</div>
                    <div className="text-white font-bold text-lg">{shotList.length}</div>
                  </div>
                  <div>
                    <div className="text-zinc-400">Shot Types</div>
                    <div className="text-white font-bold text-lg">
                      {new Set(shotList.map(s => s.shotType)).size}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400">Lenses Used</div>
                    <div className="text-white font-bold text-lg">
                      {new Set(shotList.map(s => s.lens).filter(l => l !== 'Not specified')).size}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400">With Dialogue</div>
                    <div className="text-white font-bold text-lg">
                      {shotList.filter(s => s.dialogue).length}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
          {generated && (
            <button
              onClick={generateShotList}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
            >
              Regenerate
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShotListGenerator;

