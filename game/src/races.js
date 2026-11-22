// Solmar Heat v7 — the street series.
// Three races, one office: Drag is a straight shot, Sprint is four gates
// across town, Circuit is six gates around the loop. Entry costs money,
// winning pays it back with interest — and rain pays a bonus on top.

import { rainBonus } from './weather.js';

export const RACES = [
  { id: 'drag', name: 'Drag', fee: 100, prize: 400, gates: 2 },
  { id: 'sprint', name: 'Marina Sprint', fee: 150, prize: 600, gates: 4 },
  { id: 'circuit', name: 'Strip Circuit', fee: 300, prize: 1200, gates: 6 },
];

export function initRaces() {
  return { active: null, won: 0, best: {} };
}

export function raceDef(id) {
  return RACES.find((r) => r.id === id) || null;
}

export function startRace(races, player, id) {
  const def = raceDef(id);
  if (!def || races.active) return false;
  if (player.cash < def.fee) return false;
  player.cash -= def.fee;
  races.active = { id, gate: 0, t: 0 };
  return true;
}

export function raceGatePassed(races) {
  if (!races.active) return false;
  races.active.gate += 1;
  return raceFinished(races);
}

export function raceFinished(races) {
  if (!races.active) return false;
  const def = raceDef(races.active.id);
  return def ? races.active.gate >= def.gates : false;
}

export function finishRace(races, player, weather) {
  if (!races.active) return 0;
  const def = raceDef(races.active.id);
  const prize = Math.round(def.prize * rainBonus(weather));
  player.cash += prize;
  races.won += 1;
  const prev = races.best[races.active.id];
  if (prev === undefined || races.active.t < prev) races.best[races.active.id] = Math.round(races.active.t * 10) / 10;
  races.active = null;
  return prize;
}

export function abandonRace(races) {
  races.active = null;
}

export function raceTick(races, player, city, dt, weather) {
  if (!races.active) return null;
  races.active.t += dt;
  const gates = city.gateRoutes[races.active.id] || [];
  const target = gates[races.active.gate];
  if (!target) return null;
  const dx = target.x - player.x;
  const dz = target.z - player.z;
  if (dx * dx + dz * dz < 144) {
    const finished = raceGatePassed(races);
    if (finished) {
      const prize = finishRace(races, player, weather);
      return { finished: true, prize };
    }
    return { gate: races.active.gate };
  }
  return null;
}

export function serializeRaces(races) {
  return { won: races.won, best: races.best };
}

export function restoreRaces(data) {
  const races = initRaces();
  if (data && typeof data === 'object') {
    if (typeof data.won === 'number') races.won = Math.max(0, data.won);
    if (data.best && typeof data.best === 'object') races.best = data.best;
  }
  return races;
}
