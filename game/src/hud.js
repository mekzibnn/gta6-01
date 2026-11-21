// The HUD — a 2D canvas over the 3D view (v6 rewrite).
// Every piece of the interface is a widget: a small function that knows
// where it sits, what it shows, and when it hides. The HUD never takes
// pointer input, so the game canvas keeps the mouse. Widgets read the live
// game each frame; nothing here owns game state.

export function initHud(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    canvas,
    ctx,
    w: canvas.width,
    h: canvas.height,
    banner: null,
    bannerUntil: 0,
    prompt: null,
    toast: null,
    toastUntil: 0,
  };
}

export function resizeHud(hud, w, h) {
  hud.canvas.width = w;
  hud.canvas.height = h;
  hud.w = w;
  hud.h = h;
  return hud;
}

export function showBanner(hud, text, sub, seconds) {
  hud.banner = { text, sub: sub || '' };
  hud.bannerUntil = performance.now() / 1000 + (seconds || 4);
  return hud;
}

export function showToast(hud, text, seconds) {
  hud.toast = text;
  hud.toastUntil = performance.now() / 1000 + (seconds || 2.5);
  return hud;
}

export function showPrompt(hud, lines) {
  hud.prompt = lines || null;
  return hud;
}

function pill(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bar(ctx, x, y, w, h, frac, fill, back) {
  ctx.fillStyle = back || 'rgba(0,0,0,0.55)';
  pill(ctx, x, y, w, h, h / 2);
  ctx.fill();
  if (frac > 0) {
    ctx.fillStyle = fill;
    pill(ctx, x, y, Math.max(h, w * Math.min(1, frac)), h, h / 2);
    ctx.fill();
  }
}

function text(ctx, str, x, y, size, color, align, weight) {
  ctx.font = `${weight || 700} ${size}px system-ui, sans-serif`;
  ctx.fillStyle = color || '#fff';
  ctx.textAlign = align || 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

export function drawCash(hud, game) {
  const { ctx } = hud;
  const x = 16;
  const y = 16;
  ctx.fillStyle = 'rgba(10,16,22,0.72)';
  pill(ctx, x, y, 190, 58, 10);
  ctx.fill();
  text(ctx, `$${game.player.cash.toLocaleString()}`, x + 14, y + 20, 24, '#7dff8a');
  bar(ctx, x + 14, y + 40, 162, 8, game.player.health / 100, '#58d68d');
  text(ctx, 'LEO MARIN', x + 96, y + 20, 11, '#cfe3ef', 'left', 600);
  text(ctx, 'HEALTH', x + 96, y + 40, 10, '#9fb6c6', 'left', 600);
}

export function drawWanted(hud, game) {
  const { ctx } = hud;
  const x = hud.w - 206;
  const y = 16;
  ctx.fillStyle = 'rgba(10,16,22,0.72)';
  pill(ctx, x, y, 190, 58, 10);
  ctx.fill();
  let stars = '';
  for (let i = 0; i < 5; i += 1) stars += i < game.player.wanted ? '★' : '☆';
  text(ctx, `WANTED ${stars}`, x + 14, y + 20, 17, '#ffd23f');
  if (game.heli && game.heli.active) {
    text(ctx, 'AIR ONE OVERHEAD', x + 14, y + 42, 12, '#ff6b5e');
  } else if (game.player.wanted > 0) {
    text(ctx, 'LOSE THE COPS', x + 14, y + 42, 12, '#ff9d5c');
  } else {
    text(ctx, 'CLEAN', x + 14, y + 42, 12, '#7dff8a');
  }
}

export function drawRespect(hud, game) {
  const { ctx } = hud;
  const x = 16;
  const y = 84;
  ctx.fillStyle = 'rgba(10,16,22,0.72)';
  pill(ctx, x, y, 230, 46, 10);
  ctx.fill();
  const tier = game.respectTier || { name: 'Nobody', points: 0 };
  const next = game.respectNext;
  text(ctx, `RESPECT — ${tier.name.toUpperCase()}`, x + 12, y + 15, 13, '#ffd23f');
  const label = next
    ? `${game.district} · ${game.player.respect} pts — Next: ${next.name} (${next.points})`
    : `${game.district} · ${game.player.respect} pts — Max rank`;
  text(ctx, label, x + 12, y + 33, 11, '#cfe3ef', 'left', 500);
}

export function drawEmpire(hud, game) {
  const { ctx } = hud;
  const owned = Object.keys(game.empire.owned || {}).length;
  if (owned === 0) return;
  const x = 16;
  const y = 140;
  ctx.fillStyle = 'rgba(10,16,22,0.72)';
  pill(ctx, x, y, 230, 46, 10);
  ctx.fill();
  const names = Object.keys(game.empire.owned).map((id) => {
    const def = game.ventureDefs[id];
    return def ? def.label : id;
  });
  text(ctx, `EMPIRE ${owned} · $${game.empireHourly}/hr`, x + 12, y + 15, 13, '#7dff8a');
  text(ctx, names.join(' · '), x + 12, y + 33, 11, '#cfe3ef', 'left', 500);
}

export function drawCrew(hud, game) {
  const { ctx } = hud;
  const names = game.crewNames || [];
  if (names.length === 0) return;
  const x = 16;
  const y = 196;
  ctx.fillStyle = 'rgba(10,16,22,0.72)';
  pill(ctx, x, y, 230, 30, 10);
  ctx.fill();
  text(ctx, `CREW: ${names.join(' · ')}`, x + 12, y + 15, 12, '#8ec9e8');
}

export function drawRace(hud, game) {
  const { ctx } = hud;
  if (!game.streetRaces.active) return;
  const r = game.streetRaces.active;
  const x = hud.w / 2 - 130;
  const y = 16;
  ctx.fillStyle = 'rgba(10,16,22,0.78)';
  pill(ctx, x, y, 260, 52, 10);
  ctx.fill();
  text(ctx, `${r.label} — GATE ${r.gate}/${r.gates.length}`, x + 130, y + 16, 14, '#fff', 'center');
  text(ctx, `${r.elapsed.toFixed(1)}s  ·  par ${r.par}s`, x + 130, y + 36, 12, '#ffd23f', 'center');
}

export function drawMission(hud, game) {
  const { ctx } = hud;
  const m = game.mission;
  if (!m || !m.name) return;
  const x = hud.w / 2 - 260;
  const y = hud.h - 96;
  ctx.fillStyle = 'rgba(10,16,22,0.72)';
  pill(ctx, x, y, 520, 54, 10);
  ctx.fill();
  text(ctx, m.name, x + 260, y + 16, 14, '#ffd23f', 'center');
  text(ctx, m.stepText || '', x + 260, y + 36, 12, '#fff', 'center');
}

export function drawGarage(hud, game) {
  const { ctx } = hud;
  const g = game.garageSummary;
  if (!g) return;
  const x = 16;
  const y = hud.h - 76;
  ctx.fillStyle = 'rgba(10,16,22,0.72)';
  pill(ctx, x, y, 330, 30, 10);
  ctx.fill();
  text(ctx, `GARAGE  ENG ${g.engine} · ARMOR ${g.armor} · NITRO ${g.nitro}`, x + 12, y + 15, 12, '#ffd23f', 'left', 600);
}

export function drawWeapons(hud, game) {
  const { ctx } = hud;
  const x = 16;
  const y = hud.h - 36;
  ctx.fillStyle = 'rgba(10,16,22,0.72)';
  pill(ctx, x, y, 330, 26, 8);
  ctx.fill();
  const slots = game.weaponSlots || [];
  const line = slots.map((s, i) => {
    const cur = i === game.player.weapon ? '>' : '';
    return `${cur}${i + 1}:${s}`;
  }).join('  ');
  text(ctx, line, x + 12, y + 13, 12, '#fff', 'left', 600);
}

export function drawClock(hud, game) {
  const { ctx } = hud;
  const x = hud.w - 150;
  const y = hud.h - 76;
  ctx.fillStyle = 'rgba(10,16,22,0.72)';
  pill(ctx, x, y, 134, 30, 10);
  ctx.fill();
  const label = game.clock.golden ? 'GOLDEN HOUR' : game.clock.isNight ? 'NIGHT' : 'DAY';
  text(ctx, `${label} · ${game.clockLabel}`, x + 67, y + 15, 12, '#ffd23f', 'center');
}

export function drawSpeed(hud, game) {
  const { ctx } = hud;
  if (!game.player.inCar) return;
  const x = hud.w - 150;
  const y = hud.h - 36;
  ctx.fillStyle = 'rgba(10,16,22,0.72)';
  pill(ctx, x, y, 134, 26, 8);
  ctx.fill();
  text(ctx, `${game.speedKmh} km/h  ${game.clockLabel}`, x + 67, y + 13, 13, '#fff', 'center');
}

export function drawMinimap(hud, game) {
  const { ctx } = hud;
  const size = 150;
  const x = hud.w - size - 16;
  const y = 84;
  ctx.fillStyle = 'rgba(10,16,22,0.78)';
  pill(ctx, x, y, size, size, 10);
  ctx.fill();
  const half = 340;
  const toMap = (wx, wz) => [x + ((wx + half) / (half * 2)) * size, y + ((wz + half) / (half * 2)) * size];
  // Roads: faint grid.
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  for (const a of [-264, -176, -88, 0, 88, 176, 264]) {
    const [mx] = toMap(a, 0);
    ctx.beginPath(); ctx.moveTo(mx, y + 6); ctx.lineTo(mx, y + size - 6); ctx.stroke();
    const [, mz] = toMap(0, a);
    ctx.beginPath(); ctx.moveTo(x + 6, mz); ctx.lineTo(x + size - 6, mz); ctx.stroke();
  }
  // Businesses: gold dots. Race gates: white dots. Player: green triangle.
  for (const v of game.ventureDots || []) {
    const [mx, mz] = toMap(v.x, v.z);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(mx, mz, 4, 0, Math.PI * 2); ctx.fill();
  }
  for (const g of game.gateDots || []) {
    const [mx, mz] = toMap(g.x, g.z);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(mx, mz, 3, 0, Math.PI * 2); ctx.fill();
  }
  const [px, pz] = toMap(game.player.x, game.player.z);
  ctx.fillStyle = '#7dff8a';
  ctx.beginPath();
  ctx.moveTo(px, pz - 6);
  ctx.lineTo(px + 5, pz + 5);
  ctx.lineTo(px - 5, pz + 5);
  ctx.closePath();
  ctx.fill();
}

export function drawBanner(hud) {
  const { ctx } = hud;
  if (!hud.banner) return;
  const now = performance.now() / 1000;
  if (now > hud.bannerUntil) { hud.banner = null; return; }
  const x = hud.w / 2 - 300;
  const y = 84;
  ctx.fillStyle = 'rgba(20,28,38,0.88)';
  pill(ctx, x, y, 600, 56, 10);
  ctx.fill();
  text(ctx, hud.banner.text, hud.w / 2, y + 18, 16, '#ffd23f', 'center');
  if (hud.banner.sub) text(ctx, hud.banner.sub, hud.w / 2, y + 38, 12, '#fff', 'center');
}

export function drawPrompt(hud) {
  const { ctx } = hud;
  if (!hud.prompt || hud.prompt.length === 0) return;
  const x = hud.w / 2 - 260;
  const y = hud.h - 210;
  const h = 34 + hud.prompt.length * 24;
  ctx.fillStyle = 'rgba(10,16,22,0.85)';
  pill(ctx, x, y, 520, h, 10);
  ctx.fill();
  text(ctx, 'SHOP — press 1-9 to buy, Esc to leave', x + 260, y + 18, 12, '#ffd23f', 'center');
  hud.prompt.forEach((line, i) => {
    text(ctx, `${i + 1}. ${line.label}`, x + 20, y + 44 + i * 24, 13, '#fff', 'left', 500);
  });
}

export function drawToast(hud) {
  const { ctx } = hud;
  if (!hud.toast) return;
  const now = performance.now() / 1000;
  if (now > hud.toastUntil) { hud.toast = null; return; }
  const x = hud.w / 2 - 200;
  const y = 150;
  ctx.fillStyle = 'rgba(10,16,22,0.8)';
  pill(ctx, x, y, 400, 34, 10);
  ctx.fill();
  text(ctx, hud.toast, hud.w / 2, y + 17, 13, '#fff', 'center');
}

export function drawHud(hud, game) {
  const { ctx } = hud;
  ctx.clearRect(0, 0, hud.w, hud.h);
  drawCash(hud, game);
  drawWanted(hud, game);
  drawRespect(hud, game);
  drawEmpire(hud, game);
  drawCrew(hud, game);
  drawRace(hud, game);
  drawMission(hud, game);
  drawGarage(hud, game);
  drawWeapons(hud, game);
  drawClock(hud, game);
  drawSpeed(hud, game);
  drawMinimap(hud, game);
  drawBanner(hud);
  drawPrompt(hud);
  drawToast(hud);
}
