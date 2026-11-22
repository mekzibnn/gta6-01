// Solmar Heat v9 — the HUD.
// A 2D canvas over the 3D view. Everything the player needs is on it:
// cash, respect, health, the district they are standing in, the wanted
// stars (with RAM and PIT tags when the specialists are out), the empire,
// the minimap, and the weapon wheel. Labels sit above their bars — never
// underneath them — and numbers get the full width they need.

import { RESPECT, DISTRICT_TIERS, WEAPONS, GARAGE } from './config.js';
import { districtAt } from './city.js';
import { MISSIONS, currentMission, currentStep } from './missions.js';
import { MATES } from './crew.js';
import { carDistance } from './vehicles.js';

// The mission banner is three lines — MISSION n · NAME with its stage,
// the objective, and what comes NEXT — like the top entries' banners.
function bannerLines(world) {
  const m = currentMission(world.mission);
  const step = currentStep(world.mission);
  if (!m) return null;
  const idx = MISSIONS.indexOf(m);
  const total = m.steps.length;
  const stage = Math.min(world.mission.step + 1, total);
  const title = `MISSION ${idx + 1} · ${m.name.toUpperCase()} — STAGE ${stage}/${total}`;
  const objective = step ? step.text : m.brief;
  let next = '';
  if (world.mission.step + 1 < total) {
    next = `NEXT: ${m.steps[world.mission.step + 1].text}`;
  } else if (idx + 1 < MISSIONS.length) {
    next = `NEXT: MISSION ${idx + 2} · ${MISSIONS[idx + 1].name.toUpperCase()}`;
  } else {
    next = 'NEXT: OWN SOLMAR';
  }
  return { title, objective, next };
}

// Car display names — the player's ride reads as a named car, not a
// model key.
const CAR_NAMES = { sport: 'Solmar GT', sedan: 'Solmar Sedan', taxi: 'Sunset Taxi', truck: 'City Hauler' };

function drawDispatch(ctx, world) {
  const cops = world.cops || [];
  if (world.player.wanted < 1 || cops.length === 0) return 0;
  const shown = cops.slice(0, 6);
  const h = 26 + shown.length * 18;
  ctx.fillStyle = 'rgba(10,18,26,0.72)';
  ctx.fillRect(1060, 280, 200, h);
  ctx.strokeStyle = 'rgba(255,77,109,0.6)';
  ctx.strokeRect(1060.5, 280.5, 200, h);
  text(ctx, 'KPD RESPONSE', 1070, 298, 12, '#ff4d6d', 'left', true);
  shown.forEach((cop, i) => {
    const dist = Math.round(carDistance(cop, world.player));
    const role = cop.kind === 'ram' ? 'RAM' : cop.kind === 'pit' ? 'PIT' : 'PATROL';
    const roleColor = cop.kind === 'ram' ? '#ff9f1a' : cop.kind === 'pit' ? '#ff4d6d' : '#4da3ff';
    text(ctx, `SPD-${String(cop.id).padStart(2, '0')}`, 1070, 316 + i * 18, 12, '#fff', 'left');
    text(ctx, role, 1140, 316 + i * 18, 12, roleColor, 'left', true);
    text(ctx, `${dist}m`, 1250, 316 + i * 18, 12, '#ddd', 'right');
  });
  return h + 8;
}

function drawCrewCards(ctx, world) {
  const hired = Object.keys(world.roster.hired || {}).filter((id) => world.roster.hired[id].active);
  if (hired.length === 0) return;
  const perkText = { handling: 'Handling +25%', decay: 'Heat cools 1.6×', damage: 'Damage 1.5×' };
  const perkColor = { milo: '#7ac74f', vera: '#4da3ff', tank: '#ff9f1a' };
  hired.forEach((id, i) => {
    const def = MATES.find((m) => m.id === id);
    if (!def) return;
    const y = 452 + i * 40;
    ctx.fillStyle = 'rgba(10,18,26,0.72)';
    ctx.fillRect(20, y, 220, 36);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.strokeRect(20.5, y + 0.5, 220, 36);
    ctx.fillStyle = perkColor[id] || '#888';
    ctx.fillRect(26, y + 6, 24, 24);
    text(ctx, def.name[0], 38, y + 23, 15, '#111', 'center', true);
    text(ctx, def.name.toUpperCase(), 58, y + 16, 13, '#fff', 'left', true);
    text(ctx, perkText[def.perk] || def.perk, 58, y + 30, 11, '#ffd23f', 'left');
  });
}

