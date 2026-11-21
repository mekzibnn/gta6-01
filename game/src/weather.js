// The weather of Solmar, v3. A slow cycle the city lives under: clear
// skies, a grey overcast, a rain shower, then clear again. Rain changes
// how the city feels — the sky darkens, the fog closes in, the drops fall
// around the camera — and the HUD says so. The cycle runs on its own
// clock (seconds of play), starting clear, so the screenshot scenes,
// which only play a few seconds, always stage under a clear sky.
//
// The weather is deliberately visual-only: it never changes a mission
// timer, a price, or a car's grip, so no race or job can be blamed on
// the rain. What it changes is the light, and the mood.
export const WEATHER = {
  clear: { label: 'Clear skies', rain: 0, fogFar: 5200, skyDark: 0 },
  overcast: { label: 'Overcast', rain: 0, fogFar: 4600, skyDark: 0.25 },
  rain: { label: 'Rain', rain: 1, fogFar: 3600, skyDark: 0.45 },
};

/** The cycle, in order, with how long each kind of sky lasts (seconds). */
export const WEATHER_CYCLE = [
  { kind: 'clear', seconds: 80 },
  { kind: 'overcast', seconds: 30 },
  { kind: 'rain', seconds: 40 },
  { kind: 'overcast', seconds: 20 },
];

/** A fresh weather state: clear skies, the first change 80 seconds in. */
export function createWeather() {
  return {
    kind: 'clear',
    index: 0,
    elapsed: 0,
    until: WEATHER_CYCLE[0].seconds,
    changes: 0,
    // Lightning: 1 on a strike, decaying to 0 — the renderer flashes it.
    flash: 0,
  };
}

/**
 * Step the weather forward. Returns null while the sky holds, { kind }
 * when it changes, or { lightning: true } when a strike lands during a
 * shower. The caller toasts a change and thunders on a strike.
 */
export function stepWeather(weather, dt) {
  weather.elapsed += dt;
  // A strike fades fast: the flash is gone in under a second.
  if (weather.flash > 0) weather.flash = Math.max(0, weather.flash - dt * 1.4);
  if (weather.elapsed < weather.until) {
    // Lightning only in the rain, about once every twelve seconds.
    if (weather.kind === 'rain' && Math.random() < dt * 0.08) {
      weather.flash = 1;
      return { lightning: true };
    }
    return null;
  }
  weather.elapsed = 0;
  weather.index = (weather.index + 1) % WEATHER_CYCLE.length;
  weather.kind = WEATHER_CYCLE[weather.index].kind;
  weather.until = WEATHER_CYCLE[weather.index].seconds;
  weather.changes += 1;
  return { kind: weather.kind };
}

/** The spec for a kind of sky (rain, fog, darkness). */
export function weatherSpec(kind) {
  return WEATHER[kind] || WEATHER.clear;
}

/** How much of the sky's darkness the weather adds (0 clear, 0.45 rain). */
export function weatherDarkness(weather) {
  return weatherSpec(weather.kind).skyDark;
}

/** The rain's strength right now: 0 dry, 1 pouring. */
export function weatherRain(weather) {
  return weatherSpec(weather.kind).rain;
}

/** The rain bonus for the street series: a wet race pays a quarter more,
 * for the driver willing to run the gates in the rain. */
export function raceRainBonus(weather) {
  return weather && weather.kind === 'rain' ? 1.25 : 1;
}

/** How far the fog reaches under this sky, in world units. */
export function weatherFogFar(weather) {
  return weatherSpec(weather.kind).fogFar;
}

/** The HUD line for the current sky, or '' while it is clear. */
export function weatherLine(weather) {
  if (!weather || weather.kind === 'clear') return '';
  return WEATHER[weather.kind].label;
}

/** What each sky means for the driver, in one line for the toast. */
export const WEATHER_TIPS = {
  clear: 'Clear skies — the city is yours',
  overcast: 'Overcast — the light goes flat, the streets stay fast',
  rain: 'Rain — the streets shine, drive steady',
};

/** The tip for a kind of sky. */
export function weatherTip(kind) {
  return WEATHER_TIPS[kind] || WEATHER_TIPS.clear;
}

/** How many times the sky has changed since the game began. */
export function weatherChanges(weather) {
  return weather ? weather.changes : 0;
}

/**
 * A forecast: the next three kinds of sky and when each arrives, for the
 * pause screen or the dossier. Purely informational — the cycle is
 * fixed, so the forecast never lies.
 */
export function weatherForecast(weather) {
  const out = [];
  let index = weather.index;
  let wait = Math.max(0, Math.ceil(weather.until - weather.elapsed));
  for (let i = 0; i < 3; i += 1) {
    index = (index + 1) % WEATHER_CYCLE.length;
    out.push({ kind: WEATHER_CYCLE[index].kind, inSeconds: wait });
    wait += WEATHER_CYCLE[index].seconds;
  }
  return out;
}
