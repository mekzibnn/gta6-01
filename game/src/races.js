// Street series — Drag, Sprint and Circuit out of the Race Office.
// Gates in order, prize on the line, X walks away from a running race.
import { RACES } from './config.js';

export function tickRaces(g, dt) {
  const a = g.streetRaces.active;
  if (!a) return;
  a.t += dt;
  const route = g.city.gateRoutes[a.id];
  if (!route) { g.streetRaces.active = null; return; }
  const gate = route[a.gate];
  if (!gate) { finishRace(g, a); return; }
  const px = g.player.x, pz = g.player.z;
  if (Math.hypot(gate.x - px, gate.z - pz) < 12) {
    a.gate += 1;
    if (a.gate >= route.length) finishRace(g, a);
  }
}

function finishRace(g, a) {
  const def = RACES.find((r) => r.id === a.id);
  let prize = def ? def.prize : 0;
  if (g.weather.kind === 'rain') prize = Math.round(prize * 1.25);
  g.player.cash += prize;
  g.streetRaces.won += 1;
  g.stats.racesWon += 1;
  const prev = g.streetRaces.best[a.id];
  if (prev === undefined || a.t < prev) g.streetRaces.best[a.id] = a.t;
  g.hud.banner = `${def ? def.name : a.id} — WON $${prize}`;
  g.hud.bannerT = 4;
  g.hud.bannerKind = 'race';
  g.streetRaces.active = null;
}

export function abandonRace(g) {
  if (g.streetRaces.active) {
    g.streetRaces.active = null;
    g.hud.note = 'Race abandoned — the fee stays with the flag';
    g.hud.noteT = 2;
  }
}
