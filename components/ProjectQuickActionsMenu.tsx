import React, { useEffect, useRef } from 'react';

interface ProjectData {
  context: {
    id: string;
    title: string;
    genre: string;
    plotSummary: string;
  };
  scenes: any[];
}

interface ProjectQuickActionsMenuProps {
  project: ProjectData;
  position: { x: number; y: number };
  onClose: () => void;
  onOpen: (project: ProjectData) => void;
  onDuplicate: (project: ProjectData) => void;
  onArchive: (project: ProjectData) => void;
  onShare: (project: ProjectData) => void;
  onDelete: (project: ProjectData) => void;
  onExport: (project: ProjectData) => void;
  onManageCover?: (project: ProjectData) => void;
  onCreateTemplate?: (project: ProjectData) => void;
  onAssignTags?: (project: ProjectData) => void;
}

const ProjectQuickActionsMenu: React.FC<ProjectQuickActionsMenuProps> = ({
  project,
  position,
  onClose,
  onOpen,
  onDuplicate,
  onArchive,
  onShare,
  onDelete,
  onExport,
  onManageCover,
  onCreateTemplate,
  onAssignTags
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position if menu would go off screen
  const adjustedPosition = {
    x: position.x + 200 > window.innerWidth ? position.x - 200 : position.x,
    y: position.y + 300 > window.innerHeight ? position.y - 300 : position.y
  };

  const menuItems = [
    {
      label: 'Open',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
        </svg>
      ),
      action: () => {
        onOpen(project);
        onClose();
      },
      className: 'text-white'
    },
    {
      label: 'Duplicate',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
          <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
        </svg>
      ),
      action: () => {
        onDuplicate(project);
        onClose();
      },
      className: 'text-blue-400'
    },
    {
      label: 'Share',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13 4.5a2.5 2.5 0 11.702 1.737L6.97 9.604a2.518 2.518 0 010 .792l6.733 3.367a2.5 2.5 0 11-.671 1.341l-6.733-3.367a2.5 2.5 0 110-3.475l6.733-3.366A2.52 2.52 0 0113 4.5z" />
        </svg>
      ),
      action: () => {
        onShare(project);
        onClose();
      },
      className: 'text-green-400'
    },
    {
      label: 'Export',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 2a.75.75 0 01.75.75v5.5h5.5a.75.75 0 010 1.5h-5.5v5.5a.75.75 0 01-1.5 0v-5.5H4.25a.75.75 0 010-1.5h5.5v-5.5A.75.75 0 0110 2z" clipRule="evenodd" />
        </svg>
      ),
      action: () => {
        onExport(project);
        onClose();
      },
      className: 'text-amber-400'
    },
    ...(onManageCover ? [{
      label: 'Cover Image',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.97zM12 7a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
        </svg>
      ),
      action: () => {
        onManageCover(project);
        onClose();
      },
      className: 'text-purple-400'
    }] : []),
    ...(onCreateTemplate ? [{
      label: 'Create Template',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.919 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
          <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
        </svg>
      ),
      action: () => {
        onCreateTemplate(project);
        onClose();
      },
      className: 'text-cyan-400'
    }] : []),
    ...(onAssignTags ? [{
      label: 'Assign Tags',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.5 3A2.5 2.5 0 003 5.5v2.879a2.5 2.5 0 00.732 1.767l6.5 6.5a2.5 2.5 0 003.536 0l2.878-2.878a2.5 2.5 0 000-3.536l-6.5-6.5A2.5 2.5 0 008.38 3H5.5zM6 7a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      ),
      action: () => {
        onAssignTags(project);
        onClose();
      },
      className: 'text-pink-400'
    }] : []),
    {
      label: 'Archive',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 3a1 1 0 00-1 1v1a1 1 0 001 1h16a1 1 0 001-1V4a1 1 0 00-1-1H2z" />
          <path fillRule="evenodd" d="M2 7.5h16l-.811 7.71a2 2 0 01-1.99 1.79H4.801a2 2 0 01-1.99-1.79L2 7.5zM10 9a.75.75 0 01.75.75v2.546l.943-1.048a.75.75 0 111.014 1.104l-2.25 2.5a.75.75 0 01-1.114 0l-2.25-2.5a.75.75 0 111.014-1.104l.943 1.048V9.75A.75.75 0 0110 9z" clipRule="evenodd" />
        </svg>
      ),
      action: () => {
        onArchive(project);
        onClose();
      },
      className: 'text-yellow-400'
    },
    {
      label: 'Delete',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
        </svg>
      ),
      action: () => {
        if (window.confirm(`Delete "${project.context.title}"? This cannot be undone.`)) {
          onDelete(project);
        }
        onClose();
      },
      className: 'text-red-400'
    }
  ];

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl py-2 min-w-[180px]"
      style={{
        left: `${adjustedPosition.x}px`,
        top: `${adjustedPosition.y}px`
      }}
    >
      {menuItems.map((item, index) => (
        <button
          key={index}
          onClick={item.action}
          className={`w-full px-4 py-2 text-sm flex items-center gap-3 hover:bg-zinc-800 transition-colors ${item.className}`}
        >
          {item.icon}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ProjectQuickActionsMenu;

