// Run statistics — distance driven, time on the street, counts.
export function makeStats() {
  return { distanceKm: 0, timePlayed: 0, stolen: 0, missions: 0, wrecks: 0, racesWon: 0 };
}
export function tickStats(g, dt) {
  g.stats.timePlayed += dt;
  const c = g.car;
  if (c && Math.abs(c.speed) > 0.5) g.stats.distanceKm += (Math.abs(c.speed) * dt) / 1000;
}
