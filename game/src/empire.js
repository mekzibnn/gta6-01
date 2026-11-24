// Solmar Heat v12 — business empire: buy storefronts, earn hourly income.
import { BUSINESSES } from './config.js';

export function empireRate(g) {
  let rate = 0;
  for (const id of Object.keys(g.empire.owned)) {
    const b = BUSINESSES.find((x) => x.id === id);
    if (b) rate += b.rate * (g.empire.owned[id].level || 1);
  }
  return rate;
}

export function buyBusiness(g, id) {
  const b = BUSINESSES.find((x) => x.id === id);
  if (!b || g.empire.owned[id]) return false;
  if (g.player.cash < b.price) return false;
  g.player.cash -= b.price;
  g.empire.owned[id] = { level: 1 };
  return true;
}

export function updateEmpire(g, dt) {
  const hour = g.clock.hour;
  const prev = g.empire.prevHour;
  g.empire.prevHour = hour;
  if (prev === undefined) { g.empire.lastPaid = Math.floor(hour); return; }
  let paidHours = 0;
  if (hour < prev - 0.5) {
    // Clock jumped backwards (or a new day wrapped past midnight).
    if (prev > 20 && hour < 4) {
      // Day wrap: pay the tail of the old day, then start the new one.
      paidHours = Math.max(0, 24 - (g.empire.lastPaid ?? 0));
      g.empire.lastPaid = 0;
    } else {
      g.empire.lastPaid = Math.floor(hour);
      return;
    }
  }
  const fh = Math.floor(hour);
  if (fh > (g.empire.lastPaid ?? fh)) {
    paidHours += fh - (g.empire.lastPaid ?? fh);
    g.empire.lastPaid = fh;
  }
  if (paidHours > 0) {
    const night = g.clock.isNight ? 1.5 : 1;
    const earn = Math.round(empireRate(g) * paidHours * night);
    if (earn > 0) {
      g.player.cash += earn;
      g.empire.totalEarned += earn;
    }
  }
}
