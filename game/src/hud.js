// Heads-up display, rebuilt from the spec. A fixed 1280x720 overlay
// canvas sits over the WebGL view and is repainted every frame from
// the live state: money and heat, the clock and the station, the
// three-line mission banner, the dispatch board, the crew roster, the
// weapon rack, the car readout, the minimap and the LEO brief. The
// banner and the one-line objective never share the screen.

import { clockLabel } from './daynight.js';
import { weatherLabel } from './weather.js';
import { armorName } from './upgrades.js';
import { RACE_DEFS } from './races.js';
import { WEAPONS, CREW } from './config.js';

const VW = 1280;
const VH = 720;

// Build the overlay canvas and park it over the 3D view.
export function buildHud(st) {
  const cv = document.createElement('canvas');
  cv.width = VW;
  cv.height = VH;
  cv.style.position = 'fixed';
  cv.style.left = '0';
  cv.style.top = '0';
  cv.style.pointerEvents = 'none';
  cv.style.zIndex = '5';
  document.body.appendChild(cv);
  st.hud.canvas = cv;
  st.hud.ctx = cv.getContext('2d');
  return st.hud;
}

// A filled box with a faint rim.
function rect(c, x, y, w, h, fill, op) {
  c.save();
  c.globalAlpha = op === undefined ? 0.82 : op;
  c.fillStyle = fill || '#101418';
  c.fillRect(x, y, w, h);
  c.globalAlpha = 1;
  c.strokeStyle = 'rgba(255,255,255,0.25)';
  c.lineWidth = 1;
  c.strokeRect(x + 0.5, y + 0.5, w, h);
  c.restore();
}

// One line of text, with a hard drop shadow so it reads over the city.
function word(c, s, x, y, size, color, align, bold) {
  c.save();
  c.font = `${bold ? 'bold ' : ''}${size}px 'Segoe UI', system-ui, sans-serif`;
  c.textAlign = align || 'left';
  c.textBaseline = 'top';
  c.fillStyle = color || '#ffffff';
  c.shadowColor = 'rgba(0,0,0,0.85)';
  c.shadowBlur = 0;
  c.shadowOffsetX = 1;
  c.shadowOffsetY = 1;
  c.fillText(s, x, y, 2000);
  c.restore();
}

// A horizontal meter: dark trough, coloured fill.
function gauge(c, x, y, w, h, frac, fill) {
  c.save();
  c.fillStyle = 'rgba(255,255,255,0.16)';
  c.fillRect(x, y, w, h);
  c.fillStyle = fill;
  c.fillRect(x, y, Math.max(0, Math.min(1, frac)) * w, h);
  c.strokeStyle = 'rgba(255,255,255,0.4)';
  c.lineWidth = 1;
  c.strokeRect(x + 0.5, y + 0.5, w, h);
  c.restore();
}

// The minimap: a dark grid, the districts faintly marked, the player a
// white dot, the objective a gold diamond, cops red, the car orange.
function paintMap(c, st) {
  const px = 1086;
  const py = 520;
  const ps = 180;
  const me = st.player;
  rect(c, px, py, ps, ps, '#0c1218', 0.88);
  word(c, 'SOLMAR', px + 8, py + 4, 11, '#9fd8ef', 'left', true);
  c.save();
  c.strokeStyle = 'rgba(255,255,255,0.14)';
  c.lineWidth = 1;
  for (let i = 1; i < 6; i += 1) {
    c.beginPath();
    c.moveTo(px + (i * ps) / 6, py);
    c.lineTo(px + (i * ps) / 6, py + ps);
    c.stroke();
    c.beginPath();
    c.moveTo(px, py + (i * ps) / 6);
    c.lineTo(px + ps, py + (i * ps) / 6);
    c.stroke();
  }
  c.restore();
  const toMap = (x, z) => [px + ((x + 220) / 440) * ps, py + ((z + 220) / 440) * ps];
  if (st.objective) {
    const [ox, oy] = toMap(st.objective.x, st.objective.z);
    c.save();
    c.fillStyle = '#f0c94a';
    c.translate(ox, oy);
    c.rotate(Math.PI / 4);
    c.fillRect(-4, -4, 8, 8);
    c.restore();
  }
  for (const cop of st.cops) {
    const [cx, cy] = toMap(cop.x, cop.z);
    c.fillStyle = '#ff5a4e';
    c.fillRect(cx - 2, cy - 2, 4, 4);
  }
  if (st.car) {
    const [vx, vy] = toMap(st.car.x, st.car.z);
    c.fillStyle = '#ff9a3d';
    c.fillRect(vx - 3, vy - 3, 6, 6);
  }
  const [mx, my] = toMap(me.x, me.z);
  c.save();
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.arc(mx, my, 4, 0, Math.PI * 2);
  c.fill();
  c.restore();
}

