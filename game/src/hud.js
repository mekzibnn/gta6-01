// The 2D HUD for Solmar Heat, drawn on a canvas stacked over the WebGL
// view. Every label sits on a dark plate so road lines never cross the
// text. The mission banner lives at the bottom centre, so the sun disc
// hangs in a full circle above it, never behind it.

import { MISSIONS, missionObjective } from './missions.js';
import { CREW } from './crew.js';
import { clockLabel, timeOfDayLabel } from './daynight.js';
import { weatherLabel } from './weather.js';
import { menuItems } from './shops.js';

const W = 1280;
const H = 720;
const WEAPON_NAMES = ['Fists', 'Pistol', 'SMG', 'Shotgun'];

export function setupHUD(game, canvas) {
  canvas.width = W;
  canvas.height = H;
  game.hudCtx = canvas.getContext('2d');
}

function plate(ctx, x, y, w, h, alpha) {
  ctx.fillStyle = `rgba(8, 10, 16, ${alpha === undefined ? 0.72 : alpha})`;
  ctx.fillRect(x, y, w, h);
}

function text(ctx, str, x, y, size, color, weight) {
  ctx.font = `${weight || 'bold'} ${size}px Arial, sans-serif`;
  ctx.fillStyle = color || '#ffffff';
  ctx.fillText(str, x, y);
}

