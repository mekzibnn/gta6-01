// Solmar City: a seeded grid city with roads, blocks, buildings, a beach and
// the sea. The layout is deterministic for a seed, so every playthrough and
// every screenshot stages the same streets. Buildings are axis-aligned boxes
// the physics code collides against; roads are the drivable network traffic
// and police follow.
import { CITY, WORLD, PALETTE } from './config.js';
import { pick, range } from './random.js';

const ROAD_COLORS = ['#c94f43', '#d07a2e', '#2f7fd0', '#5f9e52', '#8a6fbf', '#c9a227', '#3fa7a0', '#b0527a'];
const ROOF_COLORS = ['#8a6f5c', '#a08060', '#7d8a99', '#b09a7a', '#6f7d6a', '#9a7d8a'];

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
  };

  // Blocks are the cells between road lines. One special use per cell.
  for (let i = 0; i < vertical.length - 1; i += 1) {
    for (let j = 0; j < horizontal.length - 1; j += 1) {
      const x0 = vertical[i] + CITY.road / 2 + 14;
      const x1 = vertical[i + 1] - CITY.road / 2 - 14;
      const y0 = horizontal[j] + CITY.road / 2 + 14;
      const y1 = horizontal[j + 1] - CITY.road / 2 - 14;
      if (y0 >= CITY.beachY) continue;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      // Central park in the middle of town.
      if (i === 4 && j === 2) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, label: 'Parque Central' });
        for (let p = 0; p < 8; p += 1) {
          palms.push({ x: range(random, x0 + 20, x1 - 20), y: range(random, y0 + 20, y1 - 20) });
        }
        continue;
      }
      // A parking lot here and there, the rest built up.
      const roll = random();
      if (roll < 0.12) {
        lots.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 });
        continue;
      }
      const count = random() < 0.45 ? 1 : 2;
      for (let b = 0; b < count; b += 1) {
        const bw = (x1 - x0) / count - 24;
        const bh = (y1 - y0) - 24;
        const bx = x0 + 12 + b * ((x1 - x0) / count);
        const by = y0 + 12;
        const h = range(random, 0.35, 1);
        buildings.push({
          x: bx, y: by, w: bw, h: bh,
          color: pick(random, ROAD_COLORS),
          roof: pick(random, ROOF_COLORS),
          height: h,
          windows: Math.floor(range(random, 2, 5)),
          label: '',
        });
      }
    }
  }

  // Landmark buildings at the named places (drawn bigger, labelled on the map).
  function landmark(place, w, h, color) {
    buildings.push({ x: place.x - w / 2, y: place.y - h / 2, w, h, color, roof: '#5d4a3a', height: 0.8, windows: 4, label: place.label });
  }
  landmark(places.garage, 150, 90, '#b06a2e');
  landmark(places.spray, 150, 90, '#2fa36b');
  landmark(places.gunshop, 120, 80, '#4a4a55');
  landmark(places.clinic, 130, 90, '#e8e2d4');
  landmark(places.portbank, 170, 100, '#8a94a6');
  landmark(places.marina, 140, 90, '#3f8fa8');
  landmark(places.hideout, 110, 80, '#c9a227');

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

  return { roads: roadLines(), buildings, parks, palms, lamps, lots, places, hiddenPackages };
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
