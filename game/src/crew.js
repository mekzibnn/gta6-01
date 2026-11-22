// Solmar Heat v7 — the crew.
// Three mates, three perks, one discount: Milo sharpens the handling,
// Vera cools the heat faster, Tank hits harder. Any mate on the payroll
// gets Leo 10% off at the garage.

export const MATES = [
  { id: 'milo', name: 'Milo', perk: 'handling', cost: 900, blurb: 'Ex-racer. The car turns like it reads your mind.' },
  { id: 'vera', name: 'Vera', perk: 'decay', cost: 1400, blurb: 'Fixer. The heat forgets you faster.' },
  { id: 'tank', name: 'Tank', perk: 'damage', cost: 1800, blurb: 'Muscle. Your punches land twice as hard.' },
];

export function initCrew() {
  return { hired: {} };
}

export function mateDef(id) {
  return MATES.find((m) => m.id === id) || null;
}

export function hireMate(roster, player, id) {
  const def = mateDef(id);
  if (!def || roster.hired[id]) return -1;
  if (player.cash < def.cost) return -1;
  player.cash -= def.cost;
  roster.hired[id] = { active: true };
  return def.cost;
}

export function crewHandling(roster) {
  return roster.hired.milo ? 1.25 : 1;
}

export function crewDecay(roster) {
  return roster.hired.vera ? 1.6 : 1;
}

export function crewDamage(roster) {
  return roster.hired.tank ? 1.5 : 1;
}

export function crewGarageRate(roster) {
  return Object.keys(roster.hired).length > 0 ? 0.9 : 1;
}

export function crewNames(roster) {
  return Object.keys(roster.hired).map((id) => (mateDef(id) || {}).name || id);
}

export function serializeCrew(roster) {
  return { hired: roster.hired };
}

export function restoreCrew(data) {
  const roster = initCrew();
  if (data && typeof data === 'object' && data.hired && typeof data.hired === 'object') {
    roster.hired = data.hired;
  }
  return roster;
}
