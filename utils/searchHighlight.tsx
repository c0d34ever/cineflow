import React from 'react';

/**
 * Highlights search terms in text
 */
export const highlightSearchTerm = (text: string, searchTerm: string): React.ReactNode => {
  if (!searchTerm || !text) {
    return text;
  }

  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        if (part.toLowerCase() === searchTerm.toLowerCase()) {
          return (
            <mark key={index} className="bg-amber-500/30 text-amber-200 rounded px-0.5">
              {part}
            </mark>
          );
        }
        return <span key={index}>{part}</span>;
      })}
    </>
  );
};

/**
 * Truncates text and highlights search term
 */
export const highlightAndTruncate = (
  text: string,
  searchTerm: string,
  maxLength: number = 100
): React.ReactNode => {
  if (!text) return null;

  const truncated = text.length > maxLength
    ? text.substring(0, maxLength) + '...'
    : text;

  return highlightSearchTerm(truncated, searchTerm);
};

