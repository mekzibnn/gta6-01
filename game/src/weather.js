// Weather — slow cycles; a finished cycle always rolls a fresh one with
// a long timer so the sky never flickers.
export function makeWeather(rng) {
  return { kind: 'clear', timer: 90, rng };
}
const KINDS = ['clear', 'clear', 'clear', 'cloudy', 'cloudy', 'haze', 'rain'];
export function tickWeather(g, dt) {
  const w = g.weather;
  w.timer -= dt;
  if (w.timer <= 0) {
    w.kind = w.rng.pick(KINDS);
    w.timer = 30 + w.rng.next() * 60;
  }
}
