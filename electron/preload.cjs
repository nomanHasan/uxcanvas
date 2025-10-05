const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Get current working directory
  getCwd: () => ipcRenderer.invoke('get-cwd'),

  // Read directory contents
  readDir: (path) => ipcRenderer.invoke('read-dir', path),

  // Read frame.json from a directory
  readFrameJson: (dirPath) => ipcRenderer.invoke('read-frame-json', dirPath),

  // Write frame.json to a directory
  writeFrameJson: (dirPath, data) => ipcRenderer.invoke('write-frame-json', dirPath, data),

  // Create new directory (frame)
  createDirectory: (path, name) => ipcRenderer.invoke('create-directory', path, name),

  // Delete directory (frame)
  deleteDirectory: (path) => ipcRenderer.invoke('delete-directory', path),

  // Watch directory for changes
  watchDirectory: (path, callback) => {
    ipcRenderer.on('directory-changed', (event, data) => callback(data));
    ipcRenderer.send('watch-directory', path);
  },

  // Unwatch directory
  unwatchDirectory: () => {
    ipcRenderer.send('unwatch-directory');
  },

  // Check if directory exists
  directoryExists: (path) => ipcRenderer.invoke('directory-exists', path),

  // Check if file exists
  fileExists: (path) => ipcRenderer.invoke('file-exists', path),
});
