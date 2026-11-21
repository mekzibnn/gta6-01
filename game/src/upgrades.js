// Mara's Garage, v3: the full upgrade shop. Leo's cars are no longer just
// stolen metal — every car he owns can be tuned at the garage, and the tuning
// is part of the career: engine and armor tiers, paint jobs, and nitro
// charges for a burst of speed when the SCPD is closing in. The shop owns
// its catalogue, its prices, and what each tier does to a car, so the
// physics (vehicles.js) and the save file (save.js) never hard-code a tier.
import { GARAGE, WANTED } from './config.js';

/** Nitro: a purchasable burst. One charge, one hard push. */
export const NITRO = {
  cost: 150,
  maxCharges: 3,
  duration: 3,
  boost: 1.6,
};

/** The four shop bays, in the order the garage menu lists them. */
export const SHOP_BAYS = [
  { key: 'engine', label: 'Engine', slot: 0, blurb: 'Top speed and acceleration' },
  { key: 'armor', label: 'Armor', slot: 1, blurb: 'Shrugs off crashes and rams' },
  { key: 'paint', label: 'Paint', slot: 2, blurb: 'A fresh coat, any colour' },
  { key: 'nitro', label: 'Nitro', slot: 3, blurb: 'A 3-second burst of speed' },
];

/**
 * Top-tier perks: the best kit does more than the numbers on the box.
 * A Street King engine wins races faster, so the flag pays 10% more; a
 * Military hull is hard to strip, so a bust costs half the usual cash.
 */
export const UPGRADE_PERKS = [
  {
    id: 'race-pay',
    needs: (u) => (u.engine || 0) >= 3,
    text: 'Street King engine — race wins pay +10%',
  },
  {
    id: 'bust-proof',
    needs: (u) => (u.armor || 0) >= 3,
    text: 'Military hull — a bust costs $100, not $200',
  },
];

/** The perks the current build has earned, as one-line descriptions. */
export function activePerks(upgrades) {
  return UPGRADE_PERKS.filter((perk) => perk.needs(upgrades || {})).map((perk) => perk.text);
}

/** Race winnings multiplier from the engine perk (1.1 with a Street King). */
export function raceRewardMultiplier(upgrades) {
  return (upgrades && upgrades.engine >= 3) ? 1.1 : 1;
}

/** Cash lost on a bust: halved by the Military hull perk. */
export function bustedPenalty(upgrades) {
  return (upgrades && upgrades.armor >= 3) ? 100 : 200;
}

/** A fresh upgrade state for a new career. `nitro` counts charges, not a tier. */
export function createUpgradeState() {
  return { engine: 0, armor: 0, paint: 0, nitro: 0 };
}

/** Clamp a loaded upgrade state to what the catalogue actually offers. */
export function sanitizeUpgrades(saved) {
  const clean = createUpgradeState();
  if (!saved || typeof saved !== 'object') return clean;
  clean.engine = Math.max(0, Math.min(GARAGE.engine.length - 1, saved.engine | 0));
  clean.armor = Math.max(0, Math.min(GARAGE.armor.length - 1, saved.armor | 0));
  clean.paint = Math.max(0, Math.min(GARAGE.paints.length - 1, saved.paint | 0));
  clean.nitro = Math.max(0, Math.min(NITRO.maxCharges, saved.nitro | 0));
  return clean;
}

/**
 * What the current tiers do to a car. Read straight from the catalogue, so
 * adding a tier in config.js flows through with no code change here or in
 * the physics. Returns top-speed / acceleration multipliers and the crash
 * damage fraction the armor lets through.
 */
export function upgradeMultipliers(upgrades) {
  const engineTier = GARAGE.engine[Math.min((upgrades && upgrades.engine) || 0, GARAGE.engine.length - 1)];
  const armorTier = GARAGE.armor[Math.min((upgrades && upgrades.armor) || 0, GARAGE.armor.length - 1)];
  return {
    top: engineTier.top,
    accel: engineTier.accel,
    resist: armorTier.resist,
    engineName: engineTier.name,
    armorName: armorTier.name,
  };
}

/** The paint colour the player's car should wear right now. */
export function currentPaint(upgrades) {
  const index = Math.min((upgrades && upgrades.paint) || 0, GARAGE.paints.length - 1);
  return GARAGE.paints[index];
}

/** What the next purchase in a bay costs, or null when the bay is maxed. */
export function nextPurchase(upgrades, bay) {
  if (bay === 'nitro') {
    if ((upgrades.nitro || 0) >= NITRO.maxCharges) return null;
    return { name: `Nitro charge (${upgrades.nitro + 1}/${NITRO.maxCharges})`, cost: NITRO.cost };
  }
  if (bay === 'paint') {
    return { name: GARAGE.paints[(upgrades.paint + 1) % GARAGE.paints.length], cost: 200 };
  }
  const list = GARAGE[bay];
  const level = upgrades[bay] || 0;
  if (level >= list.length - 1) return null;
  const tier = list[level + 1];
  return { name: tier.name, cost: tier.cost };
}

/** One-line summary of the current build, for the HUD chip. */
export function upgradeSummary(upgrades) {
  const mult = upgradeMultipliers(upgrades);
  return {
    engine: mult.engineName,
    armor: mult.armorName,
    paint: currentPaint(upgrades),
    nitro: upgrades.nitro || 0,
    text: `ENG ${mult.engineName} · ARMOR ${mult.armorName} · NITRO ${upgrades.nitro || 0}`,
    perks: activePerks(upgrades),
  };
}

