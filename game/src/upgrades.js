// The garage — car upgrades (v6 rewrite).
// Leo's garage tunes the car he drives: engine tiers for top speed and
// acceleration, armor tiers that soak damage, nitro charges for a burst of
// speed, and paint jobs that change the car's colour. Any crew mate on the
// payroll knocks 10% off every price here. Upgrades apply to the car Leo
// is driving and are saved with the career.

import { GARAGE } from './config.js';
import { crewGarageRate } from './crew.js';
import { applyEngine } from './vehicles.js';

export function initGarage() {
  return {
    engine: 0,
    armor: 0,
    nitro: 0,
    paint: 0,
  };
}

export function garageRate(garage, crew) {
  return crewGarageRate(crew);
}

export function engineCost(garage, crew) {
  const next = GARAGE.engines[garage.engine + 1];
  if (!next) return null;
  return Math.round(next.price * garageRate(garage, crew));
}

export function buyEngine(garage, cash, crew, car) {
  const cost = engineCost(garage, crew);
  if (cost === null) return { ok: false, reason: 'already maxed' };
  if (cash < cost) return { ok: false, reason: 'not enough cash' };
  garage.engine += 1;
  if (car) applyEngine(car, garage.engine);
  return { ok: true, cost, tier: garage.engine };
}

export function armorCost(garage, crew) {
  const next = GARAGE.armor[garage.armor + 1];
  if (!next) return null;
  return Math.round(next.price * garageRate(garage, crew));
}

export function buyArmor(garage, cash, crew) {
  const cost = armorCost(garage, crew);
  if (cost === null) return { ok: false, reason: 'already maxed' };
  if (cash < cost) return { ok: false, reason: 'not enough cash' };
  garage.armor += 1;
  return { ok: true, cost, tier: garage.armor };
}

export function armorSoak(garage) {
  const tier = GARAGE.armor[garage.armor] || GARAGE.armor[0];
  return tier.soak;
}

export function nitroCost(garage, crew) {
  return Math.round(GARAGE.nitroPrice * garageRate(garage, crew));
}

export function buyNitro(garage, cash, crew) {
  const cost = nitroCost(garage, crew);
  if (cash < cost) return { ok: false, reason: 'not enough cash' };
  garage.nitro += 1;
  return { ok: true, cost, charges: garage.nitro };
}

export function useNitro(garage) {
  if (garage.nitro <= 0) return false;
  garage.nitro -= 1;
  return true;
}

export const PAINTS = [
  { name: 'Sunset orange', color: 0xff5a3c },
  { name: 'Midnight blue', color: 0x1f3a5f },
  { name: 'Lime', color: 0x9acd32 },
  { name: 'Candy pink', color: 0xff6fa5 },
  { name: 'Carbon black', color: 0x111111 },
];

export function paintCost(garage, crew) {
  return Math.round(250 * garageRate(garage, crew));
}

export function buyPaint(garage, cash, crew, index) {
  if (index < 0 || index >= PAINTS.length) return { ok: false, reason: 'no such paint' };
  const cost = paintCost(garage, crew);
  if (cash < cost) return { ok: false, reason: 'not enough cash' };
  garage.paint = index;
  return { ok: true, cost, paint: PAINTS[index] };
}

export function garageSummary(garage) {
  const engine = GARAGE.engines[garage.engine] || GARAGE.engines[0];
  const armor = GARAGE.armor[garage.armor] || GARAGE.armor[0];
  return {
    engine: engine.name,
    armor: armor.name,
    nitro: garage.nitro,
    paint: (PAINTS[garage.paint] || PAINTS[0]).name,
  };
}
