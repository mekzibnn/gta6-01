// People: the player on foot, the pedestrians who fill the sidewalks, and
// the foot cops who chase a wanted player down. Pedestrians wander, flee from
// gunfire and crashes, and sometimes flag a taxi.
import { PLAYER, POLICE, PED, WORLD, WEAPONS } from './config.js';
import { groundAt, resolveCircle } from './city.js';
import { range } from './random.js';

const SKINS = ['#f2c89b', '#c98d5f', '#8a5a3b', '#e8b88a', '#a06a42'];
const SHIRTS = ['#e84a4a', '#3d7bfd', '#43a85a', '#f2b705', '#8a6fbf', '#e87ab0', '#3fa7a0', '#e8e2d4'];

/** Angle difference wrapped to [-PI, PI]. */
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// ---------------------------------------------------------------------------
// The player
// ---------------------------------------------------------------------------

export function createPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2,
    health: PLAYER.health,
    onFoot: true,
    car: null,
    weapon: 'fists',
    ammo: { pistol: 0, smg: 0, shotgun: 0 },
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
  const strike = (target) => {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const d = Math.hypot(dx, dy);
    if (d > PLAYER.punchRange + 12) return;
    const ang = Math.atan2(dy, dx);
    if (Math.abs(angleDiff(ang, player.angle)) < PLAYER.punchArc) {
      target.health = (target.health ?? 50) - PLAYER.punchDamage;
      target.flee = 2.5;
      target.hitFlash = 0.3;
      hits += 1;
    }
  };
  for (const ped of peds) strike(ped);
  for (const cop of cops) strike(cop);
  if (audio) audio.punch();
  return hits;
}

/** A shot from the current weapon: pistol, SMG (fast) or shotgun (spread).
 * Returns the first thing hit (shotgun: the nearest of up to three), if any. */
export function shoot(player, aimAngle, peds, cops, cars, audio) {
  const spec = WEAPONS[player.weapon];
  if (!spec || player.weapon === 'fists') return null;
  if ((player.ammo[player.weapon] || 0) <= 0 || player.shootCooldown > 0) return null;
  player.shootCooldown = spec.cooldown;
  player.ammo[player.weapon] -= 1;
  if (audio) audio.shoot();
  const rangeMax = 520;
  const spread = player.weapon === 'shotgun' ? 26 : 8;
  const hits = [];
  const testTarget = (target, radius, kind) => {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const along = dx * Math.cos(aimAngle) + dy * Math.sin(aimAngle);
    if (along < 0 || along > rangeMax) return;
    const side = Math.abs(-dx * Math.sin(aimAngle) + dy * Math.cos(aimAngle));
    if (side < radius + spread) hits.push({ target, kind, dist: along });
  };
  for (const ped of peds) testTarget(ped, 13, 'ped');
  for (const cop of cops) testTarget(cop, 13, 'cop');
  for (const car of cars) testTarget(car, 26, 'car');
  hits.sort((a, b) => a.dist - b.dist);
  const take = player.weapon === 'shotgun' ? hits.slice(0, 3) : hits.slice(0, 1);
  for (const hit of take) {
    if (hit.kind === 'ped' || hit.kind === 'cop') {
      hit.target.health = (hit.target.health ?? 50) - spec.damage;
      hit.target.flee = 3;
      hit.target.hitFlash = 0.3;
    } else if (hit.kind === 'car') {
      hit.target.crashed = 0.5;
    }
  }
  return take[0] || null;
}

// ---------------------------------------------------------------------------
// Pedestrians
// ---------------------------------------------------------------------------

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
    // The ped mind (peds.js) fills these in on first sight: a role, the
    // route it walks, where it is on that route, and its panic level.
    role: null,
    roleSpeed: 1,
    rolePause: 0,
    route: null,
    routeIndex: 0,
    pauseTimer: 0,
    panic: 0,
    // Walking together: a partner ped (or null), and which side of the
    // route this one walks on when paired.
    partner: null,
    pairSide: 1,
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

// ---------------------------------------------------------------------------
// Foot cops
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// The crew: Dante and Rosa. They join once Leo earns Street King respect and
// fight beside him — they follow at a distance and shoot the nearest cop.
// ---------------------------------------------------------------------------

/** Spawn a crew member near the player. */
export function createCrewMember(name, x, y, skin, shirt) {
  return {
    name, x, y, angle: 0, health: 80,
    skin, shirt, speed: 210,
    shootCooldown: 0, hitFlash: 0, flee: 0, crew: true,
  };
}

/** Step one crew member: follow the player, shoot the nearest cop in range. */
export function stepCrew(member, player, cops, policeCars, dt, city, audio) {
  if (member.health <= 0) return;
  if (member.hitFlash > 0) member.hitFlash -= dt;
  const dx = player.x - member.x;
  const dy = player.y - member.y;
  const d = Math.hypot(dx, dy);
  if (d > 90) {
    const nx = member.x + (dx / d) * member.speed * dt;
    const ny = member.y + (dy / d) * member.speed * dt;
    const hit = resolveCircle(city, nx, ny, 12);
    member.x = hit.x;
    member.y = hit.y;
    member.angle = Math.atan2(dy, dx);
  }
  member.shootCooldown -= dt;
  let target = null;
  let bestD = 320;
  for (const cop of cops) {
    if (cop.health <= 0) continue;
    const cd = Math.hypot(cop.x - member.x, cop.y - member.y);
    if (cd < bestD) { bestD = cd; target = cop; }
  }
  if (target && member.shootCooldown <= 0) {
    member.shootCooldown = 1.1;
    target.health -= 20;
    target.hitFlash = 0.3;
    target.flee = 1;
    member.angle = Math.atan2(target.y - member.y, target.x - member.x);
    if (audio) audio.shoot();
  }
  void policeCars;
}
