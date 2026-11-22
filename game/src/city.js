// Solmar Heat v7 — the city.
// Solmar is a grid: avenues run north-south, streets east-west, a block
// between every pair. The layout is fixed (so missions and tests always
// find the same corners), while the buildings inside the blocks are dealt
// from the seed. Five districts split the map; districtAt() tells you
// which one any position belongs to.

import { WORLD, DISTRICTS } from './config.js';

// Named places. The two the playtest pins down are the Gun Store and the
// Crew Office; everything else is read out of city.spots at runtime.
export const SPOTS = {
  hideout: { x: -6, z: 150, label: 'Hideout' },
  garage: { x: 60, z: 90, label: 'Garage' },
  pier: { x: -150, z: 150, label: 'Pier' },
  fence: { x: 150, z: -150, label: 'Fence' },
  chopShop: { x: -150, z: -90, label: 'Chop Shop' },
  laundry: { x: 60, z: 150, label: 'Solmar Laundry' },
  carWash: { x: -90, z: 120, label: 'Sunset Car Wash' },
  taxiCo: { x: 90, z: -120, label: 'Sunset Taxi Co.' },
  nightclub: { x: 0, z: -150, label: 'Club Neon' },
  dragStrip: { x: 120, z: 60, label: 'Race Office' },
  gunStore: { x: 148, z: 148, label: 'Gun Store' },
  crewOffice: { x: -24, z: -196, label: 'Crew Office' },
  diner: { x: -120, z: 30, label: 'Diner' },
};

const VENTURE_SPOT = {
  'solmar-laundry': 'laundry',
  'sunset-carwash': 'carWash',
  'sunset-taxi': 'taxiCo',
  'club-neon': 'nightclub',
};

export function districtAt(x, z) {
  let id = 'downtown';
  if (Math.abs(x) <= 60 && Math.abs(z) <= 60) id = 'downtown';
  else if (x < -60 && z > 60) id = 'marina';
  else if (x < -60 && z < -60) id = 'oldtown';
  else if (x > 60 && z < -60) id = 'docks';
  else if (x > 60 && z > 60) id = 'hills';
  else if (z > 60) id = x <= 0 ? 'marina' : 'hills';
  else if (z < -60) id = x <= 0 ? 'oldtown' : 'docks';
  else if (x < -60) id = z <= 0 ? 'oldtown' : 'marina';
  else id = z <= 0 ? 'docks' : 'hills';
  return DISTRICTS.find((d) => d.id === id);
}

export function ventureSpot(city, ventureId) {
  const key = VENTURE_SPOT[ventureId];
  return key ? city.spots[key] : null;
}

export function gateChain(city, raceId) {
  return city.gateRoutes[raceId] || [];
}

function nearSpot(x, z, margin) {
  for (const key of Object.keys(SPOTS)) {
    const s = SPOTS[key];
    const dx = s.x - x;
    const dz = s.z - z;
    if (dx * dx + dz * dz < margin * margin) return true;
  }
  return false;
}

export function initCity(seed) {
  let state = (seed >>> 0) || 1;
  const rnd = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const buildings = [];
  const lamps = [];
  // One or two buildings per block, kept clear of the named spots.
  for (let bx = -150; bx <= 150; bx += 60) {
    for (let bz = -150; bz <= 150; bz += 60) {
      if (nearSpot(bx, bz, 20)) continue;
      const tall = Math.abs(bx) <= 60 && Math.abs(bz) <= 60;
      const count = rnd() < 0.45 ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const ox = count === 1 ? 0 : (i === 0 ? -11 : 11);
        const oz = count === 1 ? 0 : (i === 0 ? -11 : 11);
        const w = 16 + rnd() * 10;
        const d = 16 + rnd() * 10;
        const h = tall ? 26 + rnd() * 34 : 8 + rnd() * 16;
        buildings.push({
          x: bx + ox, z: bz + oz, w, d, h,
          hue: 0.55 + rnd() * 0.15,
          roof: rnd(),
        });
      }
    }
  }
  // Lamps stand at the corners where avenues meet streets.
  for (let ax = -180; ax <= 180; ax += 60) {
    for (let az = -180; az <= 180; az += 60) {
      if (rnd() < 0.8) lamps.push({ x: ax + 9, z: az + 9 });
    }
  }
  const gateRoutes = {
    drag: [
      { x: 120, z: 120 },
      { x: 120, z: -60 },
    ],
    sprint: [
      { x: 0, z: 120 },
      { x: 0, z: 30 },
      { x: 60, z: -60 },
      { x: 120, z: -120 },
    ],
    circuit: [
      { x: 120, z: 120 },
      { x: 0, z: 120 },
      { x: -120, z: 60 },
      { x: -120, z: -120 },
      { x: 0, z: -120 },
      { x: 120, z: -60 },
    ],
  };
  return {
    seed,
    spots: SPOTS,
    buildings,
    lamps,
    gateRoutes,
    districtAt,
    half: WORLD.half,
    block: WORLD.block,
    road: WORLD.road,
  };
}