function drawDialogue(ctx, world, hud) {
  const m = currentMission(world.mission);
  if (!m || !hud || hud.bannerT <= 0) return;
  const w = 560;
  const x0 = 640 - w / 2;
  const y0 = 500;
  ctx.fillStyle = 'rgba(10,18,26,0.82)';
  ctx.fillRect(x0, y0, w, 76);
  ctx.strokeStyle = 'rgba(255,210,63,0.7)';
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, w, 76);
  ctx.fillStyle = '#7ac74f';
  ctx.fillRect(x0 + 12, y0 + 12, 48, 48);
  text(ctx, 'L', x0 + 36, y0 + 45, 26, '#111', 'center', true);
  text(ctx, 'LEO', x0 + 72, y0 + 30, 14, '#ffd23f', 'left', true);
  // Wrap the brief to two lines so it never overflows the box.
  const words = m.brief.split(' ');
  const lines = [];
  let cur = '';
  for (const wd of words) {
    const test = cur ? `${cur} ${wd}` : wd;
    ctx.font = '400 13px system-ui, sans-serif';
    if (ctx.measureText(test).width > w - 96 && cur) {
      lines.push(cur);
      cur = wd;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  lines.slice(0, 2).forEach((ln, i) => {
    text(ctx, ln, x0 + 72, y0 + 48 + i * 17, 13, '#fff', 'left');
  });
}

function drawWeaponSlots(ctx, world) {
  const y = 520;
  const bw = 54;
  const gap = 6;
  const total = WEAPONS.length * bw + (WEAPONS.length - 1) * gap;
  let x = 1260 - total;
  WEAPONS.forEach((w, i) => {
    const owned = !!world.player.weapons[i];
    const sel = world.player.weapon === i;
    ctx.fillStyle = sel ? 'rgba(255,210,63,0.9)' : 'rgba(10,18,26,0.72)';
    ctx.fillRect(x, y, bw, 28);
    ctx.strokeStyle = sel ? '#ffd23f' : 'rgba(255,255,255,0.3)';
    ctx.strokeRect(x + 0.5, y + 0.5, bw, 28);
    text(ctx, `${i + 1}`, x + 6, y + 11, 10, sel ? '#111' : '#aaa', 'left', true);
    text(ctx, w.name, x + bw / 2, y + 12, 11, sel ? '#111' : owned ? '#fff' : '#888', 'center', true);
    text(ctx, owned ? 'ready' : 'locked', x + bw / 2, y + 24, 9, sel ? '#111' : owned ? '#ffd23f' : '#666', 'center');
    x = x + bw + gap;
  });
}

export function initHud(canvas) {
  return {
    canvas,
    ctx: canvas.getContext('2d'),
    banner: '',
    bannerT: 0,
    bannerKind: 'plain',
    bannerData: null,
    toast: '',
    toastT: 0,
    prompt: '',
    w: 1280,
    h: 720,
  };
}

export function resizeHud(hud) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  hud.canvas.width = Math.floor(hud.canvas.clientWidth * dpr) || 1280;
  hud.canvas.height = Math.floor(hud.canvas.clientHeight * dpr) || 720;
  hud.w = 1280;
  hud.h = 720;
}

export function showBanner(hud, text, kind, data) {
  hud.banner = text;
  hud.bannerT = 3.5;
  hud.bannerKind = kind || 'plain';
  hud.bannerData = data || null;
}

export function showToast(hud, text) {
  hud.toast = text;
  hud.toastT = 3;
}

