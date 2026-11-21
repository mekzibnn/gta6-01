// The business empire (v6 rewrite).
// Leo buys storefronts around Solmar and they pay him while he drives.
// Each venture has a buy price, a base income per game hour, and levels
// that raise the income. The Neon Palms Club earns double at night. Income
// is banked once per game hour, only while the game runs — pausing the game
// pauses the money. The empire is saved with the career.

import { VENTURES } from './config.js';
import { isNightHour } from './daynight.js';

export function initEmpire() {
  return {
    owned: {},
    totalEarned: 0,
    hoursBanked: 0,
    pending: 0,
  };
}

export function ventureDef(ventureId) {
  return VENTURES.list.find((v) => v.id === ventureId) || null;
}

export function ventureHourly(empire, ventureId, clock) {
  const def = ventureDef(ventureId);
  if (!def) return 0;
  const held = empire.owned[ventureId];
  if (!held) return 0;
  let rate = def.hourly * (1 + (held.level - 1) * VENTURES.levelBonus);
  if (def.nightBoost && isNightHour(clock.hour)) {
    const inWindow = def.nightFrom > def.nightTo
      ? (clock.hour >= def.nightFrom || clock.hour < def.nightTo)
      : (clock.hour >= def.nightFrom && clock.hour < def.nightTo);
    if (inWindow) rate *= def.nightBoost;
  }
  return Math.round(rate);
}

export function empireHourly(empire, clock) {
  let total = 0;
  for (const id of Object.keys(empire.owned)) {
    total += ventureHourly(empire, id, clock);
  }
  return total;
}

export function buyVenture(empire, ventureId, cash) {
  const def = ventureDef(ventureId);
  if (!def) return { ok: false, reason: 'no such business' };
  if (empire.owned[ventureId]) return { ok: false, reason: 'already owned' };
  if (cash < def.price) return { ok: false, reason: 'not enough cash' };
  empire.owned[ventureId] = { level: 1, boughtAtHour: 0 };
  return { ok: true, cost: def.price, venture: def };
}

export function upgradeVenture(empire, ventureId, cash) {
  const def = ventureDef(ventureId);
  const held = empire.owned[ventureId];
  if (!def || !held) return { ok: false, reason: 'not owned' };
  const cost = Math.round(def.price * VENTURES.upgradeCost * held.level);
  if (cash < cost) return { ok: false, reason: 'not enough cash' };
  held.level += 1;
  return { ok: true, cost, level: held.level };
}

export function accrueEmpire(empire, clock, hours) {
  // Bank income for the game hours that passed (hours comes from the clock,
  // so jumping the clock forward — or just playing — banks the same way).
  // Income is banked once per game hour, only while the game runs.
  empire.pending += hours;
  let paid = 0;
  while (empire.pending >= VENTURES.tickHours) {
    empire.pending -= VENTURES.tickHours;
    const due = empireHourly(empire, clock);
    empire.totalEarned += due;
    empire.hoursBanked += 1;
    paid += due;
  }
  return paid;
}

export function empireCount(empire) {
  return Object.keys(empire.owned).length;
}

export function empireOwnedIds(empire) {
  return Object.keys(empire.owned);
}

export function serializeEmpire(empire) {
  return {
    owned: empire.owned,
    totalEarned: empire.totalEarned,
    hoursBanked: empire.hoursBanked,
  };
}

export function restoreEmpire(data) {
  const fresh = initEmpire();
  if (!data) return fresh;
  fresh.owned = data.owned && typeof data.owned === 'object' ? data.owned : {};
  fresh.totalEarned = typeof data.totalEarned === 'number' ? data.totalEarned : 0;
  fresh.hoursBanked = typeof data.hoursBanked === 'number' ? data.hoursBanked : 0;
  return fresh;
}
