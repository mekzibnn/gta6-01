// Solmar Heat v12 — 16 story missions + side activities (taxi, vigilante, stunts, packages).
import { SPOTS } from './config.js';
import { addStanding, addRespect } from './actors.js';

export const MISSION_DEFS = [
  { id: 'm1', name: 'Wheels Up', reward: 400, standing: { d: 'Downtown', n: 10 }, steps: [{ type: 'goto', spot: 'garage', text: 'Drive to the Garage — do not get busted' }] },
  { id: 'm2', name: 'Joyride', reward: 500, standing: { d: 'Downtown', n: 10 }, steps: [{ type: 'cond', text: 'Steal a SPORT car', fn: (g) => !!g.car && g.car.model === 'sport' }, { type: 'goto', spot: 'hideout', text: 'Bring the sport car to the Hideout' }] },
  { id: 'm3', name: 'Beach Run', reward: 700, standing: { d: 'Beachfront', n: 10 }, steps: [{ type: 'goto', spot: 'beach', text: 'Reach the Beachfront' }, { type: 'goto', spot: 'stadium', text: 'Meet the contact at the Stadium' }] },
  { id: 'm4', name: 'Taxi Nights', reward: 800, standing: { d: 'Marina', n: 10 }, steps: [{ type: 'fares', n: 2, text: 'Complete 2 taxi fares (drive a TAXI)' }] },
  { id: 'm5', name: 'Street Kings', reward: 1000, standing: { d: 'Marina', n: 15 }, steps: [{ type: 'race', race: 'sprint', text: 'Win the Marina Sprint' }] },
  { id: 'm6', name: 'Getaway', reward: 900, standing: { d: 'Hillside', n: 10 }, steps: [{ type: 'cond', text: 'Get the heat to 2 stars', fn: (g) => g.player.wanted >= 2 }, { type: 'escape', text: 'Lose the cops — get back to 0 stars' }] },
  { id: 'm7', name: 'Chop Shop Run', reward: 600, standing: { d: 'Old Town', n: 10 }, steps: [{ type: 'sell', n: 1, text: 'Sell a car at the Chop Shop' }] },
  { id: 'm8', name: 'Beach Blitz', reward: 800, standing: { d: 'Beachfront', n: 15 }, steps: [{ type: 'stunt', n: 1, text: 'Hit a stunt jump at speed' }, { type: 'goto', spot: 'beach', text: 'Land on the Beachfront' }] },
  { id: 'm9', name: "Smuggler's Run", reward: 0, standing: { d: 'Marina', n: 15 }, steps: [{ type: 'goto', spot: 'pier', text: 'Pick up the goods at the Pier' }, { type: 'goto', spot: 'fence', text: 'Drop the goods at the Fence', pay: 150, wanted: 1 }] },
  { id: 'm10', name: 'Heat Wave', reward: 1500, standing: { d: 'Downtown', n: 20 }, steps: [{ type: 'goto', spot: 'safehouse', text: 'Lose the 5-star heat — reach the Safehouse' }] },
  { id: 'm11', name: 'Empire Rising', reward: 6000, standing: { d: 'Hillside', n: 20 }, steps: [{ type: 'own', business: 'solmar-laundry', text: 'Own a business — buy the Laundry' }, { type: 'goto', spot: 'laundry', text: 'Collect the take at the Laundry', pay: 150 }] },
  { id: 'm12', name: 'Crew Up', reward: 7500, standing: { d: 'Downtown', n: 20 }, steps: [{ type: 'cond', text: 'Hire Milo and win a Sprint', fn: (g) => !!g.roster.hired.milo && g.streetRaces.won >= 1 }, { type: 'timed', seconds: 1, text: 'Crew Up — celebrate the win' }] },
  { id: 'm13', name: 'Bank Job: Prep', reward: 2000, standing: { d: 'Downtown', n: 15 }, steps: [{ type: 'cond', text: 'Steal a VAN for the job', fn: (g) => !!g.car && g.car.model === 'van' }, { type: 'goto', spot: 'bank', text: 'Park the van at the Bank' }] },
  { id: 'm14', name: 'Bank Job: Vault', reward: 3000, standing: { d: 'Downtown', n: 20 }, steps: [{ type: 'hold', spot: 'bank', seconds: 15, text: 'Crack the vault — hold position 15s' }] },
  { id: 'm15', name: 'Bank Job: Getaway', reward: 4000, standing: { d: 'Marina', n: 20 }, steps: [{ type: 'cond', text: 'The alarm is up — 4 stars on you', fn: (g) => g.player.wanted >= 4 }, { type: 'goto', spot: 'safehouse', text: 'Escape to the Safehouse' }] },
  { id: 'm16', name: 'The Big One', reward: 10000, standing: { d: 'Beachfront', n: 30 }, steps: [{ type: 'cond', text: 'Max heat — reach 5 stars', fn: (g) => g.player.wanted >= 5 }, { type: 'goto', spot: 'pier', text: 'Get to the Pier boat and vanish' }] },
];

