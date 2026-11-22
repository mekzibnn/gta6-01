// Solmar Heat v9 — the weather.
// The sky rolls a fresh cycle every minute or three. Most of the time it
// stays clear; sometimes cloud moves in; sometimes it rains. Rain is not
// just atmosphere — the street series pays a bonus when the tarmac is wet.

const ROLL = [
  { upTo: 0.6, kind: 'clear' },
  { upTo: 0.82, kind: 'cloud' },
  { upTo: 1.01, kind: 'rain' },
];

function pickKind(dice) {
  const roll = dice.next();
  for (const row of ROLL) {
    if (roll < row.upTo) return row.kind;
  }
  return 'clear';
}

export function initWeather(dice) {
  return { kind: 'clear', timer: 90 + dice.next() * 60, rain: 0 };
}

export function tickWeather(weather, dt, dice) {
  weather.timer -= dt;
  if (weather.timer <= 0) {
    weather.kind = pickKind(dice);
    weather.timer = 60 + dice.next() * 120;
  }
  const wet = weather.kind === 'rain' ? 1 : 0;
  weather.rain += (wet - weather.rain) * Math.min(1, dt * 0.5);
}

export function isRaining(weather) {
  return weather.kind === 'rain';
}

export function rainBonus(weather) {
  return isRaining(weather) ? 1.5 : 1;
}
