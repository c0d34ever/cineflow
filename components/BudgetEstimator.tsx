import React, { useState, useMemo } from 'react';
import { Scene } from '../types';

interface BudgetEstimatorProps {
  scenes: Scene[];
  projectId: string;
  onClose: () => void;
}

interface BudgetItem {
  category: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

interface BudgetCategory {
  name: string;
  items: BudgetItem[];
  total: number;
}

const BudgetEstimator: React.FC<BudgetEstimatorProps> = ({ scenes, projectId, onClose }) => {
  const [budget, setBudget] = useState<BudgetCategory[]>([]);
  const [generated, setGenerated] = useState(false);
  const [rates, setRates] = useState({
    locationCost: 500, // per location per day
    actorCost: 1000, // per actor per day
    equipmentRental: 200, // per day
    crewCost: 500, // per crew member per day
    postProduction: 500, // per scene
  });

  const generateBudget = () => {
    const categories: BudgetCategory[] = [];

    // Location Costs
    const locations = new Set<string>();
    scenes.forEach(scene => {
      const prompt = scene.enhancedPrompt.toLowerCase();
      const locationMatch = prompt.match(/(?:in|at|inside|outside|on|near)\s+(?:the\s+)?([a-z]+(?:\s+[a-z]+){0,2})\s+(?:room|building|house|street|park|forest|beach|office|car|train|plane|studio|warehouse)/i);
      if (locationMatch) {
        locations.add(locationMatch[1]);
      }
    });

    const locationItems: BudgetItem[] = Array.from(locations).map(location => ({
      category: 'Locations',
      description: location,
      quantity: 1,
      unitCost: rates.locationCost,
      totalCost: rates.locationCost,
    }));

    if (locationItems.length > 0) {
      categories.push({
        name: 'Locations',
        items: locationItems,
        total: locationItems.reduce((sum, item) => sum + item.totalCost, 0),
      });
    }

    // Cast Costs
    const actors = new Set<string>();
    scenes.forEach(scene => {
      const dialogue = scene.directorSettings.dialogue || '';
      const context = scene.contextSummary || '';
      const text = `${dialogue} ${context}`.toLowerCase();
      const characterPatterns = /(?:character|actor|person|protagonist|antagonist|hero|villain)\s+(\w+)/gi;
      let match;
      while ((match = characterPatterns.exec(text)) !== null) {
        actors.add(match[1]);
      }
    });

    const castItems: BudgetItem[] = Array.from(actors).map(actor => ({
      category: 'Cast',
      description: actor,
      quantity: 1,
      unitCost: rates.actorCost,
      totalCost: rates.actorCost,
    }));

    if (castItems.length > 0) {
      categories.push({
        name: 'Cast',
        items: castItems,
        total: castItems.reduce((sum, item) => sum + item.totalCost, 0),
      });
    }

    // Equipment Costs
    const equipmentSet = new Set<string>();
    scenes.forEach(scene => {
      if (scene.directorSettings.movement && !scene.directorSettings.movement.toLowerCase().includes('static')) {
        equipmentSet.add('Camera Rig/Dolly');
      }
      if (scene.directorSettings.stuntInstructions) {
        equipmentSet.add('Stunt Equipment');
      }
      if (scene.directorSettings.lens) {
        equipmentSet.add(scene.directorSettings.lens);
      }
    });

    const equipmentItems: BudgetItem[] = Array.from(equipmentSet).map(equipment => ({
      category: 'Equipment',
      description: equipment,
      quantity: 1,
      unitCost: rates.equipmentRental,
      totalCost: rates.equipmentRental,
    }));

    if (equipmentItems.length > 0) {
      categories.push({
        name: 'Equipment',
        items: equipmentItems,
        total: equipmentItems.reduce((sum, item) => sum + item.totalCost, 0),
      });
    }

    // Crew Costs
    const crewItems: BudgetItem[] = [
      { category: 'Crew', description: 'Director', quantity: 1, unitCost: rates.crewCost, totalCost: rates.crewCost },
      { category: 'Crew', description: 'Cinematographer', quantity: 1, unitCost: rates.crewCost, totalCost: rates.crewCost },
      { category: 'Crew', description: 'Sound Engineer', quantity: 1, unitCost: rates.crewCost, totalCost: rates.crewCost },
      { category: 'Crew', description: 'Production Assistant', quantity: 2, unitCost: rates.crewCost * 0.5, totalCost: rates.crewCost },
    ];

    categories.push({
      name: 'Crew',
      items: crewItems,
      total: crewItems.reduce((sum, item) => sum + item.totalCost, 0),
    });

    // Post-Production
    const postItems: BudgetItem[] = [
      { category: 'Post-Production', description: 'Editing', quantity: scenes.length, unitCost: rates.postProduction, totalCost: scenes.length * rates.postProduction },
      { category: 'Post-Production', description: 'Color Grading', quantity: scenes.length, unitCost: rates.postProduction * 0.5, totalCost: scenes.length * rates.postProduction * 0.5 },
      { category: 'Post-Production', description: 'Sound Design', quantity: scenes.length, unitCost: rates.postProduction * 0.3, totalCost: scenes.length * rates.postProduction * 0.3 },
    ];

    categories.push({
      name: 'Post-Production',
      items: postItems,
      total: postItems.reduce((sum, item) => sum + item.totalCost, 0),
    });

    setBudget(categories);
    setGenerated(true);
  };

  const totalBudget = useMemo(() => {
    return budget.reduce((sum, category) => sum + category.total, 0);
  }, [budget]);

  const exportToCSV = () => {
    const headers = ['Category', 'Item', 'Quantity', 'Unit Cost', 'Total Cost'];
    const rows: string[][] = [];

    budget.forEach(category => {
      category.items.forEach(item => {
        rows.push([
          category.name,
          item.description,
          item.quantity.toString(),
          `$${item.unitCost.toFixed(2)}`,
          `$${item.totalCost.toFixed(2)}`,
        ]);
      });
      // Add category total row
      rows.push([
        category.name,
        'TOTAL',
        '',
        '',
        `$${category.total.toFixed(2)}`,
      ]);
    });

    // Add grand total
    rows.push(['', 'GRAND TOTAL', '', '', `$${totalBudget.toFixed(2)}`]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `budget_estimate_${projectId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    let html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          h1 { text-align: center; margin-bottom: 30px; }
          .category { margin-bottom: 30px; page-break-inside: avoid; }
          .category h2 { background-color: #f0f0f0; padding: 10px; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th, td { border: 1px solid #000; padding: 8px; text-align: left; font-size: 11px; }
          th { background-color: #f0f0f0; font-weight: bold; }
          .total-row { font-weight: bold; background-color: #f9f9f9; }
          .grand-total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
        </style>
      </head>
      <body>
        <h1>BUDGET ESTIMATE</h1>
    `;

    budget.forEach(category => {
      html += `
        <div class="category">
          <h2>${category.name}</h2>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit Cost</th>
                <th>Total Cost</th>
              </tr>
            </thead>
            <tbody>
      `;

      category.items.forEach(item => {
        html += `
          <tr>
            <td>${item.description}</td>
            <td>${item.quantity}</td>
            <td>$${item.unitCost.toFixed(2)}</td>
            <td>$${item.totalCost.toFixed(2)}</td>
          </tr>
        `;
      });

      html += `
              <tr class="total-row">
                <td colspan="3">Category Total</td>
                <td>$${category.total.toFixed(2)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;
    });

    html += `
        <div class="grand-total">
          <p>GRAND TOTAL: $${totalBudget.toFixed(2)}</p>
        </div>
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
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col m-2 sm:m-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-zinc-800 gap-2 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Budget Estimator</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">Scene-based cost estimation</p>
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
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {!generated ? (
            <div className="space-y-6">
              <div className="text-center py-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg text-zinc-400 mb-6">Configure budget rates</p>
              </div>

              {/* Rate Configuration */}
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-bold text-white mb-3">Default Rates (per day/unit)</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Location Cost</label>
                    <input
                      type="number"
                      value={rates.locationCost}
                      onChange={(e) => setRates({ ...rates, locationCost: parseFloat(e.target.value) || 500 })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Actor Cost</label>
                    <input
                      type="number"
                      value={rates.actorCost}
                      onChange={(e) => setRates({ ...rates, actorCost: parseFloat(e.target.value) || 1000 })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Equipment Rental</label>
                    <input
                      type="number"
                      value={rates.equipmentRental}
                      onChange={(e) => setRates({ ...rates, equipmentRental: parseFloat(e.target.value) || 200 })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Crew Cost</label>
                    <input
                      type="number"
                      value={rates.crewCost}
                      onChange={(e) => setRates({ ...rates, crewCost: parseFloat(e.target.value) || 500 })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-400 mb-1">Post-Production (per scene)</label>
                    <input
                      type="number"
                      value={rates.postProduction}
                      onChange={(e) => setRates({ ...rates, postProduction: parseFloat(e.target.value) || 500 })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-700 rounded text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <button
                  onClick={generateBudget}
                  disabled={scenes.length === 0}
                  className="w-full px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Generate Budget Estimate
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Export Buttons */}
              <div className="flex items-center justify-between">
                <div className="text-2xl font-bold text-white">
                  Total Budget: <span className="text-amber-400">$${totalBudget.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
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
              </div>

              {/* Budget Categories */}
              {budget.map((category, index) => (
                <div key={index} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-white">{category.name}</h3>
                    <div className="text-lg font-bold text-amber-400">${category.total.toFixed(2)}</div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-700">
                          <th className="px-3 py-2 text-left text-xs font-bold text-zinc-300 uppercase">Item</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-zinc-300 uppercase">Quantity</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-zinc-300 uppercase">Unit Cost</th>
                          <th className="px-3 py-2 text-right text-xs font-bold text-zinc-300 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {category.items.map((item, itemIndex) => (
                          <tr key={itemIndex} className="border-b border-zinc-700/50">
                            <td className="px-3 py-2 text-sm text-zinc-300">{item.description}</td>
                            <td className="px-3 py-2 text-sm text-zinc-400 text-right">{item.quantity}</td>
                            <td className="px-3 py-2 text-sm text-zinc-400 text-right">${item.unitCost.toFixed(2)}</td>
                            <td className="px-3 py-2 text-sm text-zinc-200 text-right font-semibold">${item.totalCost.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex justify-end gap-2">
          {generated && (
            <button
              onClick={() => {
                setGenerated(false);
                setBudget([]);
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

export default BudgetEstimator;

