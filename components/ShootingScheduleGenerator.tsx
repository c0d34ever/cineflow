import React, { useState, useMemo } from 'react';
import { Scene } from '../types';

interface ShootingScheduleGeneratorProps {
  scenes: Scene[];
  projectId: string;
  storyContext: any;
  onClose: () => void;
  onGenerateCallSheet?: (day: ScheduleDay) => void;
}

interface ScheduleDay {
  day: number;
  date?: string;
  location: string;
  scenes: Scene[];
  characters: string[];
  equipment: string[];
  estimatedTime: number; // in hours
  notes: string;
}

interface LocationGroup {
  location: string;
  scenes: Scene[];
  totalTime: number;
}

const ShootingScheduleGenerator: React.FC<ShootingScheduleGeneratorProps> = ({
  scenes,
  projectId,
  storyContext,
  onClose,
  onGenerateCallSheet,
}) => {
  const [schedule, setSchedule] = useState<ScheduleDay[]>([]);
  const [generated, setGenerated] = useState(false);
  const [scenesPerDay, setScenesPerDay] = useState(5);
  const [hoursPerDay, setHoursPerDay] = useState(10);

  // Extract locations from scenes
  const extractLocation = (scene: Scene): string => {
    const prompt = scene.enhancedPrompt.toLowerCase();
    const context = scene.contextSummary?.toLowerCase() || '';
    const text = `${prompt} ${context}`;
    
    // Try to find location patterns
    const locationPatterns = [
      /(?:in|at|inside|outside|on|near)\s+(?:the\s+)?([a-z]+(?:\s+[a-z]+){0,2})\s+(?:room|building|house|street|park|forest|beach|office|car|train|plane|studio|warehouse|apartment|restaurant|cafe|bar|hospital|school|library|museum|theater|stadium|airport|station)/i,
      /(?:location|set|place):\s*([a-z]+(?:\s+[a-z]+){0,2})/i,
    ];

    for (const pattern of locationPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      }
    }

    return 'UNKNOWN LOCATION';
  };

  // Extract characters from scenes
  const extractCharacters = (scene: Scene): string[] => {
    const dialogue = scene.directorSettings.dialogue || '';
    const context = scene.contextSummary || '';
    const text = `${dialogue} ${context}`.toLowerCase();
    
    // Simple character extraction (could be enhanced)
    const characterPatterns = /(?:character|actor|person|protagonist|antagonist|hero|villain)\s+(\w+)/gi;
    const characters: string[] = [];
    let match;
    
    while ((match = characterPatterns.exec(text)) !== null) {
      const name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      if (!characters.includes(name)) {
        characters.push(name);
      }
    }

    return characters.length > 0 ? characters : ['TBD'];
  };

  // Extract equipment needs
  const extractEquipment = (scene: Scene): string[] => {
    const equipment: string[] = [];
    const settings = scene.directorSettings;
    
    if (settings.movement && !settings.movement.toLowerCase().includes('static')) {
      equipment.push('Camera Rig/Dolly');
    }
    
    if (settings.stuntInstructions) {
      equipment.push('Stunt Equipment');
      equipment.push('Safety Gear');
    }
    
    if (settings.sound && settings.sound.toLowerCase().includes('music')) {
      equipment.push('Audio Equipment');
    }

    // Add lens-specific equipment
    if (settings.lens) {
      equipment.push(settings.lens);
    }

    return equipment.length > 0 ? equipment : ['Standard Camera Setup'];
  };

  const generateSchedule = () => {
    // Group scenes by location
    const locationGroups = new Map<string, Scene[]>();
    
    scenes.forEach(scene => {
      const location = extractLocation(scene);
      if (!locationGroups.has(location)) {
        locationGroups.set(location, []);
      }
      locationGroups.get(location)!.push(scene);
    });

    // Convert to array and sort by scene count (optimize for fewer location changes)
    const groups: LocationGroup[] = Array.from(locationGroups.entries()).map(([location, scenes]) => ({
      location,
      scenes: scenes.sort((a, b) => a.sequenceNumber - b.sequenceNumber),
      totalTime: scenes.length * 0.25, // 15 minutes per scene average
    }));

    // Sort by total time (longer locations first)
    groups.sort((a, b) => b.totalTime - a.totalTime);

    // Create schedule days
    const scheduleDays: ScheduleDay[] = [];
    let currentDay = 1;
    let currentDayScenes: Scene[] = [];
    let currentLocation = '';
    let currentDayTime = 0;

    groups.forEach(group => {
      group.scenes.forEach(scene => {
        const sceneTime = 0.25; // 15 minutes per scene
        const location = group.location;

        // Start new day if:
        // - Different location and we have scenes
        // - Would exceed scenes per day
        // - Would exceed hours per day
        if (
          (currentDayScenes.length > 0 && location !== currentLocation && currentDayScenes.length >= scenesPerDay) ||
          currentDayScenes.length >= scenesPerDay ||
          (currentDayTime + sceneTime) > hoursPerDay
        ) {
          // Save current day
          if (currentDayScenes.length > 0) {
            const allCharacters = new Set<string>();
            const allEquipment = new Set<string>();
            
            currentDayScenes.forEach(s => {
              extractCharacters(s).forEach(c => allCharacters.add(c));
              extractEquipment(s).forEach(e => allEquipment.add(e));
            });

            scheduleDays.push({
              day: currentDay,
              location: currentLocation,
              scenes: [...currentDayScenes],
              characters: Array.from(allCharacters),
              equipment: Array.from(allEquipment),
              estimatedTime: currentDayTime,
              notes: `${currentDayScenes.length} scenes at ${currentLocation}`,
            });

            currentDay++;
            currentDayScenes = [];
            currentDayTime = 0;
          }
        }

        currentLocation = location;
        currentDayScenes.push(scene);
        currentDayTime += sceneTime;
      });
    });

    // Add remaining scenes
    if (currentDayScenes.length > 0) {
      const allCharacters = new Set<string>();
      const allEquipment = new Set<string>();
      
      currentDayScenes.forEach(s => {
        extractCharacters(s).forEach(c => allCharacters.add(c));
        extractEquipment(s).forEach(e => allEquipment.add(e));
      });

      scheduleDays.push({
        day: currentDay,
        location: currentLocation,
        scenes: currentDayScenes,
        characters: Array.from(allCharacters),
        equipment: Array.from(allEquipment),
        estimatedTime: currentDayTime,
        notes: `${currentDayScenes.length} scenes at ${currentLocation}`,
      });
    }

    setSchedule(scheduleDays);
    setGenerated(true);
  };

  const exportToPDF = () => {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { text-align: center; margin-bottom: 30px; }
          .day { page-break-after: always; margin-bottom: 40px; }
          .day:last-child { page-break-after: auto; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 11px; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .scene-number { font-weight: bold; }
        </style>
      </head>
      <body>
        <h1>SHOOTING SCHEDULE</h1>
        <h2 style="text-align: center;">${storyContext.title || 'Project'}</h2>
    `;

    schedule.forEach(day => {
      html += `
        <div class="day">
          <h2>DAY ${day.day} - ${day.location}</h2>
          <p><strong>Estimated Time:</strong> ${day.estimatedTime.toFixed(1)} hours</p>
          <p><strong>Characters:</strong> ${day.characters.join(', ')}</p>
          <p><strong>Equipment:</strong> ${day.equipment.join(', ')}</p>
          <table>
            <thead>
              <tr>
                <th>Scene #</th>
                <th>Scene ID</th>
                <th>Description</th>
                <th>Dialogue</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
      `;

      day.scenes.forEach(scene => {
        html += `
          <tr>
            <td class="scene-number">${scene.sequenceNumber}</td>
            <td>${scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`}</td>
            <td>${scene.enhancedPrompt.substring(0, 100)}...</td>
            <td>${scene.directorSettings.dialogue || '-'}</td>
            <td>15 min</td>
          </tr>
        `;
      });

      html += `
            </tbody>
          </table>
        </div>
      `;
    });

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

  const exportToCSV = () => {
    const headers = ['Day', 'Location', 'Scene #', 'Scene ID', 'Characters', 'Equipment', 'Time', 'Notes'];
    const rows: string[][] = [];

    schedule.forEach(day => {
      day.scenes.forEach(scene => {
        rows.push([
          day.day.toString(),
          day.location,
          scene.sequenceNumber.toString(),
          scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`,
          day.characters.join('; '),
          day.equipment.join('; '),
          '15 min',
          day.notes,
        ]);
      });
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shooting_schedule_${projectId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div>
            <h2 className="text-xl font-bold text-white">Shooting Schedule Generator</h2>
            <p className="text-sm text-zinc-400 mt-1">Auto-generate production schedule optimized by location</p>
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
            <div className="space-y-6">
              <div className="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-lg text-zinc-400 mb-6">Configure schedule generation</p>
              </div>

              {/* Configuration */}
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Scenes per Day
                  </label>
                  <input
                    type="number"
                    value={scenesPerDay}
                    onChange={(e) => setScenesPerDay(parseInt(e.target.value) || 5)}
                    min="1"
                    max="20"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Maximum number of scenes to shoot per day</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-2">
                    Hours per Day
                  </label>
                  <input
                    type="number"
                    value={hoursPerDay}
                    onChange={(e) => setHoursPerDay(parseFloat(e.target.value) || 10)}
                    min="1"
                    max="24"
                    step="0.5"
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Maximum shooting hours per day</p>
                </div>

                <button
                  onClick={generateSchedule}
                  disabled={scenes.length === 0}
                  className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate Schedule
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Export Buttons */}
              <div className="flex items-center justify-end gap-2">
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

                  {/* Schedule Days */}
              {schedule.map((day, index) => (
                <div key={index} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-white">DAY {day.day}</h3>
                      <p className="text-sm text-zinc-400">{day.location}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-sm text-zinc-400">Estimated Time</div>
                        <div className="text-lg font-bold text-amber-400">{day.estimatedTime.toFixed(1)} hours</div>
                      </div>
                      {onGenerateCallSheet && (
                        <button
                          onClick={() => onGenerateCallSheet(day)}
                          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs transition-colors flex items-center gap-1"
                          title="Generate Call Sheet for this day"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4z" clipRule="evenodd" />
                          </svg>
                          Call Sheet
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <div className="text-zinc-500 mb-1">Characters</div>
                      <div className="text-zinc-300">{day.characters.join(', ')}</div>
                    </div>
                    <div>
                      <div className="text-zinc-500 mb-1">Equipment</div>
                      <div className="text-zinc-300">{day.equipment.join(', ')}</div>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-zinc-400 mb-2">
                      Scenes ({day.scenes.length})
                    </div>
                    <div className="space-y-2">
                      {day.scenes.map((scene) => (
                        <div
                          key={scene.id}
                          className="bg-zinc-900 border border-zinc-700 rounded p-2 text-sm"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="bg-amber-900/30 text-amber-500 px-2 py-0.5 rounded text-xs font-mono font-bold">
                              {scene.directorSettings.customSceneId || `SEQ #${scene.sequenceNumber.toString().padStart(2, '0')}`}
                            </span>
                            <span className="text-zinc-500">Scene {scene.sequenceNumber}</span>
                          </div>
                          <p className="text-zinc-300 text-xs line-clamp-2">{scene.enhancedPrompt}</p>
                          {scene.directorSettings.dialogue && (
                            <p className="text-amber-400 text-xs italic mt-1">"{scene.directorSettings.dialogue}"</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              {/* Summary */}
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <h3 className="text-sm font-bold text-white mb-3">Schedule Summary</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="text-zinc-400">Total Days</div>
                    <div className="text-white font-bold text-lg">{schedule.length}</div>
                  </div>
                  <div>
                    <div className="text-zinc-400">Total Scenes</div>
                    <div className="text-white font-bold text-lg">{scenes.length}</div>
                  </div>
                  <div>
                    <div className="text-zinc-400">Total Hours</div>
                    <div className="text-white font-bold text-lg">
                      {schedule.reduce((sum, day) => sum + day.estimatedTime, 0).toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-zinc-400">Locations</div>
                    <div className="text-white font-bold text-lg">
                      {new Set(schedule.map(d => d.location)).size}
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
              onClick={() => {
                setGenerated(false);
                setSchedule([]);
              }}
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

export default ShootingScheduleGenerator;

