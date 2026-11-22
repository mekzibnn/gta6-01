// Solmar Heat v7 — the weather.
// The sky rolls a new cycle every minute or three: mostly clear, sometimes
// cloud, sometimes rain. Rain is not just mood — the street series pays
// a bonus when the tarmac is wet.

export function initWeather(dice) {
  return { kind: 'clear', timer: 90 + dice.next() * 60, rain: 0 };
}

export function tickWeather(weather, dt, dice) {
  weather.timer -= dt;
  if (weather.timer <= 0) {
    const roll = dice.next();
    if (roll < 0.6) weather.kind = 'clear';
    else if (roll < 0.82) weather.kind = 'cloud';
    else weather.kind = 'rain';
    weather.timer = 60 + dice.next() * 120;
  }
  const target = weather.kind === 'rain' ? 1 : 0;
  weather.rain += (target - weather.rain) * Math.min(1, dt * 0.5);
}

export function isRaining(weather) {
  return weather.kind === 'rain';
}

export function rainBonus(weather) {
  return isRaining(weather) ? 1.5 : 1;
}
