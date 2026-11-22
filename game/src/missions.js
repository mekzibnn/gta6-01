// The twelve story missions. Each mission is a list of steps; a step is
// a line of objective text and a check that runs every frame. When a
// step's check turns true the step advances (and its onDone runs, for
// the drops that pay on the spot); when the last step lands, the mission
// pays its reward, banks district standing and hands over to the next.
// The playtest drives missions by setting mission.index directly, so the
// update detects an index change and starts the mission from step 0.

import { ownsAnyBusiness } from './empire.js';

// Distance in metres that counts as "at" a spot.
const AT_SPOT = 14;

function near(g, spot) {
  if (!spot) return false;
  const px = g.player.x;
  const pz = g.player.z;
  const cx = g.car ? g.car.x : px;
  const cz = g.car ? g.car.z : pz;
  // Either the player on foot or the car they are in counts.
  const dCar = (cx - spot.x) * (cx - spot.x) + (cz - spot.z) * (cz - spot.z);
  const dFoot = (px - spot.x) * (px - spot.x) + (pz - spot.z) * (pz - spot.z);
  return dCar < AT_SPOT * AT_SPOT || dFoot < AT_SPOT * AT_SPOT;
}

function dropPays(g) {
  g.player.cash += 150;
  g.player.wanted = Math.min(5, g.player.wanted + 1);
}

export const MISSIONS = [
  {
    id: 'm1', name: 'Wheels Up', reward: 400,
    steps: [
      { text: 'Drive to the Garage — do not get busted', check: (g) => near(g, g.city.spots.garage) },
    ],
  },
  {
    id: 'm2', name: 'Hot Wheels', reward: 600,
    steps: [
      { text: 'Steal a sport car', check: (g) => g.player.inCar && g.car && g.car.model === 'sport' },
      { text: 'Lose the heat — get wanted to 0', check: (g) => g.player.wanted === 0 },
    ],
  },
  {
    id: 'm3', name: 'First Job', reward: 800,
    steps: [
      { text: 'Pick up the package at the Docks', check: (g) => near(g, g.city.spots.docks) },
      { text: 'Deliver it to the Hideout', check: (g) => near(g, g.city.spots.hideout) },
    ],
  },
  {
    id: 'm4', name: 'Night Shift', reward: 1000,
    steps: [
      { text: 'Reach the Marina at night', check: (g) => g.clock.isNight && near(g, g.city.spots.marina) },
      { text: 'Return to the Garage', check: (g) => near(g, g.city.spots.garage) },
    ],
  },
  {
    id: 'm5', name: 'Grand Theft', reward: 1200,
    steps: [
      { text: 'Steal any car', check: (g) => g.player.inCar },
      { text: 'Drive it to the Fence', check: (g) => g.player.inCar && near(g, g.city.spots.fence) },
    ],
  },
  {
    id: 'm6', name: 'Getaway', reward: 1500,
    steps: [
      { text: 'Reach 3 stars of heat', check: (g) => g.player.wanted >= 3 },
      { text: 'Lose the cops — get wanted to 0', check: (g) => g.player.wanted === 0 },
    ],
  },
  {
    id: 'm7', name: 'High Roller', reward: 2000,
    steps: [
      { text: 'Win any street race', check: (g) => g.streetRaces.won >= 1 },
    ],
  },
  {
    id: 'm8', name: 'Kingpin', reward: 2500,
    steps: [
      { text: 'Buy any business', check: (g) => ownsAnyBusiness(g) },
      { text: 'Hire a crew member', check: (g) => Object.keys(g.roster.hired).length >= 1 },
    ],
  },
  {
    id: 'm9', name: "Smuggler's Run", reward: 500,
    steps: [
      { text: 'Pick up the package at the Pier', check: (g) => near(g, g.city.spots.pier) },
      { text: 'Drop it at the Fence (+$150)', check: (g) => near(g, g.city.spots.fence), onDone: dropPays },
      { text: 'Drop the second package at the Docks (+$150)', check: (g) => near(g, g.city.spots.docks), onDone: dropPays },
    ],
  },
  {
    id: 'm10', name: 'Heat Wave', reward: 3000,
    onStart(g) {
      g.player.wanted = 5;
      g.heatLock = true;
    },
    onEnd(g) {
      g.heatLock = false;
    },
    steps: [
      { text: 'Survive 5 stars — reach the Hideout', check: (g) => near(g, g.city.spots.hideout) },
    ],
  },
  {
    id: 'm11', name: 'Empire Rising', reward: 6000,
    steps: [
      { text: 'Own a business', check: (g) => ownsAnyBusiness(g) },
      { text: 'Collect the take at the Laundry (+$150)', check: (g) => near(g, g.city.spots.laundry), onDone: (g) => { g.player.cash += 150; } },
    ],
  },
  {
    id: 'm12', name: 'Crew Up', reward: 7500,
    steps: [
      { text: 'Have Milo on the crew', check: (g) => !!g.roster.hired.milo },
      { text: 'Win a Sprint race', check: (g) => typeof g.streetRaces.best.sprint === 'number' },
    ],
  },
];

