// The clock. Solmar starts at 18:00, golden hour, and the day rolls on
// from there. Night is 20:00 to 06:00. The lamp glow eases toward its
// target so dusk and dawn read as a fade, never a snap.

// One game hour lasts this many real seconds while the game runs.
export const SECONDS_PER_HOUR = 150;

export function makeClock() {
  return {
    hour: 18.0,
    isNight: false,
    lampGlow: 0,
    // How far through the golden hour we are, 0..1. The renderer tints
    // the sky with it: 1 at 18:00, fading to 0 by 20:00.
    golden: 1,
  };
}

// Advance the clock by dt real seconds and recompute the derived values.
export function updateClock(clock, dt) {
  clock.hour += dt / SECONDS_PER_HOUR;
  if (clock.hour >= 24) clock.hour -= 24;
  const h = clock.hour;
  clock.isNight = h >= 20 || h < 6;
  const target = clock.isNight ? 1 : 0;
  // Ease the lamps: about a second to settle, so a jump to 22:40 reads
  // as night falling instead of a cut.
  clock.lampGlow += (target - clock.lampGlow) * Math.min(1, dt * 2.2);
  if (clock.lampGlow < 0.02 && target === 0) clock.lampGlow = 0;
  if (clock.lampGlow > 0.98 && target === 1) clock.lampGlow = 1;
  // Golden hour peaks at 18:00 and is gone by 20:00; it also warms up
  // from 16:30. Outside that window the sky is plain day or night.
  if (h >= 16.5 && h < 20) clock.golden = h < 18 ? (h - 16.5) / 1.5 : 1 - (h - 18) / 2;
  else clock.golden = 0;
}

// A short label for the HUD plate: "18:00 · GOLDEN HOUR · CLEAR".
export function clockLabel(clock) {
  const h = Math.floor(clock.hour);
  const m = Math.floor((clock.hour - h) * 60);
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  const phase = clock.isNight ? 'NIGHT' : clock.golden > 0.35 ? 'GOLDEN HOUR' : 'DAY';
  return `${hh}:${mm} · ${phase}`;
}