// The shop prompt and the open menus. Menus are lists the player picks
// with the number keys; the prompt is the one-line "press E" hint.
function paintShops(c, st) {
  const me = st.player;
  if (st.shopOpen) {
    const open = st.shopOpen;
    const rows = open.rows || [];
    const mh = 44 + rows.length * 26;
    const mw = 420;
    const mx = (VW - mw) / 2;
    const my = 210;
    rect(c, mx, my, mw, mh, '#14100c');
    word(c, open.title || 'SHOP', mx + 16, my + 10, 17, '#f0c94a', 'left', true);
    rows.forEach((r, i) => {
      const y = my + 38 + i * 26;
      const dim = r.disabled ? '#777777' : '#ffffff';
      word(c, `${i + 1}. ${r.label}`, mx + 16, y, 14, dim);
      if (r.price !== undefined) word(c, `$${r.price}`, mx + mw - 16, y, 14, r.disabled ? '#777777' : '#7dff8a', 'right');
    });
    word(c, 'Press a number, or E to close', mx + 16, my + mh - 22, 12, '#9fd8ef');
    return;
  }
  if (st.shopNear) {
    const s = st.shopNear;
    const label = `Press E — ${s.label}`;
    const tw = 40 + label.length * 8;
    const bx = (VW - tw) / 2;
    rect(c, bx, 640, tw, 32, '#101418', 0.85);
    word(c, label, bx + 20, 648, 15, '#ffffff');
  }
  if (st.chopNear) {
    const label = 'Press E — sell this car at the Chop Shop';
    const tw = 40 + label.length * 8;
    const bx = (VW - tw) / 2;
    rect(c, bx, 640, tw, 32, '#101418', 0.85);
    word(c, label, bx + 20, 648, 15, '#ffffff');
  }
}

// The weapon wheel: a ring of the four slots, the held one highlighted.
function paintWheel(c, st) {
  const wh = st.wheel;
  if (!wh.open) return;
  const cx = VW / 2;
  const cy = VH / 2;
  rect(c, cx - 190, cy - 70, 380, 140, '#101418', 0.9);
  word(c, 'WEAPON WHEEL — release Q to confirm', cx, cy - 58, 13, '#9fd8ef', 'center', true);
  WEAPONS.forEach((w, i) => {
    const ok = st.player.weapons[i];
    const sel = wh.sel === i;
    const x = cx - 160 + i * 82;
    c.save();
    c.fillStyle = sel ? '#f0c94a' : 'rgba(255,255,255,0.12)';
    c.fillRect(x, cy - 30, 72, 52);
    c.restore();
    word(c, `${i + 1} ${w.name}`, x + 36, cy - 24, 12, sel ? '#111111' : '#ffffff', 'center', sel);
    word(c, ok ? 'ready' : 'locked', x + 36, cy + 2, 10, ok ? '#7dff8a' : '#888888', 'center');
  });
}

