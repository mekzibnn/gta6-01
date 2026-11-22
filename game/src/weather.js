// The weather. A cycle lasts a minute or two, then the sky rolls a fresh
// one. Clear is the common roll; overcast and rain show up often enough
// that the city never looks the same twice. The timer is the whole state
// the playtest leans on: forcing it near zero must start a fresh cycle
// with a long timer again.

export const WEATHER_KINDS = ['clear', 'overcast', 'rain'];

export function makeWeather(rng) {
  return {
    kind: 'clear',
    // Seconds left in this cycle. Starts long so the opening shot is a
    // clean golden-hour sky.
    timer: 90,
    rng,
  };
}

// Advance the weather by dt seconds. When the timer runs out, roll a new
// cycle: a fresh kind and a fresh timer of 60-120 seconds.
export function updateWeather(weather, dt) {
  weather.timer -= dt;
  if (weather.timer > 0) return;
  const roll = weather.rng.next();
  if (roll < 0.55) weather.kind = 'clear';
  else if (roll < 0.85) weather.kind = 'overcast';
  else weather.kind = 'rain';
  weather.timer = 60 + weather.rng.next() * 60;
}

// A short label for the HUD plate.
export function weatherLabel(weather) {
  return weather.kind.toUpperCase();
}
