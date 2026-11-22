// Solmar Heat v9 — the story.
// Twelve jobs, from a first stolen car to owning half the city. Every
// mission is a list of steps; a step is a condition the world has to
// meet — reach a place, hold a wanted level, own a business, win a race.
// tickMission watches the current step and reports back when it clears;
// main.js turns those reports into banners, cash and district standing.

export const MISSIONS = [
  {
    id: 'm1', name: 'Wheels Up', reward: 400,
    brief: 'Leo starts with a stolen car and a fixer on the phone.',
    steps: [{ kind: 'reach', spot: 'garage', text: 'Drive to the Garage — do not get busted' }],
  },
  {
    id: 'm2', name: 'Hot Wheels', reward: 600,
    brief: 'Take a car, then make the city forget you did it.',
    steps: [
      { kind: 'steal', text: 'Steal a car' },
      { kind: 'wanted', min: 0, text: 'Lose the heat — back to zero stars' },
    ],
  },
  {
    id: 'm3', name: 'The Fence', reward: 900,
    brief: 'A buyer in the Docks pays cash for anything with wheels.',
    steps: [{ kind: 'reach', spot: 'fence', text: 'Deliver a car to the Fence', inCar: true }],
  },
  {
    id: 'm4', name: 'Night Shift', reward: 1200,
    brief: 'The taxi company needs a driver who works after dark.',
    steps: [
      { kind: 'reach', spot: 'taxiCo', text: 'Report to Sunset Taxi Co.' },
      { kind: 'reach', spot: 'nightclub', text: 'Drop the fare at Club Neon after dark', night: true },
    ],
  },
  {
    id: 'm5', name: 'Chop Shop', reward: 1500,
    brief: 'Some cars are worth more in pieces.',
    steps: [{ kind: 'sell', text: 'Sell a car at the Chop Shop' }],
  },
  {
    id: 'm6', name: 'Street Heat', reward: 2000,
    brief: 'The whole city is watching. Give them a show.',
    steps: [
      { kind: 'wanted', min: 3, text: 'Get the heat to 3 stars' },
      { kind: 'survive', min: 3, seconds: 20, text: 'Survive 20 seconds at 3 stars' },
    ],
  },
  {
    id: 'm7', name: 'Clean Getaway', reward: 2800,
    brief: 'Thread the gates and the cops will eat your dust.',
    steps: [{ kind: 'gates', count: 4, text: 'Thread 4 race gates' }],
  },
  {
    id: 'm8', name: 'Cross Town', reward: 4000,
    brief: 'One package, three districts, no questions asked.',
    steps: [
      { kind: 'reach', spot: 'crewOffice', text: 'Pick up the package in Old Town' },
      { kind: 'reach', spot: 'fence', text: 'Run it to the Fence in the Docks' },
      { kind: 'reach', spot: 'hideout', text: 'Get back to the Hideout' },
    ],
  },
  {
    id: 'm9', name: "Smuggler's Run", reward: 1200,
    brief: 'Three runs, Pier to Fence, and the heat climbs every time.',
    steps: [
      { kind: 'drop', spot: 'pier', text: 'Pick up at the Pier' },
      { kind: 'drop', spot: 'fence', pay: 150, heat: 1, text: 'Drop at the Fence (+$150)' },
      { kind: 'drop', spot: 'pier', text: 'Pick up at the Pier' },
      { kind: 'drop', spot: 'fence', pay: 150, heat: 1, text: 'Drop at the Fence (+$150)' },
      { kind: 'drop', spot: 'pier', text: 'Pick up at the Pier' },
      { kind: 'drop', spot: 'fence', pay: 150, heat: 1, text: 'Drop at the Fence (+$150)' },
    ],
  },
  {
    id: 'm10', name: 'Heat Wave', reward: 2500,
    brief: 'Five stars, no way down, forty-five seconds of hell.',
    steps: [{ kind: 'survive', min: 5, seconds: 45, text: 'Survive 45 seconds at 5 stars' }],
  },
  {
    id: 'm11', name: 'Empire Rising', reward: 6000,
    brief: 'Own the streets, then collect what they owe you.',
    steps: [
      { kind: 'own', text: 'Own a business' },
      { kind: 'drop', spot: 'laundry', pay: 150, text: 'Drop the books at Solmar Laundry (+$150)' },
    ],
  },
  {
    id: 'm12', name: 'Crew Up', reward: 7500,
    brief: 'A crew and a trophy. That is how you own half the city.',
    steps: [
      { kind: 'hire', text: 'Hire a crew mate' },
      { kind: 'race', text: 'Win a street race' },
    ],
  },
];

