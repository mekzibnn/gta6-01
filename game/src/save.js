// Save and load. The save lives in localStorage under the v2 key and
// holds everything a returning player needs: cash, the mission, the
// empire, the roster, the race series, the district standing and the
// garage. It is written when the game pauses and loaded on start.

import { SAVE_KEY } from './config.js';

// Gather the saveable slice of the game object into a plain object.
export function buildSave(g) {
  return {
    version: 2,
    cash: g.player.cash,
    wanted: g.player.wanted,
    health: g.player.health,
    respect: g.player.respect,
    mission: { index: g.mission.index, done: [...g.mission.done] },
    empire: {
      owned: JSON.parse(JSON.stringify(g.empire.owned)),
      totalEarned: g.empire.totalEarned,
    },
    roster: { hired: JSON.parse(JSON.stringify(g.roster.hired)) },
    streetRaces: {
      won: g.streetRaces.won,
      best: { ...g.streetRaces.best },
    },
    districtStanding: { ...g.player.districtStanding },
    garage: { ...g.garage },
    clockHour: g.clock.hour,
    stats: { ...g.stats },
  };
}

// Write the save. Returns true when it landed.
export function writeSave(g) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(buildSave(g)));
    return true;
  } catch {
    return false;
  }
}

// Read the save back, or null when there is none or it is corrupt.
export function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 2) return null;
    return data;
  } catch {
    return null;
  }
}

// Apply a loaded save onto a fresh game object. Only the fields the save
// owns are touched; the world itself is rebuilt from the seed.
export function applySave(g, data) {
  if (!data) return;
  g.player.cash = data.cash ?? g.player.cash;
  g.player.wanted = data.wanted ?? 0;
  g.player.health = data.health ?? 100;
  g.player.respect = data.respect ?? 0;
  if (data.mission) {
    g.mission.index = data.mission.index ?? 0;
    g.mission.done = [...(data.mission.done ?? [])];
  }
  if (data.empire) {
    g.empire.owned = data.empire.owned ?? {};
    g.empire.totalEarned = data.empire.totalEarned ?? 0;
  }
  if (data.roster) g.roster.hired = data.roster.hired ?? {};
  if (data.streetRaces) {
    g.streetRaces.won = data.streetRaces.won ?? 0;
    g.streetRaces.best = data.streetRaces.best ?? {};
  }
  if (data.districtStanding) {
    Object.assign(g.player.districtStanding, data.districtStanding);
  }
  if (data.garage) Object.assign(g.garage, data.garage);
  if (typeof data.clockHour === 'number') g.clock.hour = data.clockHour;
  if (data.stats) Object.assign(g.stats, data.stats);
}
