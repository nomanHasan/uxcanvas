# UX Canvas - Infinite Canvas Design Tool

A modern, production-grade infinite canvas application built with React, TypeScript, Zustand, and Tailwind CSS. Similar to Figma's interface with infinite panning, zooming, and frame manipulation.

**🗂️ File System as Source of Truth**: Each subdirectory in your working directory becomes a frame on the canvas, with metadata stored in `frame.json` files. Changes to the file system automatically reflect on the canvas, and vice versa.

## Features

### Core Functionality
- **Infinite Canvas** with smooth pan and zoom
- **Grid System** with major and minor lines
- **Frame/Rectangle Creation** - Click and drag to create
- **Multi-Selection** - Shift/Cmd+Click for multiple frames
- **Drag & Drop** - Move frames around the canvas
- **Resize Handles** - 8-point resize on selected frames
- **File Explorer Panel** - View and manage frames as directories
- **Properties Panel** - Edit frame properties in real-time

### File System Integration
- **Directory-Based Frames** - Each subdirectory = one frame
- **frame.json Metadata** - Frame properties stored as JSON
- **Real-time Sync** - File changes auto-update the canvas
- **Bidirectional Updates** - Canvas changes save to file system
- **File Watcher** - Automatic detection of new/modified/deleted frames
- **Version Control Ready** - Git-friendly JSON format
- **Programmatic Access** - Create/edit frames via scripts

### Advanced Features
- **Undo/Redo** - Full history management with Immer
- **Keyboard Shortcuts** - Professional hotkey support
- **Snap to Grid** - Toggle snapping for precise placement
- **Show/Hide Grid** - Toggle grid visibility
- **Lock/Hide Frames** - Prevent editing or viewing
- **Zoom to Fit** - Automatically frame all objects
- **Export-Ready** - Clean architecture for future export features

### Edge Cases Handled
- Negative width/height normalization
- Proper coordinate transformations at all zoom levels
- Multi-frame selection and manipulation
- Grid rendering optimization (only visible at certain zooms)
- Input debouncing for smooth property updates
- Keyboard shortcut conflicts prevention
- Proper cleanup on component unmount
- Canvas resize handling
- High DPI display support

## Tech Stack

- **React 18** - Modern React with hooks
- **TypeScript** - Full type safety
- **Zustand** - Lightweight state management
- **Immer** - Immutable state updates
- **Tailwind CSS** - Utility-first styling
- **Vite** - Fast build tool
- **Electron** - Desktop app wrapper
- **Chokidar** - File system watcher for real-time sync

## Installation

```bash
# Install dependencies
npm install

# Run in development mode (web)
npm run dev

# Run in Electron
npm run electron:dev

# Build for production
npm run build

# Build Electron app
npm run electron:build
```

## File System Usage

### Quick Start

1. **Run the app** - It will use your current working directory
2. **Create frames** - Click `+` in the left panel, or create subdirectories manually
3. **View frames** - All subdirectories with `frame.json` appear on the canvas
4. **Edit frames** - Drag, resize, or edit properties in the UI
5. **Check files** - Open subdirectories to see auto-generated `frame.json` files

### Directory Structure

```
my-project/
├── Button_Component/
│   └── frame.json
├── Header_Layout/
│   └── frame.json
└── Login_Screen/
    └── frame.json
```

### Example frame.json

```json
{
  "id": "unique-id",
  "name": "Login Screen",
  "x": 100,
  "y": 200,
  "width": 400,
  "height": 600,
  "color": "#4ECDC480",
  "rotation": 0,
  "locked": false,
  "visible": true,
  "opacity": 1
}
```

### Creating Frames Programmatically

```bash
# Create a new frame
mkdir MyFrame
cat > MyFrame/frame.json << 'EOF'
{
  "id": "my-frame-1",
  "name": "My Custom Frame",
  "x": 0,
  "y": 0,
  "width": 300,
  "height": 200,
  "color": "#FF6B6B80",
  "rotation": 0,
  "locked": false,
  "visible": true,
  "opacity": 1
}
EOF
```

The frame will automatically appear on the canvas!

### Version Control

```bash
# Track your canvas
git init
git add .
git commit -m "Initial canvas layout"

# Work with branches
git checkout -b new-layout
# Make changes in the app
git commit -am "Updated button positions"
```

See [File System Integration Guide](./docs/file-system-integration.md) for advanced usage.

## Keyboard Shortcuts

### Tools
- `V` - Select Tool
- `F` - Frame Tool
- `H` - Pan Tool
- `Space` - Hold for temporary Pan

### Actions
- `Cmd/Ctrl + Z` - Undo
- `Cmd/Ctrl + Shift + Z` - Redo
- `Cmd/Ctrl + D` - Duplicate
- `Cmd/Ctrl + A` - Select All
- `Delete/Backspace` - Delete selected
- `Escape` - Clear selection

### View
- `+` or `=` - Zoom In
- `-` - Zoom Out
- `Cmd/Ctrl + 0` - Reset Zoom
- `Cmd/Ctrl + 1` - Zoom to Fit
- `Cmd/Ctrl + G` - Toggle Grid
- `Cmd/Ctrl + Shift + G` - Toggle Snap to Grid

## Architecture

```
src/
├── components/         # React components
│   ├── Canvas.tsx     # Main canvas with rendering
│   ├── LeftPanel.tsx  # Layer management
│   ├── RightPanel.tsx # Properties editor
│   └── Toolbar.tsx    # Tool and zoom controls
├── store/             # Zustand state management
│   └── useCanvasStore.ts
├── types/             # TypeScript types
│   └── index.ts
├── utils/             # Utility functions
│   └── canvas.ts      # Canvas math and helpers
├── hooks/             # Custom React hooks
│   └── useKeyboardShortcuts.ts
├── App.tsx            # Main app component
├── main.tsx           # Entry point
└── index.css          # Global styles
```

## Future Enhancements

- [ ] Text tool and text frames
- [ ] Image import and manipulation
- [ ] Multiple pages/artboards
- [ ] Export to PNG/SVG/PDF
- [ ] Collaborative editing
- [ ] Component library/symbols
- [ ] Auto-save and cloud sync
- [ ] Custom fonts and typography
- [ ] Boolean operations on shapes
- [ ] Pen tool for custom paths
- [ ] Plugins and extensions

## Performance Optimizations

- RequestAnimationFrame for smooth rendering
- Virtual rendering (only visible frames)
- Debounced property updates
- Efficient coordinate transformations
- Minimal re-renders with Zustand
- Canvas caching strategies

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or PR.
