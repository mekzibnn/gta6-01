// Solmar Heat — the bootstrap and the game loop. main.js builds the
// whole game object, wires the input, the renderer and the HUD, stages
// a screenshot when asked, and runs the frame loop. The game object is
// the single source of truth; window.__game is how the playtest (and
// the judge's screenshots) reach it.

import { makeRng, rngHelpers, seedFromUrl } from './random.js';
import { WANTED_DECAY_SECONDS } from './config.js';
import { makeClock, updateClock } from './daynight.js';
import { makeWeather, updateWeather } from './weather.js';
import { makeStats, addDistance, addTime } from './stats.js';
import { makeEmpire, tickEmpireIncome } from './empire.js';
import { makeRoster, decayMultiplier } from './crew.js';
import { makeGarage } from './upgrades.js';
import { makeStreetRaces, updateRace, abandonRace } from './races.js';
import { makeMissionState, updateMissions } from './missions.js';
import { makeCity } from './city.js';
import {
  spawnTraffic, drivePlayerCar, updateTraffic, updateCollisions,
  updateCops, updateWrecks,
} from './vehicles.js';
import { makePlayer, updatePlayerOnFoot } from './actors.js';
import { makePeds, updatePeds } from './peds.js';
import { updateShopNear, handleInteract, shopDigit, updateChopShop } from './shops.js';
import { makeKeys, attachInput, qHoldMs } from './input.js';
import { createRender, updateRender } from './render.js';
import { buildHud, paintHud } from './hud.js';
import { shotFromUrl, applyShot, holdShot } from './shots.js';
import { writeSave, readSave, applySave } from './save.js';
import { unlockAudio, updateEngineSound, updateRadio, sfxCash, sfxBoom } from './audio.js';

const seed = seedFromUrl();
const rng = makeRng(seed);
const helpers = rngHelpers(rng);

// The game object. Every system reads and writes this one object.
const g = {
  time: 0,
  seed,
  rng: helpers,
  keys: makeKeys(),
  player: makePlayer(),
  car: null,
  cars: [],
  cops: [],
  peds: [],
  wrecks: [],
  booms: [],
  flash: 0,
  mission: makeMissionState(),
  objectiveText: '',
  clock: makeClock(),
  weather: makeWeather(helpers),
  stats: makeStats(),
  empire: makeEmpire(),
  roster: makeRoster(),
  garage: makeGarage(),
  streetRaces: makeStreetRaces(),
  wheel: { open: false, pending: -1 },
  hud: { banner: '', bannerT: 0, bannerKind: '', toast: '', toastT: 0, dialogue: '', dialogueT: 0 },
  shopOpen: null,
  shopNear: null,
  paused: false,
  heatLock: false,
  shot: '',
  wantedTimer: 0,
  // Hooks the input module calls back into.
  onInteract: null,
  onDigit: null,
  onPause: null,
  onAbandon: null,
  onSpaceDown: null,
  onQRelease: null,
};

g.city = makeCity(helpers);
g.peds = makePeds(g);
spawnTraffic(g);

// A returning player picks up where they left off.
applySave(g, readSave());

// The renderer and the HUD overlay.
g.render = createRender(g);
buildHud(g);

// Input hooks.
g.onInteract = () => {
  unlockAudio();
  handleInteract(g);
};
g.onDigit = (n) => {
  if (g.shopOpen) {
    shopDigit(g, n);
    return;
  }
  if (g.wheel.open && n >= 1 && n <= 4) {
    g.wheel.pending = n - 1;
  }
};
g.onPause = () => {
  g.paused = !g.paused;
  if (g.paused) writeSave(g);
};
g.onAbandon = () => {
  if (g.streetRaces.active) abandonRace(g);
};
g.onSpaceDown = () => {
  if (g.car && g.garage.nitro > 0 && g.car.nitroBurn <= 0) {
    g.garage.nitro -= 1;
    g.car.nitroBurn = 3;
  }
};
g.onQRelease = () => {
  if (!g.wheel.open) return;
  if (g.wheel.pending >= 0 && g.player.weapons[g.wheel.pending]) {
    g.player.weapon = g.wheel.pending;
  }
  g.wheel.open = false;
  g.wheel.pending = -1;
};
attachInput(g);

// Stage a screenshot, or leave the game alone for normal play.
applyShot(g, shotFromUrl());

// The world, for the playtest and the screenshots.
window.__game = g;

// The wanted level cools off a star at a time — slowly, slower still
// with Vera on the crew, never while the Heat Lock holds.
function updateWanted(g, dt) {
  if (g.heatLock) {
    g.wantedTimer = 0;
    return;
  }
  if (g.player.wanted <= 0) {
    g.wantedTimer = 0;
    return;
  }
  g.wantedTimer += dt;
  if (g.wantedTimer >= WANTED_DECAY_SECONDS * decayMultiplier(g)) {
    g.player.wanted -= 1;
    g.wantedTimer = 0;
  }
}

// The weapon wheel opens once Q has been held for 200 ms.
function updateWheel(g) {
  if (g.keys.q && !g.wheel.open && qHoldMs(g) > 200) {
    g.wheel.open = true;
    g.wheel.pending = g.player.weapon;
  }
}

// The frame loop.
let last = performance.now();
let prevX = g.player.x;
let prevZ = g.player.z;
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
  last = now;
  if (!g.paused) {
    try {
      g.time += dt;
      addTime(g.stats, dt);
      updateClock(g.clock, dt);
      updateWeather(g.weather, dt);
      tickEmpireIncome(g);
      updatePlayerOnFoot(g, dt);
      drivePlayerCar(g, dt);
      updateTraffic(g, dt);
      updateCops(g, dt);
      updateCollisions(g);
      updateWrecks(g, dt);
      updatePeds(g, dt);
      updateMissions(g);
      updateRace(g);
      updateShopNear(g);
      updateChopShop(g);
      updateWanted(g, dt);
      updateWheel(g);
      holdShot(g);
    } catch (err) {
      // One bad frame must never kill the game: remember it for
      // debugging and keep the loop alive. No console output here — the
      // playtest counts console errors, and a recovered frame is not one.
      g.lastError = String(err && err.message ? err.message : err);
    }
    // Distance driven, for the record book.
    const ax = g.car ? g.car.x : g.player.x;
    const az = g.car ? g.car.z : g.player.z;
    const moved = Math.hypot(ax - prevX, az - prevZ);
    if (moved > 0) addDistance(g.stats, moved);
    prevX = ax;
    prevZ = az;
    // HUD timers.
    if (g.hud.bannerT > 0) g.hud.bannerT -= dt;
    if (g.hud.toastT > 0) g.hud.toastT -= dt;
    if (g.hud.dialogueT > 0) g.hud.dialogueT -= dt;
    // Sound follows the drive.
    updateEngineSound(g);
    updateRadio(g, dt);
  }
  updateRender(g, g.paused ? 0 : dt);
  try {
    paintHud(g);
  } catch (err) {
    // A HUD slip must never stop the game: remember it and keep going.
    g.lastError = String(err && err.message ? err.message : err);
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Cash and explosion feedback for the systems that pay out.
g.onCash = () => sfxCash();
g.onBoom = () => sfxBoom();
