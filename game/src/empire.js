// The business empire for Solmar Heat. No dependencies.
// Four storefronts the player buys and levels up. Each one pays out when
// the clock crosses an hour: $35 an hour for a level-1 laundry in the day,
// half again as much at night.

export const BUSINESSES = [
  { id: 'solmar-laundry', name: 'Solmar Laundry', cost: 500, income: 35 },
  { id: 'sunset-diner', name: 'Sunset Diner', cost: 1200, income: 80 },
  { id: 'taco-bay', name: 'Taco Bay', cost: 2000, income: 130 },
  { id: 'vinyl-records', name: 'Vinyl Records', cost: 3500, income: 220 },
];

export function businessById(id) {
  return BUSINESSES.find((b) => b.id === id) ?? null;
}

export function makeEmpire() {
  return { owned: {}, totalEarned: 0, lastHour: 18 };
}

// One business's hourly take, night paying half again as much.
export function businessIncome(business, level, isNight) {
  return business.income * level * (isNight ? 1.5 : 1);
}

// Pay out for every whole hour the clock crossed since the last tick.
// `hour` is the clock's current hour; the empire remembers where it left
// off, so a jump forward pays for each hour crossed and a jump back pays
// nothing.
export function payIncome(empire, player, hour, isNight) {
  const from = empire.lastHour;
  empire.lastHour = hour;
  if (hour <= from) return 0;
  let paid = 0;
  for (let h = Math.floor(from) + 1; h <= Math.floor(hour); h += 1) {
    for (const [id, holding] of Object.entries(empire.owned)) {
      const business = businessById(id);
      if (!business) continue;
      const take = businessIncome(business, holding.level, isNight);
      paid += take;
    }
  }
  if (paid > 0) {
    player.cash += paid;
    empire.totalEarned += paid;
  }
  return paid;
}

// How many businesses the player owns.
export function ownedCount(empire) {
  return Object.keys(empire.owned).length;
}
