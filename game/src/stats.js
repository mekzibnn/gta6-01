// The record book: distance driven, time on the street, missions done,
// cars stolen, wrecks left burning. The HUD shows the headline numbers
// and the save carries them between sessions.

export function makeStats() {
  return {
    distanceKm: 0,
    timePlayed: 0,
    missionsDone: 0,
    carsStolen: 0,
    wrecks: 0,
    racesWon: 0,
  };
}

// The player (or the car they are in) covered metres; bank them.
export function addDistance(stats, metres) {
  stats.distanceKm += metres / 1000;
}

// A frame of play time.
export function addTime(stats, dt) {
  stats.timePlayed += dt;
}
