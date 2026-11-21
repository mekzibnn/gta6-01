// Solmar crew, v5. Three specialists the player can hire into the crew.
// Each one brings a perk that changes how the city treats the player: Milo
// makes the car hold the road, Vera makes the heat fade faster, Tank makes
// every hit land harder. A mate is hired once and stays hired; the perk is
// live whenever the mate is on the roster. This module never reads the game
// state directly — the caller asks whether a perk is live and applies the
// factor to its own numbers.

export const CREW_ROSTER = [
  {
    id: 'milo',
    name: 'Milo',
    role: 'wheelman',
    perk: 'handling',
    perkLabel: 'Cornering grip +25%',
    blurb: 'Ex-street racer. Knows every shortcut on Palm Strip.',
    cost: 900,
  },
  {
    id: 'vera',
    name: 'Vera',
    role: 'hacker',
    perk: 'cooldown',
    perkLabel: 'Wanted heat fades 50% faster',
    blurb: 'Spoofs the dispatch feed so the cops lose the trail.',
    cost: 1100,
  },
  {
    id: 'tank',
    name: 'Tank',
    role: 'muscle',
    perk: 'damage',
    perkLabel: 'Hits deal +40% damage',
    blurb: 'Carries the heavy jobs. Doors open faster around him.',
    cost: 1000,
  },
];

export function newCrew() {
  return {
    hired: {},
    totalSpent: 0,
  };
}

export function mateById(mateId) {
  for (const mate of CREW_ROSTER) {
    if (mate.id === mateId) return mate;
  }
  return null;
}

export function mateHired(crew, mateId) {
  return Boolean(crew && crew.hired && crew.hired[mateId]);
}

export function crewHiredCount(crew) {
  if (!crew || !crew.hired) return 0;
  return Object.keys(crew.hired).length;
}

export function crewHasAnyMate(crew) {
  return crewHiredCount(crew) > 0;
}

export function crewHiredNames(crew) {
  const names = [];
  for (const mate of CREW_ROSTER) {
    if (mateHired(crew, mate.id)) names.push(mate.name);
  }
  return names;
}

export function hireMate(crew, mateId, cash) {
  const mate = mateById(mateId);
  if (!mate) return { ok: false, cash, reason: 'no-such-mate' };
  if (mateHired(crew, mateId)) {
    return { ok: false, cash, reason: 'already-hired' };
  }
  if (typeof cash !== 'number' || cash < mate.cost) {
    return { ok: false, cash, reason: 'not-enough-cash' };
  }
  crew.hired[mateId] = { since: Date.now(), active: true };
  crew.totalSpent += mate.cost;
  return { ok: true, cash: cash - mate.cost, reason: 'hired', mate: mate.name };
}

export function crewPerkLive(crew, perkName) {
  if (!crew || !crew.hired) return false;
  for (const mate of CREW_ROSTER) {
    if (mate.perk !== perkName) continue;
    if (crew.hired[mate.id]) return true;
  }
  return false;
}

export function crewPerkFactor(crew, perkName) {
  if (!crewPerkLive(crew, perkName)) return 1;
  if (perkName === 'handling') return 1.25;
  if (perkName === 'cooldown') return 1.5;
  if (perkName === 'damage') return 1.4;
  return 1;
}

export function crewHandlingFactor(crew) {
  return crewPerkFactor(crew, 'handling');
}

export function crewCooldownFactor(crew) {
  return crewPerkFactor(crew, 'cooldown');
}

export function crewDamageFactor(crew) {
  return crewPerkFactor(crew, 'damage');
}

export function crewCheapestAvailable(crew, cash) {
  let cheapest = null;
  for (const mate of CREW_ROSTER) {
    if (mateHired(crew, mate.id)) continue;
    if (typeof cash === 'number' && cash < mate.cost) continue;
    if (!cheapest || mate.cost < cheapest.cost) cheapest = mate;
  }
  return cheapest;
}

export function serializeCrew(crew) {
  return {
    hired: crew && crew.hired ? JSON.parse(JSON.stringify(crew.hired)) : {},
    totalSpent: crew ? crew.totalSpent || 0 : 0,
  };
}

export function restoreCrew(saved) {
  const crew = newCrew();
  if (!saved || typeof saved !== 'object') return crew;
  if (saved.hired && typeof saved.hired === 'object') {
    for (const mateId of Object.keys(saved.hired)) {
      if (!mateById(mateId)) continue;
      crew.hired[mateId] = { since: saved.hired[mateId].since || 0, active: true };
    }
  }
  crew.totalSpent = Math.max(0, saved.totalSpent | 0);
  return crew;
}