function wrapText(ctx, str, maxWidth) {
  const words = str.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function respectRank(respect) {
  if (respect >= 60) return 'Kingpin';
  if (respect >= 40) return 'Shot Caller';
  if (respect >= 25) return 'Hustler';
  if (respect >= 10) return 'Street Name';
  return 'Nobody';
}

function missionTarget(game) {
  const spots = game.city.spots;
  const m = game.mission;
  const table = {
    0: ['garage'],
    1: ['hideout', 'hideout'],
    2: ['pier', 'fence'],
    3: ['taxiStand', 'hotel'],
    4: ['chopShop'],
    5: ['dragStrip'],
    6: ['docks'],
    7: [],
    8: ['pier', 'fence'],
    9: [],
    10: ['laundry', 'laundry'],
    11: ['dragStrip'],
  };
  const steps = table[m.index] || [];
  const key = steps[Math.min(m.step, steps.length - 1)];
  return key ? spots[key] : null;
}

export function drawHUD(game) {
  const ctx = game.hudCtx;
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = 'top';

  const player = game.player;
  const respect = game.stats.missionsDone * 10;

  // Top-left: cash and respect.
  plate(ctx, 16, 16, 240, 62, 0.72);
  text(ctx, '$' + player.cash.toLocaleString('en-US'), 28, 24, 30, '#7dff8a');
  text(ctx, 'RESPECT ' + respect + ' — ' + respectRank(respect), 28, 58, 14, '#ffd24a');

  // Top-right: the minimap, with the player, traffic, cops and the target.
  const mapX = W - 196;
  const mapY = 16;
  const mapS = 180;
  plate(ctx, mapX, mapY, mapS, mapS, 0.8);
  ctx.fillStyle = '#1a2a3a';
  ctx.fillRect(mapX + 4, mapY + 4, mapS - 8, mapS - 8);
  ctx.fillStyle = '#3a7a9a';
  ctx.fillRect(mapX + 4, mapY + 4, 18, mapS - 8);
  const toMap = (x, z) => [mapX + 4 + ((x + 208) / 416) * (mapS - 8), mapY + 4 + ((z + 208) / 416) * (mapS - 8)];
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  for (let i = -4; i <= 4; i += 1) {
    const [ax] = toMap(i * 52, 0);
    ctx.beginPath();
    ctx.moveTo(ax, mapY + 4);
    ctx.lineTo(ax, mapY + mapS - 4);
    ctx.stroke();
    const [, az] = toMap(0, i * 52);
    ctx.beginPath();
    ctx.moveTo(mapX + 4, az);
    ctx.lineTo(mapX + mapS - 4, az);
    ctx.stroke();
  }
  for (const car of game.cars) {
    if (car.exploded) continue;
    const [cx, cy] = toMap(car.x, car.z);
    ctx.fillStyle = '#5aa8ff';
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
  }
  for (const cop of game.cops) {
    const [cx, cy] = toMap(cop.x, cop.z);
    ctx.fillStyle = '#ff4a4a';
    ctx.fillRect(cx - 2, cy - 2, 4, 4);
  }
  const target = missionTarget(game);
  if (target) {
    const [tx, ty] = toMap(target.x, target.z);
    ctx.fillStyle = '#ffd24a';
    ctx.beginPath();
    ctx.moveTo(tx, ty - 6);
    ctx.lineTo(tx + 5, ty);
    ctx.lineTo(tx, ty + 6);
    ctx.lineTo(tx - 5, ty);
    ctx.closePath();
    ctx.fill();
  }
  const [px, py] = toMap(player.x, player.z);
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(px, py, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffd24a';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Wanted stars, clock and weather, under the minimap.
  let stars = '';
  for (let i = 0; i < 5; i += 1) stars += i < player.wanted ? '★' : '☆';
  plate(ctx, W - 296, 204, 280, 26, 0.72);
  text(ctx, stars, W - 288, 208, 18, '#ffd24a');
  plate(ctx, W - 296, 236, 280, 26, 0.72);
  text(ctx, clockLabel(game.clock) + ' · ' + timeOfDayLabel(game.clock) + ' · ' + weatherLabel(game.weather), W - 288, 240, 13, '#ffffff');

  // KPD RESPONSE: the dispatch list, wanted 1 and up.
  if (player.wanted >= 1 && game.cops.length > 0) {
    const rows = game.cops.slice(0, 6);
    const panelH = 34 + rows.length * 20;
    plate(ctx, W - 296, 270, 280, panelH, 0.78);
    text(ctx, 'KPD RESPONSE', W - 284, 276, 14, '#ff6a6a');
    rows.forEach((cop, i) => {
      const dist = Math.round(Math.hypot(cop.x - player.x, cop.z - player.z));
      const role = cop.kind === 'ram' ? 'RAM' : cop.kind === 'pit' ? 'PIT' : 'PATROL';
      text(ctx, 'SPD-' + cop.id + ' · ' + role + ' · ' + dist + 'm', W - 284, 298 + i * 20, 13, '#ffffff');
    });
  }

  // Empire widget, top-right under the dispatch panel.
  const empireY = player.wanted >= 1 && game.cops.length > 0 ? 270 + 34 + Math.min(6, game.cops.length) * 20 + 8 : 270;
  const ownedNames = Object.keys(game.empire.owned);
  if (ownedNames.length > 0) {
    plate(ctx, W - 296, empireY, 280, 30 + ownedNames.length * 18, 0.72);
    text(ctx, 'EMPIRE · $' + Math.round(game.empire.totalEarned) + ' earned', W - 284, empireY + 6, 13, '#7dff8a');
    ownedNames.forEach((id, i) => {
      const level = game.empire.owned[id].level;
      text(ctx, id.replace(/-/g, ' ') + ' · L' + level, W - 284, empireY + 26 + i * 18, 12, '#ffffff');
    });
  }

  // Bottom centre: the mission banner (3 lines) or the objective strip.
  const mission = game.mission;
  const bannerW = 640;
  const bannerX = (W - bannerW) / 2;
  if (game.hud.bannerT > 0 && game.hud.banner) {
    plate(ctx, bannerX, H - 180, bannerW, 96, 0.85);
    ctx.strokeStyle = '#ffd24a';
    ctx.lineWidth = 2;
    ctx.strokeRect(bannerX, H - 180, bannerW, 96);
    text(ctx, game.hud.banner, bannerX + 16, H - 172, 18, '#ffd24a');
    text(ctx, game.hud.bannerSub || '', bannerX + 16, H - 146, 14, '#ffffff');
    text(ctx, game.hud.bannerNext || '', bannerX + 16, H - 122, 13, '#9ad1ff');
  } else if (mission.index < 12) {
    plate(ctx, bannerX, H - 132, bannerW, 48, 0.72);
    ctx.strokeStyle = '#ffd24a';
    ctx.lineWidth = 1;
    ctx.strokeRect(bannerX, H - 132, bannerW, 48);
    text(ctx, 'OBJECTIVE: ' + missionObjective(game.mission), bannerX + 16, H - 124, 14, '#ffffff');
    const stepTotal = MISSIONS[mission.index] ? MISSIONS[mission.index].steps.length : 1;
    text(ctx, 'M' + (mission.index + 1) + ' · STAGE ' + (mission.step + 1) + '/' + stepTotal, bannerX + 16, H - 102, 12, '#ffd24a');
  }

  // LEO's dialogue box, above the banner while it is up.
  if (game.hud.bannerT > 0 && game.hud.dialog) {
    const d = game.hud.dialog;
    const dW = 560;
    const dX = (W - dW) / 2;
    plate(ctx, dX, H - 262, dW, 72, 0.85);
    ctx.fillStyle = '#ffd24a';
    ctx.fillRect(dX + 12, H - 250, 48, 48);
    ctx.fillStyle = '#141414';
    ctx.font = 'bold 22px Arial, sans-serif';
    ctx.fillText('LEO', dX + 16, H - 236);
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillStyle = '#ffd24a';
    ctx.fillText(d.name, dX + 72, H - 252);
    ctx.font = '13px Arial, sans-serif';
    ctx.fillStyle = '#ffffff';
    const lines = wrapText(ctx, d.text, dW - 96);
    lines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, dX + 72, H - 230 + i * 17);
    });
  }

  // Bottom-left: the radio, the district widget, the crew cards.
  plate(ctx, 16, H - 226, 260, 26, 0.72);
  text(ctx, 'SOL FM 98.4 — Solmar Nights', 28, H - 220, 13, '#ff9ad1');
  const district = game.city.districtAt(player.x, player.z);
  const standing = player.districtStanding[district.name] || 0;
  plate(ctx, 16, H - 194, 260, 26, 0.72);
  text(ctx, district.name.toUpperCase() + ' · Standing ' + standing, 28, H - 188, 13, '#ffffff');
  const hired = Object.keys(game.roster.hired);
  if (hired.length > 0) {
    hired.forEach((id, i) => {
      const mate = CREW.find((c) => c.id === id);
      if (!mate) return;
      const cx = 16 + i * 132;
      plate(ctx, cx, H - 160, 124, 44, 0.72);
      ctx.strokeStyle = '#ffd24a';
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, H - 160, 124, 44);
      text(ctx, mate.name.charAt(0) + ' · ' + mate.name, cx + 8, H - 154, 13, '#ffd24a');
      text(ctx, mate.effect, cx + 8, H - 134, 11, '#ffffff');
    });
  }

  // Bottom-left: HEALTH and ARMOUR, only while driving.
  if (player.inCar && game.car) {
    const healthFrac = Math.max(0, player.health / 100);
    plate(ctx, 16, H - 108, 220, 18, 0.72);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(88, H - 104, 140, 10);
    ctx.fillStyle = healthFrac > 0.5 ? '#7dff8a' : healthFrac > 0.25 ? '#ffd24a' : '#ff4a4a';
    ctx.fillRect(88, H - 104, 140 * healthFrac, 10);
    text(ctx, 'HEALTH', 24, H - 106, 12, '#ffffff');
    const armorFrac = game.garage.armor / 2;
    plate(ctx, 16, H - 84, 220, 18, 0.72);
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(88, H - 80, 140, 10);
    ctx.fillStyle = '#5aa8ff';
    ctx.fillRect(88, H - 80, 140 * armorFrac, 10);
    text(ctx, 'ARMOUR', 24, H - 82, 12, '#ffffff');
    const armorLabel = ['None', 'Light', 'Heavy'][game.garage.armor] || 'None';
    text(ctx, armorLabel, 232, H - 82, 12, '#5aa8ff');
  }

  // Bottom-right: the car, the speed, the weapon slots.
  if (player.inCar && game.car) {
    const condition = Math.round((game.car.health / game.car.maxHealth) * 100);
    plate(ctx, W - 316, H - 150, 300, 26, 0.72);
    text(ctx, game.car.name + ' · ' + condition + '%', W - 304, H - 144, 14, '#ffffff');
    plate(ctx, W - 316, H - 118, 300, 26, 0.72);
    text(ctx, 'SPEED ' + Math.round(Math.abs(game.car.speed) * 3.6) + ' km/h' + (game.garage.nitro > 0 ? ' · NITRO x' + game.garage.nitro : ''), W - 304, H - 112, 13, '#ffffff');
  }
  const slotW = 72;
  const slotX0 = W - 16 - slotW * 4 - 12;
  for (let i = 0; i < 4; i += 1) {
    const owned = player.weapons[i];
    const sx = slotX0 + i * (slotW + 4);
    plate(ctx, sx, H - 84, slotW, 68, 0.78);
    ctx.strokeStyle = player.weapon === i ? '#ffd24a' : '#444444';
    ctx.lineWidth = player.weapon === i ? 2 : 1;
    ctx.strokeRect(sx, H - 84, slotW, 68);
    text(ctx, (i + 1) + '', sx + 8, H - 78, 12, '#9ad1ff');
    text(ctx, WEAPON_NAMES[i], sx + 8, H - 58, 12, owned ? '#ffffff' : '#777777');
    text(ctx, owned ? 'READY' : 'LOCKED', sx + 8, H - 38, 11, owned ? '#7dff8a' : '#777777');
  }

  // Centre: the toast, the shop prompt, the open menu, the weapon wheel.
  if (game.hud.toast) {
    ctx.font = 'bold 16px Arial, sans-serif';
    const tw = ctx.measureText(game.hud.toast).width + 32;
    plate(ctx, (W - tw) / 2, H - 330, tw, 34, 0.8);
    text(ctx, game.hud.toast, (W - tw) / 2 + 16, H - 321, 16, '#ffffff');
  }
  if (game.shopOpen) {
    const items = menuItems(game, game.shopOpen.kind);
    const title = game.shopOpen.kind === 'garage' ? 'GARAGE — Solmar Customs'
      : game.shopOpen.kind === 'venture' ? 'EMPIRE — Buy a Business'
        : game.shopOpen.kind === 'crew' ? 'CREW OFFICE — Hire a Mate'
          : game.shopOpen.kind === 'races' ? 'RACE OFFICE — Street Races'
            : 'GUN STORE — Solmar Arms';
    const menuH = 70 + items.length * 26;
    plate(ctx, (W - 460) / 2, H / 2 - menuH / 2 - 40, 460, menuH, 0.88);
    ctx.strokeStyle = '#ffd24a';
    ctx.lineWidth = 2;
    ctx.strokeRect((W - 460) / 2, H / 2 - menuH / 2 - 40, 460, menuH);
    text(ctx, title, (W - 460) / 2 + 18, H / 2 - menuH / 2 - 22, 17, '#ffd24a');
    items.forEach((item, i) => {
      text(ctx, item[0] + ' · ' + item[1] + ' — $' + item[2], (W - 460) / 2 + 18, H / 2 - menuH / 2 + 8 + i * 26, 14, '#ffffff');
    });
    text(ctx, 'Press 1-' + items.length + ' to buy · X to close', (W - 460) / 2 + 18, H / 2 - menuH / 2 + 8 + items.length * 26, 12, '#9ad1ff');
  } else if (game.shopNear) {
    const label = game.shopNear.label;
    const prompt = 'Press E — ' + label;
    ctx.font = 'bold 15px Arial, sans-serif';
    const pw = ctx.measureText(prompt).width + 28;
    plate(ctx, (W - pw) / 2, H - 300, pw, 32, 0.8);
    text(ctx, prompt, (W - pw) / 2 + 14, H - 291, 15, '#ffd24a');
  }
  if (game.wheel.open) {
    const names = ['Fists', 'Pistol', 'SMG', 'Shotgun'];
    const wheelW = 4 * 120 + 30;
    plate(ctx, (W - wheelW) / 2, H / 2 - 90, wheelW, 90, 0.85);
    ctx.strokeStyle = '#ffd24a';
    ctx.lineWidth = 2;
    ctx.strokeRect((W - wheelW) / 2, H / 2 - 90, wheelW, 90);
    text(ctx, 'WEAPON WHEEL — release Q to confirm', (W - wheelW) / 2 + 14, H / 2 - 80, 13, '#ffd24a');
    for (let i = 0; i < 4; i += 1) {
      const wx = (W - wheelW) / 2 + 15 + i * 120;
      ctx.fillStyle = game.wheel.selected === i ? 'rgba(255,210,74,0.35)' : 'rgba(255,255,255,0.08)';
      ctx.fillRect(wx, H / 2 - 56, 105, 52);
      ctx.strokeStyle = game.wheel.selected === i ? '#ffd24a' : '#555555';
      ctx.strokeRect(wx, H / 2 - 56, 105, 52);
      text(ctx, (i + 1) + ' ' + names[i], wx + 10, H / 2 - 46, 14, player.weapons[i] ? '#ffffff' : '#777777');
      text(ctx, player.weapons[i] ? 'READY' : 'LOCKED', wx + 10, H / 2 - 24, 11, player.weapons[i] ? '#7dff8a' : '#777777');
    }
  }

  // Pause: a dark sheet with the run so far.
  if (game.paused) {
    plate(ctx, 0, 0, W, H, 0.6);
    plate(ctx, (W - 420) / 2, H / 2 - 110, 420, 200, 0.9);
    ctx.strokeStyle = '#ffd24a';
    ctx.lineWidth = 2;
    ctx.strokeRect((W - 420) / 2, H / 2 - 110, 420, 200);
    text(ctx, 'PAUSED — SOLMAR HEAT', (W - 420) / 2 + 24, H / 2 - 88, 20, '#ffd24a');
    text(ctx, 'Cash $' + player.cash.toLocaleString('en-US') + ' · Missions done ' + game.stats.missionsDone, (W - 420) / 2 + 24, H / 2 - 52, 14, '#ffffff');
    text(ctx, 'Races won ' + game.stats.racesWon + ' · Distance ' + game.stats.distanceKm.toFixed(1) + ' km', (W - 420) / 2 + 24, H / 2 - 28, 14, '#ffffff');
    text(ctx, 'Businesses owned ' + Object.keys(game.empire.owned).length + ' · Crew ' + Object.keys(game.roster.hired).length, (W - 420) / 2 + 24, H / 2 - 4, 14, '#ffffff');
    text(ctx, 'Progress saved. Press P to resume.', (W - 420) / 2 + 24, H / 2 + 28, 14, '#9ad1ff');
  }
}
