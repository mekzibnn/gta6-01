// Shops and menus for Solmar Heat.
// A shop is a storefront the player walks up to: the HUD names it, E opens
// its menu, and a digit buys. The Chop Shop is different: driving a car
// into it sells the car on the spot.

import { BUSINESSES, businessById } from './empire.js';
import { CREW } from './crew.js';
import { RACES, raceById, startRace } from './races.js';
import { enginePrice, armorPrice, nitroPrice, engineLabel, armorLabel } from './upgrades.js';

// Build the shop list from the city's spots. The Gun Store and the Crew
// Office stand at fixed addresses the city knows by heart.
export function buildShops(city) {
  const shops = [
    { id: 'gun-store', label: 'Gun Store', x: 148, z: 148, kind: 'store' },
    { id: 'crew-office', label: 'Crew Office', x: -24, z: -196, kind: 'crew' },
    { id: 'garage', label: 'Garage', x: city.spots.garage.x, z: city.spots.garage.z, kind: 'garage' },
    { id: 'race-office', label: 'Race Office', x: city.spots.dragStrip.x, z: city.spots.dragStrip.z, kind: 'races' },
  ];
  const ventureSpots = {
    'solmar-laundry': city.spots.laundry,
    'sunset-diner': { x: 104, z: -52 },
    'taco-bay': { x: -104, z: 52 },
    'vinyl-records': { x: 52, z: -104 },
  };
  for (const b of BUSINESSES) {
    const spot = ventureSpots[b.id];
    shops.push({ id: b.id, label: b.name, x: spot.x, z: spot.z, kind: 'venture', business: b.id });
  }
  return shops;
}

// The nearest shop within ten steps, or null.
export function updateShops(game) {
  const px = game.player.x;
  const pz = game.player.z;
  let best = null;
  let bestD = 10 * 10;
  for (const shop of game.shops) {
    const dx = shop.x - px;
    const dz = shop.z - pz;
    const d = dx * dx + dz * dz;
    if (d < bestD) {
      bestD = d;
      best = shop;
    }
  }
  game.shopNear = best;
}

// The menu items for the open shop: [digit, label, price].
export function menuItems(game) {
  const open = game.shopOpen;
  if (!open) return [];
  if (open.kind === 'garage') {
    const items = [];
    const ePrice = enginePrice(game.garage, game.roster);
    if (ePrice !== null) items.push(['1', `Engine — ${engineLabel(game.garage.engine + 1)}`, ePrice]);
    items.push(['2', 'Nitro charge', nitroPrice(game.roster)]);
    const aPrice = armorPrice(game.garage, game.roster);
    if (aPrice !== null) items.push(['3', `Armour — ${armorLabel(game.garage.armor + 1)}`, aPrice]);
    return items;
  }
  if (open.kind === 'venture') {
    const business = businessById(open.shopId);
    if (!business) return [];
    const owned = game.empire.owned[business.id];
    if (!owned) return [['1', `Buy ${business.name}`, business.cost]];
    return [['1', `Upgrade ${business.name} to level ${owned.level + 1}`, business.cost * owned.level]];
  }
  if (open.kind === 'crew') {
    return CREW.filter((c) => !game.roster.hired[c.id]).map((c, i) => [
      String(i + 1),
      `Hire ${c.name} — ${c.effect}`,
      c.cost,
    ]);
  }
  if (open.kind === 'races') {
    return RACES.map((r, i) => [String(i + 1), `${r.name} — $${r.prize} prize`, r.fee]);
  }
  if (open.kind === 'store') {
    const items = [];
    if (!game.player.weapons[1]) items.push(['1', 'Pistol', 400]);
    if (!game.player.weapons[2]) items.push(['2', 'SMG', 900]);
    if (!game.player.weapons[3]) items.push(['3', 'Shotgun', 1400]);
    return items;
  }
  return [];
}

// Buy the menu item on a digit key. Returns true when a purchase landed.
export function buyMenuItem(game, digit) {
  const open = game.shopOpen;
  if (!open) return false;
  const items = menuItems(game);
  const item = items.find(([key]) => key === digit);
  if (!item) return false;
  const price = item[2];
  if (game.player.cash < price) return false;
  game.player.cash -= price;

  if (open.kind === 'garage') {
    if (digit === '1') game.garage.engine += 1;
    else if (digit === '2') game.garage.nitro += 1;
    else if (digit === '3') game.garage.armor += 1;
  } else if (open.kind === 'venture') {
    const owned = game.empire.owned[open.shopId];
    if (!owned) game.empire.owned[open.shopId] = { level: 1 };
    else owned.level += 1;
  } else if (open.kind === 'crew') {
    const free = CREW.filter((c) => !game.roster.hired[c.id]);
    const mate = free[Number(digit) - 1];
    if (mate) game.roster.hired[mate.id] = { active: true };
  } else if (open.kind === 'races') {
    const race = RACES[Number(digit) - 1];
    if (race) {
      const gates = game.city.gateRoutes[race.id];
      startRace(game.streetRaces, race, gates, game.time);
    }
  } else if (open.kind === 'store') {
    game.player.weapons[Number(digit)] = true;
  }
  game.shopOpen = null;
  return true;
}

// Driving a car into the Chop Shop sells it on the spot.
export function updateChopShop(game) {
  if (!game.car || game.player.inCar === false) return;
  const spot = game.city.spots.chopShop;
  const dx = game.car.x - spot.x;
  const dz = game.car.z - spot.z;
  if (dx * dx + dz * dz > 10 * 10) return;
  const car = game.car;
  const value = 300 + (car.maxHealth - car.health);
  game.player.cash += value;
  game.cars = game.cars.filter((c) => c !== car);
  game.car = null;
  game.player.inCar = false;
  game.player.x = spot.x + 3;
  game.player.z = spot.z;
}
