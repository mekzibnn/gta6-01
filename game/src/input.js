// Solmar Heat v12 — keyboard input: drive, steal, shops, wheel, nitro, pause, abilities.
import { openShop, closeShop, buyShopItem, nearestShop } from './shops.js';
import { writeSave } from './save.js';
import { abandonRace } from './races.js';
import { useAbility } from './crew.js';
import { addWanted } from './vehicles.js';

export function bindInput(g) {
  g.keys = { w: false, a: false, s: false, d: false, shift: false, space: false, q: false };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const c = e.code;
    if (c === 'KeyW') g.keys.w = true;
    else if (c === 'KeyA') g.keys.a = true;
    else if (c === 'KeyS') g.keys.s = true;
    else if (c === 'KeyD') g.keys.d = true;
    else if (c === 'ShiftLeft' || c === 'ShiftRight') g.keys.shift = true;
    else if (c === 'Space') {
      g.keys.space = true;
      if (g.car && g.player.inCar && g.garage.nitro > 0 && g.car.nitroBurn <= 0) {
        g.garage.nitro -= 1;
        g.car.nitroBurn = 2.0;
      }
      e.preventDefault();
    } else if (c === 'KeyE') doAction(g);
    else if (c === 'KeyP') {
      g.paused = !g.paused;
      if (g.paused) writeSave(g);
    } else if (c === 'KeyQ') {
      if (!g.shopOpen && !g.wheel.open) {
        g.wheel.open = true;
        g.wheel.selected = g.player.weapon;
      }
    } else if (c === 'KeyX') {
      if (g.streetRaces.active) abandonRace(g);
      else useAbility(g, 'x');
    } else if (c === 'KeyZ') useAbility(g, 'z');
    else if (c === 'KeyC') useAbility(g, 'c');
    else if (c.startsWith('Digit')) {
      const n = parseInt(c.slice(5), 10);
      if (g.wheel.open) {
        if (g.player.weapons[n - 1]) g.wheel.selected = n - 1;
      } else if (g.shopOpen) {
        buyShopItem(g, n);
      }
    }
  });
  window.addEventListener('keyup', (e) => {
    const c = e.code;
    if (c === 'KeyW') g.keys.w = false;
    else if (c === 'KeyA') g.keys.a = false;
    else if (c === 'KeyS') g.keys.s = false;
    else if (c === 'KeyD') g.keys.d = false;
    else if (c === 'ShiftLeft' || c === 'ShiftRight') g.keys.shift = false;
    else if (c === 'Space') g.keys.space = false;
    else if (c === 'KeyQ') {
      if (g.wheel.open) {
        g.player.weapon = g.wheel.selected;
        g.wheel.open = false;
      }
    }
  });
}

function doAction(g) {
  if (g.shopOpen) { closeShop(g); return; }
  // Recompute the nearest shop from the CURRENT position: the per-frame
  // shopNear can be a frame stale (SwiftShader runs ~2fps), and a stale
  // prompt would hijack E into the wrong menu — or block a car steal.
  const near = nearestShop(g);
  if (near) { g.shopNear = { label: near.label, kind: near.kind, business: near.business }; openShop(g); return; }
  g.shopNear = null;
  if (g.player.inCar && g.car) {
    g.player.x = g.car.x + 3;
    g.player.z = g.car.z + 2;
    g.player.inCar = false;
    g.car = null;
    return;
  }
  // Steal the nearest car.
  let best = null; let bd = 5.5;
  for (const car of g.cars) {
    if (car.exploded) continue;
    const d = Math.hypot(car.x - g.player.x, car.z - g.player.z);
    if (d < bd) { bd = d; best = car; }
  }
  if (best) {
    if (!best.driven) { addWanted(g, 1); best.driven = true; }
    g.player.inCar = true;
    g.car = best;
    g.player.x = best.x; g.player.z = best.z; g.player.heading = best.heading;
  }
}
