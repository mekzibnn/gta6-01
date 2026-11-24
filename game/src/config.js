// Solmar Heat v12 — shared constants. All tuning numbers live here.
export const WORLD = { min: -220, max: 220, beachX: 165, waterX: 195 };

export const DISTRICTS = [
  { name: 'Downtown', x0: -75, z0: -75, x1: 75, z1: 75 },
  { name: 'Old Town', x0: -220, z0: -75, x1: -75, z1: 75 },
  { name: 'Beachfront', x0: 75, z0: -75, x1: 220, z1: 220 },
  { name: 'Marina', x0: -75, z0: 75, x1: 75, z1: 220 },
  { name: 'Hillside', x0: -220, z0: 75, x1: -75, z1: 220 },
];

export const SPOTS = {
  hideout: { x: 0, z: 100 },
  garage: { x: 12, z: 60 },
  pier: { x: -160, z: 190 },
  fence: { x: -140, z: -60 },
  chopShop: { x: 140, z: -140 },
  laundry: { x: -100, z: 60 },
  dragStrip: { x: 180, z: -20 },
  bank: { x: 40, z: -120 },
  safehouse: { x: -60, z: 180 },
  taxiStand: { x: -30, z: 120 },
  stadium: { x: 120, z: 120 },
};

export const GUN_STORE = { x: 148, z: 148 };
export const CREW_OFFICE = { x: -24, z: -196 };
export const HIDDEN_PACKAGES = [
  { x: -170, z: -160 }, { x: 60, z: 180 }, { x: 200, z: 40 }, { x: -190, z: 20 },
  { x: 100, z: -170 }, { x: -40, z: -180 }, { x: 170, z: 160 }, { x: -120, z: 140 },
];
export const STUNT_JUMPS = [
  { x: 0, z: -150, dir: 0 }, { x: 150, z: 60, dir: 1 }, { x: -150, z: 0, dir: 0 },
];

export const WEAPONS = [
  { name: 'Fists', ammo: Infinity, price: 0 },
  { name: 'Bat', ammo: Infinity, price: 0 },
  { name: 'Pistol', ammo: 60, reserve: 60, price: 300 },
  { name: 'SMG', ammo: 30, reserve: 60, price: 800 },
  { name: 'Shotgun', ammo: 8, reserve: 24, price: 1200 },
  { name: 'Rifle', ammo: 30, reserve: 90, price: 2000 },
  { name: 'RPG', ammo: 1, reserve: 4, price: 5000 },
];

export const VEHICLE_DEFS = {
  sedan: { top: 28, accel: 13, turn: 1.9, price: 400, label: 'SEDAN' },
  taxi: { top: 26, accel: 12, turn: 1.9, price: 350, label: 'TAXI' },
  sport: { top: 38, accel: 18, turn: 2.4, price: 1200, label: 'SPORT' },
  van: { top: 22, accel: 10, turn: 1.6, price: 600, label: 'VAN' },
  truck: { top: 20, accel: 9, turn: 1.4, price: 800, label: 'TRUCK' },
  motorcycle: { top: 34, accel: 20, turn: 2.8, price: 900, label: 'BIKE' },
  pickup: { top: 26, accel: 12, turn: 1.8, price: 700, label: 'PICKUP' },
};

export const BUSINESSES = [
  { id: 'solmar-laundry', name: 'Solmar Laundry', price: 500, rate: 35 },
  { id: 'marina-cafe', name: 'Marina Cafe', price: 1200, rate: 60 },
  { id: 'beach-bar', name: 'Beach Bar', price: 2000, rate: 90 },
  { id: 'hillside-motors', name: 'Hillside Motors', price: 3500, rate: 140 },
];

export const CREW_DEFS = [
  { id: 'milo', name: 'Milo', role: 'Driver', ability: 'SWAP PLATES', key: 'Z', price: 900 },
  { id: 'vera', name: 'Vera', role: 'Mechanic', ability: 'QUICK FIX', key: 'X', price: 1400 },
  { id: 'tank', name: 'Tank', role: 'Lookout', ability: 'EYES OUT', key: 'C', price: 1800 },
];

export const RACE_DEFS = {
  sprint: { fee: 150, prize: 600, label: 'Marina Sprint' },
  circuit: { fee: 200, prize: 900, label: 'Strip Circuit' },
  drag: { fee: 100, prize: 400, label: 'Beach Drag' },
};

export const GARAGE_PRICES = { engine: [800, 1600, 2400], armor: [600, 1200], nitro: 200 };

export const DISPATCH_UNITS = [
  { id: 1, name: 'KITE-1', role: 'RAMMING', kind: 'ram' },
  { id: 2, name: 'MARLIN-3', role: 'PIT', kind: 'pit' },
  { id: 3, name: 'CORAL-48', role: 'SHORE WATCH', kind: 'shore' },
  { id: 4, name: 'PALM-7', role: 'RAMMING', kind: 'ram' },
  { id: 5, name: 'SURF-12', role: 'PIT', kind: 'pit' },
  { id: 6, name: 'TIDE-22', role: 'FLANKING', kind: 'flank' },
];

export const PALETTE = [0xe86a33, 0xe85d5d, 0xe88aa0, 0xf2d8a7, 0x3e8e8a, 0xf2b705, 0x7a5c9e];

export const RADIO = { station: 'SOL FM 98.4', show: 'Solmar Nights', tracks: ['Neon Coast', 'Palm Static', 'Golden Hour Drive', 'Vice City Lights', 'Sunset Run'] };

export const LEO_LINES = [
  'All units, suspect heading down the avenue. Stay sharp.',
  'Air One has visual. Keep the spotlight on the suspect.',
  'Units 3 and 5, set up a roadblock at the Marina.',
  'Suspect is armed. Approach with caution.',
  'Dispatch, we need a PIT unit on the avenue, now.',
  'All units, the suspect is heading for the Hillside.',
];

export const RANK_TITLES = [
  { rp: 0, letter: 'D', title: 'NOBODY' },
  { rp: 250, letter: 'C', title: 'DOCK HAND' },
  { rp: 600, letter: 'C', title: 'HUSTLER' },
  { rp: 1200, letter: 'B', title: 'FIXER' },
  { rp: 2000, letter: 'A', title: 'KINGPIN' },
  { rp: 3000, letter: 'S', title: 'SOLMAR LEGEND' },
];

export function rankFor(rp) {
  let cur = RANK_TITLES[0];
  let next = null;
  for (let i = 0; i < RANK_TITLES.length; i += 1) {
    if (rp >= RANK_TITLES[i].rp) cur = RANK_TITLES[i];
    else { next = RANK_TITLES[i]; break; }
  }
  return { cur, next };
}

export function standingLabel(v) {
  if (v < 20) return 'COLD';
  if (v < 50) return 'COOL';
  if (v < 100) return 'NEUTRAL';
  if (v < 150) return 'WARM';
  return 'HOT';
}
