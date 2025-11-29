import React, { useState, useEffect, useRef } from 'react';

interface Command {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: Command[];
  projects?: Array<{ id: string; title: string; genre?: string }>;
  onSelectProject?: (projectId: string) => void;
  onCreateNew?: () => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  commands,
  projects = [],
  onSelectProject,
  onCreateNew
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Filter commands and projects based on query
  const filteredCommands = commands.filter(cmd => {
    if (!query) return true;
    const searchTerm = query.toLowerCase();
    return (
      cmd.label.toLowerCase().includes(searchTerm) ||
      cmd.description?.toLowerCase().includes(searchTerm) ||
      cmd.keywords?.some(k => k.toLowerCase().includes(searchTerm))
    );
  });

  const filteredProjects = projects.filter(project => {
    if (!query) return false;
    const searchTerm = query.toLowerCase();
    return (
      project.title.toLowerCase().includes(searchTerm) ||
      project.genre?.toLowerCase().includes(searchTerm)
    );
  });

  const allResults = [
    ...filteredCommands,
    ...filteredProjects.map(p => ({
      id: `project-${p.id}`,
      label: p.title,
      description: p.genre ? `Genre: ${p.genre}` : 'Project',
      icon: '📁',
      action: () => {
        onSelectProject?.(p.id);
        onClose();
      }
    }))
  ];

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, allResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (allResults[selectedIndex]) {
          allResults[selectedIndex].action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, allResults]);

  // Scroll selected item into view
  useEffect(() => {
    if (resultsRef.current) {
      const selectedElement = resultsRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Palette */}
      <div className="relative w-full max-w-2xl mx-4">
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden">
          {/* Search Input */}
          <div className="p-4 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-zinc-400">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                placeholder="Search commands, projects, scenes..."
                className="flex-1 bg-transparent text-white placeholder-zinc-500 outline-none text-lg"
              />
              <kbd className="px-2 py-1 text-xs font-semibold text-zinc-400 bg-zinc-800 border border-zinc-700 rounded">
                ESC
              </kbd>
            </div>
          </div>

          {/* Results */}
          <div 
            ref={resultsRef}
            className="max-h-96 overflow-y-auto"
          >
            {allResults.length === 0 ? (
              <div className="p-8 text-center text-zinc-500">
                {query ? 'No results found' : 'Start typing to search...'}
                {onCreateNew && query && (
                  <button
                    onClick={() => {
                      onCreateNew();
                      onClose();
                    }}
                    className="mt-4 px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm"
                  >
                    Create "{query}"
                  </button>
                )}
              </div>
            ) : (
              <div className="py-2">
                {allResults.map((result, index) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      result.action();
                      onClose();
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-zinc-800 transition-colors ${
                      index === selectedIndex ? 'bg-zinc-800 border-l-2 border-amber-500' : ''
                    }`}
                  >
                    {result.icon && (
                      <span className="text-xl">{result.icon}</span>
                    )}
                    <div className="flex-1">
                      <div className="text-white font-medium">{result.label}</div>
                      {result.description && (
                        <div className="text-xs text-zinc-500 mt-0.5">{result.description}</div>
                      )}
                    </div>
                    {index === selectedIndex && (
                      <kbd className="text-xs text-zinc-400">↵</kbd>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↑↓</kbd>
                Navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-zinc-800 rounded">↵</kbd>
                Select
              </span>
            </div>
            <div>{allResults.length} result{allResults.length !== 1 ? 's' : ''}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommandPalette;

