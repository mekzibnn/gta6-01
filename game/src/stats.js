// Run statistics for Solmar Heat. No dependencies.
// The record the pause screen shows, and the numbers the save carries.

export function makeStats() {
  return {
    distanceKm: 0,
    timePlayed: 0,
    topSpeed: 0,
    carsStolen: 0,
    missionsDone: 0,
    racesWon: 0,
  };
}

// Add metres driven or walked; the record keeps kilometres.
export function addDistance(stats, metres) {
  stats.distanceKm += metres / 1000;
}
