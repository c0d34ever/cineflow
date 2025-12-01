import React, { useState, useEffect, useMemo } from 'react';
import { Scene, StoryContext } from '../types';

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

interface AdvancedAnalyticsDashboardProps {
  projectId: string;
  scenes: Scene[];
  storyContext: StoryContext;
  onClose: () => void;
}

interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

// Simple SVG Bar Chart Component
const BarChart: React.FC<{ data: ChartDataPoint[]; color: string; maxValue: number }> = ({ data, color, maxValue }) => {
  const maxBarHeight = 120;
  const barWidth = Math.max(20, 100 / data.length);

  return (
    <svg width="100%" height="140" viewBox="0 0 100 140" className="overflow-visible">
      {data.map((point, index) => {
        const height = maxValue > 0 ? (point.value / maxValue) * maxBarHeight : 0;
        const x = (index * (100 / data.length)) + (barWidth / 2);
        return (
          <g key={index}>
            <rect
              x={x - barWidth / 2}
              y={maxBarHeight - height}
              width={barWidth * 0.8}
              height={height}
              fill={color}
              opacity="0.8"
              className="hover:opacity-100 transition-opacity"
            />
            <text
              x={x}
              y={maxBarHeight + 10}
              fontSize="8"
              fill="currentColor"
              textAnchor="middle"
              className="text-zinc-400"
            >
              {point.label || point.value}
            </text>
            <text
              x={x}
              y={maxBarHeight - height - 5}
              fontSize="7"
              fill="currentColor"
              textAnchor="middle"
              className="text-zinc-300"
            >
              {point.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
};

// Simple SVG Line Chart Component
const LineChart: React.FC<{ data: ChartDataPoint[]; color: string; maxValue: number }> = ({ data, color, maxValue }) => {
  const maxHeight = 120;
  const width = 100;
  const height = maxHeight;

  const points = data.map((point, index) => {
    const x = (index / (data.length - 1 || 1)) * width;
    const y = maxValue > 0 ? height - (point.value / maxValue) * maxHeight : height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width="100%" height="140" viewBox="0 0 100 140" className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        className="drop-shadow-lg"
      />
      {data.map((point, index) => {
        const x = (index / (data.length - 1 || 1)) * width;
        const y = maxValue > 0 ? height - (point.value / maxValue) * maxHeight : height;
        return (
          <circle
            key={index}
            cx={x}
            cy={y}
            r="2"
            fill={color}
            className="hover:r-3 transition-all"
          />
        );
      })}
    </svg>
  );
};

// Pie Chart Component
const PieChart: React.FC<{ data: Array<{ label: string; value: number; color: string }> }> = ({ data }) => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
        No data available
      </div>
    );
  }

  let currentAngle = -90;
  const radius = 40;
  const centerX = 50;
  const centerY = 50;

  return (
    <svg width="100%" height="120" viewBox="0 0 100 100" className="overflow-visible">
      {data.map((item, index) => {
        const percentage = (item.value / total) * 100;
        const angle = (percentage / 100) * 360;
        const startAngle = currentAngle;
        const endAngle = currentAngle + angle;
        currentAngle = endAngle;

        const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
        const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
        const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
        const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);

        const largeArc = angle > 180 ? 1 : 0;

        const pathData = [
          `M ${centerX} ${centerY}`,
          `L ${x1} ${y1}`,
          `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
          'Z'
        ].join(' ');

        return (
          <path
            key={index}
            d={pathData}
            fill={item.color}
            className="hover:opacity-80 transition-opacity"
          />
        );
      })}
      <text x={centerX} y={centerY} fontSize="12" fill="currentColor" textAnchor="middle" className="text-zinc-300 font-bold">
        {total}
      </text>
    </svg>
  );
};

const AdvancedAnalyticsDashboard: React.FC<AdvancedAnalyticsDashboardProps> = ({
  projectId,
  scenes,
  storyContext,
  onClose
}) => {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'scenes' | 'exports' | 'activity'>('overview');

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

  // Calculate scene creation timeline
  const sceneTimeline = useMemo(() => {
    const timeline: ChartDataPoint[] = [];
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
    const now = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Count scenes created on this day (simplified - using sequence number as proxy)
      const scenesOnDay = scenes.filter((s, idx) => {
        // Approximate: assume scenes are created in order
        const sceneDay = Math.floor((idx / scenes.length) * days);
        return sceneDay === days - 1 - i;
      }).length;
      
      timeline.push({
        date: dateStr,
        value: scenesOnDay,
        label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      });
    }
    
    return timeline;
  }, [scenes, timeRange]);

  // Scene type distribution
  const sceneTypeDistribution = useMemo(() => {
    const types: Record<string, number> = {};
    scenes.forEach(scene => {
      let type = 'Narrative';
      if (scene.directorSettings?.dialogue) type = 'Dialogue';
      else if (scene.directorSettings?.stuntInstructions) type = 'Action';
      else if (scene.directorSettings?.transition && scene.directorSettings.transition !== 'Cut') type = 'Transition';
      
      types[type] = (types[type] || 0) + 1;
    });
    
    return [
      { label: 'Dialogue', value: types['Dialogue'] || 0, color: '#3b82f6' },
      { label: 'Action', value: types['Action'] || 0, color: '#ef4444' },
      { label: 'Transition', value: types['Transition'] || 0, color: '#a855f7' },
      { label: 'Narrative', value: types['Narrative'] || 0, color: '#10b981' },
    ].filter(item => item.value > 0);
  }, [scenes]);

  // Character usage
  const characterUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    
    // Handle characters as string (from storyContext) or array (from API)
    let characterNames: string[] = [];
    if (typeof storyContext.characters === 'string') {
      // Parse string - could be JSON, comma-separated, or newline-separated
      try {
        const parsed = JSON.parse(storyContext.characters);
        if (Array.isArray(parsed)) {
          characterNames = parsed.map((c: any) => typeof c === 'string' ? c : c.name || c);
        } else {
          characterNames = storyContext.characters.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
        }
      } catch {
        // Not JSON, try splitting by comma or newline
        characterNames = storyContext.characters.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
      }
    } else if (Array.isArray(storyContext.characters)) {
      characterNames = storyContext.characters.map((c: any) => typeof c === 'string' ? c : c.name || c);
    }
    
    characterNames.forEach(charName => {
      const count = scenes.filter(s => {
        const text = `${s.rawIdea} ${s.enhancedPrompt} ${s.contextSummary} ${s.directorSettings?.dialogue || ''}`.toLowerCase();
        return text.includes(charName.toLowerCase());
      }).length;
      if (count > 0) {
        usage[charName] = count;
      }
    });
    
    return Object.entries(usage)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ label: name, value: count }));
  }, [scenes, storyContext.characters]);

  // Location usage - locations are stored separately, not in storyContext
  const locationUsage = useMemo(() => {
    const usage: Record<string, number> = {};
    
    // Extract location mentions from scenes (locations are managed separately via API)
    // For now, we'll extract potential location names from scene content
    const locationPatterns = new Set<string>();
    scenes.forEach(s => {
      const text = `${s.rawIdea} ${s.enhancedPrompt} ${s.contextSummary}`.toLowerCase();
      // Simple heuristic: look for capitalized words that might be locations
      // This is a fallback - ideally locations should be loaded from the API
    });
    
    // Return empty for now - locations should be loaded from locationsService
    return [];
  }, [scenes]);

  // Export trends (simplified - would need export history data)
  const exportTrends = useMemo(() => {
    // Placeholder - would fetch from export_history table
    return [
      { date: '2024-01-01', value: 2, label: 'Jan 1' },
      { date: '2024-01-02', value: 5, label: 'Jan 2' },
      { date: '2024-01-03', value: 3, label: 'Jan 3' },
      { date: '2024-01-04', value: 4, label: 'Jan 4' },
      { date: '2024-01-05', value: 6, label: 'Jan 5' },
    ];
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto"></div>
        </div>
      </div>
    );
  }

  const maxSceneValue = Math.max(...sceneTimeline.map(d => d.value), 1);
  const maxExportValue = Math.max(...exportTrends.map(d => d.value), 1);
  const maxCharacterValue = Math.max(...characterUsage.map(d => d.value), 1);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-7xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Advanced Analytics Dashboard</h2>
            <p className="text-sm text-zinc-400 mt-1">{storyContext.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="all">All time</option>
            </select>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex gap-2">
            {(['overview', 'scenes', 'exports', 'activity'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 text-sm rounded transition-colors ${
                  activeTab === tab
                    ? 'bg-amber-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && analytics && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-amber-500">{analytics.stats.scenes}</div>
                  <div className="text-xs text-zinc-400 uppercase mt-1">Total Scenes</div>
                  <div className="text-xs text-zinc-500 mt-1">
                    {Math.floor(analytics.stats.total_duration / 60)}m {analytics.stats.total_duration % 60}s duration
                  </div>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-500">{analytics.stats.exports}</div>
                  <div className="text-xs text-zinc-400 uppercase mt-1">Exports</div>
                  <div className="text-xs text-zinc-500 mt-1">All formats</div>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-500">{analytics.stats.characters}</div>
                  <div className="text-xs text-zinc-400 uppercase mt-1">Characters</div>
                  <div className="text-xs text-zinc-500 mt-1">In project</div>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-purple-500">{analytics.stats.locations}</div>
                  <div className="text-xs text-zinc-400 uppercase mt-1">Locations</div>
                  <div className="text-xs text-zinc-500 mt-1">In project</div>
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Scene Creation Timeline */}
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-4">Scene Creation Timeline</h3>
                  <LineChart data={sceneTimeline} color="#f59e0b" maxValue={maxSceneValue} />
                </div>

                {/* Scene Type Distribution */}
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <h3 className="font-semibold text-white mb-4">Scene Type Distribution</h3>
                  <div className="flex items-center gap-4">
                    <PieChart data={sceneTypeDistribution} />
                    <div className="flex-1 space-y-2">
                      {sceneTypeDistribution.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded" style={{ backgroundColor: item.color }}></div>
                          <span className="text-sm text-zinc-300">{item.label}</span>
                          <span className="text-sm font-bold text-zinc-400 ml-auto">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scenes' && (
            <div className="space-y-6">
              {/* Character Usage */}
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-4">Top Characters by Scene Count</h3>
                {characterUsage.length > 0 ? (
                  <BarChart data={characterUsage} color="#3b82f6" maxValue={maxCharacterValue} />
                ) : (
                  <div className="text-center py-8 text-zinc-500">No character data available</div>
                )}
              </div>

              {/* Location Usage */}
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-4">Top Locations by Scene Count</h3>
                {locationUsage.length > 0 ? (
                  <BarChart data={locationUsage} color="#10b981" maxValue={Math.max(...locationUsage.map(d => d.value), 1)} />
                ) : (
                  <div className="text-center py-8 text-zinc-500">No location data available</div>
                )}
              </div>

              {/* Scene Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="text-lg font-bold text-amber-500">
                    {scenes.filter(s => s.directorSettings?.dialogue).length}
                  </div>
                  <div className="text-xs text-zinc-400 uppercase mt-1">Scenes with Dialogue</div>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="text-lg font-bold text-red-500">
                    {scenes.filter(s => s.directorSettings?.stuntInstructions).length}
                  </div>
                  <div className="text-xs text-zinc-400 uppercase mt-1">Action Scenes</div>
                </div>
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="text-lg font-bold text-purple-500">
                    {scenes.filter(s => s.directorSettings?.transition && s.directorSettings.transition !== 'Cut').length}
                  </div>
                  <div className="text-xs text-zinc-400 uppercase mt-1">Special Transitions</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'exports' && analytics && (
            <div className="space-y-6">
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-4">Export Trends</h3>
                <LineChart data={exportTrends} color="#06b6d4" maxValue={maxExportValue} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                  <div className="text-2xl font-bold text-cyan-500">{analytics.stats.exports}</div>
                  <div className="text-xs text-zinc-400 uppercase mt-1">Total Exports</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'activity' && analytics?.analytics && (
            <div className="space-y-4">
              <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
                <h3 className="font-semibold text-white mb-4">Project Activity</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">Total Views</span>
                    <span className="text-lg font-bold text-blue-500">{analytics.analytics.view_count || 0}</span>
                  </div>
                  {analytics.analytics.last_viewed && (
                    <div className="text-xs text-zinc-500">
                      Last viewed: {new Date(analytics.analytics.last_viewed).toLocaleString()}
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-4">
                    <span className="text-sm text-zinc-400">Total Edits</span>
                    <span className="text-lg font-bold text-green-500">{analytics.analytics.edit_count || 0}</span>
                  </div>
                  {analytics.analytics.last_edited && (
                    <div className="text-xs text-zinc-500">
                      Last edited: {new Date(analytics.analytics.last_edited).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalyticsDashboard;

