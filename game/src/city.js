// The city of Solmar. A street grid, five districts, the mission spots,
// the shop fronts, the sunset buildings, the palms, the beach umbrellas
// and the race gates. Everything is laid out from the seed, so the same
// seed always builds the same city.

import { PALETTE } from './config.js';

// The street lines. Roads run along these x and z coordinates.
export const STREETS = [-180, -120, -60, 0, 60, 120, 180];
export const CITY_MIN = -210;
export const CITY_MAX = 210;

// The named spots. Mission checks and shop prompts both read these.
export const SPOTS = {
  hideout: { x: 0, z: 150 },
  garage: { x: 90, z: -30 },
  pier: { x: -180, z: 180 },
  fence: { x: 180, z: -180 },
  chopShop: { x: -150, z: -150 },
  laundry: { x: 120, z: 120 },
  docks: { x: -60, z: 200 },
  marina: { x: -180, z: 20 },
  dragStrip: { x: 30, z: -180 },
  gunStore: { x: 148, z: 148 },
  crewOffice: { x: -24, z: -196 },
};

// The shop fronts: where the player stands to open a menu.
export const SHOP_SPOTS = [
  { x: 90, z: -30, label: 'Solmar Garage', kind: 'garage' },
  { x: 148, z: 148, label: 'Gun Store', kind: 'guns' },
  { x: 120, z: 120, label: 'Solmar Laundry', kind: 'venture', business: 'solmar-laundry' },
  { x: -120, z: 60, label: 'Harbor Diner', kind: 'venture', business: 'harbor-diner' },
  { x: 150, z: -90, label: 'Sunset Motel', kind: 'venture', business: 'sunset-motel' },
  { x: -150, z: 60, label: 'Marina Club', kind: 'venture', business: 'marina-club' },
  { x: -24, z: -196, label: 'Crew Office', kind: 'crew' },
  { x: 30, z: -180, label: 'Race Office', kind: 'races' },
  { x: -150, z: -150, label: 'Chop Shop', kind: 'chop' },
];

// Which district a point belongs to. West is the Marina, east the Hills,
// north the Old Town, south the Docks, the middle is Downtown.
export function districtAt(x, z) {
  if (x < -100) return { key: 'marina', name: 'Marina' };
  if (x > 100) return { key: 'hills', name: 'Hills' };
  if (z < -100) return { key: 'oldtown', name: 'Old Town' };
  if (z > 100) return { key: 'docks', name: 'Docks' };
  return { key: 'downtown', name: 'Downtown' };
}

// Build the whole city from the seeded RNG.
export function makeCity(rng) {
  const city = {
    spots: JSON.parse(JSON.stringify(SPOTS)),
    shopSpots: SHOP_SPOTS,
    buildings: [],
    palms: [],
    umbrellas: [],
    gateRoutes: { sprint: [], circuit: [], drag: [] },
    districtAt,
  };

  // Buildings: one or two per block, kept off the streets and off the
  // spots. A block is the ground between two neighbouring street lines.
  const spotList = Object.values(SPOTS);
  for (let i = 0; i < STREETS.length - 1; i += 1) {
    for (let j = 0; j < STREETS.length - 1; j += 1) {
      const x0 = STREETS[i] + 8;
      const x1 = STREETS[i + 1] - 8;
      const z0 = STREETS[j] + 8;
      const z1 = STREETS[j + 1] - 8;
      if (x1 - x0 < 18 || z1 - z0 < 18) continue;
      const count = rng.chance(0.55) ? 2 : 1;
      for (let k = 0; k < count; k += 1) {
        const w = rng.range(12, 24);
        const d = rng.range(12, 24);
        const x = rng.range(x0 + w / 2, x1 - w / 2);
        const z = rng.range(z0 + d / 2, z1 - d / 2);
        // Keep the spots clear so the player can always reach them.
        if (spotList.some((s) => Math.abs(s.x - x) < 18 && Math.abs(s.z - z) < 18)) continue;
        const pal = rng.pick(PALETTE);
        city.buildings.push({
          x, z, w, d,
          h: rng.range(9, 30),
          color: pal.wall,
          roof: pal.roof,
        });
      }
    }
  }

  // Palms on the sidewalk corners, at least ten of them.
  const corners = [];
  for (const sx of STREETS) {
    for (const sz of STREETS) corners.push([sx + 7, sz + 7]);
  }
  for (let i = 0; i < corners.length && city.palms.length < 18; i += 1) {
    if (!rng.chance(0.55)) continue;
    const [x, z] = corners[i];
    if (x < CITY_MIN + 6 || x > CITY_MAX - 6) continue;
    city.palms.push({ x: x + rng.jitter(2), z: z + rng.jitter(2), h: rng.range(6, 9) });
  }
  // Top the palms up if the coin flips were unkind.
  while (city.palms.length < 12) {
    city.palms.push({
      x: rng.range(-170, 170),
      z: rng.range(-170, 170),
      h: rng.range(6, 9),
    });
  }

  // Four umbrellas on the sand, west strip.
  const umbrellaColors = [0xe07856, 0xf0c94a, 0x3f8f8a, 0xd99a8c];
  for (let i = 0; i < 4; i += 1) {
    city.umbrellas.push({
      x: -222 + rng.jitter(4),
      z: -120 + i * 80 + rng.jitter(10),
      color: umbrellaColors[i],
    });
  }

  // Race gates. The Sprint runs down the avenue (x = 0), the Circuit
  // loops the blocks, the Drag is a straight shot on the south road.
  city.gateRoutes.sprint = [
    { x: 0, z: 120 }, { x: 0, z: 40 }, { x: 0, z: -40 }, { x: 0, z: -120 },
  ];
  city.gateRoutes.circuit = [
    { x: 0, z: 120 }, { x: 120, z: 120 }, { x: 120, z: -120 },
    { x: 0, z: -120 }, { x: -120, z: -120 }, { x: -120, z: 120 },
  ];
  city.gateRoutes.drag = [
    { x: -120, z: 180 }, { x: 120, z: 180 },
  ];

  return city;
}

// A building footprint test the cars use so they do not drive through
// walls. Returns the push-out for a point inside a building, or null.
export function buildingPush(city, x, z, margin) {
  for (const b of city.buildings) {
    const dx = x - b.x;
    const dz = z - b.z;
    const hx = b.w / 2 + margin;
    const hz = b.d / 2 + margin;
    if (Math.abs(dx) < hx && Math.abs(dz) < hz) {
      const px = hx - Math.abs(dx);
      const pz = hz - Math.abs(dz);
      if (px < pz) return { x: b.x + Math.sign(dx || 1) * hx, z };
      return { x, z: b.z + Math.sign(dz || 1) * hz };
    }
  }
  return null;
}
