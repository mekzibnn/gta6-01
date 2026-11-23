// Shops — proximity prompts and the four menus (garage, empire, crew,
// races) plus the gun store. A purchase always closes its menu.
import { BUSINESSES, CREW, WEAPONS, RACES, ENGINE_PRICES, ARMOR_PRICES, NITRO_PRICE, NITRO_MAX } from './config.js';

export const SHOPS = [
  { id: 'garage', label: 'Garage', x: 80, z: 80, kind: 'garage' },
  { id: 'laundry', label: 'Solmar Laundry', x: -60, z: 60, kind: 'venture' },
  { id: 'gunstore', label: 'Gun Store', x: 148, z: 148, kind: 'weapons' },
  { id: 'crew', label: 'Crew Office', x: -24, z: -196, kind: 'crew' },
  { id: 'race', label: 'Race Office', x: 150, z: 0, kind: 'races' },
];

// The nearest shop within 10 units of the player, or null. Computed
// live so a keypress right after a teleport still finds the right shop.
export function nearestShop(g) {
  let best = null, bestD = 10;
  for (const s of SHOPS) {
    const d = Math.hypot(s.x - g.player.x, s.z - g.player.z);
    if (d < bestD) { bestD = d; best = s; }
  }
  return best ? { label: best.label, id: best.id, kind: best.kind, x: best.x, z: best.z } : null;
}

export function updateShops(g) {
  g.shopNear = nearestShop(g);
  if (g.shopOpen && g.shopNear && g.shopOpen.shopId !== g.shopNear.id) g.shopOpen = null;
  if (g.shopOpen && !g.shopNear) g.shopOpen = null;
}

export function openShopMenu(g) {
  if (!g.shopNear) return false;
  g.shopOpen = { kind: g.shopNear.kind, shopId: g.shopNear.id, label: g.shopNear.label };
  return true;
}

function crewDiscount(g) {
  return Object.keys(g.roster.hired).length > 0 ? 0.9 : 1;
}
function pay(g, amount) {
  if (g.player.cash < amount) { g.hud.note = 'Not enough cash'; g.hud.noteT = 2; return false; }
  g.player.cash -= amount;
  return true;
}

// Digit key while a menu is open. Returns true when the menu handled it.
export function menuDigit(g, digit) {
  const m = g.shopOpen;
  if (!m) return false;
  if (digit === 4 && m.kind !== 'venture' && m.kind !== 'races') { g.shopOpen = null; return true; }
  if (m.kind === 'garage') return garageDigit(g, digit);
  if (m.kind === 'venture') return ventureDigit(g, digit);
  if (m.kind === 'crew') return crewDigit(g, digit);
  if (m.kind === 'races') return racesDigit(g, digit);
  if (m.kind === 'weapons') return weaponsDigit(g, digit);
  return false;
}

function garageDigit(g, digit) {
  if (digit === 1) {
    const next = g.garage.engine + 1;
    if (next >= ENGINE_PRICES.length) return true;
    const price = Math.round(ENGINE_PRICES[next] * crewDiscount(g));
    if (!pay(g, price)) return true;
    g.garage.engine = next;
    g.shopOpen = null;
    return true;
  }
  if (digit === 2) {
    if (g.garage.nitro >= NITRO_MAX) return true;
    if (!pay(g, NITRO_PRICE)) return true;
    g.garage.nitro += 1;
    g.shopOpen = null;
    return true;
  }
  if (digit === 3) {
    const next = g.garage.armor + 1;
    if (next >= ARMOR_PRICES.length) return true;
    const price = Math.round(ARMOR_PRICES[next] * crewDiscount(g));
    if (!pay(g, price)) return true;
    g.garage.armor = next;
    g.shopOpen = null;
    return true;
  }
  return false;
}

function ventureDigit(g, digit) {
  const b = BUSINESSES[digit - 1];
  if (!b) { if (digit === 5) g.shopOpen = null; return true; }
  const owned = g.empire.owned[b.id];
  const price = owned ? b.price * (owned.level + 1) : b.price;
  if (!pay(g, price)) return true;
  if (owned) owned.level += 1;
  else g.empire.owned[b.id] = { level: 1 };
  g.shopOpen = null;
  return true;
}

function crewDigit(g, digit) {
  const c = CREW[digit - 1];
  if (!c) return true;
  if (g.roster.hired[c.id]) return true;
  if (!pay(g, c.price)) return true;
  g.roster.hired[c.id] = { active: true, level: 1 };
  g.shopOpen = null;
  return true;
}

function racesDigit(g, digit) {
  const r = RACES[digit - 1];
  if (!r) { if (digit === 4) g.shopOpen = null; return true; }
  if (g.player.cash < r.fee) { g.hud.note = 'Not enough cash'; g.hud.noteT = 2; return true; }
  g.player.cash -= r.fee;
  g.streetRaces.active = { id: r.id, gate: 0, t: 0 };
  g.shopOpen = null;
  return true;
}

function weaponsDigit(g, digit) {
  const idx = [1, 3, 4, 5, 6][digit - 1];
  if (digit === 6) {
    // Ammo refill for everything owned.
    if (!pay(g, 200)) return true;
    g.player.ammo = WEAPONS.map((w) => w.ammo);
    g.shopOpen = null;
    return true;
  }
  if (digit === 7) { g.shopOpen = null; return true; }
  if (idx === undefined) return true;
  const w = WEAPONS[idx];
  if (g.player.weapons[idx]) return true;
  if (!pay(g, w.price)) return true;
  g.player.weapons[idx] = true;
  g.shopOpen = null;
  return true;
}
