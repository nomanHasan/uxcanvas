import { useEffect, useState } from 'react';
import { useCanvasStore } from '@/store/useCanvasStore';
import { Frame } from '@/types';

export function RightPanel() {
  const { selectedIds, updateFrame, getSelectedFrames, saveHistory } =
    useCanvasStore();

  const [localValues, setLocalValues] = useState({
    x: '',
    y: '',
    width: '',
    height: '',
    opacity: '',
    rotation: '',
    color: '#000000',
  });

  const selectedFrames = getSelectedFrames();
  const singleFrame = selectedFrames.length === 1 ? selectedFrames[0] : null;

  // Update local values when selection changes
  useEffect(() => {
    if (singleFrame) {
      setLocalValues({
        x: String(Math.round(singleFrame.x)),
        y: String(Math.round(singleFrame.y)),
        width: String(Math.round(singleFrame.width)),
        height: String(Math.round(singleFrame.height)),
        opacity: String(Math.round(singleFrame.opacity * 100)),
        rotation: String(Math.round(singleFrame.rotation)),
        color: singleFrame.color.substring(0, 7),
      });
    } else {
      setLocalValues({
        x: '',
        y: '',
        width: '',
        height: '',
        opacity: '',
        rotation: '',
        color: '#000000',
      });
    }
  }, [singleFrame]);

  const handleInputChange = (field: keyof typeof localValues, value: string) => {
    setLocalValues((prev) => ({ ...prev, [field]: value }));
  };

  const handleInputBlur = (field: string, value: string) => {
    if (!singleFrame) return;

    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;

    const updates: Partial<Frame> = {};

    switch (field) {
      case 'x':
      case 'y':
      case 'width':
      case 'height':
      case 'rotation':
        updates[field] = numValue;
        break;
      case 'opacity':
        updates.opacity = Math.max(0, Math.min(100, numValue)) / 100;
        break;
    }

    updateFrame(singleFrame.id, updates);
    saveHistory();
  };

  const handleColorChange = (color: string) => {
    if (!singleFrame) return;
    setLocalValues((prev) => ({ ...prev, color }));
    updateFrame(singleFrame.id, { color: color + singleFrame.color.substring(7) });
    saveHistory();
  };

  return (
    <div
      className="flex-none w-[320px] min-w-[320px] max-w-[320px] bg-panel border-l border-border flex flex-col h-full"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-border">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
          Properties
        </h3>
      </div>

      {/* Properties Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedFrames.length === 0 ? (
          <div className="text-center text-text-secondary text-sm py-8">
            No frame selected
          </div>
        ) : selectedFrames.length > 1 ? (
          <div className="space-y-4">
            <div className="text-text-secondary text-sm">
              {selectedFrames.length} frames selected
            </div>
            <button
              onClick={() => {
                const { duplicateFrames } = useCanvasStore.getState();
                duplicateFrames(selectedIds);
              }}
              className="w-full px-3 py-2 bg-background hover:bg-border rounded text-sm text-text-primary transition-colors"
            >
              Duplicate Selection
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Position */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Position
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">X</label>
                  <input
                    type="number"
                    value={localValues.x}
                    onChange={(e) => handleInputChange('x', e.target.value)}
                    onBlur={(e) => handleInputBlur('x', e.target.value)}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">Y</label>
                  <input
                    type="number"
                    value={localValues.y}
                    onChange={(e) => handleInputChange('y', e.target.value)}
                    onBlur={(e) => handleInputBlur('y', e.target.value)}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Size */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Size
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">Width</label>
                  <input
                    type="number"
                    value={localValues.width}
                    onChange={(e) => handleInputChange('width', e.target.value)}
                    onBlur={(e) => handleInputBlur('width', e.target.value)}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="text-xs text-text-secondary mb-1 block">Height</label>
                  <input
                    type="number"
                    value={localValues.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    onBlur={(e) => handleInputBlur('height', e.target.value)}
                    className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
            </div>

            {/* Appearance */}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                Appearance
              </label>

              <div>
                <label className="text-xs text-text-secondary mb-1 block">Color</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    value={localValues.color}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-12 h-9 bg-background border border-border rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={localValues.color}
                    onChange={(e) => {
                      handleInputChange('color', e.target.value);
                      if (/^#[0-9A-F]{6}$/i.test(e.target.value)) {
                        handleColorChange(e.target.value);
                      }
                    }}
                    className="flex-1 px-2 py-1.5 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-accent font-mono"
                    placeholder="#000000"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-text-secondary mb-1 block">
                  Opacity ({localValues.opacity}%)
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={localValues.opacity}
                  onChange={(e) => {
                    handleInputChange('opacity', e.target.value);
                    if (singleFrame) {
                      updateFrame(singleFrame.id, {
                        opacity: parseFloat(e.target.value) / 100,
                      });
                    }
                  }}
                  onMouseUp={() => saveHistory()}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs text-text-secondary mb-1 block">
                  Rotation ({localValues.rotation}°)
                </label>
                <input
                  type="number"
                  value={localValues.rotation}
                  onChange={(e) => handleInputChange('rotation', e.target.value)}
                  onBlur={(e) => handleInputBlur('rotation', e.target.value)}
                  className="w-full px-2 py-1.5 bg-background border border-border rounded text-sm text-text-primary focus:outline-none focus:border-accent"
                  min="0"
                  max="360"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  if (!singleFrame) return;
                  const { duplicateFrames } = useCanvasStore.getState();
                  duplicateFrames([singleFrame.id]);
                }}
                className="w-full px-3 py-2 bg-background hover:bg-border rounded text-sm text-text-primary transition-colors"
              >
                Duplicate Frame
              </button>
              <button
                onClick={() => {
                  if (!singleFrame) return;
                  const { deleteFrame } = useCanvasStore.getState();
                  if (confirm('Delete this frame?')) {
                    deleteFrame(singleFrame.id);
                  }
                }}
                className="w-full px-3 py-2 bg-red-500/10 hover:bg-red-500/20 rounded text-sm text-red-400 transition-colors"
              >
                Delete Frame
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
