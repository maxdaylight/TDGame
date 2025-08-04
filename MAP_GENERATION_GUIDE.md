# Map Generation Guide for TDGAME

## Overview

This guide explains how to generate and customize maps in TDGAME, including approach zones, path layouts, and playable areas. It also covers how to add new maps and enable map selection for players.

---

## 1. Map Generation System

The map generation logic is in `frontend/src/js/game.js`:

- The `generateMap(options)` function creates the map grid, path, and approach zone.
- The `createTerrainBlocking(approachZoneWidth)` function blocks unbuildable areas (e.g., approach zones).

### Example: Generating a Map with a Large Approach Zone

```javascript
// In your game initialization code:
this.generateMap({
    approachZoneWidth: 8, // Number of columns blocked on the left
    path: [
        { x: 0, y: 7 },
        { x: 8, y: 7 },
        { x: 8, y: 4 },
        { x: 13, y: 4 },
        { x: 13, y: 10 },
        { x: 18, y: 10 },
        { x: 18, y: 7 },
        { x: 22, y: 7 },
        { x: 22, y: 12 },
        { x: 24, y: 12 }
    ]
});
```

- `approachZoneWidth`: Number of columns on the left that are unbuildable (set larger than any tower's range).
- `path`: Array of `{x, y}` points defining the enemy path.

---

## 2. Adding New Maps

To add a new map:

1. Define a new map configuration (approach zone width and path).
2. Store map configs in a `maps.js` file or similar for easy management.
3. Pass the selected map config to `generateMap()` during game setup.

### Example: maps.js

```javascript
export const MAPS = [
  {
    name: 'Classic',
    approachZoneWidth: 6,
    path: [ /* ... */ ]
  },
  {
    name: 'Wide Approach',
    approachZoneWidth: 10,
    path: [ /* ... */ ]
  },
  // Add more maps here
];
```

---

## 3. Player Map/Level Selection System

To let players view and select maps:

1. Create a UI component (e.g., dropdown or gallery) listing available maps.
2. When a player selects a map, pass its config to `generateMap()`.
3. Show a preview (optional) by rendering the map grid and path before starting the game.

### Example: Map Selection UI (pseudo-code)

```javascript
// In your UI code:
import { MAPS } from './maps.js';

function showMapSelection() {
  MAPS.forEach((map, idx) => {
    // Render map name and preview button
    // On select: game.generateMap(map)
  });
}
```

---

## 4. Best Practices

- Always set `approachZoneWidth` greater than the max tower range.
- Keep map configs in a central file for easy updates.
- Test new maps for balance and playability.

---

For more details, see the code comments in `game.js` and the UI implementation for map selection.
