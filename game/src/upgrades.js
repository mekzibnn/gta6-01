// Garage upgrades for Solmar Heat.
// Three engine tiers, three armour tiers, nitro charges. A hired crew
// member gets the garage 10% off: tier 2 is $1600 list, $1440 with the
// crew rate.

import { PRICES } from './config.js';
import { hasCrew } from './crew.js';

export const ENGINE_TIERS = ['Stock', 'Street', 'Race'];
export const ARMOR_TIERS = ['None', 'Light', 'Heavy'];

export function makeGarage() {
  return { engine: 0, nitro: 0, armor: 0 };
}

// The price of the next engine tier, or null when already at the top.
export function enginePrice(garage, roster) {
  const tier = garage.engine + 1;
  if (tier > 2) return null;
  const list = PRICES.engine[tier];
  return hasCrew(roster) ? Math.round(list * (1 - PRICES.crewDiscount)) : list;
}

// The price of the next armour tier, or null when already at the top.
export function armorPrice(garage, roster) {
  const tier = garage.armor + 1;
  if (tier > 2) return null;
  const list = PRICES.armor[tier];
  return hasCrew(roster) ? Math.round(list * (1 - PRICES.crewDiscount)) : list;
}

// One nitro charge, crew rate included.
export function nitroPrice(roster) {
  const list = PRICES.nitroCharge;
  return hasCrew(roster) ? Math.round(list * (1 - PRICES.crewDiscount)) : list;
}

// The armour tier's name for the HUD.
export function armorLabel(armor) {
  return ARMOR_TIERS[armor] ?? 'None';
}

// The engine tier's name for the HUD.
export function engineLabel(engine) {
  return ENGINE_TIERS[engine] ?? 'Stock';
}
