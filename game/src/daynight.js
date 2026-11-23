// Day / night clock — derived straight from the hour so a jump in time
// (or a test setting the hour) settles immediately, no slow lerp.
export const DAY_SECONDS = 720; // one full game day = 12 real minutes

export function makeClock(startHour) {
  return { hour: startHour, isNight: false, lampGlow: 0, phase: 'GOLDEN HOUR' };
}
export function phaseName(hour) {
  if (hour >= 5.5 && hour < 8) return 'DAWN';
  if (hour >= 8 && hour < 17) return 'DAY';
  if (hour >= 17 && hour < 19.5) return 'GOLDEN HOUR';
  if (hour >= 19.5 || hour < 5.5) return 'NIGHT';
  return 'DAY';
}
export function tickClock(g, dt) {
  const c = g.clock;
  c.hour = (c.hour + (dt * 24) / DAY_SECONDS) % 24;
  c.phase = phaseName(c.hour);
  c.isNight = c.hour >= 19.5 || c.hour < 5.5;
  let glow = 0;
  if (c.hour >= 18.5 && c.hour < 19.5) glow = (c.hour - 18.5);
  else if (c.hour >= 19.5 || c.hour < 5) glow = 1;
  else if (c.hour >= 5 && c.hour < 6) glow = 1 - (c.hour - 5);
  c.lampGlow = Math.max(0, Math.min(1, glow));
}
export function sunHeight(hour) {
  // Golden hour hangs low (120), midday rides high (170), night hides it.
  if (hour >= 19.5 || hour < 5.5) return -40;
  if (hour >= 17 && hour < 19.5) return 120;
  if (hour >= 8 && hour < 17) return 170;
  return 100;
}
export function clockText(hour) {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour % 1) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
