import React, { useState, useEffect, useRef, useCallback } from 'react';
import { commentsService } from '../apiServices';
import CopyButton from './CopyButton';

interface User {
  id: number;
  username: string;
  email: string;
}

interface Mention {
  mentioned_user_id: number;
  username: string;
  email: string;
}

interface Comment {
  id: number;
  content: string;
  is_pinned: boolean;
  created_at: string;
  username?: string;
  email?: string;
  mentions?: Mention[];
  reply_count?: number;
  parent_comment_id?: number;
  scene_id?: string;
}

interface CommentsPanelProps {
  projectId: string;
  sceneId?: string;
  onClose: () => void;
}

const CommentsPanel: React.FC<CommentsPanelProps> = ({ projectId, sceneId, onClose }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState<User[]>([]);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<number>>(new Set());
  const [replies, setReplies] = useState<Record<number, Comment[]>>({});
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadComments();
  }, [projectId, sceneId]);

  const loadComments = async () => {
    try {
      const response = await commentsService.getByProject(projectId, sceneId);
      const data = (response as any)?.comments || [];
      setComments(Array.isArray(data) ? data.filter((c: Comment) => !c.parent_comment_id) : []);
    } catch (error) {
      console.error('Failed to load comments:', error);
    }
  };

  const loadReplies = async (commentId: number) => {
    try {
      const response = await commentsService.getReplies(commentId);
      const repliesData = (response as any)?.replies || [];
      setReplies(prev => ({ ...prev, [commentId]: repliesData }));
    } catch (error) {
      console.error('Failed to load replies:', error);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 1) {
      setMentionSuggestions([]);
      return;
    }
    try {
      const response = await commentsService.searchUsers(query);
      setMentionSuggestions((response as any)?.users || []);
      setSelectedMentionIndex(0);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const handleMentionInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setNewComment(value);
    
    const cursorPos = e.target.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      if (!textAfterAt.includes(' ') && !textAfterAt.includes('\n')) {
        const query = textAfterAt.toLowerCase();
        setMentionQuery(query);
        searchUsers(query);
        
        // Calculate position for mention suggestions
        const rect = e.target.getBoundingClientRect();
        setMentionPosition({
          top: rect.top + rect.height,
          left: rect.left
        });
        setShowMentionSuggestions(true);
        return;
      }
    }
    setShowMentionSuggestions(false);
  }, []);

  const searchUsers = async (query: string) => {
    if (query.length < 1) {
      setMentionSuggestions([]);
      return;
    }
    try {
      const response = await commentsService.searchUsers(query);
      setMentionSuggestions((response as any)?.users || []);
      setSelectedMentionIndex(0);
    } catch (error) {
      console.error('Failed to search users:', error);
    }
  };

  const insertMention = (user: User) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const value = textarea.value;
    const cursorPos = textarea.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      const newValue = 
        value.substring(0, lastAtIndex + 1) + 
        user.username + 
        ' ' + 
        value.substring(cursorPos);
      
      setNewComment(newValue);
      setShowMentionSuggestions(false);
      
      // Restore cursor position
      setTimeout(() => {
        const newCursorPos = lastAtIndex + 1 + user.username.length + 1;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
        textarea.focus();
      }, 0);
    }
  };

  const extractMentions = (content: string): number[] => {
    const mentionRegex = /@(\w+)/g;
    const matches = content.match(mentionRegex);
    if (!matches) return [];
    
    const usernames = matches.map(m => m.substring(1));
    // We'll extract user IDs on the backend, but we can prepare the list here
    return []; // Backend will handle the actual user ID lookup
  };

  const renderContentWithMentions = (content: string, mentions: Mention[] = []) => {
    if (!mentions || mentions.length === 0) {
      return <span>{content}</span>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    const mentionMap = new Map(mentions.map(m => [`@${m.username}`, m]));

    // Find all @mentions in content
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
      const beforeMatch = content.substring(lastIndex, match.index);
      if (beforeMatch) {
        parts.push(<span key={`text-${lastIndex}`}>{beforeMatch}</span>);
      }

      const mentionText = match[0];
      const mention = mentionMap.get(mentionText);
      
      if (mention) {
        parts.push(
          <span
            key={`mention-${match.index}`}
            className="text-amber-400 font-semibold"
            title={`@${mention.username}`}
          >
            {mentionText}
          </span>
        );
      } else {
        parts.push(<span key={`mention-${match.index}`}>{mentionText}</span>);
      }

      lastIndex = match.index + match[0].length;
    }

    const remaining = content.substring(lastIndex);
    if (remaining) {
      parts.push(<span key={`text-${lastIndex}`}>{remaining}</span>);
    }

    return <>{parts}</>;
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    setLoading(true);
    try {
      const mentionedIds = extractMentions(newComment);
      await commentsService.create(projectId, {
        content: newComment,
        is_pinned: isPinned,
        scene_id: sceneId,
        parent_comment_id: replyingTo || undefined,
        mentioned_user_ids: mentionedIds.length > 0 ? mentionedIds : undefined
      });
      setNewComment('');
      setIsPinned(false);
      setReplyingTo(null);
      await loadComments();
      if (replyingTo) {
        await loadReplies(replyingTo);
      }
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

  const toggleReplies = async (commentId: number) => {
    if (expandedReplies.has(commentId)) {
      setExpandedReplies(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    } else {
      setExpandedReplies(prev => new Set(prev).add(commentId));
      if (!replies[commentId]) {
        await loadReplies(commentId);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!showMentionSuggestions) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedMentionIndex(prev => 
          Math.min(prev + 1, mentionSuggestions.length - 1)
        );
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedMentionIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && mentionSuggestions.length > 0) {
        e.preventDefault();
        insertMention(mentionSuggestions[selectedMentionIndex]);
      } else if (e.key === 'Escape') {
        setShowMentionSuggestions(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMentionSuggestions, mentionSuggestions, selectedMentionIndex]);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">
            {sceneId ? 'Scene Comments' : 'Project Comments'}
          </h2>
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
              <div key={comment.id}>
                <div
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
                      {comment.mentions && comment.mentions.length > 0 && (
                        <span className="text-xs text-amber-400">
                          Mentions: {comment.mentions.map(m => m.username).join(', ')}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2 items-center">
                      <CopyButton text={comment.content} size="sm" />
                      <button
                        onClick={() => handleTogglePin(comment.id, comment.is_pinned)}
                        className="text-xs text-zinc-400 hover:text-amber-500"
                        title={comment.is_pinned ? 'Unpin' : 'Pin'}
                      >
                        {comment.is_pinned ? '📌' : '📍'}
                      </button>
                      <button
                        onClick={() => {
                          setReplyingTo(comment.id);
                          textareaRef.current?.focus();
                        }}
                        className="text-xs text-zinc-400 hover:text-blue-400"
                      >
                        Reply
                      </button>
                      <button
                        onClick={() => handleDelete(comment.id)}
                        className="text-xs text-zinc-400 hover:text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap">
                    {renderContentWithMentions(comment.content, comment.mentions)}
                  </p>
                  {comment.reply_count && comment.reply_count > 0 && (
                    <button
                      onClick={() => toggleReplies(comment.id)}
                      className="text-xs text-blue-400 hover:text-blue-300 mt-2"
                    >
                      {expandedReplies.has(comment.id) ? 'Hide' : 'Show'} {comment.reply_count} {comment.reply_count === 1 ? 'reply' : 'replies'}
                    </button>
                  )}
                </div>
                
                {/* Replies */}
                {expandedReplies.has(comment.id) && replies[comment.id] && (
                  <div className="ml-6 mt-2 space-y-2 border-l-2 border-zinc-700 pl-4">
                    {replies[comment.id].map((reply) => (
                      <div
                        key={reply.id}
                        className="p-2 rounded bg-zinc-800/50 border border-zinc-700"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs text-zinc-400">
                            {reply.username || reply.email || 'Anonymous'}
                          </span>
                          <span className="text-xs text-zinc-600">
                            {new Date(reply.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-300 whitespace-pre-wrap">
                          {renderContentWithMentions(reply.content, reply.mentions)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-zinc-800 relative">
          {replyingTo && (
            <div className="mb-2 text-xs text-blue-400">
              Replying to comment #{replyingTo}
              <button
                onClick={() => setReplyingTo(null)}
                className="ml-2 text-red-400 hover:text-red-300"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex gap-2 mb-2">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="rounded"
            />
            <label className="text-xs text-zinc-400">Pin this comment</label>
          </div>
          <div className="flex gap-2 relative">
            <textarea
              ref={textareaRef}
              value={newComment}
              onChange={handleMentionInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  handleAddComment();
                }
              }}
              placeholder="Add a comment... Use @ to mention someone"
              className="flex-1 bg-black border border-zinc-700 rounded px-3 py-2 text-sm resize-none"
              rows={3}
            />
            <button
              onClick={handleAddComment}
              disabled={loading || !newComment.trim()}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm disabled:opacity-50"
            >
              {loading ? '...' : 'Add'}
            </button>
          </div>
          
          {/* Mention Suggestions */}
          {showMentionSuggestions && mentionSuggestions.length > 0 && (
            <div
              className="absolute bottom-full left-0 mb-2 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl max-h-48 overflow-y-auto w-64 z-10"
              style={{ bottom: '100%', marginBottom: '8px' }}
            >
              {mentionSuggestions.map((user, index) => (
                <button
                  key={user.id}
                  onClick={() => insertMention(user)}
                  className={`w-full text-left px-3 py-2 hover:bg-zinc-700 ${
                    index === selectedMentionIndex ? 'bg-zinc-700' : ''
                  }`}
                >
                  <div className="text-sm text-white font-semibold">@{user.username}</div>
                  <div className="text-xs text-zinc-400">{user.email}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommentsPanel;
