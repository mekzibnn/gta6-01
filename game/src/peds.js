// The pedestrians. Forty-plus Solmar locals walk the sidewalks on fixed
// routes. When one of them panics, the panic spreads down the street:
// neighbours catch it and run. An explosion sends the whole block
// running.

export function makePeds(g) {
  const peds = [];
  const shirts = [0xd97b4f, 0x3f8f8a, 0xe0b56a, 0x5d7d99, 0xd99a8c, 0xf0c94a, 0xe07856, 0x7d8ea3];
  for (let i = 0; i < 48; i += 1) {
    // A route is a short walk along one sidewalk: two to four corners.
    const axis = g.rng.chance(0.5) ? 'x' : 'z';
    const line = g.rng.pick([-180, -120, -60, 0, 60, 120, 180]) + (g.rng.chance(0.5) ? 7 : -7);
    const start = g.rng.range(-170, 100);
    const route = [];
    const stops = 2 + g.rng.int(0, 2);
    for (let s = 0; s < stops; s += 1) {
      const along = start + s * g.rng.range(25, 60);
      route.push(axis === 'x' ? { x: line, z: Math.max(-195, Math.min(195, along)) } : { x: Math.max(-195, Math.min(195, along)), z: line });
    }
    peds.push({
      x: route[0].x,
      z: route[0].z,
      heading: g.rng.next() * Math.PI * 2,
      route,
      routeIdx: 1,
      state: 'walk',
      panic: 0,
      speed: g.rng.range(1.2, 2.0),
      color: g.rng.pick(shirts),
    });
  }
  return peds;
}

// Walk the routes, spread the panic. A fleeing ped runs from the spot
// that scared it; a calm one strolls to its next corner.
export function updatePeds(g, dt) {
  const peds = g.peds;
  // Panic spreads first: a fleeing ped with panic still hot scares its
  // neighbours inside twelve metres.
  for (const p of peds) {
    if (p.state !== 'flee' || p.panic <= 0) continue;
    for (const q of peds) {
      if (q === p || q.state === 'flee') continue;
      const dx = q.x - p.x;
      const dz = q.z - p.z;
      if (dx * dx + dz * dz < 144) {
        q.state = 'flee';
        q.panic = 1;
      }
    }
  }
  for (const p of peds) {
    if (p.panic > 0) p.panic = Math.max(0, p.panic - dt * 0.25);
    if (p.state === 'flee') {
      // Run away from the nearest threat: the player, a wreck, a boom.
      let tx = p.x;
      let tz = p.z;
      let best = Infinity;
      const threats = [{ x: g.player.x, z: g.player.z }];
      for (const w of g.wrecks) threats.push(w);
      for (const t of threats) {
        const dx = p.x - t.x;
        const dz = p.z - t.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < best) {
          best = d2;
          tx = t.x;
          tz = t.z;
        }
      }
      const dx = p.x - tx;
      const dz = p.z - tz;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      const run = 4.5;
      p.x += (dx / d) * run * dt;
      p.z += (dz / d) * run * dt;
      p.heading = Math.atan2(dx, dz);
      if (p.panic <= 0 && best > 900) p.state = 'walk';
      continue;
    }
    // Stroll to the next corner of the route, then loop it.
    const target = p.route[p.routeIdx % p.route.length];
    const dx = target.x - p.x;
    const dz = target.z - p.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < 1.5) {
      p.routeIdx += 1;
      continue;
    }
    p.x += (dx / d) * p.speed * dt;
    p.z += (dz / d) * p.speed * dt;
    p.heading = Math.atan2(dx, dz);
  }
}
