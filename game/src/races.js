// Solmar street race series, v5. Three illegal events run on the city
// streets after the shops close. The player pays the entry fee, drives the
// gates in order against the clock, and takes the prize if the finish line
// is crossed. Best times are kept per event so a record can be chased. The
// race itself is only a clock and a gate counter here: the caller owns the
// car, the road and the timer, and asks this module whether a gate counts
// and what the finish is worth.

/** The city places that hold the series gates, in race order. A race runs
 * its gates in this order, starting at the first one. */
export const RACE_GATE_KEYS = ['gate1', 'gate2', 'gate3', 'gate4', 'gate5', 'gate6'];

export const RACE_CARDS = [
  {
    id: 'sprint',
    name: 'Marina Sprint',
    blurb: 'Four gates down the marina straight, flat out.',
    fee: 150,
    prize: 600,
    gates: 4,
    parMillis: 90000,
  },
  {
    id: 'circuit',
    name: 'Strip Circuit',
    blurb: 'Six gates looping Palm Strip and back past the neon.',
    fee: 300,
    prize: 1200,
    gates: 6,
    parMillis: 150000,
  },
  {
    id: 'drag',
    name: 'Portside Drag',
    blurb: 'Two gates, one straight, no mercy at the lights.',
    fee: 100,
    prize: 400,
    gates: 2,
    parMillis: 30000,
  },
];

export function newRaces() {
  return {
    best: {},
    won: 0,
    entered: 0,
    running: null,
  };
}

export function raceById(raceId) {
  for (const card of RACE_CARDS) {
    if (card.id === raceId) return card;
  }
  return null;
}

export function raceRunning(races) {
  return races && races.running ? races.running : null;
}

export function raceBestMillis(races, raceId) {
  if (!races || !races.best) return null;
  const best = races.best[raceId];
  return typeof best === 'number' ? best : null;
}

export function racesWonCount(races) {
  return races ? races.won || 0 : 0;
}

export function racesEnteredCount(races) {
  return races ? races.entered || 0 : 0;
}

/** The next event in the rotation: Sprint, Circuit, Drag, then round again. */
export function nextRaceCard(races) {
  const entered = racesEnteredCount(races);
  return RACE_CARDS[entered % RACE_CARDS.length];
}

export function startRace(races, raceId, cash) {
  const card = raceById(raceId);
  if (!card) return { ok: false, cash, reason: 'no-such-race' };
  if (raceRunning(races)) {
    return { ok: false, cash, reason: 'already-racing' };
  }
  if (typeof cash !== 'number' || cash < card.fee) {
    return { ok: false, cash, reason: 'not-enough-cash' };
  }
  races.entered += 1;
  races.running = {
    raceId: card.id,
    gate: 0,
    startedAt: Date.now(),
    feePaid: card.fee,
  };
  return { ok: true, cash: cash - card.fee, reason: 'started', card };
}

export function raceGatePassed(races) {
  const running = raceRunning(races);
  if (!running) return { ok: false, reason: 'not-racing' };
  const card = raceById(running.raceId);
  running.gate += 1;
  const done = running.gate >= card.gates;
  return { ok: true, gate: running.gate, total: card.gates, done };
}

export function finishRace(races, millis) {
  const running = raceRunning(races);
  if (!running) return { ok: false, reason: 'not-racing' };
  const card = raceById(running.raceId);
  const elapsed = typeof millis === 'number' ? millis : Date.now() - running.startedAt;
  const previousBest = raceBestMillis(races, card.id);
  const isRecord = previousBest === null || elapsed < previousBest;
  if (isRecord) races.best[card.id] = elapsed;
  races.won += 1;
  races.running = null;
  const underPar = elapsed <= card.parMillis;
  const prize = underPar ? card.prize : Math.round(card.prize / 2);
  return {
    ok: true,
    raceId: card.id,
    millis: elapsed,
    prize,
    isRecord,
    underPar,
    best: races.best[card.id],
  };
}

export function abandonRace(races) {
  if (!raceRunning(races)) return false;
  races.running = null;
  return true;
}

export function racePrizePreview(races, raceId) {
  const card = raceById(raceId);
  if (!card) return null;
  const best = raceBestMillis(races, raceId);
  return {
    fee: card.fee,
    prize: card.prize,
    gates: card.gates,
    parMillis: card.parMillis,
    best,
  };
}

export function serializeRaces(races) {
  return {
    best: races && races.best ? JSON.parse(JSON.stringify(races.best)) : {},
    won: races ? races.won || 0 : 0,
    entered: races ? races.entered || 0 : 0,
    running: null,
  };
}

export function restoreRaces(saved) {
  const races = newRaces();
  if (!saved || typeof saved !== 'object') return races;
  if (saved.best && typeof saved.best === 'object') {
    for (const raceId of Object.keys(saved.best)) {
      if (!raceById(raceId)) continue;
      const millis = saved.best[raceId];
      if (typeof millis === 'number' && millis > 0) races.best[raceId] = millis;
    }
  }
  races.won = Math.max(0, saved.won | 0);
  races.entered = Math.max(0, saved.entered | 0);
  return races;
}
