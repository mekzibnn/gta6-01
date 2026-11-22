// Static tuning for Solmar Heat: the sunset palette, the prices, the
// crews, the businesses, the weapons and the car models. Nothing here
// reads the save or the network; it is pure data the systems consult.

// Ten sunset colours for the buildings, each with a roof colour that
// reads against it. No grey boxes: every building takes one of these.
export const PALETTE = [
  { wall: 0xd97b4f, roof: 0x8a4a2b }, // terracotta
  { wall: 0xe0b56a, roof: 0x9a7a3c }, // sand
  { wall: 0xf2e3c6, roof: 0xb08d5a }, // cream
  { wall: 0xe07856, roof: 0x7e3a26 }, // coral
  { wall: 0x3f8f8a, roof: 0x23504d }, // teal
  { wall: 0xd99a8c, roof: 0x8a5a4e }, // dusty rose
  { wall: 0x5d7d99, roof: 0x33475c }, // steel blue
  { wall: 0xf0c94a, roof: 0xa8872a }, // warm yellow
  { wall: 0xc9a06a, roof: 0x7d5f36 }, // tan
  { wall: 0x7d8ea3, roof: 0x46586e }, // grey-blue
];

// The five districts, keyed by the short id the save and the HUD use.
export const DISTRICTS = [
  { key: 'marina', name: 'Marina', blurb: 'Waterfront' },
  { key: 'oldtown', name: 'Old Town', blurb: 'Brick lanes' },
  { key: 'docks', name: 'Docks', blurb: 'Crates & cranes' },
  { key: 'hills', name: 'Hills', blurb: 'The high road' },
  { key: 'downtown', name: 'Downtown', blurb: 'Neon heart' },
];

// The crew. Each mate has a hire price and a real effect the game applies.
export const CREW = {
  milo: { id: 'milo', name: 'Milo', short: 'M', price: 900, effect: 'Handling +25%', desc: 'Wheelman. Corners like the road owes him.' },
  vera: { id: 'vera', name: 'Vera', short: 'V', price: 1500, effect: 'Heat decays 1.6x slower', desc: 'Fixer. The heat forgets you faster.' },
  tank: { id: 'tank', name: 'Tank', short: 'T', price: 2000, effect: 'Damage 1.5x', desc: 'Muscle. Hits land half again as hard.' },
};

// The four businesses. Income is per game hour, daytime rate; nights pay
// a little more because the streets are busier after dark.
export const BUSINESSES = {
  'solmar-laundry': { id: 'solmar-laundry', name: 'Solmar Laundry', price: 500, income: 35, nightBoost: 1.0 },
  'harbor-diner': { id: 'harbor-diner', name: 'Harbor Diner', price: 1200, income: 55, nightBoost: 1.2 },
  'sunset-motel': { id: 'sunset-motel', name: 'Sunset Motel', price: 2500, income: 110, nightBoost: 1.4 },
  'marina-club': { id: 'marina-club', name: 'Marina Club', price: 5000, income: 200, nightBoost: 1.5 },
};

// The four weapon slots. No ammo anywhere: a slot is either ready or
// locked, and the wheel only ever shows that.
export const WEAPONS = [
  { name: 'Fists', damage: 10 },
  { name: 'Pistol', damage: 25 },
  { name: 'SMG', damage: 18 },
  { name: 'Shotgun', damage: 45 },
];

// Car models. maxSpeed is metres per second before engine tiers.
export const CAR_MODELS = {
  sedan: { name: 'Solmar Sedan', maxSpeed: 27, accel: 11, color: 0x7d8ea3, price: 0 },
  sport: { name: 'Veloce GT', maxSpeed: 34, accel: 14, color: 0xc23b2e, price: 0 },
  taxi: { name: 'City Taxi', maxSpeed: 25, accel: 10, color: 0xf0c94a, price: 0 },
  truck: { name: 'Hauler Truck', maxSpeed: 21, accel: 8, color: 0x5d7d99, price: 0 },
  cop: { name: 'KPD Interceptor', maxSpeed: 32, accel: 13, color: 0x1c2733, price: 0 },
};

// Garage prices. Engine tier 1 is $800, tier 2 is $1600 list; a hired
// crew mate knocks 10% off every garage bill.
export const GARAGE_PRICES = {
  engine: [0, 800, 1600],
  armor: [0, 1200, 2400],
  nitroCharge: 300,
};
export const CREW_DISCOUNT = 0.9;

// Wanted: how long a star takes to cool off, and how many cops a star
// is worth. Heat Lock (mission 10) suspends the decay entirely.
export const WANTED_DECAY_SECONDS = 45;
export const COPS_PER_STAR = 2;
export const MAX_COPS = 6;

// The save key. The v2 shape is the one the playtest reads.
export const SAVE_KEY = 'solmar-heat.save.v2';
