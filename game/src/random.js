// Seeded random numbers for Solmar Heat. Every random choice in the game
// flows through one mulberry32 stream, so a ?seed=N URL plays the same
// city, the same traffic and the same weather every time. The stream is
// created once in main.js and handed to the modules that need it.

export function makeRng(seed) {
  let a = (seed >>> 0) || 1;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A small helper object built on top of a stream. Modules keep one of
// these and call its methods instead of Math.random, so the whole game
// stays deterministic under a fixed seed.
export function rngHelpers(next) {
  return {
    next,
    // Float in [min, max).
    range(min, max) {
      return min + next() * (max - min);
    },
    // Integer in [min, max] inclusive.
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    // One element of an array, uniformly.
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    // True with probability p.
    chance(p) {
      return next() < p;
    },
    // A value in [-spread, spread].
    jitter(spread) {
      return (next() * 2 - 1) * spread;
    },
  };
}

// Read the ?seed= query parameter, defaulting to 1. The playtest drives
// the game with ?seed=1, and the screenshot shots use it too.
export function seedFromUrl() {
  try {
    const v = new URLSearchParams(window.location.search).get('seed');
    const n = parseInt(v || '1', 10);
    return Number.isFinite(n) ? n : 1;
  } catch {
    return 1;
  }
}
