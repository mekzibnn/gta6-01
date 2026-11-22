// The entrypoint for Solmar Heat: builds the game object, wires the
// renderer and the HUD, runs the frame loop, and handles the discrete
// keys (E to interact, F to leave a car, digits to buy or pick a weapon,
// X to abandon a race, P to pause and save, Q to open the weapon wheel).

import { makeRng } from './random.js';
import { makeClock, updateClock } from './daynight.js';
import { makeWeather, updateWeather } from './weather.js';
import { makeStats, addDistance } from './stats.js';
import { writeSave, readSave, applySave } from './save.js';
import { makeEmpire, payIncome } from './empire.js';
import { makeStreetRaces, updateRace, abandonRace } from './races.js';
import { makeGarage } from './upgrades.js';
import { MISSIONS, makeMissionState, updateMissions, missionObjective } from './missions.js';
import { buildCity } from './city.js';
import { spawnTraffic, drivePlayerCar, updateTraffic, checkCollisions } from './vehicles.js';
import { updatePlayer, updateCops, updateWanted, stealCar, leaveCar } from './actors.js';
import { makePeds, updatePeds } from './peds.js';
import { buildShops, updateShops, menuItems, buyMenuItem, updateChopShop } from './shops.js';
import { createRender, drawFrame } from './render.js';
import { setupHUD, drawHUD } from './hud.js';
import { bindInput } from './input.js';
import { applyShot } from './shots.js';
import { sfx } from './audio.js';

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed') || 1);
const shotName = params.get('shot');

const rng = makeRng(seed);
const city = buildCity(rng);

const game = {
  time: 0,
  seed,
  rng,
  player: {
    x: 0,
    z: 156,
    heading: 0,
    inCar: false,
    wanted: 0,
    cash: 5000,
    health: 100,
    weapons: [true, false, false, false],
    weapon: 0,
    districtStanding: { marina: 0, oldtown: 0, docks: 0, hills: 0, downtown: 0 },
  },
  car: null,
  cars: [],
  cops: [],
  peds: [],
  wrecks: [],
  booms: [],
  flash: 0,
  mission: makeMissionState(),
  objectiveText: '',
  city,
  clock: makeClock(18),
  weather: makeWeather(rng),
  stats: makeStats(),
  empire: makeEmpire(),
  roster: { hired: {} },
  garage: makeGarage(),
  streetRaces: makeStreetRaces(),
  shopOpen: null,
  shopNear: null,
  shops: [],
  hud: { banner: null, bannerSub: '', bannerNext: '', bannerT: 0, bannerKind: '', dialog: null, toast: null, toastT: 0 },
  wheel: { open: false, selected: -1 },
  render: null,
  hudCtx: null,
  paused: false,
  keys: new Set(),
  wantedTimer: 0,
  qHeld: 0,
  shot: null,
  shotCam: null,
};

// The traffic, the pedestrians and the shops belong to the city.
game.cars = spawnTraffic(game, game.rng);
game.peds = makePeds(game, game.rng);
game.shops = buildShops(city);

// The game object is live from the first line, before the first frame.
window.__game = game;

// The renderer and the HUD. If WebGL is unavailable the logic loop
// below still runs and the HUD still draws.
const gameCanvas = document.getElementById('game');
const hudCanvas = document.getElementById('hud');
try {
  createRender(game, gameCanvas);
} catch (err) {
  console.error('WebGL unavailable', err);
  game.render = null;
}
setupHUD(game, hudCanvas);

function playSfx(name) {
  try {
    if (sfx && typeof sfx[name] === 'function') sfx[name]();
  } catch (e) { /* silent headless */ }
}

function showBanner(game, title, sub, next, kind, dialog) {
  game.hud.banner = title;
  game.hud.bannerSub = sub || '';
  game.hud.bannerNext = next || '';
  game.hud.bannerT = 3.5;
  game.hud.bannerKind = kind || 'mission';
  game.hud.dialog = dialog || null;
}

function showToast(game, text) {
  game.hud.toast = text;
  game.hud.toastT = 2.5;
}

// The opening banner: M1, Wheels Up, with LEO's brief.
showBanner(
  game,
  'MISSION 1 · WHEELS UP — STAGE 1/1',
  'Drive to the Garage — do not get busted',
  'NEXT: Hot Wheels · REWARD $400',
  'mission',
  { name: 'LEO', text: 'Solmar is ours for the taking, kid. Get a car, get to the garage, and do not get busted.' },
);
game.objectiveText = missionObjective(game.mission);

