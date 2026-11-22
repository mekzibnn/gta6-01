// The city of Solmar. No game logic here, only the map.
// A grid of blocks with roads between them, a beach on the west edge, five
// districts, and the spots the missions and shops stand on.

import { PALETTE, ROOF_COLORS, DISTRICTS, WORLD } from './config.js';

// Block centres, one pitch apart.
const CENTRES = [-182, -130, -78, -26, 26, 78, 130, 182];

export function buildCity(rng) {
  const buildings = [];
  for (const bx of CENTRES) {
    for (const bz of CENTRES) {
      const downtown = Math.abs(bx) <= 78 && Math.abs(bz) <= 78;
      const count = rng.int(1, 3);
      for (let i = 0; i < count; i += 1) {
        const w = rng.range(10, 18);
        const d = rng.range(10, 18);
        const x = bx + rng.range(-14, 14);
        const z = bz + rng.range(-14, 14);
        const h = downtown ? rng.range(20, 60) : rng.range(8, 28);
        buildings.push({
          x,
          z,
          w,
          d,
          h,
          color: rng.pick(PALETTE),
          roof: rng.pick(ROOF_COLORS),
        });
      }
    }
  }

  // Palms on the sidewalks, at block corners, never in the road.
  const palms = [];
  for (const bx of CENTRES) {
    for (const bz of CENTRES) {
      for (const [dx, dz] of [[-22, -22], [22, -22], [-22, 22], [22, 22]]) {
        if (rng.chance(0.55)) palms.push({ x: bx + dx, z: bz + dz });
      }
    }
  }

  // Four umbrellas on the Marina sand strip, west edge.
  const umbrellas = [
    { x: -215, z: -78 },
    { x: -218, z: -26 },
    { x: -215, z: 26 },
    { x: -218, z: 78 },
  ];

  const spots = {
    garage: { x: 52, z: 52 },
    pier: { x: -156, z: 156 },
    fence: { x: -52, z: 156 },
    chopShop: { x: 156, z: -52 },
    laundry: { x: -52, z: -52 },
    dragStrip: { x: 156, z: 156 },
    hideout: { x: 0, z: 156 },
    taxiStand: { x: 104, z: -104 },
    hotel: { x: 104, z: 104 },
    docks: { x: -104, z: 156 },
  };

  const gateRoutes = {
    sprint: [
      { x: 156, z: 156 },
      { x: 156, z: 52 },
      { x: 52, z: 52 },
      { x: 52, z: 156 },
    ],
    circuit: [
      { x: 52, z: 52 },
      { x: 52, z: -52 },
      { x: -52, z: -52 },
      { x: -52, z: 52 },
      { x: -52, z: 104 },
      { x: 52, z: 104 },
    ],
    drag: [
      { x: 0, z: -156 },
      { x: 0, z: -52 },
      { x: 0, z: 52 },
    ],
  };

  function districtAt(x, z) {
    for (const d of DISTRICTS) {
      if (d.test(x, z)) return d;
    }
    return DISTRICTS[DISTRICTS.length - 1];
  }

  return { buildings, palms, umbrellas, spots, gateRoutes, districtAt };
}

// The road lines, for the renderer: avenues and streets at every pitch.
export function roadLines() {
  const lines = [];
  for (let i = -4; i <= 4; i += 1) {
    lines.push({ axis: 'x', at: i * WORLD.pitch });
    lines.push({ axis: 'z', at: i * WORLD.pitch });
  }
  return lines;
}