export function showPrompt(hud, text) {
  hud.prompt = text;
}

function tierOf(points) {
  let tier = RESPECT.tiers[0];
  for (const t of RESPECT.tiers) {
    if (points >= t.points) tier = t;
  }
  return tier;
}

function districtTierOf(points) {
  let tier = DISTRICT_TIERS[0];
  for (const t of DISTRICT_TIERS) {
    if (points >= t.points) tier = t;
  }
  return tier;
}

function bar(ctx, x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back || 'rgba(0,0,0,0.55)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
}

function text(ctx, str, x, y, size, color, align, bold) {
  ctx.font = `${bold ? '700' : '400'} ${size}px system-ui, sans-serif`;
  ctx.fillStyle = color || '#fff';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(str, x, y);
}

function drawMinimap(ctx, world) {
  const size = 150;
  const x0 = 1280 - size - 16;
  const y0 = 66;
  const half = world.city.half;
  const toMap = (x, z) => [x0 + ((x + half) / (half * 2)) * size, y0 + ((z + half) / (half * 2)) * size];
  ctx.fillStyle = 'rgba(8,16,24,0.78)';
  ctx.fillRect(x0, y0, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.strokeRect(x0 + 0.5, y0 + 0.5, size, size);
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  for (let g = -180; g <= 180; g += 60) {
    const [ax] = toMap(g, 0);
    const [, bz] = toMap(0, g);
    ctx.beginPath(); ctx.moveTo(ax, y0); ctx.lineTo(ax, y0 + size); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x0, bz); ctx.lineTo(x0 + size, bz); ctx.stroke();
  }
  for (const wreck of world.wrecks || []) {
    const [wx, wz] = toMap(wreck.x, wreck.z);
    ctx.fillStyle = '#ff7a1a';
    ctx.fillRect(wx - 2, wz - 2, 4, 4);
  }
  for (const cop of world.cops || []) {
    const [cx, cz] = toMap(cop.x, cop.z);
    ctx.fillStyle = cop.kind === 'ram' ? '#ff9f1a' : cop.kind === 'pit' ? '#ff4d6d' : '#4da3ff';
    ctx.beginPath(); ctx.arc(cx, cz, 3, 0, Math.PI * 2); ctx.fill();
  }
  const target = world.missionTarget;
  if (target) {
    const [tx, tz] = toMap(target.x, target.z);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(tx, tz - 6); ctx.lineTo(tx + 5, tz); ctx.lineTo(tx, tz + 6); ctx.lineTo(tx - 5, tz);
    ctx.closePath(); ctx.fill();
  }
  const [px, pz] = toMap(world.player.x, world.player.z);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath(); ctx.arc(px, pz, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.beginPath(); ctx.arc(px, pz, 4, 0, Math.PI * 2); ctx.stroke();
}

function drawWheel(ctx, world) {
  const wheel = world.wheel;
  if (!wheel.open) return;
  const cx = 640;
  const cy = 330;
  const r = 110;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, 1280, 720);
  for (let i = 0; i < 4; i += 1) {
    const a0 = -Math.PI / 2 + (i * Math.PI) / 2 - Math.PI / 4;
    const a1 = a0 + Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, a0, a1);
    ctx.closePath();
    ctx.fillStyle = wheel.sel === i ? 'rgba(255,210,63,0.85)' : 'rgba(20,30,40,0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.stroke();
    const mid = (a0 + a1) / 2;
    const lx = cx + Math.cos(mid) * (r * 0.62);
    const ly = cy + Math.sin(mid) * (r * 0.62);
    const w = WEAPONS[i];
    const owned = world.player.weapons[i];
    text(ctx, w.name, lx, ly - 4, 15, owned ? '#fff' : '#888', 'center', true);
    text(ctx, owned ? 'ready' : 'locked', lx, ly + 14, 11, owned ? '#ffd23f' : '#666', 'center');
  }
  ctx.beginPath();
  ctx.arc(cx, cy, 34, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10,18,26,0.9)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.stroke();
  const cur = WEAPONS[wheel.sel];
  text(ctx, cur.name, cx, cy + 5, 14, '#ffd23f', 'center', true);
  text(ctx, 'release Q to confirm', cx, cy + r + 28, 13, '#ddd', 'center');
}

