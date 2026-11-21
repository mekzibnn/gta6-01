// Career statistics, v3. The numbers a career leaves behind: how far Leo
// has driven, how fast, how much he has earned, how many jobs and races
// he has finished, how many shots found their mark, and how many times
// the SCPD hauled him in. The pause screen shows them, and the save file
// keeps them, so a career has a record to look back on.
//
// Stats are tracked, never estimated: every counter moves only when the
// event it counts actually happens in the loop.
export function createStats() {
  return {
    distanceKm: 0,
    topSpeedKmh: 0,
    moneyEarned: 0,
    missionsDone: 0,
    racesWon: 0,
    racesRun: 0,
    shotsHit: 0,
    busts: 0,
    timePlayed: 0,
    bestRaceSecs: null,
  };
}

/** The career's milestones: marks a player passes on the road. */
export const MILESTONES = [
  { id: 'first-km', test: (s) => s.distanceKm >= 1, text: 'First kilometre — the city is yours to learn' },
  { id: 'ten-km', test: (s) => s.distanceKm >= 10, text: '10 km driven — Road Warrior' },
  { id: 'first-job', test: (s) => s.missionsDone >= 1, text: 'First job done — Mara trusts you now' },
  { id: 'five-jobs', test: (s) => s.missionsDone >= 5, text: 'Five jobs done — Solmar regular' },
  { id: 'first-race', test: (s) => s.racesWon >= 1, text: 'First race won — the flag is yours' },
  { id: 'rich', test: (s) => s.moneyEarned >= 10000, text: '$10,000 earned — Solmar pays its debts' },
  { id: 'speed', test: (s) => s.topSpeedKmh >= 200, text: '200 km/h — the fastest thing in Solmar' },
];

/** The milestones this career has reached, as one-line texts. */
export function statsMilestones(stats) {
  if (!stats) return [];
  return MILESTONES.filter((m) => m.test(stats)).map((m) => m.text);
}

/** Keep a loaded stats block honest: numbers stay numbers, never NaN. */
export function sanitizeStats(saved) {
  const clean = createStats();
  if (!saved || typeof saved !== 'object') return clean;
  for (const key of Object.keys(clean)) {
    const value = saved[key];
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      clean[key] = value;
    }
  }
  return clean;
}

/** Driving: distance in kilometres, and the fastest speed ever reached. */
export function trackDrive(stats, car, dt) {
  if (!stats || !car) return;
  const kmh = Math.abs(car.speed || 0) * 0.36;
  stats.distanceKm += (kmh * dt) / 3600;
  if (kmh > stats.topSpeedKmh) stats.topSpeedKmh = Math.round(kmh);
}

/** Money earned from a fare, a race, or a job — the career's income. */
export function trackEarn(stats, amount) {
  if (!stats || !amount) return;
  stats.moneyEarned += amount;
}

/** A story mission finished. */
export function trackMission(stats) {
  if (!stats) return;
  stats.missionsDone += 1;
}

/** A street race run, won or lost. */
export function trackRace(stats, won) {
  if (!stats) return;
  stats.racesRun += 1;
  if (won) stats.racesWon += 1;
}

/** The fastest race ever run, kept to a tenth of a second. */
export function trackRaceBest(stats, secs) {
  if (!stats || !secs) return;
  if (stats.bestRaceSecs === null || secs < stats.bestRaceSecs) {
    stats.bestRaceSecs = Math.round(secs * 10) / 10;
  }
}

/** A shot that found its mark (a ped, a cop, or a car). */
export function trackHit(stats) {
  if (!stats) return;
  stats.shotsHit += 1;
}

/** Hauled in by the SCPD (or left for dead): the career's black mark. */
export function trackBust(stats) {
  if (!stats) return;
  stats.busts += 1;
}

/** Time on the street, in seconds — the career's own clock. */
export function trackTime(stats, dt) {
  if (!stats) return;
  stats.timePlayed += dt;
}

/** A career in one line, for the pause screen's footer. */
export function statsLine(stats) {
  if (!stats) return '';
  const hours = Math.floor(stats.timePlayed / 3600);
  const minutes = Math.floor((stats.timePlayed % 3600) / 60);
  const time = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  return `${stats.distanceKm.toFixed(1)} km driven · top ${stats.topSpeedKmh} km/h · $${stats.moneyEarned.toLocaleString('en-US')} earned · ${time} on the street`;
}

/** The full record, one row per line, for the pause screen. */
export function statsRows(stats) {
  if (!stats) return [];
  const s = stats;
  return [
    { label: 'Distance driven', value: `${s.distanceKm.toFixed(1)} km` },
    { label: 'Top speed', value: `${s.topSpeedKmh} km/h` },
    { label: 'Money earned', value: `$${s.moneyEarned.toLocaleString('en-US')}` },
    { label: 'Missions finished', value: `${s.missionsDone} / 10` },
    { label: 'Street races', value: `${s.racesWon} won / ${s.racesRun} run` },
    { label: 'Best race time', value: s.bestRaceSecs === null ? '—' : `${s.bestRaceSecs.toFixed(1)}s` },
    { label: 'Shots on target', value: `${s.shotsHit}` },
    { label: 'Times busted', value: `${s.busts}` },
    { label: 'Time on the street', value: `${Math.floor(s.timePlayed / 60)} min` },
  ];
}
