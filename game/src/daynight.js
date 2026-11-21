// pays: night fares are worth half as much again, and the streets empty
// out after dark while the heat gets harder to shake.
//
// The clock is minutes since midnight. It advances with the game (half a
// game-minute per real second at the default pace), so a full day takes
// about 48 minutes of play — long enough to feel, short enough to see.
import { DAYNIGHT } from './config.js';

/**
 * The six watches of a Solmar day. `from`/`to` are hours; the list covers
 * 0-24 without gaps, and the night watch appears twice (either side of
 * midnight) so a lookup never has to wrap.
 */
export const PHASES = [
  { key: 'night', name: 'Night', from: 0, to: 5.5, sky: 'dark', lamps: 1 },
  { key: 'dawn', name: 'Dawn', from: 5.5, to: 7.5, sky: 'pale', lamps: 0.5 },
  { key: 'day', name: 'Day', from: 7.5, to: 16.5, sky: 'bright', lamps: 0 },
  { key: 'golden', name: 'Golden Hour', from: 16.5, to: 19.5, sky: 'gold', lamps: 0.25 },
  { key: 'dusk', name: 'Dusk', from: 19.5, to: 20.5, sky: 'ember', lamps: 0.75 },
  { key: 'night', name: 'Night', from: 20.5, to: 24, sky: 'dark', lamps: 1 },
];

/**
 * How dark the world is, as anchor points the cycle interpolates between:
 * full dark through the small hours, full light through the working day,
 * and a slow ramp across golden hour into dusk. The shape is the city's
 * own rhythm — the renderer reads the number, never the clock.
 */
const DARKNESS_ANCHORS = [
  [0, 1], [6, 1], [7.5, 0], [17.5, 0], [20.5, 1], [24, 1],
];

/** Hour of day (0-24) from a clock in minutes. */
export function hourOf(clockMinutes) {
  return ((clockMinutes / 60) % 24 + 24) % 24;
}

/** Club hours: the strip's late trade, 21:00 to 05:00, when the Neon
 * Palms Club earns double and the streets belong to the night crowd. */
export function isNightHour(hour) {
  return hour >= 21 || hour < 5;
}

/** The phase the clock is in right now. */
export function phaseAt(clockMinutes) {
  const hour = hourOf(clockMinutes);
  for (const phase of PHASES) {
    if (hour >= phase.from && hour < phase.to) return phase;
  }
  return PHASES[PHASES.length - 1];
}

/** Short clock text: "17:20", "03:05". */
export function clockText(clockMinutes) {
  const hour = Math.floor(hourOf(clockMinutes));
  const minutes = Math.floor(clockMinutes % 60);
  return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Darkness 0..1 for a clock reading, interpolated between the anchors.
 * 0 is a bright working day, 1 is the small hours; golden hour ramps
 * smoothly in between, which is what makes the sunset screenshots glow.
 */
export function nightFactorAt(clockMinutes) {
  const hour = hourOf(clockMinutes);
  for (let i = 0; i < DARKNESS_ANCHORS.length - 1; i += 1) {
    const [h0, v0] = DARKNESS_ANCHORS[i];
    const [h1, v1] = DARKNESS_ANCHORS[i + 1];
    if (hour >= h0 && hour <= h1) {
      if (h1 === h0) return v1;
      const t = (hour - h0) / (h1 - h0);
      return v0 + (v1 - v0) * t;
    }
  }
  return 1;
}

/** How hard the streetlamps glow, 0..1 — they warm up through dusk. */
export function lampGlowAt(clockMinutes) {
  return phaseAt(clockMinutes).lamps * (0.35 + 0.65 * nightFactorAt(clockMinutes));
}

/** Headlights come on once the dark sets in. */
export function headlightsOn(nightFactor) {
  return nightFactor > 0.15;
}

/** Night pays better: fares are worth half as much again after dark. */
export function nightPayMultiplier(nightFactor) {
  return nightFactor > 0.6 ? 1 + DAYNIGHT.nightFareBonus : 1;
}

/** Fresh day/night state for a new game, seeded from the starting clock. */
export function createDayNight(clockMinutes) {
  const phase = phaseAt(clockMinutes);
  return {
    clock: clockMinutes,
    phase: phase.key,
    phaseName: phase.name,
    nightFactor: nightFactorAt(clockMinutes),
    lampGlow: lampGlowAt(clockMinutes),
    timeScale: DAYNIGHT.timeScale,
    announced: phase.key,
  };
}

/** Rebuild the derived values after a load restores the clock. */
export function syncDayNight(daynight, clockMinutes) {
  daynight.clock = clockMinutes;
  const phase = phaseAt(clockMinutes);
  daynight.phase = phase.key;
  daynight.phaseName = phase.name;
  daynight.nightFactor = nightFactorAt(clockMinutes);
  daynight.lampGlow = lampGlowAt(clockMinutes);
  daynight.announced = phase.key;
  return daynight;
}

/** Toast lines for each watch change; the caller shows them. */
export const PHASE_TOASTS = {
  dawn: 'Dawn breaks over the marina — the city wakes up',
  day: 'Morning in Solmar — the streets fill up',
  golden: 'Golden hour on Palm Strip — drive it like you mean it',
  dusk: 'Dusk falls — headlights on, fares pay more',
  night: 'Night in Solmar — the lamps are lit and the heat sticks',
};

/**
 * Advance the cycle one step. The clock moves at the configured pace
 * (minutes of game time per real second); the phase, darkness and lamp
 * glow follow it. When the watch changes, the phase key is returned so the
 * caller can toast the moment (once per change, not every frame).
 */
export function stepDayNight(game, dt) {
  const daynight = game.daynight;
  if (!daynight) return null;
  game.clock += dt * daynight.timeScale;
  daynight.clock = game.clock;
  const phase = phaseAt(daynight.clock);
  daynight.phase = phase.key;
  daynight.phaseName = phase.name;
  daynight.nightFactor = nightFactorAt(daynight.clock);
  daynight.lampGlow = lampGlowAt(daynight.clock);
  if (daynight.announced !== phase.key) {
    daynight.announced = phase.key;
    return phase.key;
  }
  return null;
}

/**
 * A one-line read on the time of day, for the HUD chip: "GOLDEN HOUR ·
 * 17:20". The HUD draws the sun/moon glyph beside it.
 */
export function dayNightLine(daynight) {
  return `${daynight.phaseName.toUpperCase()} · ${clockText(daynight.clock)}`;
}

/** The moon's eight phases, one per game day, in order. */
export const MOON_PHASES = [
  'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
  'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
];

/** The moon's phase tonight, from the game day (one phase per day). */
export function moonPhaseFor(clock) {
  const day = Math.floor(clock / (24 * 60));
  return MOON_PHASES[((day % 8) + 8) % 8];
}

/**
 * The moon's angle across the sky, in radians: 0 at moonrise (18:00, low
 * in the east), PI/2 overhead at midnight, PI at moonset (06:00, low in
 * the west). Outside 18:00–06:00 the moon is below the horizon and the
 * angle is null.
 */
export function moonAngleFor(clock) {
  const hour = (clock / 60) % 24;
  if (hour >= 18) return ((hour - 18) / 12) * Math.PI;
  if (hour < 6) return ((hour + 6) / 12) * Math.PI;
  return null;
}
