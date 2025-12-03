import React, { useState } from 'react';

export type ContentType = 
  | 'film' 
  | 'news' 
  | 'sports' 
  | 'documentary' 
  | 'commercial' 
  | 'music-video' 
  | 'web-series' 
  | 'podcast' 
  | 'other';

interface ContentTypeOption {
  id: ContentType;
  name: string;
  description: string;
  icon: string;
  color: string;
}

const CONTENT_TYPES: ContentTypeOption[] = [
  {
    id: 'film',
    name: 'Film / Storyboard',
    description: 'Traditional film production, movies, short films',
    icon: '🎬',
    color: 'amber'
  },
  {
    id: 'news',
    name: 'News Reporting',
    description: 'News segments, interviews, breaking news coverage',
    icon: '📰',
    color: 'blue'
  },
  {
    id: 'sports',
    name: 'Sports Content',
    description: 'Cricket, football, match highlights, sports analysis',
    icon: '⚽',
    color: 'green'
  },
  {
    id: 'documentary',
    name: 'Documentary',
    description: 'Documentary films, investigative journalism',
    icon: '📹',
    color: 'purple'
  },
  {
    id: 'commercial',
    name: 'Commercial / Ad',
    description: 'TV commercials, promotional videos, advertisements',
    icon: '📺',
    color: 'pink'
  },
  {
    id: 'music-video',
    name: 'Music Video',
    description: 'Music videos, lyric videos, performance videos',
    icon: '🎵',
    color: 'indigo'
  },
  {
    id: 'web-series',
    name: 'Web Series',
    description: 'Online series, episodic content, streaming shows',
    icon: '📱',
    color: 'cyan'
  },
  {
    id: 'podcast',
    name: 'Podcast / Audio',
    description: 'Podcast episodes, audio content, radio shows',
    icon: '🎙️',
    color: 'orange'
  },
  {
    id: 'other',
    name: 'Other',
    description: 'Custom content type',
    icon: '✨',
    color: 'zinc'
  }
];

interface ContentTypeSelectorProps {
  onSelect: (contentType: ContentType) => void;
  onClose: () => void;
}

const ContentTypeSelector: React.FC<ContentTypeSelectorProps> = ({ onSelect, onClose }) => {
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);

  const handleContinue = () => {
    if (selectedType) {
      onSelect(selectedType);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg w-full max-w-4xl max-h-[85vh] overflow-y-auto">
        <div className="p-6 border-b border-zinc-800">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Choose Content Type</h2>
              <p className="text-zinc-400 text-sm">Select the type of content you want to create</p>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CONTENT_TYPES.map((type) => {
              const isSelected = selectedType === type.id;
              const colorClasses = {
                amber: isSelected ? 'bg-amber-600 border-amber-500' : 'border-zinc-700 hover:border-amber-500/50',
                blue: isSelected ? 'bg-blue-600 border-blue-500' : 'border-zinc-700 hover:border-blue-500/50',
                green: isSelected ? 'bg-green-600 border-green-500' : 'border-zinc-700 hover:border-green-500/50',
                purple: isSelected ? 'bg-purple-600 border-purple-500' : 'border-zinc-700 hover:border-purple-500/50',
                pink: isSelected ? 'bg-pink-600 border-pink-500' : 'border-zinc-700 hover:border-pink-500/50',
                indigo: isSelected ? 'bg-indigo-600 border-indigo-500' : 'border-zinc-700 hover:border-indigo-500/50',
                cyan: isSelected ? 'bg-cyan-600 border-cyan-500' : 'border-zinc-700 hover:border-cyan-500/50',
                orange: isSelected ? 'bg-orange-600 border-orange-500' : 'border-zinc-700 hover:border-orange-500/50',
                zinc: isSelected ? 'bg-zinc-600 border-zinc-500' : 'border-zinc-700 hover:border-zinc-500/50',
              };

              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left ${
                    colorClasses[type.color as keyof typeof colorClasses]
                  } ${isSelected ? 'ring-2 ring-offset-2 ring-offset-zinc-900' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{type.icon}</span>
                    <div className="flex-1">
                      <div className="font-bold text-white mb-1">{type.name}</div>
                      <div className="text-xs text-zinc-400">{type.description}</div>
                    </div>
                    {isSelected && (
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-6 border-t border-zinc-800 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            disabled={!selectedType}
            className="px-6 py-2 bg-amber-600 hover:bg-amber-500 rounded text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

export default ContentTypeSelector;

