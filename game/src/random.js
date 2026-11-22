// Solmar Heat v9 — seeded dice.
// The whole city is dealt from one seed, so a given seed always builds
// the same streets, the same traffic and the same crowd. The seed comes
// from the URL (?seed=) when the page is opened that way, and from the
// wall clock otherwise. A xorshift generator keeps it cheap and repeatable.

export function makeDice(seed) {
  let s = (seed >>> 0) || 0x2545f491;
  function next() {
    s ^= (s << 13) >>> 0;
    s ^= s >>> 17;
    s ^= (s << 5) >>> 0;
    s >>>= 0;
    return s / 4294967296;
  }
  return {
    next,
    int(lo, hi) {
      return lo + Math.floor(next() * (hi - lo + 1));
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    range(lo, hi) {
      return lo + next() * (hi - lo);
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
