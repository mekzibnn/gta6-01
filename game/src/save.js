// Saving: progress lives in localStorage so a player can continue a career.
// Only plain numbers and ids are stored, never anything personal.
import { SAVE_KEY } from './config.js';

/** Read the saved career, or null when there is none (or it is corrupt). */
export function loadSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number' || typeof data.missions !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

/** Is there a saved career to continue? */
export function hasSave() {
  return loadSave() !== null;
}

/** Write the current career to localStorage. Returns false when storage fails. */
export function saveGame(game) {
  try {
    const data = {
      cash: game.player.cash,
      health: game.player.health,
      x: game.player.x,
      y: game.player.y,
      wanted: 0,
      missions: game.mission.index,
      completed: game.mission.completed,
      packages: game.mission.packagesFound,
      respect: game.respect,
      respectByDistrict: game.respectByDistrict,
      upgrades: game.upgrades,
      weaponsOwned: game.weaponsOwned,
      ammo: game.player.ammo,
      radio: game.radio,
      raceBest: game.raceBest,
      // The clock is saved so the day/night cycle continues where it left off.
      clock: game.clock,
      // The career's record, so the pause screen remembers the road so far.
      stats: game.stats,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** Drop the saved career (starting a new game does this). */
export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: nothing to clear.
  }
}