function drawBanner(ctx, world, hud, dt) {
  if (hud.bannerT <= 0) return;
  hud.bannerT = hud.bannerT - dt;
  const alpha = Math.min(1, hud.bannerT);
  // Three banner shapes: 'mission' (step banner — name, stage, objective,
  // next), 'done' (completion — name, reward, next mission), 'plain'
  // (one line, e.g. BUSTED / race won).
  let lines = null;
  if (hud.bannerKind === 'mission') {
    const bl = bannerLines(world);
    if (bl) lines = [bl.title, bl.objective, bl.next];
  } else if (hud.bannerKind === 'done' && hud.bannerData) {
    const d = hud.bannerData;
    const idx = MISSIONS.indexOf(d.mission);
    const next = idx + 1 < MISSIONS.length
      ? `NEXT: MISSION ${idx + 2} · ${MISSIONS[idx + 1].name.toUpperCase()}`
      : 'NEXT: OWN SOLMAR';
    lines = [`MISSION ${idx + 1} · ${d.mission.name.toUpperCase()} — COMPLETE`, `$${d.reward}`, next];
  }
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(10,18,26,0.72)';
  ctx.font = '700 20px system-ui, sans-serif';
  if (lines) {
    const bw = Math.min(900, 40 + Math.max(
      ctx.measureText(lines[0]).width * 0.75,
      ctx.measureText(lines[1]).width,
      ctx.measureText(lines[2]).width * 0.65,
    ));
    ctx.fillRect(640 - bw / 2, 96, bw, 84);
    ctx.strokeStyle = '#ffd23f';
    ctx.strokeRect(640 - bw / 2 + 0.5, 96.5, bw, 84);
    text(ctx, lines[0], 640, 118, 14, '#fff', 'center', true);
    text(ctx, lines[1], 640, 144, 20, '#ffd23f', 'center', true);
    text(ctx, lines[2], 640, 166, 12, '#aaa', 'center');
  } else {
    const bw = Math.min(900, 40 + ctx.measureText(hud.banner).width);
    ctx.fillRect(640 - bw / 2, 96, bw, 46);
    ctx.strokeStyle = '#ffd23f';
    ctx.strokeRect(640 - bw / 2 + 0.5, 96.5, bw, 46);
    text(ctx, hud.banner, 640, 126, 20, '#ffd23f', 'center', true);
  }
  ctx.globalAlpha = 1;
}