const EXTRA_SPOTS = { beach: { x: 175, z: 60 } };

export function spotPos(g, name) {
  if (EXTRA_SPOTS[name]) return EXTRA_SPOTS[name];
  return g.city.spots[name] || { x: 0, z: 0 };
}

export function startMission(g, idx) {
  const def = MISSION_DEFS[idx];
  if (!def) { g.mission.index = Math.min(idx, MISSION_DEFS.length - 1); return; }
  g.mission._current = idx;
  g.mission.step = 0;
  g.mission.stepT = 0;
  g.mission.timeLeft = 180;
  if (def.id === 'm10') g.player.heatLock = true;
  if (def.id === 'm15') { g.player.wanted = Math.max(g.player.wanted, 4); g.player.lastCrime = g.time; }
  if (def.id === 'm16') { g.player.wanted = 5; g.player.lastCrime = g.time; }
  setObjective(g);
  g.hud.banner = `MISSION ${idx + 1} · ${def.name.toUpperCase()}`;
  g.hud.bannerT = 6;
  g.hud.bannerKind = 'mission';
}

export function setObjective(g) {
  const def = MISSION_DEFS[g.mission.index];
  if (!def) { g.objectiveText = ''; return; }
  const step = def.steps[Math.min(g.mission.step, def.steps.length - 1)];
  g.objectiveText = `${def.name} — ${step.text}`;
}

function stepDone(g, step) {
  const p = g.player;
  switch (step.type) {
    case 'goto': {
      const s = spotPos(g, step.spot);
      return Math.hypot(p.x - s.x, p.z - s.z) < 10;
    }
    case 'own': return !!g.empire.owned[step.business];
    case 'cond': return !!step.fn && step.fn(g);
    case 'fares': return g.taxi.fares >= step.n;
    case 'race': return typeof g.streetRaces.best[step.race] === 'number';
    case 'sell': return g.stats.carsSold >= step.n;
    case 'stunt': return g.stunts.count >= step.n;
    case 'escape': return p.wanted === 0;
    case 'timed': {
      g.mission.stepT += g.dt;
      return g.mission.stepT >= step.seconds;
    }
    case 'hold': {
      const s = spotPos(g, step.spot);
      if (Math.hypot(p.x - s.x, p.z - s.z) < 12) {
        g.mission.stepT += g.dt;
        return g.mission.stepT >= step.seconds;
      }
      g.mission.stepT = 0;
      return false;
    }
    default: return false;
  }
}

export function updateMissions(g, dt) {
  if (g.mission.index !== g.mission._current) startMission(g, g.mission.index);
  const def = MISSION_DEFS[g.mission.index];
  if (!def || g.mission.done.includes(def.id)) return;
  g.mission.timeLeft -= dt;
  if (g.mission.timeLeft <= 0) g.mission.timeLeft = 180;
  const step = def.steps[g.mission.step];
  if (!step) return;
  if (stepDone(g, step)) {
    if (step.pay) g.player.cash += step.pay;
    if (step.wanted) { g.player.wanted = Math.min(5, g.player.wanted + step.wanted); g.player.lastCrime = g.time; }
    g.mission.step += 1;
    g.mission.stepT = 0;
    if (g.mission.step >= def.steps.length) completeMission(g, def);
    else setObjective(g);
  }
}

