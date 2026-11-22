// Solmar Heat v7 — deterministic dice.
// A tiny mulberry32 generator so a seed always builds the same city,
// the same traffic, and the same crowd. The game takes its seed from the
// URL (?seed=) or from the clock when no seed is given.

export function makeDice(seed) {
  let a = (seed >>> 0) || 0x9e3779b9;
  function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    range(min, max) {
      return min + next() * (max - min);
    },
    chance(p) {
      return next() < p;
    },
  };
}

export function seedFromClock() {
  return (Date.now() % 2147483647) | 0;
}

export function seedFromQuery() {
  try {
    const raw = new URLSearchParams(window.location.search).get('seed');
    const n = raw === null ? NaN : parseInt(raw, 10);
    return Number.isFinite(n) ? n : seedFromClock();
  } catch {
    return seedFromClock();
  }
}