function nearestCar(game, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of game.cars) {
    if (car.exploded) continue;
    const d = Math.hypot(car.x - game.player.x, car.z - game.player.z);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

function interact(game) {
  // A shop first, with fresh proximity so a key press lands even when
  // the player was just teleported and the loop has not run yet.
  updateShops(game);
  if (game.shopNear) {
    game.shopOpen = { kind: game.shopNear.kind, shopId: game.shopNear.id };
    playSfx('click');
    return;
  }
  if (!game.player.inCar) {
    const car = nearestCar(game, 8);
    if (car) {
      stealCar(game, car);
      showToast(game, 'Car stolen — ' + car.name);
      playSfx('click');
    }
  }
}

function onKeyDown(code) {
  if (code === 'KeyE') {
    interact(game);
  } else if (code === 'KeyF') {
    if (game.player.inCar) leaveCar(game);
  } else if (code === 'Digit1' || code === 'Digit2' || code === 'Digit3') {
    const digit = code.slice(-1);
    if (game.shopOpen) {
      buyMenuItem(game, digit);
    } else if (game.wheel.open) {
      const n = Number(digit);
      if (n >= 1 && n <= 4) game.wheel.selected = n - 1;
    }
  } else if (code === 'KeyX') {
    if (game.streetRaces.active) abandonRace(game.streetRaces);
  } else if (code === 'KeyP') {
    game.paused = !game.paused;
    if (game.paused) writeSave(game);
  }
}

function onKeyUp(code) {
  if (code === 'KeyQ') {
    game.qHeld = 0;
    if (game.wheel.open) {
      if (game.wheel.selected >= 0 && game.player.weapons[game.wheel.selected]) {
        game.player.weapon = game.wheel.selected;
      }
      game.wheel.open = false;
      game.wheel.selected = -1;
    }
  }
}

bindInput(game, { onKeyDown, onKeyUp });

// A staged screenshot: the shot sets the hour, the car, the crew, the
// banner and the camera, and the banner stays up for the frame. Rebuild
// the banner's three lines from the shot's mission, so the sub and the
// next match the title instead of lingering from an earlier mission.
if (shotName) {
  applyShot(game, shotName);
  game.hud.bannerT = 999;
  if (shotName === 'mission') {
    game.hud.banner = 'Empire Rising — COMPLETE $6000';
    game.hud.bannerSub = 'Reward $6000 banked. The city notices.';
    game.hud.bannerNext = 'NEXT: Crew Up · REWARD $7500';
  } else {
    const def = MISSIONS[game.mission.index];
    if (def) {
      game.hud.banner = 'MISSION ' + (game.mission.index + 1) + ' · ' + def.name.toUpperCase() + ' — STAGE ' + (game.mission.step + 1) + '/' + def.steps.length;
      const obj = missionObjective(game.mission);
      game.hud.bannerSub = obj.includes(' — ') ? obj.split(' — ').slice(1).join(' — ') : obj;
      const next = MISSIONS[game.mission.index + 1];
      game.hud.bannerNext = next ? 'NEXT: ' + next.name + ' · REWARD $' + next.reward : 'All missions complete — Solmar is yours.';
    }
  }
  game.hud.bannerKind = 'mission';
}

// A saved run resumes where it left off.
const saved = readSave();
if (saved) applySave(game, saved);
game.objectiveText = missionObjective(game.mission);

let last = performance.now();
function frame(now) {
  requestAnimationFrame(frame);
  let dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (game.paused) {
    if (game.render) drawFrame(game, 0);
    drawHUD(game);
    return;
  }
  game.time += dt;
  game.stats.timePlayed += dt;
  updateClock(game.clock, dt);
  updateWeather(game.weather, dt, game.rng);

  // Hold Q for 200 ms to open the weapon wheel.
  if (game.keys.has('KeyQ')) {
    game.qHeld += dt;
    if (game.qHeld > 0.2) game.wheel.open = true;
  } else {
    game.qHeld = 0;
  }

  let moved = 0;
  if (game.player.inCar && game.car) {
    moved = drivePlayerCar(game, dt);
  } else {
    moved = updatePlayer(game, dt);
  }
  addDistance(game.stats, moved);
  updateTraffic(game, dt);
  checkCollisions(game);
  updateCops(game, dt);
  updateWanted(game, dt);
  updatePeds(game, dt);
  updateShops(game);
  updateChopShop(game);
  payIncome(game.empire, game.player, game.clock.hour, game.clock.isNight);

  if (game.streetRaces.active) {
    const px = game.car ? game.car.x : game.player.x;
    const pz = game.car ? game.car.z : game.player.z;
    const prize = updateRace(game.streetRaces, px, pz, game.time);
    if (prize > 0) {
      game.player.cash += prize;
      showBanner(game, 'RACE WON — $' + prize, 'The streets know your name now.', 'NEXT: Keep winning', 'race', null);
      playSfx('mission');
    }
  }
  updateMissions(game, dt);
  game.objectiveText = missionObjective(game.mission);

  // The banner and the toast fade; a staged shot holds the banner.
  if (!game.shot && game.hud.bannerT > 0) {
    game.hud.bannerT -= dt;
    if (game.hud.bannerT <= 0) game.hud.dialog = null;
  }
  if (game.hud.toastT > 0) {
    game.hud.toastT -= dt;
    if (game.hud.toastT <= 0) game.hud.toast = null;
  }
  if (game.flash > 0) game.flash = Math.max(0, game.flash - dt * 1.5);
  for (const boom of game.booms) boom.t += dt;
  game.booms = game.booms.filter((b) => b.t < 2);
  for (const wreck of game.wrecks) wreck.t += dt;

  if (game.render) drawFrame(game, dt);
  drawHUD(game);
}
requestAnimationFrame(frame);
