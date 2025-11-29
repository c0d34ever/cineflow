import React, { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

interface AnalyticsData {
  analytics: any;
  stats: {
    scenes: number;
    exports: number;
    comments: number;
    characters: number;
    locations: number;
    total_duration: number;
  };
}

interface AnalyticsPanelProps {
  projectId: string;
  onClose: () => void;
}

const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ projectId, onClose }) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [projectId]);

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/analytics/project/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Project Analytics</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {analytics ? (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-amber-500">{analytics.stats.scenes}</div>
                  <div className="text-xs text-zinc-400 uppercase">Scenes</div>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-500">
                    {Math.floor(analytics.stats.total_duration / 60)}m {analytics.stats.total_duration % 60}s
                  </div>
                  <div className="text-xs text-zinc-400 uppercase">Total Duration</div>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-500">{analytics.stats.characters}</div>
                  <div className="text-xs text-zinc-400 uppercase">Characters</div>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-500">{analytics.stats.locations}</div>
                  <div className="text-xs text-zinc-400 uppercase">Locations</div>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-yellow-500">{analytics.stats.comments}</div>
                  <div className="text-xs text-zinc-400 uppercase">Comments</div>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-cyan-500">{analytics.stats.exports}</div>
                  <div className="text-xs text-zinc-400 uppercase">Exports</div>
                </div>
              </div>

              {/* Activity */}
              {analytics.analytics && (
                <div>
                  <h3 className="font-bold mb-3">Activity</h3>
                  <div className="space-y-2">
                    {analytics.analytics.view_count > 0 && (
                      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-zinc-400">Views</span>
                          <span className="text-sm font-bold">{analytics.analytics.view_count}</span>
                        </div>
                        {analytics.analytics.last_viewed && (
                          <div className="text-xs text-zinc-500 mt-1">
                            Last viewed: {new Date(analytics.analytics.last_viewed).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                    {analytics.analytics.edit_count > 0 && (
                      <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-zinc-400">Edits</span>
                          <span className="text-sm font-bold">{analytics.analytics.edit_count}</span>
                        </div>
                        {analytics.analytics.last_edited && (
                          <div className="text-xs text-zinc-500 mt-1">
                            Last edited: {new Date(analytics.analytics.last_edited).toLocaleString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-zinc-500">No analytics data available</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPanel;

