// Day and night in Solmar (v6 rewrite).
// One clock drives the whole city: the sun arcs, the sky warms at golden
// hour, the lamps come on at dusk and the streets empty after midnight.
// Night fares pay half as much again, the nightclub earns double after
// 21:00, and the heli's spotlight only matters once it is dark.

import { WORLD } from './config.js';

export function initClock(startHour) {
  const hour = typeof startHour === 'number' ? startHour : 17.3;
  return {
    hour,
    minute: Math.floor((hour % 1) * 60),
    lampGlow: 0,
    isNight: hour >= WORLD.duskHour || hour < WORLD.dawnHour,
    golden: false,
  };
}

export function tickClock(clock, dt) {
  // dt is real seconds; the day wraps every WORLD.daySeconds.
  const hoursPerSecond = 24 / WORLD.daySeconds;
  clock.hour += dt * hoursPerSecond;
  if (clock.hour >= 24) clock.hour -= 24;
  clock.minute = Math.floor((clock.hour % 1) * 60);
  clock.isNight = clock.hour >= WORLD.duskHour || clock.hour < WORLD.dawnHour;
  // Golden hour: the last hour before dusk.
  clock.golden = clock.hour >= WORLD.duskHour - 1 && clock.hour < WORLD.duskHour;
  // Lamps fade in across the dusk hour and out across the dawn hour.
  if (clock.isNight) {
    clock.lampGlow = Math.min(1, clock.lampGlow + dt * 0.5);
  } else {
    clock.lampGlow = Math.max(0, clock.lampGlow - dt * 0.5);
  }
  return clock;
}

export function clockLabel(clock) {
  const h = Math.floor(clock.hour);
  const m = clock.minute;
  const hh = String(h).padStart(2, '0');
  const mm = String(m).padStart(2, '0');
  return `${hh}:${mm}`;
}

export function skyMix(clock) {
  // 0 = noon, 1 = golden hour, 2 = night. The renderer blends by this.
  if (clock.isNight) return 2;
  if (clock.golden) return 1;
  return 0;
}

export function nightFareBoost(clock) {
  return clock.isNight ? 1.5 : 1;
}

export function isNightHour(hour) {
  return hour >= WORLD.duskHour || hour < WORLD.dawnHour;
}

export function hourToSeconds(hour) {
  return hour * 3600;
}
