// Cars — spawning, traffic, driving physics, collisions, explosions
// and persistent burning wrecks. Every car carries a unique id.
import { makeRng } from './random.js';

let nextCarId = 1;

const MODELS = [
  { model: 'sedan', color: 0xd94f3d, top: 40 },
  { model: 'sport', color: 0xffc21a, top: 52 },
  { model: 'taxi', color: 0xffd23f, top: 42 },
  { model: 'coupe', color: 0x4cc9f0, top: 46 },
  { model: 'van', color: 0x8ecae6, top: 34 },
  { model: 'muscle', color: 0x9b5de5, top: 48 },
];

export function makeCar(rng, modelName, x, z, heading) {
  const def = MODELS.find((m) => m.model === modelName) || MODELS[0];
  return {
    id: nextCarId++,
    model: def.model, color: def.color, topSpeed: def.top,
    x, z, heading, speed: 0,
    health: 100, maxHealth: 100,
    exploded: false, nitroBurn: 0, burnT: 0,
    traffic: false, waypoint: 0, route: null,
    hitCool: 0, stuckT: 0,
  };
}

export function spawnTraffic(g) {
  const rng = g.rng;
  const roads = [];
  for (const x of g.city.avenues) roads.push({ axis: 'x', at: x });
  for (const z of g.city.streets) roads.push({ axis: 'z', at: z });
  for (let i = 0; i < 11; i += 1) {
    const road = rng.pick(roads);
    const along = rng.range(-160, 160);
    const x = road.axis === 'x' ? road.at + rng.range(-3, 3) : along;
    const z = road.axis === 'z' ? road.at + rng.range(-3, 3) : along;
    const def = rng.pick(MODELS);
    const c = makeCar(rng, def.model, x, z, rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]));
    c.traffic = true;
    c.speed = rng.range(10, 16);
    c.route = road;
    g.cars.push(c);
  }
  // One sport car parked near the Marina so the city always has one.
  const sport = makeCar(rng, 'sport', -120, 30, Math.PI / 2);
  g.cars.push(sport);
}

export function seedHideoutSedan(g) {
  const h = g.city.hideout;
  const sedan = makeCar(g.rng, 'sedan', h.x + 4, h.z, 0);
  sedan.hideout = true;
  g.cars.unshift(sedan);
  return sedan;
}

// A fresh sedan waits at the hideout whenever the player is on foot and
// the old one is gone — the street series always has a car to steal.
export function refreshHideoutSedan(g) {
  if (g.player.inCar) return;
  const h = g.city.hideout;
  const ok = g.cars.some((c) => c.hideout && !c.exploded
    && Math.hypot(c.x - h.x, c.z - h.z) < 30);
  if (!ok) seedHideoutSedan(g);
}

// Chop shop — drive a car in and it is sold on the spot; the player
// walks away on foot with the cash.
export function checkChopShop(g) {
  const c = g.car;
  if (!c || !g.player.inCar) return;
  const s = g.city.spots.chopShop;
  if (!s) return;
  if (Math.hypot(s.x - c.x, s.z - c.z) >= 12) return;
  const price = Math.round(200 + c.topSpeed * 5 * (c.health / c.maxHealth));
  g.player.cash += price;
  g.stats.stolen = Math.max(0, g.stats.stolen);
  const idx = g.cars.indexOf(c);
  if (idx >= 0) g.cars.splice(idx, 1);
  g.car = null;
  g.player.car = null;
  g.player.inCar = false;
  g.hud.note = `Chop shop paid $${price} for the ${c.model}`;
  g.hud.noteT = 3;
}

function damageCar(g, car, amount) {
  if (car.exploded) return;
  const armor = g.player.inCar && g.car === car ? g.garage.armor : 0;
  car.health -= amount * (1 - 0.2 * armor);
  if (car.health <= 0) explodeCar(g, car);
}

export function explodeCar(g, car) {
  if (car.exploded) return;
  car.exploded = true;
  car.health = 0;
  g.wrecks.push({ x: car.x, z: car.z, heading: car.heading, model: car.model, t: 0 });
  if (g.wrecks.length > 12) g.wrecks.shift();
  g.booms.push({ x: car.x, z: car.z, t: 0 });
  g.flash = 1;
  g.stats.wrecks += 1;
  // Chain damage — the blast cooks the cars around it.
  for (const other of g.cars) {
    if (other === car || other.exploded) continue;
    const d = Math.hypot(other.x - car.x, other.z - car.z);
    if (d < 14) damageCar(g, other, 60);
  }
  if (g.car === car) {
    g.player.inCar = false;
    g.player.x = car.x + 3; g.player.z = car.z + 2;
    g.player.health = Math.max(10, g.player.health - 30);
    g.car = null;
  }
  g.cars = g.cars.filter((c) => c !== car);
}

