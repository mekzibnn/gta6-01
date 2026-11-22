// The garage. Engine tiers make the car faster, armour tiers soak up
// damage, nitro charges are spent for a burst. A hired crew mate takes
// 10% off every bill. The garage object lives on the game object so the
// playtest can read it straight off window.__game.

import { GARAGE_PRICES } from './config.js';
import { discounted } from './crew.js';

export function makeGarage() {
  return { engine: 0, nitro: 0, armor: 0 };
}

// The price of the next engine tier, or null when already maxed.
export function enginePrice(g) {
  if (g.garage.engine >= 2) return null;
  return discounted(GARAGE_PRICES.engine[g.garage.engine + 1], g);
}

// Buy the next engine tier. Returns true when the spanner turns.
export function buyEngine(g) {
  const price = enginePrice(g);
  if (price === null) return false;
  if (g.player.cash < price) return false;
  g.player.cash -= price;
  g.garage.engine += 1;
  return true;
}

// The price of the next armour tier, or null when already maxed.
export function armorPrice(g) {
  if (g.garage.armor >= 2) return null;
  return discounted(GARAGE_PRICES.armor[g.garage.armor + 1], g);
}

// Buy the next armour tier.
export function buyArmor(g) {
  const price = armorPrice(g);
  if (price === null) return false;
  if (g.player.cash < price) return false;
  g.player.cash -= price;
  g.garage.armor += 1;
  return true;
}

// Buy one nitro charge.
export function buyNitro(g) {
  const price = discounted(GARAGE_PRICES.nitroCharge, g);
  if (g.player.cash < price) return false;
  g.player.cash -= price;
  g.garage.nitro += 1;
  return true;
}

// The armour tier as a word for the HUD bar.
export function armorName(tier) {
  return ['None', 'Light', 'Heavy'][tier] || 'None';
}

// How much of a hit the armour soaks: a tier eats a third of it.
export function armorSoak(g) {
  return g.garage.armor * 0.33;
}
