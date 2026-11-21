// Story missions (v6 rewrite).
// Mara the fixer calls Leo with a chain of twelve jobs, from stealing his
// first car to running an empire. Each mission is a list of steps; a step
// is a small goal the game can test (reach a spot, hold a wanted level,
// own a business, win a race). The mission engine walks the steps in order,
// pays the reward at the end, and hands the next mission to the HUD.

import { ECONOMY } from './config.js';

export const MISSIONS = [
  {
    id: 'm1',
    name: 'Wheels Up',
    brief: 'Steal a car and bring it to the Garage. Do not get busted.',
    steps: [
      { kind: 'car', text: 'Steal a car' },
      { kind: 'goto', spot: 'garage', text: 'Drive to the Garage' },
    ],
  },
  {
    id: 'm2',
    name: 'First Fare',
    brief: 'The taxi office needs a driver. Pick up the fare and drop them at the Plaza.',
    steps: [
      { kind: 'goto', spot: 'taxiOffice', text: 'Go to Sunset Taxi Co.' },
      { kind: 'goto', spot: 'plaza', text: 'Drop the fare at Central Plaza' },
    ],
  },
  {
    id: 'm3',
    name: 'Hot Wheels',
    brief: 'The cops are on you. Shake two stars of heat and stay free.',
    steps: [
      { kind: 'wanted', stars: 2, text: 'Get to 2 stars of heat' },
      { kind: 'lose', text: 'Lose the cops' },
    ],
  },
  {
    id: 'm4',
    name: 'Night Shift',
    brief: 'A package has to cross town after dark. Deliver it to the Pier.',
    steps: [
      { kind: 'night', text: 'Wait for nightfall' },
      { kind: 'goto', spot: 'pier', text: 'Deliver to the Pier' },
    ],
  },
  {
    id: 'm5',
    name: 'Chop Shop',
    brief: 'Steal a sport car and sell it at the Chop Shop.',
    steps: [
      { kind: 'sportcar', text: 'Steal a sport car' },
      { kind: 'goto', spot: 'chopShop', text: 'Sell it at the Chop Shop' },
    ],
  },
  {
    id: 'm6',
    name: 'The Fence',
    brief: 'Move the goods to the Fence on the east side. No questions.',
    steps: [
      { kind: 'goto', spot: 'fence', text: 'Deliver to the Fence' },
      { kind: 'earn', amount: 500, text: 'Pocket $500 from the deal' },
    ],
  },
  {
    id: 'm7',
    name: 'Air Support',
    brief: 'Air One is overhead. Outrun the helicopter at 3 stars.',
    steps: [
      { kind: 'wanted', stars: 3, text: 'Get to 3 stars of heat' },
      { kind: 'survive', seconds: 30, text: 'Survive the heli for 30 seconds' },
    ],
  },
  {
    id: 'm8',
    name: 'King of the Road',
    brief: 'Prove it on the street. Win a Sprint race.',
    steps: [
      { kind: 'race', race: 'sprint', text: 'Win a Sprint race' },
    ],
  },
  {
    id: 'm9',
    name: "Smuggler's Run",
    brief: 'Run contraband across the city. Every drop raises the heat a star.',
    steps: [
      { kind: 'goto', spot: 'pier', text: 'Pick up at the Pier' },
      { kind: 'drop', spot: 'fence', text: 'Drop at the Fence (heat +1)' },
      { kind: 'goto', spot: 'hideout', text: 'Get back to the Hideout' },
    ],
  },
  {
    id: 'm10',
    name: 'Heat Wave',
    brief: 'Five stars. The whole city is after you. Hold it and live.',
    steps: [
      { kind: 'wanted', stars: 5, text: 'Reach 5 stars of heat' },
      { kind: 'hold', seconds: 20, text: 'Hold 5 stars for 20 seconds' },
    ],
  },
  {
    id: 'm11',
    name: 'Empire Rising',
    brief: 'Stop working for other people. Buy your first business, then drop a package at the Laundry.',
    steps: [
      { kind: 'buy', text: 'Buy your first business' },
      { kind: 'drop', spot: 'laundry', text: 'Drop at Solmar Laundry (+$150)' },
    ],
  },
  {
    id: 'm12',
    name: 'Crew Up',
    brief: 'No one runs an empire alone. Hire one crew mate, then win a race with them behind you.',
    steps: [
      { kind: 'hire', text: 'Hire one crew mate' },
      { kind: 'race', race: 'sprint', text: 'Win a race' },
    ],
  },
];

