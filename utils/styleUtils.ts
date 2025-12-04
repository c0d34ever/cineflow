/**
 * Combine class names, filtering out falsy values
 */
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ');
};

/**
 * Get className for selected state
 */
export const getSelectedClassName = (isSelected: boolean, baseClasses?: string): string => {
  const base = baseClasses || '';
  if (isSelected) {
    return cn(base, 'border-amber-500 ring-2 ring-amber-500 ring-offset-2 ring-offset-zinc-900');
  }
  return cn(base, 'border-zinc-800');
};

/**
 * Get className for checkbox/selection indicator
 */
export const getCheckboxClassName = (isSelected: boolean): string => {
  return isSelected
    ? 'bg-amber-600 border-amber-500'
    : 'bg-zinc-900/80 border-zinc-600';
};

/**
 * Get className for favorite button
 */
export const getFavoriteButtonClassName = (
  isFavorited: boolean,
  isBatchMode: boolean,
  position: 'top-left' | 'top-right' = 'top-left'
): string => {
  const positionClass = isBatchMode
    ? (position === 'top-left' ? 'top-4 left-4' : 'top-4 right-4')
    : 'top-4 left-4';
  
  const stateClass = isFavorited
    ? 'bg-amber-600/20 text-amber-400 opacity-100'
    : 'bg-zinc-900/80 text-zinc-500 opacity-0 group-hover:opacity-100 hover:text-amber-400';
  
  return cn('absolute', positionClass, 'p-1.5 rounded transition-all z-10', stateClass);
};

/**
 * Get card height class based on card size
 */
export const getCardHeightClass = (cardSize: 'small' | 'medium' | 'large'): string => {
  switch (cardSize) {
    case 'small':
      return 'min-h-[150px]';
    case 'large':
      return 'min-h-[300px]';
    case 'medium':
    default:
      return 'min-h-[200px]';
  }
};

/**
 * Get cover image height class based on card size
 */
export const getCoverImageHeightClass = (cardSize: 'small' | 'medium' | 'large'): string => {
  switch (cardSize) {
    case 'small':
      return 'h-24';
    case 'large':
      return 'h-64';
    case 'medium':
    default:
      return 'h-48';
  }
};

/**
 * Get grid columns class based on view mode and card size
 */
export const getGridColumnsClass = (
  viewMode: 'grid' | 'list',
  cardSize?: 'small' | 'medium' | 'large'
): string => {
  if (viewMode === 'list') {
    return 'space-y-3';
  }
  
  // Grid view with different card sizes
  switch (cardSize) {
    case 'small':
      return 'grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6';
    case 'large':
      return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
    case 'medium':
    default:
      return 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  }
};

/**
 * Get status badge className
 */
export const getStatusBadgeClassName = (status: string): string => {
  switch (status) {
    case 'completed':
      return 'bg-green-900/30 text-green-400 border border-green-900/50';
    case 'generating':
      return 'bg-blue-900/30 text-blue-400 border border-blue-900/50';
    case 'planning':
      return 'bg-yellow-900/30 text-yellow-400 border border-yellow-900/50';
    case 'failed':
      return 'bg-red-900/30 text-red-400 border border-red-900/50';
    default:
      return 'bg-zinc-800 text-zinc-400';
  }
};

/**
 * Get button variant className
 */
export const getButtonVariantClassName = (
  variant: 'primary' | 'secondary' | 'danger' | 'success' | 'warning',
  isActive?: boolean
): string => {
  const base = 'px-3 py-1.5 rounded text-xs border transition-colors';
  
  switch (variant) {
    case 'primary':
      return cn(base, isActive
        ? 'bg-amber-600 border-amber-500 text-white'
        : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700');
    case 'secondary':
      return cn(base, 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700');
    case 'danger':
      return cn(base, 'bg-red-900/30 border-red-900/50 text-red-400 hover:bg-red-900/50');
    case 'success':
      return cn(base, 'bg-green-900/30 border-green-900/50 text-green-400 hover:bg-green-900/50');
    case 'warning':
      return cn(base, 'bg-yellow-900/30 border-yellow-900/50 text-yellow-400 hover:bg-yellow-900/50');
    default:
      return base;
  }
};

