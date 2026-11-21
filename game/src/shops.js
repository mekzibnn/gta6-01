// from, what the HUD promises, and what happens when Leo walks in. The
// main loop no longer carries a chain of ifs for each shop; it asks the
// registry what is in range and lets that entry run. Priority is the
// order of the list: the race flag beats the gun shop, the garage beats
// the spray shop, and so on.
//
// A shop's action gets `game` and a `ctx` of helpers the main loop owns
// (toasts, announcements, particles, the place and ped finders), so this
// module never reaches back into the loop. Nothing here changes what a
// shop costs or does — the registry only changes how the choice is made.
import { WEAPONS, WANTED } from './config.js';
import { startRace, startTaxi } from './missions.js';
import { buyVenture, ventureOwned, ventureById } from './empire.js';
import { hireMate, crewCheapestAvailable } from './crew.js';
import { startRace as startStreetRace, nextRaceCard } from './races.js';

/** One shop: where it is, which seat it serves, its promise, its deed. */
const SHOP_DEFS = [
  {
    id: 'race',
    place: 'race',
    radius: 110,
    modes: ['foot', 'car'],
    prompt: () => 'Street Race — E to start',
    blurb: 'Flag to flag across Solmar. Fastest through the checkpoints wins.',
    action(game, ctx) {
      if (game.race.active) return;
      const first = startRace(game.race, game.player, game.city, game.random);
      ctx.toast(game, `STREET RACE — reach ${first.label} first!`, 3, '#ffd94a');
      game.audio.blip();
    },
  },
  {
    id: 'gunshop',
    place: 'gunshop',
    radius: 90,
    modes: ['foot'],
    prompt(game) {
      const player = game.player;
      if (player.weapon === 'fists') return 'El Gato Guns — pick a gun first (Q)';
      return `El Gato Guns — ${WEAPONS[player.weapon].name} ammo $${WANTED.ammoCost}`;
    },
    blurb: 'Ammo for the gun in hand, or a new piece when the wallet allows.',
    action(game, ctx) {
      const player = game.player;
      // Buy ammo for the current weapon, or the weapon itself (3/4 at the shop).
      const spec = WEAPONS[player.weapon];
      if (player.weapon !== 'fists' && player.cash >= WANTED.ammoCost) {
        player.cash -= WANTED.ammoCost;
        player.ammo[player.weapon] = (player.ammo[player.weapon] || 0) + spec.ammo;
        game.audio.coin();
        ctx.toast(game, `${spec.name} ammo +${spec.ammo}`, 2);
      } else if (player.weapon === 'fists') {
        ctx.toast(game, 'Pick a gun first (Q) — ammo $40 · 3: SMG $600 · 4: Shotgun $900', 3);
      } else {
        ctx.toast(game, 'Not enough cash for ammo', 2);
      }
    },
  },
  {
    id: 'clinic',
    place: 'clinic',
    radius: 90,
    modes: ['foot'],
    prompt: () => `Clinica Sol — patch up $${WANTED.healCost}`,
    blurb: 'Full health, no questions asked, cash up front.',
    action(game, ctx) {
      const player = game.player;
      if (player.cash >= WANTED.healCost) {
        player.cash -= WANTED.healCost;
        player.health = 100;
        game.audio.coin();
        ctx.toast(game, 'Patched up — full health', 2);
      } else {
        ctx.toast(game, 'Not enough cash to heal', 2);
      }
    },
  },
  {
    id: 'garage',
    place: 'garage',
    radius: 110,
    modes: ['car'],
    prompt: () => "Mara's Garage — E for upgrades",
    blurb: 'Engines, armor, paint and nitro, fitted while you wait.',
    action(game, ctx) {
      game.garageOpen = true;
      game.audio.blip();
      ctx.announce("Mara's Garage. 1 engine, 2 armor, 3 paint, 4 nitro, 5 sell the car, E to leave.");
    },
  },
  {
    id: 'spray',
    place: 'spray',
    radius: 110,
    modes: ['car'],
    prompt(game) {
      if (game.player.wanted <= 0) return 'Spray & Go — no heat to clear';
      return `Spray & Go — lose the heat $${WANTED.sprayCost}`;
    },
    blurb: 'Fresh paint and a new plate. The SCPD forgets the car entirely.',
    // No heat, no sale: the E key passes through to the next shop (a taxi
    // fare on the same curb still gets picked up).
    available: (game) => game.player.wanted > 0,
    action(game, ctx) {
      const player = game.player;
      if (player.wanted <= 0) return;
      if (player.cash >= WANTED.sprayCost) {
        player.cash -= WANTED.sprayCost;
        player.wanted = 0;
        player.wantedTimer = 0;
        game.policeCars = [];
        game.cops = [];
        game.audio.coin();
        ctx.toast(game, 'Clean! Fresh paint, no heat', 2.5);
        ctx.particles(game, player.x, player.y, '#2fa36b', 14, 90);
      } else {
        ctx.toast(game, 'Respray costs $150', 2);
      }
    },
  },
  {
    id: 'taxi',
    radius: 0,
    modes: ['car'],
    prompt: () => 'Taxi fare — E to pick up',
    blurb: 'Someone needs a ride across town, and they pay in cash.',
    // The taxi has no fixed place: it is a pedestrian waving on the curb.
    find(game, ctx) {
      return ctx.nearestTaxiPed(game) || null;
    },
    action(game, ctx, ped) {
      ped.health = 0;
      const dest = startTaxi(game.mission, game.player, game.city, game.random);
      ctx.toast(game, `Fare to ${dest.label} — 90 seconds`, 2.5);
      game.audio.blip();
    },
  },
  {
    id: 'biz-taxi',
    place: 'taxioffice',
    radius: 110,
    modes: ['foot', 'car'],
    prompt(game) {
      const spec = ventureById('sunset-taxi');
      if (ventureOwned(game.empire, 'sunset-taxi')) return 'Sunset Taxi Co. — yours, $90/hr';
      return `Sunset Taxi Co. — buy the business $${spec.price}`;
    },
    blurb: 'A cab fleet that pays every hour, even while you sleep.',
    action(game, ctx) {
      const player = game.player;
      const result = buyVenture(game.empire, 'sunset-taxi', player.cash);
      if (result.ok) {
        player.cash = result.cash;
        game.audio.deal();
        ctx.toast(game, 'Sunset Taxi Co. is yours — it pays $90 an hour', 3, '#7dff8a');
      } else if (result.reason === 'already-owned') {
        ctx.toast(game, 'You already own Sunset Taxi Co.', 2);
      } else {
        ctx.toast(game, 'Sunset Taxi Co. costs $1200', 2);
      }
    },
  },
  {
    id: 'biz-laundry',
    place: 'laundry',
    radius: 110,
    modes: ['foot', 'car'],
    prompt(game) {
      const spec = ventureById('solmar-laundry');
      if (ventureOwned(game.empire, 'solmar-laundry')) return 'Solmar Laundry — yours, $35/hr';
      return `Solmar Laundry — buy the business $${spec.price}`;
    },
    blurb: 'Washers humming next to the market; small money, steady money.',
    action(game, ctx) {
      const player = game.player;
      const result = buyVenture(game.empire, 'solmar-laundry', player.cash);
      if (result.ok) {
        player.cash = result.cash;
        game.audio.deal();
        ctx.toast(game, 'Solmar Laundry is yours — it pays $35 an hour', 3, '#7dff8a');
      } else if (result.reason === 'already-owned') {
        ctx.toast(game, 'You already own Solmar Laundry.', 2);
      } else {
        ctx.toast(game, 'Solmar Laundry costs $500', 2);
      }
    },
  },
  {
    id: 'biz-club',
    place: 'club',
    radius: 110,
    modes: ['foot', 'car'],
    prompt(game) {
      const spec = ventureById('neon-palms');
      if (ventureOwned(game.empire, 'neon-palms')) return 'Neon Palms Club — yours, $180/hr';
      return `Neon Palms Club — buy the business $${spec.price}`;
    },
    blurb: 'The basement club under the neon sign; it doubles after dark.',
    action(game, ctx) {
      const player = game.player;
      const result = buyVenture(game.empire, 'neon-palms', player.cash);
      if (result.ok) {
        player.cash = result.cash;
        game.audio.deal();
        ctx.toast(game, 'Neon Palms Club is yours — it pays $180 an hour', 3, '#7dff8a');
      } else if (result.reason === 'already-owned') {
        ctx.toast(game, 'You already own Neon Palms Club.', 2);
      } else {
        ctx.toast(game, 'Neon Palms Club costs $2500', 2);
      }
    },
  },
  {
    id: 'biz-wash',
    place: 'wash',
    radius: 110,
    modes: ['foot', 'car'],
    prompt(game) {
      const spec = ventureById('palm-wash');
      if (ventureOwned(game.empire, 'palm-wash')) return 'Palm Wash — yours, $60/hr';
      return `Palm Wash — buy the business $${spec.price}`;
    },
    blurb: 'A drive-through wash off Palm Strip, always a queue.',
    action(game, ctx) {
      const player = game.player;
      const result = buyVenture(game.empire, 'palm-wash', player.cash);
      if (result.ok) {
        player.cash = result.cash;
        game.audio.deal();
        ctx.toast(game, 'Palm Wash is yours — it pays $60 an hour', 3, '#7dff8a');
      } else if (result.reason === 'already-owned') {
        ctx.toast(game, 'You already own Palm Wash.', 2);
      } else {
        ctx.toast(game, 'Palm Wash costs $800', 2);
      }
    },
  },
  {
    id: 'crewbar',
    place: 'crewbar',
    radius: 110,
    modes: ['foot'],
    prompt(game) {
      const next = crewCheapestAvailable(game.roster, game.player.cash);
      if (!next) return 'The Overpass Bar — the crew is full';
      return `The Overpass Bar — hire ${next.name} ($${next.cost})`;
    },
    blurb: 'Specialists drink here. Hire the cheapest one on the spot.',
    action(game, ctx) {
      const player = game.player;
      const next = crewCheapestAvailable(game.roster, player.cash);
      if (!next) {
        ctx.toast(game, 'The crew is full — everyone is hired', 2);
        return;
      }
      const result = hireMate(game.roster, next.id, player.cash);
      if (result.ok) {
        player.cash = result.cash;
        game.audio.deal();
        ctx.toast(game, `${next.name} joined the crew — ${next.perkLabel}`, 3, '#7dff8a');
      } else {
        ctx.toast(game, `${next.name} costs $${next.cost}`, 2);
      }
    },
  },
  {
    id: 'dragstrip',
    place: 'dragstrip',
    radius: 110,
    modes: ['car'],
    prompt(game) {
      if (game.streetRaces && game.streetRaces.running) return 'Street series — race in progress';
      const card = nextRaceCard(game.streetRaces);
      return `Portside Drag Strip — ${card.name}, entry $${card.fee}`;
    },
    blurb: 'The street series: three events, gates in order, prize at the flag.',
    action(game, ctx) {
      if (game.streetRaces && game.streetRaces.running) return;
      const card = nextRaceCard(game.streetRaces);
      const result = startStreetRace(game.streetRaces, card.id, game.player.cash);
      if (result.ok) {
        game.player.cash = result.cash;
        // The clock for the race is game time, not wall time, so the
        // series stays deterministic across seeds and replays.
        game.streetRaces.running.startedAt = game.time;
        game.audio.blip();
        ctx.toast(game, `${card.name} — ${card.gates} gates, first gate ahead!`, 3, '#ffd94a');
      } else {
        ctx.toast(game, `${card.name} entry is $${card.fee}`, 2);
      }
    },
  },
];

