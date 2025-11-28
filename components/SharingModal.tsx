import React, { useState, useEffect } from 'react';
import { sharingService } from '../apiServices';
import { ProjectData } from '../db';

interface Share {
  id: number;
  share_token: string;
  access_level: 'view' | 'edit' | 'comment';
  expires_at?: string;
  created_at: string;
  shared_with_username?: string;
  shared_with_email?: string;
}

interface SharingModalProps {
  project: ProjectData;
  onClose: () => void;
}

const SharingModal: React.FC<SharingModalProps> = ({ project, onClose }) => {
  const [shares, setShares] = useState<Share[]>([]);
  const [loading, setLoading] = useState(false);
  const [shareAccessLevel, setShareAccessLevel] = useState<'view' | 'edit' | 'comment'>('view');
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    loadShares();
  }, [project.context.id]);

  const loadShares = async () => {
    try {
      const response = await sharingService.getByProject(project.context.id);
      const data = (response as any)?.shares || [];
      setShares(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load shares:', error);
    }
  };

  const handleCreateShare = async () => {
    setLoading(true);
    try {
      const result = await sharingService.create({
        project_id: project.context.id,
        access_level: shareAccessLevel
      });
      setShareUrl((result as any).share_url || '');
      await loadShares();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeShare = async (shareId: number) => {
    if (!confirm('Revoke this share link?')) return;
    try {
      await sharingService.revoke(shareId);
      await loadShares();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Share Project: {project.context.title}</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Create New Share */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4">
            <h3 className="font-bold mb-3">Create Share Link</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 uppercase mb-1">Access Level</label>
                <select
                  value={shareAccessLevel}
                  onChange={(e) => setShareAccessLevel(e.target.value as any)}
                  className="w-full bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                >
                  <option value="view">View Only</option>
                  <option value="edit">Can Edit</option>
                  <option value="comment">Can Comment</option>
                </select>
              </div>
              <button
                onClick={handleCreateShare}
                disabled={loading}
                className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Generate Share Link'}
              </button>
              {shareUrl && (
                <div className="mt-3 p-3 bg-zinc-900 border border-zinc-700 rounded">
                  <div className="text-xs text-zinc-400 mb-1">Share URL:</div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={shareUrl}
                      readOnly
                      className="flex-1 bg-black border border-zinc-700 rounded px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => copyToClipboard(shareUrl)}
                      className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Existing Shares */}
          {shares.length > 0 && (
            <div>
              <h3 className="font-bold mb-3">Active Shares</h3>
              <div className="space-y-2">
                {shares.map((share) => (
                  <div
                    key={share.id}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-white">
                          {share.shared_with_username || share.shared_with_email || 'Public Link'}
                        </span>
                        <span className="text-xs bg-amber-900/30 text-amber-500 px-2 py-0.5 rounded uppercase">
                          {share.access_level}
                        </span>
                      </div>
                      <div className="text-xs text-zinc-500">
                        Created: {new Date(share.created_at).toLocaleDateString()}
                        {share.expires_at && ` • Expires: ${new Date(share.expires_at).toLocaleDateString()}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRevokeShare(share.id)}
                      className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded text-xs"
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SharingModal;

