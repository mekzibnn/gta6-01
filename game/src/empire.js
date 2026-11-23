// Empire — businesses pay their hourly rate as the clock crosses the
// hour. Night pays a boost; day pays the plain rate.
import { BUSINESSES } from './config.js';

export function tickEmpire(g) {
  const owned = g.empire.owned;
  const ids = Object.keys(owned);
  const h = Math.floor(g.clock.hour);
  // A backward jump (a test setting the clock, or a midnight wrap)
  // must not block future income — just re-anchor and move on.
  if (h < g.empire.lastHour) {
    g.empire.lastHour = h;
    return;
  }
  if (ids.length === 0) {
    g.empire.lastHour = h;
    return;
  }
  if (h <= g.empire.lastHour) return;
  const hours = h - g.empire.lastHour;
  g.empire.lastHour = h;
  let rate = 0;
  for (const id of ids) {
    const def = businessDef(id);
    if (def) rate += def.income * owned[id].level;
  }
  const pay = Math.round(rate * hours * (g.clock.isNight ? 1.5 : 1));
  g.player.cash += pay;
  g.empire.totalEarned += pay;
}

function businessDef(id) {
  return BUSINESSES.find((b) => b.id === id);
}
