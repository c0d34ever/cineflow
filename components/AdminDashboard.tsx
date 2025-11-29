import React, { useState, useEffect } from 'react';
import { authService, adminProjectsService, adminApiKeysService } from '../apiServices';

const ADMIN_API_URL = import.meta.env.VITE_ADMIN_API_URL || 'http://localhost:5001/api';

interface AdminDashboardProps {
  user: any;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'projects' | 'api-keys' | 'stats'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [apiKeyStats, setApiKeyStats] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateUser, setShowCreateUser] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '', role: 'user' });
  const [editingUser, setEditingUser] = useState<any>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [showCreateApiKey, setShowCreateApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState({ key_name: '', user_id: '' });
  const [editingApiKey, setEditingApiKey] = useState<any>(null);

  useEffect(() => {
    if (activeTab === 'stats' || activeTab === 'overview') {
      loadStats();
    } else if (activeTab === 'users') {
      loadUsers();
    } else if (activeTab === 'projects') {
      loadProjects();
    } else if (activeTab === 'api-keys') {
      loadApiKeys();
      loadApiKeyStats();
    }
  }, [activeTab]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${ADMIN_API_URL}/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.reload();
          return;
        }
        throw new Error(`Failed to load stats: ${response.status}`);
      }
      
      const data = await response.json();
      setStats(data);
    } catch (error: any) {
      console.error('Error loading stats:', error);
      // Don't show error if it's a network error (service might be down)
      if (error.message && !error.message.includes('Failed to fetch')) {
        // Only log, don't show to user
      }
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${ADMIN_API_URL}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('auth_token');
          window.location.reload();
          return;
        }
        throw new Error(`Failed to load users: ${response.status}`);
      }
      
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error: any) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await adminProjectsService.getAll({ 
        limit: 100,
        search: searchTerm || undefined 
      });
      setProjects(data.projects || []);
    } catch (error: any) {
      console.error('Error loading projects:', error);
      if (error.message && error.message.includes('Authentication required')) {
        localStorage.removeItem('auth_token');
        window.location.reload();
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const data = await adminApiKeysService.getAll({ limit: 100 });
      setApiKeys(data.apiKeys || []);
    } catch (error: any) {
      console.error('Error loading API keys:', error);
      if (error.message && error.message.includes('Authentication required')) {
        localStorage.removeItem('auth_token');
        window.location.reload();
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeyStats = async () => {
    try {
      const data = await adminApiKeysService.getStats();
      setApiKeyStats(data);
    } catch (error: any) {
      console.error('Error loading API key stats:', error);
      // Don't show error if it's a network error (service might be down)
      if (error.message && error.message.includes('Authentication required')) {
        localStorage.removeItem('auth_token');
        window.location.reload();
        return;
      }
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      await adminProjectsService.delete(id);
      loadProjects();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      alert('Please fill in all required fields');
      return;
    }

    if (newUser.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${ADMIN_API_URL}/users`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newUser),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create user');
      }

      alert('User created successfully!');
      setNewUser({ username: '', email: '', password: '', role: 'user' });
      setShowCreateUser(false);
      loadUsers();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleEditUser = async (userData: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      const updateData: any = {
        username: userData.username,
        email: userData.email,
        role: userData.role,
        is_active: userData.is_active,
      };
      if (userData.password && userData.password.length >= 6) {
        updateData.password = userData.password;
      }

      const response = await fetch(`${ADMIN_API_URL}/users/${userData.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user');
      }

      alert('User updated successfully!');
      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${ADMIN_API_URL}/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete user');
      }

      alert('User deleted successfully!');
      loadUsers();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newApiKey.key_name) {
      alert('Please enter a key name');
      return;
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${ADMIN_API_URL}/api-keys`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key_name: newApiKey.key_name,
          user_id: newApiKey.user_id || null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create API key');
      }

      const data = await response.json();
      alert(`API Key created! Save it now: ${data.api_key}`);
      setNewApiKey({ key_name: '', user_id: '' });
      setShowCreateApiKey(false);
      loadApiKeys();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleUpdateApiKey = async (keyData: any) => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${ADMIN_API_URL}/api-keys/${keyData.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key_name: keyData.key_name,
          is_active: keyData.is_active,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update API key');
      }

      alert('API Key updated successfully!');
      setEditingApiKey(null);
      loadApiKeys();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleDeleteApiKey = async (keyId: number) => {
    if (!confirm('Are you sure you want to delete this API key?')) return;
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${ADMIN_API_URL}/api-keys/${keyId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete API key');
      }

      alert('API Key deleted successfully!');
      loadApiKeys();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif text-amber-500 mb-1">Admin Dashboard</h1>
            <p className="text-zinc-500 text-sm">Welcome, {user.username} (Admin)</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                localStorage.setItem('admin_view_mode', 'website');
                window.location.reload();
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm transition-colors"
            >
              Go to Website
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-800 mb-6 overflow-x-auto">
          {(['overview', 'users', 'projects', 'api-keys', 'stats'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-bold uppercase transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'text-amber-500 border-b-2 border-amber-500'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold mb-4">System Overview</h2>
              {loading ? (
                <div className="text-center py-8 text-zinc-500">Loading...</div>
              ) : stats ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <div className="text-zinc-500 text-sm uppercase mb-1">Total Users</div>
                    <div className="text-2xl font-bold text-amber-500">{stats.overview?.totalUsers || 0}</div>
                  </div>
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <div className="text-zinc-500 text-sm uppercase mb-1">Active Users</div>
                    <div className="text-2xl font-bold text-green-500">{stats.overview?.activeUsers || 0}</div>
                  </div>
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <div className="text-zinc-500 text-sm uppercase mb-1">Total Projects</div>
                    <div className="text-2xl font-bold text-blue-500">{stats.overview?.totalProjects || 0}</div>
                  </div>
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <div className="text-zinc-500 text-sm uppercase mb-1">Total Scenes</div>
                    <div className="text-2xl font-bold text-purple-500">{stats.overview?.totalScenes || 0}</div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">No statistics available</div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">User Management</h2>
                <button
                  onClick={() => setShowCreateUser(!showCreateUser)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm transition-colors"
                >
                  {showCreateUser ? 'Cancel' : '+ Create User'}
                </button>
              </div>

              {showCreateUser && (
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mb-4">
                  <h3 className="font-bold mb-3">Create New User</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-500 uppercase mb-1">Username *</label>
                      <input
                        type="text"
                        value={newUser.username}
                        onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                        className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                        placeholder="username"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 uppercase mb-1">Email *</label>
                      <input
                        type="email"
                        value={newUser.email}
                        onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                        className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                        placeholder="user@example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 uppercase mb-1">Password *</label>
                      <input
                        type="password"
                        value={newUser.password}
                        onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                        className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                        placeholder="Min 6 characters"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 uppercase mb-1">Role</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        <option value="moderator">Moderator</option>
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleCreateUser}
                    className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm"
                  >
                    Create User
                  </button>
                </div>
              )}

              {loading ? (
                <div className="text-center py-8 text-zinc-500">Loading...</div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">No users found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">ID</th>
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">Username</th>
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">Email</th>
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">Role</th>
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">Status</th>
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((u: any) => (
                        <tr key={u.id} className="border-b border-zinc-800">
                          <td className="p-3">{u.id}</td>
                          <td className="p-3">{u.username}</td>
                          <td className="p-3">{u.email}</td>
                          <td className="p-3 uppercase text-xs">{u.role}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              u.is_active ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                            }`}>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingUser({ ...u, password: '' })}
                                className="text-xs text-amber-500 hover:text-amber-400"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'stats' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold mb-4">Detailed Statistics</h2>
              {loading ? (
                <div className="text-center py-8 text-zinc-500">Loading...</div>
              ) : stats ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                      <h3 className="font-bold mb-2">Projects by Genre</h3>
                      {stats.projectsByGenre?.map((item: any) => (
                        <div key={item.genre} className="flex justify-between text-sm">
                          <span>{item.genre}</span>
                          <span className="text-amber-500">{item.count}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                      <h3 className="font-bold mb-2">Users by Role</h3>
                      {stats.usersByRole?.map((item: any) => (
                        <div key={item.role} className="flex justify-between text-sm">
                          <span className="uppercase">{item.role}</span>
                          <span className="text-amber-500">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-zinc-500">No statistics available</div>
              )}
            </div>
          )}

          {activeTab === 'projects' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Project Management</h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setTimeout(() => loadProjects(), 500);
                    }}
                    placeholder="Search projects..."
                    className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm w-64"
                  />
                </div>
              </div>
              {loading ? (
                <div className="text-center py-8 text-zinc-500">Loading...</div>
              ) : projects.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">No projects found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">Title</th>
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">Genre</th>
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">Owner</th>
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">Scenes</th>
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">Created</th>
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.map((p: any) => (
                        <tr key={p.id} className="border-b border-zinc-800">
                          <td className="p-3 font-medium">{p.title}</td>
                          <td className="p-3 text-zinc-400">{p.genre || '-'}</td>
                          <td className="p-3 text-sm text-zinc-400">{p.username || p.email || 'N/A'}</td>
                          <td className="p-3 text-zinc-400">{p.scene_count || 0}</td>
                          <td className="p-3 text-xs text-zinc-500">
                            {new Date(p.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingProject(p)}
                                className="text-xs text-amber-500 hover:text-amber-400"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleDeleteProject(p.id)}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'api-keys' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">API Key Management</h2>
                <button
                  onClick={() => setShowCreateApiKey(!showCreateApiKey)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-sm transition-colors"
                >
                  {showCreateApiKey ? 'Cancel' : '+ Create API Key'}
                </button>
              </div>

              {showCreateApiKey && (
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mb-4">
                  <h3 className="font-bold mb-3">Create New API Key</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-zinc-500 uppercase mb-1">Key Name *</label>
                      <input
                        type="text"
                        value={newApiKey.key_name}
                        onChange={(e) => setNewApiKey({ ...newApiKey, key_name: e.target.value })}
                        className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                        placeholder="My API Key"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-zinc-500 uppercase mb-1">User ID (optional)</label>
                      <input
                        type="number"
                        value={newApiKey.user_id}
                        onChange={(e) => setNewApiKey({ ...newApiKey, user_id: e.target.value })}
                        className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                        placeholder="Leave empty for system key"
                      />
                    </div>
                  </div>
                  <button
                    onClick={handleCreateApiKey}
                    className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm"
                  >
                    Create API Key
                  </button>
                </div>
              )}
              
              {apiKeyStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <div className="text-zinc-500 text-sm uppercase mb-1">Total Keys</div>
                    <div className="text-2xl font-bold text-amber-500">{apiKeyStats.total || 0}</div>
                  </div>
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <div className="text-zinc-500 text-sm uppercase mb-1">Active Keys</div>
                    <div className="text-2xl font-bold text-green-500">{apiKeyStats.active || 0}</div>
                  </div>
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <div className="text-zinc-500 text-sm uppercase mb-1">Expired Keys</div>
                    <div className="text-2xl font-bold text-red-500">{apiKeyStats.expired || 0}</div>
                  </div>
                  <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                    <div className="text-zinc-500 text-sm uppercase mb-1">Recent (7d)</div>
                    <div className="text-2xl font-bold text-blue-500">{apiKeyStats.recent || 0}</div>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="text-center py-8 text-zinc-500">Loading...</div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">No API keys found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">Key Name</th>
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">Owner</th>
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">Usage</th>
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">Status</th>
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">Created</th>
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">API Key</th>
                        <th className="text-left p-3 text-xs uppercase text-zinc-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {apiKeys.map((key: any) => (
                        <tr key={key.id} className="border-b border-zinc-800">
                          <td className="p-3 font-medium">{key.key_name}</td>
                          <td className="p-3 text-sm text-zinc-400">{key.username || key.email || 'N/A'}</td>
                          <td className="p-3 text-zinc-400">{key.usage_count || 0}</td>
                          <td className="p-3">
                            <span className={`px-2 py-1 rounded text-xs ${
                              key.is_active ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'
                            }`}>
                              {key.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="p-3 text-xs text-zinc-500">
                            {new Date(key.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <code className="text-xs text-zinc-500 font-mono">
                              {key.api_key.substring(0, 20)}...
                            </code>
                          </td>
                          <td className="p-3">
                            <div className="flex gap-2">
                              <button
                                onClick={() => setEditingApiKey({ ...key })}
                                className="text-xs text-amber-500 hover:text-amber-400"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDeleteApiKey(key.id)}
                                className="text-xs text-red-400 hover:text-red-300"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Edit User</h2>
              <button
                onClick={() => setEditingUser(null)}
                className="text-zinc-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 uppercase mb-1">Username</label>
                <input
                  type="text"
                  value={editingUser.username}
                  onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase mb-1">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase mb-1">Password (leave empty to keep current)</label>
                <input
                  type="password"
                  value={editingUser.password}
                  onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                  placeholder="New password (min 6 chars)"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase mb-1">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="moderator">Moderator</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingUser.is_active}
                    onChange={(e) => setEditingUser({ ...editingUser, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-xs text-zinc-500 uppercase">Active</span>
                </label>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleEditUser(editingUser)}
                  className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Project Modal */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Project Details</h2>
              <button
                onClick={() => setEditingProject(null)}
                className="text-zinc-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 uppercase mb-1">Title</label>
                <div className="bg-zinc-800 p-3 rounded text-sm">{editingProject.title || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase mb-1">Genre</label>
                <div className="bg-zinc-800 p-3 rounded text-sm">{editingProject.genre || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase mb-1">Owner</label>
                <div className="bg-zinc-800 p-3 rounded text-sm">{editingProject.username || editingProject.email || 'N/A'}</div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase mb-1">Scenes</label>
                <div className="bg-zinc-800 p-3 rounded text-sm">{editingProject.scene_count || 0}</div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase mb-1">Created</label>
                <div className="bg-zinc-800 p-3 rounded text-sm">
                  {new Date(editingProject.created_at).toLocaleString()}
                </div>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase mb-1">Project ID</label>
                <div className="bg-zinc-800 p-3 rounded text-sm font-mono text-xs">{editingProject.id}</div>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="w-full px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit API Key Modal */}
      {editingApiKey && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Edit API Key</h2>
              <button
                onClick={() => setEditingApiKey(null)}
                className="text-zinc-400 hover:text-white"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-zinc-500 uppercase mb-1">Key Name</label>
                <input
                  type="text"
                  value={editingApiKey.key_name}
                  onChange={(e) => setEditingApiKey({ ...editingApiKey, key_name: e.target.value })}
                  className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editingApiKey.is_active}
                    onChange={(e) => setEditingApiKey({ ...editingApiKey, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-xs text-zinc-500 uppercase">Active</span>
                </label>
              </div>
              <div>
                <label className="block text-xs text-zinc-500 uppercase mb-1">API Key</label>
                <div className="bg-zinc-800 p-3 rounded text-xs font-mono break-all">{editingApiKey.api_key}</div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingApiKey(null)}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateApiKey(editingApiKey)}
                  className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

