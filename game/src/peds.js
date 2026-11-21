// asphalt — routes follow the sidewalk graph (city.walkways: pavement
// corners at every crossing, linked along each road edge). And they
// react: a gunshot, a crash or a police chase sends the nearest peds
// running, and panic spreads down the sidewalk. A fast car bearing down
// on a ped makes them step aside, most of the time.
//
// Everything here runs on the game's seeded generator, so the same seed
// stages the same crowds — the screenshots stay repeatable.
import { roadLines, groundAt, resolveCircle } from './city.js';
import { PED, WORLD } from './config.js';
import { pick, range, oneIn } from './random.js';

/** Who walks Solmar: pace and how long they linger at a waypoint. */
export const PED_ROLES = {
  commuter: { speed: 1.0, pause: 0, weight: 6 },
  jogger: { speed: 1.7, pause: 0, weight: 2.5 },
  tourist: { speed: 0.55, pause: 2.5, weight: 1.5 },
  shopper: { speed: 0.45, pause: 4, weight: 1 },
};

/** How far panic spreads, and how close a car must be to make a ped dodge. */
export const PED_MIND = {
  panicRadius: 170,
  dodgeDist: 95,
  dodgeSpeed: 210,
  routePoints: 6,
  legLength: 300,
};

/** Walking together: how often strangers pair up, and how far apart. */
export const PED_GROUPS = {
  pairChance: 0.35,
  pairOffset: 42,
  pairRadius: 140,
};

/** Sidewalk offset from a road centre line (road half-width + a step). */
const SIDEWALK = 60;

/** Pick a role for a ped, weighted toward commuters. */
function pickRole(random) {
  const bag = [];
  for (const [role, spec] of Object.entries(PED_ROLES)) {
    for (let i = 0; i < spec.weight * 2; i += 1) bag.push(role);
  }
  return pick(random, bag);
}

/**
 * A sidewalk route: a chain of waypoints through the city's sidewalk
 * graph (city.walkways), corner to corner, seeded so the same seed stages
 * the same walk. Falls back to road-edge wandering when no graph is
 * passed, so the function still works standalone.
 */
export function buildSidewalkRoute(random, city) {
  const walk = city && city.walkways;
  if (walk && walk.corners.length) {
    let current = Math.floor(random() * walk.corners.length);
    const points = [{ ...walk.corners[current] }];
    for (let leg = 0; leg < PED_MIND.routePoints; leg += 1) {
      const options = walk.next[current];
      if (!options.length) break;
      current = options[Math.floor(random() * options.length)];
      points.push({ ...walk.corners[current] });
    }
    return points;
  }
  const { vertical, horizontal } = roadLines();
  const startX = pick(random, vertical);
  const startY = pick(random, horizontal);
  let x = startX + (random() < 0.5 ? -SIDEWALK : SIDEWALK);
  let y = startY + (random() < 0.5 ? -SIDEWALK : SIDEWALK);
  let axis = random() < 0.5 ? 'v' : 'h';
  let dir = random() < 0.5 ? 1 : -1;
  const points = [{ x, y }];
  for (let leg = 0; leg < PED_MIND.routePoints; leg += 1) {
    // At a corner, sometimes turn onto the crossing road.
    if (random() < 0.45) {
      axis = axis === 'v' ? 'h' : 'v';
      dir = random() < 0.5 ? 1 : -1;
    }
    const step = PED_MIND.legLength * (0.7 + random() * 0.6);
    if (axis === 'v') y += dir * step;
    else x += dir * step;
    // Bounce off the world edge instead of leaving town.
    if (x < 120 || x > WORLD.width - 120) { dir *= -1; x += dir * step * 2; }
    if (y < 120 || y > WORLD.height - 320) { dir *= -1; y += dir * step * 2; }
    x = Math.max(60, Math.min(WORLD.width - 60, x));
    y = Math.max(60, Math.min(WORLD.height - 120, y));
    points.push({ x, y });
  }
  return points;
}

/** Give a ped its mind: a role, a pace, and a route to walk. */
export function assignPedMind(ped, random, city) {
  const role = pickRole(random);
  ped.role = role;
  ped.roleSpeed = PED_ROLES[role].speed;
  ped.rolePause = PED_ROLES[role].pause;
  ped.route = buildSidewalkRoute(random, city);
  ped.routeIndex = 1;
  ped.pauseTimer = 0;
  ped.panic = 0;
  return ped;
}

