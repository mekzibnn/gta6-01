// People — the player, the crowd, the cops, the crew (v6 rewrite).
// Everyone on foot shares one body: a position, a heading, a speed and a
// mood. The player walks, runs and fights; pedestrians stroll the sidewalks
// and scatter when a chase passes; cops close in and try to bust the player;
// hired crew mates trail the player and throw punches beside him.

import { WORLD } from './config.js';
import { dicePick, diceRange } from './random.js';

export function spawnPlayer(x, z) {
  return {
    kind: 'player',
    x,
    z,
    heading: 0,
    speed: 0,
    walkSpeed: 5,
    runSpeed: 9,
    health: 100,
    cash: 5000,
    wanted: 0,
    respect: 0,
    inCar: false,
    carId: null,
    weapon: 0,
    ammo: { 1: 18, 2: 60, 3: 8 },
    punching: 0,
    shooting: 0,
  };
}

export function spawnWalker(dice, city) {
  const route = walkerRoute(dice, city);
  return {
    kind: 'ped',
    id: `ped-${Math.floor(dice() * 1e9)}`,
    x: route[0].x,
    z: route[0].z,
    heading: 0,
    speed: diceRange(dice, 1.2, 2.4),
    route,
    leg: 0,
    state: 'stroll',
    panic: 0,
    color: dicePick(dice, [0xe2725b, 0x4f9d8f, 0xe8b04b, 0x7a6ff0, 0xc65d7b, 0x5b8c5a]),
  };
}

export function walkerRoute(dice, city) {
  // A sidewalk loop: pick a block, walk its four corners, repeat.
  const ax = dicePick(dice, city.avenues);
  const az = dicePick(dice, city.streets);
  const half = WORLD.block / 2 - 6;
  return [
    { x: ax - half, z: az - half },
    { x: ax + half, z: az - half },
    { x: ax + half, z: az + half },
    { x: ax - half, z: az + half },
  ];
}

export function spawnCop(x, z, stars) {
  return {
    kind: 'cop',
    x,
    z,
    heading: 0,
    speed: 7 + stars * 0.6,
    health: 100,
    state: 'chase',
    bustRange: 2.2,
    swings: 0,
  };
}

export function spawnMate(crewId, x, z) {
  return {
    kind: 'mate',
    crewId,
    x,
    z,
    heading: 0,
    speed: 8,
    health: 100,
    state: 'follow',
    punchCooldown: 0,
  };
}

export function advanceWalker(w, dt) {
  const target = w.route[w.leg];
  const dx = target.x - w.x;
  const dz = target.z - w.z;
  const d = Math.sqrt(dx * dx + dz * dz);
  const pace = w.state === 'flee' ? w.speed * 2.4 : w.speed;
  if (d < 1.5) {
    w.leg = (w.leg + 1) % w.route.length;
    return w;
  }
  w.heading = Math.atan2(dx, dz);
  w.x += (dx / d) * pace * dt;
  w.z += (dz / d) * pace * dt;
  if (w.panic > 0) w.panic -= dt;
  else if (w.state === 'flee') w.state = 'stroll';
  return w;
}

export function scareWalkers(walkers, x, z, radius) {
  for (const w of walkers) {
    const dx = w.x - x;
    const dz = w.z - z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < radius) {
      w.state = 'flee';
      w.panic = 3;
      // Run away from the scare, not toward it.
      w.route = [{ x: w.x + (dx / (d || 1)) * 40, z: w.z + (dz / (d || 1)) * 40 }];
      w.leg = 0;
    }
  }
  return walkers;
}

export function advanceCop(cop, player, dt) {
  const dx = player.x - cop.x;
  const dz = player.z - cop.z;
  const d = Math.sqrt(dx * dx + dz * dz) || 1;
  cop.heading = Math.atan2(dx, dz);
  if (d > cop.bustRange) {
    cop.x += (dx / d) * cop.speed * dt;
    cop.z += (dz / d) * cop.speed * dt;
  }
  return cop;
}

export function copBusts(cop, player) {
  const dx = player.x - cop.x;
  const dz = player.z - cop.z;
  return Math.sqrt(dx * dx + dz * dz) <= cop.bustRange;
}

export function advanceMate(mate, player, dt) {
  const dx = player.x - mate.x;
  const dz = player.z - mate.z;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d > 4) {
    mate.heading = Math.atan2(dx, dz);
    mate.x += (dx / d) * mate.speed * dt;
    mate.z += (dz / d) * mate.speed * dt;
  }
  if (mate.punchCooldown > 0) mate.punchCooldown -= dt;
  return mate;
}

export function matePunch(mate, target, damage) {
  if (mate.punchCooldown > 0) return 0;
  const dx = target.x - mate.x;
  const dz = target.z - mate.z;
  if (Math.sqrt(dx * dx + dz * dz) > 3.5) return 0;
  mate.punchCooldown = 1.2;
  target.health -= damage;
  return damage;
}

export function playerPunch(player, target, damageBoost) {
  const dx = target.x - player.x;
  const dz = target.z - player.z;
  if (Math.sqrt(dx * dx + dz * dz) > 3) return 0;
  const hit = 12 * (damageBoost || 1);
  target.health -= hit;
  player.punching = 0.25;
  return hit;
}

export function playerShoot(player, target, weapon, damageBoost) {
  if (player.weapon === 0) return 0;
  const slot = player.ammo[player.weapon];
  if (!slot || slot <= 0) return 0;
  player.ammo[player.weapon] -= 1;
  const base = [0, 22, 16, 45][player.weapon] || 10;
  const hit = base * (damageBoost || 1);
  target.health -= hit;
  player.shooting = 0.2;
  return hit;
}

export function hurtPlayer(player, amount, soak) {
  const taken = amount * (1 - (soak || 0));
  player.health -= taken;
  if (player.health < 0) player.health = 0;
  return taken;
}

export function healPlayer(player, amount) {
  player.health = Math.min(100, player.health + amount);
  return player.health;
}

export function movePlayer(player, move, dt) {
  // move: { x -1..1, z -1..1, run bool } — on-foot steering.
  const pace = move.run ? player.runSpeed : player.walkSpeed;
  const mx = move.x || 0;
  const mz = move.z || 0;
  const len = Math.sqrt(mx * mx + mz * mz) || 1;
  player.x += (mx / len) * pace * dt * (mx || mz ? 1 : 0);
  player.z += (mz / len) * pace * dt * (mx || mz ? 1 : 0);
  if (mx || mz) player.heading = Math.atan2(mx, mz);
  player.speed = (mx || mz) ? pace : 0;
  const m = WORLD.halfSize - 4;
  player.x = Math.max(-m, Math.min(m, player.x));
  player.z = Math.max(-m, Math.min(m, player.z));
  return player;
}
