import React, { useState, useEffect } from 'react';
import { authService } from '../apiServices';

interface AdminDashboardProps {
  user: any;
  onLogout: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'projects' | 'api-keys' | 'stats'>('overview');
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (activeTab === 'stats' || activeTab === 'overview') {
      loadStats();
    } else if (activeTab === 'users') {
      loadUsers();
    }
  }, [activeTab]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch('http://localhost:5001/api/stats', {
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
      const response = await fetch('http://localhost:5001/api/users', {
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

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif text-amber-500 mb-1">Admin Dashboard</h1>
            <p className="text-zinc-500 text-sm">Welcome, {user.username} (Admin)</p>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors"
          >
            Logout
          </button>
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
              <h2 className="text-xl font-bold mb-4">User Management</h2>
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

          {(activeTab === 'projects' || activeTab === 'api-keys') && (
            <div className="text-center py-8 text-zinc-500">
              {activeTab} management coming soon...
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

