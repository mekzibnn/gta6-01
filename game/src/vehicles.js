// Vehicles for Solmar Heat.
// Cars are plain objects: an id, a model, a position, a heading, a speed
// and a health. Traffic drives the avenues; the player drives one car at
// a time. A hard hit destroys a car: it becomes a persistent burning wreck.

import { CAR } from './config.js';
import { handlingBonus, ramBonus } from './crew.js';

export const MODELS = {
  sport: { name: 'Solmar GT', color: 0xd9382a, topSpeed: 48, accel: 18, health: 100 },
  sedan: { name: 'Solmar Sedan', color: 0x3a6ea8, topSpeed: 38, accel: 13, health: 100 },
  taxi: { name: 'Sunset Taxi', color: 0xe0b93c, topSpeed: 36, accel: 12, health: 100 },
  hauler: { name: 'City Hauler', color: 0x5a6a5a, topSpeed: 30, accel: 10, health: 140 },
  police: { name: 'KPD Cruiser', color: 0x1a1a2e, topSpeed: 46, accel: 16, health: 120 },
};

// Every car and every cop draws from this one counter, so no two vehicles
// ever share an id. (An old bug gave every car id 1, and most of them
// never rendered.)
let nextId = 1;

export function nextVehicleId() {
  return nextId++;
}

export function makeCar(model, x, z, heading) {
  const spec = MODELS[model];
  return {
    id: nextId++,
    model,
    name: spec.name,
    color: spec.color,
    x,
    z,
    heading,
    speed: 0,
    health: spec.health,
    maxHealth: spec.health,
    topSpeed: spec.topSpeed,
    accel: spec.accel,
    nitroBurn: 0,
    exploded: false,
  };
}

// The sedan at the hideout is cars[0]: the first car the player steals.
export function spawnTraffic(game, rng) {
  const cars = [];
  const sedan = makeCar('sedan', game.city.spots.hideout.x + 4, game.city.spots.hideout.z, 0);
  cars.push(sedan);
  const models = ['sedan', 'sedan', 'taxi', 'hauler', 'sport', 'sedan', 'taxi', 'sport', 'sedan', 'hauler', 'taxi', 'sedan', 'sport', 'sedan'];
  for (let i = 0; i < models.length; i += 1) {
    const alongRoad = rng.chance(0.5);
    const lane = rng.pick([-208, -156, -104, -52, 0, 52, 104, 156, 208]);
    const pos = rng.range(-180, 180);
    const x = alongRoad ? lane : pos;
    const z = alongRoad ? pos : lane;
    const heading = alongRoad ? (rng.chance(0.5) ? 0 : Math.PI) : rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2;
    const car = makeCar(models[i], x, z, heading);
    car.speed = rng.range(8, 15);
    cars.push(car);
  }
  return cars;
}

// Drive the player's car from the held keys. Returns metres travelled.
export function drivePlayerCar(game, dt) {
  const car = game.car;
  if (!car) return 0;
  const keys = game.keys;
  const handling = handlingBonus(game.roster);
  let top = car.topSpeed + game.garage.engine * 4;
  if (car.nitroBurn > 0) top += CAR.nitroBoost;
  if (keys.has('KeyW')) car.speed += car.accel * dt;
  else if (keys.has('KeyS')) car.speed -= CAR.brake * dt;
  else {
    // Rolling resistance.
    car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 6 * dt);
  }
  if (keys.has('Space') && game.garage.nitro > 0 && car.nitroBurn <= 0) {
    game.garage.nitro -= 1;
    car.nitroBurn = 2;
  }
  if (car.nitroBurn > 0) car.nitroBurn -= dt;
  car.speed = Math.max(-CAR.reverseMax, Math.min(top, car.speed));
  const steer = (keys.has('KeyA') ? 1 : 0) - (keys.has('KeyD') ? 1 : 0);
  if (steer !== 0 && Math.abs(car.speed) > 0.5) {
    car.heading += steer * CAR.turn * handling * dt * Math.sign(car.speed);
  }
  const dx = Math.sin(car.heading) * car.speed * dt;
  const dz = Math.cos(car.heading) * car.speed * dt;
  car.x += dx;
  car.z += dz;
  // The city ends at the edge of the map; the car stops there.
  car.x = Math.max(-400, Math.min(400, car.x));
  car.z = Math.max(-400, Math.min(400, car.z));
  game.player.x = car.x;
  game.player.z = car.z;
  game.player.heading = car.heading;
  return Math.hypot(dx, dz);
}

// Traffic cruises its road and wraps around the edge of the map.
export function updateTraffic(game, dt) {
  for (const car of game.cars) {
    if (car.exploded || car === game.car) continue;
    car.x += Math.sin(car.heading) * car.speed * dt;
    car.z += Math.cos(car.heading) * car.speed * dt;
    if (car.x > 210) car.x = -210;
    if (car.x < -210) car.x = 210;
    if (car.z > 210) car.z = -210;
    if (car.z < -210) car.z = 210;
  }
}

// A hard hit between the player's car and traffic. Returns the car that
// exploded, if any.
export function checkCollisions(game) {
  const car = game.car;
  if (!car || car.exploded) return null;
  for (const other of game.cars) {
    if (other === car || other.exploded) continue;
    const dx = car.x - other.x;
    const dz = car.z - other.z;
    const distSq = dx * dx + dz * dz;
    if (distSq > 3.5 * 3.5) continue;
    const rel = Math.abs(car.speed - other.speed);
    if (rel < 5) continue;
    const damage = 10 + rel * 0.8 * ramBonus(game.roster);
    car.health -= damage;
    other.health -= damage;
    if (car.health <= 0) return explodeCar(game, car);
    if (other.health <= 0) explodeCar(game, other);
    // A glancing hit slows both cars down.
    car.speed *= 0.5;
    other.speed *= 0.5;
  }
  return null;
}

// Destroy a car: a persistent burning wreck, a flash, a boom, and the
// player on foot and hurt if it was their car.
export function explodeCar(game, car) {
  car.exploded = true;
  car.health = 0;
  car.speed = 0;
  game.wrecks.push({ x: car.x, z: car.z, model: car.model, t: 0 });
  game.flash = 1;
  game.booms.push({ x: car.x, z: car.z, t: 0 });
  if (game.car === car) {
    game.car = null;
    game.player.inCar = false;
    game.player.health = Math.max(10, game.player.health - 35);
    game.player.wanted = Math.min(5, game.player.wanted + 1);
  }
  return car;
}
