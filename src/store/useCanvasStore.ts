import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { produce } from 'immer';
import { AppState, Frame, Tool, HistoryState } from '@/types';
import { normalizeFrame, doRectsIntersect } from '@/utils/canvas';
import {
  getCwd,
  loadFramesFromDirectory,
  syncFrameToFileSystem,
  deleteFrameDirectory,
  createFrameDirectory,
  watchDirectory,
  readFrameData,
  getFrameDirectoryName,
} from '@/services/fileSystem';
import { DirectoryChangeEvent } from '@/types/electron';

interface CanvasActions {
  // File system actions
  initializeFromFileSystem: () => Promise<void>;
  loadFramesFromFS: () => Promise<void>;
  syncFrameToFS: (frame: Frame) => Promise<void>;
  handleDirectoryChange: (event: DirectoryChangeEvent) => Promise<void>;

  // Frame actions
  addFrame: (frame: Omit<Frame, 'id'>) => Promise<void>;
  updateFrame: (id: string, updates: Partial<Frame>) => Promise<void>;
  deleteFrame: (id: string) => Promise<void>;
  deleteFrames: (ids: string[]) => Promise<void>;
  duplicateFrames: (ids: string[]) => Promise<void>;

  // Selection actions
  selectFrame: (id: string, multi?: boolean) => void;
  selectFrames: (ids: string[]) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Camera actions
  setCamera: (camera: Partial<AppState['camera']>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  resetCamera: () => void;

  // Tool actions
  setTool: (tool: Tool) => void;
  setSpacePressed: (pressed: boolean) => void;

  // Drag state actions
  setDragState: (state: Partial<AppState['dragState']>) => void;
  setSelectionBox: (box: AppState['selectionBox']) => void;
  setHoveredFrame: (id: string | null) => void;

  // Settings actions
  toggleSnapToGrid: () => void;
  toggleGrid: () => void;
  setGridSize: (size: number) => void;

  // History actions
  undo: () => void;
  redo: () => void;
  saveHistory: () => void;

  // Utility actions
  getSelectedFrames: () => Frame[];
  getFrame: (id: string) => Frame | undefined;
}

const AUTO_LAYOUT_GAP = 120;
const AUTO_LAYOUT_MAX_ROW_WIDTH = 2400;

const cloneFrame = (frame: Frame): Frame => ({
  ...frame,
  metadata: frame.metadata ? { ...frame.metadata } : undefined,
});

const framesOverlap = (frames: Frame[]): boolean => {
  for (let i = 0; i < frames.length; i++) {
    for (let j = i + 1; j < frames.length; j++) {
      const a = frames[i];
      const b = frames[j];
      if (
        doRectsIntersect(
          a.x,
          a.y,
          a.width,
          a.height,
          b.x,
          b.y,
          b.width,
          b.height
        )
      ) {
        return true;
      }
    }
  }
  return false;
};

const autoLayoutFrames = (frames: Frame[]): Frame[] => {
  if (frames.length <= 1) {
    return frames;
  }

  const arranged = frames.map(cloneFrame);
  if (!framesOverlap(arranged)) {
    return frames;
  }

  const entries = arranged.map((frame) => frame);
  entries.sort((a, b) => a.name.localeCompare(b.name));

  let currentX = 0;
  let currentY = 0;
  let rowHeight = 0;

  entries.forEach((frame) => {
    if (currentX > 0 && currentX + frame.width > AUTO_LAYOUT_MAX_ROW_WIDTH) {
      currentX = 0;
      currentY += rowHeight + AUTO_LAYOUT_GAP;
      rowHeight = 0;
    }

    frame.x = currentX;
    frame.y = currentY;

    rowHeight = Math.max(rowHeight, frame.height);
    currentX += frame.width + AUTO_LAYOUT_GAP;
  });

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  arranged.forEach((frame) => {
    minX = Math.min(minX, frame.x);
    minY = Math.min(minY, frame.y);
    maxX = Math.max(maxX, frame.x + frame.width);
    maxY = Math.max(maxY, frame.y + frame.height);
  });

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  arranged.forEach((frame) => {
    frame.x = Math.round(frame.x - centerX);
    frame.y = Math.round(frame.y - centerY);
  });

  return arranged;
};

const createInitialState = (): Omit<AppState, keyof CanvasActions> => ({
  frames: [],
  selectedIds: [],
  camera: { x: 0, y: 0, zoom: 1 },
  currentWorkingDir: '',
  isLoadingFromFS: false,
  currentTool: 'select',
  isSpacePressed: false,
  dragState: {
    isDragging: false,
    startPoint: null,
    dragOffset: null,
    resizeHandle: null,
    initialFrames: null,
    lastScreenPoint: null,
  },
  selectionBox: null,
  hoveredFrameId: null,
  snapToGrid: false,
  gridSize: 20,
  showGrid: true,
  history: [],
  historyIndex: -1,
  maxHistory: 50,
});

export const useCanvasStore = create<AppState & CanvasActions>((set, get) => ({
  ...createInitialState(),

  // File system actions
  initializeFromFileSystem: async () => {
    try {
      const cwd = await getCwd();
      console.log('🔍 [DEBUG] Current working directory:', cwd);
      console.log('🔍 [DEBUG] Running in Electron:', typeof window !== 'undefined' && window.electronAPI !== undefined);
      set({ currentWorkingDir: cwd, isLoadingFromFS: true });

      // Load frames from directory
      await get().loadFramesFromFS();

      const loadedFrames = get().frames;
      if (loadedFrames.length > 0) {
        get().zoomToFit();
      }

      // Start watching for changes
      watchDirectory(cwd, (event) => {
        get().handleDirectoryChange(event);
      });

      set({ isLoadingFromFS: false });
    } catch (error) {
      console.error('Failed to initialize from file system:', error);
      set({ isLoadingFromFS: false });
    }
  },

  loadFramesFromFS: async () => {
    const { currentWorkingDir } = get();
    if (!currentWorkingDir) return;

    try {
      set({ isLoadingFromFS: true });
      const frames = await loadFramesFromDirectory(currentWorkingDir);
      console.log('🔍 [DEBUG] Loaded frames:', frames.length, 'from', currentWorkingDir);
      const arrangedFrames = autoLayoutFrames(frames);
      const layoutApplied = arrangedFrames !== frames;

      set({ frames: arrangedFrames });

      if (layoutApplied) {
        for (const frame of arrangedFrames) {
          await get().syncFrameToFS(frame);
        }
      }
    } catch (error) {
      console.error('Failed to load frames from file system:', error);
    } finally {
      set({ isLoadingFromFS: false });
    }
  },

  syncFrameToFS: async (frame: Frame) => {
    const { currentWorkingDir } = get();
    if (!currentWorkingDir) return;

    try {
      await syncFrameToFileSystem(frame, currentWorkingDir);
    } catch (error) {
      console.error('Failed to sync frame to file system:', error);
    }
  },

  handleDirectoryChange: async (event: DirectoryChangeEvent) => {
    console.log('Directory change detected:', event);

    if (event.type === 'added') {
      // New directory added - load its frame.json
      const frameData = await readFrameData(event.path);
      if (frameData) {
        const htmlPath = `${event.path}/index.html`;
        const hasHtml = typeof window !== 'undefined'
          ? await window.electronAPI?.fileExists?.(htmlPath)
          : false;
        set(
          produce((state: AppState) => {
            // Check if frame already exists
            const existingIndex = state.frames.findIndex((f) => f.id === frameData.id);
            if (existingIndex === -1) {
              state.frames.push({
                ...frameData,
                metadata: { dirPath: event.path, htmlPath: hasHtml ? htmlPath : undefined },
              });
            }
          })
        );
      }
    } else if (event.type === 'removed') {
      // Directory removed - remove frame
      set(
        produce((state: AppState) => {
          state.frames = state.frames.filter((f) => f.metadata?.dirPath !== event.path);
          state.selectedIds = state.selectedIds.filter(
            (id) => !state.frames.find((f) => f.id === id && f.metadata?.dirPath === event.path)
          );
        })
      );
    } else if (event.type === 'changed') {
      // frame.json changed - reload frame data
      const frameData = await readFrameData(event.path);
      if (frameData) {
        const htmlPath = `${event.path}/index.html`;
        const hasHtml = typeof window !== 'undefined'
          ? await window.electronAPI?.fileExists?.(htmlPath)
          : false;
        set(
          produce((state: AppState) => {
            const index = state.frames.findIndex((f) => f.metadata?.dirPath === event.path);
            if (index !== -1) {
              state.frames[index] = {
                ...frameData,
                metadata: {
                  dirPath: event.path,
                  htmlPath: hasHtml ? htmlPath : undefined,
                },
              };
            }
          })
        );
      }
    }
  },

  // Frame actions
  addFrame: async (frameData) => {
    const { currentWorkingDir } = get();

    const newFrame: Frame = {
      ...frameData,
      id: nanoid(),
    };

    const normalized = normalizeFrame(newFrame);

    // Add to state first
    set(
      produce((state: AppState) => {
        state.frames.push(normalized);
      })
    );

    // Sync to file system
    if (currentWorkingDir) {
      const dirName = getFrameDirectoryName(normalized);
      const dirPath = await createFrameDirectory(currentWorkingDir, dirName, normalized);
      if (dirPath) {
        // Update frame with directory path
        set(
          produce((state: AppState) => {
            const frame = state.frames.find((f) => f.id === normalized.id);
            if (frame) {
              frame.metadata = { dirPath };
            }
          })
        );
      }
    }

    get().saveHistory();
  },

  updateFrame: async (id, updates) => {
    set(
      produce((state: AppState) => {
        const frame = state.frames.find((f) => f.id === id);
        if (frame) {
          Object.assign(frame, updates);
        }
      })
    );

    // Sync to file system
    const frame = get().frames.find((f) => f.id === id);
    if (frame) {
      await get().syncFrameToFS(frame);
    }
  },

  deleteFrame: async (id) => {
    const frame = get().frames.find((f) => f.id === id);

    set(
      produce((state: AppState) => {
        state.frames = state.frames.filter((f) => f.id !== id);
        state.selectedIds = state.selectedIds.filter((selectedId) => selectedId !== id);
      })
    );

    // Delete from file system
    if (frame?.metadata?.dirPath) {
      await deleteFrameDirectory(frame.metadata.dirPath);
    }

    get().saveHistory();
  },

  deleteFrames: async (ids) => {
    const framesToDelete = get().frames.filter((f) => ids.includes(f.id));

    set(
      produce((state: AppState) => {
        state.frames = state.frames.filter((f) => !ids.includes(f.id));
        state.selectedIds = state.selectedIds.filter((selectedId) => !ids.includes(selectedId));
      })
    );

    // Delete from file system
    for (const frame of framesToDelete) {
      if (frame.metadata?.dirPath) {
        await deleteFrameDirectory(frame.metadata.dirPath);
      }
    }

    get().saveHistory();
  },

  duplicateFrames: async (ids) => {
    const { currentWorkingDir } = get();
    const framesToDuplicate = get().frames.filter((f) => ids.includes(f.id));
    const newFrames = framesToDuplicate.map((frame) => ({
      ...frame,
      id: nanoid(),
      name: `${frame.name} Copy`,
      x: frame.x + 20,
      y: frame.y + 20,
      metadata: undefined, // Will be set after creating directory
    }));

    set(
      produce((state: AppState) => {
        state.frames.push(...newFrames);
        state.selectedIds = newFrames.map((f) => f.id);
      })
    );

    // Create directories for duplicated frames
    if (currentWorkingDir) {
      for (const frame of newFrames) {
        const dirName = getFrameDirectoryName(frame);
        const dirPath = await createFrameDirectory(currentWorkingDir, dirName, frame);
        if (dirPath) {
          set(
            produce((state: AppState) => {
              const f = state.frames.find((fr) => fr.id === frame.id);
              if (f) {
                f.metadata = { dirPath };
              }
            })
          );
        }
      }
    }

    get().saveHistory();
  },

  // Selection actions
  selectFrame: (id, multi = false) => {
    set(
      produce((state: AppState) => {
        if (multi) {
          if (state.selectedIds.includes(id)) {
            state.selectedIds = state.selectedIds.filter((selectedId) => selectedId !== id);
          } else {
            state.selectedIds.push(id);
          }
        } else {
          state.selectedIds = [id];
        }
      })
    );
  },

  selectFrames: (ids) => {
    set({ selectedIds: ids });
  },

  clearSelection: () => {
    set({ selectedIds: [] });
  },

  selectAll: () => {
    set((state) => ({ selectedIds: state.frames.map((f) => f.id) }));
  },

  // Camera actions
  setCamera: (camera) => {
    set(
      produce((state: AppState) => {
        Object.assign(state.camera, camera);
      })
    );
  },

  zoomIn: () => {
    set(
      produce((state: AppState) => {
        state.camera.zoom = Math.min(10, state.camera.zoom * 1.2);
      })
    );
  },

  zoomOut: () => {
    set(
      produce((state: AppState) => {
        state.camera.zoom = Math.max(0.1, state.camera.zoom / 1.2);
      })
    );
  },

  zoomToFit: () => {
    const { frames } = get();
    if (frames.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    frames.forEach((frame) => {
      minX = Math.min(minX, frame.x);
      minY = Math.min(minY, frame.y);
      maxX = Math.max(maxX, frame.x + frame.width);
      maxY = Math.max(maxY, frame.y + frame.height);
    });

    const width = maxX - minX;
    const height = maxY - minY;
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const canvasWidth = window.innerWidth - 520;
    const canvasHeight = window.innerHeight;

    const zoomX = canvasWidth / width;
    const zoomY = canvasHeight / height;
    const zoom = Math.min(zoomX, zoomY, 1) * 0.8;

    set({
      camera: {
        x: -centerX,
        y: -centerY,
        zoom,
      },
    });
  },

  resetCamera: () => {
    set({
      camera: { x: 0, y: 0, zoom: 1 },
    });
  },

  // Tool actions
  setTool: (tool) => {
    set({ currentTool: tool });
  },

  setSpacePressed: (pressed) => {
    set({ isSpacePressed: pressed });
  },

  // Drag state actions
  setDragState: (state) => {
    set(
      produce((s: AppState) => {
        Object.assign(s.dragState, state);
      })
    );
  },

  setSelectionBox: (box) => {
    set({ selectionBox: box });
  },

  setHoveredFrame: (id) => {
    set({ hoveredFrameId: id });
  },

  // Settings actions
  toggleSnapToGrid: () => {
    set((state) => ({ snapToGrid: !state.snapToGrid }));
  },

  toggleGrid: () => {
    set((state) => ({ showGrid: !state.showGrid }));
  },

  setGridSize: (size) => {
    set({ gridSize: Math.max(5, Math.min(100, size)) });
  },

  // History actions
  saveHistory: () => {
    set(
      produce((state: AppState) => {
        const historyState: HistoryState = {
          frames: JSON.parse(JSON.stringify(state.frames)),
          selectedIds: [...state.selectedIds],
          camera: { ...state.camera },
        };

        state.history = state.history.slice(0, state.historyIndex + 1);
        state.history.push(historyState);

        if (state.history.length > state.maxHistory) {
          state.history.shift();
        } else {
          state.historyIndex++;
        }
      })
    );
  },

  undo: () => {
    const { history, historyIndex } = get();
    if (historyIndex > 0) {
      const prevState = history[historyIndex - 1];
      set({
        frames: JSON.parse(JSON.stringify(prevState.frames)),
        selectedIds: [...prevState.selectedIds],
        camera: { ...prevState.camera },
        historyIndex: historyIndex - 1,
      });
    }
  },

  redo: () => {
    const { history, historyIndex } = get();
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      set({
        frames: JSON.parse(JSON.stringify(nextState.frames)),
        selectedIds: [...nextState.selectedIds],
        camera: { ...nextState.camera },
        historyIndex: historyIndex + 1,
      });
    }
  },

  // Utility actions
  getSelectedFrames: () => {
    const { frames, selectedIds } = get();
    return frames.filter((f) => selectedIds.includes(f.id));
  },

  getFrame: (id) => {
    return get().frames.find((f) => f.id === id);
  },
}));
