// The street race series (v6 rewrite).
// Three illegal events run on the city roads after dark: a drag down the
// pier road, a sprint across town, and a circuit around the blocks. Pay the
// entry fee, chase the white gate rings in order, beat the par time for the
// full prize. Rain pays a bonus. Quitting mid-race (X) forfeits the fee.

import { SERIES } from './config.js';
import { gateChain } from './city.js';
import { rainBonus } from './weather.js';

export function initRaces() {
  return {
    won: 0,
    best: {},
    active: null,
    run: 0,
  };
}

export function raceDef(raceId) {
  return SERIES.list.find((r) => r.id === raceId) || null;
}

export function startRace(races, raceId, cash, city) {
  const def = raceDef(raceId);
  if (!def) return { ok: false, reason: 'no such race' };
  if (races.active) return { ok: false, reason: 'already racing' };
  if (cash < def.fee) return { ok: false, reason: 'not enough cash' };
  const gates = gateChain(city, raceId);
  if (gates.length < def.gates) return { ok: false, reason: 'no route' };
  races.active = {
    id: raceId,
    gate: 0,
    gates,
    elapsed: 0,
    fee: def.fee,
  };
  races.run += 1;
  return { ok: true, cost: def.fee, race: def };
}

export function raceActive(races) {
  return races.active !== null;
}

export function raceTick(races, dt) {
  if (!races.active) return;
  races.active.elapsed += dt;
}

export function raceGatePassed(races, x, z) {
  if (!races.active) return false;
  const next = races.active.gates[races.active.gate];
  if (!next) return false;
  const dx = x - next.x;
  const dz = z - next.z;
  const radius = SERIES.gateRadius;
  if (dx * dx + dz * dz > radius * radius) return false;
  races.active.gate += 1;
  return true;
}

export function raceFinished(races) {
  if (!races.active) return false;
  return races.active.gate >= races.active.gates.length;
}

export function finishRace(races, weather) {
  if (!races.active) return { ok: false, reason: 'no race running' };
  const def = raceDef(races.active.id);
  const seconds = races.active.elapsed;
  const underPar = seconds <= def.par;
  let prize = underPar ? def.prize : Math.round(def.prize * SERIES.latePrize);
  prize = Math.round(prize * rainBonus(weather));
  races.won += 1;
  const prev = races.best[def.id];
  if (typeof prev !== 'number' || seconds < prev) races.best[def.id] = Math.round(seconds * 10) / 10;
  races.active = null;
  return { ok: true, prize, seconds: Math.round(seconds * 10) / 10, underPar };
}

export function abandonRace(races) {
  if (!races.active) return false;
  races.active = null;
  return true;
}

export function raceBest(races, raceId) {
  return races.best[raceId];
}

export function serializeRaces(races) {
  return { won: races.won, best: races.best, run: races.run };
}

export function restoreRaces(data) {
  const fresh = initRaces();
  if (!data) return fresh;
  fresh.won = typeof data.won === 'number' ? data.won : 0;
  fresh.best = data.best && typeof data.best === 'object' ? data.best : {};
  fresh.run = typeof data.run === 'number' ? data.run : 0;
  return fresh;
}
