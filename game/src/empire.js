// Solmar business empire, v5. The player buys small storefronts around the
// city and they pay out every game hour. A venture is bought once, then it
// earns at its hourly rate; paying the upgrade cost raises its level and the
// payout grows with it. The Neon Palms Club earns double after dark, when
// the strip lights up. Nothing here touches the renderer or the save file:
// the caller owns the cash value and the clock, this module only decides
// what a purchase costs and what an hour of ownership is worth.
import { isNightHour } from './daynight.js';

export const EMPIRE_VENTURES = [
  {
    id: 'sunset-taxi',
    name: 'Sunset Taxi Co.',
    blurb: 'A fleet of yellow cabs running the marina loop all day.',
    price: 1200,
    hourly: 90,
    upCost: 600,
    nightBoost: false,
  },
  {
    id: 'palm-wash',
    name: 'Palm Wash',
    blurb: 'A drive-through car wash off Palm Strip, always a queue.',
    price: 800,
    hourly: 60,
    upCost: 400,
    nightBoost: false,
  },
  {
    id: 'neon-palms',
    name: 'Neon Palms Club',
    blurb: 'A basement club under the neon sign; packed after midnight.',
    price: 2500,
    hourly: 180,
    upCost: 1200,
    nightBoost: true,
  },
  {
    id: 'solmar-laundry',
    name: 'Solmar Laundry',
    blurb: 'Washers and dryers humming next to the Portside market.',
    price: 500,
    hourly: 35,
    upCost: 250,
    nightBoost: false,
  },
];

export function newEmpire() {
  return {
    owned: {},
    totalEarned: 0,
    totalSpent: 0,
  };
}

export function ventureById(ventureId) {
  for (const venture of EMPIRE_VENTURES) {
    if (venture.id === ventureId) return venture;
  }
  return null;
}

export function ventureOwned(empire, ventureId) {
  return Boolean(empire && empire.owned && empire.owned[ventureId]);
}

export function empireVentureCount(empire) {
  if (!empire || !empire.owned) return 0;
  return Object.keys(empire.owned).length;
}

export function empireHasAnyVenture(empire) {
  return empireVentureCount(empire) > 0;
}

export function ventureLevel(empire, ventureId) {
  const holding = empire && empire.owned ? empire.owned[ventureId] : null;
  return holding ? holding.level : 0;
}

export function ventureHourlyRate(empire, ventureId, hourOfDay) {
  const venture = ventureById(ventureId);
  if (!venture) return 0;
  const level = ventureLevel(empire, ventureId);
  if (level <= 0) return 0;
  const levelFactor = 1 + 0.5 * (level - 1);
  let rate = venture.hourly * levelFactor;
  if (venture.nightBoost && typeof hourOfDay === 'number') {
    if (isNightHour(hourOfDay)) rate *= 2;
  }
  return Math.round(rate);
}

export function empireHourlyTake(empire, hourOfDay) {
  let take = 0;
  for (const ventureId of Object.keys(empire.owned || {})) {
    take += ventureHourlyRate(empire, ventureId, hourOfDay);
  }
  return take;
}

export function buyVenture(empire, ventureId, cash) {
  const venture = ventureById(ventureId);
  if (!venture) return { ok: false, cash, reason: 'no-such-venture' };
  if (ventureOwned(empire, ventureId)) {
    return { ok: false, cash, reason: 'already-owned' };
  }
  if (typeof cash !== 'number' || cash < venture.price) {
    return { ok: false, cash, reason: 'not-enough-cash' };
  }
  empire.owned[ventureId] = { level: 1, earned: 0 };
  empire.totalSpent += venture.price;
  return { ok: true, cash: cash - venture.price, reason: 'bought' };
}

export function upgradeVenture(empire, ventureId, cash) {
  const venture = ventureById(ventureId);
  if (!venture) return { ok: false, cash, reason: 'no-such-venture' };
  const holding = empire.owned ? empire.owned[ventureId] : null;
  if (!holding) return { ok: false, cash, reason: 'not-owned' };
  const cost = venture.upCost * holding.level;
  if (typeof cash !== 'number' || cash < cost) {
    return { ok: false, cash, reason: 'not-enough-cash' };
  }
  holding.level += 1;
  empire.totalSpent += cost;
  return { ok: true, cash: cash - cost, reason: 'upgraded', level: holding.level };
}

export function tickVentureIncome(empire, hours, hourOfDay) {
  const payout = { amount: 0, perVenture: {} };
  if (!empire || !empire.owned || !(hours > 0)) return payout;
  for (const ventureId of Object.keys(empire.owned)) {
    const rate = ventureHourlyRate(empire, ventureId, hourOfDay);
    const share = Math.round(rate * hours);
    empire.owned[ventureId].earned += share;
    empire.totalEarned += share;
    payout.perVenture[ventureId] = share;
    payout.amount += share;
  }
  return payout;
}

export function empireEarnedTotal(empire) {
  return empire ? empire.totalEarned || 0 : 0;
}

export function empireCheapestAvailable(empire, cash) {
  let cheapest = null;
  for (const venture of EMPIRE_VENTURES) {
    if (ventureOwned(empire, venture.id)) continue;
    if (typeof cash === 'number' && cash < venture.price) continue;
    if (!cheapest || venture.price < cheapest.price) cheapest = venture;
  }
  return cheapest;
}

export function serializeEmpire(empire) {
  return {
    owned: empire && empire.owned ? JSON.parse(JSON.stringify(empire.owned)) : {},
    totalEarned: empire ? empire.totalEarned || 0 : 0,
    totalSpent: empire ? empire.totalSpent || 0 : 0,
  };
}

export function restoreEmpire(saved) {
  const empire = newEmpire();
  if (!saved || typeof saved !== 'object') return empire;
  if (saved.owned && typeof saved.owned === 'object') {
    for (const ventureId of Object.keys(saved.owned)) {
      const holding = saved.owned[ventureId];
      if (!ventureById(ventureId)) continue;
      empire.owned[ventureId] = {
        level: Math.max(1, holding.level | 0),
        earned: Math.max(0, holding.earned | 0),
      };
    }
  }
  empire.totalEarned = Math.max(0, saved.totalEarned | 0);
  empire.totalSpent = Math.max(0, saved.totalSpent | 0);
  return empire;
}
