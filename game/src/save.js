// Save / load for Solmar Heat — localStorage key 'solmar-heat.save.v2'.
import { SAVE_KEY } from './config.js';

export function writeSave(g) {
  try {
    const s = {
      v: 2,
      player: {
        cash: g.player.cash, health: g.player.health, wanted: g.player.wanted,
        weapon: g.player.weapon, weapons: g.player.weapons.slice(),
        ammo: JSON.parse(JSON.stringify(g.player.ammo)),
        districtStanding: { ...g.player.districtStanding },
        respect: g.player.respect,
        x: g.player.x, z: g.player.z,
      },
      mission: { index: g.mission.index, step: g.mission.step, done: g.mission.done.slice() },
      garage: { ...g.garage },
      empire: { owned: JSON.parse(JSON.stringify(g.empire.owned)), totalEarned: g.empire.totalEarned },
      roster: { hired: JSON.parse(JSON.stringify(g.roster.hired)) },
      streetRaces: { won: g.streetRaces.won, best: { ...g.streetRaces.best } },
      districtStanding: { ...g.player.districtStanding },
      stats: { ...g.stats },
      clockHour: g.clock.hour,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(s));
    return true;
  } catch { return false; }
}

export function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    return s && s.v === 2 ? s : null;
  } catch { return null; }
}

export function applySave(g, s) {
  if (!s) return;
  Object.assign(g.player, {
    cash: s.player.cash, health: s.player.health, wanted: 0,
    weapon: s.player.weapon, weapons: s.player.weapons.slice(),
    ammo: s.player.ammo, respect: s.player.respect,
  });
  g.player.districtStanding = { ...g.player.districtStanding, ...s.player.districtStanding };
  g.mission.index = s.mission.index; g.mission.step = s.mission.step;
  g.mission.done = s.mission.done.slice();
  Object.assign(g.garage, s.garage);
  g.empire.owned = s.empire.owned; g.empire.totalEarned = s.empire.totalEarned;
  g.roster.hired = s.roster.hired;
  g.streetRaces.won = s.streetRaces.won; g.streetRaces.best = s.streetRaces.best;
  Object.assign(g.stats, s.stats);
  g.clock.hour = s.clockHour;
}