export function initMissions() {
  return { index: 0, step: 0, done: [], stepT: 0, gateBase: 0, lastIndex: 0 };
}

export function currentMission(missions) {
  return MISSIONS[missions.index] || null;
}

export function currentStep(missions) {
  const m = currentMission(missions);
  return m ? m.steps[missions.step] || null : null;
}

export function missionReward(m) {
  return m ? m.reward : 0;
}

export function missionName(m) {
  return m ? m.name : '';
}

export function missionBrief(m) {
  return m ? m.brief : '';
}

export function startMission(missions, index) {
  missions.index = index;
  missions.step = 0;
  missions.stepT = 0;
  missions.lastIndex = index;
}

// Is the player close enough to a named spot (within the given radius)?
function atSpot(world, key, radius) {
  const spot = world.city.spots[key] || { x: 0, z: 0 };
  const dx = world.player.x - spot.x;
  const dz = world.player.z - spot.z;
  return dx * dx + dz * dz < radius * radius;
}

export function stepMet(step, world, missions) {
  if (!step) return false;
  const player = world.player;
  if (step.kind === 'reach' || step.kind === 'drop') {
    if (step.inCar && !player.inCar) return false;
    if (step.night && !world.clock.isNight) return false;
    return atSpot(world, step.spot, 12);
  }
  if (step.kind === 'steal') return player.inCar === true;
  if (step.kind === 'wanted') {
    return step.min === 0 ? player.wanted === 0 : player.wanted >= step.min;
  }
  if (step.kind === 'survive') return missions.stepT >= step.seconds;
  if (step.kind === 'own') return Object.keys(world.empire.owned).length > 0;
  if (step.kind === 'hire') return Object.keys(world.roster.hired).length > 0;
  if (step.kind === 'race') return world.streetRaces.won > 0;
  if (step.kind === 'sell') return world.soldCar === true;
  if (step.kind === 'gates') {
    const base = missions.gateBase || 0;
    return world.gatesPassed - base >= step.count;
  }
  return false;
}

function payStep(step, world) {
  if (step.pay) {
    world.player.cash = world.player.cash + step.pay;
    (world.sfx || (world.sfx = [])).push('cash');
  }
  if (step.heat) {
    world.player.wanted = Math.min(5, world.player.wanted + step.heat);
  }
}

export function stepDone(missions, world) {
  const step = currentStep(missions);
  if (step) payStep(step, world);
  missions.step = missions.step + 1;
  missions.stepT = 0;
}

export function completeMission(missions, world) {
  const m = currentMission(missions);
  if (!m) return 0;
  world.player.cash = world.player.cash + m.reward;
  world.player.respect = world.player.respect + 25;
  missions.done.push(m.id);
  missions.index = missions.index + 1;
  missions.step = 0;
  missions.stepT = 0;
  missions.gateBase = world.gatesPassed || 0;
  missions.lastIndex = missions.index;
  return m.reward;
}

export function tickMission(missions, world, dt) {
  const m = currentMission(missions);
  if (!m) return null;
  if (missions.lastIndex !== missions.index) {
    missions.lastIndex = missions.index;
    missions.stepT = 0;
  }
  const step = currentStep(missions);
  if (!step) return null;
  if (step.kind === 'survive') {
    if (world.player.wanted >= step.min) missions.stepT = missions.stepT + dt;
    else missions.stepT = 0;
  }
  if (!stepMet(step, world, missions)) return null;
  if (step.kind === 'sell') world.soldCar = false;
  const wasLast = missions.step >= m.steps.length - 1;
  const stepText = step.text;
  stepDone(missions, world);
  if (wasLast) {
    const reward = completeMission(missions, world);
    return { type: 'done', mission: m, reward, stepText };
  }
  return { type: 'step', mission: m, stepText };
}
