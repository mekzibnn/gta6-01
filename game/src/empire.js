// Solmar Heat v7 — the business empire.
// Four fronts to buy: a laundry, a car wash, a taxi company, and a
// nightclub that pays double after dark. They pay every game hour, and
// the take lands in the player's pocket whether Leo is there or not.

export const VENTURES = [
  { id: 'solmar-laundry', name: 'Solmar Laundry', cost: 500, hourly: 35, night: false },
  { id: 'sunset-carwash', name: 'Sunset Car Wash', cost: 1200, hourly: 70, night: false },
  { id: 'sunset-taxi', name: 'Sunset Taxi Co.', cost: 2500, hourly: 120, night: false },
  { id: 'club-neon', name: 'Club Neon', cost: 5000, hourly: 200, night: true },
];

export function initEmpire() {
  return { owned: {}, totalEarned: 0 };
}

export function ventureDef(id) {
  return VENTURES.find((v) => v.id === id) || null;
}

export function ventureHourly(def, level, hour) {
  if (!def) return 0;
  const night = hour >= 19 || hour < 6;
  const boost = def.night && night ? 2 : 1;
  return def.hourly * (level || 1) * boost;
}

export function empireHourly(empire, hour) {
  let total = 0;
  for (const id of Object.keys(empire.owned)) {
    total += ventureHourly(ventureDef(id), empire.owned[id].level, hour);
  }
  return total;
}

export function buyVenture(empire, player, id) {
  const def = ventureDef(id);
  if (!def || empire.owned[id]) return -1;
  if (player.cash < def.cost) return -1;
  player.cash -= def.cost;
  empire.owned[id] = { level: 1 };
  return def.cost;
}

export function upgradeVenture(empire, player, id) {
  const def = ventureDef(id);
  const owned = empire.owned[id];
  if (!def || !owned) return -1;
  const cost = def.cost * owned.level;
  if (player.cash < cost) return -1;
  player.cash -= cost;
  owned.level += 1;
  return cost;
}

export function accrueEmpire(empire, hours, player, hour) {
  if (hours <= 0) return 0;
  const take = empireHourly(empire, hour) * hours;
  if (take > 0) {
    player.cash += take;
    empire.totalEarned += take;
  }
  return take;
}

export function serializeEmpire(empire) {
  return { owned: empire.owned, totalEarned: empire.totalEarned };
}

export function restoreEmpire(data) {
  const empire = initEmpire();
  if (data && typeof data === 'object') {
    if (data.owned && typeof data.owned === 'object') empire.owned = data.owned;
    if (typeof data.totalEarned === 'number') empire.totalEarned = Math.max(0, data.totalEarned);
  }
  return empire;
}
