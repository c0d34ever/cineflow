
import React from 'react';
import { DirectorSettings, TechnicalStyle } from '../types';

interface DirectorPanelProps {
  settings: DirectorSettings;
  onChange: (settings: DirectorSettings) => void;
  onAutoSuggest: () => void;
  onClear: () => void;
  disabled: boolean;
}

const DirectorPanel: React.FC<DirectorPanelProps> = ({ settings, onChange, onAutoSuggest, onClear, disabled }) => {
  
  const handleChange = (key: keyof DirectorSettings, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  const transitions = [
    "Cut",
    "Cross Dissolve",
    "Fade to Black",
    "Fade to White",
    "Whip Pan",
    "Zoom Transition",
    "Match Cut",
    "J-Cut",
    "L-Cut",
    "Custom"
  ];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 sm:p-4 space-y-3 sm:space-y-4 max-h-[300px] overflow-y-auto relative">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between sticky top-0 bg-zinc-900 z-10 py-2 border-b border-zinc-800 mb-2 gap-2 sm:gap-0">
        <h3 className="text-amber-500 font-serif font-bold tracking-widest text-xs sm:text-sm uppercase">
          Technical Direction
        </h3>
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <button 
            onClick={onClear}
            disabled={disabled}
            className="text-[10px] uppercase font-bold tracking-wider bg-red-900/10 hover:bg-red-900/30 text-red-400 border border-red-900/30 hover:border-red-500/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded transition-all flex-1 sm:flex-none text-center"
            title="Clear all technical settings"
          >
            <span className="hidden sm:inline">Clear Specs</span>
            <span className="sm:hidden">Clear</span>
          </button>
          <button 
            onClick={onAutoSuggest}
            disabled={disabled}
            className="text-[10px] uppercase font-bold tracking-wider bg-amber-900/20 hover:bg-amber-900/40 text-amber-300 border border-amber-900/50 hover:border-amber-500/50 px-2 sm:px-3 py-1 sm:py-1.5 rounded transition-all flex items-center gap-1 flex-1 sm:flex-none justify-center"
            title="Let AI fill these settings based on your story"
          >
            <span>✨</span>
            <span className="hidden sm:inline">Auto-Suggest</span>
            <span className="sm:hidden">Auto</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* Scene ID */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Scene ID (Optional)</label>
          <input
            type="text"
            disabled={disabled}
            value={settings.customSceneId}
            onChange={(e) => handleChange('customSceneId', e.target.value)}
            placeholder="e.g. SC-01A"
            className="w-full bg-black border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1.5 focus:border-amber-500 outline-none placeholder-zinc-600"
          />
        </div>

        {/* Style */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Visual Style</label>
          <select
            disabled={disabled}
            value={settings.style}
            onChange={(e) => handleChange('style', e.target.value)}
            className="w-full bg-black border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1.5 focus:border-amber-500 outline-none"
          >
            {Object.values(TechnicalStyle).map((style) => (
              <option key={style} value={style}>{style}</option>
            ))}
          </select>
        </div>

        {/* Transition Selector */}
         <div>
          <label className="block text-xs text-zinc-400 mb-1">Next Transition</label>
          <select
            disabled={disabled}
            value={settings.transition}
            onChange={(e) => handleChange('transition', e.target.value)}
            className="w-full bg-black border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1.5 focus:border-amber-500 outline-none"
          >
            {transitions.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {/* Zoom */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Zoom Level</label>
          <input
            type="text"
            disabled={disabled}
            value={settings.zoom || ''}
            onChange={(e) => handleChange('zoom', e.target.value)}
            placeholder="e.g. Slow Push In, Crash Zoom"
            className="w-full bg-black border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1.5 focus:border-amber-500 outline-none placeholder-zinc-600"
          />
        </div>

        {/* Lens */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Lens Choice</label>
          <input
            type="text"
            disabled={disabled}
            value={settings.lens}
            onChange={(e) => handleChange('lens', e.target.value)}
            placeholder="e.g. 35mm Prime, Anamorphic"
            className="w-full bg-black border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1.5 focus:border-amber-500 outline-none placeholder-zinc-600"
          />
        </div>

        {/* Angle */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Camera Angle</label>
          <input
            type="text"
            disabled={disabled}
            value={settings.angle}
            onChange={(e) => handleChange('angle', e.target.value)}
            placeholder="e.g. Low angle, Dutch tilt"
            className="w-full bg-black border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1.5 focus:border-amber-500 outline-none placeholder-zinc-600"
          />
        </div>

        {/* Movement */}
        <div>
          <label className="block text-xs text-zinc-400 mb-1">Camera Movement</label>
          <input
            type="text"
            disabled={disabled}
            value={settings.movement}
            onChange={(e) => handleChange('movement', e.target.value)}
            placeholder="e.g. Dolly in, Handheld shake"
            className="w-full bg-black border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1.5 focus:border-amber-500 outline-none placeholder-zinc-600"
          />
        </div>

        {/* Lighting */}
        <div className="md:col-span-2">
          <label className="block text-xs text-zinc-400 mb-1">Lighting Setup</label>
          <input
            type="text"
            disabled={disabled}
            value={settings.lighting}
            onChange={(e) => handleChange('lighting', e.target.value)}
            placeholder="e.g. High contrast, Golden hour"
            className="w-full bg-black border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1.5 focus:border-amber-500 outline-none placeholder-zinc-600"
          />
        </div>

        {/* Stunt Instructions */}
        <div className="md:col-span-2">
          <label className="block text-xs text-zinc-400 mb-1">Stunt / Action Instructions</label>
          <input
            type="text"
            disabled={disabled}
            value={settings.stuntInstructions || ''}
            onChange={(e) => handleChange('stuntInstructions', e.target.value)}
            placeholder="e.g. Wire work, fast fall, impact bracing"
            className="w-full bg-black border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1.5 focus:border-amber-500 outline-none placeholder-zinc-600"
          />
        </div>

        {/* Dialogue */}
        <div className="md:col-span-2">
          <label className="block text-xs text-zinc-400 mb-1">Dialogue (Native Language Supported)</label>
          <textarea
            disabled={disabled}
            value={settings.dialogue || ''}
            onChange={(e) => handleChange('dialogue', e.target.value)}
            placeholder="Character spoken lines... (e.g. 'Stop right there!' or 'रुको! वहीं रुक जाओ!')"
            rows={2}
            className="w-full bg-black border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1.5 focus:border-amber-500 outline-none placeholder-zinc-600 resize-none font-serif"
          />
        </div>

        {/* Sound */}
        <div className="md:col-span-2">
          <label className="block text-xs text-zinc-400 mb-1">Sound Design & Music</label>
          <input
            type="text"
            disabled={disabled}
            value={settings.sound}
            onChange={(e) => handleChange('sound', e.target.value)}
            placeholder="e.g. Swelling strings, heavy breathing"
            className="w-full bg-black border border-zinc-700 text-zinc-200 text-sm rounded px-2 py-1.5 focus:border-amber-500 outline-none placeholder-zinc-600"
          />
        </div>
      </div>

      {/* Toggles */}
      <div className="flex items-center space-x-2 pt-2 border-t border-zinc-800">
        <input
          type="checkbox"
          id="physicsFocus"
          checked={settings.physicsFocus}
          onChange={(e) => handleChange('physicsFocus', e.target.checked)}
          disabled={disabled}
          className="w-4 h-4 accent-amber-500 bg-zinc-800 border-zinc-600 rounded"
        />
        <label htmlFor="physicsFocus" className="text-sm text-zinc-300 cursor-pointer select-none">
          Enable <span className="text-amber-500 font-semibold">High-Fidelity Physics & Texture</span> (Skin, Fabrics, Gravity)
        </label>
      </div>
    </div>
  );
};

export default DirectorPanel;
