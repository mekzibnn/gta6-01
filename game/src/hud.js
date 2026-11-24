// Solmar Heat v12 — HUD: dense DOM overlay (mission banner, dispatch, rank, crew,
// weapons, speed, minimap, LEO dialogue, alerts, clock plate, wheel, shop menu).
import { CREW_DEFS, WEAPONS, DISPATCH_UNITS, RADIO, LEO_LINES, rankFor, standingLabel } from './config.js';
import { MISSION_DEFS } from './missions.js';
import { clockLabel } from './daynight.js';
import { weaponAmmoText } from './actors.js';
import { GARAGE_PRICES, RACE_DEFS } from './config.js';
import { crewDiscount } from './crew.js';

function el(tag, id, cls, parent) {
  const e = document.createElement(tag);
  if (id) e.id = id;
  if (cls) e.className = cls;
  if (parent) parent.appendChild(e);
  return e;
}

export function buildHud(g) {
  const hud = document.getElementById('hud');
  hud.innerHTML = '';
  const tl = el('div', 'hud-tl', null, hud);
  const banner = el('div', 'banner', 'panel', tl);
  el('div', 'banner-title', null, banner);
  el('div', 'banner-obj', null, banner);
  const brow = el('div', 'banner-row', null, banner);
  el('div', 'banner-stage', null, brow);
  el('div', 'banner-timer', null, brow);
  el('div', 'banner-job', null, brow);
  const disp = el('div', 'dispatch', 'panel', tl);
  el('div', 'dispatch-head', null, disp);
  const dlist = el('div', 'dispatch-list', null, disp);
  for (let i = 0; i < 6; i += 1) el('div', 'dispatch-unit-' + i, 'dispatch-unit', dlist);

  const tc = el('div', 'hud-tc', null, hud);
  el('div', 'clockplate', 'panel', tc);
  el('div', 'alert-insight', null, tc);

  const tr = el('div', 'hud-tr', null, hud);
  el('div', 'cashstars', 'panel', tr);
  const rank = el('div', 'rankpanel', 'panel', tr);
  el('div', 'rank-line', null, rank);
  el('div', 'rank-bar', null, rank);
  el('div', 'district-line', null, rank);
  el('div', 'respect-line', null, rank);
  el('div', 'empire-line', null, rank);
  const crew = el('div', 'crew', 'panel', tr);
  el('div', 'crew-head', null, crew);
  const clist = el('div', 'crew-list', null, crew);
  for (let i = 0; i < 3; i += 1) {
    const c = el('div', 'crew-card-' + i, 'crew-card', clist);
    // el(tag, id, class, parent): the inner spans are found by CLASS in
    // updateHud, so the class goes in the 3rd slot (id must be null).
    el('div', null, 'crew-face', c);
    const cb = el('div', null, 'crew-body', c);
    el('div', null, 'crew-name', cb);
    el('div', null, 'crew-ability', cb);
    el('div', null, 'crew-price', c);
  }
  const wp = el('div', 'weapons', 'panel', tr);
  el('div', 'weapons-head', null, wp);
  const wlist = el('div', 'weapons-list', null, wp);
  for (let i = 0; i < 7; i += 1) {
    const w = el('div', 'weapon-slot-' + i, 'weapon-slot', wlist);
    el('span', null, 'weapon-num', w);
    el('span', null, 'weapon-name', w);
    el('span', null, 'weapon-ammo', w);
  }

  const bl = el('div', 'hud-bl', null, hud);
  const mm = el('canvas', 'minimap', null, bl);
  mm.width = 190; mm.height = 190;
  el('div', 'minimap-label', null, bl);

  el('div', 'leo', 'panel', hud);
  const br = el('div', 'hud-br', null, hud);
  const speed = el('div', 'speed', 'panel', br);
  el('div', 'speed-num', null, speed);
  el('div', 'speed-car', null, speed);
  el('div', 'speed-cond', null, speed);
  el('div', 'health-bar', null, speed);
  el('div', 'armour-bar', null, speed);

  el('div', 'wheel', 'panel', hud);
  el('div', 'shopmenu', 'panel', hud);
  el('div', 'pause-ov', null, hud);
  g.hudEls = { hud, banner, disp, tc, tr, bl, br, mm };
  g.leoIdx = 0; g.leoT = 0; g.trackIdx = 0;
}

function stars(n) {
  let s = '';
  for (let i = 0; i < 5; i += 1) s += i < n ? '★' : '☆';
  return s;
}

