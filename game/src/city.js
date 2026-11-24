// Solmar Heat v12 — city layout: districts, roads, buildings, palms, spots.
import { DISTRICTS, SPOTS, PALETTE } from './config.js';
import { makeRng } from './random.js';

const ROADS_X = [-150, -75, 0, 75, 150];
const ROADS_Z = [-150, -75, 0, 75, 150];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && z >= d.z0 && z < d.z1) return { name: d.name };
  }
  return { name: 'Downtown' };
}

export function buildCity(seed) {
  const rng = makeRng(seed || 1);
  const buildings = [];
  // One building per block cell between roads; roads stay clear corridors.
  const blockXs = [-187, -112, -37, 37, 112, 187];
  const blockZs = [-187, -112, -37, 37, 112, 187];
  let bi = 0;
  for (const bx of blockXs) {
    for (const bz of blockZs) {
      if (bx > 150 && bz > 150) continue; // beach corner stays open sand
      const n = rng.int(1, 2);
      for (let k = 0; k < n; k += 1) {
        const w = rng.range(14, 26);
        const d = rng.range(14, 26);
        const h = rng.range(8, 30);
        const x = bx + rng.range(-8, 8) + (k ? 12 : -6);
        const z = bz + rng.range(-8, 8) + (k ? -10 : 6);
        buildings.push({
          id: bi, x, z, w, d, h,
          color: PALETTE[bi % PALETTE.length],
          roof: 0x2b2b33,
        });
        bi += 1;
      }
    }
  }
  // Palms line the avenue and the beach road.
  const palms = [];
  for (let i = 0; i < 8; i += 1) {
    palms.push({ x: -6, z: -140 + i * 40, h: rng.range(5, 7) });
    palms.push({ x: 6, z: -120 + i * 40, h: rng.range(5, 7) });
  }
  for (let i = 0; i < 4; i += 1) palms.push({ x: 158, z: -90 + i * 60, h: rng.range(5, 7) });
  // Four beach umbrellas on the sand (exactly 4 — playtest pins this).
  const umbrellas = [
    { x: 175, z: -45, color: 0xe85d5d },
    { x: 178, z: -15, color: 0xf2b705 },
    { x: 175, z: 15, color: 0x3e8e8a },
    { x: 178, z: 45, color: 0xe88aa0 },
  ];
  const gateRoutes = {
    sprint: [{ x: 0, z: -120 }, { x: 0, z: -40 }, { x: 0, z: 40 }, { x: 0, z: 120 }],
    circuit: [{ x: 0, z: -120 }, { x: 75, z: -60 }, { x: 75, z: 60 }, { x: 0, z: 120 }, { x: -75, z: 60 }, { x: -75, z: -60 }],
    drag: [{ x: 170, z: -100 }, { x: 170, z: 100 }],
  };
  return {
    districts: DISTRICTS,
    spots: { ...SPOTS },
    gateRoutes,
    palms,
    umbrellas,
    buildings,
    roadsX: ROADS_X,
    roadsZ: ROADS_Z,
    districtAt,
  };
}
