// The shops. Stand near a storefront and the HUD names it; press E and
// the menu opens; a number key buys. The garage sells engine, armour and
// nitro; the ventures sell the businesses; the Crew Office hires mates;
// the Race Office starts the series; the Gun Store unlocks weapon slots.
// The Chop Shop needs no key: drive a car into it and it is sold.

import { BUSINESSES, CAR_MODELS } from './config.js';
import { buyBusiness } from './empire.js';
import { hireMate } from './crew.js';
import { buyEngine, buyArmor, buyNitro } from './upgrades.js';
import { startRace } from './races.js';
import { nearestCar, enterCar, exitCar } from './actors.js';

// How close the player must stand for a storefront to notice them.
const SHOP_RANGE = 11;

// Refresh shopNear from the player's position. Called every frame.
export function updateShopNear(g) {
  let best = null;
  let bestD = SHOP_RANGE * SHOP_RANGE;
  for (const s of g.city.shopSpots) {
    const dx = s.x - g.player.x;
    const dz = s.z - g.player.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD) {
      bestD = d2;
      best = s;
    }
  }
  g.shopNear = best ? { label: best.label, kind: best.kind, business: best.business || null, x: best.x, z: best.z } : null;
}

// E does the context thing: close an open menu, open a storefront, or
// get in or out of a car. The storefront is recomputed from the live
// position here, not read from the frame's cached shopNear: the
// playtest teleports the player and presses E in the same breath, and
// a stale cached prompt would open the wrong menu.
export function handleInteract(g) {
  if (g.shopOpen) {
    g.shopOpen = null;
    return;
  }
  updateShopNear(g);
  const near = g.shopNear;
  if (near && near.kind !== 'chop') {
    g.shopOpen = { kind: near.kind, business: near.business || null, label: near.label };
    return;
  }
  if (g.player.inCar) {
    exitCar(g);
    return;
  }
  const car = nearestCar(g, 5);
  if (car) enterCar(g, car);
}

// A number key while a menu is open. Returns true when it did something.
export function shopDigit(g, digit) {
  const open = g.shopOpen;
  if (!open) return false;
  if (open.kind === 'garage') {
    let bought = false;
    if (digit === 1) bought = buyEngine(g);
    else if (digit === 2) bought = buyArmor(g);
    else if (digit === 3) bought = buyNitro(g);
    if (bought) {
      g.shopOpen = null;
      g.hud.toast = 'Garage upgrade fitted';
      g.hud.toastT = 2;
    }
    return bought;
  }
  if (open.kind === 'venture') {
    const bought = buyBusiness(g, open.business);
    if (bought) {
      g.shopOpen = null;
      const biz = BUSINESSES[open.business];
      g.hud.toast = `${biz.name} is yours — $${biz.income}/hr`;
      g.hud.toastT = 3;
    }
    return bought;
  }
  if (open.kind === 'crew') {
    const ids = ['milo', 'vera', 'tank'];
    const id = ids[digit - 1];
    if (!id) return false;
    const hired = hireMate(g, id);
    if (hired) {
      g.shopOpen = null;
      g.hud.toast = `${id[0].toUpperCase() + id.slice(1)} joined the crew`;
      g.hud.toastT = 2.5;
    }
    return hired;
  }
  if (open.kind === 'races') {
    const ids = ['drag', 'sprint', 'circuit'];
    const id = ids[digit - 1];
    if (!id) return false;
    const started = startRace(g, id);
    if (started) {
      g.shopOpen = null;
      g.hud.toast = 'Race started — hit the gates in order';
      g.hud.toastT = 2.5;
    }
    return started;
  }
  if (open.kind === 'guns') {
    const slots = [1, 2, 3];
    const slot = slots[digit - 1];
    if (slot === undefined) return false;
    const prices = [400, 900, 1400];
    if (g.player.weapons[slot]) return false;
    if (g.player.cash < prices[digit - 1]) return false;
    g.player.cash -= prices[digit - 1];
    g.player.weapons[slot] = true;
    g.shopOpen = null;
    g.hud.toast = 'Weapon unlocked';
    g.hud.toastT = 2;
    return true;
  }
  return false;
}

// The Chop Shop: drive a car into the yard and it is sold on the spot.
// The payout follows the model, and the player walks away on foot.
export function updateChopShop(g) {
  if (!g.car) return;
  const spot = g.city.spots.chopShop;
  const dx = g.car.x - spot.x;
  const dz = g.car.z - spot.z;
  if (dx * dx + dz * dz > 100) return;
  const car = g.car;
  const def = CAR_MODELS[car.model] || CAR_MODELS.sedan;
  const value = { sedan: 300, sport: 1200, taxi: 250, truck: 400, cop: 0 }[car.model] ?? 300;
  const payout = Math.max(150, Math.round(value * (car.health / car.maxHealth)));
  g.player.cash += payout;
  const idx = g.cars.indexOf(car);
  if (idx >= 0) g.cars.splice(idx, 1);
  g.player.inCar = false;
  g.player.x = spot.x + 6;
  g.player.z = spot.z + 6;
  g.car = null;
  g.hud.toast = `Chop Shop paid $${payout}`;
  g.hud.toastT = 3;
  void def;
}
