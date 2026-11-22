// Solmar Heat v7 — the HUD.
// A 2D canvas over the 3D view. Everything the player needs is on it:
// cash, respect, health, the district they are standing in, the wanted
// stars (with RAM and PIT tags when the specialists are out), the empire,
// the minimap, and the weapon wheel. Labels sit above their bars — never
// underneath them — and numbers get the full width they need.

import { RESPECT, DISTRICT_TIERS, WEAPONS } from './config.js';
import { districtAt } from './city.js';

export function initHud(canvas) {
  return {
    canvas,
    ctx: canvas.getContext('2d'),
    banner: '',
    bannerT: 0,
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

export function showBanner(hud, text) {
  hud.banner = text;
  hud.bannerT = 3.5;
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

  // Snapshot the banner state before it ticks down: the centered mission
  // banner and the persistent objective strip show the same step, so they
  // are never drawn together (they used to overlap and the texts collided).
  const bannerUp = hud.bannerT > 0;
  if (hud.bannerT > 0) {
    hud.bannerT -= dt;
    const alpha = Math.min(1, hud.bannerT);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(10,18,26,0.72)';
    ctx.font = '700 20px system-ui, sans-serif';
    const bw = Math.min(900, 40 + ctx.measureText(hud.banner).width);
    ctx.fillRect(640 - bw / 2, 96, bw, 46);
    ctx.strokeStyle = '#ffd23f';
    ctx.strokeRect(640 - bw / 2 + 0.5, 96.5, bw, 46);
    text(ctx, hud.banner, 640, 126, 20, '#ffd23f', 'center', true);
    ctx.globalAlpha = 1;
  }

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
  let sx = 1280 - 20;
  for (let i = 0; i < 5; i += 1) {
    text(ctx, i < player.wanted ? '★' : '☆', sx - i * 26, 34, 24, i < player.wanted ? '#ff4d6d' : 'rgba(255,255,255,0.5)', 'right', true);
  }
  const kinds = new Set((world.cops || []).map((c) => c.kind));
  let tagX = 1280 - 20;
  if (kinds.has('ram')) {
    ctx.fillStyle = '#ff9f1a';
    ctx.fillRect(tagX - 52, 44, 52, 18);
    text(ctx, 'RAM', tagX - 26, 57, 11, '#111', 'center', true);
    tagX -= 58;
  }
  if (kinds.has('pit')) {
    ctx.fillStyle = '#ff4d6d';
    ctx.fillRect(tagX - 52, 44, 52, 18);
    text(ctx, 'PIT', tagX - 26, 57, 11, '#fff', 'center', true);
  }
  drawMinimap(ctx, world);
  text(ctx, `${hh}:${mm}  ${world.clock.isNight ? 'NIGHT' : world.clock.golden ? 'GOLDEN HOUR' : 'DAY'}`, 1260, 240, 13, '#ddd', 'right');
  text(ctx, world.weather.kind.toUpperCase(), 1260, 258, 13, world.weather.kind === 'rain' ? '#7ab8ff' : '#ddd', 'right');

  // Right side: empire widget.
  const owned = Object.keys(world.empire.owned);
  if (owned.length > 0) {
    ctx.fillStyle = 'rgba(10,18,26,0.6)';
    ctx.fillRect(1060, 280, 200, 24 + owned.length * 18);
    text(ctx, 'EMPIRE', 1070, 298, 12, '#ffd23f', 'left', true);
    owned.forEach((id, i) => {
      const def = world.empire.owned[id];
      text(ctx, `${id} · Lv${def.level}`, 1070, 316 + i * 18, 12, '#fff', 'left');
    });
  }

  // Bottom left: district, then health (label ABOVE the bar).
  const district = districtAt(player.x, player.z);
  const standing = player.districtStanding[district.id] || 0;
  const dtier = districtTierOf(standing);
  text(ctx, `${district.name.toUpperCase()} — ${dtier.name}`, 20, 606, 14, '#7ab8ff', 'left', true);
  text(ctx, `District standing ${Math.floor(standing)}`, 20, 624, 12, '#ddd', 'left');
  bar(ctx, 20, 630, 220, 9, standing / 200, '#7ab8ff');
  text(ctx, 'HEALTH', 20, 664, 13, '#fff', 'left', true);
  bar(ctx, 20, 670, 220, 14, player.health / 100, player.health > 30 ? '#7CFC9A' : '#ff4d6d');

  // Bottom right: weapon, speed, nitro.
  const weapon = WEAPONS[player.weapon] || WEAPONS[0];
  text(ctx, weapon.name, 1260, 606, 15, '#fff', 'right', true);
  text(ctx, 'hold Q — weapon wheel', 1260, 624, 12, '#aaa', 'right');
  const speed = world.car ? Math.round(Math.abs(world.car.speed) * 3.6) : 0;
  text(ctx, `${speed} km/h`, 1260, 664, 22, '#fff', 'right', true);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < world.garage.nitro ? '#ffd23f' : 'rgba(255,255,255,0.2)';
    ctx.fillRect(1260 - 18 - i * 22, 674, 16, 10);
  }
  text(ctx, 'NITRO', 1260 - 70, 684, 11, '#ddd', 'right');

  // Radio.
  if (world.radio) text(ctx, '♪ SOL FM', 20, 560, 13, '#ff9fde', 'left', true);

  // Toast and prompt.
  if (hud.toastT > 0) {
    hud.toastT -= dt;
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
