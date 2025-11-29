import React, { useState, useEffect } from 'react';
import { apiKeysService, settingsService, favoritesService, userGeminiKeyService } from '../apiServices';

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
}

interface UserDashboardProps {
  user: User;
  onLogout: () => void;
}

const UserDashboard: React.FC<UserDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'api-keys' | 'settings' | 'favorites' | 'gemini-key'>('profile');
  const [geminiKey, setGeminiKey] = useState('');
  const [geminiKeyMasked, setGeminiKeyMasked] = useState('');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [testingKey, setTestingKey] = useState(false);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [settingsForm, setSettingsForm] = useState({ theme: 'dark', language: 'en' });

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'api-keys') {
        const data = await apiKeysService.getAll();
        setApiKeys(data.apiKeys || []);
      } else if (activeTab === 'settings') {
        const data = await settingsService.get();
        setSettings(data.settings);
        if (data.settings) {
          setSettingsForm({
            theme: data.settings.theme || 'dark',
            language: data.settings.language || 'en',
          });
        }
      } else if (activeTab === 'favorites') {
        const data = await favoritesService.getAll();
        setFavorites(data.favorites || []);
      } else if (activeTab === 'gemini-key') {
        const data = await userGeminiKeyService.get();
        setGeminiKeyMasked(data.key || '');
        setGeminiKey(data.hasKey ? 'set' : '');
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;

    try {
      const result = await apiKeysService.create({ key_name: newKeyName });
      alert(`API Key created! Save it now: ${result.api_key}`);
      setNewKeyName('');
      loadData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteApiKey = async (id: number) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;

    try {
      await apiKeysService.delete(id);
      loadData();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleSetGeminiKey = async () => {
    if (!geminiKeyInput.trim()) {
      alert('Please enter a Gemini API key');
      return;
    }

    try {
      await userGeminiKeyService.set(geminiKeyInput);
      setGeminiKeyInput('');
      loadData();
      alert('Gemini API key saved successfully!');
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleRemoveGeminiKey = async () => {
    if (!confirm('Are you sure you want to remove your Gemini API key?')) return;

    try {
      await userGeminiKeyService.remove();
      loadData();
      alert('Gemini API key removed');
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleTestGeminiKey = async () => {
    const keyToTest = geminiKeyInput.trim() || geminiKey;
    if (!keyToTest || keyToTest === 'set') {
      alert('Please enter a Gemini API key to test');
      return;
    }

    setTestingKey(true);
    try {
      const result = await userGeminiKeyService.test(keyToTest);
      if (result.valid) {
        alert('✅ API key is valid and working!');
      } else {
        alert('❌ API key test failed: ' + result.message);
      }
    } catch (error: any) {
      alert('Error testing API key: ' + error.message);
    } finally {
      setTestingKey(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif text-amber-500 mb-1">User Dashboard</h1>
            <p className="text-zinc-500 text-sm">Welcome, {user.username}</p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
          >
            Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 mb-6">
          {(['profile', 'api-keys', 'gemini-key', 'settings', 'favorites'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-bold uppercase transition-colors ${
                activeTab === tab
                  ? 'text-amber-500 border-b-2 border-amber-500'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab.replace('-', ' ')}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Profile Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-zinc-500 uppercase mb-1">Username</label>
                  <div className="bg-zinc-800 p-3 rounded-lg">{user.username}</div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 uppercase mb-1">Email</label>
                  <div className="bg-zinc-800 p-3 rounded-lg">{user.email}</div>
                </div>
                <div>
                  <label className="block text-xs text-zinc-500 uppercase mb-1">Role</label>
                  <div className="bg-zinc-800 p-3 rounded-lg uppercase">{user.role}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'api-keys' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">API Keys</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="Key name"
                    className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm"
                  />
                  <button
                    onClick={handleCreateApiKey}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm"
                  >
                    Create Key
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="text-center py-8 text-zinc-500">Loading...</div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">No API keys created yet</div>
              ) : (
                <div className="space-y-2">
                  {apiKeys.map((key: any) => (
                    <div
                      key={key.id}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold">{key.key_name}</div>
                        <div className="text-xs text-zinc-500 font-mono mt-1">
                          {key.api_key.substring(0, 20)}...
                        </div>
                        <div className="text-xs text-zinc-600 mt-1">
                          Usage: {key.usage_count} | Created: {new Date(key.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteApiKey(key.id)}
                        className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-xs"
                      >
                        Delete
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Settings</h2>
              {loading ? (
                <div className="text-center py-8 text-zinc-500">Loading...</div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs text-zinc-500 uppercase mb-1">Theme</label>
                    <select
                      value={settingsForm.theme}
                      onChange={(e) => setSettingsForm({ ...settingsForm, theme: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3"
                    >
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-zinc-500 uppercase mb-1">Language</label>
                    <select
                      value={settingsForm.language}
                      onChange={(e) => setSettingsForm({ ...settingsForm, language: e.target.value })}
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                    </select>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await settingsService.update(settingsForm);
                        alert('Settings saved successfully!');
                        loadData();
                      } catch (error: any) {
                        alert('Error saving settings: ' + error.message);
                      }
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded"
                  >
                    Save Settings
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'gemini-key' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Gemini API Key</h2>
              <p className="text-sm text-zinc-500 mb-4">
                Set your own Gemini API key to use AI features. Your key will be used instead of the system default.
                Get your key from <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:underline">Google AI Studio</a>.
              </p>

              {geminiKeyMasked && (
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-zinc-500 uppercase mb-1">Current Key</div>
                      <div className="font-mono text-sm">{geminiKeyMasked}</div>
                    </div>
                    <button
                      onClick={handleRemoveGeminiKey}
                      className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-xs"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 uppercase mb-1">
                    Gemini API Key
                  </label>
                  <input
                    type="password"
                    value={geminiKeyInput}
                    onChange={(e) => setGeminiKeyInput(e.target.value)}
                    placeholder="Enter your Gemini API key"
                    className="w-full bg-black border border-zinc-700 rounded-lg p-3 text-white focus:border-amber-500 outline-none font-mono text-sm"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleSetGeminiKey}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm"
                  >
                    {geminiKeyMasked ? 'Update Key' : 'Save Key'}
                  </button>
                  <button
                    onClick={handleTestGeminiKey}
                    disabled={testingKey || (!geminiKeyInput && !geminiKeyMasked)}
                    className={`px-4 py-2 rounded text-sm ${
                      testingKey || (!geminiKeyInput && !geminiKeyMasked)
                        ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                        : 'bg-zinc-700 hover:bg-zinc-600'
                    }`}
                  >
                    {testingKey ? 'Testing...' : 'Test Key'}
                  </button>
                </div>

                <div className="bg-amber-900/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-400">
                  <strong>Note:</strong> Your API key is stored securely and will be used for all AI features. 
                  If you don't set a key, the system default will be used (if configured).
                </div>
              </div>
            </div>
          )}

          {activeTab === 'favorites' && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold mb-4">Favorites</h2>
              {loading ? (
                <div className="text-center py-8 text-zinc-500">Loading...</div>
              ) : favorites.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">No favorites yet</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {favorites.map((fav: any) => (
                    <div
                      key={fav.id}
                      className="bg-zinc-800 border border-zinc-700 rounded-lg p-4"
                    >
                      <h3 className="font-bold mb-2">{fav.title}</h3>
                      <p className="text-sm text-zinc-500 line-clamp-2">{fav.plot_summary}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserDashboard;

