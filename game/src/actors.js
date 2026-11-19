// People: the player on foot, the pedestrians who fill the sidewalks, and
// the foot cops who chase a wanted player down. Pedestrians wander, flee from
// gunfire and crashes, and sometimes flag a taxi.
import { PLAYER, POLICE, PED, WORLD } from './config.js';
import { groundAt, resolveCircle } from './city.js';
import { range } from './random.js';

const SKINS = ['#f2c89b', '#c98d5f', '#8a5a3b', '#e8b88a', '#a06a42'];
const SHIRTS = ['#e84a4a', '#3d7bfd', '#43a85a', '#f2b705', '#8a6fbf', '#e87ab0', '#3fa7a0', '#e8e2d4'];

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2,
    health: PLAYER.health,
    onFoot: true,
    car: null,
    weapon: 'fists',
    ammo: 0,
    cash: 150,
    wanted: 0,
    wantedTimer: 0,
    punchCooldown: 0,
    shootCooldown: 0,
    hurtFlash: 0,
    run: false,
    moving: false,
  };
}

/** Step the player on foot. Returns an event string ('punch', 'shot') or null. */
export function stepPlayerOnFoot(player, axes, dt, city, aimAngle, firing, peds, cops) {
  const speed = player.run ? PLAYER.runSpeed : PLAYER.walkSpeed;
  const len = Math.hypot(axes.x, axes.y);
  player.moving = len > 0;
  if (len > 0) {
    const nx = player.x + (axes.x / len) * speed * dt;
    const ny = player.y + (axes.y / len) * speed * dt;
    const hit = resolveCircle(city, nx, ny, PLAYER.radius);
    player.x = hit.x;
    player.y = hit.y;
    player.angle = Math.atan2(axes.y, axes.x);
  }
  if (player.weapon === 'pistol' && firing !== undefined) {
    player.angle = aimAngle;
  }
  if (player.punchCooldown > 0) player.punchCooldown -= dt;
  if (player.shootCooldown > 0) player.shootCooldown -= dt;
  if (player.hurtFlash > 0) player.hurtFlash -= dt;
  void peds; void cops;
  return null;
}

/** A punch: hurt peds and cops in front of the player. Returns hits. */
export function punch(player, peds, cops, audio) {
  if (player.punchCooldown > 0) return 0;
  player.punchCooldown = 0.45;
  let hits = 0;
  const hitOne = (target) => {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d > PLAYER.punchRange + 12) return;
    const ang = Math.atan2(dy, dx);
    let diff = ang - player.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < PLAYER.punchArc) {
      target.health = (target.health ?? 50) - PLAYER.punchDamage;
      target.flee = 2.5;
      target.hitFlash = 0.3;
      hits += 1;
    }
  };
  for (const ped of peds) hitOne(ped);
  for (const cop of cops) hitOne(cop);
  if (audio) audio.punch();
  return hits;
}

/** A pistol shot toward the aim angle. Returns the first thing hit, if any. */
export function shoot(player, aimAngle, peds, cops, cars, audio) {
  if (player.weapon !== 'pistol' || player.ammo <= 0 || player.shootCooldown > 0) return null;
  player.shootCooldown = 0.28;
  player.ammo -= 1;
  if (audio) audio.shoot();
  const rangeMax = 520;
  let best = null;
  let bestD = rangeMax;
  const consider = (target, radius, kind) => {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const along = dx * Math.cos(aimAngle) + dy * Math.sin(aimAngle);
    if (along < 0 || along > bestD) return;
    const side = Math.abs(-dx * Math.sin(aimAngle) + dy * Math.cos(aimAngle));
    if (side < radius + 8) { best = { target, kind, dist: along }; bestD = along; }
  };
  for (const ped of peds) consider(ped, 13, 'ped');
  for (const cop of cops) consider(cop, 13, 'cop');
  for (const car of cars) consider(car, 26, 'car');
  if (best) {
    if (best.kind === 'ped' || best.kind === 'cop') {
      best.target.health = (best.target.health ?? 50) - 34;
      best.target.flee = 3;
      best.target.hitFlash = 0.3;
    } else if (best.kind === 'car') {
      best.target.crashed = 0.5;
    }
  }
  return best;
}

/** Spawn a pedestrian on a sidewalk near a road. */
export function spawnPed(random, city) {
  const x = range(random, 200, WORLD.width - 200);
  const y = range(random, 200, WORLD.height - 400);
  return {
    x, y,
    angle: range(random, 0, Math.PI * 2),
    speed: range(random, PED.walkSpeed * 0.7, PED.walkSpeed * 1.3),
    skin: SKINS[Math.floor(random() * SKINS.length)],
    shirt: SHIRTS[Math.floor(random() * SHIRTS.length)],
    health: 50,
    flee: 0,
    hitFlash: 0,
    taxi: random() < 0.16,
    wait: range(random, 0, 4),
    wander: range(random, 2, 6),
  };
}

/** Step one pedestrian: wander, wait, or flee from danger. */
export function stepPed(ped, dt, city, danger) {
  if (ped.health <= 0) return;
  if (ped.hitFlash > 0) ped.hitFlash -= dt;
  let speed = ped.speed;
  let dir = ped.angle;
  if (ped.flee > 0) {
    ped.flee -= dt;
    speed = PED.fleeSpeed;
    if (danger) dir = Math.atan2(ped.y - danger.y, ped.x - danger.x);
  } else if (ped.taxi) {
    speed = 0;
  } else {
    ped.wander -= dt;
    if (ped.wander <= 0) {
      ped.wander = range(Math.random, 2, 6);
      ped.angle = range(Math.random, 0, Math.PI * 2);
    }
    if (ped.wait > 0) { ped.wait -= dt; speed = 0; }
  }
  if (speed > 0) {
    const nx = ped.x + Math.cos(dir) * speed * dt;
    const ny = ped.y + Math.sin(dir) * speed * dt;
    const ground = groundAt(nx, ny);
    if (ground !== 'sea') {
      const hit = resolveCircle(city, nx, ny, 12);
      ped.x = hit.x;
      ped.y = hit.y;
    }
    ped.angle = dir;
  }
}

/** Spawn a foot cop at the edge of the player's view. */
export function spawnCop(x, y) {
  return {
    x, y, angle: 0, health: 60,
    speed: POLICE.footSpeed,
    punchCooldown: 0, hitFlash: 0, flee: 0,
    shootCooldown: 0,
  };
}

/** Step one foot cop: run at the player and punch when close. Returns 'busted' if caught. */
export function stepCop(cop, player, dt, city, audio) {
  if (cop.health <= 0) return null;
  if (cop.hitFlash > 0) cop.hitFlash -= dt;
  if (cop.punchCooldown > 0) cop.punchCooldown -= dt;
  const dx = player.x - cop.x;
  const dy = player.y - cop.y;
  const d = Math.hypot(dx, dy);
  if (d < POLICE.bustRadius && player.onFoot && player.wanted > 0) {
    if (cop.punchCooldown <= 0) {
      cop.punchCooldown = 0.9;
      player.health -= POLICE.punchDamage;
      player.hurtFlash = 0.3;
      if (audio) audio.punch();
      if (player.health <= 0) return 'wasted';
    }
    return null;
  }
  if (d > 4) {
    const nx = cop.x + (dx / d) * cop.speed * dt;
    const ny = cop.y + (dy / d) * cop.speed * dt;
    const hit = resolveCircle(city, nx, ny, 12);
    cop.x = hit.x;
    cop.y = hit.y;
    cop.angle = Math.atan2(dy, dx);
  }
  return null;
}
