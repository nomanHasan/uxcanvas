import { useEffect } from 'react';
import { Canvas } from '@/components/Canvas';
import { FrameContent } from '@/components/FrameContent';
import { LeftPanel } from '@/components/LeftPanel';
import { RightPanel } from '@/components/RightPanel';
import { Toolbar } from '@/components/Toolbar';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useCanvasStore } from '@/store/useCanvasStore';
import { unwatchDirectory } from '@/services/fileSystem';

function App() {
  useKeyboardShortcuts();
  const { initializeFromFileSystem } = useCanvasStore();

  // Initialize from file system on mount
  useEffect(() => {
    // Load frames from current working directory
    initializeFromFileSystem();

    // Cleanup file watcher on unmount
    return () => {
      unwatchDirectory();
    };
  }, [initializeFromFileSystem]);

  return (
    <div className="w-screen h-screen overflow-hidden flex bg-background text-text-primary">
      {/* Left Panel */}
      <LeftPanel />

      {/* Canvas Area */}
      <div className="flex-1 relative">
        <Toolbar />
        <Canvas />
        <FrameContent />
      </div>

      {/* Right Panel */}
      <RightPanel />
    </div>
  );
}

export default App;
