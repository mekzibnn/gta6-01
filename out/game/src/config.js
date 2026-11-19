// Every tuning number and colour in one place. Solmar is a sun-soaked coastal
// city: warm asphalt, sand, palms and pastel buildings. The world is a fixed
// 3400x2600 playfield; the camera follows the player and the renderer scales
// the 1280x720 logical view to the window, so no rule depends on screen size.

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

export const PLAYER = {
  radius: 13,
  walkSpeed: 170,
  runSpeed: 265,
  health: 100,
  punchDamage: 12,
  punchRange: 34,
  punchArc: 1.1,
};

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

export const WANTED = {
  max: 5,
  decaySeconds: 14,
  // police cars chasing per star (plus foot cops at 1-2 stars)
  chaseCars: [0, 1, 2, 3, 4, 5],
  sprayCost: 150,
  ammoCost: 40,
  healCost: 80,
};

export const POLICE = {
  carSight: 560,
  footSpeed: 185,
  punchDamage: 8,
  shootAtStars: 3,
  bustRadius: 26,
};

export const PED = { count: 46, walkSpeed: 55, fleeSpeed: 150 };

export const TRAFFIC = { count: 22, cruise: 150 };

export const MISSION_REWARD = [400, 650, 900, 1400, 2500];
export const TAXI_FARE = 120;
export const PACKAGE_BONUS = 100;
export const HIDDEN_PACKAGES = 10;

export const SAVE_KEY = 'solmar-heat.save.v1';

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