export function makeMissionState() {
  return { index: 0, step: 0, done: [], started: -1 };
}

// The three-line banner the HUD draws: mission + stage, objective, next.
export function bannerFor(g) {
  const m = MISSIONS[g.mission.index];
  if (!m) return '';
  const stage = `MISSION ${g.mission.index + 1} · ${m.name.toUpperCase()} — STAGE ${g.mission.step + 1}/${m.steps.length}`;
  const objective = m.steps[Math.min(g.mission.step, m.steps.length - 1)].text;
  const next = MISSIONS[g.mission.index + 1];
  const tail = next ? `NEXT: ${next.name} · REWARD $${next.reward}` : 'FINAL MISSION';
  return `${stage}\n${objective}\n${tail}`;
}

// Start (or restart) a mission: step 0, objective text, banner, dialogue.
export function startMission(g, index) {
  const m = MISSIONS[index];
  g.mission.index = index;
  g.mission.step = 0;
  g.mission.started = index;
  if (!m) {
    g.objectiveText = 'Solmar is yours. Free roam.';
    return;
  }
  if (m.onStart) m.onStart(g);
  g.objectiveText = `${m.name} — ${m.steps[0].text}`;
  g.hud.banner = bannerFor(g);
  g.hud.bannerT = 3.5;
  g.hud.bannerKind = 'mission';
  g.hud.dialogue = dialogueFor(m);
  g.hud.dialogueT = 4;
}

// A line of LEO dialogue for the mission's opening.
function dialogueFor(m) {
  const lines = {
    m1: 'LEO: "New wheels, same streets. Get to the Garage, kid."',
    m2: 'LEO: "A Veloce GT is parked uptown. Bring it home."',
    m3: 'LEO: "Package at the Docks. No questions, no cops."',
    m4: 'LEO: "Marina after dark. Keep your headlights low."',
    m5: 'LEO: "Any car will do. The Fence pays for wheels."',
    m6: 'LEO: "Three stars and the whole KPD is awake. Lose them."',
    m7: 'LEO: "The strip talks. Win one and they will know your name."',
    m8: 'LEO: "Own something. Hire someone. Be somebody."',
    m9: 'LEO: "Pier to Fence, twice. The heat comes with the pay."',
    m10: 'LEO: "Five stars. All of Solmar is looking for you. Survive."',
    m11: 'LEO: "Your laundry prints money. Go collect the take."',
    m12: 'LEO: "Milo and a Sprint trophy. That is a crew, kid."',
  };
  return lines[m.id] || 'LEO: "Stay sharp out there."';
}

// Run once a frame: start a mission whose index changed, then check the
// current step and advance or complete.
export function updateMissions(g) {
  if (g.mission.index >= MISSIONS.length) return;
  if (g.mission.started !== g.mission.index) {
    startMission(g, g.mission.index);
    return;
  }
  const m = MISSIONS[g.mission.index];
  if (!m) return;
  const step = m.steps[Math.min(g.mission.step, m.steps.length - 1)];
  if (!step) return;
  if (!step.check(g)) return;
  if (step.onDone) step.onDone(g);
  g.mission.step += 1;
  if (g.mission.step >= m.steps.length) {
    completeMission(g, m);
    return;
  }
  g.objectiveText = `${m.name} — ${m.steps[g.mission.step].text}`;
  g.hud.banner = bannerFor(g);
  g.hud.bannerT = 3.5;
  g.hud.bannerKind = 'mission';
}

// Pay the reward, bank the standing, mark it done, move on.
export function completeMission(g, m) {
  g.player.cash += m.reward;
  g.mission.done.push(m.id);
  g.stats.missionsDone += 1;
  const d = g.city.districtAt(g.player.x, g.player.z);
  addStanding(g, d.key, 1);
  if (m.id === 'm11') addStanding(g, 'marina', 2);
  if (m.id === 'm12') addStanding(g, 'downtown', 2);
  g.hud.toast = `${m.name} complete! +$${m.reward}`;
  g.hud.toastT = 3;
  if (m.onEnd) m.onEnd(g);
  g.mission.index += 1;
  g.mission.step = 0;
  g.mission.started = -1;
  if (g.mission.index < MISSIONS.length) {
    startMission(g, g.mission.index);
  } else {
    g.objectiveText = 'Solmar is yours. Free roam.';
  }
}

// Add district standing, clamped to a sane range.
export function addStanding(g, key, amount) {
  if (!(key in g.player.districtStanding)) return;
  g.player.districtStanding[key] = Math.max(0, Math.min(100, g.player.districtStanding[key] + amount));
}
