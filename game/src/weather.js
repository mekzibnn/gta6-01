// The weather of Solmar (v6 rewrite).
// A slow cycle the city lives under: clear skies, drifting cloud, and rain
// that slicks the roads and pays a bonus on race prizes. The weather never
// changes mid-race — it rolls on its own timer, and the HUD shows what is
// coming next.

import { dicePick, diceRange } from './random.js';

export const KINDS = ['clear', 'cloud', 'rain'];

export function initWeather(dice) {
  return {
    kind: dicePick(dice, ['clear', 'clear', 'cloud', 'rain']),
    intensity: diceRange(dice, 0.2, 0.6),
    timer: diceRange(dice, 40, 90),
    next: 'clear',
  };
}

export function tickWeather(weather, dice, dt) {
  weather.timer -= dt;
  if (weather.timer > 0) return weather;
  // Roll the next kind; clear is the most common, rain the rarest.
  const roll = dice();
  if (roll < 0.55) weather.next = 'clear';
  else if (roll < 0.85) weather.next = 'cloud';
  else weather.next = 'rain';
  weather.kind = weather.next;
  weather.intensity = weather.kind === 'rain' ? diceRange(dice, 0.5, 1) : diceRange(dice, 0.1, 0.4);
  weather.timer = diceRange(dice, 45, 120);
  return weather;
}

export function isRaining(weather) {
  return weather.kind === 'rain';
}

export function rainBonus(weather) {
  return isRaining(weather) ? 1.25 : 1;
}

export function gripFactor(weather) {
  // Rain slicks the road: a little less grip, a little more slide.
  return isRaining(weather) ? 0.88 : 1;
}

export function weatherLabel(weather) {
  if (weather.kind === 'rain') return 'Rain';
  if (weather.kind === 'cloud') return 'Cloudy';
  return 'Clear';
}
