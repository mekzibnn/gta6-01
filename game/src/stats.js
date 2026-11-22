// Solmar Heat v7 — the ledger.
// Every dollar and every mile the player racks up is recorded here, so the
// stats screen (and the save) can tell the story of a career. Each helper
// takes the ledger and mutates exactly one counter — no hidden side effects.

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

export function ledgerDrive(ledger, meters, speedKmh, dt) {
  ledger.distanceKm += meters / 1000;
  ledger.timePlayed += dt;
  if (speedKmh > ledger.topSpeed) ledger.topSpeed = Math.round(speedKmh);
}

export function ledgerEarn(ledger, amount) {
  ledger.earned += amount;
}

export function ledgerSpend(ledger, amount) {
  ledger.spent += amount;
}

export function ledgerBust(ledger) {
  ledger.busted += 1;
}

export function ledgerRace(ledger, won) {
  if (won) ledger.racesWon += 1;
}

export function ledgerMission(ledger) {
  ledger.missionsDone += 1;
}

export function ledgerVenture(ledger) {
  ledger.businessesBought += 1;
}

export function ledgerMate(ledger) {
  ledger.crewHired += 1;
}

export function ledgerTopSpeed(ledger, speedKmh) {
  if (speedKmh > ledger.topSpeed) ledger.topSpeed = Math.round(speedKmh);
}
