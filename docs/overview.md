# 🎯 Infinite Canvas Implementation - Complete Technical Overview

## 📚 Tech Stack & Library Choices

### Core Technologies
```
React 18.3        → Component architecture & rendering
TypeScript 5.5    → Type safety & developer experience
Zustand 4.5       → Lightweight state management (3kb)
Immer 10.1        → Immutable state updates
Tailwind CSS 3.4  → Utility-first styling
Vite 5.3          → Fast build tool & HMR
```

### Why These Choices?

**Zustand over Redux:**
- 3kb vs 15kb+ (smaller bundle)
- No boilerplate, no providers
- Direct store access outside React
- Built-in immer middleware support

**Canvas API over SVG:**
- Better performance for many elements
- Pixel-perfect control
- Easier coordinate transformations
- Lower memory footprint

**Immer for History:**
- Simplified immutable updates
- Structural sharing (efficient)
- Clean syntax with `produce()`

---

## 🏗️ Architectural Decisions

### 1. **Coordinate System Architecture**

The most crucial decision: **Separate World Space from Screen Space**

```typescript
// src/utils/canvas.ts

/**
 * WORLD SPACE: The infinite canvas coordinate system
 * SCREEN SPACE: The visible viewport (canvas element)
 *
 * Camera acts as the transform between them
 */

export function screenToWorld(
  screenX: number,
  screenY: number,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
): Point {
  // 1. Translate to origin (center of screen)
  // 2. Scale by inverse zoom
  // 3. Offset by camera position
  return {
    x: (screenX - canvasWidth / 2) / camera.zoom - camera.x,
    y: (screenY - canvasHeight / 2) / camera.zoom - camera.y,
  };
}

export function worldToScreen(
  worldX: number,
  worldY: number,
  camera: Camera,
  canvasWidth: number,
  canvasHeight: number
): Point {
  // Inverse operation: world → screen
  return {
    x: (worldX + camera.x) * camera.zoom + canvasWidth / 2,
    y: (worldY + camera.y) * camera.zoom + canvasHeight / 2,
  };
}
```

**Why this matters:**
- Frames are stored in **world coordinates** (absolute, zoom-independent)
- Mouse events come in **screen coordinates**
- Camera transformation is the **single source of truth**

---

### 2. **State Management Architecture**

**Single Zustand Store with Domain Separation**

```typescript
// src/store/useCanvasStore.ts

interface AppState {
  // Domain: Canvas Data (persistent)
  frames: Frame[];
  selectedIds: string[];
  camera: Camera;

  // Domain: UI State (ephemeral)
  currentTool: Tool;
  dragState: DragState;
  selectionBox: SelectionBox | null;
  hoveredFrameId: string | null;

  // Domain: Settings (persistent)
  snapToGrid: boolean;
  gridSize: number;
  showGrid: boolean;

  // Domain: History (undo/redo)
  history: HistoryState[];
  historyIndex: number;
}
```

**Key Pattern: Actions Co-located with State**

```typescript
export const useCanvasStore = create<AppState & CanvasActions>((set, get) => ({
  // State
  frames: [],
  selectedIds: [],

  // Actions use Immer for immutability
  updateFrame: (id, updates) => {
    set(
      produce((state: AppState) => {
        const frame = state.frames.find((f) => f.id === id);
        if (frame) {
          Object.assign(frame, updates); // Immer makes this immutable!
        }
      })
    );
  },

  // Complex actions can access other actions via get()
  zoomToFit: () => {
    const { frames } = get();
    // ... calculate bounds and update camera
  },
}));
```

---

### 3. **Rendering Pipeline Architecture**

**RequestAnimationFrame Loop with React Integration**

```typescript
// src/components/Canvas.tsx

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Render function is pure - no side effects
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!canvas || !ctx) return;

    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;

    // 1. Clear
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    // 2. Draw grid (world space → screen space)
    drawGrid(ctx, width, height);

    // 3. Draw frames (world space → screen space)
    frames.forEach((frame) => {
      drawFrame(ctx, frame, width, height, isSelected, isHovered);
    });

    // 4. Draw UI overlays (selection box, etc.)
    drawSelectionBox(ctx, width, height);
  }, [frames, selectedIds, camera, gridSize, showGrid]);

  // Animation loop setup
  useEffect(() => {
    const animate = () => {
      render();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [render]);
}
```

**Why RAF instead of React re-renders:**
- 60 FPS rendering independent of React
- Smooth animations during pan/zoom
- Prevents render thrashing
- Canvas updates are GPU-accelerated

