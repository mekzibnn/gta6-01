// The cars. Traffic, the player's ride, the KPD units and the wrecks
// they leave behind. Every car carries a unique id (nextId++), a model,
// a position, a heading, a speed and a health bar. A car whose health
// reaches zero explodes into a persistent burning wreck, and the blast
// can chain into the cars around it.

import { CAR_MODELS, COPS_PER_STAR, MAX_COPS } from './config.js';
import { armorSoak } from './upgrades.js';
import { handlingMultiplier } from './crew.js';
import { buildingPush } from './city.js';

let nextId = 1;

// Make a car object. Health is the condition percent the HUD shows.
export function makeCar(g, model, x, z, heading) {
  const def = CAR_MODELS[model] || CAR_MODELS.sedan;
  return {
    id: nextId++,
    model,
    name: def.name,
    x, z, heading,
    speed: 0,
    health: 100,
    maxHealth: 100,
    color: def.color,
    exploded: false,
    nitroBurn: 0,
    // Traffic state: which street it cruises and which way.
    streetAxis: 'x',
    streetLine: 0,
    streetDir: 1,
    cruise: 10,
  };
}

// Spawn the traffic and the parked cars: the sedan at the hideout (the
// first car the player steals), a sport car nearby for mission 2, and
// the traffic cruising the grid.
export function spawnTraffic(g) {
  const hideout = g.city.spots.hideout;
  const sedan = makeCar(g, 'sedan', hideout.x + 6, hideout.z + 4, 0);
  sedan.cruise = 0;
  g.cars.push(sedan);
  const sport = makeCar(g, 'sport', hideout.x + 20, hideout.z - 6, 0.5);
  sport.cruise = 0;
  g.cars.push(sport);
  const models = ['sedan', 'taxi', 'sedan', 'truck', 'sedan', 'taxi', 'sport'];
  for (let i = 0; i < 14; i += 1) {
    const model = models[i % models.length];
    const axis = g.rng.chance(0.5) ? 'x' : 'z';
    const line = g.rng.pick([-180, -120, -60, 0, 60, 120, 180]);
    const along = g.rng.range(-180, 180);
    const car = makeCar(g, model, axis === 'x' ? line : along, axis === 'x' ? along : line, axis === 'x' ? 0 : Math.PI / 2);
    car.streetAxis = axis;
    car.streetLine = line;
    car.streetDir = g.rng.chance(0.5) ? 1 : -1;
    car.cruise = g.rng.range(8, 14);
    car.speed = car.cruise;
    g.cars.push(car);
  }
}

// The player's car, or null when on foot.
export function playerCar(g) {
  return g.car;
}

// Drive the player's car with the keys. W/S are throttle and brake,
// A/D steer (sharper with Milo), Space burns a nitro charge.
export function drivePlayerCar(g, dt) {
  const car = g.car;
  if (!car) return;
  const keys = g.keys;
  const def = CAR_MODELS[car.model] || CAR_MODELS.sedan;
  const engineBonus = g.garage.engine * 4;
  const nitro = car.nitroBurn > 0 ? 15 : 0;
  const maxSpeed = def.maxSpeed + engineBonus + nitro;
  const accel = def.accel * (car.nitroBurn > 0 ? 2 : 1);
  if (keys.w) car.speed += accel * dt;
  if (keys.s) car.speed -= accel * 1.4 * dt;
  if (!keys.w && !keys.s) car.speed *= Math.max(0, 1 - dt * 0.8);
  car.speed = Math.max(-9, Math.min(maxSpeed, car.speed));
  const steer = (keys.a ? 1 : 0) - (keys.d ? 1 : 0);
  if (steer !== 0 && Math.abs(car.speed) > 0.5) {
    car.heading += steer * 1.9 * handlingMultiplier(g) * dt * Math.sign(car.speed);
  }
  car.x += Math.sin(car.heading) * car.speed * dt;
  car.z += Math.cos(car.heading) * car.speed * dt;
  if (car.nitroBurn > 0) car.nitroBurn -= dt;
  // The rider rides along: the player's position is the car's, so the
  // shop prompts, the district widget and the mission checks all read
  // where the car actually is.
  g.player.x = car.x;
  g.player.z = car.z;
  g.player.heading = car.heading;
  // Stay inside the city and out of the buildings.
  car.x = Math.max(-205, Math.min(205, car.x));
  car.z = Math.max(-205, Math.min(205, car.z));
  const push = buildingPush(g.city, car.x, car.z, 2.5);
  if (push) {
    car.x = push.x;
    car.z = push.z;
    car.speed *= 0.4;
    if (Math.abs(car.speed) > 12) damageCar(g, car, 8);
  }
}

