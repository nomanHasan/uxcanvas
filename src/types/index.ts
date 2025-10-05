export type Tool = 'select' | 'frame' | 'pan';

export interface Point {
  x: number;
  y: number;
}

export interface Frame {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
  locked: boolean;
  visible: boolean;
  opacity: number;
  metadata?: {
    dirPath?: string;
    htmlPath?: string; // Path to index.html file
  };
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface SelectionBox {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

export type ResizeHandle =
  | 'nw' | 'n' | 'ne'
  | 'w' | 'e'
  | 'sw' | 's' | 'se'
  | null;

export interface DragState {
  isDragging: boolean;
  startPoint: Point | null;
  dragOffset: Point | null;
  resizeHandle: ResizeHandle;
}

export interface HistoryState {
  frames: Frame[];
  selectedIds: string[];
  camera: Camera;
}

export interface AppState {
  // Canvas state
  frames: Frame[];
  selectedIds: string[];
  camera: Camera;

  // File system
  currentWorkingDir: string;
  isLoadingFromFS: boolean;

  // UI state
  currentTool: Tool;
  isSpacePressed: boolean;
  dragState: DragState;
  selectionBox: SelectionBox | null;
  hoveredFrameId: string | null;

  // Settings
  snapToGrid: boolean;
  gridSize: number;
  showGrid: boolean;

  // History
  history: HistoryState[];
  historyIndex: number;
  maxHistory: number;
}
