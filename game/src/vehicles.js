// Cars: a simple arcade bicycle model with collisions, plus the traffic AI
// that keeps Solmar's streets busy and the police chase that hunts the player.
// All motion is deterministic: fixed steps, seeded random, no clock.
import { CAR, CITY, WORLD, STEP } from './config.js';
import { groundAt, isOnRoad, resolveCircle, roadLines } from './city.js';
import { pick, range } from './random.js';

export function createCar(kind, x, y, angle, random) {
  const spec = CAR.kinds[kind];
  return {
    kind, x, y, angle, speed: 0,
    spec, color: spec.color,
    // Traffic state: which road it follows and which way.
    axis: 'v', dir: 1, lane: 24,
    stuck: 0, police: kind === 'police',
    // Unique paint so stolen cars stay recognisable.
    paint: random ? pick(random, [spec.color, spec.color, '#e8e2d4', '#20242c']) : spec.color,
    siren: 0,
    crashed: 0,
  };
}

/** Spawn a parked car on a roadside somewhere in the city. */
export function spawnParkedCar(random, city) {
  const { vertical, horizontal } = roadLines();
  const kinds = ['sedan', 'taxi', 'sport', 'van', 'truck'];
  const kind = pick(random, kinds);
  const verticalRoad = random() < 0.5;
  let x;
  let y;
  let angle;
  if (verticalRoad) {
    const rx = pick(random, vertical);
    const ry = pick(random, horizontal);
    x = rx + (random() < 0.5 ? -CITY.road / 2 - 16 : CITY.road / 2 + 16);
    y = ry + range(random, -140, 140);
    angle = random() < 0.5 ? -Math.PI / 2 : Math.PI / 2;
  } else {
    const rx = pick(random, vertical);
    const ry = pick(random, horizontal);
    x = rx + range(random, -140, 140);
    y = ry + (random() < 0.5 ? -CITY.road / 2 - 16 : CITY.road / 2 + 16);
    angle = random() < 0.5 ? 0 : Math.PI;
  }
  const car = createCar(kind, x, y, angle, random);
  car.parked = true;
  return car;
}