// The whole frame, repainted from the live state.
export function paintHud(st) {
  const c = st.hud.ctx;
  if (!c) return;
  const me = st.player;
  c.clearRect(0, 0, VW, VH);

  // Explosion flash washes the screen warm for a beat.
  if (st.flash > 0) {
    c.save();
    c.globalAlpha = st.flash * 0.55;
    c.fillStyle = '#fff0c8';
    c.fillRect(0, 0, VW, VH);
    c.restore();
  }

  // --- Minimap, bottom-right.
  paintMap(c, st);

  // --- Top-left: money, heat, standing.
  rect(c, 14, 14, 250, 64, '#101418');
  word(c, `$${Math.floor(me.cash).toLocaleString('en-US')}`, 26, 22, 26, '#7dff8a', 'left', true);
  const stars = '★'.repeat(me.wanted) + '☆'.repeat(Math.max(0, 5 - me.wanted));
  word(c, stars, 26, 52, 18, '#ffd23e', 'left', true);
  const tier = me.respect >= 50 ? 'Kingpin' : me.respect >= 20 ? 'Hustler' : me.respect >= 5 ? 'Runner' : 'Nobody';
  word(c, `RESPECT ${tier}`, 150, 24, 14, '#e8e8e8');
  const here = st.city.districtAt(me.x, me.z);
  const stand = me.districtStanding[here.key] || 0;
  word(c, `${here.name.toUpperCase()} · standing ${stand}`, 150, 44, 13, '#9fd8ef');

  // --- Top-right: one plate holds the clock, the weather and the
  // station, so the radio never floats bare over the road.
  rect(c, 986, 14, 280, 84, '#101418');
  word(c, clockLabel(st.clock), 1000, 22, 19, '#ffffff', 'left', true);
  word(c, weatherLabel(st.weather), 1000, 46, 13, '#9fd8ef');
  word(c, '♪ SOL FM 98.4 — Solmar Nights', 1000, 70, 13, '#ffb03a');

  // --- Top-centre: the three-line mission banner, or the one-line
  // objective strip when the banner is down. Never both.
  if (st.hud.bannerT > 0 && st.hud.banner) {
    const rows = st.hud.banner.split('\n');
    const bw = 640;
    const bx = (VW - bw) / 2;
    rect(c, bx, 14, bw, 108, '#14100c');
    c.fillStyle = '#f0c94a';
    c.fillRect(bx, 14, bw, 4);
    word(c, rows[0] || '', bx + 16, 26, 19, '#f0c94a', 'left', true);
    word(c, rows[1] || '', bx + 16, 52, 17, '#ffffff');
    word(c, rows[2] || '', bx + 16, 78, 15, '#9fd8ef');
  } else if (st.objectiveText) {
    const tw = Math.min(640, 40 + st.objectiveText.length * 8.5);
    const bx = (VW - tw) / 2;
    rect(c, bx, 14, tw, 34, '#101418', 0.75);
    word(c, st.objectiveText, bx + 14, 22, 15, '#ffffff');
  }

  // --- Right side: the dispatch board, only while the heat is on.
  if (me.wanted >= 1 && st.cops.length > 0) {
    const units = st.cops.slice(0, 6);
    const ph = 30 + units.length * 22;
    rect(c, 986, 118, 280, ph, '#1a1214');
    word(c, 'KPD RESPONSE', 1000, 126, 15, '#ff7a6a', 'left', true);
    units.forEach((u, i) => {
      const dx = u.x - me.x;
      const dz = u.z - me.z;
      const dist = Math.round(Math.sqrt(dx * dx + dz * dz));
      word(c, `SPD-${u.id} · ${u.kind.toUpperCase()} · ${dist}m`, 1000, 148 + i * 22, 13, '#ffffff');
    });
  }

  // --- Right side: the hired crew, one card each, under the board.
  const mates = Object.keys(st.roster.hired).filter((id) => st.roster.hired[id]);
  const boardH = me.wanted >= 1 && st.cops.length > 0 ? 30 + Math.min(6, st.cops.length) * 22 : 0;
  const cy = 118 + boardH + (boardH ? 10 : 0);
  if (mates.length > 0) {
    rect(c, 986, cy, 280, 26 + mates.length * 22, '#101418');
    word(c, 'CREW', 1000, cy + 6, 13, '#7dff8a', 'left', true);
    mates.forEach((id, i) => {
      const m = CREW[id];
      word(c, `${m.short} ${m.name} — ${m.effect}`, 1000, cy + 26 + i * 22, 13, '#ffffff');
    });
  }

  // --- Right side: the weapon rack, a vertical list so every name
  // fits whole — no slot is ever cut at the screen edge. It hangs
  // below the crew cards, never over the minimap.
  const crewBottom = mates.length > 0 ? cy + 26 + mates.length * 22 : 118 + boardH;
  const wy = crewBottom + 10;
  rect(c, 986, wy, 280, 30 + WEAPONS.length * 24, '#101418');
  word(c, 'WEAPONS', 1000, wy + 8, 12, '#9fd8ef', 'left', true);
  WEAPONS.forEach((w, i) => {
    const ok = me.weapons[i];
    const sel = me.weapon === i;
    const y = wy + 30 + i * 24;
    word(c, `${i + 1}  ${w.name}`, 1000, y, 13, sel ? '#f0c94a' : '#ffffff', 'left', sel);
    word(c, ok ? 'ready' : 'locked', 1252, y, 12, ok ? '#7dff8a' : '#888888', 'right');
  });

  // --- Bottom-left: the car readout, or the on-foot health bar.
  if (st.car) {
    const ride = st.car;
    const cond = Math.round((ride.health / ride.maxHealth) * 100);
    rect(c, 14, 596, 300, 96, '#101418');
    word(c, ride.name, 26, 604, 17, '#ffffff', 'left', true);
    word(c, `condition ${cond}%`, 26, 626, 14, cond > 50 ? '#7dff8a' : '#ff7a6a');
    word(c, 'HEALTH', 26, 650, 12, '#ffffff');
    gauge(c, 90, 650, 200, 12, ride.health / ride.maxHealth, '#e0483e');
    word(c, 'ARMOUR', 26, 668, 12, '#ffffff');
    gauge(c, 90, 668, 200, 12, (st.garage.armor + 1) / 3, '#7fa8d9');
    word(c, armorName(st.garage.armor), 296, 668, 12, '#9fd8ef', 'left');
  } else {
    rect(c, 14, 636, 300, 56, '#101418');
    word(c, 'HEALTH', 26, 644, 12, '#ffffff');
    gauge(c, 90, 644, 200, 12, me.health / me.maxHealth, '#e0483e');
    word(c, 'ON FOOT — press E near a car to steal it', 26, 664, 12, '#9fd8ef');
  }

  // --- Bottom-centre: the LEO brief, with its gold left edge.
  if (st.hud.dialogue) {
    const dw = 640;
    const dx = (VW - dw) / 2;
    rect(c, dx, 612, dw, 52, '#14100c', 0.9);
    c.fillStyle = '#f0c94a';
    c.fillRect(dx, 612, 4, 52);
    word(c, st.hud.dialogue, dx + 16, 628, 15, '#ffffff');
  }

  // --- Toasts, centre screen.
  if (st.hud.toastT > 0 && st.hud.toast) {
    const tw = 40 + st.hud.toast.length * 9;
    const tx = (VW - tw) / 2;
    rect(c, tx, 300, tw, 36, '#14100c', 0.92);
    word(c, st.hud.toast, tx + 20, 310, 16, '#f0c94a', 'left', true);
  }

  // --- The race banner, when a street series is running.
  if (st.streetRaces && st.streetRaces.active) {
    const r = st.streetRaces.active;
    const def = RACE_DEFS[r.id];
    const label = `${def.name} — gate ${r.gate}/${def.gates.length} · ${r.time.toFixed(1)}s`;
    const tw = 40 + label.length * 8.5;
    const bx = (VW - tw) / 2;
    rect(c, bx, 132, tw, 32, '#101418', 0.85);
    word(c, label, bx + 20, 140, 15, '#ffffff');
  }

  paintShops(c, st);
  paintWheel(c, st);

  // --- Paused: dim the world and name the save.
  if (st.paused) {
    c.save();
    c.globalAlpha = 0.55;
    c.fillStyle = '#000000';
    c.fillRect(0, 0, VW, VH);
    c.restore();
    word(c, 'PAUSED — game saved', VW / 2, 320, 28, '#ffffff', 'center', true);
    word(c, 'Press P to keep playing', VW / 2, 360, 16, '#9fd8ef', 'center');
  }
}
