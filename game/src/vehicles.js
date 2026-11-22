// Solmar Heat v7 — cars, traffic, damage, and explosions.
// A car is a circle with a heading and a speed. Traffic follows the grid.
// Damage is honest: bump a wall hard and the paint suffers; bring a car
// to zero health and it does not stall — it blows up, and the burning
// wreck it leaves behind stays in the world as an obstacle.

import { GARAGE, BOOM, POLICE } from './config.js';
import { crewHandling } from './crew.js';

export const MODELS = {
  sedan: { top: 26, accel: 11, health: 100, color: 0x8a94a6, len: 4.4, wid: 2 },
  sport: { top: 34, accel: 16, health: 90, color: 0xff7a1a, len: 4.2, wid: 1.9 },
  taxi: { top: 28, accel: 12, health: 100, color: 0xf2c200, len: 4.4, wid: 2 },
  truck: { top: 20, accel: 8, health: 140, color: 0x5a6b7a, len: 6.2, wid: 2.4 },
  cop: { top: 30, accel: 14, health: 120, color: 0x1a1a1a, len: 4.4, wid: 2 },
  ram: { top: POLICE.ramSpeed, accel: 13, health: POLICE.ramHealth, color: 0x222226, len: 5.2, wid: 2.4 },
  pit: { top: POLICE.pitSpeed, accel: 18, health: POLICE.pitHealth, color: 0x0d0d12, len: 4.2, wid: 1.9 },
};

let nextId = 1;

export function spawnCar(model, x, z, heading) {
  const def = MODELS[model] || MODELS.sedan;
  return {
    id: nextId++,
    model,
    x, z,
    heading: heading || 0,
    speed: 0,
    color: def.color,
    health: def.health,
    maxHealth: def.health,
    top: def.top,
    accel: def.accel,
    engine: 0,
    armor: 0,
    nitroBurn: 0,
    steer: 0,
    exploded: false,
    traffic: false,
    route: null,
    routeAt: 0,
    cruise: 10,
  };
}

export function spawnTraffic(dice, city, count) {
  const cars = [];
  const kinds = ['sedan', 'sedan', 'taxi', 'sport', 'truck'];
  for (let i = 0; i < count; i += 1) {
    const avenue = dice.pick([-180, -120, -60, 0, 60, 120, 180]);
    const along = dice.range(-180, 180);
    const vertical = dice.chance(0.5);
    const car = spawnCar(dice.pick(kinds), vertical ? avenue : along, vertical ? along : avenue, dice.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]));
    car.traffic = true;
    car.cruise = dice.range(8, 13);
    car.route = [];
    const base = vertical ? avenue : along;
    for (let k = 0; k < 4; k += 1) {
      car.route.push({ x: vertical ? base : dice.pick([-180, -120, -60, 0, 60, 120, 180]), z: vertical ? dice.pick([-180, -120, -60, 0, 60, 120, 180]) : base });
    }
    cars.push(car);
  }
  return cars;
}

export function kmh(speed) {
  return Math.abs(speed) * 3.6;
}

export function applyEngine(car, tier) {
  const def = GARAGE.engines[Math.max(0, Math.min(tier, GARAGE.engines.length - 1))];
  car.engine = tier;
  car.top = def.top;
  car.accel = def.accel;
}

export function carDistance(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function carsCollide(a, b) {
  return carDistance(a, b) < 3.2;
}

export function pushApart(a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const d = Math.sqrt(dx * dx + dz * dz) || 0.01;
  const overlap = 3.2 - d;
  if (overlap <= 0) return 0;
  const nx = dx / d;
  const nz = dz / d;
  const push = overlap / 2;
  a.x -= nx * push;
  a.z -= nz * push;
  b.x += nx * push;
  b.z += nz * push;
  const impact = Math.abs(a.speed - b.speed);
  a.speed *= 0.6;
  b.speed *= 0.6;
  return impact;
}

function buildingHit(city, x, z) {
  for (const b of city.buildings) {
    if (Math.abs(x - b.x) < b.w / 2 + 1.4 && Math.abs(z - b.z) < b.d / 2 + 1.4) return b;
  }
  return null;
}

export function advanceCar(car, input, dt, world) {
  const boosting = car.nitroBurn > 0;
  const top = car.top * (boosting ? GARAGE.nitro.boost : 1);
  if (input.up) car.speed += car.accel * dt * (car.speed < 0 ? 2.2 : 1);
  if (input.down) car.speed -= car.accel * 0.9 * dt;
  if (!input.up && !input.down) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 6 * dt);
  if (car.speed > top) car.speed = top;
  if (car.speed < -12) car.speed = -12;
  const steerPower = 2.1 * Math.min(1, Math.abs(car.speed) / 8) * (world.roster ? crewHandling(world.roster) : 1);
  if (input.left) car.heading += steerPower * dt * Math.sign(car.speed || 1);
  if (input.right) car.heading -= steerPower * dt * Math.sign(car.speed || 1);
  if (car.nitroBurn > 0) car.nitroBurn = Math.max(0, car.nitroBurn - dt);
  const nx = car.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.z + Math.cos(car.heading) * car.speed * dt;
  const moved = Math.abs(car.speed) * dt;
  const hit = buildingHit(world.city, nx, nz);
  if (hit) {
    const impact = Math.abs(car.speed);
    car.speed *= -0.25;
    if (impact > 12) damageCar(car, (impact - 12) * 1.5, world);
  } else {
    car.x = nx;
    car.z = nz;
  }
  const half = world.city.half;
  if (Math.abs(car.x) > half || Math.abs(car.z) > half) {
    car.x = Math.max(-half, Math.min(half, car.x));
    car.z = Math.max(-half, Math.min(half, car.z));
    car.heading += Math.PI;
    car.speed *= 0.7;
  }
  return moved;
}

