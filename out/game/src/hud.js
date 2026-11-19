// The HUD: cash, health, wanted stars, mission objective, speed, weapon and
// the minimap, all drawn on the canvas so the screenshots show the game
// exactly as the player sees it.
import { VIEW, PALETTE, FONT, FONT_DISPLAY, WORLD, CITY } from './config.js';

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.hudPanel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
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

export function drawHud(ctx, game) {
  const { player, mission, clock } = game;
  ctx.textBaseline = 'alphabetic';

  // Top-left: cash + health.
  panel(ctx, 16, 14, 250, 64);
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

  // Top-right: wanted stars.
  panel(ctx, VIEW.width - 236, 14, 220, 44);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 13px ${FONT}`;
  ctx.fillText('WANTED', VIEW.width - 222, 42);
  for (let i = 0; i < 5; i += 1) {
    star(ctx, VIEW.width - 148 + i * 26, 36, 11, i < player.wanted);
  }

  // Top-centre: current objective.
  const objective = game.objectiveText;
  if (objective) {
    ctx.font = `600 15px ${FONT}`;
    const w = ctx.measureText(objective).width + 36;
    panel(ctx, (VIEW.width - w) / 2, 14, w, 34);
    ctx.fillStyle = PALETTE.mission;
    ctx.textAlign = 'center';
    ctx.fillText(objective, VIEW.width / 2, 37);
    ctx.textAlign = 'left';
  }

  // Mission timer, under the objective.
  if (mission.active && mission.timer > 0) {
    const t = Math.ceil(mission.timer);
    ctx.font = `700 20px ${FONT_DISPLAY}`;
    ctx.fillStyle = t <= 30 ? '#ff5a4e' : PALETTE.text;
    ctx.textAlign = 'center';
    ctx.fillText(`${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, VIEW.width / 2, 74);
    ctx.textAlign = 'left';
  }

  // Bottom-left: weapon + ammo, or fists.
  panel(ctx, 16, VIEW.height - 58, 170, 42);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 16px ${FONT_DISPLAY}`;
  if (player.weapon === 'pistol') {
    ctx.fillText(`PISTOL  ${player.ammo}`, 30, VIEW.height - 30);
  } else {
    ctx.fillText('FISTS  (Q: pistol)', 30, VIEW.height - 30);
  }

  // Bottom-right: speed when driving, clock always.
  const hours = Math.floor(clock / 60) % 24;
  const minutes = Math.floor(clock % 60);
  const timeText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  panel(ctx, VIEW.width - 206, VIEW.height - 58, 190, 42);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 16px ${FONT_DISPLAY}`;
  ctx.textAlign = 'right';
  if (!player.onFoot && player.car) {
    const kmh = Math.round(Math.abs(player.car.speed) * 0.36);
    ctx.fillText(`${kmh} km/h   ${timeText}`, VIEW.width - 30, VIEW.height - 30);
  } else {
    ctx.fillText(`${timeText}  SOLMAR`, VIEW.width - 30, VIEW.height - 30);
  }
  ctx.textAlign = 'left';

  // Toast message centre-screen.
  if (game.toast && game.toastTime > 0) {
    ctx.font = `700 24px ${FONT_DISPLAY}`;
    const w = ctx.measureText(game.toast).width + 44;
    panel(ctx, (VIEW.width - w) / 2, 96, w, 44);
    ctx.fillStyle = game.toastColor || PALETTE.text;
    ctx.textAlign = 'center';
    ctx.fillText(game.toast, VIEW.width / 2, 126);
    ctx.textAlign = 'left';
  }

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
  // Police as red dots, player as a white arrow.
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
