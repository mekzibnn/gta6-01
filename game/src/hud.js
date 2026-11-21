// The HUD, v3: a widget registry. Every piece of the interface — cash,
// respect, wanted stars, the objective banner, timers, weapons, radio,
// speed, the day/night chip, the upgrades strip, toasts, the garage menu
// and the minimap — is a widget: a small object with a `paint` method
// that draws itself when it applies. drawHud walks the registry in order,
// so adding a readout means adding one entry, not touching a long
// function. The banner geometry the cover screenshot depends on (top
// centre, 34px tall) is pinned in the objective widget and never moves.
import { VIEW, PALETTE, FONT, FONT_DISPLAY, WORLD, CITY, RESPECT_RANKS, WEAPONS, WEAPON_ORDER, RACES } from './config.js';
import { shopRows, upgradeSummary, sellValue } from './upgrades.js';
import { dayNightLine } from './daynight.js';
import { weatherLine } from './weather.js';
import { empireHourlyTake } from './empire.js';
import { crewHiredNames } from './crew.js';
import { raceById } from './races.js';

/** A translucent rounded panel, the HUD's one shared surface. */
function drawPanel(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill || PALETTE.hudPanel;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, 10);
  ctx.fill();
}

/** A five-pointed star for the wanted level. */
function paintStar(ctx, x, y, size, filled) {
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

/** The respect rank a point total has earned (RESPECT_RANKS is sorted). */
function rankFor(respect) {
  let rank = RESPECT_RANKS[0];
  for (const r of RESPECT_RANKS) if (respect >= r.at) rank = r;
  return rank;
}

/** "M:SS" from a second count, for mission and race timers. */
function fmtDuration(seconds) {
  const t = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

/** Cash with a thousands separator, as the HUD prints it. */
function money(n) {
  return `$${Math.floor(n).toLocaleString('en-US')}`;
}

// ---------------------------------------------------------------------------
// Widgets
// ---------------------------------------------------------------------------

const cashWidget = {
  id: 'cash',
  paint(ctx, game) {
    const { player } = game;
    drawPanel(ctx, 16, 14, 300, 64);
    ctx.fillStyle = '#7dff8a';
    ctx.font = `700 26px ${FONT_DISPLAY}`;
    ctx.textAlign = 'left';
    ctx.fillText(money(player.cash), 30, 46);
    ctx.fillStyle = '#222';
    ctx.fillRect(30, 54, 180, 10);
    const hp = Math.max(0, player.health) / 100;
    ctx.fillStyle = hp > 0.5 ? '#57d977' : hp > 0.25 ? '#ffb347' : '#ff5a4e';
    ctx.fillRect(30, 54, 180 * hp, 10);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 12px ${FONT}`;
    ctx.fillText('LEO MARIN', 218, 46);
    ctx.fillText('HEALTH', 218, 66);
  },
};

const respectWidget = {
  id: 'respect',
  paint(ctx, game) {
    const rank = rankFor(game.respect || 0);
    const nextRank = RESPECT_RANKS[RESPECT_RANKS.indexOf(rank) + 1];
    drawPanel(ctx, 16, 86, 300, 46);
    ctx.fillStyle = '#ffd94a';
    ctx.font = `700 14px ${FONT_DISPLAY}`;
    ctx.textAlign = 'left';
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
  },
};

const wantedWidget = {
  id: 'wanted',
  paint(ctx, game) {
    const { player } = game;
    drawPanel(ctx, VIEW.width - 236, 14, 220, game.heli ? 72 : 44);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 13px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText('WANTED', VIEW.width - 222, 42);
    for (let i = 0; i < 5; i += 1) {
      paintStar(ctx, VIEW.width - 148 + i * 26, 36, 11, i < player.wanted);
    }
    if (game.heli) {
      ctx.fillStyle = '#ff5a4e';
      ctx.font = `700 14px ${FONT_DISPLAY}`;
      ctx.fillText('AIR ONE OVERHEAD', VIEW.width - 222, 68);
    }
  },
};

const objectiveWidget = {
  id: 'objective',
  paint(ctx, game) {
    const objective = game.objectiveText;
    if (!objective) return;
    ctx.font = `600 15px ${FONT}`;
    const w = ctx.measureText(objective).width + 36;
    drawPanel(ctx, (VIEW.width - w) / 2, 14, w, 34);
    ctx.fillStyle = PALETTE.mission;
    ctx.textAlign = 'center';
    ctx.fillText(objective, VIEW.width / 2, 37);
    ctx.textAlign = 'left';
  },
};

const timersWidget = {
  id: 'timers',
  paint(ctx, game) {
    const { mission } = game;
    ctx.textAlign = 'center';
    ctx.font = `700 20px ${FONT_DISPLAY}`;
    if (mission.active && mission.timer > 0) {
      const t = Math.ceil(mission.timer);
      ctx.fillStyle = t <= 30 ? '#ff5a4e' : PALETTE.text;
      ctx.fillText(fmtDuration(mission.timer), VIEW.width / 2, 74);
    }
    if (game.race && game.race.active) {
      const t = Math.ceil(game.race.timer);
      ctx.fillStyle = t <= 30 ? '#ff5a4e' : '#ffd94a';
      ctx.fillText(`RACE ${fmtDuration(game.race.timer)}  •  ${game.race.checkpoint + 1}/${RACES.checkpoints.length}`, VIEW.width / 2, 74);
    }
    ctx.textAlign = 'left';
  },
};

const weaponsWidget = {
  id: 'weapons',
  paint(ctx, game) {
    const { player } = game;
    drawPanel(ctx, 16, VIEW.height - 58, 360, 42);
    ctx.font = `700 13px ${FONT_DISPLAY}`;
    ctx.textAlign = 'left';
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
  },
};

const crewWidget = {
  id: 'crew',
  visible(game) { return !!(game.crew && game.crew.length > 0); },
  paint(ctx, game) {
    drawPanel(ctx, 16, VIEW.height - 148, 360, 34);
    ctx.fillStyle = '#7dff8a';
    ctx.font = `700 13px ${FONT_DISPLAY}`;
    ctx.textAlign = 'left';
    ctx.fillText(`CREW  ${game.crew.map((m) => m.name.toUpperCase()).join('  •  ')}`, 30, VIEW.height - 125);
  },
};

const upgradesWidget = {
  id: 'upgrades',
  paint(ctx, game) {
    const summary = upgradeSummary(game.upgrades || { engine: 0, armor: 0, paint: 0, nitro: 0 });
    // The stack above the weapons bar: crew (when present) sits at -148,
    // upgrades at -106, weapons at -58.
    const y = VIEW.height - 106;
    drawPanel(ctx, 16, y, 360, 34);
    ctx.fillStyle = '#ffd94a';
    ctx.font = `700 13px ${FONT_DISPLAY}`;
    ctx.textAlign = 'left';
    ctx.fillText(`GARAGE  ${summary.text}`, 30, y + 23);
  },
};

/** The v5 strip: businesses owned and their hourly take, the hired crew,
 * and the live street-series clock. It sits above the crew bar (-190) and
 * only shows once Leo owns, hires or races anything. */
const empireWidget = {
  id: 'empire',
  visible(game) {
    const hasBiz = game.empire && Object.keys(game.empire.owned || {}).length > 0;
    const hasCrew = game.roster && Object.keys(game.roster.hired || {}).length > 0;
    const racing = !!(game.streetRaces && game.streetRaces.running);
    return !!(hasBiz || hasCrew || racing);
  },
  paint(ctx, game) {
    const y = VIEW.height - 190;
    drawPanel(ctx, 16, y, 420, 34);
    ctx.fillStyle = '#7dff8a';
    ctx.font = `700 12px ${FONT_DISPLAY}`;
    ctx.textAlign = 'left';
    const parts = [];
    if (game.empire) {
      const count = Object.keys(game.empire.owned || {}).length;
      if (count > 0) {
        const hourly = empireHourlyTake(game.empire, Math.floor(game.clock / 60) % 24);
        parts.push(`EMPIRE ${count} · $${hourly}/hr`);
      }
    }
    if (game.roster) {
      const names = crewHiredNames(game.roster);
      if (names.length > 0) parts.push(`CREW ${names.join(' · ').toUpperCase()}`);
    }
    if (game.streetRaces && game.streetRaces.running) {
      const run = game.streetRaces.running;
      const card = raceById(run.raceId);
      const secs = Math.max(0, game.time - run.startedAt);
      parts.push(`${card.name.toUpperCase()} ${run.gate}/${card.gates} · ${secs.toFixed(1)}s`);
    }
    ctx.fillText(parts.join('   '), 30, y + 22);
  },
};

const radioWidget = {
  id: 'radio',
  paint(ctx, game) {
    const stationName = game.audio && game.audio.stationName ? game.audio.stationName() : 'SOL FM';
    ctx.font = `700 13px ${FONT_DISPLAY}`;
    const rw = ctx.measureText(`♪ ${stationName}`).width + 36;
    drawPanel(ctx, (VIEW.width - rw) / 2, VIEW.height - 58, rw, 42);
    ctx.fillStyle = '#ffd94a';
    ctx.textAlign = 'center';
    ctx.fillText(`♪ ${stationName}`, VIEW.width / 2, VIEW.height - 30);
    ctx.textAlign = 'left';
  },
};

const speedWidget = {
  id: 'speed',
  paint(ctx, game) {
    const { player, clock } = game;
    const hours = Math.floor(clock / 60) % 24;
    const minutes = Math.floor(clock % 60);
    const timeText = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
    drawPanel(ctx, VIEW.width - 206, VIEW.height - 58, 190, 42);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 16px ${FONT_DISPLAY}`;
    ctx.textAlign = 'right';
    const kmh = !player.onFoot && player.car ? Math.round(Math.abs(player.car.speed) * 0.36) : 0;
    ctx.fillText(`${kmh} km/h   ${timeText}`, VIEW.width - 30, VIEW.height - 30);
    ctx.textAlign = 'left';
  },
};

const dayNightWidget = {
  id: 'daynight',
  visible(game) { return !!game.daynight; },
  paint(ctx, game) {
    // The watch, the clock, and the sky when it is not clear.
    let line = dayNightLine(game.daynight);
    const sky = game.weather ? weatherLine(game.weather) : '';
    if (sky) line += ` · ${sky.toUpperCase()}`;
    ctx.font = `700 13px ${FONT_DISPLAY}`;
    const w = ctx.measureText(line).width + 58;
    const x = VIEW.width - w - 16;
    const y = VIEW.height - 106;
    drawPanel(ctx, x, y, w, 34);
    // Sun by day, moon after dark: a filled disc, or a disc with a bite.
    const night = game.daynight.nightFactor > 0.5;
    ctx.fillStyle = night ? '#dfe6ff' : '#ffd94a';
    ctx.beginPath();
    ctx.arc(x + 22, y + 17, 8, 0, Math.PI * 2);
    ctx.fill();
    if (night) {
      ctx.fillStyle = PALETTE.hudPanel;
      ctx.beginPath();
      ctx.arc(x + 26, y + 14, 7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = PALETTE.text;
    ctx.textAlign = 'left';
    ctx.fillText(line, x + 38, y + 22);
  },
};

const toastWidget = {
  id: 'toast',
  visible(game) { return !!(game.toast && game.toastTime > 0); },
  paint(ctx, game) {
    ctx.font = `700 24px ${FONT_DISPLAY}`;
    const w = ctx.measureText(game.toast).width + 44;
    drawPanel(ctx, (VIEW.width - w) / 2, 96, w, 44);
    ctx.fillStyle = game.toastColor || PALETTE.text;
    ctx.textAlign = 'center';
    ctx.fillText(game.toast, VIEW.width / 2, 126);
    ctx.textAlign = 'left';
  },
};

const garageWidget = {
  id: 'garage',
  visible(game) { return !!game.garageOpen; },
  paint(ctx, game) {
    const { player } = game;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    const panelW = 520;
    const panelH = 380;
    const px = VIEW.width / 2 - panelW / 2;
    const py = VIEW.height / 2 - panelH / 2;
    drawPanel(ctx, px, py, panelW, panelH);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `700 26px ${FONT_DISPLAY}`;
    ctx.textAlign = 'center';
    ctx.fillText('SOLMAR AUTO GARAGE', VIEW.width / 2, py + 40);
    ctx.font = `600 15px ${FONT}`;
    ctx.fillText(`Cash ${money(player.cash)} — press 1 / 2 / 3 / 4 / 5, E to leave`, VIEW.width / 2, py + 68);
    const rows = shopRows(game.upgrades);
    ctx.textAlign = 'left';
    rows.forEach((row, i) => {
      const y = py + 108 + i * 52;
      ctx.fillStyle = '#ffd94a';
      ctx.font = `700 17px ${FONT_DISPLAY}`;
      ctx.fillText(`${i + 1}. ${row.label}`, px + 20, y);
      ctx.fillStyle = PALETTE.text;
      ctx.font = `600 13px ${FONT}`;
      ctx.fillText(row.current, px + 140, y);
      ctx.fillStyle = row.affordable ? PALETTE.text : 'rgba(255,255,255,0.4)';
      ctx.font = `600 13px ${FONT}`;
      ctx.fillText(row.next, px + 140, y + 20);
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `400 12px ${FONT}`;
      ctx.fillText(row.blurb, px + 20, y + 20);
    });
    // Slot 5 is the chop shop: sell the car you drove in on.
    const sellY = py + 108 + 4 * 52;
    const sellPrice = game.player.car ? sellValue(game) : 0;
    ctx.fillStyle = '#ffd94a';
    ctx.font = `700 17px ${FONT_DISPLAY}`;
    ctx.textAlign = 'left';
    ctx.fillText('5. Sell this car', px + 20, sellY);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText(game.player.car ? `Chop shop pays $${sellPrice}` : 'No car to sell', px + 140, sellY);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 12px ${FONT}`;
    ctx.fillText('The car is gone, cash in hand — no questions asked', px + 20, sellY + 20);
    // Top-tier perks, earned with the best kit, ride at the foot of the menu.
    const perks = upgradeSummary(game.upgrades).perks;
    perks.forEach((perk, i) => {
      ctx.fillStyle = '#7dff8a';
      ctx.font = `600 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(`★ ${perk}`, VIEW.width / 2, py + 352 + i * 18);
    });
    ctx.textAlign = 'left';
  },
};

const minimapWidget = {
  id: 'minimap',
  paint(ctx, game) {
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
    ctx.fillStyle = '#1d7fa8';
    ctx.fillRect(x0, y0, size, h);
    ctx.fillStyle = '#e6cf9a';
    ctx.fillRect(x0, y0 + (CITY.beachY * scale), size, h - CITY.beachY * scale);
    ctx.fillStyle = '#55504a';
    ctx.fillRect(x0, y0, size, CITY.beachY * scale);
    ctx.fillStyle = '#8a8578';
    for (let x = 150; x <= WORLD.width; x += 400) ctx.fillRect(x0 + x * scale - 2, y0, 4, CITY.beachY * scale);
    for (let y = 150; y <= 2150; y += 400) ctx.fillRect(x0, y0 + y * scale - 2, size, 4);
    ctx.fillStyle = '#5f9e52';
    ctx.fillRect(x0 + 1750 * scale, y0 + 950 * scale, 300 * scale, 300 * scale);
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
    // v5 storefronts in green, the drag strip in orange.
    dot(city.places.taxioffice, '#7dff8a', 4);
    dot(city.places.laundry, '#7dff8a', 4);
    dot(city.places.club, '#7dff8a', 4);
    dot(city.places.wash, '#7dff8a', 4);
    dot(city.places.dragstrip, '#ff7a3d', 4);
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
    if (game.race && game.race.active) {
      for (let i = game.race.checkpoint; i < RACES.checkpoints.length; i += 1) {
        dot(city.places[RACES.checkpoints[i]], '#ffffff', 3);
      }
    }
    if (game.streetRaces && game.streetRaces.running) {
      const run = game.streetRaces.running;
      const card = raceById(run.raceId);
      for (let i = run.gate; i < card.gates; i += 1) {
        dot(city.places[`gate${i + 1}`], '#ffffff', 3);
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
  },
};

/** The registry, in paint order: top bar, then bottom bar, then overlays. */
const WIDGETS = [
  cashWidget, respectWidget, wantedWidget, objectiveWidget, timersWidget,
  crewWidget, upgradesWidget, empireWidget, weaponsWidget, radioWidget, speedWidget,
  dayNightWidget, toastWidget, garageWidget, minimapWidget,
];

/** Paint every widget that applies to this frame. */
export function drawHud(ctx, game) {
  ctx.textBaseline = 'alphabetic';
  for (const widget of WIDGETS) {
    if (widget.visible && !widget.visible(game)) continue;
    widget.paint(ctx, game);
  }
}
