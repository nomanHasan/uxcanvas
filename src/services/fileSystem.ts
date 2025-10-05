import { Frame } from '@/types';
import { FrameJsonData, DirectoryEntry, DirectoryChangeEvent } from '@/types/electron';

/**
 * File System Service
 * Handles all file system operations through Electron IPC
 */

const isElectron = () => {
  return typeof window !== 'undefined' && window.electronAPI !== undefined;
};

/**
 * Get current working directory
 */
export async function getCwd(): Promise<string> {
  if (!isElectron()) {
    console.warn('Not running in Electron, using fallback cwd');
    return '/';
  }
  return window.electronAPI.getCwd();
}

/**
 * Read all subdirectories in a directory
 */
export async function readDirectories(path: string): Promise<DirectoryEntry[]> {
  if (!isElectron()) {
    return [];
  }
  return window.electronAPI.readDir(path);
}

/**
 * Read frame.json from a directory
 */
export async function readFrameData(dirPath: string): Promise<FrameJsonData | null> {
  if (!isElectron()) {
    return null;
  }
  return window.electronAPI.readFrameJson(dirPath);
}

/**
 * Write frame.json to a directory
 */
export async function writeFrameData(dirPath: string, frame: Frame): Promise<boolean> {
  if (!isElectron()) {
    return false;
  }

  const data: FrameJsonData = {
    id: frame.id,
    name: frame.name,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    color: frame.color,
    rotation: frame.rotation,
    locked: frame.locked,
    visible: frame.visible,
    opacity: frame.opacity,
  };

  try {
    await window.electronAPI.writeFrameJson(dirPath, data);
    return true;
  } catch (error) {
    console.error('Failed to write frame data:', error);
    return false;
  }
}

/**
 * Create a new directory (frame)
 */
export async function createFrameDirectory(
  basePath: string,
  name: string,
  frame: Frame
): Promise<string | null> {
  if (!isElectron()) {
    return null;
  }

  try {
    const result = await window.electronAPI.createDirectory(basePath, name);
    if (result.success) {
      await writeFrameData(result.path, frame);
      return result.path;
    }
    return null;
  } catch (error) {
    console.error('Failed to create frame directory:', error);
    return null;
  }
}

/**
 * Delete a directory (frame)
 */
export async function deleteFrameDirectory(dirPath: string): Promise<boolean> {
  if (!isElectron()) {
    return false;
  }

  try {
    const result = await window.electronAPI.deleteDirectory(dirPath);
    return result.success;
  } catch (error) {
    console.error('Failed to delete frame directory:', error);
    return false;
  }
}

/**
 * Check if a directory exists
 */
export async function directoryExists(path: string): Promise<boolean> {
  if (!isElectron()) {
    return false;
  }
  return window.electronAPI.directoryExists(path);
}

/**
 * Watch a directory for changes
 */
export function watchDirectory(
  path: string,
  callback: (event: DirectoryChangeEvent) => void
): void {
  if (!isElectron()) {
    return;
  }
  window.electronAPI.watchDirectory(path, callback);
}

/**
 * Stop watching directory
 */
export function unwatchDirectory(): void {
  if (!isElectron()) {
    return;
  }
  window.electronAPI.unwatchDirectory();
}

/**
 * Load all frames from a directory
 */
export async function loadFramesFromDirectory(dirPath: string): Promise<Frame[]> {
  if (!isElectron()) {
    console.warn('⚠️ [DEBUG] Not running in Electron - cannot load frames');
    return [];
  }

  try {
    const directories = await readDirectories(dirPath);
    console.log('🔍 [DEBUG] Found directories:', directories.length, directories.map(d => d.name));
    const frames: Frame[] = [];

    for (const dir of directories) {
      const frameData = await readFrameData(dir.path);

      // Check if index.html exists in the directory
      const htmlPath = `${dir.path}/index.html`;
      const hasHtml = await window.electronAPI?.fileExists?.(htmlPath);

      if (frameData) {
        frames.push({
          ...frameData,
          // Store the directory path and HTML path for later updates
          metadata: {
            dirPath: dir.path,
            htmlPath: hasHtml ? htmlPath : undefined,
          },
        } as Frame & { metadata: { dirPath: string; htmlPath?: string } });
      } else {
        // Create default frame if no frame.json exists
        const defaultFrame: Frame = {
          id: dir.name,
          name: dir.name,
          x: Math.random() * 400 - 200,
          y: Math.random() * 400 - 200,
          width: 200,
          height: 200,
          color: getRandomColor(),
          rotation: 0,
          locked: false,
          visible: true,
          opacity: 1,
          metadata: {
            dirPath: dir.path,
            htmlPath: hasHtml ? htmlPath : undefined,
          },
        } as Frame & { metadata: { dirPath: string; htmlPath?: string } };

        // Save the default frame.json
        await writeFrameData(dir.path, defaultFrame);
        frames.push(defaultFrame);
      }
    }

    return frames;
  } catch (error) {
    console.error('Failed to load frames from directory:', error);
    return [];
  }
}

/**
 * Get a random color for new frames
 */
function getRandomColor(): string {
  const colors = [
    '#FF6B6B80',
    '#4ECDC480',
    '#45B7D180',
    '#FFA50780',
    '#9B59B680',
    '#3498DB80',
    '#E74C3C80',
    '#2ECC7180',
    '#F39C1280',
    '#1ABC9C80',
    '#D3545480',
    '#6C5CE780',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Get directory name from frame
 */
export function getFrameDirectoryName(frame: Frame): string {
  // Use frame name, sanitized for file system
  return frame.name.replace(/[^a-zA-Z0-9-_]/g, '_');
}

/**
 * Sync frame changes to file system
 */
export async function syncFrameToFileSystem(
  frame: Frame & { metadata?: { dirPath?: string } },
  basePath: string
): Promise<boolean> {
  if (!isElectron()) {
    return false;
  }

  try {
    // If frame has a directory path, update it
    if (frame.metadata?.dirPath) {
      return await writeFrameData(frame.metadata.dirPath, frame);
    }

    // Otherwise, create a new directory
    const dirName = getFrameDirectoryName(frame);
    const dirPath = await createFrameDirectory(basePath, dirName, frame);
    return dirPath !== null;
  } catch (error) {
    console.error('Failed to sync frame to file system:', error);
    return false;
  }
}
