// Solmar Heat v9 — the ledger.
// Every dollar and every mile is recorded here, so the stats screen and
// the save can tell the story of a career. Each helper touches exactly
// one counter — no hidden side effects, no cross-talk between them.

export function initLedger() {
  return {
    distanceKm: 0,
    timePlayed: 0,
    earned: 0,
    spent: 0,
    busted: 0,
    racesWon: 0,
    missionsDone: 0,
    businessesBought: 0,
    crewHired: 0,
    topSpeed: 0,
  };
}

function noteTopSpeed(ledger, kmh) {
  if (kmh > ledger.topSpeed) ledger.topSpeed = Math.round(kmh);
}

export function ledgerDrive(ledger, meters, speedKmh, dt) {
  const km = meters / 1000;
  ledger.distanceKm = ledger.distanceKm + km;
  ledger.timePlayed = ledger.timePlayed + dt;
  noteTopSpeed(ledger, speedKmh);
}

export function ledgerEarn(ledger, amount) {
  ledger.earned = ledger.earned + amount;
}

export function ledgerSpend(ledger, amount) {
  ledger.spent = ledger.spent + amount;
}

export function ledgerBust(ledger) {
  ledger.busted = ledger.busted + 1;
}

export function ledgerRace(ledger, won) {
  if (won) ledger.racesWon = ledger.racesWon + 1;
}

export function ledgerMission(ledger) {
  ledger.missionsDone = ledger.missionsDone + 1;
}

export function ledgerVenture(ledger) {
  ledger.businessesBought = ledger.businessesBought + 1;
}

export function ledgerMate(ledger) {
  ledger.crewHired = ledger.crewHired + 1;
}

export function ledgerTopSpeed(ledger, speedKmh) {
  noteTopSpeed(ledger, speedKmh);
}