function mmss(sec) {
  const s = Math.max(0, Math.ceil(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function updateHud(g) {
  const d = document;
  const q = (id) => d.getElementById(id);
  const def = MISSION_DEFS[g.mission.index] || MISSION_DEFS[0];
  // Banner (mission block, 3 lines).
  const title = g.hud.bannerT > 0 && g.hud.banner ? g.hud.banner : `MISSION ${g.mission.index + 1} · ${def.name.toUpperCase()}`;
  q('banner-title').textContent = title;
  q('banner-obj').textContent = g.objectiveText || def.steps[0].text;
  const stageTotal = def.steps.length;
  const stageNow = Math.min(g.mission.step + 1, stageTotal);
  q('banner-stage').textContent = `STAGE ${stageNow}/${stageTotal}`;
  q('banner-stage').style.setProperty('--fill', `${Math.round((g.mission.step / stageTotal) * 100)}%`);
  q('banner-timer').textContent = mmss(g.mission.timeLeft);
  q('banner-job').textContent = `JOB ${g.mission.index + 1}/16`;
  // Dispatch panel: 6 named units, distances from live cops when present.
  q('dispatch-head').textContent = 'KPD RESPONSE — 6 UNITS';
  for (let i = 0; i < 6; i += 1) {
    const u = DISPATCH_UNITS[i];
    const cop = g.cops.find((c) => c.name === u.name);
    const dist = cop ? `${Math.round(Math.hypot(cop.x - g.player.x, cop.z - g.player.z))}m` : 'STANDBY';
    q('dispatch-unit-' + i).textContent = `${u.name} ${u.role} — ${dist}`;
  }
  // Clock plate + IN SIGHT alert.
  const track = RADIO.tracks[g.trackIdx % RADIO.tracks.length];
  q('clockplate').textContent = `${clockLabel(g)} / ${g.weather.kind.toUpperCase()} / ${RADIO.station} — ${track}`;
  const alert = q('alert-insight');
  alert.style.display = g.heli.locked ? 'block' : 'none';
  alert.textContent = 'IN SIGHT — Air One has you in the light';
  // Cash + stars + rank panel.
  q('cashstars').textContent = `$${g.player.cash}   ${stars(g.player.wanted)}`;
  const { cur, next } = rankFor(g.player.rp);
  q('rank-line').textContent = `RANK ${cur.letter}  ${cur.title}`;
  q('rank-bar').textContent = next ? `${g.player.rp}/${next.rp} RP` : `${g.player.rp} RP — MAX`;
  const dist = g.city.districtAt(g.player.x, g.player.z);
  const st = g.player.districtStanding[dist.name] || 0;
  q('district-line').textContent = `${dist.name.toUpperCase()} · ${standingLabel(st)} ${st}`;
  q('respect-line').textContent = `${cur.title} ${g.player.respect}/250 RESPECT`;
  q('empire-line').textContent = `EMPIRE $${g.empire.totalEarned} EARNED`;
  // Crew cards.
  q('crew-head').textContent = 'CREW';
  for (let i = 0; i < 3; i += 1) {
    const c = CREW_DEFS[i];
    const hired = !!g.roster.hired[c.id];
    q('crew-card-' + i).querySelector('.crew-face').textContent = c.name[0];
    q('crew-card-' + i).querySelector('.crew-name').textContent = `${c.name} · ${c.role}`;
    q('crew-card-' + i).querySelector('.crew-ability').textContent = `${c.ability} [${c.key}]`;
    q('crew-card-' + i).querySelector('.crew-price').textContent = hired ? 'READY' : `$${c.price.toLocaleString()}`;
  }
  // Weapons.
  q('weapons-head').textContent = 'WEAPONS — hold Q for wheel';
  for (let i = 0; i < 7; i += 1) {
    const slot = q('weapon-slot-' + i);
    slot.querySelector('.weapon-num').textContent = i + 1;
    slot.querySelector('.weapon-name').textContent = WEAPONS[i].name;
    slot.querySelector('.weapon-ammo').textContent = weaponAmmoText(g, i);
    slot.classList.toggle('active', g.player.weapon === i);
  }
  // LEO dialogue (rotates).
  g.leoT += 0.1;
  if (g.leoT > 8) { g.leoT = 0; g.leoIdx = (g.leoIdx + 1) % LEO_LINES.length; }
  q('leo').textContent = LEO_LINES[g.leoIdx];
  // Speed block.
  const car = g.car;
  const kmh = car ? Math.round(Math.abs(car.speed) * 3.6) : 0;
  q('speed-num').textContent = kmh;
  q('speed-car').textContent = car ? `${car.label}   ${Math.round((car.health / car.maxHealth) * 100)}% CONDITION` : 'ON FOOT';
  q('speed-cond').textContent = car ? (car.health > 70 ? 'PRISTINE' : car.health > 35 ? 'DAMAGED' : 'WRECKED') : '—';
  q('health-bar').textContent = `HEALTH ${Math.round(g.player.health)}`;
  q('armour-bar').textContent = `ARMOUR ${g.garage.armor === 0 ? 'None' : 'L' + g.garage.armor}`;
  // Minimap label.
  q('minimap-label').textContent = dist.name.toUpperCase();
  drawMinimap(g);
  // Wheel overlay.
  const wheel = q('wheel');
  if (g.wheel.open) {
    wheel.style.display = 'block';
    let html = '<div class="wheel-head">WEAPON WHEEL</div>';
    for (let i = 0; i < 7; i += 1) {
      html += `<div class="wheel-row${g.wheel.selected === i ? ' sel' : ''}">${i + 1} · ${WEAPONS[i].name} — ${weaponAmmoText(g, i)}</div>`;
    }
    wheel.innerHTML = html;
  } else wheel.style.display = 'none';
  // Shop menu overlay.
  const sm = q('shopmenu');
  if (g.shopOpen) {
    sm.style.display = 'block';
    sm.innerHTML = shopMenuHtml(g);
  } else sm.style.display = 'none';
  // Pause overlay.
  const pv = q('pause-ov');
  pv.style.display = g.paused ? 'block' : 'none';
  pv.textContent = g.paused ? 'PAUSED — game saved' : '';
}

function shopMenuHtml(g) {
  const o = g.shopOpen;
  const disc = crewDiscount(g);
  let h = `<div class="shop-head">${o.label || o.kind}</div>`;
  if (o.kind === 'garage') {
    const e = g.garage.engine, a = g.garage.armor;
    h += `<div>[1] Engine Tier ${e + 1} — $${e < 3 ? Math.round(GARAGE_PRICES.engine[e] * disc) : 'MAX'}</div>`;
    h += `<div>[2] Armour Tier ${a + 1} — $${a < 2 ? Math.round(GARAGE_PRICES.armor[a] * disc) : 'MAX'}</div>`;
    h += `<div>[3] Nitro +1 — $${GARAGE_PRICES.nitro}</div>`;
  } else if (o.kind === 'venture') {
    h += `<div>[1] Buy this business</div>`;
  } else if (o.kind === 'crew') {
    h += `<div>[1] Hire Milo — $900</div><div>[2] Hire Vera — $1,400</div><div>[3] Hire Tank — $1,800</div>`;
  } else if (o.kind === 'races') {
    h += `<div>[1] Beach Drag — $${RACE_DEFS.drag.fee} (win $${RACE_DEFS.drag.prize})</div>`;
    h += `<div>[2] Marina Sprint — $${RACE_DEFS.sprint.fee} (win $${RACE_DEFS.sprint.prize})</div>`;
    h += `<div>[3] Strip Circuit — $${RACE_DEFS.circuit.fee} (win $${RACE_DEFS.circuit.prize})</div>`;
  } else if (o.kind === 'gun') {
    h += `<div>[1] Pistol — $300</div><div>[2] SMG — $800</div><div>[3] Shotgun — $1,200</div><div>[4] Rifle — $2,000</div><div>[5] RPG — $5,000</div>`;
  }
  h += `<div class="shop-foot">E — close</div>`;
  return h;
}

function drawMinimap(g) {
  const cv = document.getElementById('minimap');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const S = 190, W = 440;
  const to = (x, z) => [((x + 220) / W) * S, ((z + 220) / W) * S];
  ctx.fillStyle = '#0a0f1a';
  ctx.fillRect(0, 0, S, S);
  // Water + sand (east).
  const [wx] = to(195, 0);
  ctx.fillStyle = '#1d5f7a';
  ctx.fillRect(wx, 0, S - wx, S);
  const [sx] = to(165, 0);
  ctx.fillStyle = '#c9b183';
  ctx.fillRect(sx, 0, wx - sx, S);
  // Blocks.
  ctx.fillStyle = '#1c2436';
  for (let bx = -187; bx <= 187; bx += 75) {
    for (let bz = -187; bz <= 187; bz += 75) {
      const [x, y] = to(bx - 25, bz - 25);
      ctx.fillRect(x, y, 50 / W * S, 50 / W * S);
    }
  }
  // Roads.
  ctx.strokeStyle = '#5a6a86';
  ctx.lineWidth = 3;
  for (const r of g.city.roadsX) {
    const [x] = to(r, 0);
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, S); ctx.stroke();
  }
  for (const r of g.city.roadsZ) {
    const [, y] = to(0, r);
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(S, y); ctx.stroke();
  }
  // Hidden packages.
  ctx.fillStyle = '#4caf50';
  for (const s of g.packages.spots) {
    if (s.got) continue;
    const [x, y] = to(s.x, s.z);
    ctx.fillRect(x - 2, y - 2, 4, 4);
  }
  // Mission target.
  const def = MISSION_DEFS[g.mission.index];
  if (def) {
    const step = def.steps[Math.min(g.mission.step, def.steps.length - 1)];
    const sp = g.city.spots[step.spot] || (step.spot === 'beach' ? { x: 175, z: 60 } : null);
    if (sp) {
      const [x, y] = to(sp.x, sp.z);
      ctx.fillStyle = '#f2b705';
      ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 6, y); ctx.lineTo(x, y + 6); ctx.lineTo(x - 6, y); ctx.closePath(); ctx.fill();
    }
  }
  // Cops.
  ctx.fillStyle = '#ff5252';
  for (const c of g.cops) {
    const [x, y] = to(c.x, c.z);
    ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
  }
  // Heli.
  if (g.heli.active) {
    const [x, y] = to(g.heli.x, g.heli.z);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
  }
  // Player arrow.
  const [px, py] = to(g.player.x, g.player.z);
  ctx.fillStyle = '#ffffff';
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(-g.player.heading);
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(4, 5); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
  ctx.restore();
  // North marker.
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText('N', S - 14, 14);
}
