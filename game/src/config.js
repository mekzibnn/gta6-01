// Solmar Heat v7 — tuning constants.
// Every number the game balances on lives here, so a single read tells you
// what a mission pays, what an upgrade costs, and how the heat behaves.
// The four v7 systems (booms, districts, RAM/PIT, weapon wheel) get their
// own blocks at the bottom of this file.

export const ECONOMY = {
  startCash: 400,
  taxiFare: 25,
  chopRate: 0.45,
  bustLoss: 0.2,
  foodHeal: 40,
  foodCost: 30,
};

export const WORLD = {
  half: 210,
  block: 60,
  road: 14,
  pedCount: 48,
  trafficCount: 26,
  parkedCount: 3,
  maxCops: 10,
  clockRate: 120,
};

export const GARAGE = {
  engines: [
    { name: 'Stock', cost: 0, top: 26, accel: 11 },
    { name: 'Street', cost: 800, top: 32, accel: 14 },
    { name: 'Race', cost: 1600, top: 38, accel: 17 },
    { name: 'Pro', cost: 3200, top: 45, accel: 21 },
  ],
  armors: [
    { name: 'None', cost: 0, soak: 0 },
    { name: 'Light', cost: 1000, soak: 0.25 },
    { name: 'Heavy', cost: 2200, soak: 0.5 },
  ],
  nitro: { cost: 300, max: 3, burn: 2.5, boost: 1.6 },
  paints: [
    { name: 'Sunset Orange', color: 0xff7a1a, cost: 200 },
    { name: 'Midnight Blue', color: 0x1f3a93, cost: 200 },
    { name: 'Lime Rush', color: 0x7ac74f, cost: 200 },
    { name: 'Cherry Red', color: 0xc1272d, cost: 200 },
    { name: 'Pearl White', color: 0xe8e8e8, cost: 200 },
    { name: 'Shadow Black', color: 0x1a1a1a, cost: 200 },
  ],
};

export const HEAT = {
  decaySeconds: 25,
  bustSeconds: 3,
  bustRange: 3.5,
  ramAt: 3,
  pitAt: 3,
  heliAt: 3,
};

export const RESPECT = {
  tiers: [
    { points: 0, name: 'Nobody' },
    { points: 100, name: 'Hustler' },
    { points: 250, name: 'Earner' },
    { points: 500, name: 'Made' },
    { points: 1000, name: 'Kingpin' },
  ],
};

export const WEAPONS = [
  { id: 'fists', name: 'Fists', damage: 12, rate: 0.4, range: 2.5, price: 0 },
  { id: 'pistol', name: 'Pistol', damage: 25, rate: 0.35, range: 40, price: 600 },
  { id: 'smg', name: 'SMG', damage: 16, rate: 0.12, range: 35, price: 1500 },
  { id: 'shotgun', name: 'Shotgun', damage: 60, rate: 0.9, range: 22, price: 2200 },
];

// v7: the city is five named districts. districtAt() in city.js decides
// which one a position belongs to; standing is tracked per district.
export const DISTRICTS = [
  { id: 'marina', name: 'Marina', blurb: 'The waterfront, where the boats come in after dark.' },
  { id: 'oldtown', name: 'Old Town', blurb: 'Narrow streets, old money, older grudges.' },
  { id: 'docks', name: 'Docks', blurb: 'Cranes, containers, and cargo nobody checks.' },
  { id: 'hills', name: 'Hills', blurb: 'Big houses on the ridge, big scores behind the gates.' },
  { id: 'downtown', name: 'Downtown', blurb: 'Neon, noise, and everybody watching everybody.' },
];

export const DISTRICT_TIERS = [
  { points: 0, name: 'Unknown' },
  { points: 25, name: 'Known' },
  { points: 60, name: 'Respected' },
  { points: 120, name: 'Feared' },
  { points: 200, name: 'Kingpin' },
];

// v7: a car whose health hits zero does not just stop — it blows up.
export const BOOM = {
  radius: 14,
  damage: 60,
  flash: 0.5,
  shake: 1.4,
  wreckBurn: 60,
  maxWrecks: 12,
  chainDelay: 0.25,
};

// v7: at three stars and up the dispatch sends specialist units.
export const POLICE = {
  patrolSpeed: 24,
  ramSpeed: 30,
  pitSpeed: 34,
  ramDamage: 35,
  pitSpin: 2.4,
  ramHealth: 160,
  pitHealth: 110,
};
