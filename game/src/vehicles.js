// Solmar Heat v12 — vehicles: player car physics, traffic AI, cops, explosions.
import { VEHICLE_DEFS, DISPATCH_UNITS } from './config.js';

let nextId = 1;
let nextCopId = 100;

export function makeVehicle(model, x, z, heading, opts = {}) {
  const def = VEHICLE_DEFS[model] || VEHICLE_DEFS.sedan;
  return {
    id: nextId++, model, x, z, heading: heading || 0, speed: 0,
    health: 100, maxHealth: 100, exploded: false, nitroBurn: 0,
    top: def.top, accel: def.accel, turn: def.turn, price: def.price,
    label: def.label, color: opts.color || 0xcccccc, traffic: !!opts.traffic,
    lane: opts.lane || 0, dir: opts.dir || 0, ai: opts.traffic ? { cool: 0 } : null,
  };
}

export function resetVehicleIds() { nextId = 1; }

export function spawnTraffic(g) {
  const models = ['taxi', 'van', 'sedan', 'truck', 'pickup', 'motorcycle'];
  const lanes = [0, 75, -75, 150, -150];
  for (let i = 0; i < 10; i += 1) {
    const lane = lanes[i % lanes.length];
    const vertical = i % 2 === 0;
    const car = makeVehicle(models[i % models.length], vertical ? lane : g.rng.range(-180, 180), vertical ? g.rng.range(-180, 180) : lane, vertical ? (i % 4 < 2 ? 0 : Math.PI) : (i % 4 < 2 ? Math.PI / 2 : -Math.PI / 2), { traffic: true, color: g.rng.pick([0xd94f3d, 0x3d7bd9, 0xe8e8e8, 0x2f2f38, 0xf2b705]) });
    car.speed = g.rng.range(8, 14);
    g.cars.push(car);
  }
}

function collideBuildings(g, car) {
  for (const b of g.city.buildings) {
    const hw = b.w / 2 + 1.6, hd = b.d / 2 + 1.6;
    if (Math.abs(car.x - b.x) < hw && Math.abs(car.z - b.z) < hd) {
      const px = hw - Math.abs(car.x - b.x);
      const pz = hd - Math.abs(car.z - b.z);
      if (px < pz) car.x = b.x + (car.x > b.x ? hw : -hw);
      else car.z = b.z + (car.z > b.z ? hd : -hd);
      car.speed *= 0.4;
    }
  }
}

export function explodeCar(g, car) {
  if (car.exploded) return;
  car.exploded = true;
  car.health = 0;
  g.wrecks.push({ x: car.x, z: car.z, heading: car.heading, model: car.model, t: 0, flames: 2 });
  g.booms.push({ x: car.x, z: car.z, t: 0 });
  g.flash = 1;
  if (g.car === car) {
    g.player.inCar = false;
    g.player.health = Math.max(5, g.player.health - 35);
    g.player.x = car.x + 3; g.player.z = car.z + 2;
    g.car = null;
    addWanted(g, 1);
  }
  const i = g.cars.indexOf(car);
  if (i >= 0) g.cars[i].exploded = true; // removal happens in the update cleanup pass
}

