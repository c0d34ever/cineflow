import React, { useState } from 'react';

interface CopyButtonProps {
  text: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  label?: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ 
  text, 
  className = '', 
  size = 'sm',
  showLabel = false,
  label = 'Copy'
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
      document.body.removeChild(textArea);
    }
  };

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  const iconSize = sizeClasses[size];

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-zinc-400 hover:text-amber-500 transition-colors ${className}`}
      title={copied ? 'Copied!' : 'Copy to clipboard'}
    >
      {copied ? (
        <>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor" 
            className={`${iconSize} text-green-500`}
          >
            <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
          </svg>
          {showLabel && <span className="text-xs text-green-500">Copied!</span>}
        </>
      ) : (
        <>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 20 20" 
            fill="currentColor" 
            className={iconSize}
          >
            <path d="M13.5 2a1.5 1.5 0 00-1.5 1.5v1h-3v-1A1.5 1.5 0 007.5 2h-3A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h9a1.5 1.5 0 001.5-1.5v-13A1.5 1.5 0 0013.5 2h-3zM9 4.5v1h2v-1a.5.5 0 00-.5-.5h-1a.5.5 0 00-.5.5zM4.5 4h1v1h-1a.5.5 0 010-1zm0 2h11a.5.5 0 01.5.5v10a.5.5 0 01-.5.5h-11a.5.5 0 01-.5-.5v-10a.5.5 0 01.5-.5z" />
            <path d="M6.5 6a.5.5 0 000 1h7a.5.5 0 000-1h-7zM6 9.5a.5.5 0 01.5-.5h7a.5.5 0 010 1h-7a.5.5 0 01-.5-.5zM6.5 11a.5.5 0 000 1h4a.5.5 0 000-1h-4z" />
          </svg>
          {showLabel && <span className="text-xs">{label}</span>}
        </>
      )}
    </button>
  );
};

export default CopyButton;

