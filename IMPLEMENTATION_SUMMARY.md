# File System Integration - Implementation Summary

## Overview

The infinite canvas app now uses **the file system as the source of truth**. Each subdirectory in the current working directory represents a frame on the canvas, with metadata stored in `frame.json` files.

## Key Changes

### 1. Electron IPC Integration

**New Files:**
- `electron/preload.cjs` - Exposes file system APIs to renderer
- Enhanced `electron/main.cjs` - IPC handlers for file operations

**IPC Methods:**
- `getCwd()` - Get current working directory
- `readDir()` - Read subdirectories
- `readFrameJson()` - Read frame metadata
- `writeFrameJson()` - Write frame metadata
- `createDirectory()` - Create new frame directory
- `deleteDirectory()` - Delete frame directory
- `watchDirectory()` - Watch for file system changes

### 2. File System Service

**New File:** `src/services/fileSystem.ts`

Provides clean abstraction over Electron IPC:
- `loadFramesFromDirectory()` - Load all frames from cwd
- `syncFrameToFileSystem()` - Save frame changes to disk
- `watchDirectory()` - Start file watcher
- `createFrameDirectory()` - Create frame with frame.json
- `deleteFrameDirectory()` - Remove frame directory

### 3. Updated Zustand Store

**File:** `src/store/useCanvasStore.ts`

**New State:**
```typescript
currentWorkingDir: string;  // Current directory path
isLoadingFromFS: boolean;   // Loading indicator
```

**New Actions:**
```typescript
initializeFromFileSystem()  // Load frames on app start
loadFramesFromFS()          // Reload from file system
syncFrameToFS()             // Save frame to disk
handleDirectoryChange()     // Handle file watcher events
```

**Modified Actions:**
- `addFrame()` - Now creates directory + frame.json
- `updateFrame()` - Now updates frame.json on disk
- `deleteFrame()` - Now deletes directory
- `deleteFrames()` - Now deletes multiple directories
- `duplicateFrames()` - Now creates new directories

### 4. Rebuilt Left Panel

**File:** `src/components/LeftPanel.tsx`

Now shows:
- File explorer header with cwd name
- Directory listing (not just frame list)
- Folder icons instead of frame icons
- Directory name + frame name display
- Real-time loading state

### 5. Updated App Initialization

**File:** `src/App.tsx`

```typescript
useEffect(() => {
  initializeFromFileSystem();
  return () => unwatchDirectory();
}, []);
```

Automatically loads frames from file system on mount and cleans up file watcher on unmount.

### 6. Type Definitions

**New File:** `src/types/electron.d.ts`

Type-safe Electron API with:
- `ElectronAPI` interface
- `DirectoryEntry` type
- `FrameJsonData` type
- `DirectoryChangeEvent` type

**Updated:** `src/types/index.ts`

Added `metadata` field to Frame:
```typescript
metadata?: {
  dirPath?: string;  // Path to frame's directory
}
```

## File System Structure

```
current-working-directory/
├── Frame_1/
│   └── frame.json
├── Frame_2/
│   └── frame.json
└── Frame_3/
    └── frame.json
```

## frame.json Schema

```json
{
  "id": "unique-id",
  "name": "Frame Name",
  "x": 100,
  "y": 200,
  "width": 300,
  "height": 400,
  "color": "#FF6B6B80",
  "rotation": 0,
  "locked": false,
  "visible": true,
  "opacity": 1
}
```

## Real-time Sync Flow

### Canvas → File System

1. User drags/resizes frame on canvas
2. `updateFrame()` updates Zustand state
3. `syncFrameToFS()` writes to `frame.json`
4. File watcher detects change (ignored - we made it)

### File System → Canvas

1. User/script creates/modifies directory
2. Chokidar file watcher detects change
3. Event sent to renderer via IPC
4. `handleDirectoryChange()` updates Zustand state
5. Canvas re-renders with new/updated frame

## File Watcher Events

**Directory Added:**
```
1. Read frame.json from new directory
2. Add frame to canvas state
3. Frame appears on canvas
```

**Directory Removed:**
```
1. Find frame by directory path
2. Remove from canvas state
3. Frame disappears from canvas
```

**frame.json Changed:**
```
1. Read updated frame.json
2. Update frame in canvas state
3. Frame updates on canvas
```

## Edge Cases Handled

1. **Missing frame.json** - Auto-generates default
2. **Invalid JSON** - Skips frame, logs error
3. **Permission errors** - Logs error, continues
4. **Directory exists** - Doesn't create duplicate
5. **Concurrent updates** - File watcher handles properly
6. **App restart** - Loads latest state from disk
7. **Manual file edits** - Syncs to canvas automatically

