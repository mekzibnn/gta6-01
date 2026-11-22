// Solmar Heat v9 — storefronts.
// Every place you can walk up to and press E. A shop is a label and a
// radius; a menu is a list of numbered buys. Buying closes the menu.
// The Chop Shop is not a menu — drive a car in and it is sold on the spot.

import { WEAPONS } from './config.js';
import { ventureDef, buyVenture, upgradeVenture } from './empire.js';
import { mateDef, hireMate, crewGarageRate } from './crew.js';
import { raceDef, startRace } from './races.js';
import { engineCost, buyEngine, armorCost, buyArmor, buyNitro, buyPaint } from './upgrades.js';
import { healPlayer } from './actors.js';

const RADIUS = 10;
const ENGINE_NAMES = ['', 'Street', 'Race', 'Pro'];
const ARMOR_NAMES = ['', 'Light', 'Heavy'];
const PAINTS = ['Sunset Orange', 'Midnight Blue', 'Lime Rush', 'Cherry Red', 'Pearl White', 'Shadow Black'];

function item(slot, name, price, run) {
  return { slot, name, price, run };
}

export function initShops(city) {
  const at = (key) => city.spots[key];
  const shops = [
    { id: 'garage', label: 'Garage', kind: 'garage', x: at('garage').x, z: at('garage').z },
    { id: 'gun', label: 'Gun Store', kind: 'gun', x: at('gunStore').x, z: at('gunStore').z },
    { id: 'crew', label: 'Crew Office', kind: 'crew', x: at('crewOffice').x, z: at('crewOffice').z },
    { id: 'races', label: 'Race Office', kind: 'races', x: at('dragStrip').x, z: at('dragStrip').z },
    { id: 'diner', label: 'Diner', kind: 'food', x: at('diner').x, z: at('diner').z },
    { id: 'chop', label: 'Chop Shop', kind: 'chop', x: at('chopShop').x, z: at('chopShop').z },
  ];
  const ventureSpots = {
    'solmar-laundry': 'laundry',
    'sunset-carwash': 'carWash',
    'sunset-taxi': 'taxiCo',
    'club-neon': 'nightclub',
  };
  for (const id of Object.keys(ventureSpots)) {
    const def = ventureDef(id);
    const spot = at(ventureSpots[id]);
    shops.push({ id, label: def.name, kind: 'venture', x: spot.x, z: spot.z });
  }
  return shops;
}

export function shopNear(world) {
  let best = null;
  let bestD = RADIUS;
  for (const shop of world.shops) {
    const dx = shop.x - world.player.x;
    const dz = shop.z - world.player.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < bestD) {
      bestD = d;
      best = shop;
    }
  }
  return best;
}

export function shopPrompt(shop) {
  if (!shop) return '';
  if (shop.kind === 'chop') return `Drive in to sell — ${shop.label}`;
  return `E — ${shop.label}`;
}

export function garageMenu(world) {
  const rate = crewGarageRate(world.roster);
  const items = [];
  const nextEngine = world.garage.engine + 1;
  if (nextEngine < 4) {
    items.push(item(1, `Engine ${nextEngine} — ${ENGINE_NAMES[nextEngine]}`, engineCost(nextEngine, rate), () => buyEngine(world.garage, world.player, rate, world.car) >= 0));
  }
  const nextArmor = world.garage.armor + 1;
  if (nextArmor < 3) {
    items.push(item(2, `Armor ${nextArmor} — ${ARMOR_NAMES[nextArmor]}`, armorCost(nextArmor, rate), () => buyArmor(world.garage, world.player, rate) >= 0));
  }
  items.push(item(3, 'Nitro charge', 300, () => buyNitro(world.garage, world.player) >= 0));
  const nextPaint = PAINTS[(PAINTS.indexOf(world.garage.paint) + 1) % PAINTS.length];
  items.push(item(4, `Paint — ${nextPaint}`, 200, () => buyPaint(world.garage, world.player, nextPaint) >= 0));
  return items;
}

export function ventureMenu(world, ventureId) {
  const def = ventureDef(ventureId);
  if (!def) return [];
  const owned = world.empire.owned[ventureId];
  if (!owned) {
    return [item(1, `Buy ${def.name} — $${def.cost}`, def.cost, () => buyVenture(world.empire, world.player, ventureId) >= 0)];
  }
  const cost = def.cost * owned.level;
  return [item(1, `Upgrade ${def.name} to level ${owned.level + 1} — $${cost}`, cost, () => upgradeVenture(world.empire, world.player, ventureId) >= 0)];
}

export function crewMenu(world) {
  return ['milo', 'vera', 'tank'].map((id, i) => {
    const def = mateDef(id);
    const hired = !!world.roster.hired[id];
    return item(i + 1, hired ? `${def.name} — hired` : `Hire ${def.name} — ${def.blurb}`, def.cost, () => hireMate(world.roster, world.player, id) >= 0);
  });
}

export function raceMenu(world) {
  return ['drag', 'sprint', 'circuit'].map((id, i) => {
    const def = raceDef(id);
    return item(i + 1, `${def.name} — entry $${def.fee}, prize $${def.prize}`, def.fee, () => startRace(world.streetRaces, world.player, id));
  });
}

export function gunMenu(world) {
  return WEAPONS.slice(1).map((w, i) => {
    const owned = !!world.player.weapons[i + 1];
    return item(i + 1, owned ? `${w.name} — owned` : `Buy ${w.name} — $${w.price}`, w.price, () => {
      if (world.player.weapons[i + 1] || world.player.cash < w.price) return false;
      world.player.cash = world.player.cash - w.price;
      world.player.weapons[i + 1] = true;
      return true;
    });
  });
}

export function foodMenu(world) {
  return [item(1, 'Meal — heals 40', 30, () => {
    if (world.player.cash < 30 || world.player.health >= 100) return false;
    world.player.cash = world.player.cash - 30;
    healPlayer(world.player, 40);
    return true;
  })];
}
