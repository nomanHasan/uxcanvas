import { useCanvasStore } from '@/store/useCanvasStore';
import { Frame } from '@/types';
import clsx from 'clsx';

export function LeftPanel() {
  const {
    frames,
    selectedIds,
    currentWorkingDir,
    isLoadingFromFS,
    selectFrame,
    addFrame,
    deleteFrames,
    updateFrame,
  } = useCanvasStore();

  const handleAddFrame = async () => {
    await addFrame({
      x: -100,
      y: -100,
      width: 200,
      height: 200,
      name: `Frame_${Date.now()}`,
      color: '#4ECDC480',
      rotation: 0,
      locked: false,
      visible: true,
      opacity: 1,
    });
  };

  const handleFrameClick = (frame: Frame, e: React.MouseEvent) => {
    selectFrame(frame.id, e.shiftKey || e.metaKey || e.ctrlKey);
  };

  const handleFrameDoubleClick = async (frame: Frame) => {
    const newName = prompt('Rename frame:', frame.name);
    if (newName && newName.trim()) {
      await updateFrame(frame.id, { name: newName.trim() });
    }
  };

  const handleToggleVisibility = async (frame: Frame, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateFrame(frame.id, { visible: !frame.visible });
  };

  const handleToggleLock = async (frame: Frame, e: React.MouseEvent) => {
    e.stopPropagation();
    await updateFrame(frame.id, { locked: !frame.locked });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedIds.length > 0) {
      if (confirm(`Delete ${selectedIds.length} frame(s)? This will delete the directories and all their contents.`)) {
        await deleteFrames(selectedIds);
      }
    }
  };

  // Get directory name from full path
  const getDirectoryName = (dirPath: string | undefined): string => {
    if (!dirPath) return '';
    const parts = dirPath.split(/[/\\]/);
    return parts[parts.length - 1] || '';
  };

  // Get current directory name
  const getCurrentDirName = (): string => {
    if (!currentWorkingDir) return 'Loading...';
    return getDirectoryName(currentWorkingDir) || currentWorkingDir;
  };

  return (
    <div className="w-60 bg-panel border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
            File Explorer
          </h3>
          <div className="flex items-center gap-1">
            {selectedIds.length > 0 && (
              <button
                onClick={handleDelete}
                className="p-1.5 hover:bg-border rounded text-text-secondary hover:text-text-primary transition-colors"
                title="Delete selected"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M5 3V2h6v1h4v1H1V3h4zm1 2v8h4V5H6zm-1 9V5H2v9a1 1 0 001 1h10a1 1 0 001-1V5h-3v9H5z"
                    fill="currentColor"
                  />
                </svg>
              </button>
            )}
            <button
              onClick={handleAddFrame}
              className="p-1.5 hover:bg-border rounded text-text-secondary hover:text-text-primary transition-colors"
              title="Add frame (creates new directory)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M8 3v10M3 8h10"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Current Directory */}
        <div className="text-xs text-text-secondary">
          <div className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 2v12h14V5H7L5 2H1z" />
            </svg>
            <span className="truncate" title={currentWorkingDir}>
              {getCurrentDirName()}
            </span>
          </div>
        </div>
      </div>

      {/* Directory List */}
      <div className="flex-1 overflow-y-auto py-2">
        {isLoadingFromFS ? (
          <div className="px-4 py-8 text-center text-text-secondary text-sm">
            Loading frames from file system...
          </div>
        ) : frames.length === 0 ? (
          <div className="px-4 py-8 text-center text-text-secondary text-sm">
            No subdirectories found.
            <br />
            <br />
            Click + to create a frame.
            <br />
            Each frame is a subdirectory with frame.json
          </div>
        ) : (
          <div className="space-y-0.5 px-2">
            {[...frames].reverse().map((frame) => {
              const dirName = getDirectoryName(frame.metadata?.dirPath);
              return (
                <div
                  key={frame.id}
                  className={clsx(
                    'group flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer transition-colors',
                    selectedIds.includes(frame.id)
                      ? 'bg-accent text-white'
                      : 'hover:bg-border text-text-primary'
                  )}
                  onClick={(e) => handleFrameClick(frame, e)}
                  onDoubleClick={() => handleFrameDoubleClick(frame)}
                  title={frame.metadata?.dirPath}
                >
                  {/* Folder Icon */}
                  <div className="flex-shrink-0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M1 2v12h14V5H7L5 2H1z" opacity="0.7" />
                    </svg>
                  </div>

                  {/* Frame/Directory Name */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate font-medium">{frame.name}</div>
                    <div className="text-xs opacity-60 truncate">{dirName}</div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleToggleVisibility(frame, e)}
                      className="p-0.5 hover:bg-black/20 rounded"
                      title={frame.visible ? 'Hide' : 'Show'}
                    >
                      {frame.visible ? (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M8 3C4.5 3 2 8 2 8s2.5 5 6 5 6-5 6-5-2.5-5-6-5z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            fill="none"
                          />
                          <circle cx="8" cy="8" r="2" fill="currentColor" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M2 2l12 12M8 5c-2 0-4 3-4 3s.5 1.5 1.5 2.5M8 11c2 0 4-3 4-3s-.5-1.5-1.5-2.5"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            fill="none"
                          />
                        </svg>
                      )}
                    </button>

                    <button
                      onClick={(e) => handleToggleLock(frame, e)}
                      className="p-0.5 hover:bg-black/20 rounded"
                      title={frame.locked ? 'Unlock' : 'Lock'}
                    >
                      {frame.locked ? (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M4 7V5a4 4 0 018 0v2h1v7H3V7h1z" fill="currentColor" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path
                            d="M4 7V5a4 4 0 018 0v2M3 7h10v7H3V7z"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            fill="none"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 border-t border-border text-xs text-text-secondary">
        {frames.length} {frames.length === 1 ? 'frame' : 'frames'}
        {selectedIds.length > 0 && ` • ${selectedIds.length} selected`}
      </div>
    </div>
  );
}
