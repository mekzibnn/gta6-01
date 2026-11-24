// Solmar Heat v12 — stats: distance, time, counts.
export function updateStats(g, dt) {
  g.stats.timePlayed += dt;
  const sp = g.car ? Math.abs(g.car.speed) : 0;
  g.stats.distanceKm += (sp * dt) / 1000;
}
