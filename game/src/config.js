// Solmar Heat — tuning table (v6 rewrite).
// Every number the game balances on lives here, grouped by system, so a
// designer can retune the whole game without touching the simulation code.

export const ECONOMY = {
  // Cash the player starts with on a fresh save.
  startCash: 5000,
  // Story mission payouts, in the order the missions run.
  missionPayout: [400, 650, 900, 1200, 1600, 2100, 2600, 3200, 3800, 4500, 6000, 7500],
  // A delivery drop inside a mission pays this on top of the mission payout.
  dropBonus: 150,
  // Chop shop: fraction of a stolen car's value the fence pays.
  fenceCut: 0.55,
  // Cash handed to a busted player is lost at this rate.
  bustFine: 0.25,
};

export const VENTURES = {
  // Buyable businesses: id, display name, buy price, base income per game hour.
  list: [
    { id: 'solmar-laundry', label: 'Solmar Laundry', price: 500, hourly: 35, district: 'harbor' },
    { id: 'palm-wash', label: 'Palm Wash', price: 800, hourly: 60, district: 'marina' },
    { id: 'sunset-taxi', label: 'Sunset Taxi Co.', price: 1200, hourly: 90, district: 'uptown' },
    { id: 'neon-palms', label: 'Neon Palms Club', price: 2500, hourly: 180, district: 'downtown', nightBoost: 2, nightFrom: 21, nightTo: 5 },
  ],
  // Each level adds this fraction of the base hourly income.
  levelBonus: 0.25,
  // Upgrading a business costs this fraction of its buy price, per level.
  upgradeCost: 0.6,
  // Income is banked once per game hour, not per frame.
  tickHours: 1,
};

export const MATES = {
  // Recruitable crew: id, display name, hire price, perk.
  list: [
    { id: 'milo', label: 'Milo', role: 'wheelman', price: 900, handling: 1.25 },
    { id: 'vera', label: 'Vera', role: 'hacker', price: 1100, decay: 1.5 },
    { id: 'tank', label: 'Tank', role: 'muscle', price: 1000, damage: 1.4 },
  ],
  // Having any crew mate active knocks this off garage prices.
  garageDiscount: 0.1,
};

export const SERIES = {
  // Street race series: id, display name, entry fee, prize, gate count, par time.
  list: [
    { id: 'drag', label: 'Drag', fee: 100, prize: 400, gates: 2, par: 30 },
    { id: 'sprint', label: 'Sprint', fee: 150, prize: 600, gates: 4, par: 90 },
    { id: 'circuit', label: 'Circuit', fee: 300, prize: 1200, gates: 6, par: 150 },
  ],
  // Finishing over par pays only this fraction of the prize.
  latePrize: 0.5,
  // Rain multiplies the prize by this.
  rainBonus: 1.25,
  // Gate radius in world units; a car inside it counts as passed.
  gateRadius: 9,
};

export const GARAGE = {
  // Engine tiers: name, price, top-speed multiplier, acceleration multiplier.
  engines: [
    { name: 'Stock engine', price: 0, top: 1.0, accel: 1.0 },
    { name: 'Street engine', price: 800, top: 1.12, accel: 1.15 },
    { name: 'Race engine', price: 1600, top: 1.28, accel: 1.35 },
    { name: 'Pro engine', price: 3200, top: 1.5, accel: 1.6 },
  ],
  // Armor tiers: name, price, damage reduction.
  armor: [
    { name: 'No armor', price: 0, soak: 0 },
    { name: 'Light armor', price: 900, soak: 0.25 },
    { name: 'Heavy armor', price: 2000, soak: 0.5 },
  ],
  // Nitro: price per charge, top-speed boost while burning.
  nitroPrice: 350,
  nitroBoost: 1.35,
  nitroSeconds: 4,
};

export const HEAT = {
  // Wanted stars, 0-5. Decay: one star per this many quiet seconds.
  maxStars: 5,
  decaySeconds: 22,
  // A mission drop raises the heat by this many stars.
  dropRaise: 1,
  // Cop spawn distance and chase top speed scale with stars.
  copBase: 2,
  copPerStar: 1,
};

export const RESPECT = {
  // Respect tiers: name, points needed, label shown in the HUD.
  tiers: [
    { name: 'Nobody', points: 0 },
    { name: 'Hustler', points: 400 },
    { name: 'Shot Caller', points: 1600 },
    { name: 'Street King', points: 3500 },
  ],
  // Points per completed mission, per race won, per business bought.
  perMission: 120,
  perRace: 90,
  perBusiness: 150,
};

export const WORLD = {
  // City footprint in world units; the playable grid sits inside it.
  halfSize: 340,
  block: 44,
  roadWidth: 12,
  // How many pedestrians walk the sidewalks at once.
  pedCount: 64,
  // Day length in real seconds; the clock wraps at 24h.
  daySeconds: 480,
  // The sun sets and the lamps come on at this hour.
  duskHour: 18,
  dawnHour: 6,
};

export const LOOK = {
  // Sky and light: golden hour, noon, night.
  skyNoon: 0x8ec9e8,
  skyGolden: 0xf7b267,
  skyNight: 0x0d1b26,
  fogGolden: 0xf2c184,
  fogNight: 0x0a141d,
  // Building palette: warm low-poly blocks.
  buildingColors: [0xe2725b, 0x4f9d8f, 0xe8b04b, 0x7a6ff0, 0xc65d7b, 0x5b8c5a, 0xef8354, 0x2a9d8f],
  roadColor: 0x23282e,
  sidewalkColor: 0x8a8f98,
  // The player's car and the heli.
  playerPaint: 0xff5a3c,
  heliPaint: 0x1f2a37,
  // Race gate ring colour and business marker colour.
  gateColor: 0xffffff,
  ventureColor: 0xffd23f,
};

export const WEAPONS = {
  // Weapon slots: name, damage, ammo, price.
  slots: [
    { name: 'Fists', damage: 12, ammo: Infinity, price: 0 },
    { name: 'Pistol', damage: 22, ammo: 18, price: 400 },
    { name: 'SMG', damage: 16, ammo: 60, price: 900 },
    { name: 'Shotgun', damage: 45, ammo: 8, price: 1400 },
  ],
};
