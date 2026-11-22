// The crew for Solmar Heat. No dependencies.
// Three fixers the player hires at the Crew Office. Each one changes how
// the game plays, and the HUD shows the hired ones as ability cards.

export const CREW = [
  {
    id: 'milo',
    name: 'Milo',
    initial: 'M',
    cost: 900,
    effect: 'Handling +25%',
    desc: 'A wheelman. The car turns sharper and holds the road.',
  },
  {
    id: 'vera',
    name: 'Vera',
    initial: 'V',
    cost: 1400,
    effect: 'Heat decays 1.6×',
    desc: 'A cleaner. Wanted stars cool off almost twice as fast.',
  },
  {
    id: 'tank',
    name: 'Tank',
    initial: 'T',
    cost: 1800,
    effect: 'Ram damage 1.5×',
    desc: 'A battering ram. Ramming a cop car hits half again as hard.',
  },
];

export function crewById(id) {
  return CREW.find((c) => c.id === id) ?? null;
}

// How many mates are on the roster.
export function crewCount(roster) {
  return Object.keys(roster.hired).length;
}

// True when at least one mate is hired: the garage gives the crew rate.
export function hasCrew(roster) {
  return crewCount(roster) > 0;
}

// Handling multiplier: Milo sharpens the steering.
export function handlingBonus(roster) {
  return roster.hired.milo ? 1.25 : 1;
}

// Wanted decay multiplier: Vera cools the heat off faster.
export function decayBonus(roster) {
  return roster.hired.vera ? 1.6 : 1;
}

// Ram damage multiplier: Tank hits harder.
export function ramBonus(roster) {
  return roster.hired.tank ? 1.5 : 1;
}
