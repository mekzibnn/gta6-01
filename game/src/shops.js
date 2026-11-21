// Shops — where Leo spends his money (v6 rewrite).
// Every storefront Leo can walk into: the garage that tunes his car, the
// gun store that sells weapons and ammo, the diner that heals him, and the
// four businesses he can buy outright. A shop is a spot on the map plus a
// menu; the HUD shows the menu when Leo stands close, and the game applies
// the purchase. Buying a business happens at its own storefront.

import { VENTURES, MATES, SERIES, WEAPONS, GARAGE } from './config.js';
import { ventureDef } from './empire.js';
import { mateDef } from './crew.js';
import { raceDef } from './races.js';

export function initShops(city) {
  return [
    { id: 'garage', kind: 'garage', label: 'Garage', x: city.spots.garage.x, z: city.spots.garage.z, radius: 12 },
    { id: 'gunstore', kind: 'guns', label: 'Gun Store', x: 148, z: 148, label2: 'Ammu-Nation', radius: 10 },
    { id: 'diner', kind: 'food', label: 'Diner', x: -148, z: -148, radius: 10 },
    { id: 'clothes', kind: 'clothes', label: 'Clothes', x: 24, z: 196, radius: 10 },
    { id: 'laundry-shop', kind: 'venture', venture: 'solmar-laundry', label: 'Solmar Laundry', x: city.spots.laundry.x, z: city.spots.laundry.z, radius: 12 },
    { id: 'wash-shop', kind: 'venture', venture: 'palm-wash', label: 'Palm Wash', x: city.spots.carWash.x, z: city.spots.carWash.z, radius: 12 },
    { id: 'taxi-shop', kind: 'venture', venture: 'sunset-taxi', label: 'Sunset Taxi Co.', x: city.spots.taxiOffice.x, z: city.spots.taxiOffice.z, radius: 12 },
    { id: 'club-shop', kind: 'venture', venture: 'neon-palms', label: 'Neon Palms Club', x: city.spots.nightclub.x, z: city.spots.nightclub.z, radius: 12 },
    { id: 'crew-office', kind: 'crew', label: 'Crew Office', x: -24, z: -196, radius: 12 },
    { id: 'race-office', kind: 'races', label: 'Race Office', x: 0, z: 264, radius: 12 },
  ];
}

export function shopNear(shops, x, z) {
  let best = null;
  let bestD = Infinity;
  for (const s of shops) {
    const dx = x - s.x;
    const dz = z - s.z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < s.radius && d < bestD) { bestD = d; best = s; }
  }
  return best;
}

export function shopTitle(shop) {
  if (shop.kind === 'venture') {
    const def = ventureDef(shop.venture);
    return def ? `${def.label} — $${def.price}` : shop.label;
  }
  return shop.label;
}

export function ventureMenu(empire, ventureId) {
  const def = ventureDef(ventureId);
  if (!def) return [];
  const held = empire.owned[ventureId];
  if (held) {
    return [
      { key: 'upgrade', label: `Upgrade to level ${held.level + 1}`, cost: Math.round(def.price * 0.6 * held.level) },
      { key: 'leave', label: 'Leave' },
    ];
  }
  return [
    { key: 'buy', label: `Buy ${def.label} — $${def.price} ($${def.hourly}/hr)`, cost: def.price },
    { key: 'leave', label: 'Leave' },
  ];
}

export function crewMenu(crew) {
  const items = [];
  for (const def of MATES.list) {
    const hired = crew.hired[def.id];
    items.push({
      key: `hire-${def.id}`,
      label: hired ? `${def.label} — hired` : `Hire ${def.label} (${def.role}) — $${def.price}`,
      cost: hired ? 0 : def.price,
      hired: !!hired,
    });
  }
  items.push({ key: 'leave', label: 'Leave' });
  return items;
}

export function raceMenu(races) {
  const items = [];
  for (const def of SERIES.list) {
    const best = races.best[def.id];
    items.push({
      key: `race-${def.id}`,
      label: `${def.label} — $${def.fee} entry, $${def.prize} prize${typeof best === 'number' ? ` (best ${best}s)` : ''}`,
      cost: def.fee,
    });
  }
  items.push({ key: 'leave', label: 'Leave' });
  return items;
}

export function gunMenu(player) {
  const items = [];
  for (let i = 1; i < WEAPONS.slots.length; i += 1) {
    const w = WEAPONS.slots[i];
    items.push({
      key: `gun-${i}`,
      label: `${w.name} — $${w.price} (${w.ammo} rounds)`,
      cost: w.price,
      owned: player.weapon >= i,
    });
  }
  items.push({ key: 'ammo', label: 'Ammo refill — $120', cost: 120 });
  items.push({ key: 'leave', label: 'Leave' });
  return items;
}

export function foodMenu(player) {
  return [
    { key: 'meal', label: `Eat a meal — $25 (heal to full)`, cost: 25, hurt: player.health < 100 },
    { key: 'leave', label: 'Leave' },
  ];
}

export function garageMenu(garage, crew) {
  const items = [];
  const nextEngine = GARAGE.engines[garage.engine + 1];
  if (nextEngine) {
    items.push({ key: 'engine', label: `${nextEngine.name} — $${Math.round(nextEngine.price * (crewCount(crew) > 0 ? 0.9 : 1))}`, cost: Math.round(nextEngine.price * (crewCount(crew) > 0 ? 0.9 : 1)) });
  }
  const nextArmor = GARAGE.armor[garage.armor + 1];
  if (nextArmor) {
    items.push({ key: 'armor', label: `${nextArmor.name} — $${Math.round(nextArmor.price * (crewCount(crew) > 0 ? 0.9 : 1))}`, cost: Math.round(nextArmor.price * (crewCount(crew) > 0 ? 0.9 : 1)) });
  }
  items.push({ key: 'nitro', label: `Nitro charge — $${Math.round(GARAGE.nitroPrice * (crewCount(crew) > 0 ? 0.9 : 1))}`, cost: Math.round(GARAGE.nitroPrice * (crewCount(crew) > 0 ? 0.9 : 1)) });
  for (let i = 0; i < 5; i += 1) {
    items.push({ key: `paint-${i}`, label: `Paint ${i + 1} — $250`, cost: 250 });
  }
  items.push({ key: 'leave', label: 'Leave' });
  return items;
}

function crewCount(crew) {
  return Object.keys(crew.hired || {}).filter((id) => crew.hired[id].active).length;
}

export function shopPrompt(shop, game) {
  // Returns the menu lines the HUD shows for this shop, given the game.
  if (shop.kind === 'venture') return ventureMenu(game.empire, shop.venture);
  if (shop.kind === 'crew') return crewMenu(game.roster);
  if (shop.kind === 'races') return raceMenu(game.streetRaces);
  if (shop.kind === 'garage') return garageMenu(game.garage, game.roster);
  if (shop.kind === 'guns') return gunMenu(game.player);
  if (shop.kind === 'food') return foodMenu(game.player);
  return [{ key: 'leave', label: 'Leave' }];
}
