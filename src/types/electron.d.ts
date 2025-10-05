export interface DirectoryEntry {
  name: string;
  path: string;
  isDirectory: boolean;
}

export interface FrameJsonData {
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
}

export interface DirectoryChangeEvent {
  type: 'added' | 'removed' | 'changed';
  path: string;
}

export interface ElectronAPI {
  getCwd: () => Promise<string>;
  readDir: (path: string) => Promise<DirectoryEntry[]>;
  readFrameJson: (dirPath: string) => Promise<FrameJsonData | null>;
  writeFrameJson: (dirPath: string, data: FrameJsonData) => Promise<{ success: boolean }>;
  createDirectory: (path: string, name: string) => Promise<{ success: boolean; path: string }>;
  deleteDirectory: (path: string) => Promise<{ success: boolean }>;
  directoryExists: (path: string) => Promise<boolean>;
  fileExists: (path: string) => Promise<boolean>;
  watchDirectory: (path: string, callback: (data: DirectoryChangeEvent) => void) => void;
  unwatchDirectory: () => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
