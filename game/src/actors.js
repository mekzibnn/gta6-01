// The player on foot and the police for Solmar Heat.
// Wanted stars bring the cops: patrol cars at one star, RAM and PIT
// specialists from three. The Heat Wave mission locks the heat at five.

import { WANTED, CAR } from './config.js';
import { decayBonus } from './crew.js';
import { nextVehicleId, explodeCar } from './vehicles.js';
import { heatLock } from './missions.js';

// Walk speed on foot.
const WALK_SPEED = 6;

// Move the player on foot from the held keys. Returns metres walked.
export function updatePlayer(game, dt) {
  if (game.player.inCar) return 0;
  const keys = game.keys;
  let mx = 0;
  let mz = 0;
  if (keys.has('KeyW')) mz += 1;
  if (keys.has('KeyS')) mz -= 1;
  if (keys.has('KeyA')) mx -= 1;
  if (keys.has('KeyD')) mx += 1;
  if (mx === 0 && mz === 0) return 0;
  const len = Math.hypot(mx, mz);
  const step = WALK_SPEED * dt;
  const dx = (mx / len) * step;
  const dz = (mz / len) * step;
  game.player.x += dx;
  game.player.z += dz;
  game.player.heading = Math.atan2(dx, dz);
  return Math.hypot(dx, dz);
}

// How many cops the wanted level calls for.
function desiredCops(wanted) {
  return Math.min(10, wanted * WANTED.copsPerStar);
}

// Spawn one cop near the player, on a road, of the given kind.
function spawnCop(game, kind) {
  const angle = game.rng.range(0, Math.PI * 2);
  const dist = game.rng.range(30, 50);
  return {
    id: nextVehicleId(),
    kind,
    x: game.player.x + Math.sin(angle) * dist,
    z: game.player.z + Math.cos(angle) * dist,
    heading: 0,
    speed: 0,
    topSpeed: 38,
    health: 120,
    ramCooldown: 0,
  };
}

// Keep the cop roster matched to the wanted level, with a RAM and a PIT
// unit from three stars up.
export function updateCops(game, dt) {
  const wanted = game.player.wanted;
  if (wanted <= 0) {
    game.cops.length = 0;
    return;
  }
  const want = desiredCops(wanted);
  while (game.cops.length < want) {
    let kind = 'patrol';
    if (wanted >= WANTED.ramAt && !game.cops.some((c) => c.kind === 'ram')) kind = 'ram';
    else if (wanted >= WANTED.pitAt && !game.cops.some((c) => c.kind === 'pit')) kind = 'pit';
    game.cops.push(spawnCop(game, kind));
  }
  while (game.cops.length > want) game.cops.pop();

  const tx = game.car ? game.car.x : game.player.x;
  const tz = game.car ? game.car.z : game.player.z;
  for (const cop of game.cops) {
    if (cop.ramCooldown > 0) cop.ramCooldown -= dt;
    // Steer toward the target: straight at it for RAM, alongside for PIT.
    let aimX = tx;
    let aimZ = tz;
    if (cop.kind === 'pit') {
      aimX = tx + Math.cos(game.player.heading) * 6;
      aimZ = tz - Math.sin(game.player.heading) * 6;
    }
    const wantHeading = Math.atan2(aimX - cop.x, aimZ - cop.z);
    let diff = wantHeading - cop.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cop.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    cop.speed = Math.min(cop.topSpeed, cop.speed + 14 * dt);
    cop.x += Math.sin(cop.heading) * cop.speed * dt;
    cop.z += Math.cos(cop.heading) * cop.speed * dt;
    // A ram that connects hurts the player's car, then backs off.
    if (game.car && !game.car.exploded && cop.ramCooldown <= 0) {
      const dx = cop.x - game.car.x;
      const dz = cop.z - game.car.z;
      if (dx * dx + dz * dz < 3.5 * 3.5) {
        const rel = Math.abs(cop.speed - game.car.speed);
        if (rel > 5) {
          game.car.health -= 8 + rel * 0.4;
          cop.ramCooldown = 2;
          if (game.car.health <= 0) explodeCar(game, game.car);
        }
      }
    }
  }
}

// The wanted level cools off over time, unless the Heat Wave mission
// locks it up.
export function updateWanted(game, dt) {
  if (game.player.wanted <= 0) {
    game.wantedTimer = 0;
    return;
  }
  if (heatLock(game.mission)) {
    game.wantedTimer = 0;
    return;
  }
  game.wantedTimer += dt;
  const interval = WANTED.decaySeconds / decayBonus(game.roster);
  if (game.wantedTimer >= interval) {
    game.wantedTimer = 0;
    game.player.wanted = Math.max(0, game.player.wanted - 1);
  }
}

// Stealing a car raises the heat by a star.
export function stealCar(game, car) {
  game.car = car;
  game.player.inCar = true;
  game.player.wanted = Math.min(5, game.player.wanted + 1);
  game.stats.carsStolen += 1;
}

// Step out of the car, on foot beside it.
export function leaveCar(game) {
  if (!game.car) return;
  game.player.x = game.car.x + 3;
  game.player.z = game.car.z;
  game.player.inCar = false;
  game.car = null;
}
