// The HUD: cash, health, wanted stars, mission objective, speed, weapon and
// the minimap, all drawn on the canvas so the screenshots show the game
// exactly as the player sees it.
import { VIEW, PALETTE, FONT, FONT_DISPLAY, WORLD, CITY, RESPECT_RANKS, WEAPONS, WEAPON_ORDER, GARAGE, RACES } from './config.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
}

/** The respect rank for a point total (RESPECT_RANKS is sorted by `at`). */
function respectRank(respect) {
  let rank = RESPECT_RANKS[0];
  for (const r of RESPECT_RANKS) if (respect >= r.at) rank = r;
  return rank;
}

function star(ctx, x, y, size, filled) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? size : size * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = filled ? PALETTE.star : 'rgba(255,255,255,0.18)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.5)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

/** "MM:SS" from a second count. */
function clockText(seconds) {
  const t = Math.ceil(seconds);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Top of the screen
// ---------------------------------------------------------------------------

/** Top-left: cash + health. Wide enough that the name never spills past
 * the panel edge (v1 clipped "LEO MARIN" at 250px). */
function drawCashHealth(ctx, player) {
  panel(ctx, 16, 14, 300, 64);
  ctx.fillStyle = '#7dff8a';
  ctx.font = `700 26px ${FONT_DISPLAY}`;
  ctx.textAlign = 'left';
  ctx.fillText(`$${player.cash.toLocaleString('en-US')}`, 30, 46);
  ctx.fillStyle = '#222';
  ctx.fillRect(30, 54, 180, 10);
  const hp = Math.max(0, player.health) / 100;
  ctx.fillStyle = hp > 0.5 ? '#57d977' : hp > 0.25 ? '#ffb347' : '#ff5a4e';
  ctx.fillRect(30, 54, 180 * hp, 10);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `600 12px ${FONT}`;
  ctx.fillText('LEO MARIN', 218, 46);
  ctx.fillText('HEALTH', 218, 66);
}

/** Respect: rank, progress to the next rank, and the current district. */
function drawRespect(ctx, game) {
  const rank = respectRank(game.respect || 0);
  const nextRank = RESPECT_RANKS[RESPECT_RANKS.indexOf(rank) + 1];
  panel(ctx, 16, 86, 300, 46);
  ctx.fillStyle = '#ffd94a';
  ctx.font = `700 14px ${FONT_DISPLAY}`;
  ctx.fillText(`RESPECT — ${rank.name.toUpperCase()}`, 30, 106);
  ctx.fillStyle = '#222';
  ctx.fillRect(30, 112, 180, 8);
  const frac = nextRank ? (game.respect - rank.at) / (nextRank.at - rank.at) : 1;
  ctx.fillStyle = '#ffd94a';
  ctx.fillRect(30, 112, 180 * Math.min(1, Math.max(0, frac)), 8);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `600 11px ${FONT}`;
  const districtKey = game.district ? game.district.key : 'central';
  const standing = game.respectByDistrict ? (game.respectByDistrict[districtKey] || 0) : 0;
  ctx.fillText(`${game.district ? game.district.name : 'Central Solmar'}  •  ${standing} pts`, 218, 106);
  ctx.fillText(nextRank ? `Next: ${nextRank.name} (${game.respect}/${nextRank.at})` : 'Top of the city', 218, 120);
}

/** Top-right: wanted stars, with an Air One warning while the heli is up. */
function drawWanted(ctx, game) {
  const { player } = game;
  panel(ctx, VIEW.width - 236, 14, 220, game.heli ? 72 : 44);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 13px ${FONT}`;
  ctx.fillText('WANTED', VIEW.width - 222, 42);
  for (let i = 0; i < 5; i += 1) {
    star(ctx, VIEW.width - 148 + i * 26, 36, 11, i < player.wanted);
  }
  if (game.heli) {
    ctx.fillStyle = '#ff5a4e';
    ctx.font = `700 14px ${FONT_DISPLAY}`;
    ctx.fillText('AIR ONE OVERHEAD', VIEW.width - 222, 68);
  }
}

/** Top-centre: current objective. */
function drawObjective(ctx, game) {
  const objective = game.objectiveText;
  if (!objective) return;
  ctx.font = `600 15px ${FONT}`;
  const w = ctx.measureText(objective).width + 36;
  panel(ctx, (VIEW.width - w) / 2, 14, w, 34);
  ctx.fillStyle = PALETTE.mission;
  ctx.textAlign = 'center';
  ctx.fillText(objective, VIEW.width / 2, 37);
  ctx.textAlign = 'left';
}

/** Mission timer and street race timer, under the objective. */
function drawTimers(ctx, game) {
  const { mission } = game;
  if (mission.active && mission.timer > 0) {
    const t = Math.ceil(mission.timer);
    ctx.font = `700 20px ${FONT_DISPLAY}`;
    ctx.fillStyle = t <= 30 ? '#ff5a4e' : PALETTE.text;
    ctx.textAlign = 'center';
    ctx.fillText(clockText(mission.timer), VIEW.width / 2, 74);
    ctx.textAlign = 'left';
  }
  if (game.race && game.race.active) {
    const t = Math.ceil(game.race.timer);
    ctx.font = `700 20px ${FONT_DISPLAY}`;
    ctx.fillStyle = t <= 30 ? '#ff5a4e' : '#ffd94a';
    ctx.textAlign = 'center';
    ctx.fillText(`RACE ${clockText(game.race.timer)}  •  ${game.race.checkpoint + 1}/${RACES.checkpoints.length}`, VIEW.width / 2, 74);
    ctx.textAlign = 'left';
  }
}

// ---------------------------------------------------------------------------
// Bottom of the screen
// ---------------------------------------------------------------------------

/** Bottom-left: crew, then weapon slots 1-4 with ammo. */
function drawWeapons(ctx, game) {
  const { player } = game;
  if (game.crew && game.crew.length > 0) {
    panel(ctx, 16, VIEW.height - 106, 360, 34);
    ctx.fillStyle = '#7dff8a';
    ctx.font = `700 13px ${FONT_DISPLAY}`;
    ctx.fillText(`CREW  ${game.crew.map((m) => m.name.toUpperCase()).join('  •  ')}`, 30, VIEW.height - 83);
  }
  panel(ctx, 16, VIEW.height - 58, 360, 42);
  ctx.font = `700 13px ${FONT_DISPLAY}`;
  let wx = 30;
  for (let i = 0; i < WEAPON_ORDER.length; i += 1) {
    const name = WEAPON_ORDER[i];
    const owned = game.weaponsOwned.includes(name);
    const current = player.weapon === name;
    const label = name === 'fists' ? 'FISTS' : `${WEAPONS[name].name.toUpperCase()} ${player.ammo[name] || 0}`;
    ctx.fillStyle = current ? '#ffd94a' : owned ? PALETTE.text : 'rgba(255,255,255,0.35)';
    ctx.fillText(`${i + 1}:${label}`, wx, VIEW.height - 30);
    wx += ctx.measureText(`${i + 1}:${label}`).width + 14;
  }
}

/** Bottom-centre: the radio station, so the audio has a face. */
function drawRadio(ctx, game) {
  const stationName = game.audio && game.audio.stationName ? game.audio.stationName() : 'SOL FM';
  ctx.font = `700 13px ${FONT_DISPLAY}`;
  const rw = ctx.measureText(`♪ ${stationName}`).width + 36;
  panel(ctx, (VIEW.width - rw) / 2, VIEW.height - 58, rw, 42);
  ctx.fillStyle = '#ffd94a';
  ctx.textAlign = 'center';
  ctx.fillText(`♪ ${stationName}`, VIEW.width / 2, VIEW.height - 30);
  ctx.textAlign = 'left';
}

/** Bottom-right: speed always (0 on foot) + clock, so every screenshot
 * reads the same way. */
function drawSpeedClock(ctx, game) {
  const { player, clock } = game;
  const hours = Math.floor(clock / 60) % 24;
  const minutes = Math.floor(clock % 60);
  const timeText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  panel(ctx, VIEW.width - 206, VIEW.height - 58, 190, 42);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 16px ${FONT_DISPLAY}`;
  ctx.textAlign = 'right';
  const kmh = !player.onFoot && player.car ? Math.round(Math.abs(player.car.speed) * 0.36) : 0;
  ctx.fillText(`${kmh} km/h   ${timeText}`, VIEW.width - 30, VIEW.height - 30);
  ctx.textAlign = 'left';
}

/** Toast message centre-screen. */
function drawToast(ctx, game) {
  if (!game.toast || game.toastTime <= 0) return;
  ctx.font = `700 24px ${FONT_DISPLAY}`;
  const w = ctx.measureText(game.toast).width + 44;
  panel(ctx, (VIEW.width - w) / 2, 96, w, 44);
  ctx.fillStyle = game.toastColor || PALETTE.text;
  ctx.textAlign = 'center';
  ctx.fillText(game.toast, VIEW.width / 2, 126);
  ctx.textAlign = 'left';
}

/** Garage menu: pick an upgrade with 1-3, close with E. */
function drawGarage(ctx, game) {
  if (!game.garageOpen) return;
  const { player } = game;
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  panel(ctx, VIEW.width / 2 - 260, VIEW.height / 2 - 140, 520, 280);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 26px ${FONT_DISPLAY}`;
  ctx.textAlign = 'center';
  ctx.fillText('SOLMAR AUTO GARAGE', VIEW.width / 2, VIEW.height / 2 - 100);
  ctx.font = `600 15px ${FONT}`;
  ctx.fillText(`Cash $${player.cash.toLocaleString('en-US')} — press 1 / 2 / 3, E to leave`, VIEW.width / 2, VIEW.height / 2 - 72);
  const rows = [
    { key: 'engine', label: 'Engine', level: game.upgrades.engine, list: GARAGE.engine },
    { key: 'armor', label: 'Armor', level: game.upgrades.armor, list: GARAGE.armor },
    { key: 'paint', label: 'Paint', level: game.upgrades.paint, list: GARAGE.paints },
  ];
  ctx.textAlign = 'left';
  rows.forEach((row, i) => {
    const y = VIEW.height / 2 - 40 + i * 44;
    const next = row.key === 'paint'
      ? `Next: ${GARAGE.paints[(row.level + 1) % GARAGE.paints.length]} — $200`
      : row.level >= row.list.length - 1
        ? 'MAXED OUT'
        : `Next: ${row.list[row.level + 1].name} — $${row.list[row.level + 1].cost}`;
    ctx.fillStyle = '#ffd94a';
    ctx.font = `700 17px ${FONT_DISPLAY}`;
    ctx.fillText(`${i + 1}. ${row.label}`, VIEW.width / 2 - 240, y);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 14px ${FONT}`;
    ctx.fillText(row.key === 'paint' ? `Current: ${GARAGE.paints[row.level]}` : `Level ${row.level} — ${next}`, VIEW.width / 2 - 120, y);
  });
  ctx.textAlign = 'left';
}