/** Spawn a traffic car on a road, moving along it. */
export function spawnTrafficCar(random) {
  const { vertical, horizontal } = roadLines();
  const kinds = ['sedan', 'taxi', 'sport', 'van', 'truck'];
  const kind = pick(random, kinds);
  const verticalRoad = random() < 0.5;
  let x;
  let y;
  let angle;
  let axis;
  let dir;
  if (verticalRoad) {
    const rx = pick(random, vertical);
    const ry = range(random, 200, WORLD.height - 300);
    dir = random() < 0.5 ? 1 : -1;
    x = rx + dir * 24;
    y = ry;
    angle = dir > 0 ? Math.PI / 2 : -Math.PI / 2;
    axis = 'v';
  } else {
    const rx = range(random, 200, WORLD.width - 200);
    const ry = pick(random, horizontal);
    dir = random() < 0.5 ? 1 : -1;
    x = rx;
    y = ry + dir * 24;
    angle = dir > 0 ? 0 : Math.PI;
    axis = 'h';
  }
  const car = createCar(kind, x, y, angle, random);
  car.axis = axis;
  car.dir = dir;
  car.lane = 24;
  car.speed = range(random, 110, 170);
  car.traffic = true;
  return car;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

/** One physics step for a driven car. Returns 'crash' when it hits something hard.
 * `upgrades` is the garage state ({engine, armor, paint}); engine raises top
 * speed and acceleration, armor softens crashes. */
export function stepDrivenCar(car, input, dt, city, cars, upgrades) {
  const spec = car.spec;
  const eng = (upgrades && upgrades.engine) || 0;
  const armor = (upgrades && upgrades.armor) || 0;
  const topMul = [1, 1.15, 1.3][eng] || 1;
  const accMul = [1, 1.2, 1.4][eng] || 1;
  const resist = [1, 0.6, 0.35][armor] || 1;
  const ground = groundAt(car.x, car.y);
  const surface = ground === 'road' ? 1 : ground === 'sand' ? 0.55 : 0.75;
  const accel = input.y < 0 ? spec.accel * accMul : input.y > 0 ? -spec.brake : 0;
  const target = spec.top * surface * topMul;
  if (input.y < 0) car.speed = Math.min(target, car.speed + accel * dt);
  else if (input.y > 0) {
    if (car.speed > 20) car.speed = Math.max(0, car.speed + accel * dt);
    else car.speed = Math.max(-140, car.speed - 160 * dt);
  } else {
    car.speed -= car.speed * 1.4 * dt;
    if (Math.abs(car.speed) < 4) car.speed = 0;
  }
  if (input.handbrake) car.speed *= Math.max(0, 1 - 3.2 * dt);
  const steer = input.x * spec.grip * Math.min(1, Math.abs(car.speed) / 140);
  car.angle += steer * (car.speed >= 0 ? 1 : -1) * dt * Math.sign(car.speed || 1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const hit = resolveCircle(city, nx, ny, CAR.length / 2 - 4);
  const crashed = hit.x !== nx || hit.y !== ny;
  car.x = hit.x;
  car.y = hit.y;
  if (crashed && Math.abs(car.speed) > 120) {
    car.speed *= 1 - 0.65 * resist;
    car.crashed = 0.4;
    return 'crash';
  }
  if (crashed) car.speed *= 1 - 0.3 * resist;
  // Soft bumps against other cars.
  for (const other of cars) {
    if (other === car) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const d = Math.hypot(dx, dy);
    if (d < CAR.length - 6 && d > 0.01) {
      const push = (CAR.length - 6 - d) / 2;
      car.x -= (dx / d) * push;
      car.y -= (dy / d) * push;
      other.x += (dx / d) * push;
      other.y += (dy / d) * push;
      if (Math.abs(car.speed) > 200) return 'crash';
      car.speed *= 0.85;
    }
  }
  if (car.crashed > 0) car.crashed -= dt;
  return null;
}

/** One step for a traffic car: cruise its road, turn at intersections, yield ahead. */
export function stepTrafficCar(car, dt, city, cars, random) {
  const { vertical, horizontal } = roadLines();
  const lines = car.axis === 'v' ? vertical : horizontal;
  const roadPos = car.axis === 'v' ? car.x : car.y;
  // At an intersection, sometimes turn onto the crossing road.
  const cross = car.axis === 'v' ? horizontal : vertical;
  const along = car.axis === 'v' ? car.y : car.x;
  for (const c of cross) {
    if (Math.abs(along - c) < 6 && random() < 0.004) {
      car.axis = car.axis === 'v' ? 'h' : 'v';
      car.dir = random() < 0.5 ? 1 : -1;
      car.angle = car.axis === 'v' ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
      break;
    }
  }
  // Slow down for the car ahead.
  let target = 150;
  for (const other of cars) {
    if (other === car || !other.traffic) continue;
    const dx = other.x - car.x;
    const dy = other.y - car.y;
    const ahead = car.axis === 'v' ? dy * car.dir : dx * car.dir;
    const side = car.axis === 'v' ? Math.abs(dx) : Math.abs(dy);
    if (ahead > 0 && ahead < 90 && side < 40) { target = 40; break; }
  }
  car.speed += (target - car.speed) * Math.min(1, 2 * dt);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const hit = resolveCircle(city, nx, ny, CAR.length / 2 - 4);
  car.x = hit.x;
  car.y = hit.y;
  // Reached the edge of town: turn around at the next intersection instead of leaving.
  if (car.x < 120 || car.x > WORLD.width - 120 || car.y < 120 || car.y > WORLD.height - 120) {
    car.dir *= -1;
    car.angle += Math.PI;
  }
}

/** One step for a police car chasing the player. */
export function stepPoliceCar(car, target, dt, city, cars) {
  const spec = car.spec;
  const dx = target.x - car.x;
  const dy = target.y - car.y;
  const dist = Math.hypot(dx, dy);
  const want = Math.atan2(dy, dx);
  const diff = angleDiff(want, car.angle);
  car.angle += Math.max(-3.2 * dt, Math.min(3.2 * dt, diff));
  const speedTarget = dist > 320 ? spec.top : dist > 90 ? spec.top * 0.8 : 120;
  car.speed += (speedTarget - car.speed) * Math.min(1, 1.6 * dt);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const hit = resolveCircle(city, nx, ny, CAR.length / 2 - 4);
  car.x = hit.x;
  car.y = hit.y;
  car.siren += dt;
  for (const other of cars) {
    if (other === car) continue;
    const ox = other.x - car.x;
    const oy = other.y - car.y;
    const d = Math.hypot(ox, oy);
    if (d < CAR.length - 6 && d > 0.01) {
      const push = (CAR.length - 6 - d) / 2;
      car.x -= (ox / d) * push;
      car.y -= (oy / d) * push;
      other.x += (ox / d) * push;
      other.y += (oy / d) * push;
    }
  }
  return dist;
}

// ---------------------------------------------------------------------------
// Air One: the SCPD helicopter. It spawns at 4+ wanted stars, circles the
// player at a hover offset and keeps the heat from cooling off until it leaves.
// ---------------------------------------------------------------------------

/** Spawn the helicopter above the player. */
export function createHelicopter(x, y) {
  return { x: x + 200, y: y - 260, angle: 0, speed: 0, rotor: 0 };
}

/** One step: close in, circle, and hold station over the player. */
export function stepHelicopter(heli, target, dt) {
  const wantAngle = Math.atan2(target.y - heli.y, target.x - heli.x);
  let diff = wantAngle - heli.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  heli.angle += Math.max(-1.2 * dt, Math.min(1.2 * dt, diff));
  const dx = target.x - heli.x;
  const dy = target.y - heli.y;
  const dist = Math.hypot(dx, dy);
  const speedTarget = dist > 300 ? 260 : dist > 120 ? 160 : 60;
  heli.speed += (speedTarget - heli.speed) * Math.min(1, 1.2 * dt);
  heli.x += Math.cos(heli.angle) * heli.speed * dt;
  heli.y += Math.sin(heli.angle) * heli.speed * dt;
  heli.rotor += dt * 22;
  return dist;
}
