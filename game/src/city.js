// Solmar City: a seeded grid city with roads, blocks, buildings, a beach and
// the sea. The layout is deterministic for a seed, so every playthrough and
// every screenshot stages the same streets. Buildings are axis-aligned boxes
// the physics code collides against; roads are the drivable network traffic
// and police follow.
import { CITY, WORLD, PALETTE } from './config.js';
import { pick, range } from './random.js';

const ROAD_COLORS = ['#c94f43', '#d07a2e', '#2f7fd0', '#5f9e52', '#8a6fbf', '#c9a227', '#3fa7a0', '#b0527a', '#e2725b', '#4fb3a9', '#e8b4d9', '#7fb2e5', '#d9a441', '#a8c66c'];
const ROOF_COLORS = ['#8a6f5c', '#a08060', '#7d8a99', '#b09a7a', '#6f7d6a', '#9a7d8a', '#5d6b7a', '#a06a5a'];

// Blocks that hold a landmark building (key "i,j"): no generated building
// goes there, so the landmark stands on its own forecourt instead of
// colliding with a random block. The landmark rects are defined below.
const LANDMARK_BLOCKS = new Set(['2,1', '5,2', '3,4', '4,3', '7,3', '0,2', '1,1']);

/** Road centre lines, derived from the grid constants. */
export function roadLines() {
  const vertical = [];
  const horizontal = [];
  for (let x = 150; x <= WORLD.width; x += 400) vertical.push(x);
  for (let y = 150; y <= 2150; y += 400) horizontal.push(y);
  return { vertical, horizontal };
}

/** Is the point on asphalt (a road)? Used for traffic lanes and off-road drag. */
export function isOnRoad(x, y) {
  const { vertical, horizontal } = roadLines();
  const half = CITY.road / 2;
  for (const rx of vertical) if (Math.abs(x - rx) <= half && y <= CITY.beachY + half) return true;
  for (const ry of horizontal) if (Math.abs(y - ry) <= half) return true;
  return false;
}

/** Is the point on sand or in the sea? */
export function groundAt(x, y) {
  if (y >= CITY.seaY) return 'sea';
  if (y >= CITY.beachY) return 'sand';
  return isOnRoad(x, y) ? 'road' : 'block';
}

/** Which district a point is in: respect is tracked per district. */
export function districtAt(x, y) {
  if (x < CITY.marinaX) return { key: 'marina', name: 'Marina' };
  if (y >= CITY.beachY) return { key: 'palm', name: 'Palm Strip' };
  if (x >= CITY.portX) return { key: 'portside', name: 'Portside' };
  if (x >= 1350 && x <= 2150 && y >= 950 && y <= 1750) return { key: 'downtown', name: 'Downtown' };
  return { key: 'central', name: 'Central Solmar' };
}

/** The nearest point on a road centre line, for snapping traffic and missions. */
export function nearestRoadPoint(x, y) {
  const { vertical, horizontal } = roadLines();
  let best = { x: vertical[0], y, d: Infinity };
  for (const rx of vertical) {
    const d = Math.abs(x - rx);
    if (d < best.d) best = { x: rx, y, d };
  }
  for (const ry of horizontal) {
    const d = Math.abs(y - ry);
    if (d < best.d) best = { x, y: ry, d };
  }
  return best;
}

/** Circle-vs-building collision: push the circle out, return the hit building or null. */
export function collideBuildings(city, x, y, radius) {
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    if (dx * dx + dy * dy < radius * radius) return b;
  }
  return null;
}

/** Resolve a circle against buildings and the world edge; returns corrected x/y. */
export function resolveCircle(city, x, y, radius) {
  let px = Math.max(radius, Math.min(WORLD.width - radius, x));
  let py = Math.max(radius, Math.min(WORLD.height - radius, y));
  for (const b of city.buildings) {
    const cx = Math.max(b.x, Math.min(px, b.x + b.w));
    const cy = Math.max(b.y, Math.min(py, b.y + b.h));
    const dx = px - cx;
    const dy = py - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius && d2 > 0.01) {
      const d = Math.sqrt(d2);
      px = cx + (dx / d) * radius;
      py = cy + (dy / d) * radius;
    } else if (d2 <= 0.01) {
      // Centre inside the box: push out along the smallest penetration.
      const left = px - b.x;
      const right = b.x + b.w - px;
      const top = py - b.y;
      const bottom = b.y + b.h - py;
      const min = Math.min(left, right, top, bottom);
      if (min === left) px = b.x - radius;
      else if (min === right) px = b.x + b.w + radius;
      else if (min === top) py = b.y - radius;
      else py = b.y + b.h + radius;
    }
  }
  return { x: px, y: py };
}

