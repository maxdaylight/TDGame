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
      { x: 19, y: 7 }
    ]
  },
  {
    id: 1,
    name: 'Wide Approach',
    approachZoneWidth: 10,
    path: [
      { x: 0, y: 8 },
      { x: 8, y: 8 },
      { x: 8, y: 3 },
      { x: 13, y: 3 },
      { x: 13, y: 11 },
      { x: 19, y: 11 }
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
      { x: 19, y: 9 }
    ]
  }
  // Add more maps as needed
];