## Benefits

### For Users
- **Persistence** - Canvas state survives app restarts
- **Version Control** - Git-friendly JSON files
- **Collaboration** - Share directories, merge changes
- **Backup** - Simple file copy/paste
- **Transparency** - Can inspect/edit frame.json directly

### For Developers
- **Programmatic Access** - Scripts can create/modify frames
- **Testing** - Easy to set up test scenarios
- **CI/CD** - Can validate canvas state
- **Extensions** - Easy to add metadata to frame.json
- **Migration** - Can bulk update all frames

## Performance Considerations

- **Initial Load**: O(n) where n = number of subdirectories
- **File Watcher**: Debounced, depth-1 only
- **Writes**: Async, non-blocking
- **Reads**: Cached in memory (Zustand state)

## Security Notes

- **Sandbox disabled** - Required for file system access
- **Context isolation enabled** - IPC provides isolation
- **Preload script** - Exposes only necessary APIs
- **Local files only** - No network access

## Future Enhancements

1. **Directory Selector** - Let user choose working directory
2. **Nested Directories** - Support component hierarchies
3. **Assets** - Store images/files in frame directories
4. **Metadata Extensions** - Custom fields in frame.json
5. **Conflict Resolution** - Handle concurrent edits
6. **Cloud Sync** - Sync to cloud storage
7. **Import/Export** - Zip/unzip entire canvas

## Migration Guide

### From In-Memory to File System

**Old:**
```typescript
const frames = [
  { id: '1', name: 'Frame 1', x: 0, y: 0, ... }
];
```

**New:**
```
Frame_1/frame.json:
{
  "id": "1",
  "name": "Frame 1",
  "x": 0,
  "y": 0,
  ...
}
```

### API Changes

**Before:**
```typescript
addFrame(frameData);  // Sync
updateFrame(id, updates);  // Sync
deleteFrame(id);  // Sync
```

**After:**
```typescript
await addFrame(frameData);  // Async
await updateFrame(id, updates);  // Async
await deleteFrame(id);  // Async
```

## Testing

### Manual Testing

1. **Create Frame in UI** → Check directory created
2. **Edit Frame in UI** → Check frame.json updated
3. **Delete Frame in UI** → Check directory deleted
4. **Create Directory Manually** → Check frame appears
5. **Edit frame.json Manually** → Check canvas updates
6. **Delete Directory Manually** → Check frame disappears

### Automated Testing (Future)

```typescript
describe('File System Integration', () => {
  it('creates directory when frame is added', async () => {
    await addFrame({ ... });
    expect(fs.existsSync('Frame_1')).toBe(true);
  });

  it('updates frame.json when frame is moved', async () => {
    await updateFrame('1', { x: 100 });
    const json = JSON.parse(fs.readFileSync('Frame_1/frame.json'));
    expect(json.x).toBe(100);
  });
});
```

## Debugging

### Enable File Watcher Logs

In `electron/main.cjs`:
```javascript
watcher.on('all', (event, path) => {
  console.log('File event:', event, path);
});
```

### Check IPC Communication

In DevTools console:
```javascript
window.electronAPI.getCwd().then(console.log);
window.electronAPI.readDir('.').then(console.log);
```

### Validate JSON Files

```bash
find . -name "frame.json" -exec jq empty {} \; -print
```

## Documentation

- [File System Integration Guide](./docs/file-system-integration.md)
- [Example Setup](./docs/example-setup.md)
- [Frame Schema](./docs/frame-schema.json)
- [Technical Overview](./docs/overview.md)

## Dependencies Added

- `chokidar@^3.6.0` - File system watcher

## Files Modified

- `package.json` - Added chokidar
- `electron/main.cjs` - IPC handlers, file watcher
- `src/types/index.ts` - Added metadata to Frame
- `src/store/useCanvasStore.ts` - File system sync
- `src/components/LeftPanel.tsx` - File explorer UI
- `src/App.tsx` - Initialize from file system
- `README.md` - Usage documentation

## Files Added

- `electron/preload.cjs` - IPC bridge
- `src/types/electron.d.ts` - Electron types
- `src/services/fileSystem.ts` - File system service
- `docs/file-system-integration.md` - Integration guide
- `docs/frame-schema.json` - JSON schema
- `docs/example-setup.md` - Examples

---

**Implementation Status:** ✅ Complete
**Testing Status:** ⚠️ Manual testing required
**Documentation Status:** ✅ Complete
