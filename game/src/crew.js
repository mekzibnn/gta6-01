// The crew (v6 rewrite).
// Three specialists Leo can hire: Milo the wheelman, Vera the hacker, Tank
// the muscle. Each one changes how the game plays — better handling, faster
// wanted decay, harder punches — and any hired mate knocks 10% off garage
// prices. A mate trails Leo on foot and throws punches beside him. Hiring
// records the game hour, never the wall clock, so a save is deterministic.

import { MATES } from './config.js';

export function initCrew() {
  return {
    hired: {},
  };
}

export function mateDef(mateId) {
  return MATES.list.find((m) => m.id === mateId) || null;
}

export function hireMate(crew, mateId, cash, gameHour) {
  const def = mateDef(mateId);
  if (!def) return { ok: false, reason: 'no such mate' };
  if (crew.hired[mateId]) return { ok: false, reason: 'already hired' };
  if (cash < def.price) return { ok: false, reason: 'not enough cash' };
  crew.hired[mateId] = { active: true, hiredAtHour: gameHour || 0 };
  return { ok: true, cost: def.price, mate: def };
}

export function crewHas(crew, mateId) {
  return !!(crew.hired[mateId] && crew.hired[mateId].active);
}

export function crewCount(crew) {
  return Object.keys(crew.hired).filter((id) => crew.hired[id].active).length;
}

export function crewHandling(crew) {
  // Milo the wheelman: the car grips better.
  return crewHas(crew, 'milo') ? (mateDef('milo').handling || 1.25) : 1;
}

export function crewDecay(crew) {
  // Vera the hacker: wanted stars fade faster.
  return crewHas(crew, 'vera') ? (mateDef('vera').decay || 1.5) : 1;
}

export function crewDamage(crew) {
  // Tank the muscle: punches and shots hit harder.
  return crewHas(crew, 'tank') ? (mateDef('tank').damage || 1.4) : 1;
}

export function crewGarageRate(crew) {
  // Any mate on the crew gets a discount at the garage.
  return crewCount(crew) > 0 ? 1 - MATES.garageDiscount : 1;
}

export function crewNames(crew) {
  return Object.keys(crew.hired)
    .filter((id) => crew.hired[id].active)
    .map((id) => {
      const def = mateDef(id);
      return def ? def.label : id;
    });
}

export function serializeCrew(crew) {
  return { hired: crew.hired };
}

export function restoreCrew(data) {
  const fresh = initCrew();
  if (!data) return fresh;
  fresh.hired = data.hired && typeof data.hired === 'object' ? data.hired : {};
  return fresh;
}
