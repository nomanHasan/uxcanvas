import { useEffect, useRef, useCallback } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import {
  screenToWorld,
  worldToScreen,
  isPointInFrame,
  getResizeHandle,
  getCursorForHandle,
  doRectsIntersect,
  snapToGrid as snapValueToGrid,
} from '@/utils/canvas';
import { Frame } from '@/types';

export function Canvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Store state
  const {
    frames,
    selectedIds,
    camera,
    currentTool,
    isSpacePressed,
    dragState,
    selectionBox,
    snapToGrid,
    gridSize,
    showGrid,
    hoveredFrameId,
    setCamera,
    setDragState,
    setSelectionBox,
    selectFrame,
    selectFrames,
    clearSelection,
    addFrame,
    updateFrame,
    setHoveredFrame,
    saveHistory,
  } = useCanvasStore();

  // Get canvas context
  const getContext = useCallback((): CanvasRenderingContext2D | null => {
    return canvasRef.current?.getContext('2d') ?? null;
  }, []);

  // Resize canvas to match display size
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * window.devicePixelRatio;
    canvas.height = rect.height * window.devicePixelRatio;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
  }, []);

  // Draw grid
  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      if (!showGrid) return;

      const effectiveGridSize = gridSize * camera.zoom;

      // Only draw grid if visible enough
      if (effectiveGridSize < 5) return;

      ctx.save();
      ctx.strokeStyle = '#2a2a2a';
      ctx.lineWidth = 1;

      const offsetX = (camera.x * camera.zoom + width / 2) % effectiveGridSize;
      const offsetY = (camera.y * camera.zoom + height / 2) % effectiveGridSize;

      // Draw vertical lines
      for (let x = offsetX; x < width; x += effectiveGridSize) {
        const worldX = Math.round((x - width / 2) / camera.zoom - camera.x);
        ctx.strokeStyle = worldX % (gridSize * 5) === 0 ? '#353535' : '#2a2a2a';
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw horizontal lines
      for (let y = offsetY; y < height; y += effectiveGridSize) {
        const worldY = Math.round((y - height / 2) / camera.zoom - camera.y);
        ctx.strokeStyle = worldY % (gridSize * 5) === 0 ? '#353535' : '#2a2a2a';
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      ctx.restore();
    },
    [camera, gridSize, showGrid]
  );

  // Draw a frame
  const drawFrame = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      frame: Frame,
      width: number,
      height: number,
      isSelected: boolean,
      isHovered: boolean
    ) => {
      if (!frame.visible) return;

      const screenPos = worldToScreen(frame.x, frame.y, camera, width, height);
      const frameWidth = frame.width * camera.zoom;
      const frameHeight = frame.height * camera.zoom;
      const hasHtml = !!frame.metadata?.htmlPath;

      ctx.save();
      ctx.globalAlpha = frame.opacity;

      // Only draw fill if frame doesn't have HTML content
      if (!hasHtml) {
        ctx.fillStyle = frame.color;
        ctx.fillRect(screenPos.x, screenPos.y, frameWidth, frameHeight);
      }

      // Draw border (more subtle if frame has HTML)
      if (hasHtml) {
        // Only show border when selected or hovered
        if (isSelected || isHovered) {
          ctx.strokeStyle = isSelected ? '#0d99ff' : '#666666';
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.strokeRect(screenPos.x, screenPos.y, frameWidth, frameHeight);
        }
      } else {
        // Always show border for non-HTML frames
        ctx.strokeStyle = isSelected ? '#0d99ff' : isHovered ? '#666666' : '#4a4a4a';
        ctx.lineWidth = isSelected ? 2 : 1;
        ctx.strokeRect(screenPos.x, screenPos.y, frameWidth, frameHeight);
      }

      // Draw resize handles if selected
      if (isSelected && camera.zoom > 0.3) {
        const handleSize = 8;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0d99ff';
        ctx.lineWidth = 2;

        const handles = [
          { x: screenPos.x, y: screenPos.y },
          { x: screenPos.x + frameWidth / 2, y: screenPos.y },
          { x: screenPos.x + frameWidth, y: screenPos.y },
          { x: screenPos.x, y: screenPos.y + frameHeight / 2 },
          { x: screenPos.x + frameWidth, y: screenPos.y + frameHeight / 2 },
          { x: screenPos.x, y: screenPos.y + frameHeight },
          { x: screenPos.x + frameWidth / 2, y: screenPos.y + frameHeight },
          { x: screenPos.x + frameWidth, y: screenPos.y + frameHeight },
        ];

        handles.forEach((handle) => {
          ctx.fillRect(
            handle.x - handleSize / 2,
            handle.y - handleSize / 2,
            handleSize,
            handleSize
          );
          ctx.strokeRect(
            handle.x - handleSize / 2,
            handle.y - handleSize / 2,
            handleSize,
            handleSize
          );
        });
      }

      // Draw label if zoomed in enough
      if (camera.zoom > 0.5) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `${Math.max(10, 12 * Math.min(camera.zoom, 1))}px sans-serif`;
        ctx.fillText(frame.name, screenPos.x + 8, screenPos.y + 20);
      }

      ctx.restore();
    },
    [camera]
  );

  // Draw selection box
  const drawSelectionBox = useCallback(
    (ctx: CanvasRenderingContext2D, width: number, height: number) => {
      if (!selectionBox) return;

      const start = worldToScreen(
        selectionBox.startX,
        selectionBox.startY,
        camera,
        width,
        height
      );
      const end = worldToScreen(selectionBox.endX, selectionBox.endY, camera, width, height);

      ctx.save();
      ctx.strokeStyle = '#0d99ff';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(start.x, start.y, end.x - start.x, end.y - start.y);

      ctx.fillStyle = '#0d99ff20';
      ctx.fillRect(start.x, start.y, end.x - start.x, end.y - start.y);

      ctx.restore();
    },
    [selectionBox, camera]
  );

  // Main render function
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (!canvas || !ctx) return;

    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;

    // Clear canvas
    ctx.fillStyle = '#1e1e1e';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    drawGrid(ctx, width, height);

    // Draw frames (back to front)
    frames.forEach((frame) => {
      const isSelected = selectedIds.includes(frame.id);
      const isHovered = hoveredFrameId === frame.id;
      drawFrame(ctx, frame, width, height, isSelected, isHovered);
    });

    // Draw selection box
    drawSelectionBox(ctx, width, height);
  }, [
    frames,
    selectedIds,
    hoveredFrameId,
    drawGrid,
    drawFrame,
    drawSelectionBox,
    getContext,
  ]);

  // Animation loop
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

  // Resize observer
  useEffect(() => {
    resizeCanvas();
    const resizeObserver = new ResizeObserver(resizeCanvas);
    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [resizeCanvas]);

  // Mouse down handler
  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPos = screenToWorld(screenX, screenY, camera, rect.width, rect.height);

      const effectiveTool = isSpacePressed ? 'pan' : currentTool;

      if (effectiveTool === 'select') {
        // Check for resize handles on selected frames
        const selectedFrames = frames.filter((f) => selectedIds.includes(f.id));
        for (const frame of selectedFrames) {
          const handle = getResizeHandle(screenX, screenY, frame, camera, rect.width, rect.height);
          if (handle) {
            setDragState({
              isDragging: true,
              startPoint: worldPos,
              resizeHandle: handle,
            });
            return;
          }
        }

        // Check for frame click
        let clickedFrame: Frame | null = null;
        for (let i = frames.length - 1; i >= 0; i--) {
          if (isPointInFrame(worldPos, frames[i])) {
            clickedFrame = frames[i];
            break;
          }
        }

        if (clickedFrame) {
          selectFrame(clickedFrame.id, e.shiftKey || e.metaKey || e.ctrlKey);
          setDragState({
            isDragging: true,
            startPoint: worldPos,
            dragOffset: {
              x: worldPos.x - clickedFrame.x,
              y: worldPos.y - clickedFrame.y,
            },
            resizeHandle: null,
          });
        } else {
          // Start selection box
          if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
            clearSelection();
          }
          setSelectionBox({
            startX: worldPos.x,
            startY: worldPos.y,
            endX: worldPos.x,
            endY: worldPos.y,
          });
        }
      } else if (effectiveTool === 'frame') {
        setDragState({
          isDragging: true,
          startPoint: worldPos,
          dragOffset: null,
          resizeHandle: null,
        });
      } else if (effectiveTool === 'pan') {
        setDragState({
          isDragging: true,
          startPoint: worldPos,
          dragOffset: null,
          resizeHandle: null,
        });
      }
    },
    [
      camera,
      frames,
      selectedIds,
      currentTool,
      isSpacePressed,
      selectFrame,
      clearSelection,
      setDragState,
      setSelectionBox,
    ]
  );

  // Mouse move handler
  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPos = screenToWorld(screenX, screenY, camera, rect.width, rect.height);

      const effectiveTool = isSpacePressed ? 'pan' : currentTool;

      // Update cursor based on context
      if (!dragState.isDragging) {
        if (effectiveTool === 'frame') {
          canvas.style.cursor = 'crosshair';
        } else if (effectiveTool === 'pan') {
          canvas.style.cursor = 'grab';
        } else {
          // Check for resize handles
          const selectedFrames = frames.filter((f) => selectedIds.includes(f.id));
          let foundHandle = false;
          for (const frame of selectedFrames) {
            const handle = getResizeHandle(
              screenX,
              screenY,
              frame,
              camera,
              rect.width,
              rect.height
            );
            if (handle) {
              canvas.style.cursor = getCursorForHandle(handle);
              foundHandle = true;
              break;
            }
          }

          if (!foundHandle) {
            // Check for frame hover
            let hoveredFrame: Frame | null = null;
            for (let i = frames.length - 1; i >= 0; i--) {
              if (isPointInFrame(worldPos, frames[i])) {
                hoveredFrame = frames[i];
                break;
              }
            }
            setHoveredFrame(hoveredFrame?.id ?? null);
            canvas.style.cursor = hoveredFrame ? 'move' : 'default';
          }
        }
      } else {
        canvas.style.cursor = dragState.resizeHandle
          ? getCursorForHandle(dragState.resizeHandle)
          : effectiveTool === 'pan'
          ? 'grabbing'
          : 'move';
      }

      // Handle dragging
      if (dragState.isDragging && dragState.startPoint) {
        if (effectiveTool === 'select') {
          if (dragState.resizeHandle) {
            // Resize selected frames
            const dx = worldPos.x - dragState.startPoint.x;
            const dy = worldPos.y - dragState.startPoint.y;

            selectedIds.forEach((id) => {
              const frame = frames.find((f) => f.id === id);
              if (!frame || frame.locked) return;

              const updates: Partial<Frame> = {};
              const handle = dragState.resizeHandle!;

              if (handle.includes('w')) {
                updates.width = frame.width - dx;
                updates.x = frame.x + dx;
              }
              if (handle.includes('e')) {
                updates.width = frame.width + dx;
              }
              if (handle.includes('n')) {
                updates.height = frame.height - dy;
                updates.y = frame.y + dy;
              }
              if (handle.includes('s')) {
                updates.height = frame.height + dy;
              }

              // Apply snap to grid
              if (snapToGrid && updates.x !== undefined) {
                updates.x = snapValueToGrid(updates.x, gridSize);
              }
              if (snapToGrid && updates.y !== undefined) {
                updates.y = snapValueToGrid(updates.y, gridSize);
              }

              updateFrame(id, updates);
            });

            setDragState({ startPoint: worldPos });
          } else if (dragState.dragOffset) {
            // Move selected frames
            selectedIds.forEach((id) => {
              const frame = frames.find((f) => f.id === id);
              if (!frame || frame.locked) return;

              let newX = worldPos.x - dragState.dragOffset!.x;
              let newY = worldPos.y - dragState.dragOffset!.y;

              if (snapToGrid) {
                newX = snapValueToGrid(newX, gridSize);
                newY = snapValueToGrid(newY, gridSize);
              }

              updateFrame(id, { x: newX, y: newY });
            });
          } else if (selectionBox) {
            // Update selection box
            setSelectionBox({
              ...selectionBox,
              endX: worldPos.x,
              endY: worldPos.y,
            });

            // Select frames within box
            const minX = Math.min(selectionBox.startX, worldPos.x);
            const maxX = Math.max(selectionBox.startX, worldPos.x);
            const minY = Math.min(selectionBox.startY, worldPos.y);
            const maxY = Math.max(selectionBox.startY, worldPos.y);

            const selectedInBox = frames
              .filter((frame) =>
                doRectsIntersect(
                  minX,
                  minY,
                  maxX - minX,
                  maxY - minY,
                  frame.x,
                  frame.y,
                  frame.width,
                  frame.height
                )
              )
              .map((f) => f.id);

            selectFrames(selectedInBox);
          }
        } else if (effectiveTool === 'frame') {
          // Update preview of frame being drawn
          setSelectionBox({
            startX: dragState.startPoint.x,
            startY: dragState.startPoint.y,
            endX: worldPos.x,
            endY: worldPos.y,
          });
        } else if (effectiveTool === 'pan') {
          // Pan camera
          const dx = worldPos.x - dragState.startPoint.x;
          const dy = worldPos.y - dragState.startPoint.y;
          setCamera({
            x: camera.x + dx,
            y: camera.y + dy,
          });
        }
      }
    },
    [
      camera,
      frames,
      selectedIds,
      currentTool,
      isSpacePressed,
      dragState,
      selectionBox,
      snapToGrid,
      gridSize,
      setCamera,
      setDragState,
      setSelectionBox,
      selectFrames,
      updateFrame,
      setHoveredFrame,
    ]
  );

  // Mouse up handler
  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPos = screenToWorld(screenX, screenY, camera, rect.width, rect.height);

      const effectiveTool = isSpacePressed ? 'pan' : currentTool;

      if (effectiveTool === 'frame' && dragState.startPoint) {
        const width = worldPos.x - dragState.startPoint.x;
        const height = worldPos.y - dragState.startPoint.y;

        if (Math.abs(width) > 10 && Math.abs(height) > 10) {
          let x = dragState.startPoint.x;
          let y = dragState.startPoint.y;

          if (snapToGrid) {
            x = snapValueToGrid(x, gridSize);
            y = snapValueToGrid(y, gridSize);
          }

          addFrame({
            x,
            y,
            width,
            height,
            name: `Frame ${frames.length + 1}`,
            color: '#4ECDC480',
            rotation: 0,
            locked: false,
            visible: true,
            opacity: 1,
          });
        }
      }

      if (dragState.isDragging && (dragState.dragOffset || dragState.resizeHandle)) {
        saveHistory();
      }

      setDragState({
        isDragging: false,
        startPoint: null,
        dragOffset: null,
        resizeHandle: null,
      });
      setSelectionBox(null);
      canvas.style.cursor = 'default';
    },
    [
      camera,
      frames,
      currentTool,
      isSpacePressed,
      dragState,
      snapToGrid,
      gridSize,
      addFrame,
      setDragState,
      setSelectionBox,
      saveHistory,
    ]
  );

  // Wheel handler for zoom
  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault();

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;

      const worldPosBefore = screenToWorld(screenX, screenY, camera, rect.width, rect.height);

      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(10, camera.zoom * zoomFactor));

      const worldPosAfter = screenToWorld(
        screenX,
        screenY,
        { ...camera, zoom: newZoom },
        rect.width,
        rect.height
      );

      setCamera({
        x: camera.x + (worldPosAfter.x - worldPosBefore.x),
        y: camera.y + (worldPosAfter.y - worldPosBefore.y),
        zoom: newZoom,
      });
    },
    [camera, setCamera]
  );

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onWheel={handleWheel}
    />
  );
}
