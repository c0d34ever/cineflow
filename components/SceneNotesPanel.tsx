import React, { useState, useEffect } from 'react';
import { sceneNotesService } from '../apiServices';

interface SceneNote {
  id: number;
  content: string;
  note_type: 'note' | 'todo' | 'issue' | 'idea';
  is_resolved: boolean;
  created_at: string;
  username?: string;
}

interface SceneNotesPanelProps {
  sceneId: string;
  onClose: () => void;
}

const noteTypeColors = {
  note: 'bg-blue-900/20 border-blue-500/30 text-blue-300',
  todo: 'bg-yellow-900/20 border-yellow-500/30 text-yellow-300',
  issue: 'bg-red-900/20 border-red-500/30 text-red-300',
  idea: 'bg-green-900/20 border-green-500/30 text-green-300',
};

const SceneNotesPanel: React.FC<SceneNotesPanelProps> = ({ sceneId, onClose }) => {
  const [notes, setNotes] = useState<SceneNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [noteType, setNoteType] = useState<'note' | 'todo' | 'issue' | 'idea'>('note');
  const [loading, setLoading] = useState(false);

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
      await sceneNotesService.create({
        scene_id: sceneId,
        note_type: noteType,
        content: newNote
      });
      setNewNote('');
      setNoteType('note');
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

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold">Scene Notes</h2>
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
          {notes.length === 0 ? (
            <div className="text-center text-zinc-500 py-8">No notes yet</div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                className={`p-3 rounded-lg border ${
                  noteTypeColors[note.note_type]
                } ${note.is_resolved ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase">{note.note_type}</span>
                    {note.is_resolved && (
                      <span className="text-xs text-zinc-500 line-through">Resolved</span>
                    )}
                    <span className="text-xs text-zinc-400">
                      {note.username || 'Anonymous'}
                    </span>
                    <span className="text-xs text-zinc-600">
                      {new Date(note.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleToggleResolve(note.id, note.is_resolved)}
                      className="text-xs text-zinc-400 hover:text-green-400"
                      title={note.is_resolved ? 'Mark unresolved' : 'Mark resolved'}
                    >
                      {note.is_resolved ? '✓' : '○'}
                    </button>
                    <button
                      onClick={() => handleDelete(note.id)}
                      className="text-xs text-zinc-400 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{note.content}</p>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-zinc-800">
          <div className="flex gap-2 mb-2">
            <select
              value={noteType}
              onChange={(e) => setNoteType(e.target.value as any)}
              className="bg-black border border-zinc-700 rounded px-2 py-1 text-sm"
            >
              <option value="note">Note</option>
              <option value="todo">Todo</option>
              <option value="issue">Issue</option>
              <option value="idea">Idea</option>
            </select>
          </div>
          <div className="flex gap-2">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Add a note..."
              className="flex-1 bg-black border border-zinc-700 rounded px-3 py-2 text-sm resize-none"
              rows={2}
            />
            <button
              onClick={handleAddNote}
              disabled={loading || !newNote.trim()}
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

export default SceneNotesPanel;

