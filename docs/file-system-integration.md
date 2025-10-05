# File System Integration

## Overview

UX Canvas uses the **file system as the source of truth** for all frames. Each subdirectory in the current working directory (cwd) represents a frame on the infinite canvas, with metadata stored in `frame.json` files.

## Architecture

```
current-working-directory/
├── MyFrame1/
│   └── frame.json
├── MyFrame2/
│   └── frame.json
├── AnotherFrame/
│   └── frame.json
└── ... (other subdirectories)
```

### Key Concepts

1. **Subdirectory = Frame**: Each subdirectory is automatically detected and rendered as a frame on the canvas
2. **frame.json = Metadata**: Each directory contains a `frame.json` file with the frame's properties
3. **Real-time Sync**: Changes to the file system are automatically reflected in the canvas
4. **Bidirectional**: Changes in the canvas are saved to the file system

## frame.json Schema

Each `frame.json` file contains the following properties:

```json
{
  "id": "unique-identifier",
  "name": "Display Name",
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

### Property Descriptions

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `id` | string | Unique identifier (auto-generated) | nanoid() |
| `name` | string | Frame display name | "Frame 1" |
| `x` | number | X position in world coordinates | 0 |
| `y` | number | Y position in world coordinates | 0 |
| `width` | number | Frame width in pixels | 200 |
| `height` | number | Frame height in pixels | 200 |
| `color` | string | Fill color (hex + alpha) | "#FF6B6B80" |
| `rotation` | number | Rotation in degrees | 0 |
| `locked` | boolean | Whether frame is locked from editing | false |
| `visible` | boolean | Whether frame is visible on canvas | true |
| `opacity` | number | Opacity (0.0 - 1.0) | 1 |

## How It Works

### On App Start

1. App reads current working directory (cwd)
2. Scans all subdirectories
3. Reads `frame.json` from each subdirectory
4. Renders frames on the infinite canvas
5. Starts file watcher for automatic updates

### Creating a Frame

**In the UI:**
1. Click the `+` button in the left panel
2. A new subdirectory is created: `Frame_<timestamp>/`
3. A default `frame.json` is generated
4. Frame appears on the canvas

**Manually:**
1. Create a new subdirectory: `mkdir MyNewFrame`
2. Create `frame.json` with required properties
3. Frame automatically appears on canvas (file watcher detects it)

### Updating a Frame

**In the UI:**
1. Drag/resize frame on canvas
2. `frame.json` is automatically updated
3. Changes are persisted to file system

**Manually:**
1. Edit `frame.json` in any text editor
2. Save the file
3. Canvas automatically reloads the frame (file watcher detects change)

### Deleting a Frame

**In the UI:**
1. Select frame(s)
2. Click delete button or press `Delete` key
3. Entire subdirectory is deleted (including all contents)

**Manually:**
1. Delete the subdirectory
2. Frame automatically disappears from canvas (file watcher detects removal)

## File Watcher

The app uses **Chokidar** to watch for file system changes:

- **Added Directory**: New frame appears on canvas
- **Removed Directory**: Frame disappears from canvas
- **Modified frame.json**: Frame properties update on canvas

### Watched Events

```javascript
watcher.on('addDir', (path) => {
  // Load frame.json and add frame to canvas
});

watcher.on('unlinkDir', (path) => {
  // Remove frame from canvas
});

watcher.on('change', (path) => {
  // If frame.json changed, reload frame data
});
```

## Use Cases

### 1. Version Control Integration

Since frames are stored as JSON files in directories:

```bash
git init
git add .
git commit -m "Initial canvas state"
```

You can track changes, collaborate, and revert to previous states.

### 2. Programmatic Canvas Generation

Create frames programmatically:

```bash
#!/bin/bash
for i in {1..10}; do
  mkdir "Frame_$i"
  cat > "Frame_$i/frame.json" << EOF
{
  "id": "frame-$i",
  "name": "Frame $i",
  "x": $((i * 250)),
  "y": 100,
  "width": 200,
  "height": 200,
  "color": "#4ECDC480",
  "rotation": 0,
  "locked": false,
  "visible": true,
  "opacity": 1
}
EOF
done
```

### 3. Template System

Create reusable frame templates:

```bash
# Save template
cp MyFrame/frame.json templates/button-frame.json

# Use template
mkdir NewButton
cp templates/button-frame.json NewButton/frame.json
# Edit NewButton/frame.json to customize
```

### 4. Batch Operations

Process all frames at once:

```bash
# Change all frames to red
for dir in */; do
  jq '.color = "#FF000080"' "$dir/frame.json" > tmp.json
  mv tmp.json "$dir/frame.json"
done
```

### 5. CI/CD Integration

```yaml
# .github/workflows/validate.yml
name: Validate Canvas
on: [push]
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Validate frame.json files
        run: |
          for file in */frame.json; do
            jq empty "$file" || exit 1
          done
```

## Advanced: Custom Directory Path

By default, the app uses the current working directory where Electron was launched.

### Future Enhancement: Directory Selector

```typescript
// Add to Electron main process
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });
  return result.filePaths[0];
});

// In renderer
const newDir = await window.electronAPI.selectDirectory();
await setWorkingDirectory(newDir);
```

## Error Handling

### Missing frame.json

If a subdirectory doesn't have `frame.json`:
- A default frame.json is auto-generated
- Default position is random to avoid overlap
- Default color is randomly chosen

### Invalid frame.json

If frame.json is malformed:
- Error is logged to console
- Frame is skipped (not rendered)
- File watcher continues to monitor for fix

### Permission Errors

If the app doesn't have write permissions:
- Canvas updates will work (in-memory)
- File system updates will fail silently
- Errors logged to console

## Best Practices

1. **Keep frame.json clean**: Only include required properties
2. **Use meaningful names**: Frame names should describe their purpose
3. **Organize subdirectories**: Use prefixes for grouping (e.g., `ui_Button`, `layout_Header`)
4. **Version control**: Commit canvas state regularly
5. **Backup**: Keep backups before major changes
6. **Validate JSON**: Use linters to validate frame.json files

## Performance Considerations

- **Watcher depth**: Limited to immediate subdirectories (depth: 1)
- **Ignored files**: Dotfiles are automatically ignored
- **Initial scan**: Can be slow with 100+ directories
- **Debouncing**: File changes are debounced to prevent rapid updates

## Security

- **Sandbox disabled**: Required for file system access
- **No remote content**: All files are local
- **Context isolation**: IPC is used for file operations
- **Preload script**: Exposes only necessary APIs

---

**Related Documentation:**
- [Technical Overview](./overview.md)
- [README](../README.md)
- [Frame Schema](./frame-schema.md)
