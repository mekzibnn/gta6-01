// Solmar Heat v12 — crew: hire Milo/Vera/Tank, use their abilities (Z/X/C).
import { CREW_DEFS } from './config.js';

export function hireCrew(g, id) {
  const def = CREW_DEFS.find((c) => c.id === id);
  if (!def || g.roster.hired[id]) return false;
  if (g.player.cash < def.price) return false;
  g.player.cash -= def.price;
  g.roster.hired[id] = { active: true };
  return true;
}

export function crewDiscount(g) {
  return Object.keys(g.roster.hired).length > 0 ? 0.9 : 1;
}

export function useAbility(g, key) {
  const now = g.time;
  if (key === 'z' && g.roster.hired.milo) {
    if (now - (g.crewCooldowns.z || 0) < 30) return;
    g.crewCooldowns.z = now;
    if (g.player.wanted > 0) { g.player.wanted -= 1; g.player.lastCrime = g.time; }
    g.hud.banner = 'SWAP PLATES — heat down a star'; g.hud.bannerT = 3; g.hud.bannerKind = 'crew';
  } else if (key === 'x' && g.roster.hired.vera) {
    if (now - (g.crewCooldowns.x || 0) < 30) return;
    g.crewCooldowns.x = now;
    if (g.car) g.car.health = g.car.maxHealth;
    g.player.health = 100;
    g.hud.banner = 'QUICK FIX — ride patched up'; g.hud.bannerT = 3; g.hud.bannerKind = 'crew';
  } else if (key === 'c' && g.roster.hired.tank) {
    if (now - (g.crewCooldowns.c || 0) < 30) return;
    g.crewCooldowns.c = now;
    g.eyesOut = 20;
    g.hud.banner = 'EYES OUT — Tank is watching the streets'; g.hud.bannerT = 3; g.hud.bannerKind = 'crew';
  }
}
