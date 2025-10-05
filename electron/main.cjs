const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const chokidar = require('chokidar');

const isDev = process.env.NODE_ENV === 'development' || process.argv.includes('--dev');

let mainWindow;
let watcher = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Need to disable sandbox for file system access
      preload: path.join(__dirname, 'preload.cjs'),
    },
    backgroundColor: '#1e1e1e',
    title: 'UX Canvas',
    titleBarStyle: 'hiddenInset',
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// IPC Handlers

// Get current working directory
ipcMain.handle('get-cwd', async () => {
  // Use the 'cwd' subdirectory as the default project directory
  const projectDir = path.join(process.cwd(), 'cwd');
  return projectDir;
});

// Read directory contents
ipcMain.handle('read-dir', async (event, dirPath) => {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
        isDirectory: true,
      }));
  } catch (error) {
    console.error('Error reading directory:', error);
    return [];
  }
});

// Read frame.json from a directory
ipcMain.handle('read-frame-json', async (event, dirPath) => {
  try {
    const framePath = path.join(dirPath, 'frame.json');
    const data = await fs.readFile(framePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If frame.json doesn't exist, return null
    if (error.code === 'ENOENT') {
      return null;
    }
    console.error('Error reading frame.json:', error);
    throw error;
  }
});

// Write frame.json to a directory
ipcMain.handle('write-frame-json', async (event, dirPath, data) => {
  try {
    const framePath = path.join(dirPath, 'frame.json');
    await fs.writeFile(framePath, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (error) {
    console.error('Error writing frame.json:', error);
    throw error;
  }
});

// Create new directory
ipcMain.handle('create-directory', async (event, basePath, name) => {
  try {
    const dirPath = path.join(basePath, name);
    await fs.mkdir(dirPath, { recursive: true });
    return { success: true, path: dirPath };
  } catch (error) {
    console.error('Error creating directory:', error);
    throw error;
  }
});

// Delete directory
ipcMain.handle('delete-directory', async (event, dirPath) => {
  try {
    await fs.rm(dirPath, { recursive: true, force: true });
    return { success: true };
  } catch (error) {
    console.error('Error deleting directory:', error);
    throw error;
  }
});

// Check if directory exists
ipcMain.handle('directory-exists', async (event, dirPath) => {
  try {
    const stats = await fs.stat(dirPath);
    return stats.isDirectory();
  } catch (error) {
    return false;
  }
});

// Check if file exists
ipcMain.handle('file-exists', async (event, filePath) => {
  try {
    const stats = await fs.stat(filePath);
    return stats.isFile();
  } catch (error) {
    return false;
  }
});

// Watch directory for changes
ipcMain.on('watch-directory', (event, dirPath) => {
  // Stop existing watcher if any
  if (watcher) {
    watcher.close();
  }

  // Create new watcher
  watcher = chokidar.watch(dirPath, {
    ignored: /(^|[\/\\])\../, // ignore dotfiles
    persistent: true,
    ignoreInitial: true,
    depth: 1, // Only watch immediate subdirectories
  });

  watcher
    .on('addDir', (dirPath) => {
      console.log('Directory added:', dirPath);
      mainWindow?.webContents.send('directory-changed', {
        type: 'added',
        path: dirPath,
      });
    })
    .on('unlinkDir', (dirPath) => {
      console.log('Directory removed:', dirPath);
      mainWindow?.webContents.send('directory-changed', {
        type: 'removed',
        path: dirPath,
      });
    })
    .on('change', (filePath) => {
      // Watch for frame.json changes
      if (path.basename(filePath) === 'frame.json') {
        console.log('frame.json changed:', filePath);
        mainWindow?.webContents.send('directory-changed', {
          type: 'changed',
          path: path.dirname(filePath),
        });
      }
    });
});

// Unwatch directory
ipcMain.on('unwatch-directory', () => {
  if (watcher) {
    watcher.close();
    watcher = null;
  }
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  // Clean up watcher
  if (watcher) {
    watcher.close();
  }

  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  // Clean up watcher on quit
  if (watcher) {
    watcher.close();
  }
});
