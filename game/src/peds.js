// Pedestrians for Solmar Heat.
// Fifty people walking sidewalk routes around the city. A frightened ped
// spreads panic to the neighbours, and the street empties around a crime.

export function makePeds(game, rng) {
  const peds = [];
  for (let i = 0; i < 50; i += 1) {
    const route = [];
    const legs = 4;
    let x = rng.range(-180, 180);
    let z = rng.range(-180, 180);
    for (let j = 0; j < legs; j += 1) {
      // Waypoints stay on the road grid, a few steps off the centre line.
      const alongRoad = rng.chance(0.5);
      const lane = rng.pick([-208, -156, -104, -52, 0, 52, 104, 156, 208]);
      const pos = rng.range(-180, 180);
      const off = rng.pick([-8, 8]);
      if (alongRoad) route.push({ x: lane + off, z: pos });
      else route.push({ x: pos, z: lane + off });
    }
    peds.push({
      x,
      z,
      route,
      leg: 0,
      speed: rng.range(1.2, 1.9),
      state: 'walk',
      panic: 0,
      color: rng.pick([0x8a5a3c, 0x3c5a8a, 0x5a8a3c, 0x8a3c5a, 0xc2a878, 0x6a6a6a]),
    });
  }
  return peds;
}

export function updatePeds(game, dt) {
  const peds = game.peds;
  // Panic spreads to anyone close to a frightened ped.
  for (const p of peds) {
    if (p.panic <= 0) continue;
    for (const q of peds) {
      if (q === p) continue;
      const dx = q.x - p.x;
      const dz = q.z - p.z;
      if (dx * dx + dz * dz < 12 * 12) {
        q.panic = Math.max(q.panic, 1.5);
        q.state = 'flee';
      }
    }
  }
  for (const p of peds) {
    if (p.panic > 0) p.panic = Math.max(0, p.panic - dt * 0.4);
    if (p.panic <= 0 && p.state === 'flee') p.state = 'walk';
    const target = p.route[p.leg];
    if (!target) continue;
    const dx = target.x - p.x;
    const dz = target.z - p.z;
    const dist = Math.hypot(dx, dz);
    const speed = p.state === 'flee' ? p.speed * 2.4 : p.speed;
    if (dist < 1.5) {
      p.leg = (p.leg + 1) % p.route.length;
      continue;
    }
    p.x += (dx / dist) * speed * dt;
    p.z += (dz / dist) * speed * dt;
  }
}
