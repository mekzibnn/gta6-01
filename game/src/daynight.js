// The day/night clock for Solmar Heat. No dependencies.
// One game hour lasts 120 real seconds. Night is 19:30 to 05:30; the lamps
// fade in over the hour either side of dusk and dawn.

export function makeClock(hour = 18) {
  const clock = { hour, isNight: false, lampGlow: 0 };
  updateClock(clock, 0);
  return clock;
}

// Recompute the derived flags from the hour. Call after setting hour by hand.
export function refreshClock(clock) {
  updateClock(clock, 0);
}

export function updateClock(clock, dt) {
  clock.hour = (clock.hour + dt / 120) % 24;
  const h = clock.hour;
  clock.isNight = h >= 19.5 || h < 5.5;
  // Lamp glow ramps in 18:30-19:30 and out 05:30-06:30, full at night.
  if (h >= 19.5 || h < 5.5) {
    clock.lampGlow = 1;
  } else if (h >= 18.5 && h < 19.5) {
    clock.lampGlow = (h - 18.5) / 1;
  } else if (h >= 5.5 && h < 6.5) {
    clock.lampGlow = 1 - (h - 5.5) / 1;
  } else {
    clock.lampGlow = 0;
  }
}

// Golden hour is the game's look: late afternoon, low warm sun.
export function isGoldenHour(clock) {
  return clock.hour >= 17 && clock.hour < 19.5;
}

// A short clock label, "18:00".
export function clockLabel(clock) {
  const h = Math.floor(clock.hour);
  const m = Math.floor((clock.hour - h) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// "GOLDEN HOUR", "NIGHT" or "DAY".
export function timeOfDayLabel(clock) {
  if (clock.isNight) return 'NIGHT';
  if (isGoldenHour(clock)) return 'GOLDEN HOUR';
  return 'DAY';
}
