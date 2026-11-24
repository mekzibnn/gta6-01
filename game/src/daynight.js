// Solmar Heat v12 — day/night clock: 1 game hour = 60 real seconds.
export function updateClock(g, dt) {
  g.clock.hour += dt / 60;
  if (g.clock.hour >= 24) g.clock.hour -= 24;
  const night = g.clock.hour >= 20 || g.clock.hour < 6;
  g.clock.isNight = night;
  const target = night ? 1 : 0;
  g.clock.lampGlow += Math.max(-2 * dt, Math.min(2 * dt, target - g.clock.lampGlow));
}

export function clockLabel(g) {
  const h = Math.floor(g.clock.hour);
  const m = Math.floor((g.clock.hour - h) * 60);
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const phase = g.clock.hour >= 17 && g.clock.hour < 20 ? 'GOLDEN HOUR' : g.clock.isNight ? 'NIGHT' : 'DAY';
  return `${hh}:${mm} · ${phase}`;
}