/** Sidewalk graph: pavement corners at every crossing, linked along each
 * road edge, so pedestrians can walk routes instead of wandering. Built
 * from the road grid alone (no random draws), so the seeded city is
 * untouched by it. Returns { corners, segments, next } where `next` maps
 * each corner to the corners it connects to. */
function buildWalkways(vertical, horizontal) {
  const corners = [];
  const at = new Map();
  const key = (x, y) => `${x},${y}`;
  for (const rx of vertical) {
    for (const ry of horizontal) {
      for (const [dx, dy] of [[-60, -60], [60, -60], [-60, 60], [60, 60]]) {
        const x = rx + dx;
        const y = ry + dy;
        if (y >= CITY.beachY) continue;
        if (!at.has(key(x, y))) {
          at.set(key(x, y), corners.length);
          corners.push({ x, y });
        }
      }
    }
  }
  const segments = [];
  const link = (a, b) => {
    if (a === undefined || b === undefined || a === b) return;
    segments.push([a, b]);
  };
  // Along each vertical road edge, link neighbouring corners.
  for (const rx of vertical) {
    for (const side of [-60, 60]) {
      const line = corners.filter((c) => c.x === rx + side).sort((a, b) => a.y - b.y);
      for (let i = 0; i < line.length - 1; i += 1) {
        link(at.get(key(line[i].x, line[i].y)), at.get(key(line[i + 1].x, line[i + 1].y)));
      }
    }
  }
  // Along each horizontal road edge, link neighbouring corners.
  for (const ry of horizontal) {
    for (const side of [-60, 60]) {
      const line = corners.filter((c) => c.y === ry + side).sort((a, b) => a.x - b.x);
      for (let i = 0; i < line.length - 1; i += 1) {
        link(at.get(key(line[i].x, line[i].y)), at.get(key(line[i + 1].x, line[i + 1].y)));
      }
    }
  }
  const next = corners.map(() => []);
  for (const [a, b] of segments) {
    next[a].push(b);
    next[b].push(a);
  }
  return { corners, segments, next };
}

