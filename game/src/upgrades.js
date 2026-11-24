// Solmar Heat v12 — garage upgrades: engine tiers, armour, nitro.
import { GARAGE_PRICES } from './config.js';
import { crewDiscount } from './crew.js';

export function buyEngine(g) {
  const tier = g.garage.engine;
  if (tier >= 3) return false;
  const price = Math.round(GARAGE_PRICES.engine[tier] * crewDiscount(g));
  if (g.player.cash < price) return false;
  g.player.cash -= price;
  g.garage.engine = tier + 1;
  return true;
}

export function buyArmor(g) {
  const tier = g.garage.armor;
  if (tier >= 2) return false;
  const price = Math.round(GARAGE_PRICES.armor[tier] * crewDiscount(g));
  if (g.player.cash < price) return false;
  g.player.cash -= price;
  g.garage.armor = tier + 1;
  return true;
}

export function buyNitro(g) {
  const price = GARAGE_PRICES.nitro;
  if (g.player.cash < price || g.garage.nitro >= 3) return false;
  g.player.cash -= price;
  g.garage.nitro += 1;
  return true;
}
