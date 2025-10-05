# Quick Start Guide

## 🚀 Get Started in 60 Seconds

### 1. Install & Run
```bash
npm install
npm run electron:dev
```

### 2. Create Your First Frame

**Option A: In the App**
- Click the `+` button in the left panel
- A new frame appears on the canvas
- Drag, resize, edit as needed

**Option B: From Terminal**
```bash
mkdir MyFirstFrame
cat > MyFirstFrame/frame.json << 'EOF'
{
  "id": "my-first-frame",
  "name": "My First Frame",
  "x": 0,
  "y": 0,
  "width": 300,
  "height": 200,
  "color": "#4ECDC480",
  "rotation": 0,
  "locked": false,
  "visible": true,
  "opacity": 1
}
EOF
```

### 3. Watch the Magic

The frame appears automatically! Try:
- **Edit in app** → `frame.json` updates
- **Edit `frame.json`** → Canvas updates
- **Delete directory** → Frame disappears
- **Create directory** → Frame appears

## 📁 How It Works

```
Your Project Directory (CWD)
│
├── Frame_1/          ← Each subdirectory is a frame
│   └── frame.json    ← Frame properties in JSON
│
├── Frame_2/
│   └── frame.json
│
└── Frame_3/
    └── frame.json
```

**The app watches your file system and syncs automatically!**

## ⌨️ Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `V` | Select Tool |
| `F` | Frame Tool |
| `Space` | Pan (hold) |
| `+/-` | Zoom In/Out |
| `Cmd+Z` | Undo |
| `Cmd+Shift+Z` | Redo |
| `Cmd+D` | Duplicate |
| `Delete` | Delete Frame |
| `Cmd+A` | Select All |

## 🎨 Common Tasks

### Create Multiple Frames Quickly

```bash
for i in {1..5}; do
  mkdir "Frame_$i"
  cat > "Frame_$i/frame.json" << EOF
{
  "id": "frame-$i",
  "name": "Frame $i",
  "x": $((i * 250)),
  "y": 100,
  "width": 200,
  "height": 200,
  "color": "#FF6B6B80",
  "rotation": 0,
  "locked": false,
  "visible": true,
  "opacity": 1
}
EOF
done
```

### Change All Frame Colors

```bash
for file in */frame.json; do
  jq '.color = "#4ECDC480"' "$file" > tmp && mv tmp "$file"
done
```

### Version Control Your Canvas

```bash
git init
git add .
git commit -m "Initial canvas layout"
```

## 🔧 Troubleshooting

**Frames not showing?**
- Check `frame.json` exists in each subdirectory
- Validate JSON with: `jq . MyFrame/frame.json`
- Look at DevTools console for errors

**Changes not syncing?**
- Restart the app
- Check file permissions
- Make sure you're in the right directory

**App won't start?**
- Run `npm install` again
- Delete `node_modules` and reinstall
- Check Node.js version (16+ required)

## 📚 Learn More

- [README.md](./README.md) - Full documentation
- [File System Integration](./docs/file-system-integration.md) - Deep dive
- [Example Setup](./docs/example-setup.md) - More examples
- [Technical Overview](./docs/overview.md) - Architecture

## 🎯 Next Steps

1. **Organize**: Use meaningful directory names
2. **Experiment**: Try editing `frame.json` files directly
3. **Automate**: Create scripts to generate layouts
4. **Collaborate**: Share your directory with teammates
5. **Version**: Use git to track changes

Happy designing! 🎨
