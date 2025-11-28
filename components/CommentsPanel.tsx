import React, { useState, useEffect } from 'react';
import { commentsService } from '../apiServices';

interface Comment {
  id: number;
  content: string;
  is_pinned: boolean;
  created_at: string;
  username?: string;
  email?: string;
}

interface CommentsPanelProps {
  projectId: string;
  onClose: () => void;
}

const CommentsPanel: React.FC<CommentsPanelProps> = ({ projectId, onClose }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    loadComments();
  }, [projectId]);

  const loadComments = async () => {
    try {
      const response = await commentsService.getByProject(projectId);
      const data = (response as any)?.comments || [];
      setComments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    setLoading(true);
    try {
      await commentsService.create(projectId, {
        content: newComment,
        is_pinned: isPinned
      });
      setNewComment('');
      setIsPinned(false);
      await loadComments();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await commentsService.delete(id);
      await loadComments();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleTogglePin = async (id: number, currentPinned: boolean) => {
    try {
      await commentsService.update(id, { is_pinned: !currentPinned });
      await loadComments();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Project Comments</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {comments.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">No comments yet</div>
          ) : (
            comments.map((comment) => (
              <div
                key={comment.id}
                className={`p-3 rounded-lg border ${
                  comment.is_pinned
                    ? 'bg-amber-900/10 border-amber-500/30'
                    : 'bg-zinc-800 border-zinc-700'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {comment.is_pinned && (
                      <span className="text-amber-500 text-xs">📌 Pinned</span>
                    )}
                    <span className="text-xs text-zinc-400">
                      {comment.username || comment.email || 'Anonymous'}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {new Date(comment.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleTogglePin(comment.id, comment.is_pinned)}
                      className="text-xs text-zinc-400 hover:text-amber-500"
                      title={comment.is_pinned ? 'Unpin' : 'Pin'}
                    >
                      {comment.is_pinned ? '📌' : '📍'}
                    </button>
                    <button
                      onClick={() => handleDelete(comment.id)}
                      className="text-xs text-zinc-400 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{comment.content}</p>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex gap-2 mb-2">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="rounded"
            />
            <label className="text-xs text-zinc-400">Pin this comment</label>
          </div>
          <div className="flex gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 bg-black border border-zinc-700 rounded px-3 py-2 text-sm resize-none"
              rows={2}
            />
            <button
              onClick={handleAddComment}
              disabled={loading || !newComment.trim()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm disabled:opacity-50"
            >
              {loading ? '...' : 'Add'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentsPanel;

