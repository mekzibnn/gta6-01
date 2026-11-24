// Solmar Heat v12 — bootstrap + game loop. Exposes window.__game and window.__stageShot.
import { buildCity } from './city.js';
import { makeRng } from './random.js';
import { makePlayer, updatePlayer } from './actors.js';
import { makeVehicle, spawnTraffic, updateVehicles } from './vehicles.js';
import { spawnPeds, updatePeds } from './peds.js';
import { updateMissions, updateSide, initSide } from './missions.js';
import { updateEmpire } from './empire.js';
import { updateRaces } from './races.js';
import { updateShopNear } from './shops.js';
import { updateWeather } from './weather.js';
import { updateClock } from './daynight.js';
import { updateStats } from './stats.js';
import { buildHud, updateHud } from './hud.js';
import { buildRender, updateRender } from './render.js';
import { bindInput } from './input.js';
import { initAudio } from './audio.js';
import { stageShot } from './shots.js';
import { SPOTS, STUNT_JUMPS } from './config.js';

const params = new URLSearchParams(location.search);
const seed = parseInt(params.get('seed') || '1', 10) || 1;

const g = {
  time: 0, dt: 0, paused: false, staged: null, stageCam: 'chase',
  stageCamPos: null, stageCamLook: null, stageFreeze: false,
  seed, rng: makeRng(seed), keys: {},
  city: null, player: null, cars: [], car: null,
  cops: [], heli: { active: false, locked: false, x: 0, z: 0 },
  wrecks: [], booms: [], flash: 0,
  peds: [], mission: { index: 0, step: 0, stepT: 0, timeLeft: 180, done: [], _current: -1 },
  objectiveText: '', garage: { engine: 0, armor: 0, nitro: 0 },
  clock: { hour: 18.0, isNight: false, lampGlow: 0 },
  weather: { kind: 'clear', timer: 90 },
  stats: { distanceKm: 0, timePlayed: 0, missionsDone: 0, carsSold: 0 },
  empire: { owned: {}, totalEarned: 0, prevHour: undefined, lastPaid: undefined },
  roster: { hired: {} }, streetRaces: { active: null, won: 0, best: {} },
  shopOpen: null, shopNear: null, wheel: { open: false, selected: 0 },
  hud: { banner: '', bannerT: 0, bannerKind: 'mission' },
  render: null, crewCooldowns: {}, eyesOut: 0,
  stuntJumps: STUNT_JUMPS.map((s) => ({ ...s })),
};

g.city = buildCity(seed);
g.player = makePlayer();
g.peds = spawnPeds(g);
// Parked cars: sedan at the hideout, sport nearby, taxi at the stand, van at the bank,
// and a second sport at the stadium (so a sport always exists in the fleet).
g.cars.push(makeVehicle('sedan', SPOTS.hideout.x, SPOTS.hideout.z, 0, { color: 0xd94f3d }));
g.cars.push(makeVehicle('sport', 30, 80, 1.2, { color: 0x3d7bd9 }));
g.cars.push(makeVehicle('sport', 120, 120, 2.1, { color: 0xe85d5d }));
g.cars.push(makeVehicle('taxi', SPOTS.taxiStand.x, SPOTS.taxiStand.z, 0.5, { color: 0xf2b705 }));
g.cars.push(makeVehicle('van', SPOTS.bank.x, SPOTS.bank.z, 0.5, { color: 0xe8e8e8 }));
spawnTraffic(g);
initSide(g);
// Fresh session every load: never auto-load a previous save at boot, or a
// stale save (missions done, upgrades owned, cash high) would pollute the
// new game. The save is written on pause and read back by the pause menu.
buildHud(g);
buildRender(g);
bindInput(g);
initAudio(g);

window.__game = g;
window.__stageShot = (name) => stageShot(g, name);

let last = performance.now();
let lastHud = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  g.dt = dt;
  if (!g.paused) {
    g.time += dt;
    updateClock(g, dt);
    updateWeather(g, dt);
    updateMissions(g, dt);
    updatePlayer(g, dt);
    if (!g.stageFreeze) {
      updateVehicles(g, dt);
      updatePeds(g, dt);
    }
    updateEmpire(g, dt);
    updateRaces(g, dt);
    updateShopNear(g);
    updateSide(g, dt);
    updateStats(g, dt);
    if (g.hud.bannerT > 0) g.hud.bannerT -= dt;
    if (g.eyesOut > 0) g.eyesOut -= dt;
  }
  // DOM HUD is paint-expensive under SwiftShader: refresh at most 4x/sec.
  // Game state (window.__game) still updates every frame, so the playtest
  // sees fresh values; only the painted DOM is throttled.
  if (now - lastHud >= 250) {
    lastHud = now;
    try { updateHud(g); } catch { /* HUD must never kill the loop */ }
  }
  try { updateRender(g, dt); } catch { /* renderer must never kill the loop */ }
}
requestAnimationFrame(frame);
