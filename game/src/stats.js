// Career numbers for Solmar Heat (v6 rewrite).
// The ledger a career leaves behind: how far Leo drove, how long he played,
// what he earned, how often he got busted, how many races he won. The HUD
// reads these for the stats screen, and the save file carries them forward.

export function initLedger() {
  return {
    distanceKm: 0,
    timePlayed: 0,
    earned: 0,
    spent: 0,
    busted: 0,
    racesWon: 0,
    racesRun: 0,
    missionsDone: 0,
    businessesBought: 0,
    crewHired: 0,
    topSpeed: 0,
  };
}

export function ledgerAdd(ledger, key, amount) {
  if (typeof ledger[key] === 'number') ledger[key] += amount;
  return ledger;
}

export function ledgerSet(ledger, key, value) {
  ledger[key] = value;
  return ledger;
}

export function ledgerDrive(ledger, metres, seconds) {
  ledger.distanceKm += metres / 1000;
  ledger.timePlayed += seconds;
  return ledger;
}

export function ledgerEarn(ledger, amount) {
  ledger.earned += amount;
  return ledger;
}

export function ledgerSpend(ledger, amount) {
  ledger.spent += amount;
  return ledger;
}

export function ledgerBust(ledger) {
  ledger.busted += 1;
  return ledger;
}

export function ledgerRace(ledger, won) {
  ledger.racesRun += 1;
  if (won) ledger.racesWon += 1;
  return ledger;
}

export function ledgerMission(ledger) {
  ledger.missionsDone += 1;
  return ledger;
}

export function ledgerVenture(ledger) {
  ledger.businessesBought += 1;
  return ledger;
}

export function ledgerMate(ledger) {
  ledger.crewHired += 1;
  return ledger;
}

export function ledgerTopSpeed(ledger, kmh) {
  if (kmh > ledger.topSpeed) ledger.topSpeed = kmh;
  return ledger;
}

export function ledgerSummary(ledger) {
  const hours = Math.floor(ledger.timePlayed / 3600);
  const mins = Math.floor((ledger.timePlayed % 3600) / 60);
  return {
    distanceKm: Math.round(ledger.distanceKm * 10) / 10,
    clock: `${hours}h ${mins}m`,
    earned: ledger.earned,
    busted: ledger.busted,
    racesWon: ledger.racesWon,
    missionsDone: ledger.missionsDone,
  };
}

export function ledgerFromCareer(ledger, career) {
  ledger.timePlayed = career.timePlayed || 0;
  ledger.businessesBought = Object.keys(career.owned || {}).length;
  ledger.crewHired = Object.keys(career.hired || {}).length;
  ledger.racesWon = career.won || 0;
  ledger.missionsDone = (career.missionsDone || []).length;
  return ledger;
}
