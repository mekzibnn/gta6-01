// Cars — arcade driving (v6 rewrite).
// A simple bicycle model with collisions: throttle, brake, steering that
// bites harder at low speed, and a top speed per model. Traffic cars follow
// the road grid on their own; the player's car answers the keys. The Air One
// helicopter is a car that flies — it circles above a chase and never lands.

import { GARAGE, WORLD } from './config.js';
import { dicePick, diceRange } from './random.js';

export const MODELS = {
  sedan: { label: 'Sedan', top: 26, accel: 9, grip: 1.0, color: 0x5a7d9a, value: 900 },
  sport: { label: 'Sport', top: 34, accel: 13, grip: 1.15, color: 0xff5a3c, value: 2400 },
  truck: { label: 'Truck', top: 21, accel: 6, grip: 0.85, color: 0x8a6d3b, value: 1500 },
  taxi: { label: 'Taxi', top: 27, accel: 10, grip: 1.0, color: 0xffd23f, value: 1100 },
  police: { label: 'Police', top: 31, accel: 12, grip: 1.1, color: 0x1f2a37, value: 0 },
  heli: { label: 'Air One', top: 30, accel: 8, grip: 1.0, color: 0x1f2a37, value: 0 },
};

export function spawnCar(modelId, x, z, heading) {
  const m = MODELS[modelId] || MODELS.sedan;
  return {
    id: `${modelId}-${Math.floor(x)}-${Math.floor(z)}`,
    model: modelId,
    label: m.label,
    x,
    z,
    heading,
    speed: 0,
    top: m.top,
    accel: m.accel,
    grip: m.grip,
    color: m.color,
    value: m.value,
    // Traffic state: which road the car follows and which way.
    lane: 0,
    targetSpeed: m.top * 0.55,
    stuck: 0,
    // Damage and smoke, for chases and crashes.
    damage: 0,
    smoking: false,
    // Nitro burn left (seconds); a burn spends one charge, then runs out.
    nitroBurn: 0,
  };
}

export function spawnTraffic(dice, city, count) {
  const out = [];
  const kinds = ['sedan', 'sedan', 'sport', 'truck', 'taxi'];
  for (let i = 0; i < count; i += 1) {
    const vertical = dicePick(dice, [true, false]);
    const road = dicePick(dice, vertical ? city.avenues : city.streets);
    const along = diceRange(dice, -WORLD.halfSize + 20, WORLD.halfSize - 20);
    const x = vertical ? road + dicePick(dice, [-4, 4]) : along;
    const z = vertical ? along : road + dicePick(dice, [-4, 4]);
    const heading = vertical ? (along > 0 ? Math.PI : 0) : (along > 0 ? Math.PI / 2 : -Math.PI / 2);
    const car = spawnCar(dicePick(dice, kinds), x, z, heading);
    car.lane = vertical ? 0 : 1;
    out.push(car);
  }
  return out;
}

export function advanceCar(car, drive, dt, handlingBoost) {
  // drive: { throttle 0..1, brake 0..1, steer -1..1, nitro bool }
  const grip = car.grip * (handlingBoost || 1);
  const top = car.top * (drive.nitro ? GARAGE.nitroBoost : 1);
  if (drive.throttle > 0) {
    car.speed += car.accel * drive.throttle * dt;
  }
  if (drive.brake > 0) {
    car.speed -= car.accel * 2.2 * drive.brake * dt;
    if (car.speed < 0) car.speed = 0;
  }
  // Rolling drag keeps the car from running away downhill.
  car.speed -= car.speed * 0.35 * dt;
  if (car.speed > top) car.speed = top;
  if (car.speed < 0) car.speed = 0;
  // Steering bites less the faster the car goes.
  const steerAuthority = 1.9 * grip * Math.min(1, 14 / (car.speed + 6));
  car.heading += drive.steer * steerAuthority * dt * Math.min(1, car.speed / 4);
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  const m = WORLD.halfSize - 6;
  car.x = Math.max(-m, Math.min(m, car.x));
  car.z = Math.max(-m, Math.min(m, car.z));
  return car;
}

export function advanceTrafficCar(car, city, dt, dice) {
  // Traffic holds its lane and slows for the car ahead; it never leaves the road.
  const ahead = car.targetSpeed;
  if (car.speed < ahead) car.speed += car.accel * 0.5 * dt;
  else car.speed -= car.accel * 0.8 * dt;
  if (car.speed < 0) car.speed = 0;
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  // At the city edge, turn around and come back.
  if (Math.abs(car.x) > WORLD.halfSize - 10 || Math.abs(car.z) > WORLD.halfSize - 10) {
    car.heading += Math.PI;
    car.x = Math.max(-WORLD.halfSize + 12, Math.min(WORLD.halfSize - 12, car.x));
    car.z = Math.max(-WORLD.halfSize + 12, Math.min(WORLD.halfSize - 12, car.z));
  }
  // Occasionally a traffic car changes its mind and turns at a junction.
  if (dice && dice() < 0.002) {
    car.heading += dice() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
  }
  return car;
}

export function carDistance(a, b) {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dz * dz);
}

export function carsCollide(a, b, gap) {
  return carDistance(a, b) < (gap || 5);
}

export function pushApart(a, b) {
  const dx = b.x - a.x;
  const dz = b.z - a.z;
  const d = Math.sqrt(dx * dx + dz * dz) || 1;
  const overlap = 5 - d;
  if (overlap <= 0) return;
  const nx = dx / d;
  const nz = dz / d;
  a.x -= nx * overlap * 0.5;
  a.z -= nz * overlap * 0.5;
  b.x += nx * overlap * 0.5;
  b.z += nz * overlap * 0.5;
  const tmp = a.speed;
  a.speed = b.speed * 0.4;
  b.speed = tmp * 0.4;
}

export function damageCar(car, amount) {
  car.damage += amount;
  if (car.damage > 60) car.smoking = true;
  if (car.damage >= 100) {
    car.speed = 0;
    car.wrecked = true;
  }
  return car;
}

export function kmh(car) {
  return Math.round(car.speed * 3.6);
}

export function applyEngine(car, tierIndex) {
  const tier = GARAGE.engines[tierIndex] || GARAGE.engines[0];
  car.top = MODELS[car.model].top * tier.top;
  car.accel = MODELS[car.model].accel * tier.accel;
  car.engineTier = tierIndex;
  return car;
}