function collideCars(g, dt) {
  const list = g.cars;
  for (let i = 0; i < list.length; i += 1) {
    const a = list[i];
    if (a.exploded) continue;
    for (let j = i + 1; j < list.length; j += 1) {
      const b = list[j];
      if (b.exploded) continue;
      const dx = b.x - a.x, dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      if (d < 4 && d > 0.01) {
        const nx = dx / d, nz = dz / d;
        const rel = Math.abs(a.speed - b.speed);
        const coolKey = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
        if (!g._pairCool) g._pairCool = {};
        if ((g._pairCool[coolKey] || 0) <= 0) {
          const dmg = Math.max(6, rel * 0.7);
          damageCar(g, a, dmg * 0.6);
          damageCar(g, b, dmg * 0.6);
          g._pairCool[coolKey] = 0.6;
          // Shove them apart so they do not grind every frame.
          a.x -= nx * 1.2; a.z -= nz * 1.2;
          b.x += nx * 1.2; b.z += nz * 1.2;
          a.speed *= 0.5; b.speed *= 0.5;
        }
      }
    }
  }
  if (g._pairCool) {
    for (const k of Object.keys(g._pairCool)) {
      g._pairCool[k] -= dt;
      if (g._pairCool[k] <= 0) delete g._pairCool[k];
    }
  }
}

function driveTraffic(g, dt) {
  for (const c of g.cars) {
    if (!c.traffic || c.exploded) continue;
    // Cruise along its road; at the city edge, turn around.
    const fx = Math.sin(c.heading), fz = Math.cos(c.heading);
    c.x += fx * c.speed * dt;
    c.z += fz * c.speed * dt;
    if (c.x > 175 || c.x < -215 || c.z > 175 || c.z < -175) {
      c.heading += Math.PI;
      c.x = Math.max(-210, Math.min(170, c.x));
      c.z = Math.max(-170, Math.min(170, c.z));
    }
    // Gentle wander so the street never looks frozen.
    c.heading += Math.sin(g.time * 0.3 + c.id) * 0.02 * dt;
  }
}

export function tickVehicles(g, dt) {
  const c = g.car;
  const keys = g.input.keys;
  const fwd = keys.has('KeyW') || keys.has('ArrowUp');
  const back = keys.has('KeyS') || keys.has('ArrowDown');
  const left = keys.has('KeyA') || keys.has('ArrowLeft');
  const right = keys.has('KeyD') || keys.has('ArrowRight');
  if (c && !c.exploded) {
    const top = c.topSpeed + g.garage.engine * 6;
    const nitro = c.nitroBurn > 0 ? 1.6 : 1;
    if (fwd) c.speed += 14 * nitro * dt;
    else if (back) c.speed -= 18 * dt;
    else c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 8 * dt);
    if (c.speed > top * nitro) c.speed = top * nitro;
    if (c.speed < -14) c.speed = -14;
    const steer = (left ? 1 : 0) - (right ? 1 : 0);
    const grip = Math.min(1, Math.abs(c.speed) / 12);
    c.heading += steer * 1.9 * grip * dt * (c.speed >= 0 ? 1 : -1);
    c.x += Math.sin(c.heading) * c.speed * dt;
    c.z += Math.cos(c.heading) * c.speed * dt;
    c.x = Math.max(-260, Math.min(190, c.x));
    c.z = Math.max(-190, Math.min(190, c.z));
    if (keys.has('Space')) burnNitro(g);
    if (c.nitroBurn > 0) c.nitroBurn -= dt;
    if (c.burnT > 0) c.burnT -= dt;
  }
  driveTraffic(g, dt);
  collideCars(g, dt);
  for (const w of g.wrecks) w.t += dt;
  for (const b of g.booms) b.t += dt;
  g.booms = g.booms.filter((b) => b.t < 1.6);
  if (g.flash > 0) g.flash = Math.max(0, g.flash - dt * 0.45);
  checkChopShop(g);
  refreshHideoutSedan(g);
}

export function burnNitro(g) {
  const c = g.car;
  if (!c || c.nitroBurn > 0) return false;
  if (g.garage.nitro <= 0) return false;
  g.garage.nitro -= 1;
  c.nitroBurn = 2.0;
  return true;
}
