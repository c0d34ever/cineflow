import React, { useState, useEffect, useRef } from 'react';
import { Scene, StoryContext } from '../types';

interface ExportJob {
  id: string;
  projectId: string;
  projectTitle: string;
  format: 'json' | 'markdown' | 'csv' | 'pdf' | 'fountain' | 'video' | 'gif';
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error?: string;
  fileName?: string;
  createdAt: Date;
  sceneIds?: string[]; // For selective exports
}

interface ExportQueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExport: (job: Omit<ExportJob, 'id' | 'status' | 'progress' | 'createdAt'>) => void;
  jobs: ExportJob[];
  onCancelJob: (jobId: string) => void;
  onRetryJob: (jobId: string) => void;
  onClearCompleted: () => void;
}

const ExportQueuePanel: React.FC<ExportQueuePanelProps> = ({
  isOpen,
  onClose,
  jobs,
  onCancelJob,
  onRetryJob,
  onClearCompleted
}) => {
  const [filter, setFilter] = useState<'all' | 'active' | 'completed' | 'failed'>('all');

  if (!isOpen) return null;

  const filteredJobs = jobs.filter(job => {
    if (filter === 'active') return job.status === 'queued' || job.status === 'processing';
    if (filter === 'completed') return job.status === 'completed';
    if (filter === 'failed') return job.status === 'failed';
    return true;
  });

  const activeJobs = jobs.filter(j => j.status === 'queued' || j.status === 'processing').length;
  const completedJobs = jobs.filter(j => j.status === 'completed').length;
  const failedJobs = jobs.filter(j => j.status === 'failed').length;

  const getStatusColor = (status: ExportJob['status']) => {
    switch (status) {
      case 'queued': return 'text-zinc-400';
      case 'processing': return 'text-amber-500';
      case 'completed': return 'text-green-500';
      case 'failed': return 'text-red-500';
      case 'cancelled': return 'text-zinc-600';
      default: return 'text-zinc-400';
    }
  };

  const getStatusIcon = (status: ExportJob['status']) => {
    switch (status) {
      case 'queued':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'processing':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 animate-spin" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        );
      case 'completed':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'failed':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'cancelled':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Export Queue</h2>
            <p className="text-sm text-zinc-400 mt-1">
              {activeJobs} active, {completedJobs} completed, {failedJobs} failed
            </p>
          </div>
          <div className="flex items-center gap-2">
            {completedJobs > 0 && (
              <button
                onClick={onClearCompleted}
                className="px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-300 transition-colors"
              >
                Clear Completed
              </button>
            )}
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

        {/* Filters */}
        <div className="p-4 border-b border-zinc-800">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                filter === 'all' ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              All ({jobs.length})
            </button>
            <button
              onClick={() => setFilter('active')}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                filter === 'active' ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              Active ({activeJobs})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                filter === 'completed' ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              Completed ({completedJobs})
            </button>
            <button
              onClick={() => setFilter('failed')}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                filter === 'failed' ? 'bg-amber-600 text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              Failed ({failedJobs})
            </button>
          </div>
        </div>

        {/* Jobs List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>No exports {filter !== 'all' ? `in ${filter} status` : 'yet'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-zinc-600 transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(job.status)}
                        <span className={`font-semibold ${getStatusColor(job.status)}`}>
                          {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                        </span>
                        <span className="text-xs text-zinc-500 uppercase px-2 py-0.5 bg-zinc-900 rounded">
                          {job.format}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-300 font-medium">{job.projectTitle}</p>
                      {job.sceneIds && job.sceneIds.length > 0 && (
                        <p className="text-xs text-zinc-500 mt-1">
                          {job.sceneIds.length} scene{job.sceneIds.length > 1 ? 's' : ''} selected
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {job.status === 'queued' && (
                        <button
                          onClick={() => onCancelJob(job.id)}
                          className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          title="Cancel"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                      {job.status === 'failed' && (
                        <button
                          onClick={() => onRetryJob(job.id)}
                          className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                          title="Retry"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {(job.status === 'processing' || job.status === 'queued') && (
                    <div className="mb-3">
                      <div className="w-full bg-zinc-900 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            job.status === 'processing' ? 'bg-amber-500' : 'bg-zinc-700'
                          }`}
                          style={{ width: `${job.progress}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">{job.progress}%</p>
                    </div>
                  )}

                  {/* Error Message */}
                  {job.status === 'failed' && job.error && (
                    <div className="mb-3 p-2 bg-red-900/20 border border-red-800 rounded text-xs text-red-400">
                      {job.error}
                    </div>
                  )}

                  {/* File Info */}
                  {job.status === 'completed' && job.fileName && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                      </svg>
                      <span>{job.fileName}</span>
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="text-xs text-zinc-600 mt-2">
                    {new Date(job.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExportQueuePanel;
export type { ExportJob };

