import React, { useEffect } from 'react';
import { useSSE } from '../hooks/useSSE';

interface SaveProgressModalProps {
  connectionId: string | null;
  onComplete: () => void;
  onError: (error: string) => void;
}

const SaveProgressModal: React.FC<SaveProgressModalProps> = ({ 
  connectionId, 
  onComplete, 
  onError 
}) => {
  const { progress, message, isConnected } = useSSE({
    connectionId: connectionId || '',
    autoConnect: !!connectionId,
    onProgress: (progress, message) => {
      // Progress updates are handled by the hook
    },
    onComplete: (data) => {
      onComplete();
    },
    onError: (error, details) => {
      onError(error);
    }
  });

  if (!connectionId) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-shrink-0">
            {isConnected ? (
              <svg className="animate-spin h-5 w-5 text-amber-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <div className="h-5 w-5 rounded-full border-2 border-zinc-600 border-t-amber-500 animate-spin"></div>
            )}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Saving Project</h3>
            <p className="text-sm text-zinc-400">{message || 'Preparing to save...'}</p>
          </div>
        </div>
        
        <div className="w-full bg-zinc-800 rounded-full h-2 mb-2">
          <div 
            className="bg-amber-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="text-xs text-zinc-500 text-center">
          {progress}% complete
        </div>
      </div>
    </div>
  );
};

export default SaveProgressModal;