/** Fraction of the crowd currently fleeing (0..1), for the HUD and tests. */
export function pedPanicLevel(game) {
  if (!game.peds.length) return 0;
  let fleeing = 0;
  for (const ped of game.peds) if (ped.flee > 0 || ped.panic > 0) fleeing += 1;
  return fleeing / game.peds.length;
}

/** The nearest panicking ped to a point, or null when the streets are calm. */
export function nearestFleeingPed(game, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const ped of game.peds) {
    if (ped.health <= 0 || (ped.flee <= 0 && ped.panic <= 0)) continue;
    const d = Math.hypot(ped.x - x, ped.y - y);
    if (d < bestD) { best = ped; bestD = d; }
  }
  return best;
}

function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

/** Pair up strangers who happen to stand close: they walk together. */
function pairPeds(game) {
  const random = game.random;
  for (const ped of game.peds) {
    if (ped.health <= 0 || ped.partner || !ped.route) continue;
    if (random() >= PED_GROUPS.pairChance) continue;
    let best = null;
    let bestD = PED_GROUPS.pairRadius;
    for (const other of game.peds) {
      if (other === ped || other.health <= 0 || other.partner || !other.route) continue;
      const d = Math.hypot(other.x - ped.x, other.y - ped.y);
      if (d < bestD) { best = other; bestD = d; }
    }
    if (!best) continue;
    ped.partner = best;
    best.partner = ped;
    ped.pairSide = 1;
    best.pairSide = -1;
    // Share one route so the pair walks together, not apart.
    best.route = ped.route;
    best.routeIndex = ped.routeIndex;
  }
}

/** How many peds are walking with a partner right now. */
export function pairedPeds(game) {
  let n = 0;
  for (const ped of game.peds) {
    if (ped.health > 0 && ped.partner && ped.partner.health > 0) n += 1;
  }
  return n;
}

/** Step one ped along its route, or away from trouble when it panics. */
function stepMind(ped, game, dt, danger) {
  const random = game.random;
  if (ped.hitFlash > 0) ped.hitFlash -= dt;
  if (ped.panic > 0) ped.panic -= dt;
  // A taxi fare waits where it stands; panic still moves it.
  if (ped.taxi && ped.flee <= 0 && ped.panic <= 0) return;
  // Walking with a partner: when they stop to talk, you stop too.
  if (ped.partner && ped.partner.health > 0 && ped.partner.pauseTimer > 0 && ped.flee <= 0 && ped.panic <= 0) {
    ped.pauseTimer = Math.max(ped.pauseTimer, 0.5);
  }
  // Fleeing: run from the danger, with a wobble so the crowd fans out.
  if (ped.flee > 0 || ped.panic > 0) {
    ped.flee = Math.max(0, ped.flee - dt);
    const away = danger
      ? angleTo(danger.x, danger.y, ped.x, ped.y)
      : ped.angle;
    const wobble = Math.sin((ped.x + ped.y) * 0.05) * 0.5;
    const dir = away + wobble;
    const nx = ped.x + Math.cos(dir) * PED.fleeSpeed * dt;
    const ny = ped.y + Math.sin(dir) * PED.fleeSpeed * dt;
    if (groundAt(nx, ny) !== 'sea') {
      const hit = resolveCircle(game.city, nx, ny, 12);
      ped.x = hit.x;
      ped.y = hit.y;
    }
    ped.angle = dir;
    return;
  }
  // Pausing at a waypoint (tourists stop to look around).
  if (ped.pauseTimer > 0) {
    ped.pauseTimer -= dt;
    return;
  }
  // Follow the route: head for the next waypoint, turn at each one.
  // A partner walks the same route, offset to the side, so the pair
  // strolls side by side instead of single file.
  if (ped.route && ped.route.length > 1) {
    const target = ped.route[ped.routeIndex];
    let tx = target.x;
    let ty = target.y;
    if (ped.partner && ped.partner.health > 0) {
      const dir = angleTo(ped.x, ped.y, target.x, target.y);
      const side = dir + Math.PI / 2;
      tx += Math.cos(side) * PED_GROUPS.pairOffset * (ped.pairSide || 1);
      ty += Math.sin(side) * PED_GROUPS.pairOffset * (ped.pairSide || 1);
    }
    const d = Math.hypot(tx - ped.x, ty - ped.y);
    if (d < 14) {
      ped.routeIndex += 1;
      if (ped.routeIndex >= ped.route.length) {
        // End of the route: walk it back the other way.
        ped.route.reverse();
        ped.routeIndex = 1;
      }
      // A partner walks in lockstep: same waypoint, same turn.
      if (ped.partner && ped.partner.health > 0) ped.partner.routeIndex = ped.routeIndex;
      if (ped.rolePause > 0) ped.pauseTimer = ped.rolePause * (0.5 + random() * 0.8);
      // A shopper who reaches a storefront often stops to look in the window.
      if (ped.role === 'shopper' && oneIn(random, 2)) {
        for (const key of ['taxioffice', 'laundry', 'club', 'wash']) {
          const shop = game.city.places[key];
          if (shop && Math.hypot(ped.x - shop.x, ped.y - shop.y) < 150) {
            ped.pauseTimer = Math.max(ped.pauseTimer, 4);
            break;
          }
        }
      }
      return;
    }
    const dir = angleTo(ped.x, ped.y, tx, ty);
    const speed = ped.speed * (ped.roleSpeed || 1);
    const nx = ped.x + Math.cos(dir) * speed * dt;
    const ny = ped.y + Math.sin(dir) * speed * dt;
    if (groundAt(nx, ny) !== 'sea') {
      const hit = resolveCircle(game.city, nx, ny, 12);
      ped.x = hit.x;
      ped.y = hit.y;
    }
    ped.angle = dir;
    return;
  }
  // No route yet (or a fresh ped): hold still until one is assigned.
}

