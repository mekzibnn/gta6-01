// The twelve story missions of Solmar Heat, M1 Wheels Up through M12
// Crew Up. Each mission has an id, a name, a cash reward and a list of
// steps. A step is a goto (drive to a city spot), a steal (get in a car
// of a model), an own (own a business), a hire (hire a crew member), a
// win (win a street race) or a survive (hold a wanted level for a time).
// Finishing a step pays its drop cash and raises the heat; finishing
// the last step pays the mission reward, adds district standing and
// advances to the next mission.

export const MISSIONS = [
  { id: 'm1', name: 'Wheels Up', reward: 400, steps: [
    { type: 'goto', target: 'garage', objective: 'Drive to the Garage — do not get busted' },
  ] },
  { id: 'm2', name: 'Hot Wheels', reward: 600, steps: [
    { type: 'steal', model: 'sport', objective: 'Steal a sport car' },
    { type: 'goto', target: 'hideout', objective: 'Bring it to the Hideout' },
  ] },
  { id: 'm3', name: 'First Job', reward: 800, steps: [
    { type: 'goto', target: 'pier', objective: 'Pick up the package at the Pier' },
    { type: 'goto', target: 'fence', objective: 'Drop it at the Fence', drop: 100 },
  ] },
  { id: 'm4', name: 'Night Shift', reward: 900, steps: [
    { type: 'goto', target: 'taxiStand', objective: 'Pick up the fare at the Taxi Stand' },
    { type: 'goto', target: 'hotel', objective: 'Drop the fare at the Hotel' },
  ] },
  { id: 'm5', name: 'Chop Shop', reward: 1000, steps: [
    { type: 'goto', target: 'chopShop', objective: 'Sell a car at the Chop Shop' },
  ] },
  { id: 'm6', name: 'Street Heat', reward: 1200, steps: [
    { type: 'win', race: 'sprint', objective: 'Win the Marina Sprint' },
  ] },
  { id: 'm7', name: 'The Fixer', reward: 1500, steps: [
    { type: 'goto', target: 'docks', objective: 'Meet Leo at the Docks' },
  ] },
  { id: 'm8', name: 'Double Cross', reward: 2000, steps: [
    { type: 'survive', stars: 4, duration: 45, objective: 'Lose the 4-star heat' },
  ] },
  { id: 'm9', name: "Smuggler's Run", reward: 2500, steps: [
    { type: 'goto', target: 'pier', objective: 'Pick up the package at the Pier' },
    { type: 'goto', target: 'fence', objective: 'Drop it at the Fence', drop: 150, heat: 1 },
    { type: 'goto', target: 'hideout', objective: 'Return to the Hideout' },
  ] },
  { id: 'm10', name: 'Heat Wave', reward: 3000, steps: [
    { type: 'survive', stars: 5, duration: 60, objective: 'Survive the 5-star heat' },
  ] },
  { id: 'm11', name: 'Empire Rising', reward: 6000, steps: [
    { type: 'own', objective: 'Own a business' },
    { type: 'goto', target: 'laundry', objective: 'Drop the take at the Laundry', drop: 150 },
  ] },
  { id: 'm12', name: 'Crew Up', reward: 7500, steps: [
    { type: 'hire', objective: 'Hire a crew member' },
    { type: 'win', race: 'sprint', objective: 'Win the Marina Sprint' },
  ] },
];

export function missionByIndex(index) {
  return MISSIONS[index] || null;
}

export function makeMissionState() {
  return { index: 0, step: 0, done: [], surviveT: 0 };
}

// Accepts either the game object or the mission state itself.
function missionStateOf(target) {
  if (!target) return null;
  if (target.mission) return target.mission;
  return target;
}

// M10 Heat Wave locks the heat at five stars: wanted never decays.
export function heatLock(target) {
  const mission = missionStateOf(target);
  return !!mission && mission.index === 9;
}

// "Name — step objective", or the end-of-story line once all twelve
// missions are done. Accepts the game object or the mission state.
export function missionObjective(target) {
  const mission = missionStateOf(target);
  if (!mission) return 'All missions complete — Solmar is yours.';
  const def = MISSIONS[mission.index];
  if (!def) return 'All missions complete — Solmar is yours.';
  const step = def.steps[Math.min(mission.step, def.steps.length - 1)];
  return def.name + ' — ' + (step ? step.objective : '');
}

function stepDone(game, step) {
  const player = game.player;
  const pos = game.car ? { x: game.car.x, z: game.car.z } : { x: player.x, z: player.z };
  if (step.type === 'goto') {
    const spot = game.city.spots[step.target];
    if (!spot) return false;
    return Math.hypot(pos.x - spot.x, pos.z - spot.z) <= 12;
  }
  if (step.type === 'steal') {
    return !!player.inCar && !!game.car && game.car.model === step.model;
  }
  if (step.type === 'own') {
    return Object.keys(game.empire.owned).length > 0;
  }
  if (step.type === 'hire') {
    return Object.keys(game.roster.hired).length > 0;
  }
  if (step.type === 'win') {
    const best = game.streetRaces.best || {};
    return best[step.race] !== undefined && best[step.race] !== null;
  }
  return false;
}

function completeStep(game, def, step) {
  const player = game.player;
  if (step.drop) player.cash += step.drop;
  if (step.heat) player.wanted = Math.min(5, player.wanted + step.heat);
}

function completeMission(game, def) {
  const player = game.player;
  const mission = game.mission;
  player.cash += def.reward;
  const district = game.city.districtAt(player.x, player.z);
  if (district && district.name) {
    player.districtStanding[district.name] = (player.districtStanding[district.name] || 0) + 10;
  }
  game.stats.missionsDone += 1;
  mission.done.push(def.id);
  mission.index += 1;
  mission.step = 0;
  mission.surviveT = 0;
  const next = MISSIONS[mission.index];
  game.hud.banner = def.name + ' — COMPLETE $' + def.reward;
  game.hud.bannerSub = 'Reward $' + def.reward + ' banked. The city notices.';
  game.hud.bannerNext = next ? 'NEXT: ' + next.name + ' · REWARD $' + next.reward : 'All missions complete — Solmar is yours.';
  game.hud.bannerT = 3.5;
  game.hud.bannerKind = 'mission';
  game.hud.dialog = { name: 'LEO', text: def.name + ' done. ' + (next ? 'Next up: ' + next.name + '.' : 'Solmar is yours, kid.') };
}

// One tick of the story. A survive step counts in tenths of a second
// (dt is clamped to 0.1, so ten ticks are one second).
export function updateMissions(game, dt) {
  const mission = game.mission;
  const def = MISSIONS[mission.index];
  if (!def) return;
  const step = def.steps[mission.step];
  if (!step) return;
  if (step.type === 'survive') {
    if (game.player.wanted >= step.stars) {
      mission.surviveT += dt;
      if (mission.surviveT >= step.duration) {
        completeStep(game, def, step);
        mission.surviveT = 0;
        mission.step += 1;
        if (mission.step >= def.steps.length) completeMission(game, def);
      }
    } else {
      mission.surviveT = 0;
    }
    return;
  }
  if (stepDone(game, step)) {
    completeStep(game, def, step);
    mission.step += 1;
    if (mission.step >= def.steps.length) completeMission(game, def);
  }
}
