// Weather for Solmar Heat. No dependencies.
// A cycle lasts 30-90 seconds, then a fresh kind is rolled. The timer is
// the only moving part: the renderer reads `kind` for sky and rain.

export const WEATHER_KINDS = ['clear', 'cloudy', 'rain'];

export function makeWeather(rng) {
  return { kind: 'clear', timer: 60 + rng.range(0, 40) };
}

export function updateWeather(weather, dt, rng) {
  weather.timer -= dt;
  if (weather.timer <= 0) {
    weather.kind = rng.pick(WEATHER_KINDS);
    weather.timer = 30 + rng.range(0, 60);
  }
}

// A one-word label for the HUD.
export function weatherLabel(weather) {
  if (weather.kind === 'rain') return 'RAIN';
  if (weather.kind === 'cloudy') return 'CLOUDY';
  return 'CLEAR';
}
