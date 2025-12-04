import React from 'react';
import { ProjectData } from '../db';
import { cn, getSelectedClassName, getCheckboxClassName, getFavoriteButtonClassName, getCardHeightClass, getCoverImageHeightClass, getStatusBadgeClassName } from '../utils/styleUtils';
import { getContentTypeInfo, getContentTypeBadgeClass } from '../utils/contentTypeUtils';
import { highlightSearchTerm, highlightAndTruncate } from '../utils/searchHighlight';
import { formatDate } from '../utils/formatUtils';
import { getCompletedScenesCount, hasCompletedScenes, formatSceneCount } from '../utils/arrayUtils';
import { getImageUrl } from '../utils/uiUtils';
import { generateProjectCover, toggleProjectFavorite } from '../utils/libraryUtils';
import LazyImage from './LazyImage';
import { apiService } from '../apiService';
import { favoritesService } from '../apiServices';

interface ProjectCardProps {
  project: ProjectData;
  libraryViewMode: 'grid' | 'list';
  libraryCardSize: 'small' | 'medium' | 'large';
  libraryBatchMode: boolean;
  isSelected: boolean;
  librarySearchTerm: string;
  favoritedProjects: Set<string>;
  onToggleSelection: () => void;
  onOpen: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onDuplicate: (e: React.MouseEvent) => void;
  onArchive: (e: React.MouseEvent) => void;
  onDelete: (e: React.MouseEvent) => void;
  onShare: (e: React.MouseEvent) => void;
  onToggleFavorite: () => Promise<void>;
  onGenerateCover: () => Promise<void>;
  setProjects: React.Dispatch<React.SetStateAction<ProjectData[]>>;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  setFavoritedProjects: React.Dispatch<React.SetStateAction<Set<string>>>;
  setProjectQuickActions: (actions: { project: ProjectData; position: { x: number; y: number } } | null) => void;
  setSelectedProjectForSharing: (project: ProjectData | null) => void;
  setShowSharingModal: (show: boolean) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = React.memo(({
  project,
  libraryViewMode,
  libraryCardSize,
  libraryBatchMode,
  isSelected,
  librarySearchTerm,
  favoritedProjects,
  onToggleSelection,
  onOpen,
  onContextMenu,
  onDuplicate,
  onArchive,
  onDelete,
  onShare,
  onToggleFavorite,
  onGenerateCover,
  setProjects,
  showToast,
  setFavoritedProjects,
  setProjectQuickActions,
  setSelectedProjectForSharing,
  setShowSharingModal
}) => {
  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onToggleFavorite();
  };

  const handleCoverClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await onGenerateCover();
  };