/** Build the whole city from a seeded generator. */
export function buildCity(random) {
  const { vertical, horizontal } = roadLines();
  const buildings = [];
  const parks = [];
  const palms = [];
  const lamps = [];
  const lots = [];

  // Named places the missions and the HUD point at.
  const places = {
    hideout: { x: 550, y: 550, label: 'Hideout' },
    garage: { x: 950, y: 550, label: "Mara's Garage" },
    spray: { x: 2150, y: 950, label: 'Spray & Go' },
    gunshop: { x: 1350, y: 1750, label: 'El Gato Guns' },
    clinic: { x: 1750, y: 1350, label: 'Clinica Sol' },
    marina: { x: 220, y: 950, label: 'Marina Solmar' },
    portbank: { x: 3150, y: 1350, label: 'Portside Bank' },
    beachbar: { x: 1750, y: 2200, label: 'Playa Bar' },
    race: { x: 1350, y: 2150, label: 'Palm Strip Race' },
  };

  // Landmark buildings at the named places. The mission logic points at the
  // PLACE (on the street, reachable by car); the BUILDING itself sits inside
  // the next block, so no car ever drives over its label and no road is
  // blocked by a landmark. Rects are (centre x, centre y, w, h).
  function addLandmark(place, cx, cy, w, h, color) {
    buildings.push({ x: cx - w / 2, y: cy - h / 2, w, h, color, roof: '#5d4a3a', height: 0.8, windows: 4, style: 2, ac: true, tank: false, label: place.label });
  }

  // Blocks are the cells between road lines. One special use per cell.
  // NOTE: the order of random() calls below is part of the seeded layout —
  // do not reorder the draws, or the city for a seed changes.
  for (let i = 0; i < vertical.length - 1; i += 1) {
    for (let j = 0; j < horizontal.length - 1; j += 1) {
      const left = vertical[i] + CITY.road / 2 + 14;
      const right = vertical[i + 1] - CITY.road / 2 - 14;
      const top = horizontal[j] + CITY.road / 2 + 14;
      const bottom = horizontal[j + 1] - CITY.road / 2 - 14;
      if (top >= CITY.beachY) continue;
      // A landmark block: no generated building here, just a paved forecourt
      // for the landmark (drawn as a lot, the landmark building on top).
      if (LANDMARK_BLOCKS.has(`${i},${j}`)) {
        lots.push({ x: left, y: top, w: right - left, h: bottom - top });
        continue;
      }
      const cx = (left + right) / 2;
      const cy = (top + bottom) / 2;
      // Central park in the middle of town.
      if (i === 4 && j === 2) {
        parks.push({ x: left, y: top, w: right - left, h: bottom - top, label: 'Parque Central' });
        for (let p = 0; p < 8; p += 1) {
          palms.push({ x: range(random, left + 20, right - 20), y: range(random, top + 20, bottom - 20) });
        }
        continue;
      }
      // A parking lot here and there, the rest built up.
      const roll = random();
      if (roll < 0.12) {
        lots.push({ x: left, y: top, w: right - left, h: bottom - top });
        continue;
      }
      const count = random() < 0.45 ? 1 : 2;
      for (let b = 0; b < count; b += 1) {
        const bw = (right - left) / count - 24;
        const bh = (bottom - top) - 24;
        const bx = left + 12 + b * ((right - left) / count);
        const by = top + 12;
        const h = range(random, 0.35, 1);
        const styleRoll = random();
        buildings.push({
          x: bx, y: by, w: bw, h: bh,
          color: pick(random, ROAD_COLORS),
          roof: pick(random, ROOF_COLORS),
          height: h,
          windows: Math.floor(range(random, 2, 5)),
          // Look: 0 = lit dot grid, 1 = horizontal window bands,
          // 2 = big framed windows. Plus rooftop clutter.
          style: styleRoll < 0.5 ? 0 : styleRoll < 0.8 ? 1 : 2,
          ac: random() < 0.4,
          tank: random() < 0.25,
          label: '',
        });
      }
    }
  }

  addLandmark(places.garage, 1090, 660, 150, 90, '#b06a2e');
  addLandmark(places.spray, 2350, 1150, 150, 90, '#2fa36b');
  addLandmark(places.gunshop, 1550, 1950, 120, 80, '#4a4a55');
  addLandmark(places.clinic, 1950, 1550, 130, 90, '#e8e2d4');
  addLandmark(places.portbank, 3150, 1550, 170, 100, '#8a94a6');
  addLandmark(places.marina, 350, 1150, 140, 90, '#3f8fa8');
  addLandmark(places.hideout, 750, 750, 110, 80, '#c9a227');

  // Palms along the beach and lamps along every road.
  for (let x = 200; x < WORLD.width; x += 260) {
    palms.push({ x: x + range(random, -40, 40), y: CITY.beachY + 40 + range(random, 0, 60) });
  }
  for (const rx of vertical) {
    for (const ry of horizontal) {
      lamps.push({ x: rx + CITY.road / 2 + 6, y: ry + CITY.road / 2 + 6 });
    }
  }

  // Hidden packages: ten glowing spots tucked around the city.
  const hiddenPackages = [];
  const spots = [
    { x: 300, y: 300 }, { x: 3200, y: 300 }, { x: 300, y: 2000 }, { x: 3200, y: 2000 },
    { x: 1750, y: 300 }, { x: 1750, y: 2000 }, { x: 950, y: 1350 }, { x: 2550, y: 1350 },
    { x: 550, y: 1750 }, { x: 2550, y: 550 },
  ];
  for (const spot of spots) hiddenPackages.push({ ...spot, found: false });

  // The sidewalk graph pedestrians walk: corners and links, no random draws.
  const walkways = buildWalkways(vertical, horizontal);

  return { roads: roadLines(), buildings, parks, palms, lamps, lots, places, hiddenPackages, walkways };
}