export function advanceTrafficCar(car, dt, world) {
  if (!car.route || car.route.length === 0) return;
  const target = car.route[car.routeAt % car.route.length];
  const dx = target.x - car.x;
  const dz = target.z - car.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 6) {
    car.routeAt += 1;
    return;
  }
  const want = Math.atan2(dx, dz);
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
  car.speed += (car.cruise - car.speed) * Math.min(1, dt * 0.8);
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  const half = world.city.half;
  if (Math.abs(car.x) > half || Math.abs(car.z) > half) {
    car.heading += Math.PI;
    car.x = Math.max(-half, Math.min(half, car.x));
    car.z = Math.max(-half, Math.min(half, car.z));
  }
}

// v7: damage a car; at zero health it explodes instead of stopping.
export function damageCar(car, amount, world) {
  if (!car || car.exploded) return false;
  const soak = car.armor ? GARAGE.armors[Math.min(car.armor, GARAGE.armors.length - 1)].soak : 0;
  car.health -= amount * (1 - soak);
  if (car.health <= 0) {
    car.health = 0;
    explodeCar(car, world);
    return true;
  }
  return false;
}

export function explodeCar(car, world) {
  if (!car || car.exploded) return;
  car.exploded = true;
  world.booms.push({ x: car.x, z: car.z, t: 0, dur: 0.9, big: car.model === 'truck' });
  world.wrecks.push({ x: car.x, z: car.z, heading: car.heading, model: car.model, color: car.color, t: 0, cold: false });
  while (world.wrecks.length > BOOM.maxWrecks) world.wrecks.shift();
  world.shake = Math.max(world.shake || 0, BOOM.shake);
  world.flash = Math.max(world.flash || 0, BOOM.flash);
  (world.sfx || (world.sfx = [])).push('boom');
  // The blast hurts everything close by; a dying car can set off the next.
  const victims = (world.cars || []).concat(world.cops || []);
  for (const other of victims) {
    if (other === car || other.exploded) continue;
    const d = carDistance(car, other);
    if (d < BOOM.radius) {
      other.health -= BOOM.damage * (1 - d / BOOM.radius);
      if (other.health <= 0 && !other.exploded) explodeCar(other, world);
    }
  }
  for (const ped of world.peds || []) {
    if (carDistance(car, ped) < BOOM.radius * 0.7) {
      ped.state = 'flee';
      ped.panic = 3;
    }
  }
  // The driver's car blowing up leaves the driver on foot, hurt.
  if (world.car === car) {
    world.car = null;
    world.player.inCar = false;
    world.player.health = Math.max(0, (world.player.health || 100) - 35);
  }
}

export function tickBooms(world, dt) {
  for (let i = world.booms.length - 1; i >= 0; i -= 1) {
    world.booms[i].t += dt;
    if (world.booms[i].t >= world.booms[i].dur) world.booms.splice(i, 1);
  }
}

export function tickWrecks(world, dt) {
  for (const wreck of world.wrecks) {
    wreck.t += dt;
    if (wreck.t > BOOM.wreckBurn) wreck.cold = true;
  }
}

// A wreck is a solid obstacle: push a car out of it, report the impact.
export function collideWrecks(world, car) {
  let hit = 0;
  for (const wreck of world.wrecks) {
    const dx = car.x - wreck.x;
    const dz = car.z - wreck.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < 3.4 && d > 0.01) {
      const push = 3.4 - d;
      car.x += (dx / d) * push;
      car.z += (dz / d) * push;
      hit = Math.max(hit, Math.abs(car.speed));
      car.speed *= 0.5;
    }
  }
  return hit;
}
