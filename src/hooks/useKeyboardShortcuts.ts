import { useEffect } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';

export function useKeyboardShortcuts() {
  const {
    setTool,
    setSpacePressed,
    undo,
    redo,
    deleteFrames,
    selectAll,
    duplicateFrames,
    zoomIn,
    zoomOut,
    resetCamera,
    zoomToFit,
    toggleSnapToGrid,
    toggleGrid,
    selectedIds,
  } = useCanvasStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Ignore if typing in input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Space for pan tool
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
        return;
      }

      // Tool shortcuts
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setTool('select');
        return;
      }

      if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setTool('frame');
        return;
      }

      if (e.key === 'h' || e.key === 'H') {
        e.preventDefault();
        setTool('pan');
        return;
      }

      // Undo/Redo
      if (cmdOrCtrl && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Redo (Ctrl+Y on Windows)
      if (!isMac && cmdOrCtrl && e.key === 'y') {
        e.preventDefault();
        redo();
        return;
      }

      // Select All
      if (cmdOrCtrl && e.key === 'a') {
        e.preventDefault();
        selectAll();
        return;
      }

      // Delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          deleteFrames(selectedIds);
        }
        return;
      }

      // Duplicate
      if (cmdOrCtrl && e.key === 'd') {
        e.preventDefault();
        if (selectedIds.length > 0) {
          duplicateFrames(selectedIds);
        }
        return;
      }

      // Zoom
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        zoomIn();
        return;
      }

      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        zoomOut();
        return;
      }

      // Reset zoom
      if (cmdOrCtrl && e.key === '0') {
        e.preventDefault();
        resetCamera();
        return;
      }

      // Zoom to fit
      if (cmdOrCtrl && e.key === '1') {
        e.preventDefault();
        zoomToFit();
        return;
      }

      // Toggle grid
      if (cmdOrCtrl && e.key === 'g') {
        e.preventDefault();
        if (e.shiftKey) {
          toggleSnapToGrid();
        } else {
          toggleGrid();
        }
        return;
      }

      // Escape - clear selection
      if (e.key === 'Escape') {
        e.preventDefault();
        useCanvasStore.getState().clearSelection();
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    setTool,
    setSpacePressed,
    undo,
    redo,
    deleteFrames,
    selectAll,
    duplicateFrames,
    zoomIn,
    zoomOut,
    resetCamera,
    zoomToFit,
    toggleSnapToGrid,
    toggleGrid,
    selectedIds,
  ]);
}
