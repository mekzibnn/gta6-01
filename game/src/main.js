// Solmar Heat — bootstrap and the main loop. State, input, updates,
// render, HUD, and the window.__game handle the playtest drives.
import { makeRng } from './random.js';
import { LEO_LINES } from './config.js';
import { makeClock, tickClock, phaseName, clockText } from './daynight.js';
import { makeWeather, tickWeather } from './weather.js';
import { makeCity } from './city.js';
import { spawnTraffic, seedHideoutSedan, tickVehicles } from './vehicles.js';
import { tickActors, enterCar, exitCar, nearestCar } from './actors.js';
import { makePeds, tickPeds } from './peds.js';
import { updateShops, openShopMenu, menuDigit, nearestShop } from './shops.js';
import { makeInput } from './input.js';
import { makeStats, tickStats } from './stats.js';
import { readSave, writeSave, applySave } from './save.js';
import { tickCrew, useAbility } from './crew.js';
import { tickEmpire } from './empire.js';
import { tickRaces, abandonRace } from './races.js';
import { updateMissions, refreshObjective } from './missions.js';
import { initRender, drawFrame } from './render.js';
import { buildHud, paintHud } from './hud.js';
import { stageShot } from './shots.js';

function createGame() {
  const rng = makeRng(1);
  const g = {
    rng,
    time: 0,
    clock: makeClock(10),
    weather: makeWeather(rng),
    city: makeCity(rng),
    player: {
      x: 0, z: 100, heading: 0, health: 100, cash: 500, wanted: 0,
      respect: 0, inCar: false, car: null,
      weapons: [true, true, false, false, false, false, false],
      ammo: [Infinity, Infinity, 60, 30, 18, 40, 4],
      weapon: 0,
      districtStanding: {},
    },
    cars: [], car: null, cops: [], heli: null,
    peds: [],
    wrecks: [], booms: [], flash: 0,
    garage: { engine: 0, armor: 0, nitro: 0 },
    empire: { owned: {}, totalEarned: 0, lastHour: 10 },
    roster: { hired: {}, cooldowns: {} },
    streetRaces: { active: null, won: 0, best: {} },
    stats: makeStats(),
    mission: { index: 0, step: 0, timer: 0, done: [] },
    objectiveText: '',
    shopOpen: null, shopNear: null,
    wheel: { open: false },
    hud: { banner: '', bannerT: 0, bannerKind: 'mission', note: '', noteT: 0, dialog: '', dialogT: 0, ctx: null, canvas: null },
    input: makeInput(),
    render: null,
    paused: false,
    heatLock: false,
    clockText: '10:00', phaseName: 'DAY',
    _lastMission: -1, _lastWanted: 0, _eyesT: 0, _heatT: 0, _dispatchT: 0,
  };
  g.peds = makePeds(g);
  spawnTraffic(g);
  seedHideoutSedan(g);
  const saved = readSave();
  if (saved) applySave(g, saved);
  refreshObjective(g);
  return g;
}

function update(g, dt) {
  g.time += dt;
  tickClock(g, dt);
  g.clockText = clockText(g.clock.hour);
  g.phaseName = phaseName(g.clock.hour);
  tickWeather(g, dt);
  tickVehicles(g, dt);
  tickActors(g, dt);
  tickPeds(g, dt);
  updateShops(g);
  tickCrew(g, dt);
  tickEmpire(g);
  tickRaces(g, dt);
  updateMissions(g, dt);
  tickStats(g, dt);
  // LEO chatter when the heat rises.
  if (g.player.wanted > g._lastWanted) {
    g.hud.dialog = LEO_LINES[g.rng.int(0, LEO_LINES.length)];
    g.hud.dialogT = 5;
  }
  g._lastWanted = g.player.wanted;
  // Wheel opens after holding Q for 200ms.
  if (g.input.keys.has('KeyQ') && !g.wheel.open) {
    if (performance.now() - g.input.qDownAt > 200) g.wheel.open = true;
  }
  // HUD timers.
  if (g.hud.bannerT > 0) g.hud.bannerT -= dt;
  if (g.hud.noteT > 0) g.hud.noteT -= dt;
  if (g.hud.dialogT > 0) g.hud.dialogT -= dt;
  if (g.flash > 0) g.flash = Math.max(0, g.flash - dt * 0.45);
}

function handleKey(g, code) {
  const p = g.player;
  if (code === 'KeyE') {
    if (g.shopOpen) return;
    // Find the shop live from the current position — the cached
    // shopNear is a frame behind after a teleport.
    const near = nearestShop(g);
    if (near) { g.shopNear = near; openShopMenu(g); return; }
    if (p.inCar) { exitCar(g); return; }
    const car = nearestCar(g);
    if (car) enterCar(g, car);
    return;
  }
  if (code === 'KeyP') {
    g.paused = !g.paused;
    writeSave(g);
    return;
  }
  if (code === 'Escape') {
    if (g.shopOpen) { g.shopOpen = null; return; }
    if (g.wheel.open) { g.wheel.open = false; return; }
    return;
  }
  if (code === 'KeyZ') { useAbility(g, 'milo'); return; }
  if (code === 'KeyX') {
    // X quits a running race first; otherwise it is Vera's QUICK FIX.
    if (g.streetRaces.active) { abandonRace(g); return; }
    useAbility(g, 'vera'); return;
  }
  if (code === 'KeyC') { useAbility(g, 'tank'); return; }
  if (code.startsWith('Digit')) {
    const n = Number(code.slice(5));
    if (g.shopOpen) { menuDigit(g, n); return; }
    if (g.wheel.open) {
      const idx = n - 1;
      if (idx >= 0 && idx < 7 && p.weapons[idx]) p.weapon = idx;
      return;
    }
    return;
  }
}

const g = createGame();
const glCanvas = document.getElementById('gl');
const hudCanvas = document.getElementById('hud');
initRender(g, glCanvas);
buildHud(g, hudCanvas);
window.__game = g;
window.__stageShot = (name) => stageShot(g, name);

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  g.input.keys.add(e.code);
  if (e.code === 'KeyQ') g.input.qDownAt = performance.now();
  if (e.code === 'Space') e.preventDefault();
  handleKey(g, e.code);
});
window.addEventListener('keyup', (e) => {
  g.input.keys.delete(e.code);
  if (e.code === 'KeyQ') {
    g.input.qHeldMs = performance.now() - g.input.qDownAt;
    if (g.wheel.open) g.wheel.open = false;
  }
});

let last = performance.now();
function frame(now) {
  // Schedule the next frame FIRST — a throw in the update must never
  // freeze the game loop.
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  last = now;
  if (!g.paused) update(g, dt);
  drawFrame(g, dt);
  paintHud(g);
}
requestAnimationFrame(frame);
