// Solmar City — the map (v6 rewrite).
// A seeded grid city: avenues run north-south, streets run east-west, and
// the blocks between them hold the buildings. Five districts give the city
// its character — harbor, marina, uptown, downtown and the central strip —
// and every business, garage, hideout and race gate sits at a fixed spot
// the missions and the HUD can point at.

import { makeDice, diceRange, dicePick, diceInt } from './random.js';
import { WORLD, LOOK } from './config.js';

export const DISTRICTS = [
  { id: 'harbor', label: 'Harbor', x0: -340, z0: 88, x1: -88, z1: 340 },
  { id: 'marina', label: 'Marina', x0: 88, z0: 88, x1: 340, z1: 340 },
  { id: 'uptown', label: 'Uptown', x0: -340, z0: -340, x1: -88, z1: -88 },
  { id: 'downtown', label: 'Downtown', x0: 88, z0: -340, x1: 340, z1: -88 },
  { id: 'central', label: 'Central Solmar', x0: -88, z0: -88, x1: 88, z1: 88 },
];

export const AVENUES = [-264, -176, -88, 0, 88, 176, 264];
export const STREETS = [-264, -176, -88, 0, 88, 176, 264];

// Fixed spots, chosen fresh for v6. Missions, shops and races point here.
export const SPOTS = {
  hideout: { x: -24, z: 196, label: 'Hideout' },
  garage: { x: 148, z: -148, label: 'Garage' },
  chopShop: { x: -196, z: -24, label: 'Chop Shop' },
  fence: { x: 196, z: 24, label: 'Fence' },
  hospital: { x: -148, z: 148, label: 'Hospital' },
  police: { x: 24, z: -196, label: 'Police HQ' },
  taxiOffice: { x: -220, z: -180, label: 'Sunset Taxi Co.' },
  laundry: { x: -220, z: 180, label: 'Solmar Laundry' },
  carWash: { x: 220, z: 180, label: 'Palm Wash' },
  nightclub: { x: 220, z: -180, label: 'Neon Palms Club' },
  dragStrip: { x: 0, z: 264, label: 'Drag Strip' },
  pier: { x: -264, z: 264, label: 'Pier' },
  plaza: { x: 0, z: 0, label: 'Central Plaza' },
};

// Race gate chains, laid along the road grid (v6 routes).
export const GATE_ROUTES = {
  drag: [
    { x: -88, z: 264 },
    { x: 88, z: 264 },
  ],
  sprint: [
    { x: -264, z: 88 },
    { x: -88, z: 88 },
    { x: 88, z: -88 },
    { x: 264, z: -88 },
  ],
  circuit: [
    { x: -176, z: -176 },
    { x: 176, z: -176 },
    { x: 176, z: 176 },
    { x: -176, z: 176 },
    { x: -176, z: 0 },
    { x: 0, z: 0 },
  ],
};

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x <= d.x1 && z >= d.z0 && z <= d.z1) return d;
  }
  return DISTRICTS[4];
}

export function nearestAvenue(x) {
  let best = AVENUES[0];
  let bestD = Infinity;
  for (const a of AVENUES) {
    const d = Math.abs(a - x);
    if (d < bestD) { bestD = d; best = a; }
  }
  return best;
}

export function nearestStreet(z) {
  let best = STREETS[0];
  let bestD = Infinity;
  for (const s of STREETS) {
    const d = Math.abs(s - z);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best;
}

export function onRoad(x, z) {
  const half = WORLD.roadWidth / 2;
  for (const a of AVENUES) if (Math.abs(x - a) <= half) return true;
  for (const s of STREETS) if (Math.abs(z - s) <= half) return true;
  return false;
}

export function clampToCity(x, z) {
  const m = WORLD.halfSize - 8;
  return {
    x: Math.max(-m, Math.min(m, x)),
    z: Math.max(-m, Math.min(m, z)),
  };
}

export function initCity(seed) {
  const dice = makeDice(seed);
  const buildings = [];
  // One building per block cell, seeded so the skyline never changes.
  for (let ix = 0; ix < AVENUES.length - 1; ix += 1) {
    for (let iz = 0; iz < STREETS.length - 1; iz += 1) {
      const cx = (AVENUES[ix] + AVENUES[ix + 1]) / 2;
      const cz = (STREETS[iz] + STREETS[iz + 1]) / 2;
      const d = districtAt(cx, cz);
      const tall = d.id === 'downtown' ? 1.6 : d.id === 'central' ? 1.2 : 1.0;
      const count = diceInt(dice, 1, 3);
      for (let b = 0; b < count; b += 1) {
        const w = diceRange(dice, 14, 26);
        const dep = diceRange(dice, 14, 26);
        const h = diceRange(dice, 10, 42) * tall;
        buildings.push({
          x: cx + diceRange(dice, -12, 12),
          z: cz + diceRange(dice, -12, 12),
          w,
          d: dep,
          h,
          color: dicePick(dice, LOOK.buildingColors),
          district: d.id,
        });
      }
    }
  }
  // Streetlamps along every avenue, both sides, every other block.
  const lamps = [];
  for (const a of AVENUES) {
    for (const s of STREETS) {
      if ((Math.round(a / 88) + Math.round(s / 88)) % 2 === 0) {
        lamps.push({ x: a + 8, z: s + 8 });
        lamps.push({ x: a - 8, z: s - 8 });
      }
    }
  }
  // Palm trees on the marina and harbor sidewalks.
  const palms = [];
  for (let i = 0; i < 48; i += 1) {
    const side = dicePick(dice, [-1, 1]);
    palms.push({
      x: diceRange(dice, 100, 320) * side,
      z: diceRange(dice, 120, 320),
    });
  }
  return {
    seed,
    districts: DISTRICTS,
    avenues: AVENUES,
    streets: STREETS,
    buildings,
    lamps,
    palms,
    spots: SPOTS,
    gateRoutes: GATE_ROUTES,
  };
}

export function ventureSpot(city, ventureId) {
  const map = {
    'solmar-laundry': city.spots.laundry,
    'palm-wash': city.spots.carWash,
    'sunset-taxi': city.spots.taxiOffice,
    'neon-palms': city.spots.nightclub,
  };
  return map[ventureId] || city.spots.plaza;
}

export function gateChain(city, raceId) {
  return (city.gateRoutes[raceId] || []).slice();
}

export function spotByLabel(city, label) {
  for (const key of Object.keys(city.spots)) {
    if (city.spots[key].label === label) return city.spots[key];
  }
  return city.spots.plaza;
}
