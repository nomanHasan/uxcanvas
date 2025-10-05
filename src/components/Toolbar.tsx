import { useCanvasStore } from '@/store/useCanvasStore';
import clsx from 'clsx';
import { Tool } from '@/types';

export function Toolbar() {
  const {
    currentTool,
    camera,
    snapToGrid,
    showGrid,
    setTool,
    zoomIn,
    zoomOut,
    resetCamera,
    zoomToFit,
    toggleSnapToGrid,
    toggleGrid,
    undo,
    redo,
    history,
    historyIndex,
  } = useCanvasStore();

  const canUndo = historyIndex > 0;
  const canRedo = historyIndex < history.length - 1;

  const handleToolClick = (tool: Tool) => {
    setTool(tool);
  };

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-10">
      <div className="bg-panel border border-border rounded-lg shadow-lg flex items-center gap-1 px-2 py-2">
        {/* Tools */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border">
          <ToolButton
            active={currentTool === 'select'}
            onClick={() => handleToolClick('select')}
            title="Select Tool (V)"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M3 2 L3 15 L7.5 10.5 L9.5 14.5 L11.5 13.5 L9.5 9.5 L14 9.5 Z"
                fill="currentColor"
              />
            </svg>
          </ToolButton>

          <ToolButton
            active={currentTool === 'frame'}
            onClick={() => handleToolClick('frame')}
            title="Frame Tool (F)"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect
                x="3"
                y="3"
                width="12"
                height="12"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
            </svg>
          </ToolButton>

          <ToolButton
            active={currentTool === 'pan'}
            onClick={() => handleToolClick('pan')}
            title="Pan Tool (Space)"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 3v12M3 9h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
              <path
                d="M6 6L3 9l3 3M12 6l3 3-3 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </ToolButton>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border">
          <ToolButton onClick={zoomOut} title="Zoom Out (-)">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M4 9h10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </ToolButton>

          <span className="px-2 text-xs text-text-secondary min-w-[50px] text-center">
            {Math.round(camera.zoom * 100)}%
          </span>

          <ToolButton onClick={zoomIn} title="Zoom In (+)">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 4v10M4 9h10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </ToolButton>

          <ToolButton onClick={resetCamera} title="Reset View (Cmd+0)">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="9" cy="9" r="1.5" fill="currentColor" />
            </svg>
          </ToolButton>

          <ToolButton onClick={zoomToFit} title="Zoom to Fit (Cmd+1)">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect
                x="3"
                y="3"
                width="12"
                height="12"
                stroke="currentColor"
                strokeWidth="2"
                fill="none"
              />
              <path
                d="M6 6L3 3M12 6l3-3M6 12l-3 3M12 12l3 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </ToolButton>
        </div>

        {/* History */}
        <div className="flex items-center gap-0.5 pr-2 border-r border-border">
          <ToolButton onClick={undo} disabled={!canUndo} title="Undo (Cmd+Z)">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M4 8h8a3 3 0 013 3v0a3 3 0 01-3 3H6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M7 5L4 8l3 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </ToolButton>

          <ToolButton onClick={redo} disabled={!canRedo} title="Redo (Cmd+Shift+Z)">
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M14 8H6a3 3 0 00-3 3v0a3 3 0 003 3h6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M11 5l3 3-3 3"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </ToolButton>
        </div>

        {/* Settings */}
        <div className="flex items-center gap-0.5">
          <ToolButton
            active={snapToGrid}
            onClick={toggleSnapToGrid}
            title="Snap to Grid (Cmd+Shift+G)"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <rect x="3" y="3" width="4" height="4" fill="currentColor" />
              <rect x="11" y="3" width="4" height="4" fill="currentColor" />
              <rect x="3" y="11" width="4" height="4" fill="currentColor" />
              <rect x="11" y="11" width="4" height="4" fill="currentColor" />
            </svg>
          </ToolButton>

          <ToolButton
            active={showGrid}
            onClick={toggleGrid}
            title="Toggle Grid (Cmd+G)"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M3 6h12M3 9h12M3 12h12M6 3v12M9 3v12M12 3v12"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </ToolButton>
        </div>
      </div>
    </div>
  );
}

interface ToolButtonProps {
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  title?: string;
  children: React.ReactNode;
}

function ToolButton({ active, disabled, onClick, title, children }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={clsx(
        'p-2 rounded transition-colors',
        active && 'bg-accent text-white',
        !active && !disabled && 'text-text-secondary hover:text-text-primary hover:bg-border',
        disabled && 'text-text-secondary opacity-30 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}
