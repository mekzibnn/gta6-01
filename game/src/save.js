// Saving and loading for Solmar Heat.
// One localStorage key, versioned. The shape is flat on purpose: the pause
// screen writes it, the next session reads it back, and nothing else
// touches it.

import { SAVE_KEY } from './config.js';

export function writeSave(game) {
  try {
    const snapshot = {
      version: 2,
      cash: game.player.cash,
      health: game.player.health,
      wanted: game.player.wanted,
      garage: game.garage,
      empire: game.empire,
      roster: game.roster,
      streetRaces: game.streetRaces,
      districtStanding: game.player.districtStanding,
      missions: { done: game.mission.done, index: game.mission.index },
      stats: game.stats,
      clockHour: game.clock.hour,
      player: { x: game.player.x, z: game.player.z },
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

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

// Fold a save back into a fresh game. Missing pieces keep their defaults.
export function applySave(game, data) {
  if (!data) return;
  if (typeof data.cash === 'number') game.player.cash = data.cash;
  if (typeof data.health === 'number') game.player.health = data.health;
  if (data.garage) Object.assign(game.garage, data.garage);
  if (data.empire) {
    game.empire.owned = data.empire.owned ?? {};
    game.empire.totalEarned = data.empire.totalEarned ?? 0;
  }
  if (data.roster) game.roster.hired = data.roster.hired ?? {};
  if (data.streetRaces) {
    game.streetRaces.won = data.streetRaces.won ?? 0;
    game.streetRaces.best = data.streetRaces.best ?? {};
  }
  if (data.districtStanding) {
    Object.assign(game.player.districtStanding, data.districtStanding);
  }
  if (data.missions) {
    game.mission.done = data.missions.done ?? [];
    game.mission.index = data.missions.index ?? 0;
  }
  if (data.stats) Object.assign(game.stats, data.stats);
  if (typeof data.clockHour === 'number') game.clock.hour = data.clockHour;
  if (data.player) {
    game.player.x = data.player.x ?? game.player.x;
    game.player.z = data.player.z ?? game.player.z;
  }
}
