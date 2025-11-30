import React, { useState, useEffect } from 'react';

interface ExportHistoryItem {
  id: number;
  project_id: string;
  project_title?: string;
  export_type: string;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
}

interface ExportHistoryPanelProps {
  onClose: () => void;
}

const ExportHistoryPanel: React.FC<ExportHistoryPanelProps> = ({ onClose }) => {
  const [exports, setExports] = useState<ExportHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pdf' | 'csv' | 'markdown' | 'comic'>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'week' | 'month'>('all');

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    loadExportHistory();
  }, [filter, dateFilter]);

  const loadExportHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const response = await fetch(`${API_BASE_URL}/exports`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) throw new Error('Failed to load export history');

      const result = await response.json();
      let filteredExports = result.exports || [];

      // Apply filters
      if (filter !== 'all') {
        filteredExports = filteredExports.filter((exp: ExportHistoryItem) => 
          exp.export_type.toLowerCase() === filter.toLowerCase()
        );
      }

      if (dateFilter !== 'all') {
        const now = new Date();
        const filterDate = new Date();
        
        switch (dateFilter) {
          case 'today':
            filterDate.setHours(0, 0, 0, 0);
            break;
          case 'week':
            filterDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            filterDate.setMonth(now.getMonth() - 1);
            break;
        }

        filteredExports = filteredExports.filter((exp: ExportHistoryItem) => {
          const expDate = new Date(exp.created_at);
          return expDate >= filterDate;
        });
      }

      setExports(filteredExports);
    } catch (error: any) {
      console.error('Failed to load export history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getExportTypeIcon = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return '📄';
      case 'csv':
        return '📊';
      case 'markdown':
        return '📝';
      case 'comic':
        return '🎨';
      default:
        return '📦';
    }
  };

  const getExportTypeColor = (type: string): string => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return 'text-red-400 bg-red-900/20 border-red-800/50';
      case 'csv':
        return 'text-green-400 bg-green-900/20 border-green-800/50';
      case 'markdown':
        return 'text-blue-400 bg-blue-900/20 border-blue-800/50';
      case 'comic':
        return 'text-purple-400 bg-purple-900/20 border-purple-800/50';
      default:
        return 'text-zinc-400 bg-zinc-900/20 border-zinc-800/50';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-white">Export History</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-zinc-800 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-zinc-400">Type:</span>
            {(['all', 'pdf', 'csv', 'markdown', 'comic'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  filter === type
                    ? 'bg-amber-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-zinc-400">Date:</span>
            {(['all', 'today', 'week', 'month'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setDateFilter(period)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  dateFilter === period
                    ? 'bg-amber-600 text-white'
                    : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mb-2"></div>
              <div className="text-zinc-500">Loading export history...</div>
            </div>
          ) : exports.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-zinc-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-lg">No exports found</p>
              <p className="text-sm mt-2">Your export history will appear here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {exports.map((exp) => (
                <div
                  key={exp.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`text-2xl ${getExportTypeColor(exp.export_type).split(' ')[0]}`}>
                        {getExportTypeIcon(exp.export_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getExportTypeColor(exp.export_type)}`}>
                            {exp.export_type.toUpperCase()}
                          </span>
                          {exp.project_title && (
                            <span className="text-sm text-zinc-400 truncate">
                              {exp.project_title}
                            </span>
                          )}
                        </div>
                        {exp.file_name && (
                          <p className="text-sm text-zinc-300 font-mono truncate" title={exp.file_name}>
                            {exp.file_name}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-zinc-500">
                          <span>{formatDate(exp.created_at)}</span>
                          {exp.file_size && (
                            <span>• {formatFileSize(exp.file_size)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-zinc-800 flex items-center justify-between">
          <div className="text-sm text-zinc-500">
            {exports.length} export{exports.length !== 1 ? 's' : ''} shown
          </div>
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

export default ExportHistoryPanel;

