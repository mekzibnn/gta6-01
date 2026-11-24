// Solmar Heat v12 — shops: prompts, menus, buying, chop-shop sales.
import { SPOTS, GUN_STORE, CREW_OFFICE, BUSINESSES, CREW_DEFS, WEAPONS } from './config.js';
import { buyBusiness } from './empire.js';
import { hireCrew } from './crew.js';
import { startRace } from './races.js';
import { buyEngine, buyArmor, buyNitro } from './upgrades.js';
import { VEHICLE_DEFS } from './config.js';

function shopList(g) {
  return [
    { kind: 'garage', label: 'Garage', x: SPOTS.garage.x, z: SPOTS.garage.z },
    { kind: 'venture', label: 'Solmar Laundry', business: 'solmar-laundry', x: SPOTS.laundry.x, z: SPOTS.laundry.z },
    { kind: 'venture', label: 'Marina Cafe', business: 'marina-cafe', x: -60, z: 170 },
    { kind: 'venture', label: 'Beach Bar', business: 'beach-bar', x: 190, z: 80 },
    { kind: 'venture', label: 'Hillside Motors', business: 'hillside-motors', x: -160, z: 140 },
    { kind: 'gun', label: 'Gun Store', x: GUN_STORE.x, z: GUN_STORE.z },
    { kind: 'crew', label: 'Crew Office', x: CREW_OFFICE.x, z: CREW_OFFICE.z },
    { kind: 'races', label: 'Race Office', x: SPOTS.dragStrip.x, z: SPOTS.dragStrip.z },
  ];
}

export function nearestShop(g) {
  let best = null; let bd = 10;
  for (const s of shopList(g)) {
    const d = Math.hypot(g.player.x - s.x, g.player.z - s.z);
    if (d < bd) { bd = d; best = s; }
  }
  return best;
}

export function updateShopNear(g) {
  // Chop shop: drive a car in and it sells on the spot.
  if (g.car && g.player.inCar) {
    const cs = SPOTS.chopShop;
    if (Math.hypot(g.car.x - cs.x, g.car.z - cs.z) < 10) {
      const car = g.car;
      const price = (VEHICLE_DEFS[car.model] || VEHICLE_DEFS.sedan).price;
      g.player.cash += price;
      g.stats.carsSold += 1;
      const i = g.cars.indexOf(car);
      if (i >= 0) g.cars.splice(i, 1);
      g.player.inCar = false;
      g.player.x = car.x + 3; g.player.z = car.z;
      g.car = null;
      g.hud.banner = `CHOP SHOP — sold for $${price}`; g.hud.bannerT = 3; g.hud.bannerKind = 'shop';
      return;
    }
  }
  const best = nearestShop(g);
  g.shopNear = best ? { label: best.label, kind: best.kind, business: best.business } : null;
}

export function openShop(g) {
  if (!g.shopNear) return false;
  g.shopOpen = { kind: g.shopNear.kind, business: g.shopNear.business, label: g.shopNear.label };
  return true;
}

export function closeShop(g) { g.shopOpen = null; }

export function buyShopItem(g, digit) {
  const open = g.shopOpen;
  if (!open) return;
  const n = digit;
  if (open.kind === 'garage') {
    if (n === 1) buyEngine(g);
    else if (n === 2) buyArmor(g);
    else if (n === 3) buyNitro(g);
  } else if (open.kind === 'venture') {
    if (n === 1 && open.business) buyBusiness(g, open.business);
  } else if (open.kind === 'crew') {
    const def = CREW_DEFS[n - 1];
    if (def) hireCrew(g, def.id);
  } else if (open.kind === 'races') {
    const id = n === 1 ? 'drag' : n === 2 ? 'sprint' : n === 3 ? 'circuit' : null;
    if (id) startRace(g, id);
  } else if (open.kind === 'gun') {
    const wi = n === 1 ? 2 : n === 2 ? 3 : n === 3 ? 4 : n === 4 ? 5 : n === 5 ? 6 : -1;
    if (wi >= 2) {
      const w = WEAPONS[wi];
      if (w && !g.player.weapons[wi] && g.player.cash >= w.price) {
        g.player.cash -= w.price;
        g.player.weapons[wi] = true;
        g.player.ammo[w.name.toLowerCase()] = w.reserve;
      }
    }
  }
  closeShop(g);
}
