// Crew — roster perks and the Z / X / C abilities.
import { CREW } from './config.js';

export function hasCrew(g) {
  return Object.keys(g.roster.hired).length > 0;
}
export function crewPrice(g, id) {
  const c = CREW.find((x) => x.id === id);
  return c ? c.price : 0;
}

export function tickCrew(g, dt) {
  const cds = g.roster.cooldowns;
  for (const k of Object.keys(cds)) {
    cds[k] -= dt;
    if (cds[k] <= 0) delete cds[k];
  }
  if (g._eyesT > 0) g._eyesT -= dt;
}

export function useAbility(g, id) {
  if (!g.roster.hired[id]) return false;
  if (g.roster.cooldowns[id] > 0) return false;
  if (id === 'milo') {
    // SWAP PLATES — sheds a star of heat.
    if (g.player.wanted <= 0) return false;
    g.player.wanted = Math.max(0, g.player.wanted - 1);
    g.roster.cooldowns[id] = 30;
  } else if (id === 'vera') {
    // QUICK FIX — patches the car back up.
    if (!g.car) return false;
    g.car.health = Math.min(g.car.maxHealth, g.car.health + 30);
    g.roster.cooldowns[id] = 20;
  } else if (id === 'tank') {
    // EYES OUT — the KPD loses the trail for a while.
    g._eyesT = 12;
    g.roster.cooldowns[id] = 25;
  }
  g.hud.note = `${CREW.find((c) => c.id === id).ability} — ${CREW.find((c) => c.id === id).name}`;
  g.hud.noteT = 2;
  return true;
}
