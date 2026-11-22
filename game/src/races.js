// Street races for Solmar Heat. No dependencies.
// Three series at the Race Office: Drag, Marina Sprint, Strip Circuit.
// A race is a list of gates to drive through in order; finishing pays the
// prize and records the best time.

export const RACES = [
  { id: 'drag', name: 'Drag', fee: 100, prize: 400 },
  { id: 'sprint', name: 'Marina Sprint', fee: 150, prize: 600 },
  { id: 'circuit', name: 'Strip Circuit', fee: 200, prize: 800 },
];

export function raceById(id) {
  return RACES.find((r) => r.id === id) ?? null;
}

export function makeStreetRaces() {
  return { active: null, won: 0, best: {} };
}

// Start a race: the fee is taken by the caller. `gates` is the route's
// list of {x, z} points, `now` the game clock.
export function startRace(streetRaces, race, gates, now) {
  streetRaces.active = { id: race.id, gate: 0, gates, startedAt: now };
}

// The current gate, or null when no race is running.
export function currentGate(streetRaces) {
  if (!streetRaces.active) return null;
  return streetRaces.active.gates[streetRaces.active.gate] ?? null;
}

// Advance through the gates. Returns the prize when the race finishes,
// 0 while it is still running.
export function updateRace(streetRaces, x, z, now) {
  const active = streetRaces.active;
  if (!active) return 0;
  const gate = active.gates[active.gate];
  if (!gate) return 0;
  const dx = x - gate.x;
  const dz = z - gate.z;
  if (dx * dx + dz * dz > 12 * 12) return 0;
  active.gate += 1;
  if (active.gate < active.gates.length) return 0;
  const race = raceById(active.id);
  const elapsed = now - active.startedAt;
  streetRaces.active = null;
  streetRaces.won += 1;
  if (typeof streetRaces.best[active.id] !== 'number' || elapsed < streetRaces.best[active.id]) {
    streetRaces.best[active.id] = elapsed;
  }
  return race ? race.prize : 0;
}

// Quit a race with the fee kept: no prize, no win counted.
export function abandonRace(streetRaces) {
  streetRaces.active = null;
}
