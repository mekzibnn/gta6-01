// Solmar Heat v12 — street races: Sprint / Circuit / Drag, gates, prizes.
import { RACE_DEFS } from './config.js';

export function startRace(g, id) {
  const def = RACE_DEFS[id];
  if (!def || !g.car) return false;
  if (g.player.cash < def.fee) return false;
  g.player.cash -= def.fee;
  const gates = g.city.gateRoutes[id] || g.city.gateRoutes.sprint;
  g.streetRaces.active = { id, gate: 0, gates, t: 0 };
  g.hud.banner = `${def.label.toUpperCase()} — GO!`; g.hud.bannerT = 3; g.hud.bannerKind = 'race';
  return true;
}

export function abandonRace(g) {
  if (g.streetRaces.active) g.streetRaces.active = null;
}

export function updateRaces(g, dt) {
  const r = g.streetRaces.active;
  if (!r) return;
  r.t += dt;
  const gate = r.gates[r.gate];
  if (!gate) { finishRace(g); return; }
  const px = g.car ? g.car.x : g.player.x;
  const pz = g.car ? g.car.z : g.player.z;
  if (Math.hypot(px - gate.x, pz - gate.z) < 12) {
    r.gate += 1;
    if (r.gate >= r.gates.length) finishRace(g);
  }
}

function finishRace(g) {
  const r = g.streetRaces.active;
  if (!r) return;
  const def = RACE_DEFS[r.id];
  g.player.cash += def.prize;
  g.streetRaces.won += 1;
  const t = Math.round(r.t * 10) / 10;
  if (g.streetRaces.best[r.id] === undefined || t < g.streetRaces.best[r.id]) g.streetRaces.best[r.id] = t;
  g.streetRaces.active = null;
  g.hud.banner = `${def.label.toUpperCase()} — WON  +$${def.prize}`; g.hud.bannerT = 4; g.hud.bannerKind = 'race';
}
