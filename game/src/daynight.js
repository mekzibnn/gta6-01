// Solmar Heat v7 — the clock.
// One game hour lasts two real minutes, so a full day is a long drive.
// Night is 19:00 to 06:00; the lamps fade in across the golden hour and
// the club pays double once it is dark.

export function initClock(startHour) {
  const clock = { hour: startHour, isNight: false, lampGlow: 0, golden: false };
  refreshClock(clock);
  return clock;
}

function refreshClock(clock) {
  const h = clock.hour;
  clock.isNight = h >= 19 || h < 6;
  clock.golden = h >= 17.5 && h < 19;
  if (clock.isNight) clock.lampGlow = 1;
  else if (h >= 17 && h < 19) clock.lampGlow = (h - 17) / 2;
  else if (h >= 5 && h < 6) clock.lampGlow = 1 - (h - 5);
  else clock.lampGlow = 0;
}

export function tickClock(clock, dt, rate) {
  clock.hour += dt / (rate || 120);
  if (clock.hour >= 24) clock.hour -= 24;
  refreshClock(clock);
}

export function clockLabel(hour) {
  const h = Math.floor(hour) % 24;
  const m = Math.floor((hour % 1) * 60);
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function nightFareBoost(hour) {
  return hour >= 19 || hour < 6 ? 2 : 1;
}
