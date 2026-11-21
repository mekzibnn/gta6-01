// A small seeded random number generator (mulberry32): the same seed gives the
// same city, traffic and missions, which is what makes the screenshot scenes
// repeatable. Nothing here reads the clock for gameplay.
//
// The generator is a closure over one 32-bit state word. Each call advances
// the state by the golden-ratio constant, mixes it, and returns a float in
// [0, 1). The mix is mulberry32 exactly — the sequence for a seed must never
// change, or the seeded city changes with it.
export function createRandom(seed) {
  let state = seed | 0;
  return function random() {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** A value in [min, max) from the seeded generator. */
export function range(random, min, max) {
  return min + random() * (max - min);
}

/** Pick one element of an array with the seeded generator. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

/** True with probability p (0..1) — a seeded coin flip. */
export function chance(random, p) {
  return random() < p;
}

/** True with probability 1 in n — a seeded one-in-n chance. */
export function oneIn(random, n) {
  return random() < 1 / n;
}

/** A whole number in [min, max] (inclusive) from the seeded generator. */
export function rangeInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** Pick one item, weighted by its `weight` field. */
export function weightedPick(random, items) {
  const total = items.reduce((sum, item) => sum + (item.weight || 1), 0);
  let roll = random() * total;
  for (const item of items) {
    roll -= item.weight || 1;
    if (roll <= 0) return item;
  }
  return items[items.length - 1];
}

/** Fisher–Yates shuffle of a list, without mutating the original. */
export function shuffle(random, list) {
  const arr = list.slice();
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
