// Solmar Heat v12 — save/load (localStorage, key solmar-heat.save.v2).
const KEY = 'solmar-heat.save.v2';

export function writeSave(g) {
  try {
    const s = {
      cash: g.player.cash,
      health: g.player.health,
      wanted: g.player.wanted,
      mission: { index: g.mission.index, done: g.mission.done.slice() },
      empire: { owned: g.empire.owned, totalEarned: g.empire.totalEarned },
      roster: { hired: g.roster.hired },
      streetRaces: { won: g.streetRaces.won, best: { ...g.streetRaces.best } },
      districtStanding: { ...g.player.districtStanding },
      garage: { ...g.garage },
      rp: g.player.rp,
      respect: g.player.respect,
      stats: { ...g.stats },
      clock: { hour: g.clock.hour },
      packages: g.packages.found,
    };
    localStorage.setItem(KEY, JSON.stringify(s));
    return true;
  } catch { return false; }
}

export function loadSave(g) {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return false;
    const s = JSON.parse(raw);
    if (!s || typeof s !== 'object') return false;
    if (typeof s.cash === 'number') g.player.cash = s.cash;
    if (s.mission) {
      if (typeof s.mission.index === 'number') g.mission.index = Math.min(s.mission.index, 15);
      if (Array.isArray(s.mission.done)) g.mission.done = s.mission.done.slice();
    }
    if (s.empire) {
      if (s.empire.owned) g.empire.owned = s.empire.owned;
      if (typeof s.empire.totalEarned === 'number') g.empire.totalEarned = s.empire.totalEarned;
    }
    if (s.roster && s.roster.hired) g.roster.hired = s.roster.hired;
    if (s.streetRaces) {
      if (typeof s.streetRaces.won === 'number') g.streetRaces.won = s.streetRaces.won;
      if (s.streetRaces.best) g.streetRaces.best = s.streetRaces.best;
    }
    if (s.districtStanding) g.player.districtStanding = { ...g.player.districtStanding, ...s.districtStanding };
    if (s.garage) g.garage = { ...g.garage, ...s.garage };
    if (typeof s.rp === 'number') g.player.rp = s.rp;
    if (typeof s.respect === 'number') g.player.respect = s.respect;
    if (s.clock && typeof s.clock.hour === 'number') g.clock.hour = s.clock.hour;
    return true;
  } catch { return false; }
}