---

### 4. **Grid Rendering with Adaptive Detail**

**Smart Grid that Adjusts to Zoom Level**

```typescript
const drawGrid = useCallback(
  (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!showGrid) return;

    const effectiveGridSize = gridSize * camera.zoom;

    // Performance optimization: Don't draw tiny grids
    if (effectiveGridSize < 5) return;

    ctx.save();

    // Calculate offset based on camera position
    const offsetX = (camera.x * camera.zoom + width / 2) % effectiveGridSize;
    const offsetY = (camera.y * camera.zoom + height / 2) % effectiveGridSize;

    // Draw vertical lines
    for (let x = offsetX; x < width; x += effectiveGridSize) {
      const worldX = Math.round((x - width / 2) / camera.zoom - camera.x);
      // Major lines every 5 grid units
      ctx.strokeStyle = worldX % (gridSize * 5) === 0 ? '#353535' : '#2a2a2a';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw horizontal lines (same pattern)
    for (let y = offsetY; y < height; y += effectiveGridSize) {
      // ... similar logic
    }

    ctx.restore();
  },
  [camera, gridSize, showGrid]
);
```

**Key Insight:** The grid is infinite but we only draw what's visible, and the offset calculation ensures seamless panning.

---

### 5. **Pan & Zoom with Cursor-Centered Zooming**

**The "Google Maps" Zoom Effect**

```typescript
const handleWheel = useCallback(
  (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;

    // 1. Get world position BEFORE zoom
    const worldPosBefore = screenToWorld(screenX, screenY, camera, rect.width, rect.height);

    // 2. Calculate new zoom
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(10, camera.zoom * zoomFactor));

    // 3. Get world position AFTER zoom (with same screen coordinates)
    const worldPosAfter = screenToWorld(
      screenX,
      screenY,
      { ...camera, zoom: newZoom },
      rect.width,
      rect.height
    );

    // 4. Adjust camera to keep cursor at same world position
    setCamera({
      x: camera.x + (worldPosAfter.x - worldPosBefore.x),
      y: camera.y + (worldPosAfter.y - worldPosBefore.y),
      zoom: newZoom,
    });
  },
  [camera, setCamera]
);
```

**Why this works:**
1. Mouse stays at same world point during zoom
2. Camera translates to compensate for zoom
3. Creates illusion of zooming "into" the cursor position

---

### 6. **Frame Manipulation State Machine**

**Complex Interaction Handling**

```typescript
// Mouse Down - Determine interaction type
const handleMouseDown = useCallback((e: React.MouseEvent) => {
  const worldPos = screenToWorld(screenX, screenY, camera, rect.width, rect.height);

  if (currentTool === 'select') {
    // Priority 1: Check resize handles on selected frames
    for (const frame of selectedFrames) {
      const handle = getResizeHandle(screenX, screenY, frame, camera, ...);
      if (handle) {
        setDragState({
          isDragging: true,
          startPoint: worldPos,
          resizeHandle: handle,  // 'nw', 'n', 'ne', etc.
        });
        return;
      }
    }

    // Priority 2: Check frame click
    let clickedFrame = null;
    for (let i = frames.length - 1; i >= 0; i--) {
      if (isPointInFrame(worldPos, frames[i])) {
        clickedFrame = frames[i];
        break;
      }
    }

    if (clickedFrame) {
      selectFrame(clickedFrame.id, e.shiftKey || e.metaKey);
      setDragState({
        isDragging: true,
        startPoint: worldPos,
        dragOffset: {
          x: worldPos.x - clickedFrame.x,
          y: worldPos.y - clickedFrame.y,
        },
      });
    } else {
      // Priority 3: Start selection box
      clearSelection();
      setSelectionBox({
        startX: worldPos.x,
        startY: worldPos.y,
        endX: worldPos.x,
        endY: worldPos.y,
      });
    }
  }
}, [camera, frames, selectedIds, currentTool]);
```

**State Machine Visualization:**
```
IDLE → MOUSEDOWN → DRAGGING → MOUSEUP → IDLE
              ↓
         ┌────┴────┐
         │         │
    RESIZE    MOVE    SELECTION_BOX
         │         │
         └────┬────┘
              ↓
           MOUSEUP
```

---

### 7. **Resize Handle System**

**8-Point Resize with Directional Constraints**

