// The player on foot. WASD walks the streets, the heading follows the
// movement, and the player is the fallback camera target when no car is
// under them. Entering and leaving cars lives here too, next to the
// steal.

import { buildingPush } from './city.js';

export function makePlayer() {
  return {
    x: 0, z: 156, heading: 0,
    inCar: false,
    cash: 500,
    wanted: 0,
    health: 100,
    maxHealth: 100,
    weapon: 0,
    weapons: [true, false, false, false],
    districtStanding: { marina: 0, oldtown: 0, docks: 0, hills: 0, downtown: 0 },
    respect: 0,
  };
}

// Walk with WASD. Speed is a jog; the heading turns toward the movement.
export function updatePlayerOnFoot(g, dt) {
  if (g.player.inCar) return;
  const keys = g.keys;
  let mx = 0;
  let mz = 0;
  if (keys.w) mz += 1;
  if (keys.s) mz -= 1;
  if (keys.a) mx -= 1;
  if (keys.d) mx += 1;
  if (mx === 0 && mz === 0) return;
  const len = Math.sqrt(mx * mx + mz * mz);
  mx /= len;
  mz /= len;
  // Camera-relative: the camera looks north (-z is forward on screen is
  // not assumed here; W walks toward +z, the avenue's north).
  const speed = 5.5;
  g.player.x += mx * speed * dt;
  g.player.z += mz * speed * dt;
  g.player.heading = Math.atan2(mx, mz);
  g.player.x = Math.max(-205, Math.min(205, g.player.x));
  g.player.z = Math.max(-205, Math.min(205, g.player.z));
  const push = buildingPush(g.city, g.player.x, g.player.z, 1);
  if (push) {
    g.player.x = push.x;
    g.player.z = push.z;
  }
}

// The nearest car the player could steal, within reach, or null.
export function nearestCar(g, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  for (const car of g.cars) {
    if (car.exploded) continue;
    const dx = car.x - g.player.x;
    const dz = car.z - g.player.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD) {
      bestD = d2;
      best = car;
    }
  }
  return best;
}

// Get in a car. A parked car is free; taking a driving car in front of a
// cop draws a star.
export function enterCar(g, car) {
  if (!car || car.exploded) return false;
  g.player.inCar = true;
  g.car = car;
  g.player.x = car.x;
  g.player.z = car.z;
  g.player.heading = car.heading;
  car.speed = 0;
  g.stats.carsStolen += 1;
  g.hud.toast = `Stole the ${car.name}`;
  g.hud.toastT = 2.5;
  const copNear = g.cops.some((c) => {
    const dx = c.x - car.x;
    const dz = c.z - car.z;
    return dx * dx + dz * dz < 1600;
  });
  if (copNear && car.cruise > 0) {
    g.player.wanted = Math.min(5, g.player.wanted + 1);
  }
  return true;
}

// Step out of the car, onto the street beside it.
export function exitCar(g) {
  if (!g.car) return false;
  const car = g.car;
  g.player.inCar = false;
  g.player.x = car.x + Math.sin(car.heading + Math.PI / 2) * 3;
  g.player.z = car.z + Math.cos(car.heading + Math.PI / 2) * 3;
  g.player.heading = car.heading;
  g.car = null;
  return true;
}