// Move the traffic along its street. At the edge of town it turns
// around and cruises back.
export function updateTraffic(g, dt) {
  for (const car of g.cars) {
    if (car === g.car) continue;
    if (car.cruise <= 0) continue;
    car.speed = car.cruise;
    if (car.streetAxis === 'x') {
      car.z += car.streetDir * car.speed * dt;
      car.heading = car.streetDir > 0 ? 0 : Math.PI;
      if (car.z > 200 || car.z < -200) car.streetDir *= -1;
    } else {
      car.x += car.streetDir * car.speed * dt;
      car.heading = car.streetDir > 0 ? Math.PI / 2 : -Math.PI / 2;
      if (car.x > 200 || car.x < -200) car.streetDir *= -1;
    }
  }
}

// Car-to-car collisions. A hard hit damages both cars and shoves them
// apart; a car at zero health explodes.
export function updateCollisions(g) {
  const cars = g.cars;
  for (let i = 0; i < cars.length; i += 1) {
    for (let j = i + 1; j < cars.length; j += 1) {
      const a = cars[i];
      const b = cars[j];
      if (a.exploded || b.exploded) continue;
      const dx = b.x - a.x;
      const dz = b.z - a.z;
      const d2 = dx * dx + dz * dz;
      if (d2 >= 25 || d2 === 0) continue;
      const d = Math.sqrt(d2);
      const rel = Math.abs(a.speed - b.speed);
      const nx = dx / d;
      const nz = dz / d;
      // Shove them apart so the hit only lands once.
      const push = (5 - d) / 2;
      a.x -= nx * push;
      a.z -= nz * push;
      b.x += nx * push;
      b.z += nz * push;
      if (rel > 5) {
        // A sustained overlap (a traffic car grinding against the
        // player's parked car) must not drain health every frame: one
        // hit per pair per 0.6 s, then the shove separates them.
        if (a.lastHit === undefined) a.lastHit = -10;
        if (b.lastHit === undefined) b.lastHit = -10;
        if (g.time - a.lastHit > 0.6 && g.time - b.lastHit > 0.6) {
          const dmg = rel * 1.5;
          damageCar(g, a, dmg);
          damageCar(g, b, dmg);
          a.lastHit = g.time;
          b.lastHit = g.time;
        }
      }
    }
  }
  // Cops ram the player's car.
  if (g.car) {
    for (const cop of g.cops) {
      const dx = g.car.x - cop.x;
      const dz = g.car.z - cop.z;
      const d2 = dx * dx + dz * dz;
      if (d2 < 25 && d2 > 0.01) {
        const rel = Math.abs(g.car.speed - cop.speed);
        if (rel > 6) {
          if (g.car.lastHit === undefined) g.car.lastHit = -10;
          if (g.time - g.car.lastHit > 0.6) {
            damageCar(g, g.car, rel * 1.2);
            g.car.lastHit = g.time;
          }
        }
        const d = Math.sqrt(d2);
        g.car.x += (dx / d) * 1.5;
        g.car.z += (dz / d) * 1.5;
      }
    }
  }
}

// Damage a car, soaking through the player's armour. At zero health it
// explodes.
export function damageCar(g, car, amount) {
  if (!car || car.exploded) return;
  let dmg = amount;
  if (car === g.car) dmg *= 1 - armorSoak(g);
  car.health -= dmg;
  if (car.health <= 0) {
    car.health = 0;
    explodeCar(g, car);
  }
}