// ---------------------------------------------------------------------------

export function drawHud(ctx, game) {
  const { player } = game;
  ctx.textBaseline = 'alphabetic';
  drawCashHealth(ctx, player);
  drawRespect(ctx, game);
  drawWanted(ctx, game);
  drawObjective(ctx, game);
  drawTimers(ctx, game);
  drawWeapons(ctx, game);
  drawRadio(ctx, game);
  drawSpeedClock(ctx, game);
  drawToast(ctx, game);
  drawGarage(ctx, game);
  drawMinimap(ctx, game);
}

/** The minimap: the whole city shrunk, with the player, police, mission and shops. */
export function drawMinimap(ctx, game) {
  const { player, city, mission } = game;
  const size = 168;
  const x0 = VIEW.width - size - 16;
  const y0 = 74;
  const scale = size / WORLD.width;
  const h = WORLD.height * scale;
  ctx.fillStyle = 'rgba(12, 20, 28, 0.78)';
  ctx.beginPath();
  ctx.roundRect(x0 - 6, y0 - 6, size + 12, h + 12, 10);
  ctx.fill();
  // Sea + sand + blocks.
  ctx.fillStyle = '#1d7fa8';
  ctx.fillRect(x0, y0, size, h);
  ctx.fillStyle = '#e6cf9a';
  ctx.fillRect(x0, y0 + (CITY.beachY * scale), size, h - CITY.beachY * scale);
  ctx.fillStyle = '#55504a';
  ctx.fillRect(x0, y0, size, CITY.beachY * scale);
  // Roads.
  ctx.fillStyle = '#8a8578';
  for (let x = 150; x <= WORLD.width; x += 400) ctx.fillRect(x0 + x * scale - 2, y0, 4, CITY.beachY * scale);
  for (let y = 150; y <= 2150; y += 400) ctx.fillRect(x0, y0 + y * scale - 2, size, 4);
  // Park.
  ctx.fillStyle = '#5f9e52';
  ctx.fillRect(x0 + 1750 * scale, y0 + 950 * scale, 300 * scale, 300 * scale);
  // Places.
  const dot = (place, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x0 + place.x * scale, y0 + place.y * scale, r, 0, Math.PI * 2);
    ctx.fill();
  };
  dot(city.places.spray, '#2fa36b', 4);
  dot(city.places.gunshop, '#c9c9c9', 4);
  dot(city.places.clinic, '#ffffff', 4);
  dot(city.places.race, '#ffd94a', 4);
  // Mission marker, pulsing.
  const step = mission.active && game.missionTarget ? game.missionTarget : null;
  if (step) {
    const pulse = 5 + Math.sin(game.time * 5) * 2;
    ctx.strokeStyle = PALETTE.mission;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x0 + step.x * scale, y0 + step.y * scale, pulse, 0, Math.PI * 2);
    ctx.stroke();
    dot(step, PALETTE.mission, 4);
  }
  // Police as red dots, crew as green dots, Air One as a yellow dot.
  ctx.fillStyle = '#ff5a4e';
  for (const cop of game.policeCars) {
    ctx.beginPath();
    ctx.arc(x0 + cop.x * scale, y0 + cop.y * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const cop of game.cops) {
    ctx.beginPath();
    ctx.arc(x0 + cop.x * scale, y0 + cop.y * scale, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#7dff8a';
  for (const member of game.crew || []) {
    ctx.beginPath();
    ctx.arc(x0 + member.x * scale, y0 + member.y * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (game.heli) {
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath();
    ctx.arc(x0 + game.heli.x * scale, y0 + game.heli.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Remaining race checkpoints as white dots.
  if (game.race && game.race.active) {
    for (let i = game.race.checkpoint; i < RACES.checkpoints.length; i += 1) {
      dot(city.places[RACES.checkpoints[i]], '#ffffff', 3);
    }
  }
  ctx.save();
  ctx.translate(x0 + player.x * scale, y0 + player.y * scale);
  ctx.rotate(player.angle + Math.PI / 2);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(0, -7);
  ctx.lineTo(5, 6);
  ctx.lineTo(-5, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
