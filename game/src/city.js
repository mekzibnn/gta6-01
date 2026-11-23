// City of Solmar — road grid, blocks, beach, spots, gates, districts.
// All positions are deterministic from the seeded RNG.
import { DISTRICTS, SUNSET_PALETTE } from './config.js';

export const AVENUES = [-150, -75, 0, 75, 150];
export const STREETS = [-150, -75, 0, 75, 150];

export function makeCity(rng) {
  const spots = {
    garage: { x: 80, z: 80, label: 'Garage' },
    pier: { x: -160, z: 120, label: 'Pier' },
    fence: { x: 140, z: -140, label: 'Fence' },
    chopShop: { x: -140, z: -140, label: 'Chop Shop' },
    laundry: { x: -60, z: 60, label: 'Solmar Laundry' },
    dragStrip: { x: 150, z: 0, label: 'Race Office' },
    docks: { x: -160, z: -40, label: 'Docks' },
    marina: { x: -190, z: 40, label: 'Marina' },
    hills: { x: 40, z: -160, label: 'Hills Overlook' },
    oldtown: { x: -45, z: -45, label: 'Old Town' },
    downtown: { x: 60, z: 20, label: 'Downtown' },
  };
  const hideout = { x: 0, z: 100 };

  // Buildings fill the blocks between roads; each block gets 1-2 towers
  // in the sunset palette (ten colours, so the skyline never repeats).
  const buildings = [];
  const blockXs = [[-140, -85], [-65, -10], [10, 65], [85, 140]];
  const blockZs = [[-140, -85], [-65, -10], [10, 65], [85, 140]];
  for (const [x0, x1] of blockXs) {
    for (const [z0, z1] of blockZs) {
      const n = rng.int(1, 2);
      for (let i = 0; i < n; i += 1) {
        const w = rng.range(12, 20);
        const d = rng.range(12, 20);
        const x = rng.range(x0 + w / 2 + 2, x1 - w / 2 - 2);
        const z = rng.range(z0 + d / 2 + 2, z1 - d / 2 - 2);
        buildings.push({
          x, z, w, d,
          h: rng.range(10, 34),
          color: rng.pick(SUNSET_PALETTE),
          rot: rng.chance(0.5) ? 0 : Math.PI / 2,
        });
      }
    }
  }
  // A taller row along the marina front so the skyline reads from the sea.
  for (let i = 0; i < 6; i += 1) {
    buildings.push({
      x: -168, z: -120 + i * 48,
      w: 14, d: 18, h: rng.range(22, 40),
      color: rng.pick(SUNSET_PALETTE), rot: 0,
    });
  }

  // Palms line the sidewalks of the two main avenues.
  const palms = [];
  for (const z of [-140, -105, -70, -35, 0, 35, 70, 105, 140]) {
    palms.push({ x: 9, z });
    palms.push({ x: -84, z: z + 4 });
  }
  // Four umbrellas on the sand, west of the Marina road.
  const umbrellas = [
    { x: -190, z: -40, color: 0xff5d8f },
    { x: -202, z: 20, color: 0xffc46b },
    { x: -186, z: 80, color: 0x4cc9f0 },
    { x: -206, z: 122, color: 0x80ed99 },
  ];
  // Lamps along the avenues, glowing after dark.
  const lamps = [];
  for (const x of [-150, -75, 0, 75, 150]) {
    for (const z of [-120, -40, 40, 120]) lamps.push({ x: x + 8, z });
  }

  const gateRoutes = {
    sprint: [
      { x: 0, z: 100 }, { x: 75, z: 100 }, { x: 75, z: 0 }, { x: 0, z: 0 },
    ],
    circuit: [
      { x: 0, z: 75 }, { x: 75, z: 75 }, { x: 150, z: 75 },
      { x: 150, z: -75 }, { x: 75, z: -75 }, { x: 0, z: -75 },
    ],
    drag: [
      { x: 150, z: -75 }, { x: 150, z: 75 },
    ],
  };

  return {
    avenues: AVENUES, streets: STREETS,
    spots, hideout, buildings, palms, umbrellas, lamps, gateRoutes,
    districtAt(x, z) {
      for (const d of DISTRICTS) if (d.test(x, z)) return d;
      return DISTRICTS[DISTRICTS.length - 1];
    },
  };
}
