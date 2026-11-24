// Solmar Heat v12 — weather: clear / rain / fog cycles.
export function updateWeather(g, dt) {
  g.weather.timer -= dt;
  if (g.weather.timer <= 0) {
    const r = g.rng.next();
    g.weather.kind = r < 0.6 ? 'clear' : r < 0.85 ? 'rain' : 'fog';
    g.weather.timer = 60 + g.rng.next() * 60;
  }
}
