// Tuning constants for Solmar Heat. No dependencies.
// Every number the game balances on lives here, so a tweak is one edit.

// The city is a grid: blocks of `block` with roads of `road` between them,
// one pitch apart. Avenues run north-south, streets east-west.
export const WORLD = {
  pitch: 52,
  block: 40,
  road: 12,
  half: 208,
  beachX: -204,
  waterX: -246,
};

// The sunset palette: ten building colours, never plain grey.
export const PALETTE = [
  0xc96f3f, // terracotta
  0xd9a066, // sand
  0xe8d3a1, // cream
  0xe07856, // coral
  0x3f8f8a, // teal
  0xc98a8a, // dusty rose
  0x5a7fa6, // steel blue
  0xe0b93c, // warm yellow
  0xc2a878, // tan
  0x7d94a6, // grey-blue
];

export const ROOF_COLORS = [0x8a5a3c, 0x6b4a3a, 0x4a5a6a, 0x7a6a4a, 0x9a3a2a];

// The five districts, checked in order: Marina (west beach strip), Hills
// (north), Docks (south), Old Town (east), Downtown (the centre).
export const DISTRICTS = [
  { id: 'marina', name: 'Marina', test: (x) => x < -130 },
  { id: 'hills', name: 'Hills', test: (x, z) => z < -104 },
  { id: 'docks', name: 'Docks', test: (x, z) => z > 130 },
  { id: 'oldtown', name: 'Old Town', test: (x) => x > 130 },
  { id: 'downtown', name: 'Downtown', test: () => true },
];

// Money.
export const PRICES = {
  engine: [0, 800, 1600],
  armor: [0, 1200, 2400],
  nitroCharge: 300,
  crewDiscount: 0.1,
};

// Driving feel.
export const CAR = {
  accel: 15,
  brake: 26,
  reverseMax: 12,
  maxSpeed: 44,
  turn: 2.4,
  grip: 6,
  nitroBoost: 26,
};

// The wanted system.
export const WANTED = {
  max: 5,
  decaySeconds: 26,
  copsPerStar: 2,
  ramAt: 3,
  pitAt: 3,
};

// How long a mission banner stays up, and the pause between banners.
export const HUD = {
  bannerSeconds: 3.5,
  toastSeconds: 2.5,
};

// The save key. Never rename: old saves and the play test read it.
export const SAVE_KEY = 'solmar-heat.save.v2';
