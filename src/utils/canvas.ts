import { Point, Camera, Frame, ResizeHandle } from '@/types';

/**
 * Transform screen coordinates to world coordinates
 */
export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
): Point {
  return {
    x: (screenX - canvasWidth / 2) / camera.zoom - camera.x,
    y: (screenY - canvasHeight / 2) / camera.zoom - camera.y,
  };
}

/**
 * Transform world coordinates to screen coordinates
 */
export function worldToScreen(
  worldX: number,
  worldY: number,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
): Point {
  return {
    x: (worldX + camera.x) * camera.zoom + canvasWidth / 2,
    y: (worldY + camera.y) * camera.zoom + canvasHeight / 2,
  };
}

/**
 * Check if a point is inside a frame
 */
export function isPointInFrame(point: Point, frame: Frame): boolean {
  return (
    point.x >= frame.x &&
    point.x <= frame.x + frame.width &&
    point.y >= frame.y &&
    point.y <= frame.y + frame.height
  );
}

/**
 * Check if two rectangles intersect
 */
export function doRectsIntersect(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): boolean {
  return !(x1 + w1 < x2 || x2 + w2 < x1 || y1 + h1 < y2 || y2 + h2 < y1);
}

/**
 * Snap value to grid
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Get resize handle at screen position
 */
export function getResizeHandle(
  screenX: number,
  screenY: number,
  frame: Frame,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
): ResizeHandle {
  const screenPos = worldToScreen(frame.x, frame.y, camera, canvasWidth, canvasHeight);
  const width = frame.width * camera.zoom;
  const height = frame.height * camera.zoom;
  const handleSize = 8;
  const threshold = handleSize + 2;

  const handles: { name: ResizeHandle; x: number; y: number }[] = [
    { name: 'nw', x: screenPos.x, y: screenPos.y },
    { name: 'n', x: screenPos.x + width / 2, y: screenPos.y },
    { name: 'ne', x: screenPos.x + width, y: screenPos.y },
    { name: 'w', x: screenPos.x, y: screenPos.y + height / 2 },
    { name: 'e', x: screenPos.x + width, y: screenPos.y + height / 2 },
    { name: 'sw', x: screenPos.x, y: screenPos.y + height },
    { name: 's', x: screenPos.x + width / 2, y: screenPos.y + height },
    { name: 'se', x: screenPos.x + width, y: screenPos.y + height },
  ];

  for (const handle of handles) {
    const dx = screenX - handle.x;
    const dy = screenY - handle.y;
    if (Math.sqrt(dx * dx + dy * dy) < threshold) {
      return handle.name;
    }
  }

  return null;
}

/**
 * Clamp number between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Get frame bounds (handles negative width/height)
 */
export function getFrameBounds(frame: Frame): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return {
    x: frame.width < 0 ? frame.x + frame.width : frame.x,
    y: frame.height < 0 ? frame.y + frame.height : frame.y,
    width: Math.abs(frame.width),
    height: Math.abs(frame.height),
  };
}

/**
 * Normalize frame (ensure positive width/height)
 */
export function normalizeFrame(frame: Frame): Frame {
  const bounds = getFrameBounds(frame);
  return {
    ...frame,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
}

/**
 * Get bounding box of multiple frames
 */
export function getSelectionBounds(frames: Frame[]): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (frames.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  frames.forEach(frame => {
    const bounds = getFrameBounds(frame);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Get cursor style for resize handle
 */
export function getCursorForHandle(handle: ResizeHandle): string {
  const cursors: Record<NonNullable<ResizeHandle>, string> = {
    nw: 'nwse-resize',
    n: 'ns-resize',
    ne: 'nesw-resize',
    w: 'ew-resize',
    e: 'ew-resize',
    sw: 'nesw-resize',
    s: 'ns-resize',
    se: 'nwse-resize',
  };

  return handle ? cursors[handle] : 'default';
}

/**
 * Generate random color
 */
export function randomColor(): string {
  const colors = [
    '#FF6B6B80', '#4ECDC480', '#45B7D180', '#FFA50780',
    '#9B59B680', '#3498DB80', '#E74C3C80', '#2ECC7180',
    '#F39C1280', '#1ABC9C80', '#D3545480', '#6C5CE780',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}