```typescript
// Mouse Move - Handle resizing
if (dragState.resizeHandle) {
  const dx = worldPos.x - dragState.startPoint.x;
  const dy = worldPos.y - dragState.startPoint.y;

  selectedIds.forEach((id) => {
    const frame = frames.find((f) => f.id === id);
    if (!frame || frame.locked) return;

    const updates: Partial<Frame> = {};
    const handle = dragState.resizeHandle!; // 'nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'

    // West handles: move left edge
    if (handle.includes('w')) {
      updates.width = frame.width - dx;
      updates.x = frame.x + dx;
    }
    // East handles: move right edge
    if (handle.includes('e')) {
      updates.width = frame.width + dx;
    }
    // North handles: move top edge
    if (handle.includes('n')) {
      updates.height = frame.height - dy;
      updates.y = frame.y + dy;
    }
    // South handles: move bottom edge
    if (handle.includes('s')) {
      updates.height = frame.height + dy;
    }

    // Apply snap to grid if enabled
    if (snapToGrid && updates.x !== undefined) {
      updates.x = snapValueToGrid(updates.x, gridSize);
    }

    updateFrame(id, updates);
  });

  // Update start point for next delta
  setDragState({ startPoint: worldPos });
}
```

**Handle Detection:**

```typescript
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
  const threshold = 10; // Hit area in pixels

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
    const distance = Math.sqrt(
      Math.pow(screenX - handle.x, 2) + Math.pow(screenY - handle.y, 2)
    );
    if (distance < threshold) {
      return handle.name;
    }
  }

  return null;
}
```

---

### 8. **Undo/Redo with History Management**

**Snapshot-Based History using Immer**

```typescript
// Store snapshot whenever a mutation completes
saveHistory: () => {
  set(
    produce((state: AppState) => {
      // Create deep copy of current state
      const historyState: HistoryState = {
        frames: JSON.parse(JSON.stringify(state.frames)),
        selectedIds: [...state.selectedIds],
        camera: { ...state.camera },
      };

      // Remove any redo history (new timeline)
      state.history = state.history.slice(0, state.historyIndex + 1);

      // Add new state
      state.history.push(historyState);

      // Limit history size to prevent memory bloat
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
```

**When to save history:**
```typescript
// After mouse up (not during drag)
const handleMouseUp = useCallback(() => {
  if (dragState.isDragging && (dragState.dragOffset || dragState.resizeHandle)) {
    saveHistory(); // Save after move/resize
  }
  // Reset drag state
}, [dragState]);

// After adding/deleting frames
addFrame: (frameData) => {
  set(produce((state) => {
    state.frames.push(newFrame);
  }));
  get().saveHistory(); // Immediate save
},
```

---

### 9. **Keyboard Shortcuts Hook**

**Global Event Listener with Context Awareness**

```typescript
// src/hooks/useKeyboardShortcuts.ts

export function useKeyboardShortcuts() {
  const { setTool, undo, redo, deleteFrames, selectedIds } = useCanvasStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

      // Don't capture if typing in input
      if (e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Space for temporary pan (prevent repeat)
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpacePressed(true);
        return;
      }

      // Undo/Redo with platform-specific modifiers
      if (cmdOrCtrl && e.key === 'z') {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
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
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        e.preventDefault();
        deleteFrames(selectedIds);
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
  }, [selectedIds]); // Re-bind when dependencies change
}
```

---

### 10. **High DPI Display Support**

**Crisp Rendering on Retina Displays**

```typescript
const resizeCanvas = useCallback(() => {
  const canvas = canvasRef.current;
  if (!canvas) return;

  const rect = canvas.getBoundingClientRect();

  // Set internal resolution based on device pixel ratio
  canvas.width = rect.width * window.devicePixelRatio;
  canvas.height = rect.height * window.devicePixelRatio;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Scale context to match device pixel ratio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
}, []);

// All rendering uses logical pixels (rect.width)
// Canvas automatically scales to physical pixels
const width = canvas.width / window.devicePixelRatio;
const height = canvas.height / window.devicePixelRatio;
```

---

## 🎯 Critical Edge Cases Handled

### 1. **Negative Frame Dimensions**

```typescript
export function normalizeFrame(frame: Frame): Frame {
  const bounds = getFrameBounds(frame);
  return {
    ...frame,
    x: bounds.x,
    y: bounds.y,
    width: Math.abs(bounds.width),
    height: Math.abs(bounds.height),
  };
}

// Called after frame creation
addFrame: (frameData) => {
  const newFrame = { ...frameData, id: nanoid() };
  state.frames.push(normalizeFrame(newFrame)); // Always positive
}
```

### 2. **Multi-Selection Bounds**

