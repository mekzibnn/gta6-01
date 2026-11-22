// The empire. Four businesses the player can buy at their storefronts.
// Each owned business pays its hourly rate as the clock crosses each
// hour boundary, nights paying a little more. The take lands straight
// in the player's cash and in totalEarned.

import { BUSINESSES } from './config.js';

export function makeEmpire() {
  return {
    owned: {},
    totalEarned: 0,
    // The last whole hour the income tick ran for. The tick pays for
    // every hour boundary the clock crosses, so a jumped clock still
    // pays (capped, so a wild jump cannot print a fortune).
    lastHour: 18,
  };
}

// Buy a business: pay the price, own it at level 1. Returns true when
// the deal closes.
export function buyBusiness(g, id) {
  const biz = BUSINESSES[id];
  if (!biz) return false;
  if (g.empire.owned[id]) return false;
  if (g.player.cash < biz.price) return false;
  g.player.cash -= biz.price;
  g.empire.owned[id] = { level: 1, boughtAt: g.time };
  return true;
}

// The hourly rate of one owned business right now.
export function hourlyRate(g, id) {
  const biz = BUSINESSES[id];
  const owned = g.empire.owned[id];
  if (!biz || !owned) return 0;
  const night = g.clock.isNight ? biz.nightBoost : 1;
  return Math.round(biz.income * owned.level * night);
}

// Run the income tick: pay for every hour boundary crossed since the
// last tick, capped at five hours a frame so a clock jump cannot pay a
// fortune. Called once a frame from the main loop.
export function tickEmpireIncome(g) {
  const now = Math.floor(g.clock.hour);
  let last = Math.floor(g.empire.lastHour);
  if (now === last) return;
  // The clock wraps at midnight: 23 -> 0 is one hour, not minus 23.
  let hours = now - last;
  if (hours < 0) hours += 24;
  if (hours <= 0) return;
  hours = Math.min(hours, 5);
  let pay = 0;
  for (const id of Object.keys(g.empire.owned)) pay += hourlyRate(g, id) * hours;
  if (pay > 0) {
    g.player.cash += pay;
    g.empire.totalEarned += pay;
  }
  g.empire.lastHour = g.clock.hour;
}

// True when the player owns at least one business.
export function ownsAnyBusiness(g) {
  return Object.keys(g.empire.owned).length > 0;
}
