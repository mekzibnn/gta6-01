// Saving: progress lives in localStorage so a player can continue a career.
// Only plain numbers and ids are stored, never anything personal.
import { SAVE_KEY } from './config.js';

export function saveGame(game) {
  try {
    const data = {
      cash: game.player.cash,
      health: game.player.health,
      missions: game.mission.index,
      completed: game.mission.completed,
      packages: game.mission.packagesFound,
      x: game.player.x,
      y: game.player.y,
      wanted: 0,
      savedAt: Date.now(),
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

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

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage can be off: nothing to clear.
  }
}

export function hasSave() {
  return loadSave() !== null;
}