/** Rows the garage menu draws: label, current state, next purchase, price. */
export function shopRows(upgrades) {
  return SHOP_BAYS.map((bay) => {
    const next = nextPurchase(upgrades, bay.key);
    let current;
    if (bay.key === 'engine') current = `Level ${upgrades.engine} — ${upgradeMultipliers(upgrades).engineName}`;
    else if (bay.key === 'armor') current = `Level ${upgrades.armor} — ${upgradeMultipliers(upgrades).armorName}`;
    else if (bay.key === 'paint') current = `Current: ${currentPaint(upgrades)}`;
    else current = `${upgrades.nitro || 0}/${NITRO.maxCharges} charges held`;
    return {
      key: bay.key,
      label: bay.label,
      blurb: bay.blurb,
      current,
      next: next ? `${next.name} — $${next.cost}` : 'MAXED OUT',
      affordable: !!next,
    };
  });
}

/**
 * Buy the next item in a bay. Returns an event object the caller turns into
 * a toast: { ok, message }. Paint cycles colours; engine and armor climb
 * their tier lists; nitro stocks a charge. Cash is only taken on success,
 * and the career is saved by the caller when ok is true.
 */
export function buyUpgrade(game, kind) {
  const player = game.player;
  const upgrades = game.upgrades;
  if (kind === 'paint') {
    if (player.cash < 200) return { ok: false, message: 'Paint costs $200' };
    player.cash -= 200;
    upgrades.paint = (upgrades.paint + 1) % GARAGE.paints.length;
    if (player.car) player.car.paint = currentPaint(upgrades);
    return { ok: true, message: 'Fresh paint — looking sharp', sound: 'coin' };
  }
  if (kind === 'nitro') {
    if ((upgrades.nitro || 0) >= NITRO.maxCharges) {
      return { ok: false, message: `Nitro rack is full (${NITRO.maxCharges} charges)` };
    }
    if (player.cash < NITRO.cost) return { ok: false, message: `A nitro charge costs $${NITRO.cost}` };
    player.cash -= NITRO.cost;
    upgrades.nitro = (upgrades.nitro || 0) + 1;
    return { ok: true, message: `Nitro stocked — ${upgrades.nitro}/${NITRO.maxCharges} charges`, sound: 'coin' };
  }
  const list = GARAGE[kind];
  if (!list) return { ok: false, message: 'No such bay in the garage' };
  const level = upgrades[kind] || 0;
  if (level >= list.length - 1) {
    return { ok: false, message: `${kind === 'engine' ? 'Engine' : 'Armor'} is maxed out` };
  }
  const tier = list[level + 1];
  if (player.cash < tier.cost) return { ok: false, message: `${tier.name} costs $${tier.cost}` };
  player.cash -= tier.cost;
  upgrades[kind] = level + 1;
  return { ok: true, message: `${tier.name} installed`, sound: 'coin' };
}

/**
 * Light the fuse: spend one nitro charge for a burst. Only works from the
 * driver's seat, while the car still has speed to build on. Returns true
 * when the burst actually fired.
 */
export function useNitro(game) {
  const player = game.player;
  if (!player.car || player.onFoot) return false;
  if ((game.upgrades.nitro || 0) <= 0) return false;
  if (player.car.nitro > 0) return false;
  game.upgrades.nitro -= 1;
  player.car.nitro = NITRO.duration;
  return true;
}

/** What the chop shop pays for a car, by kind, plus a cut of the tuning. */
const CHOP_PRICES = { sedan: 300, sport: 800, truck: 500, taxi: 400, van: 350, police: 0 };

export function sellValue(game) {
  const car = game.player && game.player.car;
  if (!car) return 0;
  const base = CHOP_PRICES[car.kind] ?? 250;
  return base + Math.floor(upgradesValue(game.upgrades) * 0.25);
}

/**
 * Sell the car you are driving to the chop shop: the car is gone, the
 * cash is in hand, and Leo is on foot. A police cruiser cannot be sold —
 * the SCPD wants that one back. Returns { ok, message } like buyUpgrade.
 */
export function sellCar(game) {
  const player = game.player;
  if (!player.car || player.onFoot) return { ok: false, message: 'No car to sell — steal one first' };
  if (player.car.kind === 'police') {
    return { ok: false, message: 'The SCPD wants that cruiser back — no sale' };
  }
  const value = sellValue(game);
  const index = game.cars.indexOf(player.car);
  if (index >= 0) game.cars.splice(index, 1);
  player.car = null;
  player.onFoot = true;
  player.cash += value;
  game.garageOpen = false;
  return { ok: true, message: `Sold for $${value} — the chop shop asks no questions`, sound: 'coin' };
}

/** Cash value of everything bolted onto the current build (for the dossier). */
export function upgradesValue(upgrades) {
  let value = 0;
  for (let i = 1; i <= (upgrades.engine || 0); i += 1) value += GARAGE.engine[i].cost;
  for (let i = 1; i <= (upgrades.armor || 0); i += 1) value += GARAGE.armor[i].cost;
  value += (upgrades.paint || 0) * 200;
  value += (upgrades.nitro || 0) * NITRO.cost;
  return value;
}

/** The garage price list, for the help line. Kept in one place. */
export function garagePrices() {
  return {
    spray: WANTED.sprayCost,
    ammo: WANTED.ammoCost,
    heal: WANTED.healCost,
    paint: 200,
    nitro: NITRO.cost,
  };
}
