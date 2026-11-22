// Solmar Heat v7 — the crowd.
// Pedestrians walk the sidewalks on fixed routes. They are not decoration:
// a chase, a gunshot, or a car bomb sends them running, and panic is
// contagious — one fleeing walker sets off everyone near them. Shoppers
// linger by the storefronts, which is how the city feels inhabited.

export function initCrowd(dice, city, count) {
  const peds = [];
  for (let i = 0; i < count; i += 1) {
    const avenue = dice.pick([-180, -120, -60, 0, 60, 120, 180]);
    const street = dice.pick([-180, -120, -60, 0, 60, 120, 180]);
    const vertical = dice.chance(0.5);
    const x = vertical ? avenue + dice.pick([-9, 9]) : dice.range(-180, 180);
    const z = vertical ? dice.range(-180, 180) : street + dice.pick([-9, 9]);
    const ped = {
      x, z,
      heading: 0,
      speed: 0,
      state: 'walk',
      panic: 0,
      route: [],
      routeAt: 0,
      color: dice.pick([0xd94f4f, 0x4f7ad9, 0x4fd97a, 0xd9c24f, 0x9a4fd9, 0xe8e8e8]),
    };
    const along = vertical ? 'z' : 'x';
    const fixed = vertical ? x : z;
    const stops = [];
    for (let k = 0; k < 4; k += 1) {
      const at = dice.range(-180, 180);
      stops.push(along === 'z' ? { x: fixed, z: at } : { x: at, z: fixed });
    }
    ped.route = stops;
    ped.routeAt = dice.int(0, 3);
    peds.push(ped);
  }
  return peds;
}

export function tickCrowd(peds, world, dt) {
  for (const ped of peds) {
    if (ped.state === 'flee') {
      ped.panic = Math.max(0, ped.panic - dt * 0.4);
      if (ped.panic <= 0) ped.state = 'walk';
      const dx = ped.x - world.player.x;
      const dz = ped.z - world.player.z;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      ped.x += (dx / d) * 9 * dt;
      ped.z += (dz / d) * 9 * dt;
      ped.heading = Math.atan2(dx / d, dz / d);
      // Panic spreads: a fleeing walker sets off everyone close by.
      for (const other of peds) {
        if (other === ped || other.state === 'flee') continue;
        const ox = other.x - ped.x;
        const oz = other.z - ped.z;
        if (ox * ox + oz * oz < 144) {
          other.state = 'flee';
          other.panic = 2;
        }
      }
      continue;
    }
    if (!ped.route || ped.route.length === 0) continue;
    const target = ped.route[ped.routeAt % ped.route.length];
    const dx = target.x - ped.x;
    const dz = target.z - ped.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < 1.5) {
      ped.routeAt += 1;
      continue;
    }
    ped.x += (dx / dist) * 2.2 * dt;
    ped.z += (dz / dist) * 2.2 * dt;
    ped.heading = Math.atan2(dx / dist, dz / dist);
    ped.speed = 2.2;
  }
}

export function crowdNear(peds, x, z, radius) {
  let n = 0;
  for (const ped of peds) {
    const dx = ped.x - x;
    const dz = ped.z - z;
    if (dx * dx + dz * dz < radius * radius) n += 1;
  }
  return n;
}

export function crowdOnRoute(peds) {
  return peds.filter((p) => p.route && p.route.length > 1).length;
}

export function scareCrowd(peds, x, z, radius) {
  for (const ped of peds) {
    const dx = ped.x - x;
    const dz = ped.z - z;
    if (dx * dx + dz * dz < radius * radius) {
      ped.state = 'flee';
      ped.panic = 2;
    }
  }
}

export function shopperSpots(dice, city) {
  const spots = [];
  const keys = ['gunStore', 'diner', 'laundry', 'carWash'];
  for (const key of keys) {
    const s = city.spots[key];
    if (!s) continue;
    for (let i = 0; i < 3; i += 1) {
      spots.push({ x: s.x + dice.range(-8, 8), z: s.z + dice.range(-8, 8) });
    }
  }
  return spots;
}

export function tickShoppers(shoppers, world, dt) {
  for (const shopper of shoppers) {
    shopper.t = (shopper.t || 0) + dt;
    if (shopper.t > 6) {
      shopper.t = 0;
      shopper.x += (Math.random() - 0.5) * 4;
      shopper.z += (Math.random() - 0.5) * 4;
    }
  }
}