// A car explodes: a burning wreck stays on the road, the screen flashes,
// a boom rings out, and the blast hurts whatever is close. If the
// player was inside, they are thrown out on foot and hurt.
export function explodeCar(g, car) {
  if (!car || car.exploded) return;
  car.exploded = true;
  g.wrecks.push({ x: car.x, z: car.z, model: car.model, color: car.color, burnT: 0 });
  g.booms.push({ x: car.x, z: car.z, t: 0 });
  g.flash = 1;
  g.stats.wrecks += 1;
  const wasPlayer = car === g.car;
  const idx = g.cars.indexOf(car);
  if (idx >= 0) g.cars.splice(idx, 1);
  if (wasPlayer) {
    g.player.inCar = false;
    g.car = null;
    g.player.health = Math.max(1, g.player.health - 25);
    g.hud.toast = 'Your car exploded!';
    g.hud.toastT = 3;
  }
  // Chain damage: nearby cars catch the blast.
  for (const other of [...g.cars]) {
    if (other.exploded) continue;
    const dx = other.x - car.x;
    const dz = other.z - car.z;
    if (dx * dx + dz * dz < 64) damageCar(g, other, 40);
  }
  // Nearby peds dive for cover.
  for (const p of g.peds) {
    const dx = p.x - car.x;
    const dz = p.z - car.z;
    if (dx * dx + dz * dz < 144) {
      p.state = 'flee';
      p.panic = 2;
    }
  }
}

// The police. Wanted stars call in units; three stars and up bring the
// RAM and PIT specialists. Cops chase the player and thin out when the
// heat is gone.
export function updateCops(g, dt) {
  const wanted = g.player.wanted;
  if (wanted <= 0) {
    g.cops.length = 0;
    return;
  }
  const target = Math.min(wanted * COPS_PER_STAR, MAX_COPS);
  // Spawn the specialists first when the heat is on.
  while (g.cops.length < target) {
    let kind = 'patrol';
    if (wanted >= 3 && !g.cops.some((c) => c.kind === 'ram')) kind = 'ram';
    else if (wanted >= 3 && !g.cops.some((c) => c.kind === 'pit')) kind = 'pit';
    const a = g.rng.next() * Math.PI * 2;
    const dist = 35 + g.rng.next() * 20;
    const cop = {
      id: nextId++,
      kind,
      x: g.player.x + Math.sin(a) * dist,
      z: g.player.z + Math.cos(a) * dist,
      heading: 0,
      speed: 0,
      health: 100,
      maxHealth: 100,
    };
    cop.x = Math.max(-200, Math.min(200, cop.x));
    cop.z = Math.max(-200, Math.min(200, cop.z));
    g.cops.push(cop);
  }
  // Chase: steer toward the player (or their car) and close in.
  const tx = g.car ? g.car.x : g.player.x;
  const tz = g.car ? g.car.z : g.player.z;
  for (const cop of g.cops) {
    const dx = tx - cop.x;
    const dz = tz - cop.z;
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    const want = Math.atan2(dx, dz);
    let dh = want - cop.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    cop.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
    const targetSpeed = d > 6 ? 30 : 12;
    cop.speed += (targetSpeed - cop.speed) * Math.min(1, dt * 1.5);
    cop.x += Math.sin(cop.heading) * cop.speed * dt;
    cop.z += Math.cos(cop.heading) * cop.speed * dt;
  }
}

// Wrecks keep burning. The flame flickers in the renderer; the burn
// timer just ages them.
export function updateWrecks(g, dt) {
  for (const w of g.wrecks) w.burnT += dt;
  for (const b of g.booms) b.t += dt;
  g.booms = g.booms.filter((b) => b.t < 1.2);
  if (g.flash > 0) g.flash = Math.max(0, g.flash - dt * 0.8);
}
