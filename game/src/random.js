// Deterministic dice for Solmar Heat (v6 rewrite).
// One tiny seeded generator drives every random choice in the game, so a
// given seed always deals the same city, the same traffic and the same
// weather. The live game seeds it from the clock; the screenshots and the
// playtest pin it, so their scenes never drift.

export function makeDice(seed) {
  // Mulberry32: short, fast, and good enough for a game.
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function diceRange(dice, low, high) {
  return low + dice() * (high - low);
}

export function diceInt(dice, low, high) {
  return Math.floor(diceRange(dice, low, high + 1));
}

export function dicePick(dice, list) {
  return list[Math.floor(dice() * list.length)];
}

export function diceChance(dice, odds) {
  return dice() < odds;
}

export function diceShuffle(dice, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(dice() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

export function diceSign(dice) {
  return dice() < 0.5 ? -1 : 1;
}

export function diceSpread(dice, centre, half) {
  return centre + (dice() * 2 - 1) * half;
}

export function seedFromClock() {
  return (Date.now() % 2147483647) | 0;
}
