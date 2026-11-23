// Garage upgrades — engine tiers, armour tiers and nitro. Prices live
// here so the shop menu and the HUD quote the same numbers.
import { ENGINE_PRICES, ARMOR_PRICES, NITRO_PRICE } from './config.js';
import { hasCrew } from './crew.js';

export function enginePrice(g) {
  const next = g.garage.engine + 1;
  if (next >= ENGINE_PRICES.length) return null;
  return Math.round(ENGINE_PRICES[next] * (hasCrew(g) ? 0.9 : 1));
}
export function armorPrice(g) {
  const next = g.garage.armor + 1;
  if (next >= ARMOR_PRICES.length) return null;
  return Math.round(ARMOR_PRICES[next] * (hasCrew(g) ? 0.9 : 1));
}
export function nitroPrice() { return NITRO_PRICE; }
export function armorLabel(tier) {
  return tier === 0 ? 'None' : tier === 1 ? 'Light' : 'Heavy';
}
