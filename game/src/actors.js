// Solmar Heat v9 — people.
// Everyone on foot and everyone behind a wheel lives here: the player,
// the walkers on the sidewalks, the cops (patrol, RAM and PIT), and the
// hired mates who watch Leo's back. Combat is simple and close-range:
// fists up close, guns at a distance, and a cop who sits on you long
// enough will bust you.

import { HEAT, POLICE, WEAPONS } from './config.js';
import { spawnCar, damageCar, carDistance } from './vehicles.js';

export function spawnPlayer(x, z) {
  return {
    x, z,
    heading: 0,
    speed: 0,
    cash: 400,
    respect: 0,
    districtStanding: { marina: 0, oldtown: 0, docks: 0, hills: 0, downtown: 0 },
    wanted: 0,
    health: 100,
    inCar: false,
    weapon: 0,
    weapons: [true, false, false, false],
    color: 0xc1272d,
  };
}

export function spawnWalker(x, z) {
  return {
    x, z,
    heading: Math.random() * Math.PI * 2,
    speed: 0,
    state: 'walk',
    panic: 0,
    route: null,
    routeAt: 0,
    color: 0x888888,
  };
}

export function spawnCop(x, z, kind) {
  const model = kind === 'ram' ? 'ram' : kind === 'pit' ? 'pit' : 'cop';
  const car = spawnCar(model, x, z, 0);
  car.kind = kind || 'patrol';
  car.bustMeter = 0;
  car.pitSide = 1;
  car.pitTimer = 0;
  return car;
}

export function spawnMate(id, x, z) {
  const colors = { milo: 0x4f7ad9, vera: 0x9a4fd9, tank: 0x4fd97a };
  return { id, x, z, heading: 0, speed: 0, state: 'follow', punchAt: 0, color: colors[id] || 0x888888 };
}

function blockedByBuilding(world, x, z, pad) {
  for (const b of world.city.buildings) {
    if (Math.abs(x - b.x) < b.w / 2 + pad && Math.abs(z - b.z) < b.d / 2 + pad) return true;
  }
  return false;
}

export function movePlayer(player, input, dt, world) {
  const run = input.run ? 11 : 6;
  let mx = 0;
  let mz = 0;
  if (input.up) mz = mz + 1;
  if (input.down) mz = mz - 1;
  if (input.left) mx = mx - 1;
  if (input.right) mx = mx + 1;
  if (mx === 0 && mz === 0) {
    player.speed = 0;
    return 0;
  }
  const len = Math.sqrt(mx * mx + mz * mz);
  const step = run * dt;
  const nx = player.x + (mx / len) * step;
  const nz = player.z + (mz / len) * step;
  if (blockedByBuilding(world, nx, nz, 0.6)) {
    player.speed = 0;
    return 0;
  }
  const half = world.city.half;
  player.x = Math.max(-half, Math.min(half, nx));
  player.z = Math.max(-half, Math.min(half, nz));
  player.heading = Math.atan2(mx / len, mz / len);
  player.speed = run;
  return step;
}

export function advanceWalker(walker, dt, world) {
  if (walker.state === 'flee') {
    walker.panic = Math.max(0, walker.panic - dt * 0.4);
    if (walker.panic <= 0) walker.state = 'walk';
    const dx = walker.x - world.player.x;
    const dz = walker.z - world.player.z;
    const d = Math.sqrt(dx * dx + dz * dz) || 1;
    walker.x = walker.x + (dx / d) * 9 * dt;
    walker.z = walker.z + (dz / d) * 9 * dt;
    walker.heading = Math.atan2(dx / d, dz / d);
    return;
  }
  if (!walker.route || walker.route.length === 0) return;
  const target = walker.route[walker.routeAt % walker.route.length];
  const dx = target.x - walker.x;
  const dz = target.z - walker.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist < 1.5) {
    walker.routeAt = walker.routeAt + 1;
    return;
  }
  walker.x = walker.x + (dx / dist) * 2.2 * dt;
  walker.z = walker.z + (dz / dist) * 2.2 * dt;
  walker.heading = Math.atan2(dx / dist, dz / dist);
  walker.speed = 2.2;
}

function turnToward(heading, want, maxTurn) {
  let diff = want - heading;
  while (diff > Math.PI) diff = diff - Math.PI * 2;
  while (diff < -Math.PI) diff = diff + Math.PI * 2;
  return heading + Math.max(-maxTurn, Math.min(maxTurn, diff));
}

