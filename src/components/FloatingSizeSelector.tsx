import { useCanvasStore } from '@/store/useCanvasStore';

const SIZE_PRESETS = {
  mobile: { width: 375, height: 812 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1920, height: 1080 },
};

interface FloatingSizeSelectorProps {
  frameId: string;
  screenX: number;
  screenY: number;
  frameWidth: number;
}

export function FloatingSizeSelector({
  frameId,
  screenX,
  screenY,
  frameWidth,
}: FloatingSizeSelectorProps) {
  const { updateFrame, saveHistory } = useCanvasStore();

  const handleSizeChange = (size: 'mobile' | 'tablet' | 'desktop') => {
    const preset = SIZE_PRESETS[size];
    updateFrame(frameId, {
      width: preset.width,
      height: preset.height,
    });
    saveHistory();
  };

  return (
    <div
      className="absolute flex gap-1 p-1 bg-background border border-border rounded shadow-lg z-50"
      style={{
        left: `${screenX + frameWidth - 180}px`,
        top: `${screenY + 8}px`,
        pointerEvents: 'auto',
      }}
    >
      <button
        onClick={() => handleSizeChange('mobile')}
        className="px-3 py-1.5 text-xs font-medium text-text-primary bg-panel hover:bg-accent hover:text-white rounded transition-colors"
        title="Mobile (375 x 812)"
      >
        Mobile
      </button>
      <button
        onClick={() => handleSizeChange('tablet')}
        className="px-3 py-1.5 text-xs font-medium text-text-primary bg-panel hover:bg-accent hover:text-white rounded transition-colors"
        title="Tablet (768 x 1024)"
      >
        Tablet
      </button>
      <button
        onClick={() => handleSizeChange('desktop')}
        className="px-3 py-1.5 text-xs font-medium text-text-primary bg-panel hover:bg-accent hover:text-white rounded transition-colors"
        title="Desktop (1920 x 1080)"
      >
        Desktop
      </button>
    </div>
  );
}
