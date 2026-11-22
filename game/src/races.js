// The street series. Three races out of the Race Office at the drag
// strip: a Sprint down the avenue, a Circuit around the blocks and a
// Drag down the straight. Entry costs a fee, the gates must be driven
// in order, and the prize lands when the last gate falls. X abandons a
// race and the fee stays with the flag.

export const RACE_DEFS = {
  sprint: { id: 'sprint', name: 'Marina Sprint', fee: 150, prize: 600, gates: 4 },
  circuit: { id: 'circuit', name: 'Strip Circuit', fee: 200, prize: 900, gates: 6 },
  drag: { id: 'drag', name: 'Dock Drag', fee: 100, prize: 400, gates: 2 },
};

export function makeStreetRaces() {
  return {
    active: null, // { id, gate, startTime } or null
    won: 0,
    best: {}, // race id -> best seconds
  };
}

// Start a race: pay the fee, arm the gates, return true. Fails when the
// player is already racing or cannot pay.
export function startRace(g, id) {
  const def = RACE_DEFS[id];
  if (!def || g.streetRaces.active) return false;
  if (g.player.cash < def.fee) return false;
  g.player.cash -= def.fee;
  g.streetRaces.active = { id, gate: 0, startTime: g.time };
  return true;
}

// Abandon the running race. The fee is gone; the win count is untouched.
export function abandonRace(g) {
  if (!g.streetRaces.active) return false;
  g.streetRaces.active = null;
  return true;
}

// The gates for the active race, from the city layout.
export function activeGates(g) {
  const a = g.streetRaces.active;
  if (!a) return [];
  return g.city.gateRoutes[a.id] || [];
}

// Called every frame while a race runs: when the car is inside the
// current gate, count it. When the last gate falls, pay the prize, bank
// the win and the best time, and close the race.
export function updateRace(g) {
  const a = g.streetRaces.active;
  if (!a) return;
  const def = RACE_DEFS[a.id];
  const gates = activeGates(g);
  const car = g.car;
  if (!car || !gates.length) return;
  const gate = gates[Math.min(a.gate, gates.length - 1)];
  const dx = car.x - gate.x;
  const dz = car.z - gate.z;
  if (dx * dx + dz * dz < 14 * 14) {
    a.gate += 1;
    g.hud.toast = `Gate ${a.gate}/${gates.length}`;
    g.hud.toastT = 1.2;
  }
  if (a.gate >= gates.length) {
    const elapsed = g.time - a.startTime;
    g.player.cash += def.prize;
    g.streetRaces.won += 1;
    g.stats.racesWon += 1;
    if (!g.streetRaces.best[a.id] || elapsed < g.streetRaces.best[a.id]) {
      g.streetRaces.best[a.id] = Math.round(elapsed * 10) / 10;
    }
    g.streetRaces.active = null;
    g.hud.toast = `${def.name} won! +$${def.prize}`;
    g.hud.toastT = 3;
  }
}