export function drawHud(hud, world, dt) {
  const ctx = hud.ctx;
  if (!ctx) return;
  const scaleX = hud.canvas.width / hud.w;
  const scaleY = hud.canvas.height / hud.h;
  ctx.setTransform(scaleX, 0, 0, scaleY, 0, 0);
  ctx.clearRect(0, 0, hud.w, hud.h);
  const player = world.player;
  const hour = world.clock.hour;
  const hh = String(Math.floor(hour) % 24).padStart(2, '0');
  const mm = String(Math.floor((hour % 1) * 60)).padStart(2, '0');

  // Snapshot the banner state before it ticks down: the centred mission
  // banner and the persistent objective strip show the same step, so they
  // are never drawn together (they used to overlap and the texts collided).
  const bannerUp = hud.bannerT > 0;
  drawBanner(ctx, world, hud, dt);

  // Top left: cash, respect, objective.
  text(ctx, `$${Math.floor(player.cash).toLocaleString('en-US')}`, 20, 34, 26, '#7CFC9A', 'left', true);
  const tier = tierOf(player.respect);
  text(ctx, `RESPECT ${Math.floor(player.respect)} — ${tier.name}`, 20, 62, 14, '#ffd23f', 'left', true);
  const next = RESPECT.tiers.find((t) => t.points > player.respect);
  const prev = tier.points;
  const frac = next ? (player.respect - prev) / (next.points - prev) : 1;
  bar(ctx, 20, 70, 220, 10, frac, '#ffd23f');
  const objective = world.objectiveText || '';
  // While the mission banner is up, the strip stays hidden; it returns
  // when the banner fades, so exactly one objective display is ever on
  // screen. The strip is also measured to fit its text (the old fixed
  // 7.5 px/char box was narrower than the 15 px text and it overflowed).
  if (objective && !bannerUp) {
    ctx.font = '400 15px system-ui, sans-serif';
    const ow = Math.min(560, 24 + ctx.measureText(objective).width);
    ctx.fillStyle = 'rgba(10,18,26,0.6)';
    ctx.fillRect(20, 92, ow, 30);
    text(ctx, objective, 30, 112, 15, '#fff', 'left');
  }

  // Top right: wanted stars, RAM/PIT tags, minimap, clock.
  for (let i = 0; i < 5; i += 1) {
    const sx = 1280 - 20 - i * 26;
    text(ctx, i < player.wanted ? '★' : '☆', sx, 34, 24, i < player.wanted ? '#ff4d6d' : 'rgba(255,255,255,0.5)', 'right', true);
  }
  const kinds = new Set((world.cops || []).map((c) => c.kind));
  let tagX = 1280 - 20;
  if (kinds.has('ram')) {
    ctx.fillStyle = '#ff9f1a';
    ctx.fillRect(tagX - 52, 44, 52, 18);
    text(ctx, 'RAM', tagX - 26, 57, 11, '#111', 'center', true);
    tagX = tagX - 58;
  }
  if (kinds.has('pit')) {
    ctx.fillStyle = '#ff4d6d';
    ctx.fillRect(tagX - 52, 44, 52, 18);
    text(ctx, 'PIT', tagX - 26, 57, 11, '#fff', 'center', true);
  }
  drawMinimap(ctx, world);
  text(ctx, `${hh}:${mm}  ${world.clock.isNight ? 'NIGHT' : world.clock.golden ? 'GOLDEN HOUR' : 'DAY'}`, 1260, 240, 13, '#ddd', 'right');
  text(ctx, world.weather.kind.toUpperCase(), 1260, 258, 13, world.weather.kind === 'rain' ? '#7ab8ff' : '#ddd', 'right');

  // Right side: KPD dispatch panel (when wanted), then the empire widget
  // below it — the empire box shifts down so the two never overlap.
  const dispatchH = drawDispatch(ctx, world);
  const owned = Object.keys(world.empire.owned);
  if (owned.length > 0) {
    const ey = 280 + dispatchH;
    ctx.fillStyle = 'rgba(10,18,26,0.6)';
    ctx.fillRect(1060, ey, 200, 24 + owned.length * 18);
    text(ctx, 'EMPIRE', 1070, ey + 18, 12, '#ffd23f', 'left', true);
    owned.forEach((id, i) => {
      const def = world.empire.owned[id];
      text(ctx, `${id} · Lv${def.level}`, 1070, ey + 36 + i * 18, 12, '#fff', 'left');
    });
  }

  // Bottom left: crew cards, then district, health and armour (labels
  // ABOVE their bars). Armour is the garage armour tier of the car being
  // driven — it only shows while in a car.
  drawCrewCards(ctx, world);
  const district = districtAt(player.x, player.z);
  const standing = player.districtStanding[district.id] || 0;
  const dtier = districtTierOf(standing);
  text(ctx, `${district.name.toUpperCase()} — ${dtier.name}`, 20, 600, 14, '#7ab8ff', 'left', true);
  text(ctx, `District standing ${Math.floor(standing)}`, 20, 616, 12, '#ddd', 'left');
  bar(ctx, 20, 622, 220, 9, standing / 200, '#7ab8ff');
  text(ctx, 'HEALTH', 20, 648, 13, '#fff', 'left', true);
  bar(ctx, 20, 654, 220, 14, player.health / 100, player.health > 30 ? '#7CFC9A' : '#ff4d6d');
  if (player.inCar) {
    const armorTier = world.garage.armor || 0;
    const armorName = (GARAGE.armors[armorTier] || GARAGE.armors[0]).name;
    text(ctx, `ARMOUR — ${armorName}`, 20, 682, 13, '#fff', 'left', true);
    bar(ctx, 20, 688, 220, 12, armorTier / 2, '#7ab8ff');
  }

  // Bottom right: weapon slots, car name + condition, weapon, speed, nitro.
  drawWeaponSlots(ctx, world);
  if (world.car && player.inCar) {
    const carName = CAR_NAMES[world.car.model] || world.car.model;
    const cond = Math.max(0, Math.round((world.car.health / world.car.maxHealth) * 100));
    text(ctx, `${carName} · ${cond}%`, 1260, 566, 14, '#fff', 'right', true);
  }
  const weapon = WEAPONS[player.weapon] || WEAPONS[0];
  text(ctx, weapon.name, 1260, 590, 15, '#fff', 'right', true);
  text(ctx, 'hold Q — weapon wheel', 1260, 608, 12, '#aaa', 'right');
  const speed = world.car ? Math.round(Math.abs(world.car.speed) * 3.6) : 0;
  text(ctx, `${speed} km/h`, 1260, 664, 22, '#fff', 'right', true);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < world.garage.nitro ? '#ffd23f' : 'rgba(255,255,255,0.2)';
    ctx.fillRect(1260 - 18 - i * 22, 674, 16, 10);
  }
  text(ctx, 'NITRO', 1260 - 70, 684, 11, '#ddd', 'right');

  // Radio: station + track while it is on.
  if (world.radio) text(ctx, 'SOL FM 98.4 — Solmar Nights', 20, 560, 13, '#ff9fde', 'left', true);

  // Mission dialogue: Leo's line (the mission brief) while the banner is up.
  drawDialogue(ctx, world, hud);

  // Toast and prompt.
  if (hud.toastT > 0) {
    hud.toastT = hud.toastT - dt;
    ctx.globalAlpha = Math.min(1, hud.toastT);
    text(ctx, hud.toast, 640, 600, 16, '#ffd23f', 'center', true);
    ctx.globalAlpha = 1;
  }
  if (hud.prompt) {
    text(ctx, hud.prompt, 640, 640, 15, '#fff', 'center');
  }

  // Explosion flash.
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255,120,20,${Math.min(0.5, world.flash)})`;
    ctx.fillRect(0, 0, hud.w, hud.h);
  }

  drawWheel(ctx, world);

  // Pause / busted overlays.
  if (world.paused) {
    ctx.fillStyle = 'rgba(5,10,16,0.75)';
    ctx.fillRect(0, 0, hud.w, hud.h);
    text(ctx, 'PAUSED', 640, 300, 44, '#fff', 'center', true);
    text(ctx, `Cash $${Math.floor(player.cash)} · Respect ${Math.floor(player.respect)} · Missions ${world.mission.done.length}/12`, 640, 340, 16, '#ddd', 'center');
    text(ctx, 'P to resume — progress saved', 640, 370, 14, '#aaa', 'center');
  }
  if (world.busted) {
    ctx.fillStyle = 'rgba(20,5,10,0.7)';
    ctx.fillRect(0, 0, hud.w, hud.h);
    text(ctx, 'BUSTED', 640, 300, 44, '#ff4d6d', 'center', true);
    text(ctx, 'The cops took their cut. Back to the Hideout.', 640, 340, 16, '#ddd', 'center');
  }
  if (world.over) {
    ctx.fillStyle = 'rgba(5,10,16,0.8)';
    ctx.fillRect(0, 0, hud.w, hud.h);
    text(ctx, 'WASTED', 640, 300, 44, '#ff4d6d', 'center', true);
  }
}