```typescript
export function getSelectionBounds(frames: Frame[]) {
  if (frames.length === 0) return null;

  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  frames.forEach(frame => {
    const bounds = getFrameBounds(frame);
    minX = Math.min(minX, bounds.x);
    minY = Math.min(minY, bounds.y);
    maxX = Math.max(maxX, bounds.x + bounds.width);
    maxY = Math.max(maxY, bounds.y + bounds.height);
  });

  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}
```

### 3. **Intersection Detection for Selection Box**

```typescript
export function doRectsIntersect(
  x1: number, y1: number, w1: number, h1: number,
  x2: number, y2: number, w2: number, h2: number
): boolean {
  return !(x1 + w1 < x2 || x2 + w2 < x1 || y1 + h1 < y2 || y2 + h2 < y1);
}

// Used during selection box drag
const selectedInBox = frames.filter((frame) =>
  doRectsIntersect(
    selectionBox.minX, selectionBox.minY, selectionBox.width, selectionBox.height,
    frame.x, frame.y, frame.width, frame.height
  )
);
```

---

## 📊 Performance Optimizations

### 1. **useCallback Memoization**
```typescript
// Prevent render function from changing on every render
const render = useCallback(() => {
  // Rendering logic
}, [frames, camera, selectedIds]); // Only recreate when these change
```

### 2. **Zustand Selectors**
```typescript
// Only re-render when specific slice changes
const camera = useCanvasStore((state) => state.camera);
// vs
const { camera } = useCanvasStore(); // Re-renders on ANY state change
```

### 3. **Grid Rendering Optimization**
```typescript
if (effectiveGridSize < 5) return; // Don't draw invisible grid
```

### 4. **Structural Sharing with Immer**
```typescript
// Immer only creates new objects for changed parts
produce((state) => {
  state.frames[0].x = 100; // Only frames[0] is new, rest are shared
})
```

---

## 🔑 Key Takeaways

1. **World vs Screen Space** - The foundation of infinite canvas
2. **RAF Loop** - Smooth 60 FPS independent of React
3. **Zustand + Immer** - Clean state management with immutability
4. **Camera Transform** - Single source of truth for view
5. **Event State Machine** - Handle complex interactions
6. **Snapshot History** - Simple undo/redo implementation
7. **High DPI Scaling** - Crisp on all displays
8. **Edge Case Handling** - Normalize, clamp, validate

The architecture is **extensible** - adding text, images, or vector shapes follows the same pattern: store in world coordinates, transform for rendering, handle interactions through the same event pipeline.

---

## 🚀 Future Extension Points

### Adding New Tools

```typescript
// 1. Add tool type
export type Tool = 'select' | 'frame' | 'pan' | 'text' | 'image';

// 2. Add tool state to store
interface AppState {
  currentTool: Tool;
  textState?: { content: string; fontSize: number };
}

// 3. Handle in mouse events
if (currentTool === 'text') {
  // Create text element at worldPos
}

// 4. Add render logic
if (element.type === 'text') {
  drawText(ctx, element, width, height, isSelected);
}
```

### Adding Collaborative Features

```typescript
// 1. Add WebSocket connection
const ws = new WebSocket('ws://server');

// 2. Broadcast frame updates
updateFrame: (id, updates) => {
  set(produce((state) => {
    // ... update logic
  }));
  ws.send({ type: 'UPDATE_FRAME', id, updates });
}

// 3. Receive remote updates
ws.onmessage = (msg) => {
  const { type, payload } = JSON.parse(msg.data);
  if (type === 'UPDATE_FRAME') {
    useCanvasStore.getState().updateFrame(payload.id, payload.updates);
  }
}
```

### Adding Export Functionality

```typescript
// Export to PNG
export function exportToPNG(frames: Frame[], camera: Camera) {
  const bounds = getSelectionBounds(frames);
  if (!bounds) return;

  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = bounds.width;
  tempCanvas.height = bounds.height;

  const ctx = tempCanvas.getContext('2d')!;

  // Render frames to temporary canvas
  frames.forEach(frame => {
    ctx.fillStyle = frame.color;
    ctx.fillRect(
      frame.x - bounds.x,
      frame.y - bounds.y,
      frame.width,
      frame.height
    );
  });

  // Download
  const dataUrl = tempCanvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = 'canvas-export.png';
  link.href = dataUrl;
  link.click();
}
```

---

## 📖 Additional Resources

- [Canvas API Reference](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Immer Documentation](https://immerjs.github.io/immer/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)

---

**Last Updated:** 2025-10-04
**Version:** 1.0.0