export function advanceCop(cop, world, dt) {
  const player = world.player;
  const target = world.car || player;
  const tx = target.x;
  const tz = target.z;
  let aimX = tx;
  let aimZ = tz;
  let cruise = POLICE.patrolSpeed;
  if (cop.kind === 'ram') {
    cruise = POLICE.ramSpeed;
    const lead = 0.6;
    aimX = tx + Math.sin(target.heading || 0) * (target.speed || 0) * lead;
    aimZ = tz + Math.cos(target.heading || 0) * (target.speed || 0) * lead;
  } else if (cop.kind === 'pit') {
    cruise = POLICE.pitSpeed;
    cop.pitTimer = cop.pitTimer + dt;
    if (cop.pitTimer > 4) {
      cop.pitTimer = 0;
      cop.pitSide = -cop.pitSide;
    }
    const fx = Math.sin(target.heading || 0);
    const fz = Math.cos(target.heading || 0);
    const px = Math.cos(target.heading || 0) * cop.pitSide;
    const pz = -Math.sin(target.heading || 0) * cop.pitSide;
    aimX = tx - fx * 4 + px * 2.5;
    aimZ = tz - fz * 4 + pz * 2.5;
  }
  const dx = aimX - cop.x;
  const dz = aimZ - cop.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist > 1) {
    cop.heading = turnToward(cop.heading, Math.atan2(dx, dz), 2.4 * dt);
  }
  cop.speed = cop.speed + (cruise - cop.speed) * Math.min(1, dt * 0.7);
  cop.x = cop.x + Math.sin(cop.heading) * cop.speed * dt;
  cop.z = cop.z + Math.cos(cop.heading) * cop.speed * dt;
  const half = world.city.half;
  if (Math.abs(cop.x) > half || Math.abs(cop.z) > half) {
    cop.heading = cop.heading + Math.PI;
    cop.x = Math.max(-half, Math.min(half, cop.x));
    cop.z = Math.max(-half, Math.min(half, cop.z));
  }
  // Contact with the player's car: RAM hits hard, PIT spins it.
  if (world.car && carDistance(cop, world.car) < 3.4) {
    if (cop.kind === 'ram') {
      damageCar(world.car, POLICE.ramDamage * dt * 2, world);
      world.car.speed = world.car.speed * 0.85;
    } else if (cop.kind === 'pit') {
      world.car.heading = world.car.heading + POLICE.pitSpin * dt * cop.pitSide;
      world.car.speed = world.car.speed * 0.92;
      damageCar(world.car, 6 * dt, world);
    } else {
      world.car.speed = world.car.speed * 0.94;
    }
  }
}

export function copBusts(cop, player) {
  const dx = cop.x - player.x;
  const dz = cop.z - player.z;
  const d = Math.sqrt(dx * dx + dz * dz);
  // main.js keeps player.carSpeed fresh; if it is missing, assume the
  // player is moving (a bust must never fire on a guess).
  const speed = player.inCar
    ? (player.carSpeed === undefined ? 99 : Math.abs(player.carSpeed))
    : Math.abs(player.speed || 0);
  return d < HEAT.bustRange && speed < 3;
}

export function advanceMate(mate, world, dt) {
  const player = world.player;
  const dx = player.x - mate.x;
  const dz = player.z - mate.z;
  const dist = Math.sqrt(dx * dx + dz * dz);
  if (dist > 5) {
    mate.x = mate.x + (dx / dist) * 8 * dt;
    mate.z = mate.z + (dz / dist) * 8 * dt;
    mate.heading = Math.atan2(dx / dist, dz / dist);
    mate.speed = 8;
  } else {
    mate.speed = 0;
  }
  mate.punchAt = mate.punchAt - dt;
  if (mate.punchAt <= 0) {
    matePunch(mate, world);
    mate.punchAt = 0.8;
  }
}

export function matePunch(mate, world) {
  for (const ped of world.peds || []) {
    if (ped.state === 'flee' && carDistance(mate, ped) < 2.5) {
      ped.panic = 3;
      return true;
    }
  }
  return false;
}

export function playerPunch(player, world) {
  let hit = false;
  for (const ped of world.peds || []) {
    if (carDistance(player, ped) < 2.5) {
      ped.state = 'flee';
      ped.panic = 2;
      hit = true;
    }
  }
  for (const cop of world.cops || []) {
    if (carDistance(player, cop) < 2.5) {
      damageCar(cop, 12, world);
      player.wanted = Math.min(5, player.wanted + 1);
      hit = true;
    }
  }
  if (hit) (world.sfx || (world.sfx = [])).push('punch');
  return hit;
}

export function playerShoot(player, world) {
  const def = WEAPONS[player.weapon] || WEAPONS[0];
  if (player.weapon === 0) return playerPunch(player, world);
  const fx = Math.sin(player.heading);
  const fz = Math.cos(player.heading);
  let best = null;
  let bestD = def.range;
  const consider = (obj) => {
    const dx = obj.x - player.x;
    const dz = obj.z - player.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d > def.range || d < 0.5) return;
    const dot = (dx * fx + dz * fz) / d;
    if (dot < 0.9) return;
    if (d < bestD) {
      bestD = d;
      best = obj;
    }
  };
  for (const car of world.cars || []) consider(car);
  for (const cop of world.cops || []) consider(cop);
  for (const ped of world.peds || []) consider(ped);
  (world.sfx || (world.sfx = [])).push('shot');
  if (!best) return false;
  if (best.health !== undefined) {
    damageCar(best, def.damage, world);
  } else {
    best.state = 'flee';
    best.panic = 3;
  }
  player.wanted = Math.min(5, player.wanted + 1);
  return true;
}

export function hurtPlayer(player, amount) {
  player.health = Math.max(0, player.health - amount);
  if (player.health <= 0) {
    player.health = 100;
    player.cash = Math.floor(player.cash * 0.9);
    player.wanted = 0;
    player.x = -6;
    player.z = 150;
    player.inCar = false;
  }
}

export function healPlayer(player, amount) {
  player.health = Math.min(100, player.health + amount);
}
