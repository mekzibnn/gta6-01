// Solmar Heat v12 — pedestrians: sidewalk routes, panic that spreads.
export function spawnPeds(g) {
  const peds = [];
  for (let i = 0; i < 50; i += 1) {
    const bx = g.rng.pick([-187, -112, -37, 37, 112, 187]);
    const bz = g.rng.pick([-187, -112, -37, 37, 112, 187]);
    const route = [];
    for (let k = 0; k < 4; k += 1) {
      route.push({ x: bx + g.rng.range(-20, 20), z: bz + g.rng.range(-20, 20) });
    }
    peds.push({
      x: route[0].x, z: route[0].z, route, ri: 1,
      state: 'walk', panic: 0, speed: g.rng.range(1.2, 2.2),
      color: g.rng.pick([0xd94f3d, 0x3d7bd9, 0x4caf50, 0xe8e8e8, 0xf2b705, 0x7a5c9e]),
    });
  }
  return peds;
}

export function updatePeds(g, dt) {
  const peds = g.peds;
  for (const p of peds) {
    if (p.panic > 0) {
      p.state = 'flee';
      p.panic = Math.max(0, p.panic - dt * 0.25);
      // Run away from the player.
      const dx = p.x - g.player.x, dz = p.z - g.player.z;
      const d = Math.hypot(dx, dz) || 1;
      p.x += (dx / d) * p.speed * 2.6 * dt;
      p.z += (dz / d) * p.speed * 2.6 * dt;
    } else {
      const t = p.route[p.ri];
      const dx = t.x - p.x, dz = t.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 2) { p.ri = (p.ri + 1) % p.route.length; continue; }
      p.x += (dx / d) * p.speed * dt;
      p.z += (dz / d) * p.speed * dt;
    }
    // Panic spreads to neighbours.
    if (p.panic > 0.5) {
      for (const o of peds) {
        if (o === p || o.panic > 0) continue;
        if (Math.hypot(o.x - p.x, o.z - p.z) < 10) o.panic = 1.5;
      }
    }
  }
}