/** A fast car closing on a ped makes them step aside. Returns true on a dodge. */
function dodgeTraffic(ped, game, dt) {
  if (ped.flee > 0 || ped.panic > 0) return false;
  const cars = [...game.cars, ...game.policeCars];
  for (const car of cars) {
    if (Math.abs(car.speed || 0) < 200) continue;
    const dx = ped.x - car.x;
    const dy = ped.y - car.y;
    const d = Math.hypot(dx, dy);
    if (d > PED_MIND.dodgeDist || d < 1) continue;
    // Only when the car is actually heading at the ped.
    const closing = (dx * Math.cos(car.angle) + dy * Math.sin(car.angle)) / d;
    if (closing < 0.4) continue;
    const side = Math.atan2(dy, dx) + Math.PI / 2;
    const nx = ped.x + Math.cos(side) * PED_MIND.dodgeSpeed * dt;
    const ny = ped.y + Math.sin(side) * PED_MIND.dodgeSpeed * dt;
    if (groundAt(nx, ny) !== 'sea') {
      const hit = resolveCircle(game.city, nx, ny, 12);
      ped.x = hit.x;
      ped.y = hit.y;
    }
    ped.angle = side;
    return true;
  }
  return false;
}

/** Panic is contagious: a fleeing ped scares everyone close by. */
function spreadPanic(game) {
  const fleeing = game.peds.filter((p) => p.health > 0 && p.flee > 0);
  if (!fleeing.length) return;
  for (const ped of game.peds) {
    if (ped.health <= 0 || ped.flee > 0 || ped.panic > 0) continue;
    for (const scared of fleeing) {
      if (Math.hypot(ped.x - scared.x, ped.y - scared.y) < PED_MIND.panicRadius) {
        ped.panic = 1.5;
        break;
      }
    }
  }
}

/**
 * Step the whole crowd. Assigns minds lazily on first sight, spreads
 * panic, then moves each ped. `danger` is the wanted player (or null):
 * the thing the crowd runs from.
 */
export function stepPeds(game, dt) {
  const danger = game.player && game.player.wanted > 0 ? game.player : null;
  for (const ped of game.peds) {
    if (ped.health <= 0) continue;
    if (!ped.route) assignPedMind(ped, game.random, game.city);
    // A dead partner is no partner: the survivor walks alone again.
    if (ped.partner && ped.partner.health <= 0) ped.partner = null;
  }
  pairPeds(game);
  spreadPanic(game);
  for (const ped of game.peds) {
    if (ped.health <= 0) continue;
    if (!dodgeTraffic(ped, game, dt)) stepMind(ped, game, dt, danger);
  }
}

/** How many peds are out on each role, for the dossier and the HUD. */
export function pedRoleCounts(game) {
  const counts = { commuter: 0, jogger: 0, tourist: 0, shopper: 0, unassigned: 0 };
  for (const ped of game.peds) {
    if (ped.health <= 0) continue;
    if (ped.role && counts[ped.role] !== undefined) counts[ped.role] += 1;
    else counts.unassigned += 1;
  }
  return counts;
}
