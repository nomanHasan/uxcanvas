import { useRef, useEffect, useState, useCallback } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { worldToScreen } from '@/utils/canvas';

export function FrameContent() {
  const { frames, camera } = useCanvasStore();
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
    return <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden z-10" />;
  }

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none overflow-hidden z-10">
      {frames
        .filter((frame) => frame.visible && frame.metadata?.htmlPath)
        .map((frame) => {
          // Convert world coordinates to screen coordinates
          const screenPos = worldToScreen(
            frame.x,
            frame.y,
            camera,
            dimensions.width,
            dimensions.height
          );

          // Get file:// URL for the HTML file
          const htmlUrl = `file://${frame.metadata!.htmlPath}`;

          return (
            <div
              key={`frame-${frame.id}`}
              className="absolute"
              style={{
                left: `${screenPos.x}px`,
                top: `${screenPos.y}px`,
                width: `${frame.width}px`,
                height: `${frame.height}px`,
                opacity: frame.opacity,
                pointerEvents: 'none',
                transform: `rotate(${frame.rotation}deg) scale(${camera.zoom})`,
                transformOrigin: 'top left',
                willChange: 'transform',
              }}
            >
              <iframe
                src={htmlUrl}
                title={frame.name}
                sandbox="allow-scripts"
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none',
                  background: 'white',
                  display: 'block',
                  pointerEvents: 'none',
                }}
              />
            </div>
          );
        })}
    </div>
  );
}
