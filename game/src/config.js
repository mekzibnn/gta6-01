// Solmar Heat v9 — tuning numbers.
// Every balance number in the game lives in this one file: what a job
// pays, what an upgrade costs, how fast the heat cools, how hard a RAM
// unit hits. Change a number here and the whole game re-balances around it.

// Cash in, cash out.
export const ECONOMY = {
  startCash: 400,
  taxiFare: 25,
  chopRate: 0.45,
  bustLoss: 0.2,
  foodHeal: 40,
  foodCost: 30,
};

// The map: half-width in metres, block pitch, road width, and how many
// of each thing the city starts with. clockRate is game seconds per hour.
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

// The garage sells four engine tiers, three armour tiers, nitro by the
// charge, and six paints. Top speed and acceleration are metres per
// second; the boost multiplies top speed while nitro burns.
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

// The heat: how long a star takes to cool off, how long a cop has to sit
// on you to bust you, how close is close enough, and at how many stars
// the specialists (RAM, PIT, helicopter) come out.
export const HEAT = {
  decaySeconds: 25,
  bustSeconds: 3,
  bustRange: 3.5,
  ramAt: 3,
  pitAt: 3,
  heliAt: 3,
};

// Respect is the career ladder: points from missions, jobs and wins.
export const RESPECT = {
  tiers: [
    { points: 0, name: 'Nobody' },
    { points: 100, name: 'Hustler' },
    { points: 250, name: 'Earner' },
    { points: 500, name: 'Made' },
    { points: 1000, name: 'Kingpin' },
  ],
};

// Four weapons. Fists are always owned; the rest are bought at the Gun
// Store. Damage is per hit, rate is seconds between hits, range is metres.
export const WEAPONS = [
  { id: 'fists', name: 'Fists', damage: 12, rate: 0.4, range: 2.5, price: 0 },
  { id: 'pistol', name: 'Pistol', damage: 25, rate: 0.35, range: 40, price: 600 },
  { id: 'smg', name: 'SMG', damage: 16, rate: 0.12, range: 35, price: 1500 },
  { id: 'shotgun', name: 'Shotgun', damage: 60, rate: 0.9, range: 22, price: 2200 },
];

// Five districts split the map. Standing is tracked per district, so
// working one neighbourhood does not buy you the others.
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

// A car at zero health does not stall — it blows up. Radius is metres,
// damage is the full hit at the centre falling off with distance, flash
// is the screen-flash length in seconds, wreckBurn is how long the
// wreck keeps burning, maxWrecks caps how many husks stay in the world.
export const BOOM = {
  radius: 14,
  damage: 60,
  flash: 0.5,
  shake: 1.4,
  wreckBurn: 60,
  maxWrecks: 12,
  chainDelay: 0.25,
};

// Specialist police units, sent out at three stars and up. RAM is a heavy
// SUV that tries to run you off the road; PIT is a fast interceptor that
// slides alongside your rear quarter and spins you out.
export const POLICE = {
  patrolSpeed: 24,
  ramSpeed: 30,
  pitSpeed: 34,
  ramDamage: 35,
  pitSpin: 2.4,
  ramHealth: 160,
  pitHealth: 110,
};
