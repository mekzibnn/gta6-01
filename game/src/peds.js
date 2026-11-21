// The crowd — pedestrians on the sidewalks (v6 rewrite).
// Solmar's streets are alive because people walk them: strollers on the
// sidewalk loops, shoppers paused at storefront windows, and everyone
// scattering when a siren or a gunshot passes. The crowd is a flat list the
// renderer draws and the game logic scares; main.js owns the tick.

import { spawnWalker, advanceWalker, scareWalkers } from './actors.js';
import { makeDice, dicePick } from './random.js';
import { WORLD } from './config.js';

export function initCrowd(dice, city, count) {
  const crowd = [];
  for (let i = 0; i < count; i += 1) {
    crowd.push(spawnWalker(dice, city));
  }
  return crowd;
}

export function tickCrowd(crowd, player, dt) {
  for (const w of crowd) {
    advanceWalker(w, dt);
    // Panic spreads: a fleeing ped scares the neighbours around them.
    if (w.state === 'flee') {
      for (const other of crowd) {
        if (other === w || other.state === 'flee') continue;
        const dx = other.x - w.x;
        const dz = other.z - w.z;
        if (dx * dx + dz * dz < 12 * 12) {
          other.state = 'flee';
          other.panic = 2;
        }
      }
    }
    // A walker that fled far off its route gets a fresh loop near the player.
    if (Math.abs(w.x) > WORLD.halfSize - 4 || Math.abs(w.z) > WORLD.halfSize - 4) {
      const fresh = spawnWalker(makeDice((Math.random() * 1e9) | 0), { avenues: [-88, 0, 88], streets: [-88, 0, 88] });
      w.x = fresh.x;
      w.z = fresh.z;
      w.route = fresh.route;
      w.leg = 0;
      w.state = 'stroll';
    }
  }
  return crowd;
}

export function crowdNear(crowd, x, z, radius) {
  let n = 0;
  for (const w of crowd) {
    const dx = w.x - x;
    const dz = w.z - z;
    if (dx * dx + dz * dz < radius * radius) n += 1;
  }
  return n;
}

export function crowdOnRoute(crowd) {
  return crowd.filter((w) => w.route && w.route.length > 1).length;
}

export function scareCrowd(crowd, x, z, radius) {
  return scareWalkers(crowd, x, z, radius);
}

export function shopperSpots(dice, city) {
  // Window-shoppers linger outside the four businesses and the garage.
  const fronts = [
    city.spots.laundry,
    city.spots.carWash,
    city.spots.taxiOffice,
    city.spots.nightclub,
    city.spots.garage,
  ];
  const shoppers = [];
  for (const front of fronts) {
    const n = 2 + Math.floor(dice() * 2);
    for (let i = 0; i < n; i += 1) {
      shoppers.push({
        kind: 'shopper',
        x: front.x + (dice() * 2 - 1) * 10,
        z: front.z + (dice() * 2 - 1) * 10,
        heading: dice() * Math.PI * 2,
        speed: 0,
        route: [{ x: front.x, z: front.z }],
        leg: 0,
        state: 'browse',
        panic: 0,
        color: dicePick(dice, [0xe2725b, 0x4f9d8f, 0xe8b04b, 0x7a6ff0]),
        dwell: dice() * 8 + 2,
      });
    }
  }
  return shoppers;
}

export function tickShoppers(shoppers, dt) {
  for (const s of shoppers) {
    s.dwell -= dt;
    if (s.dwell <= 0) {
      // Drift to a neighbouring storefront and browse there instead.
      s.x += (Math.random() * 2 - 1) * 14;
      s.z += (Math.random() * 2 - 1) * 14;
      s.dwell = Math.random() * 8 + 2;
      s.heading = Math.random() * Math.PI * 2;
    }
  }
  return shoppers;
}

export function crowdSnapshot(crowd) {
  return {
    total: crowd.length,
    strolling: crowd.filter((w) => w.state === 'stroll').length,
    fleeing: crowd.filter((w) => w.state === 'flee').length,
    browsing: crowd.filter((w) => w.state === 'browse').length,
  };
}
