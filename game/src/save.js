// Career persistence for Solmar Heat (v6 rewrite).
// Progress lives in localStorage under one versioned key, so a player can
// close the tab and pick the career up later. The save is nested by system
// — empire, roster, street races — so each system owns its own corner and
// the playtest can read it back directly. Nothing here touches the live
// game state; main.js copies the save in at boot and writes it back on
// every change.

export const SAVE_KEY = 'solmar-heat.save.v2';

export function blankCareer() {
  return {
    v: 2,
    cash: 5000,
    respect: 0,
    empire: { owned: {}, totalEarned: 0 },
    roster: { hired: {} },
    streetRaces: { won: 0, best: {} },
    missionsDone: [],
    garage: { engine: 0, armor: 0, nitro: 0, paint: 0 },
    timePlayed: 0,
  };
}

export function readCareer() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return blankCareer();
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.v !== 2) return blankCareer();
    const fresh = blankCareer();
    const empire = parsed.empire && typeof parsed.empire === 'object' ? parsed.empire : {};
    const roster = parsed.roster && typeof parsed.roster === 'object' ? parsed.roster : {};
    const races = parsed.streetRaces && typeof parsed.streetRaces === 'object' ? parsed.streetRaces : {};
    return {
      v: 2,
      cash: typeof parsed.cash === 'number' ? parsed.cash : fresh.cash,
      respect: typeof parsed.respect === 'number' ? parsed.respect : 0,
      empire: {
        owned: empire.owned && typeof empire.owned === 'object' ? empire.owned : {},
        totalEarned: typeof empire.totalEarned === 'number' ? empire.totalEarned : 0,
      },
      roster: {
        hired: roster.hired && typeof roster.hired === 'object' ? roster.hired : {},
      },
      streetRaces: {
        won: typeof races.won === 'number' ? races.won : 0,
        best: races.best && typeof races.best === 'object' ? races.best : {},
      },
      missionsDone: Array.isArray(parsed.missionsDone) ? parsed.missionsDone : [],
      garage: parsed.garage && typeof parsed.garage === 'object' ? { ...fresh.garage, ...parsed.garage } : fresh.garage,
      timePlayed: typeof parsed.timePlayed === 'number' ? parsed.timePlayed : 0,
    };
  } catch (err) {
    return blankCareer();
  }
}

export function writeCareer(career) {
  try {
    const slim = {
      v: 2,
      cash: career.cash,
      respect: career.respect,
      empire: { owned: career.empire.owned, totalEarned: career.empire.totalEarned || 0 },
      roster: { hired: career.roster.hired },
      streetRaces: { won: career.streetRaces.won, best: career.streetRaces.best },
      missionsDone: career.missionsDone,
      garage: career.garage,
      timePlayed: career.timePlayed,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(slim));
    return true;
  } catch (err) {
    return false;
  }
}

export function eraseCareer() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (err) {
    // A missing key is already erased.
  }
  return blankCareer();
}