  const handleShareClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedProjectForSharing(project);
    setShowSharingModal(true);
  };

  return (
    <div 
      onClick={() => {
        if (libraryBatchMode) {
          onToggleSelection();
        } else {
          onOpen();
        }
      }}
      onContextMenu={onContextMenu}
      className={cn(
        'bg-zinc-900 border rounded-xl overflow-hidden transition-all relative group flex flex-col',
        libraryBatchMode ? 'cursor-pointer' : 'cursor-pointer hover:border-zinc-600',
        getSelectedClassName(isSelected),
        libraryViewMode === 'grid' 
          ? getCardHeightClass(libraryCardSize)
          : 'flex-row min-h-[120px]'
      )}
    >
      {libraryViewMode === 'grid' ? (
        <>
          {/* Cover Image */}
          {project.context.coverImageUrl ? (
            <div className={cn('w-full bg-zinc-950 overflow-hidden', getCoverImageHeightClass(libraryCardSize))}>
              <LazyImage
                src={getImageUrl(project.context.coverImageUrl) || ''}
                alt={project.context.title}
                className="w-full h-full"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="h-2 bg-gradient-to-r from-amber-600 to-amber-800"></div>
          )}
          
          {/* Selection Checkbox (Batch Mode) */}
          {libraryBatchMode && (
            <div className="absolute top-4 left-4 z-10">
              <div className={cn('w-6 h-6 rounded border-2 flex items-center justify-center transition-all', getCheckboxClassName(isSelected))}>
                {isSelected && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
          )}
          
          {/* Favorite Button */}
          {!libraryBatchMode && (
            <button
              onClick={handleFavoriteClick}
              className={getFavoriteButtonClassName(
                favoritedProjects.has(project.context.id),
                libraryBatchMode,
                'top-left'
              )}
              title={favoritedProjects.has(project.context.id) ? 'Remove from favorites' : 'Add to favorites'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
              </svg>
            </button>
          )}

          <div className="p-6 flex-1 flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-lg font-serif font-bold text-white line-clamp-1 flex-1">
                {librarySearchTerm ? highlightSearchTerm(project.context.title, librarySearchTerm) : project.context.title}
              </h3>
              {project.context.contentType && (
                <span className={cn('text-xs px-2 py-0.5 rounded border flex items-center gap-1 flex-shrink-0', getContentTypeBadgeClass(project.context.contentType))}>
                  <span>{getContentTypeInfo(project.context.contentType).icon}</span>
                  <span className="hidden sm:inline">{getContentTypeInfo(project.context.contentType).name}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-amber-500 uppercase tracking-wider mb-4">
              {librarySearchTerm && project.context.genre ? highlightSearchTerm(project.context.genre, librarySearchTerm) : project.context.genre}
            </p>
            <p className="text-sm text-zinc-500 line-clamp-3 mb-4 flex-1">
              {librarySearchTerm && project.context.plotSummary ? highlightAndTruncate(project.context.plotSummary, librarySearchTerm, 150) : (project.context.plotSummary || '')}
            </p>
            
            <div className="flex items-center justify-between mt-auto pt-4 border-t border-zinc-800/50">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-600">
                  {formatDate(project.context.lastUpdated)}
                </span>
                {project.scenes.length > 0 && (
                  <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                    {formatSceneCount(project.scenes.length)}
                  </span>
                )}
                {hasCompletedScenes(project) && (
                  <span className={cn('text-[10px] px-2 py-0.5 rounded border', getStatusBadgeClassName('completed'))}>
                    {getCompletedScenesCount(project.scenes)} Done
                  </span>
                )}
              </div>
              {!project.context.coverImageUrl && (
                <button
                  onClick={handleCoverClick}
                  className="text-[10px] bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded border border-purple-900/50 transition-colors"
                  title="Generate cover from characters"
                >
                  ✨ Cover
                </button>
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Cover Image in List View */}
          {project.context.coverImageUrl ? (
            <div className="w-32 h-24 bg-zinc-950 overflow-hidden flex-shrink-0">
              <LazyImage
                src={getImageUrl(project.context.coverImageUrl) || ''}
                alt={project.context.title}
                className="w-full h-full"
                loading="lazy"
              />
            </div>
          ) : (
            <div className="w-2 bg-gradient-to-b from-amber-600 to-amber-800"></div>
          )}
          <div className="p-4 flex-1 flex flex-col">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h3 className="text-lg font-serif font-bold text-white mb-1">
                  {librarySearchTerm ? highlightSearchTerm(project.context.title, librarySearchTerm) : project.context.title}
                </h3>
                <p className="text-xs text-amber-500 uppercase tracking-wider">
                  {librarySearchTerm && project.context.genre ? highlightSearchTerm(project.context.genre, librarySearchTerm) : project.context.genre}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-zinc-500">{formatDate(project.context.lastUpdated)}</span>
                {project.scenes.length > 0 && (
                  <span className="text-xs bg-zinc-800 px-2 py-0.5 rounded text-zinc-400">
                    {formatSceneCount(project.scenes.length)}
                  </span>
                )}
                {hasCompletedScenes(project) && (
                  <span className={cn('text-xs px-2 py-0.5 rounded border', getStatusBadgeClassName('completed'))}>
                    {getCompletedScenesCount(project.scenes)} Done
                  </span>
                )}
                {!project.context.coverImageUrl && (
                  <button
                    onClick={handleCoverClick}
                    className="text-xs bg-purple-900/30 hover:bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded border border-purple-900/50 transition-colors"
                    title="Generate cover from characters"
                  >
                    ✨ Cover
                  </button>
                )}
              </div>
            </div>
            <p className="text-sm text-zinc-500 line-clamp-2">
              {librarySearchTerm && project.context.plotSummary ? highlightAndTruncate(project.context.plotSummary, librarySearchTerm, 200) : (project.context.plotSummary || '')}
            </p>
          </div>
        </>
      )}
      {/* Favorite Button for List View */}
      <button
        onClick={handleFavoriteClick}
        className={cn('absolute top-4 left-4 p-1.5 rounded transition-all', favoritedProjects.has(project.context.id)
          ? 'bg-amber-600/20 text-amber-400 opacity-100'
          : 'bg-zinc-900/80 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-amber-400')}
        title={favoritedProjects.has(project.context.id) ? 'Remove from favorites' : 'Add to favorites'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
        </svg>
      </button>

      <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {!project.context.coverImageUrl && (
          <button
            onClick={handleCoverClick}
            className="p-1.5 bg-purple-900/30 hover:bg-purple-900/50 rounded text-purple-400 hover:text-purple-300 border border-purple-900/50"
            title="Generate cover from characters"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
          </button>
        )}
        <button
          onClick={onDuplicate}
          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-white"
          title="Duplicate Project"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
            <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
          </svg>
        </button>
        <button
          onClick={handleShareClick}
          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-amber-500"
          title="Share Project"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.518 2.518 0 010 .792l6.733 3.367a2.5 2.5 0 11-.671 1.341l-6.733-3.367a2.5 2.5 0 110-3.475l6.733-3.366A2.52 2.52 0 0113 4.5z" />
          </svg>
        </button>
        <button
          onClick={onArchive}
          className="p-1.5 bg-zinc-800 hover:bg-zinc-700 rounded text-zinc-400 hover:text-yellow-500"
          title="Archive Project"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path d="M2 3a1 1 0 00-1 1v1a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1H2z" />
            <path fillRule="evenodd" d="M2 7.5h16l-.811 7.71a2 2 0 01-1.99 1.79H4.801a2 2 0 01-1.99-1.79L2 7.5zM10 9a.75.75 0 01.75.75v2.546l.975-.243a.75.75 0 11.15 1.494l-2.25.562a.75.75 0 01-.65-.75V9.75A.75.75 0 0110 9z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 bg-red-900/30 hover:bg-red-900/50 rounded text-red-400 hover:text-red-300"
          title="Delete Project"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
          </svg>
        </button>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for React.memo
  return (
    prevProps.project.context.id === nextProps.project.context.id &&
    prevProps.project.context.title === nextProps.project.context.title &&
    prevProps.project.context.lastUpdated === nextProps.project.context.lastUpdated &&
    prevProps.project.scenes.length === nextProps.project.scenes.length &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.libraryViewMode === nextProps.libraryViewMode &&
    prevProps.libraryCardSize === nextProps.libraryCardSize &&
    prevProps.libraryBatchMode === nextProps.libraryBatchMode &&
    prevProps.librarySearchTerm === nextProps.librarySearchTerm &&
    prevProps.favoritedProjects.has(prevProps.project.context.id) === nextProps.favoritedProjects.has(nextProps.project.context.id)
  );
});

ProjectCard.displayName = 'ProjectCard';

export default ProjectCard;