function completeMission(g, def) {
  g.player.cash += def.reward;
  if (def.standing) addStanding(g, def.standing.d, def.standing.n);
  addRespect(g, 25);
  g.mission.done.push(def.id);
  g.stats.missionsDone += 1;
  if (def.id === 'm10') g.player.heatLock = false;
  g.hud.banner = `${def.name.toUpperCase()} — COMPLETE  +$${def.reward}`;
  g.hud.bannerT = 5;
  g.hud.bannerKind = 'mission';
  const idx = MISSION_DEFS.indexOf(def);
  if (idx < MISSION_DEFS.length - 1) g.mission.index = idx + 1;
}

// ---- Side activities (v12): taxi fares, vigilante, stunt jumps, packages ----
export function initSide(g) {
  g.taxi = { fares: 0, active: null };
  g.vigilante = { target: null, busts: 0 };
  g.stunts = { count: 0, airT: 0 };
  g.packages = { found: 0, spots: SPOTS_HIDDEN.map((s) => ({ ...s, got: false })) };
}

import { HIDDEN_PACKAGES as SPOTS_HIDDEN } from './config.js';

export function updateSide(g, dt) {
  // Hidden packages: walk or drive within 6 units.
  for (const s of g.packages.spots) {
    if (!s.got && Math.hypot(g.player.x - s.x, g.player.z - s.z) < 6) {
      s.got = true; g.packages.found += 1; g.player.cash += 250; addRespect(g, 5);
      g.hud.banner = 'HIDDEN PACKAGE  +$250'; g.hud.bannerT = 3; g.hud.bannerKind = 'side';
    }
  }
  // Stunt jumps: fast over a ramp = airtime.
  if (g.car && Math.abs(g.car.speed) > 24) {
    for (const j of g.stuntJumps) {
      if (Math.hypot(g.car.x - j.x, g.car.z - j.z) < 6 && g.stunts.airT <= 0) {
        g.stunts.airT = 1.2; g.stunts.count += 1; g.player.cash += 100; addRespect(g, 5);
        g.hud.banner = 'STUNT JUMP  +$100'; g.hud.bannerT = 3; g.hud.bannerKind = 'side';
      }
    }
  }
  if (g.stunts.airT > 0) g.stunts.airT -= dt;
  // Taxi fares (only after the early game, and only in a TAXI).
  if (g.time > 180 && g.car && g.car.model === 'taxi') {
    if (!g.taxi.active) {
      const a = g.rng.range(0, Math.PI * 2);
      g.taxi.active = { px: g.player.x + Math.cos(a) * 60, pz: g.player.z + Math.sin(a) * 60, picked: false, dx: 0, dz: 0 };
    } else if (!g.taxi.active.picked) {
      if (Math.hypot(g.player.x - g.taxi.active.px, g.player.z - g.taxi.active.pz) < 8) {
        g.taxi.active.picked = true;
        const b = g.rng.range(0, Math.PI * 2);
        g.taxi.active.dx = g.player.x + Math.cos(b) * 80;
        g.taxi.active.dz = g.player.z + Math.sin(b) * 80;
      }
    } else if (Math.hypot(g.player.x - g.taxi.active.dx, g.player.z - g.taxi.active.dz) < 8) {
      g.taxi.fares += 1; g.player.cash += 80; addRespect(g, 3);
      g.hud.banner = 'TAXI FARE  +$80'; g.hud.bannerT = 3; g.hud.bannerKind = 'side';
      g.taxi.active = null;
    }
  }
  // Vigilante busts (only after the early game, wanted 0, in a car).
  if (g.time > 180 && g.player.wanted === 0 && g.car && !g.vigilante.target) {
    if (g.rng.chance(dt * 0.02)) {
      const a = g.rng.range(0, Math.PI * 2);
      g.vigilante.target = { x: g.player.x + Math.cos(a) * 70, z: g.player.z + Math.sin(a) * 70, hp: 40 };
    }
  }
  if (g.vigilante.target && g.car) {
    const t = g.vigilante.target;
    if (Math.hypot(g.car.x - t.x, g.car.z - t.z) < 4 && Math.abs(g.car.speed) > 8) {
      t.hp -= 40;
      if (t.hp <= 0) {
        g.vigilante.busts += 1; g.player.cash += 150; addRespect(g, 5);
        g.hud.banner = 'VIGILANTE BUST  +$150'; g.hud.bannerT = 3; g.hud.bannerKind = 'side';
        g.vigilante.target = null;
      }
    }
  }
}
