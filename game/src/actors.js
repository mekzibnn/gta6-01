// Player on foot, wanted heat, KPD cops (RAM / PIT / patrol) and Air One.
import { DISPATCH_NAMES, DISPATCH_ROLES } from './config.js';

let nextCopId = 1000;

function copCallsign(g) {
  return DISPATCH_NAMES[g.cops.length % DISPATCH_NAMES.length];
}
function copRole(kind, idx) {
  if (kind === 'ram') return 'RAMMING';
  if (kind === 'pit') return 'PIT';
  return DISPATCH_ROLES[(idx + 2) % DISPATCH_ROLES.length];
}

export function spawnCop(g, kind) {
  const a = g.rng.range(0, Math.PI * 2);
  const d = 70 + g.rng.range(0, 30);
  const idx = g.cops.length;
  const cop = {
    id: nextCopId, kind,
    callsign: copCallsign(g), role: copRole(kind, idx),
    x: g.player.x + Math.cos(a) * d, z: g.player.z + Math.sin(a) * d,
    heading: 0, speed: kind === 'pit' ? 26 : kind === 'ram' ? 24 : 20,
    health: 100,
  };
  nextCopId += 1;
  g.cops.push(cop);
  return cop;
}

export function tickActors(g, dt) {
  const p = g.player;
  // On foot — WASD walks the street.
  if (!p.inCar) {
    const keys = g.input.keys;
    let mx = 0, mz = 0;
    if (keys.has('KeyW') || keys.has('ArrowUp')) mz += 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) mz -= 1;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
    if (mx || mz) {
      const len = Math.hypot(mx, mz);
      p.x += (mx / len) * 6.5 * dt;
      p.z += (mz / len) * 6.5 * dt;
      p.heading = Math.atan2(mx / len, mz / len);
    }
    p.x = Math.max(-260, Math.min(190, p.x));
    p.z = Math.max(-190, Math.min(190, p.z));
  } else if (g.car) {
    p.x = g.car.x; p.z = g.car.z; p.heading = g.car.heading;
  }

  // Wanted heat — cools slowly, never while the Heat Wave locks it.
  if (!g.heatLock && p.wanted > 0) {
    g._heatT = (g._heatT || 0) + dt;
    const interval = p.wanted >= 3 ? 30 : 18;
    if (g._heatT >= interval) {
      g._heatT = 0;
      p.wanted = Math.max(0, p.wanted - 1);
    }
  }
  if (p.wanted === 0 && g.cops.length > 0) {
    g.cops.length = 0;
    g.heli = null;
  }

  // Dispatch — the KPD answers the heat; at three stars the specialists
  // arrive, and Air One takes the sky.
  const target = Math.min(p.wanted * 2, 6);
  g._copT = (g._copT || 0) + dt;
  if (p.wanted > 0 && g.cops.length < target && g._copT > 1.2) {
    g._copT = 0;
    let kind = 'patrol';
    if (p.wanted >= 3) {
      if (!g.cops.some((c) => c.kind === 'ram')) kind = 'ram';
      else if (!g.cops.some((c) => c.kind === 'pit')) kind = 'pit';
      else kind = g.rng.pick(['ram', 'pit', 'patrol']);
    }
    spawnCop(g, kind);
  }
  for (const cop of g.cops) {
    const dx = p.x - cop.x, dz = p.z - cop.z;
    const d = Math.hypot(dx, dz) || 1;
    const want = Math.atan2(dx, dz);
    let diff = want - cop.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    cop.heading += Math.max(-2.2 * dt, Math.min(2.2 * dt, diff));
    cop.x += Math.sin(cop.heading) * cop.speed * dt;
    cop.z += Math.cos(cop.heading) * cop.speed * dt;
    if (d < 5 && g.car) {
      // A PIT nudge — shoves the player's car and chips its paint.
      g.car.speed *= 0.92;
      g.car.x += (dx / d) * 0.6;
      g.car.z += (dz / d) * 0.6;
    }
  }

  // Air One — orbits the player at twelve metres, spotlight down.
  if (p.wanted >= 3) {
    if (!g.heli) {
      g.heli = { x: p.x + 40, z: p.z, y: 12, angle: 0, locked: true, rotor: 0 };
    }
    const h = g.heli;
    h.angle += dt * 0.22;
    h.x = p.x + Math.cos(h.angle) * 35;
    h.z = p.z + Math.sin(h.angle) * 35;
    h.y = 12;
    h.rotor += dt * 30;
    h.locked = true;
  } else if (g.heli) {
    g.heli = null;
  }
}

export function enterCar(g, car) {
  g.player.inCar = true;
  g.car = car;
  g.player.car = car;
  g.player.x = car.x; g.player.z = car.z;
  g.stats.stolen += 1;
}
export function exitCar(g) {
  if (!g.car) return;
  g.player.inCar = false;
  g.player.x = g.car.x + 3; g.player.z = g.car.z;
  g.car = null;
  g.player.car = null;
}
export function nearestCar(g, range) {
  let best = null, bestD = range || 6;
  for (const c of g.cars) {
    if (c.exploded) continue;
    const d = Math.hypot(c.x - g.player.x, c.z - g.player.z);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}