export function updateVehicles(g, dt) {
  const keys = g.keys;
  // Player car physics.
  if (g.car && g.player.inCar) {
    const c = g.car;
    const def = VEHICLE_DEFS[c.model];
    const boost = c.nitroBurn > 0 ? 1.6 : 1;
    const engineMul = 1 + 0.15 * g.garage.engine;
    if (keys.w) c.speed += c.accel * engineMul * boost * dt;
    else if (keys.s) c.speed -= (c.speed > 0.5 ? 22 : 9) * dt;
    else c.speed -= Math.sign(c.speed) * 6 * dt;
    if (Math.abs(c.speed) < 0.2 && !keys.w && !keys.s) c.speed = 0;
    const top = c.top * engineMul * (c.nitroBurn > 0 ? 1.25 : 1);
    c.speed = Math.max(-9, Math.min(top, c.speed));
    if (Math.abs(c.speed) > 0.5) {
      const steer = (keys.a ? 1 : 0) - (keys.d ? 1 : 0);
      c.heading += steer * c.turn * dt * Math.min(1, Math.abs(c.speed) / 8) * (c.speed >= 0 ? 1 : -1);
    }
    c.x += Math.sin(c.heading) * c.speed * dt;
    c.z += Math.cos(c.heading) * c.speed * dt;
    c.x = Math.max(-215, Math.min(215, c.x));
    c.z = Math.max(-215, Math.min(215, c.z));
    if (c.nitroBurn > 0) c.nitroBurn -= dt;
    collideBuildings(g, c);
    g.player.x = c.x; g.player.z = c.z; g.player.heading = c.heading;
  }
  // Traffic AI: cruise the roads, slow for cars ahead, turn at intersections.
  for (const c of g.cars) {
    if (!c.traffic || c.exploded) continue;
    let ahead = null;
    for (const o of g.cars) {
      if (o === c || o.exploded) continue;
      const dx = o.x - c.x, dz = o.z - c.z;
      const along = dx * Math.sin(c.heading) + dz * Math.cos(c.heading);
      const side = Math.abs(dx * Math.cos(c.heading) - dz * Math.sin(c.heading));
      if (along > 0 && along < 12 && side < 3) { ahead = o; break; }
    }
    const target = ahead ? Math.min(c.speed, ahead.speed) : c.top * 0.45;
    c.speed += Math.sign(target - c.speed) * 8 * dt;
    c.x += Math.sin(c.heading) * c.speed * dt;
    c.z += Math.cos(c.heading) * c.speed * dt;
    const atX = Math.abs(c.x) > 205, atZ = Math.abs(c.z) > 205;
    if (atX || atZ) c.heading += Math.PI / 2;
    // Occasional turn at an intersection.
    const nearX = g.city.roadsX.some((r) => Math.abs(c.x - r) < 2);
    const nearZ = g.city.roadsZ.some((r) => Math.abs(c.z - r) < 2);
    if (nearX && nearZ && g.rng.chance(dt * 0.25)) c.heading += g.rng.pick([-Math.PI / 2, Math.PI / 2]);
  }
  // Car-car collisions: hard hits damage, lethal hits explode.
  for (let i = 0; i < g.cars.length; i += 1) {
    for (let j = i + 1; j < g.cars.length; j += 1) {
      const a = g.cars[i], b = g.cars[j];
      const dx = b.x - a.x, dz = b.z - a.z;
      const d = Math.hypot(dx, dz);
      if (d < 3.4 && d > 0.01) {
        const rel = Math.abs(a.speed - b.speed) + Math.abs(Math.sin(a.heading - b.heading)) * 6;
        const push = (3.4 - d) / 2;
        const nx = dx / d, nz = dz / d;
        a.x -= nx * push; a.z -= nz * push;
        b.x += nx * push; b.z += nz * push;
        if (rel > 8) {
          const armor = g.garage.armor * 0.25;
          const dmg = rel * 0.55 * (1 - armor);
          a.health -= dmg; b.health -= dmg;
          a.speed *= 0.5; b.speed *= 0.5;
          if (a.health <= 0) explodeCar(g, a);
          if (b.health <= 0 && !b.exploded) explodeCar(g, b);
        }
      }
    }
  }
  // Wrecks burn on; booms and flash fade. Exploded cars leave the fleet now
  // (deferred removal: splicing inside the collision loop would corrupt it).
  if (g.cars.some((c) => c.exploded)) g.cars = g.cars.filter((c) => !c.exploded);
  for (const w of g.wrecks) w.t += dt;
  for (let i = g.booms.length - 1; i >= 0; i -= 1) {
    g.booms[i].t += dt;
    if (g.booms[i].t > 2.5) g.booms.splice(i, 1);
  }
  if (g.flash > 0) g.flash = Math.max(0, g.flash - dt * 1.4);
  updateCops(g, dt);
}

export function addWanted(g, n) {
  if (g.player.heatLock) return;
  g.player.wanted = Math.max(0, Math.min(5, g.player.wanted + n));
  g.player.lastCrime = g.time;
}

export function updateCops(g, dt) {
  const want = g.player.wanted;
  const target = want === 0 ? 0 : Math.min(6, want * 2);
  // Spawn up to the target, in dispatch-roster order so RAM/PIT arrive at 3 stars.
  while (g.cops.length < target) {
    const unit = DISPATCH_UNITS[g.cops.length % DISPATCH_UNITS.length];
    const a = g.rng.range(0, Math.PI * 2);
    const cop = {
      id: nextCopId, kind: unit.kind, name: unit.name, role: unit.role,
      x: g.player.x + Math.cos(a) * 60, z: g.player.z + Math.sin(a) * 60,
      heading: 0, speed: 0, health: 100,
    };
    nextCopId += 1;
    g.cops.push(cop);
  }
  while (g.cops.length > target) g.cops.pop();
  for (const cop of g.cops) {
    const dx = g.player.x - cop.x, dz = g.player.z - cop.z;
    const d = Math.hypot(dx, dz) || 1;
    const wantHeading = Math.atan2(dx, dz);
    let dh = wantHeading - cop.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    cop.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, dh));
    const cs = cop.kind === 'ram' ? 30 : 26;
    cop.speed = Math.min(cs, cop.speed + 14 * dt);
    cop.x += Math.sin(cop.heading) * cop.speed * dt;
    cop.z += Math.cos(cop.heading) * cop.speed * dt;
    if (d < 4 && g.car) {
      g.car.health -= 2 * dt;
      g.car.speed *= (1 - 0.4 * dt);
      if (g.car.health <= 0) explodeCar(g, g.car);
    }
  }
  // Air One: helicopter locks on at 3+ stars.
  g.heli.active = want >= 3;
  if (g.heli.active) {
    g.heli.x += (g.player.x - g.heli.x) * Math.min(1, dt * 0.8);
    g.heli.z += (g.player.z - g.heli.z) * Math.min(1, dt * 0.8);
    g.heli.locked = true;
  } else g.heli.locked = false;
}
