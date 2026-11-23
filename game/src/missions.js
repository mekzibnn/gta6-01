// Twelve story missions — a small step machine. Each step is a 'goto',
// a condition, or an ownership check; finishing a mission pays its
// reward, banks district standing and moves the story on. The update runs
// every frame from the live index/step, so a mission set from outside
// (or by the story itself) behaves the same way.
import { MISSIONS } from './config.js';

export function refreshObjective(g) {
  const def = MISSIONS[g.mission.index];
  if (!def) { g.objectiveText = 'Solmar is yours — free roam'; return; }
  const step = def.steps[Math.min(g.mission.step, def.steps.length - 1)];
  g.objectiveText = `${def.name} — ${step.text}`;
}

export function setBanner(g, text, kind) {
  g.hud.banner = text;
  g.hud.bannerT = 4;
  g.hud.bannerKind = kind || 'mission';
}

export function addStanding(g, amount) {
  const d = g.city.districtAt(g.player.x, g.player.z);
  g.player.districtStanding[d.id] = (g.player.districtStanding[d.id] || 0) + amount;
}

function nearSpot(g, spotId) {
  const s = g.city.spots[spotId];
  if (!s) return false;
  return Math.hypot(s.x - g.player.x, s.z - g.player.z) < 12;
}

function stepDone(g, step) {
  switch (step.kind) {
    case 'goto': return nearSpot(g, step.spot);
    case 'night': return g.clock.isNight && nearSpot(g, step.spot);
    case 'heat': return g.player.wanted === 0;
    case 'own': return Object.keys(g.empire.owned).length > 0;
    case 'crew': return !!g.roster.hired.milo && g.streetRaces.won >= 1;
    default: return false;
  }
}

function onMissionStart(g, def) {
  if (def.id === 'm5') g.player.wanted = Math.max(g.player.wanted, 3);
  if (def.id === 'm10') g.heatLock = true;
  setBanner(g, `MISSION ${g.mission.index + 1} · ${def.name.toUpperCase()}`, 'mission');
}

function completeMission(g, def) {
  g.player.cash += def.reward;
  g.mission.done.push(def.id);
  addStanding(g, 15);
  g.player.respect += 20;
  g.stats.missions += 1;
  if (def.id === 'm10') g.heatLock = false;
  const label = def.reward > 0 ? `${def.name} complete — $${def.reward}` : `${def.name} complete`;
  g.mission.index += 1;
  g.mission.step = 0;
  g.mission.timer = 0;
  setBanner(g, label, 'mission');
  refreshObjective(g);
}

export function updateMissions(g, dt) {
  const def = MISSIONS[g.mission.index];
  if (!def) { refreshObjective(g); return; }
  if (g.mission.index !== g._lastMission) {
    g._lastMission = g.mission.index;
    g.mission.timer = 0;
    onMissionStart(g, def);
  }
  g.mission.timer += dt;
  const step = def.steps[g.mission.step];
  if (!step) { completeMission(g, def); return; }
  if (stepDone(g, step)) {
    if (step.pay) g.player.cash += step.pay;
    if (step.heat) g.player.wanted = Math.min(5, g.player.wanted + step.heat);
    g.mission.step += 1;
    refreshObjective(g);
    if (g.mission.step >= def.steps.length) completeMission(g, def);
  }
  refreshObjective(g);
}
