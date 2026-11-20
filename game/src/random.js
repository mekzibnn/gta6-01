// A small seeded random number generator (mulberry32): the same seed gives the
// same city, traffic and missions, which is what makes the screenshot scenes
// repeatable. Nothing here reads the clock for gameplay.
export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick one element of an array with the seeded generator. */
export function pick(random, list) {
  return list[Math.floor(random() * list.length)];
}

/** A value in [min, max) from the seeded generator. */
export function range(random, min, max) {
  return min + random() * (max - min);
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
