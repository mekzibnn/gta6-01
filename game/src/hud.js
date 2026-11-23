// 2D HUD — the dense top-tier overlay: mission banner with stage bar
// and timer, KPD RESPONSE with named units, rank panel, district
// standing, respect progress, crew cards with portraits and keybinds,
// weapon slots with ammo, a real street minimap, big speed, dialogue.
import { WEAPONS, CREW, RANK_GRADES, RESPECT_TITLES, RADIO_LINE, MISSIONS } from './config.js';
import { armorLabel } from './upgrades.js';

const W = 1280, H = 720;

export function buildHud(g, canvas) {
  canvas.width = W;
  canvas.height = H;
  g.hud.ctx = canvas.getContext('2d');
  g.hud.canvas = canvas;
}

function ctxOf(g) { return g.hud.ctx; }

function panel(c, x, y, w, h, alpha) {
  c.fillStyle = `rgba(8,10,18,${alpha === undefined ? 0.72 : alpha})`;
  c.fillRect(x, y, w, h);
  c.strokeStyle = 'rgba(255,255,255,0.28)';
  c.lineWidth = 1;
  c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}
function word(c, text, x, y, size, color, bold, align) {
  c.font = `${bold ? 'bold ' : ''}${size}px system-ui, sans-serif`;
  c.fillStyle = color || '#ffffff';
  c.textAlign = align || 'left';
  c.textBaseline = 'alphabetic';
  c.fillText(text, x, y);
}
function bar(c, x, y, w, h, frac, fill, bg) {
  c.fillStyle = bg || 'rgba(255,255,255,0.18)';
  c.fillRect(x, y, w, h);
  const f = Math.max(0, Math.min(1, frac));
  c.fillStyle = fill;
  c.fillRect(x, y, w * f, h);
}
function fmtTime(t) {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
function fmtNum(n) { return Math.round(n).toLocaleString('en-US'); }
function rankPoints(g) {
  return g.player.respect * 10 + g.stats.missions * 150 + g.stats.racesWon * 100;
}
function rankGrade(g) {
  const rp = rankPoints(g);
  let grade = RANK_GRADES[0];
  for (const r of RANK_GRADES) if (rp >= r.at) grade = r;
  return { rp, grade };
}
function respectInfo(g) {
  const r = g.player.respect;
  let cur = RESPECT_TITLES[0];
  let next = null;
  for (let i = 0; i < RESPECT_TITLES.length; i += 1) {
    if (r >= RESPECT_TITLES[i].at) cur = RESPECT_TITLES[i];
    else if (!next) next = RESPECT_TITLES[i];
  }
  return { cur, next: next || { name: 'MAX', at: cur.at } };
}
function standingLabel(v) {
  if (v < 0) return 'HOSTILE';
  if (v < 30) return 'COLD';
  if (v < 70) return 'NEUTRAL';
  if (v < 100) return 'WARM';
  return 'ALLY';
}
function ammoText(g, w) {
  if (!g.player.weapons[w.slot]) return 'LOCKED';
  if (w.ammo === Infinity) return '∞';
  const cur = g.player.ammo[w.slot];
  return `${cur}/${w.ammo}`;
}

function paintBanner(g) {
  const c = ctxOf(g);
  const x = 16, y = 16, w = 400, h = 128;
  if (g.hud.bannerT > 0 && g.hud.banner) {
    panel(c, x, y, w, h);
    c.fillStyle = '#ffd166';
    c.fillRect(x, y, 4, h);
    word(c, g.hud.banner, x + 16, y + 28, 20, '#ffd166', true);
    const obj = g.objectiveText || '';
    const lines = wrap(c, obj, w - 32, 16);
    word(c, lines[0] || '', x + 16, y + 52, 16, '#ffffff');
    if (lines[1]) word(c, lines[1], x + 16, y + 72, 16, '#ffffff');
    // Stage bar + timer + job counter.
    const total = missionSteps(g);
    const stage = Math.min(g.mission.step + 1, total);
    word(c, `STAGE ${stage}/${total}`, x + 16, y + 100, 13, '#9fb4ff', true);
    bar(c, x + 100, y + 88, 180, 10, g.mission.step / Math.max(1, total), '#ffd166');
    word(c, fmtTime(g.mission.timer), x + 300, y + 100, 14, '#ffffff', true);
    word(c, `JOB ${Math.min(g.mission.index + 1, 12)}/12`, x + 360, y + 100, 13, '#9fb4ff', true);
  } else {
    panel(c, x, y, w, 44);
    word(c, g.objectiveText || '', x + 14, y + 29, 16, '#ffffff');
  }
}
function missionSteps(g) {
  const steps = [3, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2];
  return steps[Math.min(g.mission.index, 11)] || 2;
}
function wrap(c, text, maxW, size) {
  c.font = `${size}px system-ui, sans-serif`;
  const words = String(text).split(' ');
  const lines = [''];
  for (const wd of words) {
    const test = lines[lines.length - 1] ? `${lines[lines.length - 1]} ${wd}` : wd;
    if (c.measureText(test).width > maxW && lines[lines.length - 1]) lines.push(wd);
    else lines[lines.length - 1] = test;
  }
  return lines.slice(0, 2);
}

function paintClockPlate(g) {
  const c = ctxOf(g);
  const x = 440, y = 16, w = 400, h = 44;
  panel(c, x, y, w, h, 0.78);
  const line = `${g.clockText} · ${g.phaseName} / ${g.weather.kind.toUpperCase()} / ${RADIO_LINE}`;
  word(c, line, x + w / 2, y + 28, 15, '#ffffff', true, 'center');
}

function paintInSight(g) {
  if (!g.heli || !g.heli.locked) return;
  const c = ctxOf(g);
  const x = 440, y = 68, w = 400, h = 32;
  c.fillStyle = 'rgba(200,20,20,0.85)';
  c.fillRect(x, y, w, h);
  c.strokeStyle = '#ff8888';
  c.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  word(c, 'IN SIGHT — Air One has you in the light', x + w / 2, y + 22, 15, '#ffffff', true, 'center');
}

function paintDispatch(g) {
  const c = ctxOf(g);
  if (g.player.wanted <= 0 || g.cops.length === 0) return;
  const x = 16, y = 152, w = 400;
  const rows = g.cops.slice(0, 6);
  const h = 34 + rows.length * 24 + 10;
  panel(c, x, y, w, h);
  word(c, `KPD RESPONSE — ${g.cops.length} UNITS`, x + 14, y + 26, 16, '#ff6b6b', true);
  rows.forEach((cop, i) => {
    const d = Math.round(Math.hypot(cop.x - g.player.x, cop.z - g.player.z));
    word(c, `${cop.callsign} · ${cop.role}`, x + 14, y + 52 + i * 24, 14, '#ffffff');
    word(c, `${d}m`, x + w - 14, y + 52 + i * 24, 14, '#ffd166', false, 'right');
  });
  if (g.cops.length > 6) word(c, `+${g.cops.length - 6} more`, x + 14, y + h - 8, 13, '#9fb4ff');
}

function paintRightPanel(g) {
  const c = ctxOf(g);
  const x = 880, y = 16, w = 384, h = 188;
  panel(c, x, y, w, h);
  // Cash + stars.
  word(c, `$${fmtNum(g.player.cash)}`, x + 14, y + 30, 24, '#ffd166', true);
  let stars = '';
  for (let i = 0; i < 5; i += 1) stars += i < g.player.wanted ? '★' : '☆';
  word(c, stars, x + w - 14, y + 30, 22, '#ffd166', false, 'right');
  // Rank.
  const { rp, grade } = rankGrade(g);
  const nextGrade = RANK_GRADES.find((r) => r.at > rp);
  const ri = respectInfo(g);
  word(c, `RANK ${grade.g}`, x + 14, y + 62, 26, '#ffffff', true);
  word(c, ri.cur.name, x + 110, y + 62, 20, '#7dd8ff', true);
  const rpFrac = nextGrade ? (rp - grade.at) / (nextGrade.at - grade.at) : 1;
  bar(c, x + 14, y + 72, w - 28, 10, rpFrac, '#ffd166');
  word(c, `${fmtNum(rp)} / ${nextGrade ? fmtNum(nextGrade.at) : 'MAX'} RP`, x + w - 14, y + 96, 12, '#cccccc', false, 'right');
  // District standing.
  const d = g.city.districtAt(g.player.x, g.player.z);
  const st = g.player.districtStanding[d.id] || 0;
  word(c, `${d.name.toUpperCase()} · ${standingLabel(st)} ${st}`, x + 14, y + 120, 14, '#ffffff', true);
  bar(c, x + 14, y + 128, w - 28, 8, st / 100, '#7dff8a');
  // Respect progress.
  word(c, `${ri.cur.name} ${fmtNum(g.player.respect)}/${fmtNum(ri.next.at)} RESPECT`, x + 14, y + 152, 14, '#ffffff', true);
  const rFrac = (g.player.respect - ri.cur.at) / Math.max(1, ri.next.at - ri.cur.at);
  bar(c, x + 14, y + 160, w - 28, 8, rFrac, '#7dd8ff');
  word(c, `EMPIRE $${fmtNum(g.empire.totalEarned)} EARNED`, x + 14, y + 180, 12, '#9fb4ff');
}

function paintCrewCards(g) {
  const c = ctxOf(g);
  const x = 880, y = 226, w = 384, h = 56;
  word(c, 'CREW', x, y - 6, 13, '#9fb4ff', true);
  CREW.forEach((crew, i) => {
    const cy = y + i * (h + 6);
    const hired = !!g.roster.hired[crew.id];
    panel(c, x, cy, w, h, hired ? 0.78 : 0.45);
    // Portrait — a coloured disc with the initial.
    c.beginPath();
    c.arc(x + 28, cy + h / 2, 18, 0, Math.PI * 2);
    c.fillStyle = hired ? '#2d6a4f' : '#444a55';
    c.fill();
    c.strokeStyle = '#ffffff';
    c.stroke();
    word(c, crew.name[0], x + 28, cy + h / 2 + 7, 18, '#ffffff', true, 'center');
    word(c, `${crew.name} · ${crew.role}`, x + 54, cy + 22, 15, '#ffffff', true);
    word(c, `${crew.ability}  [${crew.key}]`, x + 54, cy + 42, 13, hired ? '#ffd166' : '#888888');
    const cd = g.roster.cooldowns[crew.id] || 0;
    if (hired && cd > 0) {
      word(c, `READY IN ${Math.ceil(cd)}s`, x + w - 14, cy + 42, 13, '#ff6b6b', false, 'right');
    } else if (!hired) {
      word(c, `$${fmtNum(crew.price)}`, x + w - 14, cy + 22, 14, '#ffd166', false, 'right');
    } else {
      word(c, 'READY', x + w - 14, cy + 22, 13, '#7dff8a', false, 'right');
    }
  });
}

function paintWeapons(g) {
  const c = ctxOf(g);
  const x = 880, y = 410, w = 384;
  const h = 26 + WEAPONS.length * 20 + 6;
  panel(c, x, y, w, h);
  word(c, 'WEAPONS — hold Q for wheel', x + 14, y + 20, 13, '#9fb4ff', true);
  WEAPONS.forEach((wpn, i) => {
    const wy = y + 26 + i * 20;
    const owned = !!g.player.weapons[wpn.slot];
    const sel = g.player.weapon === wpn.slot;
    if (sel) {
      c.fillStyle = 'rgba(255,209,102,0.18)';
      c.fillRect(x + 4, wy, w - 8, 18);
    }
    word(c, `${wpn.slot + 1}`, x + 14, wy + 14, 13, sel ? '#ffd166' : '#aaaaaa', true);
    word(c, wpn.name, x + 34, wy + 14, 14, owned ? '#ffffff' : '#777777', sel);
    word(c, ammoText(g, wpn), x + w - 14, wy + 14, 14, owned ? '#ffd166' : '#777777', false, 'right');
  });
}

function paintMinimap(g) {
  const c = ctxOf(g);
  const x = 16, y = 500, w = 200, h = 200;
  panel(c, x, y, w, h, 0.8);
  // Beach + sea on the west edge.
  c.fillStyle = '#e8d5a3';
  c.fillRect(x + 2, y + 2, 12, h - 4);
  c.fillStyle = '#1e6f9e';
  c.fillRect(x + 2, y + 2, 5, h - 4);
  const mx = (wx) => x + 14 + ((wx + 260) / 450) * (w - 28);
  const mz = (wz) => y + 14 + ((wz + 190) / 380) * (h - 28);
  // Streets.
  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.lineWidth = 2;
  for (const ax of g.city.avenues) {
    c.beginPath(); c.moveTo(mx(ax), y + 14); c.lineTo(mx(ax), y + h - 14); c.stroke();
  }
  for (const sz of g.city.streets) {
    c.beginPath(); c.moveTo(x + 14, mz(sz)); c.lineTo(x + w - 14, mz(sz)); c.stroke();
  }
  // Shops.
  c.fillStyle = '#ffd166';
  for (const s of Object.values(g.city.spots)) {
    c.fillRect(mx(s.x) - 2, mz(s.z) - 2, 4, 4);
  }
  // Mission marker — a yellow diamond on the current target.
  const def = g.mission.index < 12 ? MISSIONS[g.mission.index] : null;
  if (def) {
    const step = def.steps[Math.min(g.mission.step, def.steps.length - 1)];
    const spot = step && step.spot ? g.city.spots[step.spot] : null;
    if (spot) {
      c.fillStyle = '#ffd166';
      c.beginPath();
      c.moveTo(mx(spot.x), mz(spot.z) - 6);
      c.lineTo(mx(spot.x) + 6, mz(spot.z));
      c.lineTo(mx(spot.x), mz(spot.z) + 6);
      c.lineTo(mx(spot.x) - 6, mz(spot.z));
      c.closePath();
      c.fill();
    }
  }
  // Cops in red, player in white.
  c.fillStyle = '#ff4444';
  for (const cop of g.cops) c.fillRect(mx(cop.x) - 2, mz(cop.z) - 2, 4, 4);
  if (g.heli) {
    c.fillStyle = '#7dd8ff';
    c.beginPath(); c.arc(mx(g.heli.x), mz(g.heli.z), 4, 0, Math.PI * 2); c.fill();
  }
  c.fillStyle = '#ffffff';
  c.beginPath(); c.arc(mx(g.player.x), mz(g.player.z), 4, 0, Math.PI * 2); c.fill();
  // North arrow.
  word(c, 'N', x + w - 14, y + 16, 13, '#ffffff', true);
  c.beginPath(); c.moveTo(x + w - 10, y + 20); c.lineTo(x + w - 10, y + 32); c.strokeStyle = '#ffffff'; c.stroke();
  const d = g.city.districtAt(g.player.x, g.player.z);
  word(c, d.name.toUpperCase(), x, y + h + 16, 13, '#ffffff', true);
}

function paintDialogue(g) {
  const c = ctxOf(g);
  if (g.hud.dialogT <= 0 || !g.hud.dialog) return;
  const x = 340, y = 616, w = 600, h = 62;
  panel(c, x, y, w, h, 0.8);
  c.beginPath();
  c.arc(x + 32, y + h / 2, 18, 0, Math.PI * 2);
  c.fillStyle = '#1d3557';
  c.fill();
  c.strokeStyle = '#ffffff';
  c.stroke();
  word(c, 'K', x + 32, y + h / 2 + 7, 18, '#ffffff', true, 'center');
  const lines = wrap(c, g.hud.dialog, w - 90, 15);
  word(c, lines[0] || '', x + 58, y + 28, 15, '#ffffff');
  if (lines[1]) word(c, lines[1], x + 58, y + 48, 15, '#ffffff');
}

function paintSpeed(g) {
  const c = ctxOf(g);
  const x = 1000, y = 588, w = 264, h = 126;
  panel(c, x, y, w, h, 0.66);
  if (g.car) {
    const kmh = Math.round(Math.abs(g.car.speed) * 3.6);
    word(c, String(kmh), x + 14, y + 48, 44, '#ffffff', true);
    word(c, 'KM/H', x + 130, y + 48, 18, '#9fb4ff', true);
    const cond = Math.round((g.car.health / g.car.maxHealth) * 100);
    const dent = Math.round((1 - g.car.health / g.car.maxHealth) * 100);
    word(c, g.car.model.toUpperCase(), x + 14, y + 70, 15, '#ffd166', true);
    word(c, `${cond}% CONDITION`, x + w - 14, y + 70, 13, '#ffffff', false, 'right');
    bar(c, x + 14, y + 78, w - 28, 8, g.car.health / g.car.maxHealth, cond > 50 ? '#7dff8a' : cond > 25 ? '#ffd166' : '#ff4444');
    word(c, dent > 0 ? `${dent}% DENTED` : 'PRISTINE', x + 14, y + 98, 12, '#cccccc');
    if (g.garage.nitro > 0) word(c, `NITRO ×${g.garage.nitro}`, x + w - 14, y + 98, 12, '#7dd8ff', false, 'right');
  } else {
    word(c, 'ON FOOT', x + 14, y + 48, 26, '#ffffff', true);
  }
  // Health row.
  word(c, 'HEALTH', x + 14, y + 112, 11, '#9fb4ff', true);
  bar(c, x + 72, y + 102, 120, 8, g.player.health / 100, '#7dff8a');
  word(c, `${Math.round(g.player.health)}`, x + 198, y + 112, 11, '#ffffff');
  // Armour row.
  word(c, 'ARMOUR', x + 14, y + 124, 11, '#9fb4ff', true);
  bar(c, x + 72, y + 114, 120, 8, g.garage.armor / 2, '#7dd8ff');
  word(c, armorLabel(g.garage.armor), x + 198, y + 124, 11, '#ffffff');
}

function paintWheel(g) {
  const c = ctxOf(g);
  const cx = W / 2, cy = H / 2, r = 130;
  c.fillStyle = 'rgba(8,10,18,0.8)';
  c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.fill();
  c.strokeStyle = 'rgba(255,255,255,0.4)';
  c.stroke();
  word(c, 'WEAPON WHEEL', cx, cy - r - 12, 16, '#ffffff', true, 'center');
  WEAPONS.forEach((wpn, i) => {
    const a = -Math.PI / 2 + (i / WEAPONS.length) * Math.PI * 2;
    const sx = cx + Math.cos(a) * 88;
    const sy = cy + Math.sin(a) * 88;
    const owned = !!g.player.weapons[wpn.slot];
    const sel = g.player.weapon === wpn.slot;
    c.beginPath();
    c.arc(sx, sy, sel ? 26 : 21, 0, Math.PI * 2);
    c.fillStyle = sel ? '#ffd166' : 'rgba(255,255,255,0.12)';
    c.fill();
    c.strokeStyle = '#ffffff';
    c.stroke();
    word(c, wpn.name, sx, sy - 4, 11, sel ? '#000000' : '#ffffff', true, 'center');
    word(c, owned ? ammoText(g, wpn) : 'LOCKED', sx, sy + 10, 10, sel ? '#000000' : '#cccccc', false, 'center');
  });
}

function paintShop(g) {
  const c = ctxOf(g);
  const s = g.shopOpen;
  if (!s) return;
  const w = 560, h = 320, x = (W - w) / 2, y = (H - h) / 2;
  panel(c, x, y, w, h, 0.92);
  const title = { garage: 'GARAGE', venture: 'EMPIRE — BUY A BUSINESS', crew: 'CREW OFFICE — HIRE', races: 'RACE OFFICE', weapons: 'GUN STORE' }[s.kind] || s.kind.toUpperCase();
  word(c, title, x + 20, y + 34, 20, '#ffd166', true);
  word(c, `$${fmtNum(g.player.cash)}`, x + w - 20, y + 34, 18, '#ffffff', false, 'right');
  const lines = s.menu || [];
  lines.forEach((ln, i) => {
    word(c, ln, x + 20, y + 70 + i * 26, 16, '#ffffff');
  });
  word(c, 'Press the number key, or ESC to walk away', x + 20, y + h - 16, 13, '#9fb4ff');
}

function paintPause(g) {
  const c = ctxOf(g);
  c.fillStyle = 'rgba(0,0,0,0.6)';
  c.fillRect(0, 0, W, H);
  word(c, 'PAUSED', W / 2, H / 2 - 10, 44, '#ffffff', true, 'center');
  word(c, 'Progress saved — press P to keep playing', W / 2, H / 2 + 30, 16, '#cccccc', false, 'center');
}

export function paintHud(g) {
  const c = ctxOf(g);
  if (!c) return;
  c.clearRect(0, 0, W, H);
  // Damage flash.
  if (g.flash > 0) {
    c.fillStyle = `rgba(255,255,255,${Math.min(0.85, g.flash)})`;
    c.fillRect(0, 0, W, H);
  }
  if (g.player.health < 30) {
    c.strokeStyle = 'rgba(255,40,40,0.55)';
    c.lineWidth = 14;
    c.strokeRect(7, 7, W - 14, H - 14);
  }
  paintBanner(g);
  paintClockPlate(g);
  paintInSight(g);
  paintDispatch(g);
  paintRightPanel(g);
  paintCrewCards(g);
  paintWeapons(g);
  paintMinimap(g);
  paintDialogue(g);
  paintSpeed(g);
  if (g.hud.noteT > 0 && g.hud.note) {
    word(c, g.hud.note, W / 2, 600, 15, '#ffd166', true, 'center');
  }
  if (g.wheel.open) paintWheel(g);
  if (g.shopOpen) paintShop(g);
  if (g.paused) paintPause(g);
}
