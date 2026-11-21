// Every tuning number and colour in one place. Solmar is a sun-soaked coastal
// city: warm asphalt, sand, palms and pastel buildings. The world is a fixed
// 3400x2600 playfield; the camera follows the player and the renderer scales
// the 1280x720 logical view to the window, so no rule depends on screen size.

// -- World & view -----------------------------------------------------------
export const VIEW = { width: 1280, height: 720 };
export const WORLD = { width: 3400, height: 2600 };
export const STEP = 1 / 60;

/** City grid: roads run every BLOCK+ROAD px; blocks hold buildings and parks. */
export const CITY = {
  road: 96,
  block: 304,
  // South edge is the beach: sand from this y down, sea beyond it.
  beachY: 2280,
  seaY: 2460,
  // Marina district on the west edge, port on the east edge.
  marinaX: 420,
  portX: 2980,
};

// -- Actors -----------------------------------------------------------------
export const PLAYER = {
  radius: 13,
  walkSpeed: 170,
  runSpeed: 265,
  health: 100,
  punchDamage: 12,
  punchRange: 34,
  punchArc: 1.1,
};

export const PED = { count: 46, walkSpeed: 55, fleeSpeed: 150 };

export const TRAFFIC = { count: 22, cruise: 150 };

export const POLICE = {
  carSight: 560,
  footSpeed: 185,
  punchDamage: 8,
  shootAtStars: 3,
  bustRadius: 26,
};

// -- Cars -------------------------------------------------------------------
export const CAR = {
  length: 54,
  width: 26,
  // accel px/s^2, top speed px/s, grip (steering), brake
  kinds: {
    sedan:   { accel: 300, top: 430, grip: 2.6, brake: 520, color: '#c94f43', name: 'Vela Sedan' },
    taxi:    { accel: 280, top: 400, grip: 2.6, brake: 520, color: '#f2b705', name: 'Solmar Taxi' },
    sport:   { accel: 430, top: 560, grip: 3.1, brake: 640, color: '#2f7fd0', name: 'Cometa GT' },
    truck:   { accel: 210, top: 330, grip: 2.0, brake: 420, color: '#7a8a99', name: 'Mulo Truck' },
    police:  { accel: 380, top: 520, grip: 3.0, brake: 620, color: '#20242c', name: 'SCPD Interceptor' },
    van:     { accel: 240, top: 360, grip: 2.2, brake: 460, color: '#e8e2d4', name: 'Brisa Van' },
  },
};

// -- Wanted & the law -------------------------------------------------------
export const WANTED = {
  max: 5,
  decaySeconds: 14,
  // police cars chasing per star (plus foot cops at 1-2 stars)
  chaseCars: [0, 1, 2, 3, 4, 5],
  sprayCost: 150,
  ammoCost: 40,
  healCost: 80,
};

/** Air One: the SCPD helicopter that joins the chase at 4+ stars. */
export const HELI = {
  minStars: 4,
  hoverHeight: 190,
  followDist: 260,
  searchlight: true,
};

// -- Economy ----------------------------------------------------------------
export const MISSION_REWARD = [400, 650, 900, 1400, 2500, 1800, 2200, 4000];
export const TAXI_FARE = 120;
export const PACKAGE_BONUS = 100;
export const HIDDEN_PACKAGES = 10;

// -- Progression ------------------------------------------------------------
/** Respect: progression that rewards play. Ranks unlock the crew (1500+). */
export const RESPECT_RANKS = [
  { at: 0, name: 'Nobody' },
  { at: 750, name: 'Hustler' },
  { at: 1500, name: 'Street King' },
  { at: 3500, name: 'Shot Caller' },
  { at: 7000, name: 'Solmar Legend' },
];
export const RESPECT_MISSION = 120;
export const RESPECT_RACE = 150;
export const RESPECT_TAXI = 10;
export const RESPECT_PACKAGE = 15;

/** Radio: three WebAudio stations, switched with R while driving. */
export const RADIO = {
  stations: [
    { name: 'SOL FM', tag: 'sun-soaked pop' },
    { name: 'PALM 87', tag: 'coastal chill' },
    { name: 'HEAT 102', tag: 'night drive bass' },
  ],
};

/** Weapons: slots 1-4 (Q cycles). Bought at El Gato Guns. */
export const WEAPONS = {
  fists:  { name: 'FISTS',  damage: 12, cooldown: 0.45, ammo: Infinity, cost: 0, auto: false },
  pistol: { name: 'PISTOL', damage: 34, cooldown: 0.28, ammo: 24, cost: 0, auto: false },
  smg:    { name: 'SMG',    damage: 18, cooldown: 0.12, ammo: 60, cost: 600, auto: true },
  shotgun:{ name: 'SHOTGUN',damage: 55, cooldown: 0.85, ammo: 12, cost: 900, auto: false },
};
export const WEAPON_ORDER = ['fists', 'pistol', 'smg', 'shotgun'];

/** Garage upgrades at Mara's Garage: engine, armor, paint. */
export const GARAGE = {
  engine: [
    { name: 'Stock engine', cost: 0, top: 1.0, accel: 1.0 },
    { name: 'Tuned engine', cost: 800, top: 1.15, accel: 1.2 },
    { name: 'Race engine', cost: 1600, top: 1.3, accel: 1.4 },
  ],
  armor: [
    { name: 'No armor', cost: 0, resist: 1.0 },
    { name: 'Plated body', cost: 700, resist: 0.6 },
    { name: 'Armored hull', cost: 1400, resist: 0.35 },
  ],
  paints: ['#c94f43', '#2f7fd0', '#f2b705', '#43a85a', '#8a6fbf', '#e8e2d4', '#20242c'],
};

/** Street races: 3 checkpoints, timed. Started at the Palm Strip flag. */
export const RACES = {
  reward: 500,
  timeLimit: 150,
  checkpoints: ['marina', 'portbank', 'hideout'],
};

export const SAVE_KEY = 'solmar-heat.save.v2';

// -- Look -------------------------------------------------------------------
export const PALETTE = {
  asphalt: '#3d3a38',
  asphaltLine: '#d8c56a',
  sidewalk: '#b7a98f',
  sand: '#e6cf9a',
  sea: '#1d7fa8',
  seaDeep: '#14648a',
  grass: '#5f9e52',
  grassDark: '#4e8a44',
  parkPath: '#cbb98d',
  buildingRoof: '#8a6f5c',
  text: '#f5efe2',
  muted: '#c9bda6',
  hudPanel: 'rgba(12, 20, 28, 0.72)',
  hudAccent: '#ffb347',
  star: '#ffd94a',
  police: '#3d7bfd',
  mission: '#ffd94a',
  danger: '#ff5a4e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONT_DISPLAY = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
