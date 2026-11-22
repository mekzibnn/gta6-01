// Solmar Heat v9 — the clock.
// One game hour lasts two real minutes, so a full day is a long drive.
// The dark hours are 19:00 to 06:00. Lamps warm up across the golden
// hour, and the nightclub pays double once the sun is down.

const DARK_FROM = 19;
const DARK_TO = 6;
const GOLD_FROM = 17.5;
const LAMP_FROM = 17;
const DAWN_FROM = 5;

// Work out what the sky is doing at this hour: dark or not, golden or
// not, and how bright the lamps should glow (0 to 1).
function phaseOf(hour) {
  const dark = hour >= DARK_FROM || hour < DARK_TO;
  const golden = hour >= GOLD_FROM && hour < DARK_FROM;
  let glow = 0;
  if (dark) glow = 1;
  else if (hour >= LAMP_FROM && hour < DARK_FROM) glow = (hour - LAMP_FROM) / 2;
  else if (hour >= DAWN_FROM && hour < DARK_TO) glow = 1 - (hour - DAWN_FROM);
  return { dark, golden, glow };
}

export function initClock(startHour) {
  const clock = { hour: startHour, isNight: false, lampGlow: 0, golden: false };
  const ph = phaseOf(clock.hour);
  clock.isNight = ph.dark;
  clock.golden = ph.golden;
  clock.lampGlow = ph.glow;
  return clock;
}

export function tickClock(clock, dt, rate) {
  clock.hour += dt / (rate || 120);
  if (clock.hour >= 24) clock.hour -= 24;
  const ph = phaseOf(clock.hour);
  clock.isNight = ph.dark;
  clock.golden = ph.golden;
  clock.lampGlow = ph.glow;
}

export function clockLabel(hour) {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour % 1) * 60);
  const hh = h < 10 ? `0${h}` : `${h}`;
  const mm = m < 10 ? `0${m}` : `${m}`;
  return `${hh}:${mm}`;
}

export function nightFareBoost(hour) {
  return phaseOf(hour).dark ? 2 : 1;
}
