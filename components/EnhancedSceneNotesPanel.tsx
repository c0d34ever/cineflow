import React, { useState, useEffect, useRef } from 'react';
import { sceneNotesService } from '../apiServices';

interface SceneNote {
  id: number;
  content: string;
  note_type: 'note' | 'todo' | 'issue' | 'idea';
  is_resolved: boolean;
  created_at: string;
  username?: string;
  attachments?: string[];
}

interface EnhancedSceneNotesPanelProps {
  sceneId: string;
  onClose: () => void;
}

const noteTypeColors = {
  note: 'bg-blue-900/20 border-blue-500/30 text-blue-300',
  todo: 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300',
  issue: 'bg-red-900/20 border-red-500/30 text-red-300',
  idea: 'bg-green-900/20 border-green-500/30 text-green-300',
};

const EnhancedSceneNotesPanel: React.FC<EnhancedSceneNotesPanelProps> = ({ sceneId, onClose }) => {
  const [notes, setNotes] = useState<SceneNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'note' | 'todo' | 'issue' | 'idea'>('note');
  const [loading, setLoading] = useState(false);
  const [editingNote, setEditingNote] = useState<SceneNote | null>(null);
  const [showRichEditor, setShowRichEditor] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadNotes();
  }, [sceneId]);

  const loadNotes = async () => {
    try {
      const response = await sceneNotesService.getByScene(sceneId);
      const data = (response as any)?.notes || [];
      setNotes(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to load notes:', error);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    
    setLoading(true);
    try {
      if (editingNote) {
        await sceneNotesService.update(editingNote.id, {
          content: newNote,
          note_type: noteType,
        });
      } else {
        await sceneNotesService.create({
          scene_id: sceneId,
          note_type: noteType,
          content: newNote
        });
      }
      setNewNote('');
      setNoteType('note');
      setEditingNote(null);
      setShowRichEditor(false);
      await loadNotes();
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this note?')) return;
    try {
      await sceneNotesService.delete(id);
      await loadNotes();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleToggleResolve = async (id: number, currentResolved: boolean) => {
    try {
      await sceneNotesService.update(id, { is_resolved: !currentResolved });
      await loadNotes();
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  const handleEdit = (note: SceneNote) => {
    setEditingNote(note);
    setNewNote(note.content);
    setNoteType(note.note_type);
    setShowRichEditor(true);
  };

  // Rich text formatting helpers
  const applyFormat = (format: string) => {
    const textarea = editorRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = newNote.substring(start, end);
    const before = newNote.substring(0, start);
    const after = newNote.substring(end);

    let formatted = '';
    switch (format) {
      case 'bold':
        formatted = `**${selectedText || 'bold text'}**`;
        break;
      case 'italic':
        formatted = `*${selectedText || 'italic text'}*`;
        break;
      case 'list':
        formatted = selectedText ? selectedText.split('\n').map(line => `- ${line}`).join('\n') : '- ';
        break;
      case 'code':
        formatted = `\`${selectedText || 'code'}\``;
        break;
      case 'link':
        formatted = `[${selectedText || 'link text'}](url)`;
        break;
      default:
        formatted = selectedText;
    }

    setNewNote(before + formatted + after);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + formatted.length, start + formatted.length);
    }, 0);
  };

  // Render markdown-like content
  const renderContent = (content: string) => {
    // Simple markdown rendering
    let html = content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-zinc-800 px-1 rounded">$1</code>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-amber-400 hover:underline" target="_blank">$1</a>')
      .replace(/^\- (.*)$/gm, '<li>$1</li>')
      .replace(/\n/g, '<br>');
    
    // Wrap list items
    html = html.replace(/(<li>.*<\/li>)/s, '<ul class="list-disc list-inside ml-4">$1</ul>');
    
    return { __html: html };
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col m-2 sm:m-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 sm:p-4 border-b border-zinc-800 gap-2 sm:gap-0">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Scene Notes</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">Enhanced notes with rich text support</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition-colors p-2 hover:bg-zinc-800 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          {/* Add Note Form */}
          <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <select
                value={noteType}
                onChange={(e) => setNoteType(e.target.value as any)}
                className="text-xs px-2 py-1 bg-zinc-900 border border-zinc-700 rounded text-white"
              >
                <option value="note">Note</option>
                <option value="todo">Todo</option>
                <option value="issue">Issue</option>
                <option value="idea">Idea</option>
              </select>
              {!showRichEditor && (
                <button
                  onClick={() => setShowRichEditor(true)}
                  className="text-xs px-2 py-1 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded"
                >
                  Rich Text
                </button>
              )}
            </div>

            {showRichEditor && (
              <div className="mb-2 flex items-center gap-1 flex-wrap">
                <button
                  onClick={() => applyFormat('bold')}
                  className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded"
                  title="Bold"
                >
                  <strong>B</strong>
                </button>
                <button
                  onClick={() => applyFormat('italic')}
                  className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded italic"
                  title="Italic"
                >
                  I
                </button>
                <button
                  onClick={() => applyFormat('list')}
                  className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded"
                  title="List"
                >
                  • List
                </button>
                <button
                  onClick={() => applyFormat('code')}
                  className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded font-mono"
                  title="Code"
                >
                  {'</>'}
                </button>
                <button
                  onClick={() => applyFormat('link')}
                  className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded"
                  title="Link"
                >
                  🔗
                </button>
                <button
                  onClick={() => setShowRichEditor(false)}
                  className="px-2 py-1 text-xs bg-zinc-700 hover:bg-zinc-600 rounded ml-auto"
                >
                  Simple
                </button>
              </div>
            )}

            <textarea
              ref={editorRef}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder={editingNote ? "Edit note..." : "Add a note... (Supports **bold**, *italic*, `code`, [links](url), - lists)"}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:border-amber-500 outline-none min-h-[100px] font-mono"
              rows={showRichEditor ? 6 : 3}
            />
            <div className="flex items-center gap-2 mt-2">
              <button
                onClick={handleAddNote}
                disabled={loading || !newNote.trim()}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingNote ? 'Update' : 'Add'} Note
              </button>
              {editingNote && (
                <button
                  onClick={() => {
                    setEditingNote(null);
                    setNewNote('');
                    setNoteType('note');
                  }}
                  className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-300 rounded text-sm"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {/* Notes List */}
          <div className="space-y-3">
            {notes.length === 0 ? (
              <div className="text-center py-8 text-zinc-500">
                <p>No notes yet</p>
                <p className="text-sm mt-2">Add your first note above</p>
              </div>
            ) : (
              notes.map((note) => (
                <div
                  key={note.id}
                  className={`bg-zinc-800 border rounded-lg p-4 ${
                    note.is_resolved ? 'opacity-60' : ''
                  } ${noteTypeColors[note.note_type]}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2 py-1 rounded border ${noteTypeColors[note.note_type]}`}>
                        {note.note_type}
                      </span>
                      {note.is_resolved && (
                        <span className="text-xs text-green-400">✓ Resolved</span>
                      )}
                      {note.username && (
                        <span className="text-xs text-zinc-500">by {note.username}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleToggleResolve(note.id, note.is_resolved)}
                        className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                      >
                        {note.is_resolved ? 'Unresolve' : 'Resolve'}
                      </button>
                      <button
                        onClick={() => handleEdit(note)}
                        className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="text-xs px-2 py-1 rounded bg-red-900/30 hover:bg-red-900/50 text-red-400"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                  <div
                    className="text-sm text-zinc-300 prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={renderContent(note.content)}
                  />
                  <div className="text-xs text-zinc-500 mt-2">
                    {new Date(note.created_at).toLocaleString()}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedSceneNotesPanel;