/** The first shop in range for this seat, with what matched it, or null. */
function matchShop(game, def, ctx) {
  if (def.available && !def.available(game)) return null;
  if (def.find) {
    const handle = def.find(game, ctx);
    return handle ? { def, handle } : null;
  }
  if (def.place && ctx.nearPlace(game, def.place, def.radius)) {
    return { def, handle: def.place };
  }
  return null;
}

/** The shops in range right now, in priority order, for this seat. */
export function shopsInRange(game, onFoot, ctx) {
  const mode = onFoot ? 'foot' : 'car';
  const found = [];
  for (const def of SHOP_DEFS) {
    if (!def.modes.includes(mode)) continue;
    const match = matchShop(game, def, ctx);
    if (match) found.push(match);
  }
  return found;
}

/**
 * Run the E key: the first shop in range for this seat does its deed.
 * Returns the shop id, or null when nothing was in range.
 */
export function enterShop(game, onFoot, ctx) {
  const matches = shopsInRange(game, onFoot, ctx);
  if (!matches.length) return null;
  const { def, handle } = matches[0];
  def.action(game, ctx, handle);
  return def.id;
}

/**
 * What the E key would do right now, as a HUD line — or null when no shop
 * is in range. The loop shows this while Leo is free-roaming, so the
 * player learns the shops without a manual.
 */
export function shopPrompt(game, onFoot, ctx) {
  const matches = shopsInRange(game, onFoot, ctx);
  if (!matches.length) return null;
  const { def, handle } = matches[0];
  return `E — ${def.prompt(game, handle)}`;
}

/** The shop registry itself, for the dossier and for tests. */
export function shopList() {
  return SHOP_DEFS.map((def) => ({
    id: def.id,
    place: def.place || 'curb',
    modes: def.modes.join('+'),
    blurb: def.blurb,
  }));
}
