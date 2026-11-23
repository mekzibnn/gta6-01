// Pedestrians — sidewalk routes, panic that spreads down the street.
const SHIRTS = [0xe63946, 0xf4a261, 0x2a9d8f, 0xe9c46a, 0x9b5de5, 0xffffff, 0x4361ee, 0xef476f];

export function makePeds(g) {
  const peds = [];
  const routes = [];
  for (const x of g.city.avenues) {
    routes.push({ axis: 'x', at: x });
  }
  for (const z of g.city.streets) {
    routes.push({ axis: 'z', at: z });
  }
  for (let i = 0; i < 48; i += 1) {
    const road = g.rng.pick(routes);
    const pts = [];
    const n = 4;
    for (let k = 0; k < n; k += 1) {
      const along = g.rng.range(-160, 160);
      pts.push(road.axis === 'x'
        ? { x: road.at + 8, z: along }
        : { x: along, z: road.at + 8 });
    }
    peds.push({
      x: pts[0].x, z: pts[0].z, heading: 0,
      speed: g.rng.range(1.1, 2.1),
      route: pts, wp: 1,
      state: 'walk', panic: 0,
      color: g.rng.pick(SHIRTS),
    });
  }
  return peds;
}

export function tickPeds(g, dt) {
  const peds = g.peds;
  // A fresh blast sends the street running.
  for (const b of g.booms) {
    if (b.t > 0.5) continue;
    for (const p of peds) {
      if (Math.hypot(p.x - b.x, p.z - b.z) < 30) { p.panic = 2; p.state = 'flee'; }
    }
  }
  for (const p of peds) {
    if (p.panic > 0) {
      p.state = 'flee';
      const dx = p.x - g.player.x, dz = p.z - g.player.z;
      const d = Math.hypot(dx, dz) || 1;
      p.x += (dx / d) * 4 * dt;
      p.z += (dz / d) * 4 * dt;
      p.heading = Math.atan2(dx / d, dz / d);
      p.panic = Math.max(0, p.panic - dt * 0.25);
      if (p.panic === 0) p.state = 'walk';
      continue;
    }
    const target = p.route[p.wp];
    const dx = target.x - p.x, dz = target.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d < 1.5) {
      p.wp = (p.wp + 1) % p.route.length;
      continue;
    }
    p.x += (dx / d) * p.speed * dt;
    p.z += (dz / d) * p.speed * dt;
    p.heading = Math.atan2(dx / d, dz / d);
  }
  // Panic spreads to neighbours on the same sidewalk.
  for (const p of peds) {
    if (p.panic <= 0) continue;
    for (const q of peds) {
      if (q === p || q.panic > 0) continue;
      if (Math.hypot(q.x - p.x, q.z - p.z) < 12) { q.panic = 1; q.state = 'flee'; }
    }
  }
}
