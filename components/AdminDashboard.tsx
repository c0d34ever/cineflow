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
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error loading stats:', error);
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
      const data = await response.json();
      setUsers(data.users || []);
    } catch (error) {
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
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      const data = await adminApiKeysService.getAll({ limit: 100 });
      setApiKeys(data.apiKeys || []);
    } catch (error) {
      console.error('Error loading API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeyStats = async () => {
    try {
      const data = await adminApiKeysService.getStats();
      setApiKeyStats(data);
    } catch (error) {
      console.error('Error loading API key stats:', error);
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
                            <button className="text-xs text-amber-500 hover:text-amber-400">Edit</button>
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
                            <button
                              onClick={() => handleDeleteProject(p.id)}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Delete
                            </button>
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
              </div>
              
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
    </div>
  );
};

export default AdminDashboard;