export function initMissions() {
  return {
    index: 0,
    step: 0,
    done: [],
    timer: 0,
    earned: 0,
    started: false,
  };
}

export function currentMission(missions) {
  return MISSIONS[missions.index] || null;
}

export function currentStep(missions) {
  const m = currentMission(missions);
  if (!m) return null;
  return m.steps[missions.step] || null;
}

export function missionReward(missions) {
  const m = currentMission(missions);
  if (!m) return 0;
  return ECONOMY.missionPayout[missions.index] || 0;
}

export function missionName(missions) {
  const m = currentMission(missions);
  return m ? m.name : 'Done';
}

export function missionBrief(missions) {
  const m = currentMission(missions);
  return m ? m.brief : 'Every job is done. Solmar is yours.';
}

export function startMission(missions) {
  missions.started = true;
  missions.step = 0;
  missions.timer = 0;
  return missions;
}

export function stepDone(missions) {
  const m = currentMission(missions);
  if (!m) return false;
  return missions.step >= m.steps.length;
}

export function advanceStep(missions) {
  missions.step += 1;
  missions.timer = 0;
  return missions;
}

export function completeMission(missions) {
  const m = currentMission(missions);
  if (!m) return { ok: false, reward: 0 };
  const reward = missionReward(missions);
  missions.done.push(m.id);
  missions.earned += reward;
  missions.index += 1;
  missions.step = 0;
  missions.timer = 0;
  missions.started = false;
  return { ok: true, reward, next: currentMission(missions) };
}

export function missionProgress(missions) {
  const m = currentMission(missions);
  if (!m) return { done: MISSIONS.length, total: MISSIONS.length };
  return { done: missions.index, total: MISSIONS.length, step: missions.step, steps: m.steps.length };
}

// Step tests. Each one reads the live game and says whether its step is met.
// `game` is the window.__game shape: player, empire, roster, streetRaces, clock, city.
export function stepMet(step, game) {
  if (!step) return false;
  switch (step.kind) {
    case 'car':
      return !!game.player.inCar;
    case 'goto': {
      const spot = game.city.spots[step.spot];
      if (!spot) return false;
      const px = game.player.inCar ? game.car.x : game.player.x;
      const pz = game.player.inCar ? game.car.z : game.player.z;
      const dx = px - spot.x;
      const dz = pz - spot.z;
      return dx * dx + dz * dz < 14 * 14;
    }
    case 'wanted':
      return game.player.wanted >= step.stars;
    case 'lose':
      return game.player.wanted === 0;
    case 'night':
      return game.clock.isNight;
    case 'sportcar':
      return !!game.player.inCar && game.car && game.car.model === 'sport';
    case 'earn':
      return game.sessionEarned >= step.amount;
    case 'survive':
    case 'hold':
      return game.mission.timer >= step.seconds;
    case 'race':
      return game.streetRaces.won > (game.mission.raceWonAt || 0);
    case 'drop': {
      const spot = game.city.spots[step.spot];
      if (!spot) return false;
      const px = game.player.inCar ? game.car.x : game.player.x;
      const pz = game.player.inCar ? game.car.z : game.player.z;
      const dx = px - spot.x;
      const dz = pz - spot.z;
      return dx * dx + dz * dz < 14 * 14;
    }
    case 'buy':
      return Object.keys(game.empire.owned || {}).length > 0;
    case 'hire':
      return Object.keys(game.roster.hired || {}).length > 0;
    default:
      return false;
  }
}

export function tickMission(missions, game, dt) {
  const step = currentStep(missions);
  if (!step) return missions;
  // Timed steps count up while their condition holds.
  if (step.kind === 'survive' || step.kind === 'hold') {
    const holding = step.kind === 'survive'
      ? game.player.wanted >= 3
      : game.player.wanted >= 5;
    if (holding) missions.timer += dt;
    else missions.timer = 0;
  }
  if (stepMet(step, game)) {
    advanceStep(missions);
    // A drop step pays its bonus and raises the heat, once, when met.
    if (step.kind === 'drop') {
      game.player.cash += 150;
      game.sessionEarned = (game.sessionEarned || 0) + 150;
      if (game.player.wanted < 5) game.player.wanted += 1;
    }
  }
  if (stepDone(missions)) {
    const done = completeMission(missions);
    if (done.ok) {
      game.player.cash += done.reward;
      game.sessionEarned = (game.sessionEarned || 0) + done.reward;
      game.ledger.earned += done.reward;
      game.ledger.missionsDone += 1;
    }
  }
  return missions;
}
