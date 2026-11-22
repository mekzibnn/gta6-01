// The crew. Three mates, each with a hire price and an effect the game
// really applies: Milo sharpens the handling, Vera slows the heat decay,
// Tank hardens every hit. A hired mate also knocks 10% off the garage.

import { CREW, CREW_DISCOUNT } from './config.js';

export function makeRoster() {
  return { hired: {} };
}

// The price of a mate, with the crew discount never stacking on itself.
export function crewPrice(id) {
  return CREW[id].price;
}

// Hire a mate: pay, mark them active, and return true. Fails when the
// player cannot afford them or already has them.
export function hireMate(g, id) {
  const mate = CREW[id];
  if (!mate) return false;
  if (g.roster.hired[id]) return false;
  if (g.player.cash < mate.price) return false;
  g.player.cash -= mate.price;
  g.roster.hired[id] = { active: true, hiredAt: g.time };
  return true;
}

// The handling multiplier the car gets: Milo adds a quarter.
export function handlingMultiplier(g) {
  return g.roster.hired.milo ? 1.25 : 1;
}

// The wanted-decay multiplier: Vera stretches each star out 1.6x.
export function decayMultiplier(g) {
  return g.roster.hired.vera ? 1.6 : 1;
}

// The damage multiplier: Tank lands half again as hard.
export function damageMultiplier(g) {
  return g.roster.hired.tank ? 1.5 : 1;
}

// The garage discount: any hired mate takes 10% off.
export function hasCrewDiscount(g) {
  return Object.keys(g.roster.hired).length > 0;
}

export function discounted(price, g) {
  return hasCrewDiscount(g) ? Math.round(price * CREW_DISCOUNT) : price;
}

// The mates the HUD shows as ability cards.
export function hiredMates(g) {
  return Object.keys(g.roster.hired).map((id) => CREW[id]);
}
