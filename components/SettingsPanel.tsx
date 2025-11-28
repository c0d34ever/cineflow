import React, { useState, useEffect } from 'react';

interface SettingsPanelProps {
  onClose: () => void;
  theme: 'dark' | 'light';
  onThemeChange: (theme: 'dark' | 'light') => void;
}

const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose, theme, onThemeChange }) => {
  const [autoSave, setAutoSave] = useState(true);
  const [autoSaveInterval, setAutoSaveInterval] = useState(1.5);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedAutoSave = localStorage.getItem('autoSave');
    const savedAutoSaveInterval = localStorage.getItem('autoSaveInterval');
    const savedNotifications = localStorage.getItem('notificationsEnabled');

    if (savedAutoSave !== null) setAutoSave(savedAutoSave === 'true');
    if (savedAutoSaveInterval) setAutoSaveInterval(parseFloat(savedAutoSaveInterval));
    if (savedNotifications !== null) setNotificationsEnabled(savedNotifications === 'true');
  }, []);

  const handleSave = () => {
    localStorage.setItem('autoSave', autoSave.toString());
    localStorage.setItem('autoSaveInterval', autoSaveInterval.toString());
    localStorage.setItem('notificationsEnabled', notificationsEnabled.toString());
    // Settings are applied immediately, no need to reload
  };

  const keyboardShortcuts = [
    { key: 'Ctrl+S / Cmd+S', action: 'Save project' },
    { key: 'Ctrl+E / Cmd+E', action: 'Toggle export menu' },
    { key: 'Ctrl+N / Cmd+N', action: 'Focus new scene input' },
    { key: 'Ctrl+C / Cmd+C', action: 'Open comments panel' },
    { key: 'Ctrl+Z / Cmd+Z', action: 'Undo' },
    { key: 'Ctrl+Shift+Z / Cmd+Shift+Z', action: 'Redo' },
    { key: 'Ctrl+Y / Cmd+Y', action: 'Redo (alternative)' },
    { key: 'Ctrl+/ / Cmd+/', action: 'Show shortcuts help' },
    { key: 'Esc', action: 'Close modals/panels' },
  ];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Appearance */}
          <div>
            <h3 className="font-bold mb-3">Appearance</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm text-white mb-1">Theme</label>
                  <p className="text-xs text-zinc-400">Choose your preferred color scheme</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => onThemeChange('dark')}
                    className={`px-4 py-2 rounded text-sm ${
                      theme === 'dark' ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    onClick={() => onThemeChange('light')}
                    className={`px-4 py-2 rounded text-sm ${
                      theme === 'light' ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    Light
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-save */}
          <div>
            <h3 className="font-bold mb-3">Auto-save</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm text-white mb-1">Enable Auto-save</label>
                  <p className="text-xs text-zinc-400">Automatically save your work</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={(e) => {
                      setAutoSave(e.target.checked);
                      handleSave();
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
                </label>
              </div>
              {autoSave && (
                <div>
                  <label className="block text-sm text-white mb-1">
                    Auto-save Interval: {autoSaveInterval}s
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="5"
                    step="0.5"
                    value={autoSaveInterval}
                    onChange={(e) => {
                      setAutoSaveInterval(parseFloat(e.target.value));
                      handleSave();
                    }}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Notifications */}
          <div>
            <h3 className="font-bold mb-3">Notifications</h3>
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-sm text-white mb-1">Enable Notifications</label>
                <p className="text-xs text-zinc-400">Receive activity and system notifications</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => {
                    setNotificationsEnabled(e.target.checked);
                    handleSave();
                  }}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-600"></div>
              </label>
            </div>
          </div>

          {/* Keyboard Shortcuts */}
          <div>
            <h3 className="font-bold mb-3">Keyboard Shortcuts</h3>
            <button
              onClick={() => setShowKeyboardShortcuts(!showKeyboardShortcuts)}
              className="text-sm text-amber-500 hover:text-amber-400"
            >
              {showKeyboardShortcuts ? 'Hide' : 'Show'} Shortcuts
            </button>
            {showKeyboardShortcuts && (
              <div className="mt-3 space-y-2">
                {keyboardShortcuts.map((shortcut, idx) => (
                  <div key={idx} className="flex justify-between items-center py-2 border-b border-zinc-800">
                    <span className="text-sm text-zinc-400">{shortcut.action}</span>
                    <kbd className="px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-300">
                      {shortcut.key}
                    </kbd>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-zinc-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPanel;

