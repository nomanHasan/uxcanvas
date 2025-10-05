# Example Setup

## Quick Demo

Here's how to quickly set up a demo canvas with a few sample frames:

### 1. Create Sample Frames

```bash
# Navigate to your project directory
cd /path/to/your/project

# Create sample frames
mkdir -p Header Login Button Footer

# Create Header frame
cat > Header/frame.json << 'EOF'
{
  "id": "header-1",
  "name": "Header",
  "x": 0,
  "y": -200,
  "width": 800,
  "height": 100,
  "color": "#4ECDC480",
  "rotation": 0,
  "locked": false,
  "visible": true,
  "opacity": 1
}
EOF

# Create Login frame
cat > Login/frame.json << 'EOF'
{
  "id": "login-1",
  "name": "Login Screen",
  "x": -100,
  "y": 0,
  "width": 400,
  "height": 500,
  "color": "#45B7D180",
  "rotation": 0,
  "locked": false,
  "visible": true,
  "opacity": 1
}
EOF

# Create Button frame
cat > Button/frame.json << 'EOF'
{
  "id": "button-1",
  "name": "Submit Button",
  "x": 400,
  "y": 0,
  "width": 150,
  "height": 50,
  "color": "#FF6B6B80",
  "rotation": 0,
  "locked": false,
  "visible": true,
  "opacity": 1
}
EOF

# Create Footer frame
cat > Footer/frame.json << 'EOF'
{
  "id": "footer-1",
  "name": "Footer",
  "x": 0,
  "y": 300,
  "width": 800,
  "height": 80,
  "color": "#9B59B680",
  "rotation": 0,
  "locked": false,
  "visible": true,
  "opacity": 1
}
EOF
```

### 2. Launch the App

```bash
# From the uxcanvas directory
npm run electron:dev
```

You should see all 4 frames appear on the canvas automatically!

### 3. Test Real-time Sync

**In a terminal:**
```bash
# Modify the Login frame color
cat > Login/frame.json << 'EOF'
{
  "id": "login-1",
  "name": "Login Screen",
  "x": -100,
  "y": 0,
  "width": 400,
  "height": 500,
  "color": "#2ECC7180",
  "rotation": 0,
  "locked": false,
  "visible": true,
  "opacity": 1
}
EOF
```

The Login frame color should update instantly on the canvas!

**In the app:**
- Drag the Button frame to a new position
- Check `Button/frame.json` - the x and y values should be updated

### 4. Test Directory Watch

**Create a new frame:**
```bash
mkdir Sidebar
cat > Sidebar/frame.json << 'EOF'
{
  "id": "sidebar-1",
  "name": "Sidebar",
  "x": -400,
  "y": 0,
  "width": 200,
  "height": 600,
  "color": "#3498DB80",
  "rotation": 0,
  "locked": false,
  "visible": true,
  "opacity": 1
}
EOF
```

The Sidebar frame should appear on the canvas immediately!

**Delete a frame:**
```bash
rm -rf Footer
```

The Footer frame should disappear from the canvas!

## Complex Example: Design System

Create a full design system programmatically:

```bash
#!/bin/bash

# Colors
PRIMARY="#4ECDC480"
SECONDARY="#45B7D180"
ACCENT="#FF6B6B80"
NEUTRAL="#A0A0A080"

# Create components directory
mkdir -p components/{buttons,inputs,cards,layouts}

# Buttons
for i in {1..3}; do
  mkdir "components/buttons/Button_$i"
  cat > "components/buttons/Button_$i/frame.json" << EOF
{
  "id": "button-$i",
  "name": "Button $i",
  "x": $((i * 200 - 200)),
  "y": 0,
  "width": 150,
  "height": 50,
  "color": "$ACCENT",
  "rotation": 0,
  "locked": false,
  "visible": true,
  "opacity": 1
}
EOF
done

# Inputs
for i in {1..2}; do
  mkdir "components/inputs/Input_$i"
  cat > "components/inputs/Input_$i/frame.json" << EOF
{
  "id": "input-$i",
  "name": "Input Field $i",
  "x": $((i * 250 - 250)),
  "y": 100,
  "width": 200,
  "height": 40,
  "color": "$SECONDARY",
  "rotation": 0,
  "locked": false,
  "visible": true,
  "opacity": 1
}
EOF
done

# Cards
for i in {1..2}; do
  mkdir "components/cards/Card_$i"
  cat > "components/cards/Card_$i/frame.json" << EOF
{
  "id": "card-$i",
  "name": "Card $i",
  "x": $((i * 350 - 350)),
  "y": 200,
  "width": 300,
  "height": 200,
  "color": "$NEUTRAL",
  "rotation": 0,
  "locked": false,
  "visible": true,
  "opacity": 1
}
EOF
done

echo "Design system created! Launch the app to see your components."
```

Run this script and watch your design system appear on the canvas!

## JSON Validation

Validate all frame.json files:

```bash
# Using jq (install with: brew install jq)
for file in **/frame.json; do
  if ! jq empty "$file" 2>/dev/null; then
    echo "Invalid JSON: $file"
  else
    echo "Valid: $file"
  fi
done
```

## Batch Operations

### Update all colors
```bash
for file in **/frame.json; do
  jq '.color = "#FF6B6B80"' "$file" > tmp.json && mv tmp.json "$file"
done
```

### Move all frames 100px right
```bash
for file in **/frame.json; do
  jq '.x = .x + 100' "$file" > tmp.json && mv tmp.json "$file"
done
```

### Lock all frames
```bash
for file in **/frame.json; do
  jq '.locked = true' "$file" > tmp.json && mv tmp.json "$file"
done
```

## Import/Export

### Export current state
```bash
tar -czf canvas-backup-$(date +%Y%m%d).tar.gz */frame.json
```

### Import saved state
```bash
tar -xzf canvas-backup-20250104.tar.gz
```

## Tips

1. **Use descriptive names**: `Login_Screen` is better than `Frame1`
2. **Organize with prefixes**: `ui_Button`, `layout_Header`, `screen_Login`
3. **Keep JSON pretty**: Use `jq` to format files
4. **Commit often**: Small commits make it easier to revert changes
5. **Use branches**: Experiment with layouts on branches
6. **Add .gitignore**: Ignore temp files, node_modules, etc.

## Troubleshooting

**Frames not appearing?**
- Check that `frame.json` exists in each subdirectory
- Validate JSON syntax with `jq`
- Check file permissions
- Look at console for errors

**Changes not syncing?**
- Restart the app (file watcher might have stopped)
- Check that frame IDs match
- Ensure you're editing the correct directory

**Performance issues?**
- Limit to < 100 frames for best performance
- Consider organizing into subdirectories (only depth 1 is watched)
- Close other resource-intensive apps
