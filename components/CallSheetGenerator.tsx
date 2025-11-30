import React, { useState } from 'react';
import { Scene } from '../types';

interface CallSheetGeneratorProps {
  scenes: Scene[];
  projectId: string;
  storyContext: any;
  scheduleDay?: {
    day: number;
    location: string;
    scenes: Scene[];
    characters: string[];
    equipment: string[];
    estimatedTime: number;
  };
  onClose: () => void;
}

const CallSheetGenerator: React.FC<CallSheetGeneratorProps> = ({
  scenes,
  projectId,
  storyContext,
  scheduleDay,
  onClose,
}) => {
  const [callTime, setCallTime] = useState('07:00');
  const [weather, setWeather] = useState('TBD');
  const [locationAddress, setLocationAddress] = useState('');
  const [director, setDirector] = useState('');
  const [producer, setProducer] = useState('');
  const [notes, setNotes] = useState('');

  // Use schedule day if provided, otherwise use all scenes
  const dayScenes = scheduleDay?.scenes || scenes;
  const location = scheduleDay?.location || 'TBD';
  const dayNumber = scheduleDay?.day || 1;
  const characters = scheduleDay?.characters || [];
  const equipment = scheduleDay?.equipment || [];

  const exportToPDF = () => {
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #000; padding-bottom: 20px; }
          .header h1 { margin: 0; font-size: 24px; }
          .header h2 { margin: 5px 0; font-size: 18px; font-weight: normal; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .info-section { border: 1px solid #000; padding: 15px; }
          .info-section h3 { margin-top: 0; font-size: 14px; text-transform: uppercase; border-bottom: 1px solid #000; padding-bottom: 5px; }
          .info-section p { margin: 5px 0; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 11px; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .scene-number { font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>CALL SHEET</h1>
          <h2>${storyContext.title || 'Project'}</h2>
          <p><strong>DAY ${dayNumber}</strong> - ${dateStr}</p>
        </div>

        <div class="info-grid">
          <div class="info-section">
            <h3>Production Info</h3>
            <p><strong>Project:</strong> ${storyContext.title || 'N/A'}</p>
            <p><strong>Date:</strong> ${dateStr}</p>
            <p><strong>Day:</strong> ${dayNumber}</p>
            <p><strong>Call Time:</strong> ${callTime}</p>
            ${director ? `<p><strong>Director:</strong> ${director}</p>` : ''}
            ${producer ? `<p><strong>Producer:</strong> ${producer}</p>` : ''}
          </div>

          <div class="info-section">
            <h3>Location</h3>
            <p><strong>Location:</strong> ${location}</p>
            ${locationAddress ? `<p><strong>Address:</strong> ${locationAddress}</p>` : ''}
            <p><strong>Weather:</strong> ${weather}</p>
            <p><strong>Estimated Wrap:</strong> ${calculateWrapTime(callTime, scheduleDay?.estimatedTime || 10)}</p>
          </div>
        </div>

        <div class="info-section">
          <h3>Cast Required</h3>
          <p>${characters.length > 0 ? characters.join(', ') : 'TBD'}</p>
        </div>

        <div class="info-section">
          <h3>Equipment & Crew</h3>
          <p>${equipment.length > 0 ? equipment.join(', ') : 'Standard Production Equipment'}</p>
        </div>

        <h3 style="text-transform: uppercase; margin-top: 30px;">Scenes to Shoot</h3>
        <table>
          <thead>
            <tr>
              <th>Scene #</th>
              <th>Scene ID</th>
              <th>Description</th>
              <th>Dialogue</th>
              <th>Lens/Angle</th>
              <th>Movement</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
    `;

    dayScenes.forEach(scene => {
      html += `
        <tr>
          <td class="scene-number">${scene.sequenceNumber}</td>
          <td>${scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`}</td>
          <td>${scene.enhancedPrompt.substring(0, 80)}...</td>
          <td>${scene.directorSettings.dialogue || '-'}</td>
          <td>${scene.directorSettings.lens} / ${scene.directorSettings.angle}</td>
          <td>${scene.directorSettings.movement}</td>
          <td>15 min</td>
        </tr>
      `;
    });

    html += `
          </tbody>
        </table>
    `;

    if (notes) {
      html += `
        <div class="info-section">
          <h3>Notes</h3>
          <p>${notes}</p>
        </div>
      `;
    }

    html += `
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

  const calculateWrapTime = (callTime: string, hours: number): string => {
    const [hoursStr, minutesStr] = callTime.split(':');
    const startHours = parseInt(hoursStr);
    const startMinutes = parseInt(minutesStr || '0');
    const totalMinutes = startHours * 60 + startMinutes + (hours * 60);
    const wrapHours = Math.floor(totalMinutes / 60) % 24;
    const wrapMinutes = totalMinutes % 60;
    return `${wrapHours.toString().padStart(2, '0')}:${wrapMinutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white">Call Sheet Generator</h2>
            <p className="text-sm text-zinc-400 mt-1">Professional production call sheet</p>
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
          <div className="space-y-4">
            {/* Production Info */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <h3 className="text-sm font-bold text-white mb-3">Production Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Call Time</label>
                  <input
                    type="time"
                    value={callTime}
                    onChange={(e) => setCallTime(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Weather</label>
                  <input
                    type="text"
                    value={weather}
                    onChange={(e) => setWeather(e.target.value)}
                    placeholder="Sunny, Cloudy, etc."
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Director</label>
                  <input
                    type="text"
                    value={director}
                    onChange={(e) => setDirector(e.target.value)}
                    placeholder="Director name"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Producer</label>
                  <input
                    type="text"
                    value={producer}
                    onChange={(e) => setProducer(e.target.value)}
                    placeholder="Producer name"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <h3 className="text-sm font-bold text-white mb-3">Location</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Location Name</label>
                  <input
                    type="text"
                    value={location}
                    disabled
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded text-zinc-400"
                  />
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Address</label>
                  <input
                    type="text"
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    placeholder="Full address"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Cast & Crew */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <h3 className="text-sm font-bold text-white mb-3">Cast & Crew</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Cast Required</label>
                  <div className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-300 text-sm">
                    {characters.length > 0 ? characters.join(', ') : 'TBD'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">Equipment</label>
                  <div className="px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-zinc-300 text-sm">
                    {equipment.length > 0 ? equipment.join(', ') : 'Standard Production Equipment'}
                  </div>
                </div>
              </div>
            </div>

            {/* Scenes */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <h3 className="text-sm font-bold text-white mb-3">Scenes to Shoot ({dayScenes.length})</h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {dayScenes.map((scene) => (
                  <div
                    key={scene.id}
                    className="bg-zinc-900 border border-zinc-700 rounded p-3 text-sm"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-amber-900/30 text-amber-500 px-2 py-0.5 rounded text-xs font-mono font-bold">
                        {scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`}
                      </span>
                      <span className="text-zinc-400">
                        {scene.directorSettings.lens} / {scene.directorSettings.angle}
                      </span>
                      <span className="text-zinc-500 text-xs">
                        {scene.directorSettings.movement}
                      </span>
                    </div>
                    <p className="text-zinc-300 text-xs line-clamp-2">{scene.enhancedPrompt}</p>
                    {scene.directorSettings.dialogue && (
                      <p className="text-amber-400 text-xs italic mt-1">"{scene.directorSettings.dialogue}"</p>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
              <h3 className="text-sm font-bold text-white mb-3">Additional Notes</h3>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special instructions, parking info, catering, etc."
                rows={4}
                className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
          <button
            onClick={exportToPDF}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4z" clipRule="evenodd" />
            </svg>
            Generate & Export PDF
          </button>
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

export default CallSheetGenerator;

