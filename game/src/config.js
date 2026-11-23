// Static data for Solmar Heat — districts, weapons, crew, businesses,
// missions, prices and palettes. Pure data, no logic.
export const SAVE_KEY = 'solmar-heat.save.v2';

export const DISTRICTS = [
  { id: 'marina', name: 'Marina', test: (x, z) => x < -90 },
  { id: 'docks', name: 'Docks', test: (x, z) => x >= -90 && z > 90 },
  { id: 'hills', name: 'Hills', test: (x, z) => x >= -90 && z < -90 },
  { id: 'oldtown', name: 'Old Town', test: (x, z) => x >= -90 && x < 0 && z >= -90 && z <= 90 },
  { id: 'downtown', name: 'Downtown', test: (x, z) => x >= 0 && z >= -90 && z <= 90 },
];

export const RESPECT_TITLES = [
  { at: 0, name: 'NOBODY' },
  { at: 100, name: 'DOCK HAND' },
  { at: 250, name: 'FIXER' },
  { at: 500, name: 'SHOT CALLER' },
  { at: 1000, name: 'KINGPIN' },
];

export const RANK_GRADES = [
  { at: 0, g: 'D' },
  { at: 1000, g: 'C' },
  { at: 2500, g: 'B' },
  { at: 5200, g: 'A' },
  { at: 10000, g: 'S' },
];

export const WEAPONS = [
  { slot: 0, id: 'fists', name: 'Fists', ammo: Infinity, price: 0 },
  { slot: 1, id: 'bat', name: 'Bat', ammo: Infinity, price: 150 },
  { slot: 2, id: 'pistol', name: 'Pistol', ammo: 60, price: 0 },
  { slot: 3, id: 'smg', name: 'SMG', ammo: 60, price: 900 },
  { slot: 4, id: 'shotgun', name: 'Shotgun', ammo: 18, price: 1200 },
  { slot: 5, id: 'rifle', name: 'Rifle', ammo: 40, price: 2000 },
  { slot: 6, id: 'rpg', name: 'RPG', ammo: 4, price: 5000 },
];

export const CREW = [
  { id: 'milo', name: 'Milo', role: 'Driver', ability: 'SWAP PLATES', key: 'Z', price: 900 },
  { id: 'vera', name: 'Vera', role: 'Mechanic', ability: 'QUICK FIX', key: 'X', price: 1400 },
  { id: 'tank', name: 'Tank', role: 'Lookout', ability: 'EYES OUT', key: 'C', price: 1800 },
];

export const BUSINESSES = [
  { id: 'solmar-laundry', name: 'Solmar Laundry', price: 500, income: 35 },
  { id: 'marina-diner', name: 'Marina Diner', price: 1200, income: 70 },
  { id: 'dock-warehouse', name: 'Dock Warehouse', price: 2500, income: 140 },
  { id: 'hills-motel', name: 'Hills Motel', price: 4000, income: 220 },
];

export const RACES = [
  { id: 'drag', name: 'Drag Strip', fee: 100, prize: 400 },
  { id: 'sprint', name: 'Marina Sprint', fee: 150, prize: 600 },
  { id: 'circuit', name: 'Strip Circuit', fee: 200, prize: 800 },
];

export const ENGINE_PRICES = [0, 800, 1600, 2400];
export const ARMOR_PRICES = [0, 1200, 2200];
export const NITRO_PRICE = 300;
export const NITRO_MAX = 3;

export const MISSIONS = [
  { id: 'm1', name: 'Wheels Up', reward: 400, steps: [
    { kind: 'goto', spot: 'garage', text: 'Drive to the Garage — do not get busted' } ] },
  { id: 'm2', name: 'Sunset Strip', reward: 500, steps: [
    { kind: 'goto', spot: 'dragStrip', text: 'Reach the Drag Strip before sundown' } ] },
  { id: 'm3', name: 'Dock Hand', reward: 600, steps: [
    { kind: 'goto', spot: 'docks', text: 'Pick up the crate at the Docks' },
    { kind: 'goto', spot: 'marina', text: 'Drop the crate at the Marina' } ] },
  { id: 'm4', name: 'Night Shift', reward: 700, steps: [
    { kind: 'night', spot: 'pier', text: 'Reach the Pier after dark' } ] },
  { id: 'm5', name: 'Clean Getaway', reward: 800, steps: [
    { kind: 'heat', text: 'Lose the heat — get back to zero stars' } ] },
  { id: 'm6', name: 'Laundry Day', reward: 900, steps: [
    { kind: 'goto', spot: 'laundry', text: 'Check in at Solmar Laundry' } ] },
  { id: 'm7', name: 'Full Tank', reward: 1000, steps: [
    { kind: 'goto', spot: 'hills', text: 'Climb to the Hills overlook' } ] },
  { id: 'm8', name: 'Old Town Run', reward: 1200, steps: [
    { kind: 'goto', spot: 'oldtown', text: 'Pick up the parcel in Old Town' },
    { kind: 'goto', spot: 'downtown', text: 'Deliver the parcel Downtown' } ] },
  { id: 'm9', name: "Smuggler's Run", reward: 0, steps: [
    { kind: 'goto', spot: 'pier', text: 'Pick up the package at the Pier' },
    { kind: 'goto', spot: 'fence', text: 'Drop the package at the Fence', pay: 150, heat: 1 } ] },
  { id: 'm10', name: 'Heat Wave', reward: 2000, steps: [
    { kind: 'goto', spot: 'hills', text: 'Outrun the heat — reach the Hills' } ] },
  { id: 'm11', name: 'Empire Rising', reward: 6000, steps: [
    { kind: 'own', text: 'Own a business — any storefront will do' },
    { kind: 'goto', spot: 'laundry', text: 'Drop the ledger at Solmar Laundry', pay: 150 } ] },
  { id: 'm12', name: 'Crew Up', reward: 7500, steps: [
    { kind: 'crew', text: 'Have Milo on the roster and a Sprint win' },
    { kind: 'crew', text: 'The crew is ready — meet Milo at the hideout' } ] },
];

export const SUNSET_PALETTE = [
  0xff9a5c, 0xff7a6b, 0xffc46b, 0xf26d7d, 0x8ecae6,
  0xffb703, 0xfb8500, 0xe07a5f, 0x81b29a, 0xf4a261,
];

export const DISPATCH_NAMES = [
  'KITE-1', 'MARLIN-3', 'CORAL-48', 'PALM-7', 'SURF-12',
  'TIDE-22', 'REEF-5', 'BAY-9', 'DUNE-4', 'FOAM-17',
];

export const DISPATCH_ROLES = [
  'RAMMING', 'FLANKING', 'SPOTLIGHT', 'ROADBLOCK', 'SHORE WATCH', 'MARKSMAN',
];

export const LEO_LINES = [
  'New wheels, same streets. Get to the Garage, kid.',
  'All units, suspect heading down the avenue. Stay sharp.',
  'Air One has eyes on the suspect. Do not lose them.',
  'KPD to all units: box them in at the next light.',
  'Suspect is quick. RAM units, take the front.',
];

export const RADIO_LINE = 'SOL FM 98.4 — Solmar Nights';
export const STATION_NAME = 'SOL FM 98.4';
