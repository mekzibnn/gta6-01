// Missions and side work. Mara, the fixer, calls Leo with a chain of ten
// story jobs; between them the city offers taxi fares, street races and ten
// hidden packages. A mission is a list of objectives; each one points at a
// place and pays when the player gets there (or does the job) in time.
import { MISSION_REWARD, TAXI_FARE, PACKAGE_BONUS, HIDDEN_PACKAGES, RACES, SMUGGLE } from './config.js';

// Ten story jobs, in order. `time` is a mission-wide countdown, `wanted` is
// the heat Mara puts on Leo when the job starts. Step types: steal (get in a
// car), goto (reach a place), grab (stay put), wanted (reach a wanted level),
// race (checkpoints in order), survive (stay alive for `time` seconds),
// drop (deliver a package: pays on the spot and raises the heat a star).
// `heatLock` on a job means the wanted level cannot decay below its start
// while the job runs.
export const STORY = [
  {
    id: 'wheels',
    title: 'Wheels Up',
    brief: 'Mara: "Leo, you need wheels. Jack any car on the street and bring it to my garage."',
    reward: MISSION_REWARD[0],
    steps: [
      { type: 'steal', text: 'Steal a car (walk up to one and press E)' },
      { type: 'goto', place: 'garage', text: "Drive it to Mara's Garage" },
    ],
  },
  {
    id: 'delivery',
    title: 'Special Delivery',
    brief: 'Mara: "Three parcels, three corners of Solmar, 150 seconds. The bike boys are watching."',
    reward: MISSION_REWARD[1],
    time: 150,
    steps: [
      { type: 'goto', place: 'marina', text: 'Deliver parcel 1: Marina Solmar' },
      { type: 'goto', place: 'beachbar', text: 'Deliver parcel 2: Playa Bar' },
      { type: 'goto', place: 'portbank', text: 'Deliver parcel 3: Portside Bank' },
    ],
  },
  {
    id: 'heat',
    title: 'Hot Pursuit',
    brief: 'Mara: "The SCPD is on you, two stars. Lose them — Spray & Go on the east side will scrub the car clean."',
    reward: MISSION_REWARD[2],
    wanted: 2,
    steps: [
      { type: 'wanted', text: 'You are wanted! Reach Spray & Go with 2 stars' },
      { type: 'goto', place: 'spray', text: 'Get the car resprayed at Spray & Go' },
    ],
  },
  {
    id: 'bayrun',
    title: 'Bay Run',
    brief: 'Mara: "Cargo is waiting at the marina. Pick it up and lose the tail — the hideout, Leo. Go."',
    reward: MISSION_REWARD[3],
    wanted: 3,
    steps: [
      { type: 'goto', place: 'marina', text: 'Pick up the cargo at the Marina' },
      { type: 'goto', place: 'hideout', text: 'Escape to the Hideout' },
    ],
  },
  {
    id: 'bigone',
    title: 'The Big One',
    brief: 'Mara: "Portside Bank. Four stars on your head the moment you grab the cash. This is the one, Leo."',
    reward: MISSION_REWARD[4],
    wanted: 4,
    steps: [
      { type: 'goto', place: 'portbank', text: 'Reach Portside Bank' },
      { type: 'grab', text: 'Grab the cash (stay 4 seconds)' },
      { type: 'goto', place: 'hideout', text: 'Escape to the Hideout — do not get busted' },
    ],
  },
  {
    id: 'streetkings',
    title: 'Street Kings',
    brief: 'Mara: "The Palm Strip crews want a race. Three checkpoints, two minutes — win it and the streets talk."',
    reward: MISSION_REWARD[5],
    time: 150,
    steps: [
      { type: 'race', checkpoints: ['marina', 'portbank', 'hideout'], text: 'Race the checkpoints: Marina, Portside, Hideout' },
    ],
  },
  {
    id: 'airone',
    title: 'Air One',
    brief: 'Mara: "Four stars and a helicopter overhead. Stay out of its shadow for 75 seconds, then vanish at the hideout."',
    reward: MISSION_REWARD[6],
    wanted: 4,
    steps: [
      { type: 'survive', time: 75, text: 'Survive Air One for 75 seconds' },
      { type: 'goto', place: 'hideout', text: 'Vanish at the Hideout' },
    ],
  },
  {
    id: 'legend',
    title: 'Solmar Legend',
    brief: 'Mara: "One last job. Portside Bank, five stars, Air One above. Bring it home, Leo — and the city is yours."',
    reward: MISSION_REWARD[7],
    wanted: 5,
    steps: [
      { type: 'goto', place: 'portbank', text: 'Reach Portside Bank' },
      { type: 'grab', text: 'Grab the cash (stay 4 seconds)' },
      { type: 'goto', place: 'hideout', text: 'Escape to the Hideout — Air One is watching' },
    ],
  },
  {
    id: 'smuggler',
    title: "Smuggler's Run",
    brief: 'Mara: "A package from Portside, three drops across Solmar, 180 seconds. Every drop puts another star on you — keep moving, Leo."',
    reward: MISSION_REWARD[8],
    time: 180,
    wanted: 3,
    steps: [
      { type: 'goto', place: 'portbank', text: 'Pick up the package at Portside Bank' },
      { type: 'drop', place: 'marina', text: 'Drop 1: Marina Solmar — heat rises' },
      { type: 'drop', place: 'beachbar', text: 'Drop 2: Playa Bar — heat rises' },
      { type: 'drop', place: 'hideout', text: 'Final drop: the Hideout' },
    ],
  },
  {
    id: 'heatwave',
    title: 'Heat Wave',
    brief: 'Mara: "Five stars, Air One above, and the heat will NOT cool off until you vanish. Ninety seconds, Leo — then the hideout."',
    reward: MISSION_REWARD[9],
    wanted: 5,
    heatLock: true,
    steps: [
      { type: 'survive', time: 90, text: 'Ride out the five-star heat for 90 seconds' },
      { type: 'goto', place: 'hideout', text: 'Vanish at the Hideout' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Mission state
// ---------------------------------------------------------------------------

export function createMissionState() {
  return {
    index: 0,
    step: 0,
    active: false,
    timer: 0,
    grabTimer: 0,
    done: false,
    taxi: null,
    taxiTimer: 0,
    packagesFound: 0,
    completed: [],
    raceCheck: null,
    surviveTimer: 0,
  };
}

export function currentMission(state) {
  if (state.index >= STORY.length) return null;
  return STORY[state.index];
}

export function currentStep(state) {
  const mission = currentMission(state);
  if (!mission) return null;
  return mission.steps[state.step];
}

/** The place key of the current race checkpoint, or null. */
export function currentRaceCheckpoint(state) {
  const step = currentStep(state);
  if (!step || step.type !== 'race' || !state.raceCheck) return null;
  return step.checkpoints[state.raceCheck.index] || null;
}

// ---------------------------------------------------------------------------
// Starting, failing, completing
// ---------------------------------------------------------------------------

export function startMission(state, audio) {
  const mission = currentMission(state);
  if (!mission) return false;
  state.active = true;
  state.step = 0;
  state.timer = mission.time || 0;
  state.grabTimer = 0;
  if (mission.wanted) state.pendingWanted = mission.wanted;
  if (audio) audio.blip();
  return true;
}

export function failMission(state) {
  state.active = false;
  state.step = 0;
  state.timer = 0;
  state.grabTimer = 0;
  state.raceCheck = null;
  state.surviveTimer = 0;
}

export function completeMission(state, player, audio) {
  const mission = currentMission(state);
  if (!mission) return 0;
  player.cash += mission.reward;
  state.completed.push(mission.id);
  state.index += 1;
  state.active = false;
  state.step = 0;
  state.timer = 0;
  state.grabTimer = 0;
  if (state.index >= STORY.length) state.done = true;
  state.raceCheck = null;
  state.surviveTimer = 0;
  if (audio) audio.missionDone();
  return mission.reward;
}

/** Advance one step; complete the mission when the last step is done. */
function advanceStep(state, player, audio) {
  const mission = currentMission(state);
  state.step += 1;
  if (state.step >= mission.steps.length) {
    const reward = completeMission(state, player, audio);
    return `mission-done:${reward}`;
  }
  return 'step-done';
}

/** Is the player within `radius` of a place? */
function atPlace(player, place, radius) {
  return place && Math.hypot(player.x - place.x, player.y - place.y) < radius;
}

// ---------------------------------------------------------------------------
// Stepping a mission
// ---------------------------------------------------------------------------

/** Advance mission logic one step. Returns an event string or null. */
export function stepMission(state, player, city, dt, audio) {
  if (!state.active) return null;
  const mission = currentMission(state);
  if (!mission) return null;
  if (state.timer > 0) {
    state.timer -= dt;
    if (state.timer <= 0) {
      failMission(state);
      return 'mission-failed';
    }
  }
  const step = currentStep(state);
  if (!step) return null;
  const place = step.place ? city.places[step.place] : null;
  if (step.type === 'steal') {
    if (!player.onFoot) return advanceStep(state, player, audio);
    return null;
  }
  if (step.type === 'goto' && place) {
    if (atPlace(player, place, 90)) {
      if (audio) audio.coin();
      return advanceStep(state, player, audio);
    }
    return null;
  }
  if (step.type === 'drop' && place) {
    // A smuggler's drop: the package changes hands, the cash lands on the
    // spot, and the heat climbs a star — the job gets harder with every stop.
    if (atPlace(player, place, 90)) {
      player.cash += SMUGGLE.dropBonus;
      player.wanted = Math.min(5, player.wanted + SMUGGLE.dropHeat);
      player.wantedTimer = 0;
      if (audio) audio.wantedUp();
      const outcome = advanceStep(state, player, audio);
      if (outcome.startsWith('mission-done:')) return outcome;
      return `drop:${player.wanted}`;
    }
    return null;
  }
  if (step.type === 'grab') {
    if (atPlace(player, city.places.portbank, 110)) {
      state.grabTimer += dt;
      if (state.grabTimer >= 4) {
        state.grabTimer = 0;
        return advanceStep(state, player, audio);
      }
    } else {
      state.grabTimer = 0;
    }
    return null;
  }
  if (step.type === 'wanted') {
    if (player.wanted >= 2) return advanceStep(state, player, audio);
    return null;
  }
  if (step.type === 'race') {
    // Checkpoint chain: hit each place in order before the timer runs out.
    if (!state.raceCheck) state.raceCheck = { index: 0 };
    const key = step.checkpoints[state.raceCheck.index];
    if (atPlace(player, city.places[key], 90)) {
      state.raceCheck.index += 1;
      if (audio) audio.coin();
      if (state.raceCheck.index >= step.checkpoints.length) {
        state.raceCheck = null;
        return advanceStep(state, player, audio);
      }
      return 'step-done';
    }
    return null;
  }
  if (step.type === 'survive') {
    // Stay alive and wanted for `time` seconds; the heli never lets go.
    if (!state.surviveTimer) state.surviveTimer = step.time;
    state.surviveTimer -= dt;
    if (state.surviveTimer <= 0) {
      state.surviveTimer = 0;
      return advanceStep(state, player, audio);
    }
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Taxi fares
// ---------------------------------------------------------------------------

/** Start a taxi fare: a waiting ped wants a ride to a random place. */
export function startTaxi(state, player, city, random) {
  const keys = Object.keys(city.places);
  const dest = city.places[keys[Math.floor(random() * keys.length)]];
  state.taxi = { dest, timer: 90, pickedUp: false };
  state.taxiTimer = 90;
  return dest;
}

/** Step the active taxi fare. Returns an event string or null. */
export function stepTaxi(state, player, dt, audio) {
  if (!state.taxi) return null;
  state.taxi.timer -= dt;
  if (state.taxi.timer <= 0) {
    state.taxi = null;
    return 'taxi-late';
  }
  return null;
}

/** Pay the fare out when the passenger is dropped off. `payMult` lifts the
 * fare after dark (the night pays better); it defaults to 1 in daylight. */
export function finishTaxi(state, player, audio, payMult = 1) {
  if (!state.taxi) return 0;
  const fare = Math.round((TAXI_FARE + Math.floor(Math.random() * 60)) * payMult);
  player.cash += fare;
  state.taxi = null;
  if (audio) audio.coin();
  return fare;
}

// ---------------------------------------------------------------------------
// Hidden packages
// ---------------------------------------------------------------------------

/** Check hidden packages: the player walks over one. Returns 1 when found. */
export function checkPackages(state, player, city, audio) {
  for (const pack of city.hiddenPackages) {
    if (pack.found) continue;
    const d = Math.hypot(player.x - pack.x, player.y - pack.y);
    if (d < 40) {
      pack.found = true;
      state.packagesFound += 1;
      player.cash += PACKAGE_BONUS;
      if (audio) audio.coin();
      return 1;
    }
  }
  return 0;
}

export function packagesLeft(state) {
  return HIDDEN_PACKAGES - state.packagesFound;
}

// ---------------------------------------------------------------------------
// Street races: a side activity at the Palm Strip flag. Three checkpoints,
// timed; win cash and respect, and the best time is saved with the career.
// ---------------------------------------------------------------------------

export function createRaceState() {
  return { active: false, checkpoint: 0, timer: 0, elapsed: 0, best: null };
}

/** Start a race: the first checkpoint is the return value. */
export function startRace(state, player, city, random) {
  state.active = true;
  state.checkpoint = 0;
  state.timer = RACES.timeLimit;
  state.elapsed = 0;
  return city.places[RACES.checkpoints[0]];
}

/** Step the active race. Returns an event string or null. */
export function stepRace(state, player, city, dt, audio) {
  if (!state.active) return null;
  state.timer -= dt;
  state.elapsed += dt;
  if (state.timer <= 0) {
    state.active = false;
    return 'race-failed';
  }
  const place = city.places[RACES.checkpoints[state.checkpoint]];
  if (atPlace(player, place, 90)) {
    state.checkpoint += 1;
    if (audio) audio.coin();
    if (state.checkpoint >= RACES.checkpoints.length) {
      state.active = false;
      return `race-done:${state.elapsed}`;
    }
    return 'race-checkpoint';
  }
  return null;
}

/** Pay the race win and record the best time. */
export function finishRace(state, player, audio, payMult = 1) {
  const reward = Math.round(RACES.reward * payMult);
  player.cash += reward;
  if (state.best === null || state.elapsed < state.best) state.best = state.elapsed;
  if (audio) audio.missionDone();
  return reward;
}
