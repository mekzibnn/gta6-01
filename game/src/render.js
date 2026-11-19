// The renderer: draws Solmar from above on one canvas — streets, buildings
// with shaded roofs, the beach and the sea, cars, people, headlights at
// night, skid marks, muzzle flashes and the menus. The camera follows the
// player and the logical 1280x720 view is scaled to the window.
import { VIEW, WORLD, CITY, PALETTE, FONT, FONT_DISPLAY, CAR } from './config.js';
import { groundAt } from './city.js';
import { drawHud } from './hud.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_WIN = 'win';

function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * f));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * f));
  const b = Math.min(255, Math.round((n & 255) * f));
  return `rgb(${r},${g},${b})`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let viewScale = 1;
  let viewX = 0;
  let viewY = 0;

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w;
    canvas.height = h;
    viewScale = Math.min(w / VIEW.width, h / VIEW.height);
    viewX = (w - VIEW.width * viewScale) / 2;
    viewY = (h - VIEW.height * viewScale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  function camera(game) {
    const focus = game.player;
    let cx = focus.x - VIEW.width / 2;
    let cy = focus.y - VIEW.height / 2;
    cx = Math.max(0, Math.min(WORLD.width - VIEW.width, cx));
    cy = Math.max(0, Math.min(WORLD.height - VIEW.height, cy));
    return { x: cx, y: cy };
  }

  /** Screen (CSS px) to world coordinates, for mouse aiming. */
  function screenToWorld(sx, sy, game) {
    const cam = camera(game);
    return {
      x: cam.x + (sx - viewX) / viewScale,
      y: cam.y + (sy - viewY) / viewScale,
    };
  }

  function drawGround(cam) {
    const x0 = Math.max(0, Math.floor(cam.x));
    const y0 = Math.max(0, Math.floor(cam.y));
    const x1 = Math.min(WORLD.width, cam.x + VIEW.width);
    const y1 = Math.min(WORLD.height, cam.y + VIEW.height);
    // Base: dry grass blocks.
    ctx.fillStyle = '#7d9b58';
    ctx.fillRect(x0 - cam.x, y0 - cam.y, x1 - x0, y1 - y0);
    // Sidewalk slabs over the blocks (roads cut through below).
    ctx.fillStyle = PALETTE.sidewalk;
    ctx.fillRect(x0 - cam.x, y0 - cam.y, x1 - x0, y1 - y0);
    // Beach and sea.
    if (y1 > CITY.beachY) {
      ctx.fillStyle = PALETTE.sand;
      ctx.fillRect(x0 - cam.x, Math.max(CITY.beachY, y0) - cam.y, x1 - x0, y1 - Math.max(CITY.beachY, y0));
    }
    if (y1 > CITY.seaY) {
      ctx.fillStyle = PALETTE.sea;
      ctx.fillRect(x0 - cam.x, Math.max(CITY.seaY, y0) - cam.y, x1 - x0, y1 - Math.max(CITY.seaY, y0));
      ctx.fillStyle = PALETTE.seaDeep;
      for (let i = 0; i < 5; i += 1) {
        const wy = CITY.seaY + 40 + i * 55;
        if (wy > y0 && wy < y1) {
          ctx.fillRect(x0 - cam.x, wy - cam.y, x1 - x0, 6);
        }
      }
    }
  }

  function drawRoads(cam, city) {
    ctx.fillStyle = PALETTE.asphalt;
    for (const rx of city.roads.vertical) {
      ctx.fillRect(rx - CITY.road / 2 - cam.x, -cam.y, CITY.road, WORLD.height);
    }
    for (const ry of city.roads.horizontal) {
      ctx.fillRect(-cam.x, ry - CITY.road / 2 - cam.y, WORLD.width, CITY.road);
    }
    // Centre dashes.
    ctx.fillStyle = PALETTE.asphaltLine;
    for (const rx of city.roads.vertical) {
      for (let y = 0; y < WORLD.height; y += 64) {
        if (y > CITY.beachY) break;
        ctx.fillRect(rx - 3 - cam.x, y - cam.y, 6, 30);
      }
    }
    for (const ry of city.roads.horizontal) {
      for (let x = 0; x < WORLD.width; x += 64) {
        ctx.fillRect(x - cam.x, ry - 3 - cam.y, 30, 6);
      }
    }
    // Crosswalk stripes at every intersection.
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (const rx of city.roads.vertical) {
      for (const ry of city.roads.horizontal) {
        for (let i = -3; i <= 3; i += 1) {
          ctx.fillRect(rx + i * 12 - 4 - cam.x, ry - CITY.road / 2 - 8 - cam.y, 8, 16);
        }
      }
    }
    // Parking lots.
    for (const lot of city.lots) {
      ctx.fillStyle = '#4a4642';
      ctx.fillRect(lot.x - cam.x, lot.y - cam.y, lot.w, lot.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = 2;
      for (let x = lot.x + 16; x < lot.x + lot.w - 20; x += 44) {
        ctx.beginPath();
        ctx.moveTo(x - cam.x, lot.y + 10 - cam.y);
        ctx.lineTo(x - cam.x, lot.y + lot.h - 10 - cam.y);
        ctx.stroke();
      }
    }
    // Parks.
    for (const park of city.parks) {
      ctx.fillStyle = PALETTE.grass;
      ctx.fillRect(park.x - cam.x, park.y - cam.y, park.w, park.h);
      ctx.fillStyle = PALETTE.parkPath;
      ctx.fillRect(park.x + park.w / 2 - 8 - cam.x, park.y - cam.y, 16, park.h);
      ctx.fillRect(park.x - cam.x, park.y + park.h / 2 - 8 - cam.y, park.w, 16);
      ctx.fillStyle = PALETTE.grassDark;
      ctx.beginPath();
      ctx.arc(park.x + park.w / 2 - cam.x, park.y + park.h / 2 - cam.y, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7fb8d8';
      ctx.beginPath();
      ctx.arc(park.x + park.w / 2 - cam.x, park.y + park.h / 2 - cam.y, 30, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawBuildings(cam, city) {
    for (const b of city.buildings) {
      // Drop shadow: taller roofs float higher, so the shadow sits further off.
      const shx = 8 + b.height * 12;
      const shy = 10 + b.height * 14;
      ctx.fillStyle = `rgba(0,0,0,${0.22 + b.height * 0.12})`;
      ctx.fillRect(b.x + shx - cam.x, b.y + shy - cam.y, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x - cam.x, b.y - cam.y, b.w, b.h);
      // Roof inset with a parapet edge.
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 6 - cam.x, b.y + 6 - cam.y, b.w - 12, b.h - 12);
      ctx.strokeStyle = shade(b.roof, 0.65);
      ctx.lineWidth = 3;
      ctx.strokeRect(b.x + 6 - cam.x, b.y + 6 - cam.y, b.w - 12, b.h - 12);
      // Rooftop clutter: an AC box and/or a water tank.
      if (b.ac) {
        ctx.fillStyle = shade(b.roof, 0.8);
        ctx.fillRect(b.x + 12 - cam.x, b.y + 12 - cam.y, 18, 12);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(b.x + 12 - cam.x, b.y + 12 - cam.y, 18, 3);
      }
      if (b.tank) {
        ctx.fillStyle = '#6b5a4a';
        ctx.beginPath();
        ctx.arc(b.x + b.w - 20 - cam.x, b.y + b.h - 20 - cam.y, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8a7a68';
        ctx.beginPath();
        ctx.arc(b.x + b.w - 20 - cam.x, b.y + b.h - 20 - cam.y, 6, 0, Math.PI * 2);
        ctx.fill();
      }
      // Windows, three looks so the city stops repeating itself.
      const ix = b.x + 12 - cam.x;
      const iy = b.y + 12 - cam.y;
      const iw = b.w - 24;
      const ih = b.h - 24;
      if (b.style === 1) {
        // Horizontal lit bands.
        const bands = Math.max(2, Math.floor(ih / 30));
        for (let j = 0; j < bands; j += 1) {
          ctx.fillStyle = (j % 2 === 0) ? 'rgba(255, 214, 130, 0.9)' : 'rgba(52, 66, 84, 0.9)';
          ctx.fillRect(ix, iy + j * (ih / bands) + 4, iw, 8);
        }
      } else if (b.style === 2) {
        // Big framed windows.
        const cols = Math.max(2, Math.floor(b.w / 56));
        const rows = Math.max(2, Math.floor(b.h / 56));
        for (let i = 0; i < cols; i += 1) {
          for (let j = 0; j < rows; j += 1) {
            const wx = ix + i * (iw / cols) + 4;
            const wy = iy + j * (ih / rows) + 4;
            ctx.fillStyle = (i + j * 2 + b.w) % 3 === 0 ? 'rgba(52, 66, 84, 0.95)' : 'rgba(255, 240, 200, 0.9)';
            ctx.fillRect(wx, wy, iw / cols - 8, ih / rows - 8);
            ctx.strokeStyle = 'rgba(0,0,0,0.35)';
            ctx.lineWidth = 2;
            ctx.strokeRect(wx, wy, iw / cols - 8, ih / rows - 8);
          }
        }
      } else {
        // Lit dot grid, some windows dark glass.
        ctx.fillStyle = 'rgba(255,240,200,0.85)';
        const cols = Math.max(2, Math.floor(b.w / 34));
        const rows = Math.max(2, Math.floor(b.h / 34));
        for (let i = 0; i < cols; i += 1) {
          for (let j = 0; j < rows; j += 1) {
            if ((i * 7 + j * 3 + b.w) % 3 === 0) continue;
            ctx.fillStyle = (i * 5 + j * 3 + b.w) % 4 === 0 ? 'rgba(52, 66, 84, 0.9)' : 'rgba(255, 240, 200, 0.85)';
            ctx.fillRect(b.x + 12 + i * ((b.w - 24) / cols) - cam.x, b.y + 12 + j * ((b.h - 24) / rows) - cam.y, 8, 8);
          }
        }
      }
      if (b.label) {
        // Only draw the label when its centre is comfortably inside the view:
        // a half-clipped label at the frame edge reads as a bug.
        const lx = b.x + b.w / 2;
        const ly = b.y + b.h / 2;
        if (lx < cam.x + 70 || lx > cam.x + VIEW.width - 70 || ly < cam.y + 24 || ly > cam.y + VIEW.height - 24) continue;
        ctx.fillStyle = PALETTE.text;
        ctx.font = `700 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(b.label, lx - cam.x, ly + 4 - cam.y);
        ctx.textAlign = 'left';
      }
    }
    // Palms.
    for (const palm of city.palms) {
      ctx.strokeStyle = '#7a5a38';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(palm.x - cam.x, palm.y - cam.y);
      ctx.lineTo(palm.x + 3 - cam.x, palm.y - 14 - cam.y);
      ctx.stroke();
      ctx.fillStyle = '#3f8f4f';
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.ellipse(palm.x + 3 + Math.cos(a) * 10 - cam.x, palm.y - 14 + Math.sin(a) * 6 - cam.y, 12, 5, a, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Street lamps.
    ctx.fillStyle = '#3a3f46';
    for (const lamp of city.lamps) {
      ctx.fillRect(lamp.x - 2 - cam.x, lamp.y - 2 - cam.y, 4, 4);
    }
  }

  function drawCar(cam, car) {
    // Drawn 1.3x the physics size so the action reads in a small contact
    // sheet; the hitbox stays the CAR size (a slightly forgiving arcade feel).
    const VL = CAR.length * 1.3;
    const VW = CAR.width * 1.3;
    ctx.save();
    ctx.translate(car.x - cam.x, car.y - cam.y);
    ctx.rotate(car.angle);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.roundRect(-VL / 2 + 4, -VW / 2 + 5, VL, VW, 10);
    ctx.fill();
    // Wheels.
    ctx.fillStyle = '#14161a';
    const wy = VW / 2 - 3;
    ctx.fillRect(-VL / 2 + 6, -wy - 4, 12, 7);
    ctx.fillRect(-VL / 2 + 6, wy - 3, 12, 7);
    ctx.fillRect(VL / 2 - 18, -wy - 4, 12, 7);
    ctx.fillRect(VL / 2 - 18, wy - 3, 12, 7);
    // Body.
    ctx.fillStyle = car.paint || car.color;
    ctx.beginPath();
    ctx.roundRect(-VL / 2, -VW / 2, VL, VW, 10);
    ctx.fill();
    // Roof highlight + door seams.
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillRect(-VL / 2 + 6, -VW / 2 + 3, VL - 12, 5);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-4, -VW / 2 + 2);
    ctx.lineTo(-4, VW / 2 - 2);
    ctx.moveTo(12, -VW / 2 + 2);
    ctx.lineTo(12, VW / 2 - 2);
    ctx.stroke();
    // Cabin + windshield + rear window.
    ctx.fillStyle = 'rgba(20,30,40,0.85)';
    ctx.beginPath();
    ctx.roundRect(-10, -VW / 2 + 5, 24, VW - 10, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(160,210,240,0.7)';
    ctx.fillRect(12, -VW / 2 + 6, 6, VW - 12);
    ctx.fillStyle = 'rgba(20,30,40,0.6)';
    ctx.fillRect(-VL / 2 + 4, -VW / 2 + 5, 5, VW - 10);
    // Taillights.
    ctx.fillStyle = '#ff3b30';
    ctx.fillRect(-VL / 2 + 1, -VW / 2 + 4, 3, 6);
    ctx.fillRect(-VL / 2 + 1, VW / 2 - 10, 3, 6);
    // Headlights.
    ctx.fillStyle = '#ffe9a8';
    ctx.fillRect(VL / 2 - 4, -VW / 2 + 4, 4, 6);
    ctx.fillRect(VL / 2 - 4, VW / 2 - 10, 4, 6);
    // Sport spoiler / truck bed.
    if (car.kind === 'sport') {
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(-VL / 2 - 2, -VW / 2 - 1, 5, VW + 2);
    }
    if (car.kind === 'truck') {
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(-VL / 2 + 6, -VW / 2 + 5, 16, VW - 10);
    }
    // Police livery + light bar.
    if (car.police) {
      ctx.fillStyle = '#f5f5f5';
      ctx.fillRect(-VL / 2 + 5, -VW / 2 + 2, VL - 10, 7);
      ctx.fillStyle = '#20242c';
      ctx.font = '700 10px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('SCPD', 2, 5);
      ctx.textAlign = 'left';
      const phase = Math.floor(car.siren * 6) % 2 === 0;
      ctx.fillStyle = phase ? '#ff3b30' : '#3d7bfd';
      ctx.fillRect(-7, -VW / 2 - 4, 14, 7);
      ctx.fillStyle = phase ? '#3d7bfd' : '#ff3b30';
      ctx.fillRect(-7, VW / 2 - 3, 14, 7);
    }
    if (car.kind === 'taxi') {
      ctx.fillStyle = '#20242c';
      ctx.fillRect(-12, -VW / 2 + 2, 24, 6);
      ctx.fillStyle = '#f2b705';
      ctx.font = '700 9px ' + FONT;
      ctx.textAlign = 'center';
      ctx.fillText('TAXI', 0, -VW / 2 + 10);
      ctx.textAlign = 'left';
    }
    ctx.restore();
  }

  function drawPerson(cam, x, y, angle, skin, shirt, flash) {
    ctx.save();
    ctx.translate(x - cam.x, y - cam.y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(2, 4, 14, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    // Body: a little top-down walker with shoulders and head.
    ctx.fillStyle = flash > 0 ? '#ffffff' : shirt;
    ctx.beginPath();
    ctx.arc(0, 0, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    // Facing tick.
    ctx.fillStyle = '#20242c';
    ctx.fillRect(10, -2, 7, 4);
    ctx.restore();
  }

  function drawWorld(game) {
    const cam = camera(game);
    ctx.save();
    ctx.setTransform(viewScale, 0, 0, viewScale, viewX, viewY);
    // Clip to the logical view.
    ctx.beginPath();
    ctx.rect(0, 0, VIEW.width, VIEW.height);
    ctx.clip();
    drawGround(cam);
    drawRoads(cam, game.city);
    drawBuildings(cam, game.city);
    // Hidden packages glow.
    for (const pack of game.city.hiddenPackages) {
      if (pack.found) continue;
      const pulse = 0.6 + Math.sin(game.time * 4 + pack.x) * 0.4;
      ctx.fillStyle = `rgba(255, 217, 74, ${pulse})`;
      ctx.beginPath();
      ctx.arc(pack.x - cam.x, pack.y - cam.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a5a00';
      ctx.fillRect(pack.x - 5 - cam.x, pack.y - 4 - cam.y, 10, 8);
    }
    // Mission marker: a tall beam + ring at the target.
    if (game.missionTarget) {
      const t = game.missionTarget;
      const pulse = 0.5 + Math.sin(game.time * 5) * 0.3;
      ctx.fillStyle = `rgba(255, 217, 74, ${0.25 * pulse})`;
      ctx.fillRect(t.x - 6 - cam.x, t.y - 300 - cam.y, 12, 300);
      ctx.strokeStyle = PALETTE.mission;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(t.x - cam.x, t.y - cam.y, 34 + Math.sin(game.time * 5) * 6, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Taxi customer marker (only when the label sits inside the frame).
    if (game.taxiCustomer) {
      const c = game.taxiCustomer;
      if (c.x > cam.x + 40 && c.x < cam.x + VIEW.width - 40 && c.y - 22 > cam.y + 10 && c.y < cam.y + VIEW.height - 10) {
        ctx.fillStyle = '#3d7bfd';
        ctx.font = `700 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText('TAXI!', c.x - cam.x, c.y - 22 - cam.y);
        ctx.textAlign = 'left';
      }
    }
    // Skid marks.
    ctx.strokeStyle = 'rgba(20,20,20,0.35)';
    ctx.lineWidth = 4;
    for (const skid of game.skids) {
      ctx.globalAlpha = Math.max(0, skid.life);
      ctx.beginPath();
      ctx.moveTo(skid.x - cam.x, skid.y - cam.y);
      ctx.lineTo(skid.x + Math.cos(skid.angle) * 14 - cam.x, skid.y + Math.sin(skid.angle) * 14 - cam.y);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // Cars: parked + traffic + police, then the player's car.
    for (const car of game.cars) drawCar(cam, car);
    for (const car of game.policeCars) drawCar(cam, car);
    // Pedestrians and cops.
    for (const ped of game.peds) {
      if (ped.health <= 0) continue;
      drawPerson(cam, ped.x, ped.y, ped.angle, ped.skin, ped.shirt, ped.hitFlash);
    }
    for (const cop of game.cops) {
      if (cop.health <= 0) continue;
      drawPerson(cam, cop.x, cop.y, cop.angle, '#c98d5f', '#20242c', cop.hitFlash);
    }
    // The player: on foot, or driving (drawn inside the car already).
    const player = game.player;
    if (player.onFoot) {
      drawPerson(cam, player.x, player.y, player.angle, '#e8b88a', player.shirt || '#e84a4a', player.hurtFlash);
      // A white ring marks the player among the pedestrians.
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x - cam.x, player.y - cam.y, 17, 0, Math.PI * 2);
      ctx.stroke();
      // Aim line + muzzle flash when shooting.
      if (player.weapon === 'pistol') {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(player.x - cam.x, player.y - cam.y);
        ctx.lineTo(player.x + Math.cos(player.angle) * 46 - cam.x, player.y + Math.sin(player.angle) * 46 - cam.y);
        ctx.stroke();
      }
    }
    // Particles: smoke, sparks, cash.
    for (const p of game.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x - cam.x, p.y - cam.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Night: darken the world, then headlights and lamps glow through.
    const night = game.nightFactor;
    if (night > 0) {
      ctx.fillStyle = `rgba(8, 12, 40, ${0.55 * night})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
      // Headlight cone from the player's car.
      if (!player.onFoot && player.car) {
        const car = player.car;
        const gx = car.x - cam.x;
        const gy = car.y - cam.y;
        const grad = ctx.createRadialGradient(gx, gy, 10, gx, gy, 260);
        grad.addColorStop(0, `rgba(255, 233, 168, ${0.35 * night})`);
        grad.addColorStop(1, 'rgba(255, 233, 168, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(gx, gy, 260, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Golden hour: a warm wash over the late-afternoon city.
    const hour = (game.clock / 60) % 24;
    if (night === 0 && hour >= 16.75 && hour < 18) {
      ctx.fillStyle = 'rgba(255, 170, 60, 0.13)';
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
    // Hurt flash.
    if (player.hurtFlash > 0) {
      ctx.fillStyle = `rgba(255, 40, 30, ${player.hurtFlash * 0.5})`;
      ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    }
    ctx.restore();
  }

  function overlay(title, lines, hint) {
    ctx.save();
    ctx.setTransform(viewScale, 0, 0, viewScale, viewX, viewY);
    ctx.fillStyle = 'rgba(10, 16, 24, 0.72)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hudAccent;
    ctx.font = `800 64px ${FONT_DISPLAY}`;
    ctx.fillText(title, VIEW.width / 2, 250);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `400 20px ${FONT}`;
    lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 310 + i * 32));
    if (hint) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `600 17px ${FONT}`;
      ctx.fillText(hint, VIEW.width / 2, 310 + lines.length * 32 + 34);
    }
    ctx.restore();
  }

  function drawTitle(game) {
    drawWorld(game);
    ctx.save();
    ctx.setTransform(viewScale, 0, 0, viewScale, viewX, viewY);
    ctx.fillStyle = 'rgba(10, 16, 24, 0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.textAlign = 'center';
    // Sun badge.
    ctx.fillStyle = '#ffb347';
    ctx.beginPath();
    ctx.arc(VIEW.width / 2, 168, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ff7a3d';
    ctx.beginPath();
    ctx.arc(VIEW.width / 2, 168, 52, 0, Math.PI);
    ctx.fill();
    ctx.fillStyle = '#fff3d6';
    ctx.font = `800 84px ${FONT_DISPLAY}`;
    ctx.fillText('SOLMAR HEAT', VIEW.width / 2, 300);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `400 22px ${FONT}`;
    ctx.fillText('Streets of the Sun — an open-world crime story', VIEW.width / 2, 342);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 17px ${FONT}`;
    ctx.fillText('Steal cars. Outrun the SCPD. Run Mara\'s jobs. Own the city.', VIEW.width / 2, 380);
    ctx.fillStyle = '#20242c';
    ctx.beginPath();
    ctx.roundRect(VIEW.width / 2 - 190, 420, 380, 54, 12);
    ctx.fill();
    ctx.fillStyle = '#ffd94a';
    ctx.font = `700 22px ${FONT_DISPLAY}`;
    ctx.fillText(game.hasSave ? 'CONTINUE  —  press SPACE' : 'NEW GAME  —  press SPACE', VIEW.width / 2, 455);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `400 15px ${FONT}`;
    ctx.fillText('WASD drive & walk  ·  E enter / steal car  ·  F punch  ·  mouse aim, click shoot  ·  Q weapon  ·  P pause  ·  M mute', VIEW.width / 2, 520);
    ctx.fillText('5 story missions  ·  taxi fares  ·  10 hidden packages  ·  wanted stars  ·  Spray & Go', VIEW.width / 2, 546);
    ctx.restore();
  }

  return {
    resize,
    screenToWorld,
    draw(game, screen) {
      if (screen === SCREEN_TITLE) { drawTitle(game); return; }
      drawWorld(game);
      if (screen === SCREEN_PLAY) {
        ctx.save();
        ctx.setTransform(viewScale, 0, 0, viewScale, viewX, viewY);
        drawHud(ctx, game);
        ctx.restore();
      }
      if (screen === SCREEN_PAUSED) {
        overlay('PAUSED', ['Take a breath, Leo. Solmar waits.'], 'SPACE to resume · the game saves on mission complete');
      } else if (screen === SCREEN_BUSTED) {
        overlay('BUSTED', [`The SCPD took you in.`, `Fine: $200. The story continues.`], 'SPACE to walk free');
      } else if (screen === SCREEN_WASTED) {
        overlay('WASTED', ['Solmar is unforgiving.', 'You wake up at Clinica Sol, $200 lighter.'], 'SPACE to get back up');
      } else if (screen === SCREEN_WIN) {
        overlay('SOLMAR LEGEND', ['Every job done. Every star outrun.', 'The city is yours, Leo.'], 'SPACE to keep playing the city');
      }
    },
  };
}
