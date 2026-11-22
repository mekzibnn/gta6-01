// Seeded random numbers for Solmar Heat. No dependencies.
// mulberry32 is a tiny deterministic PRNG: the same seed always deals the
// same city, the same traffic and the same weather, so a run replays exactly.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A small RNG toolkit built on one seeded stream.
export function makeRng(seed) {
  const next = mulberry32(seed);
  return {
    next,
    // Float in [a, b).
    range(a, b) {
      return a + next() * (b - a);
    },
    // Integer in [a, b] inclusive.
    int(a, b) {
      return Math.floor(a + next() * (b - a + 1));
    },
    // One element of a list.
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    // True with probability p.
    chance(p) {
      return next() < p;
    },
    // A shuffled copy of a list.
    shuffle(list) {
      const out = list.slice();
      for (let i = out.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        const tmp = out[i];
        out[i] = out[j];
        out[j] = tmp;
      }
      return out;
    },
  };
}
