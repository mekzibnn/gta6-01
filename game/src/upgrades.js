// Solmar Heat v7 — the garage.
// Engines, armor, nitro, paint. The next tier always costs more than the
// last, and a hired mate knocks 10% off the bill. Nitro is bought by the
// charge and burned by the press — one press, one charge, one long boost.

import { GARAGE } from './config.js';
import { applyEngine } from './vehicles.js';

export function initGarage() {
  return { engine: 0, armor: 0, nitro: 0, paint: 'Sunset Orange' };
}

export function engineCost(tier, rate) {
  const def = GARAGE.engines[Math.max(0, Math.min(tier, GARAGE.engines.length - 1))];
  return Math.round(def.cost * (rate || 1));
}

export function buyEngine(garage, player, rate, car) {
  const next = garage.engine + 1;
  if (next >= GARAGE.engines.length) return -1;
  const cost = engineCost(next, rate);
  if (player.cash < cost) return -1;
  player.cash -= cost;
  garage.engine = next;
  if (car) applyEngine(car, next);
  return cost;
}

export function armorCost(tier, rate) {
  const def = GARAGE.armors[Math.max(0, Math.min(tier, GARAGE.armors.length - 1))];
  return Math.round(def.cost * (rate || 1));
}

export function buyArmor(garage, player, rate) {
  const next = garage.armor + 1;
  if (next >= GARAGE.armors.length) return -1;
  const cost = armorCost(next, rate);
  if (player.cash < cost) return -1;
  player.cash -= cost;
  garage.armor = next;
  return cost;
}

export function armorSoak(garage) {
  return GARAGE.armors[Math.min(garage.armor, GARAGE.armors.length - 1)].soak;
}

export function nitroCost() {
  return GARAGE.nitro.cost;
}

export function buyNitro(garage, player) {
  if (garage.nitro >= GARAGE.nitro.max) return -1;
  if (player.cash < GARAGE.nitro.cost) return -1;
  player.cash -= GARAGE.nitro.cost;
  garage.nitro += 1;
  return GARAGE.nitro.cost;
}

export function useNitro(garage, car) {
  if (!car || garage.nitro <= 0 || car.nitroBurn > 0) return false;
  garage.nitro -= 1;
  car.nitroBurn = GARAGE.nitro.burn;
  return true;
}

export function buyPaint(garage, player, name) {
  const paint = GARAGE.paints.find((p) => p.name === name);
  if (!paint) return -1;
  if (player.cash < paint.cost) return -1;
  player.cash -= paint.cost;
  garage.paint = paint.name;
  return paint.cost;
}

export function garageSummary(garage) {
  const engine = GARAGE.engines[Math.min(garage.engine, GARAGE.engines.length - 1)];
  const armor = GARAGE.armors[Math.min(garage.armor, GARAGE.armors.length - 1)];
  return `${engine.name} engine, ${armor.name} armor, ${garage.nitro} nitro, ${garage.paint} paint`;
}
