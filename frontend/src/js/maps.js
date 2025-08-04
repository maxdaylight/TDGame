// Central map definitions for TDGAME
// Add new maps here for player selection

export const MAPS = [
  {
    id: 0,
    name: 'Classic',
    approachZoneWidth: 6,
    path: [
      { x: 0, y: 7 },
      { x: 6, y: 7 },
      { x: 6, y: 4 },
      { x: 11, y: 4 },
      { x: 11, y: 10 },
      { x: 16, y: 10 },
      { x: 16, y: 7 },
      { x: 20, y: 7 },
      { x: 20, y: 12 },
      { x: 22, y: 12 }
    ]
  },
  {
    id: 1,
    name: 'Wide Approach',
    approachZoneWidth: 10,
    path: [
      { x: 0, y: 8 },
      { x: 10, y: 8 },
      { x: 10, y: 3 },
      { x: 15, y: 3 },
      { x: 15, y: 11 },
      { x: 20, y: 11 },
      { x: 20, y: 8 },
      { x: 24, y: 8 },
      { x: 24, y: 13 },
      { x: 26, y: 13 }
    ]
  },
  {
    id: 2,
    name: 'Narrow Pass',
    approachZoneWidth: 8,
    path: [
      { x: 0, y: 5 },
      { x: 8, y: 5 },
      { x: 8, y: 8 },
      { x: 12, y: 8 },
      { x: 12, y: 2 },
      { x: 18, y: 2 },
      { x: 18, y: 9 },
      { x: 22, y: 9 }
    ]
  }
  // Add more maps as needed
];
