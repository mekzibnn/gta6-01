// Solmar Heat v7 — career save.
// One localStorage key holds the whole career. The shape is versioned;
// a save from another version is ignored and the player starts fresh.
// v7 adds district standing to the shape (the v2 key stays the same).

export const SAVE_KEY = 'solmar-heat.save.v2';
export const SAVE_VERSION = 2;

export function blankCareer() {
  return {
    v: SAVE_VERSION,
    cash: 400,
    respect: 0,
    districtStanding: { marina: 0, oldtown: 0, docks: 0, hills: 0, downtown: 0 },
    empire: { owned: {}, totalEarned: 0 },
    roster: { hired: {} },
    streetRaces: { won: 0, best: {} },
    garage: { engine: 0, armor: 0, nitro: 0, paint: 'Sunset Orange' },
    missionsDone: [],
    timePlayed: 0,
  };
}

function saneCareer(raw) {
  const blank = blankCareer();
  if (!raw || typeof raw !== 'object' || raw.v !== SAVE_VERSION) return blank;
  const out = { ...blank };
  if (typeof raw.cash === 'number' && Number.isFinite(raw.cash)) out.cash = Math.max(0, Math.floor(raw.cash));
  if (typeof raw.respect === 'number' && Number.isFinite(raw.respect)) out.respect = Math.max(0, Math.floor(raw.respect));
  if (raw.districtStanding && typeof raw.districtStanding === 'object') {
    for (const key of Object.keys(out.districtStanding)) {
      const val = raw.districtStanding[key];
      if (typeof val === 'number' && Number.isFinite(val)) out.districtStanding[key] = Math.max(0, Math.floor(val));
    }
  }
  if (raw.empire && typeof raw.empire === 'object') {
    if (raw.empire.owned && typeof raw.empire.owned === 'object') out.empire.owned = raw.empire.owned;
    if (typeof raw.empire.totalEarned === 'number') out.empire.totalEarned = Math.max(0, raw.empire.totalEarned);
  }
  if (raw.roster && typeof raw.roster === 'object' && raw.roster.hired && typeof raw.roster.hired === 'object') {
    out.roster.hired = raw.roster.hired;
  }
  if (raw.streetRaces && typeof raw.streetRaces === 'object') {
    if (typeof raw.streetRaces.won === 'number') out.streetRaces.won = Math.max(0, raw.streetRaces.won);
    if (raw.streetRaces.best && typeof raw.streetRaces.best === 'object') out.streetRaces.best = raw.streetRaces.best;
  }
  if (raw.garage && typeof raw.garage === 'object') {
    for (const key of ['engine', 'armor', 'nitro']) {
      if (typeof raw.garage[key] === 'number') out.garage[key] = Math.max(0, Math.floor(raw.garage[key]));
    }
    if (typeof raw.garage.paint === 'string') out.garage.paint = raw.garage.paint;
  }
  if (Array.isArray(raw.missionsDone)) out.missionsDone = raw.missionsDone.filter((m) => typeof m === 'string');
  if (typeof raw.timePlayed === 'number' && Number.isFinite(raw.timePlayed)) out.timePlayed = Math.max(0, raw.timePlayed);
  return out;
}

export function readCareer() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return blankCareer();
    return saneCareer(JSON.parse(raw));
  } catch {
    return blankCareer();
  }
}

export function writeCareer(career) {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(career));
    return true;
  } catch {
    return false;
  }
}
