import { useRef, useEffect, useState, useCallback } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { worldToScreen } from '@/utils/canvas';
import { FloatingSizeSelector } from './FloatingSizeSelector';

export function CanvasOverlay() {
  const { frames, selectedIds, camera } = useCanvasStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const rafRef = useRef<number>();

  // Track actual container dimensions with RAF for smooth updates
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDimensions({ width: rect.width, height: rect.height });
    }
  }, []);

  useEffect(() => {
    // Initial dimension update
    updateDimensions();

    // Use ResizeObserver for accurate dimension tracking
    const resizeObserver = new ResizeObserver(() => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(updateDimensions);
    });

    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [updateDimensions]);

  // Don't render anything until dimensions are available
  if (dimensions.width === 0 || dimensions.height === 0) {
    return <div ref={containerRef} className="absolute inset-0 pointer-events-none z-30" />;
  }

  // Only show size selector when exactly one frame is selected
  const selectedFrame = selectedIds.length === 1 ? frames.find((f) => f.id === selectedIds[0]) : null;

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none z-30">
      {selectedFrame && (
        (() => {
          // Convert world coordinates to screen coordinates
          const screenPos = worldToScreen(
            selectedFrame.x,
            selectedFrame.y,
            camera,
            dimensions.width,
            dimensions.height
          );

          const frameWidth = selectedFrame.width * camera.zoom;
          const frameHeight = selectedFrame.height * camera.zoom;

          // Only show if the frame is visible in the viewport and zoomed in enough
          if (
            camera.zoom > 0.3 &&
            screenPos.x + frameWidth > 0 &&
            screenPos.x < dimensions.width &&
            screenPos.y + frameHeight > 0 &&
            screenPos.y < dimensions.height
          ) {
            return (
              <FloatingSizeSelector
                frameId={selectedFrame.id}
                screenX={screenPos.x}
                screenY={screenPos.y}
                frameWidth={frameWidth}
              />
            );
          }
          return null;
        })()
      )}
    </div>
  );
}
