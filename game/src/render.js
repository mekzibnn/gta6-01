// The renderer, v2: full 3D. Solmar is built in three.js from the same 2D
// simulation the v1 top-down game used — the city grid, roads, buildings,
// cars and people are the same data, now rendered as a sun-soaked 3D city
// with a chase camera behind the player. The HUD (cash, stars, minimap,
// menus) stays a 2D canvas layered over the 3D view, so screenshots show
// the game exactly as the player sees it.
//
// World mapping: world x -> three x, world y -> three z, three y is up.
// A 2D heading `angle` (atan2 of dy,dx) becomes three rotation.y = -angle.
import * as THREE from 'three';
import { VIEW, WORLD, CITY, PALETTE, FONT, FONT_DISPLAY, CAR } from './config.js';
import { drawHud } from './hud.js';
import { moonAngleFor } from './daynight.js';
import { weatherFogFar, weatherDarkness, weatherRain } from './weather.js';
import { statsRows, statsMilestones } from './stats.js';
import { bustedPenalty } from './upgrades.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_BUSTED = 'busted';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_WIN = 'win';

// The logical 1280x720 view the HUD is drawn in; the 3D view fills the window.
const TEX_SIZE = 2048;

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function lerpColor(a, b, t) {
  const ca = hexRgb(a);
  const cb = hexRgb(b);
  return new THREE.Color(
    (ca[0] + (cb[0] - ca[0]) * t) / 255,
    (ca[1] + (cb[1] - ca[1]) * t) / 255,
    (ca[2] + (cb[2] - ca[2]) * t) / 255,
  );
}

/**
 * A soft round glow, drawn once on a canvas and reused as the map for
 * every point cloud (lamps, stars, rain). Without it, three.js draws each
 * point as a hard square — a streetlamp near the camera becomes a beige
 * box floating over the street.
 */
function makeGlowTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.5)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

// Shared materials, cached by colour so the scene stays cheap.
const materialCache = new Map();
function lambert(color, opts) {
  const key = `${color}:${JSON.stringify(opts || {})}`;
  const hit = materialCache.get(key);
  if (hit) return hit;
  const mat = new THREE.MeshLambertMaterial({ color, ...(opts || {}) });
  materialCache.set(key, mat);
  return mat;
}
const glassMat = new THREE.MeshLambertMaterial({ color: 0x14202c });
const darkMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
const tireMat = new THREE.MeshLambertMaterial({ color: 0x0e0f11 });
const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
const palmMat = new THREE.MeshLambertMaterial({ color: 0x3f8f4f });
const headlightMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffe9a8, emissiveIntensity: 0.9 });
const taillightMat = new THREE.MeshLambertMaterial({ color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 0.7 });
const goldMat = new THREE.MeshLambertMaterial({ color: 0xffd94a, emissive: 0xffd94a, emissiveIntensity: 0.8 });

// ---------------------------------------------------------------------------
// Textures painted on 2D canvases: the ground, building facades, labels.
// ---------------------------------------------------------------------------

/** Asphalt roads with centre dashes, drawn onto the ground texture. */
function paintRoads(ctx, city) {
  ctx.fillStyle = PALETTE.asphalt;
  for (const rx of city.roads.vertical) ctx.fillRect(rx - CITY.road / 2, 0, CITY.road, WORLD.height);
  for (const ry of city.roads.horizontal) ctx.fillRect(0, ry - CITY.road / 2, WORLD.width, CITY.road);
  // Centre dashes.
  ctx.fillStyle = PALETTE.asphaltLine;
  for (const rx of city.roads.vertical) {
    for (let y = 0; y < CITY.beachY; y += 64) ctx.fillRect(rx - 3, y, 6, 30);
  }
  for (const ry of city.roads.horizontal) {
    for (let x = 0; x < WORLD.width; x += 64) ctx.fillRect(x, ry - 3, 30, 6);
  }
  // Crosswalk stripes at every intersection.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  for (const rx of city.roads.vertical) {
    for (const ry of city.roads.horizontal) {
      for (let i = -3; i <= 3; i += 1) ctx.fillRect(rx + i * 12 - 4, ry - CITY.road / 2 - 8, 8, 16);
    }
  }
}

/** Parking lots and parks, drawn onto the ground texture. */
function paintLotsAndParks(ctx, city) {
  for (const lot of city.lots) {
    ctx.fillStyle = '#4a4642';
    ctx.fillRect(lot.x, lot.y, lot.w, lot.h);
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2;
    for (let x = lot.x + 16; x < lot.x + lot.w - 20; x += 44) {
      ctx.beginPath();
      ctx.moveTo(x, lot.y + 10);
      ctx.lineTo(x, lot.y + lot.h - 10);
      ctx.stroke();
    }
  }
  for (const park of city.parks) {
    ctx.fillStyle = PALETTE.grass;
    ctx.fillRect(park.x, park.y, park.w, park.h);
    ctx.fillStyle = PALETTE.parkPath;
    ctx.fillRect(park.x + park.w / 2 - 8, park.y, 16, park.h);
    ctx.fillRect(park.x, park.y + park.h / 2 - 8, park.w, 16);
    ctx.fillStyle = PALETTE.grassDark;
    ctx.beginPath();
    ctx.arc(park.x + park.w / 2, park.y + park.h / 2, 46, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7fb8d8';
    ctx.beginPath();
    ctx.arc(park.x + park.w / 2, park.y + park.h / 2, 30, 0, Math.PI * 2);
    ctx.fill();
  }
  // Street lamps as dots (the 3D lamps glow at night through the headlights).
  ctx.fillStyle = '#3a3f46';
  for (const lamp of city.lamps) ctx.fillRect(lamp.x - 2, lamp.y - 2, 4, 4);
}

/** The whole city painted once onto a texture: sidewalks, roads, lots, parks, beach, sea. */
function makeGroundTexture(city) {
  const cv = document.createElement('canvas');
  cv.width = TEX_SIZE;
  cv.height = TEX_SIZE;
  const ctx = cv.getContext('2d');
  ctx.setTransform(TEX_SIZE / WORLD.width, 0, 0, TEX_SIZE / WORLD.height, 0, 0);
  // Sidewalk base over the whole playfield.
  ctx.fillStyle = PALETTE.sidewalk;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);
  // Beach and sea at the south edge.
  ctx.fillStyle = PALETTE.sand;
  ctx.fillRect(0, CITY.beachY, WORLD.width, WORLD.height - CITY.beachY);
  ctx.fillStyle = PALETTE.sea;
  ctx.fillRect(0, CITY.seaY, WORLD.width, WORLD.height - CITY.seaY);
  ctx.fillStyle = PALETTE.seaDeep;
  for (let i = 0; i < 5; i += 1) ctx.fillRect(0, CITY.seaY + 40 + i * 55, WORLD.width, 6);
  paintRoads(ctx, city);
  paintLotsAndParks(ctx, city);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Building facades: one 128px texture per (colour, window style), cached.
// The base is the building colour; windows are lit warm or dark glass.
const facadeCache = new Map();
function facadeTexture(color, style) {
  const key = `${color}:${style}`;
  const hit = facadeCache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 128;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 128, 128);
  // A subtle vertical shade so the facade reads as a wall, not a flat card.
  const grad = ctx.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0, 'rgba(0,0,0,0.18)');
  grad.addColorStop(0.5, 'rgba(255,255,255,0.06)');
  grad.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const lit = 'rgba(255, 240, 200, 0.95)';
  const dark = 'rgba(52, 66, 84, 0.95)';
  const seed = color.charCodeAt(1) * 7 + color.charCodeAt(3) * 13 + style * 31;
  if (style === 1) {
    const bands = 4;
    for (let j = 0; j < bands; j += 1) {
      ctx.fillStyle = (j + seed) % 2 === 0 ? lit : dark;
      ctx.fillRect(8, 10 + j * 30, 112, 9);
    }
  } else if (style === 2) {
    const cols = 3;
    const rows = 4;
    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < rows; j += 1) {
        const wx = 10 + i * 38;
        const wy = 10 + j * 28;
        ctx.fillStyle = (i * 5 + j * 3 + seed) % 3 === 0 ? dark : lit;
        ctx.fillRect(wx, wy, 28, 18);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(wx, wy, 28, 18);
      }
    }
  } else {
    const cols = 4;
    const rows = 6;
    for (let i = 0; i < cols; i += 1) {
      for (let j = 0; j < rows; j += 1) {
        if ((i * 7 + j * 3 + seed) % 3 === 0) continue;
        ctx.fillStyle = (i * 5 + j * 3 + seed) % 4 === 0 ? dark : lit;
        ctx.fillRect(10 + i * 28, 10 + j * 19, 12, 10);
      }
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  facadeCache.set(key, tex);
  return tex;
}

/** A floating label sprite for a landmark, always facing the camera. */
function makeLabelSprite(text) {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 96;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = 'rgba(12, 20, 28, 0.72)';
  ctx.beginPath();
  ctx.roundRect(6, 10, 500, 72, 18);
  ctx.fill();
  ctx.fillStyle = '#f5efe2';
  ctx.font = '700 34px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 256, 48);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(240, 45, 1);
  return sprite;
}

/** The checkered race flag texture, 8x4 squares. */
function makeFlagTexture() {
  const flagCanvas = document.createElement('canvas');
  flagCanvas.width = 64;
  flagCanvas.height = 32;
  const fctx = flagCanvas.getContext('2d');
  for (let fy = 0; fy < 4; fy += 1) {
    for (let fx = 0; fx < 8; fx += 1) {
      fctx.fillStyle = (fx + fy) % 2 === 0 ? '#111111' : '#ffffff';
      fctx.fillRect(fx * 8, fy * 8, 8, 8);
    }
  }
  return new THREE.CanvasTexture(flagCanvas);
}

// ---------------------------------------------------------------------------
// Mesh builders: the city is built once per seed; cars, people and the heli
// are synced from the simulation every frame.
// ---------------------------------------------------------------------------

/** Building height in 3D units from the 2D height factor (0.35..1). */
function buildingHeight(b) {
  return 46 + b.height * 190;
}

/** Buildings as instanced unit boxes, grouped by (colour, style) so each
 * group shares one facade texture. Roofs are a second instanced set. */
function buildBuildings(group, city, dummy) {
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const byFacade = new Map();
  const byRoof = new Map();
  for (const b of city.buildings) {
    const fk = `${b.color}:${b.style}`;
    if (!byFacade.has(fk)) byFacade.set(fk, []);
    byFacade.get(fk).push(b);
    if (!byRoof.has(b.roof)) byRoof.set(b.roof, []);
    byRoof.get(b.roof).push(b);
  }
  for (const [key, list] of byFacade) {
    const [color, style] = key.split(':');
    const mat = new THREE.MeshLambertMaterial({ map: facadeTexture(color, Number(style)) });
    const mesh = new THREE.InstancedMesh(unitBox, mat, list.length);
    list.forEach((b, i) => {
      const h = buildingHeight(b);
      dummy.position.set(b.x + b.w / 2, h / 2, b.y + b.h / 2);
      dummy.scale.set(b.w, h, b.h);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }
  for (const [roofColor, list] of byRoof) {
    const mat = new THREE.MeshLambertMaterial({ color: new THREE.Color(roofColor) });
    const mesh = new THREE.InstancedMesh(unitBox, mat, list.length);
    list.forEach((b, i) => {
      const h = buildingHeight(b);
      dummy.position.set(b.x + b.w / 2, h + 2, b.y + b.h / 2);
      dummy.scale.set(b.w - 8, 5, b.h - 8);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.castShadow = true;
    group.add(mesh);
  }
  // Rooftop clutter: an AC box or a water tank on some roofs.
  const clutterGeo = new THREE.BoxGeometry(1, 1, 1);
  const clutterMat = new THREE.MeshLambertMaterial({ color: 0x6b5a4a });
  const clutter = [];
  for (const b of city.buildings) {
    if (b.ac || b.tank) clutter.push(b);
  }
  if (clutter.length) {
    const mesh = new THREE.InstancedMesh(clutterGeo, clutterMat, clutter.length);
    clutter.forEach((b, i) => {
      const h = buildingHeight(b);
      dummy.position.set(b.x + b.w / 2 - 10, h + 12, b.y + b.h / 2 - 10);
      dummy.scale.set(18, 12, 14);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    group.add(mesh);
  }
  // Landmark labels float above their roofs.
  for (const b of city.buildings) {
    if (!b.label) continue;
    const sprite = makeLabelSprite(b.label);
    sprite.position.set(b.x + b.w / 2, buildingHeight(b) + 70, b.y + b.h / 2);
    group.add(sprite);
  }
}

/** Palms: instanced trunks + canopies, two draw calls for the whole city. */
function buildPalms(group, city, dummy) {
  if (!city.palms.length) return;
  const trunkGeo = new THREE.CylinderGeometry(2.5, 4, 30, 6);
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, city.palms.length);
  const canopyGeo = new THREE.IcosahedronGeometry(15, 0);
  const canopies = new THREE.InstancedMesh(canopyGeo, palmMat, city.palms.length);
  city.palms.forEach((p, i) => {
    dummy.position.set(p.x, 15, p.y);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    trunks.setMatrixAt(i, dummy.matrix);
    dummy.position.set(p.x + 3, 34, p.y);
    dummy.scale.set(1, 0.45, 1);
    dummy.rotation.set(0, p.x * 0.7, 0);
    dummy.updateMatrix();
    canopies.setMatrixAt(i, dummy.matrix);
  });
  trunks.castShadow = true;
  canopies.castShadow = true;
  group.add(trunks);
  group.add(canopies);
}

/** Race flag at the Palm Strip start line: a pole and a checkered flag. */
function buildRaceFlag(group, city) {
  const race = city.places.race;
  if (!race) return;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 70, 6), new THREE.MeshLambertMaterial({ color: 0xdddddd }));
  pole.position.set(race.x, 35, race.y);
  group.add(pole);
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 23),
    new THREE.MeshLambertMaterial({ map: makeFlagTexture(), side: THREE.DoubleSide }),
  );
  flag.position.set(race.x + 24, 56, race.y);
  group.add(flag);
}

function buildCityMeshes(scene, city) {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  // Ground plane with the painted city texture.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.width, WORLD.height),
    new THREE.MeshLambertMaterial({ map: makeGroundTexture(city) }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(WORLD.width / 2, 0, WORLD.height / 2);
  ground.receiveShadow = true;
  group.add(ground);
  // Sea shimmer: a translucent plane over the water, slightly above ground.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.width, WORLD.height - CITY.seaY),
    new THREE.MeshLambertMaterial({ color: 0x2a9bc4, transparent: true, opacity: 0.25 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(WORLD.width / 2, 1.5, (CITY.seaY + WORLD.height) / 2);
  group.add(sea);
  buildBuildings(group, city, dummy);
  buildPalms(group, city, dummy);
  buildRaceFlag(group, city);
  scene.add(group);
  return group;
}

/** One low-poly car from boxes: body, cabin, wheels, lights, livery. */
function buildCarMesh(car) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(CAR.length, 11, CAR.width), lambert(car.paint || car.color));
  body.position.y = 8;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(26, 9, CAR.width - 4), glassMat);
  cabin.position.set(-3, 17, 0);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelGeo = new THREE.CylinderGeometry(6, 6, 4, 10);
  for (const [wx, wz] of [[-18, -12], [-18, 12], [18, -12], [18, 12]]) {
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.rotation.x = Math.PI / 2;
    wheel.position.set(wx, 6, wz);
    group.add(wheel);
  }
  const lightGeo = new THREE.BoxGeometry(2, 3, 5);
  for (const wz of [-8, 8]) {
    const head = new THREE.Mesh(lightGeo, headlightMat);
    head.position.set(CAR.length / 2, 8, wz);
    group.add(head);
    const tail = new THREE.Mesh(lightGeo, taillightMat);
    tail.position.set(-CAR.length / 2, 8, wz);
    group.add(tail);
  }
  if (car.kind === 'sport') {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(4, 2, CAR.width), darkMat);
    spoiler.position.set(-CAR.length / 2 - 1, 16, 0);
    group.add(spoiler);
  }
  if (car.kind === 'truck') {
    const bed = new THREE.Mesh(new THREE.BoxGeometry(16, 4, CAR.width - 6), darkMat);
    bed.position.set(-CAR.length / 2 + 12, 14, 0);
    group.add(bed);
  }
  if (car.police) {
    const roof = new THREE.Mesh(new THREE.BoxGeometry(CAR.length - 12, 2, CAR.width - 4), lambert('#f5f5f5'));
    roof.position.set(0, 14, 0);
    group.add(roof);
    const barGeo = new THREE.BoxGeometry(12, 3, 7);
    const red = new THREE.Mesh(barGeo, new THREE.MeshLambertMaterial({ color: 0xff3b30, emissive: 0xff3b30, emissiveIntensity: 1 }));
    red.position.set(-4, 23, -4);
    const blue = new THREE.Mesh(barGeo, new THREE.MeshLambertMaterial({ color: 0x3d7bfd, emissive: 0x3d7bfd, emissiveIntensity: 1 }));
    blue.position.set(-4, 23, 4);
    group.add(red);
    group.add(blue);
    group.userData.lightBar = { red, blue };
  }
  if (car.kind === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(14, 4, 8), lambert('#f2b705'));
    sign.position.set(-3, 23, 0);
    group.add(sign);
  }
  return group;
}

/** One person: body cylinder + head sphere, shirt and skin colours. */
function buildPersonMesh(skin, shirt) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(9, 10, 18, 10), lambert(shirt));
  body.position.y = 14;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(6.5, 10, 8), lambert(skin));
  head.position.y = 29;
  head.castShadow = true;
  group.add(head);
  return group;
}

/** The SCPD helicopter: body, tail, spinning rotors, skids, searchlight cone. */
function buildHeliMesh() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(46, 13, 20), lambert('#20242c'));
  body.castShadow = true;
  group.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(42, 5, 5), lambert('#20242c'));
  tail.position.set(-42, 3, 0);
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(2, 14, 9), lambert('#20242c'));
  fin.position.set(-60, 8, 0);
  group.add(fin);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(46, 3, 21), lambert('#f5f5f5'));
  stripe.position.y = 2;
  group.add(stripe);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(92, 1.5, 5), darkMat);
  rotor.position.y = 11;
  group.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(1.5, 14, 3), darkMat);
  tailRotor.position.set(-60, 8, 6);
  group.add(tailRotor);
  for (const wz of [-9, 9]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(40, 2, 2), darkMat);
    skid.position.set(0, -10, wz);
    group.add(skid);
  }
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(34, 150, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.position.y = -82;
  cone.rotation.x = Math.PI;
  cone.visible = false;
  group.add(cone);
  group.userData.rotor = rotor;
  group.userData.tailRotor = tailRotor;
  group.userData.cone = cone;
  return group;
}

// ---------------------------------------------------------------------------
// The renderer factory.
// ---------------------------------------------------------------------------

export function createRenderer(gameCanvas, hudCanvas) {
  // Software GL (SwiftShader) gets no shadows and no MSAA: the scene is
  // identical, just cheaper to rasterise. Detect it before creating the
  // renderer, from a throwaway context.
  let software = false;
  try {
    const probe = document.createElement('canvas').getContext('webgl2');
    const ext = probe && probe.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? probe.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    software = /swiftshader|llvmpipe|software/i.test(String(name || ''));
  } catch { software = true; }

  const renderer = new THREE.WebGLRenderer({ canvas: gameCanvas, antialias: !software });
  // One soft glow texture for every point cloud in the sky.
  const glowTex = makeGlowTexture();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, software ? 1 : 1.5));
  renderer.shadowMap.enabled = !software;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const hudCtx = hudCanvas.getContext('2d');
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x8fc3e8);
  scene.fog = new THREE.Fog(0x8fc3e8, 1500, 5200);
  const camera = new THREE.PerspectiveCamera(62, 1, 1, 9000);
  camera.position.set(1700, 600, 300);
  camera.lookAt(1700, 0, 1300);

  const hemi = new THREE.HemisphereLight(0xbcd8ff, 0x7d9b58, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff2d0, 1.6);
  sun.castShadow = !software;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -750;
  sun.shadow.camera.right = 750;
  sun.shadow.camera.top = 750;
  sun.shadow.camera.bottom = -750;
  sun.shadow.camera.near = 100;
  sun.shadow.camera.far = 3000;
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  scene.add(sun.target);
  const headlight = new THREE.SpotLight(0xffe9a8, 0, 700, 0.55, 0.5, 1.2);
  scene.add(headlight);
  scene.add(headlight.target);
  const heliLight = new THREE.SpotLight(0xfff2b0, 0, 800, 0.4, 0.6, 1.0);
  scene.add(heliLight);
  scene.add(heliLight.target);
  const flashLight = new THREE.PointLight(0xff3b30, 0, 500, 1.2);
  scene.add(flashLight);

  // Per-game dynamic state. The city is rebuilt when the city object changes.
  const dyn = {
    city: null,
    cityGroup: null,
    cars: new Map(),
    people: new Map(),
    heli: null,
    packages: [],
    skidPool: [],
    beam: null,
    ring: null,
    particles: null,
    particlePos: null,
    particleCol: null,
    lampGlow: null,
    rain: null,
    rainPos: null,
    stars: null,
    moon: null,
  };
  let viewScale = 1;
  let viewX = 0;
  let viewY = 0;
  let lastNow = performance.now();
  const camPos = new THREE.Vector3(1700, 600, 300);
  const camLook = new THREE.Vector3(1700, 0, 1300);
  const raycaster = new THREE.Raycaster();
  const tmpV = new THREE.Vector3();

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    gameCanvas.width = w;
    gameCanvas.height = h;
    hudCanvas.width = w;
    hudCanvas.height = h;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    viewScale = Math.min(w / VIEW.width, h / VIEW.height);
    viewX = (w - VIEW.width * viewScale) / 2;
    viewY = (h - VIEW.height * viewScale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  function ensureCity(game) {
    if (dyn.city === game.city && dyn.cityGroup) return;
    if (dyn.cityGroup) {
      scene.remove(dyn.cityGroup);
      dyn.cityGroup = null;
    }
    dyn.city = game.city;
    dyn.cityGroup = buildCityMeshes(scene, game.city);
    dyn.packages = [];
    for (const pack of game.city.hiddenPackages) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(14, 10, 14), goldMat);
      mesh.position.set(pack.x, 8, pack.y);
      scene.add(mesh);
      dyn.packages.push({ pack, mesh });
    }
    // Streetlamp glow: one warm point floating over every lamp, lit after
    // dark by the day/night cycle. Rebuilt with the city so a new seed
    // never leaves stale lights behind.
    if (dyn.lampGlow) {
      scene.remove(dyn.lampGlow);
      dyn.lampGlow.geometry.dispose();
      dyn.lampGlow.material.dispose();
      dyn.lampGlow = null;
    }
    const lampCount = game.city.lamps.length;
    const lampGeo = new THREE.BufferGeometry();
    const lampPos = new Float32Array(lampCount * 3);
    game.city.lamps.forEach((lamp, i) => {
      lampPos[i * 3] = lamp.x;
      lampPos[i * 3 + 1] = 30;
      lampPos[i * 3 + 2] = lamp.y;
    });
    lampGeo.setAttribute('position', new THREE.BufferAttribute(lampPos, 3));
    dyn.lampGlow = new THREE.Points(lampGeo, new THREE.PointsMaterial({
      color: 0xffd9a0, size: 22, transparent: true, opacity: 0, depthWrite: false,
      map: glowTex, blending: THREE.AdditiveBlending,
    }));
    dyn.lampGlow.frustumCulled = false;
    scene.add(dyn.lampGlow);
    // Particle points, one buffer for the whole game.
    if (!dyn.particles) {
      const max = 240;
      const geo = new THREE.BufferGeometry();
      dyn.particlePos = new Float32Array(max * 3);
      dyn.particleCol = new Float32Array(max * 3);
      for (let i = 0; i < max; i += 1) dyn.particlePos[i * 3 + 1] = -1000;
      geo.setAttribute('position', new THREE.BufferAttribute(dyn.particlePos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(dyn.particleCol, 3));
      dyn.particles = new THREE.Points(geo, new THREE.PointsMaterial({
        size: 8, vertexColors: true, transparent: true, opacity: 0.95, depthWrite: false,
      }));
      dyn.particles.frustumCulled = false;
      scene.add(dyn.particles);
    }
    // Skid pool: thin dark boxes on the ground.
    if (!dyn.skidPool.length) {
      const geo = new THREE.BoxGeometry(18, 0.6, 5);
      const mat = new THREE.MeshBasicMaterial({ color: 0x141414, transparent: true, opacity: 0.35, depthWrite: false });
      for (let i = 0; i < 80; i += 1) {
        const m = new THREE.Mesh(geo, mat.clone());
        m.visible = false;
        scene.add(m);
        dyn.skidPool.push(m);
      }
    }
    // Mission marker: a light beam and a pulsing ring on the ground.
    if (!dyn.beam) {
      dyn.beam = new THREE.Mesh(
        new THREE.CylinderGeometry(7, 7, 320, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0xffd94a, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }),
      );
      dyn.beam.visible = false;
      scene.add(dyn.beam);
      dyn.ring = new THREE.Mesh(
        new THREE.RingGeometry(30, 42, 32),
        new THREE.MeshBasicMaterial({ color: 0xffd94a, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }),
      );
      dyn.ring.rotation.x = -Math.PI / 2;
      dyn.ring.visible = false;
      scene.add(dyn.ring);
    }
  }

  // -- syncDynamic, split by what moves -------------------------------------

  function syncCars(game) {
    const seenCars = new Set();
    for (const car of [...game.cars, ...game.policeCars]) {
      seenCars.add(car);
      let mesh = dyn.cars.get(car);
      if (!mesh) {
        mesh = buildCarMesh(car);
        scene.add(mesh);
        dyn.cars.set(car, mesh);
      }
      mesh.position.set(car.x, 0, car.y);
      mesh.rotation.y = -car.angle;
      if (car.police && mesh.userData.lightBar) {
        const phase = Math.floor((car.siren || 0) * 6) % 2 === 0;
        mesh.userData.lightBar.red.material.emissiveIntensity = phase ? 1.8 : 0.15;
        mesh.userData.lightBar.blue.material.emissiveIntensity = phase ? 0.15 : 1.8;
      }
    }
    for (const [car, mesh] of dyn.cars) {
      if (!seenCars.has(car)) {
        scene.remove(mesh);
        dyn.cars.delete(car);
      }
    }
  }

  function syncPeople(game) {
    const seenPeople = new Set();
    const placePerson = (key, x, y, angle, skin, shirt, bob, ring) => {
      seenPeople.add(key);
      let mesh = dyn.people.get(key);
      if (!mesh) {
        mesh = buildPersonMesh(skin, shirt);
        if (ring) {
          const torus = new THREE.Mesh(
            new THREE.TorusGeometry(17, 1.6, 8, 24),
            new THREE.MeshBasicMaterial({ color: 0xffffff }),
          );
          torus.rotation.x = Math.PI / 2;
          torus.position.y = 2;
          mesh.add(torus);
        }
        scene.add(mesh);
        dyn.people.set(key, mesh);
      }
      mesh.position.set(x, bob ? Math.abs(Math.sin(game.time * 10)) * 2 : 0, y);
      mesh.rotation.y = -angle;
    };
    const player = game.player;
    if (player.onFoot) placePerson('player', player.x, player.y, player.angle, '#e8b88a', player.shirt || '#e84a4a', player.moving, true);
    else dyn.people.delete('player');
    for (const ped of game.peds) {
      if (ped.health <= 0) continue;
      placePerson(ped, ped.x, ped.y, ped.angle, ped.skin, ped.shirt, ped.flee > 0, false);
    }
    for (const cop of game.cops) {
      if (cop.health <= 0) continue;
      placePerson(cop, cop.x, cop.y, cop.angle, '#c98d5f', '#20242c', true, false);
    }
    for (const member of game.crew || []) {
      if (member.health <= 0) continue;
      placePerson(member, member.x, member.y, member.angle, member.skin, member.shirt, true, false);
    }
    for (const [key, mesh] of dyn.people) {
      if (!seenPeople.has(key)) {
        scene.remove(mesh);
        dyn.people.delete(key);
      }
    }
  }

  function syncHeli(game) {
    if (game.heli) {
      if (!dyn.heli) {
        dyn.heli = buildHeliMesh();
        scene.add(dyn.heli);
      }
      const bob = Math.sin(game.time * 2.2) * 6;
      dyn.heli.position.set(game.heli.x, 190 + bob, game.heli.y);
      dyn.heli.rotation.y = -game.heli.angle;
      dyn.heli.userData.rotor.rotation.y += 0.55;
      dyn.heli.userData.tailRotor.rotation.x += 0.8;
      dyn.heli.userData.cone.visible = game.nightFactor > 0.4;
    } else if (dyn.heli) {
      scene.remove(dyn.heli);
      dyn.heli = null;
    }
  }

  function syncParticles(game) {
    if (!dyn.particles) return;
    const max = 240;
    for (let i = 0; i < max; i += 1) {
      const p = game.particles[i];
      if (p) {
        dyn.particlePos[i * 3] = p.x;
        dyn.particlePos[i * 3 + 1] = 5 + (p.life * 20);
        dyn.particlePos[i * 3 + 2] = p.y;
        const c = hexRgb(p.color);
        const f = Math.max(0, p.life);
        dyn.particleCol[i * 3] = (c[0] / 255) * f;
        dyn.particleCol[i * 3 + 1] = (c[1] / 255) * f;
        dyn.particleCol[i * 3 + 2] = (c[2] / 255) * f;
      } else {
        dyn.particlePos[i * 3 + 1] = -1000;
      }
    }
    dyn.particles.geometry.attributes.position.needsUpdate = true;
    dyn.particles.geometry.attributes.color.needsUpdate = true;
  }

  function syncSkids(game) {
    dyn.skidPool.forEach((mesh, i) => {
      const skid = game.skids[i];
      if (skid) {
        mesh.visible = true;
        mesh.position.set(skid.x, 1, skid.y);
        mesh.rotation.y = -skid.angle;
        mesh.material.opacity = Math.max(0, skid.life) * 0.35;
      } else mesh.visible = false;
    });
  }

  function syncPackages(game) {
    for (const { pack, mesh } of dyn.packages) {
      mesh.visible = !pack.found;
      if (mesh.visible) {
        const s = 1 + Math.sin(game.time * 4 + pack.x) * 0.2;
        mesh.scale.set(s, s, s);
        mesh.rotation.y = game.time * 0.8;
      }
    }
  }

  function syncMarker(game) {
    if (game.missionTarget && dyn.beam) {
      const t = game.missionTarget;
      dyn.beam.visible = true;
      dyn.beam.position.set(t.x, 160, t.y);
      dyn.ring.visible = true;
      dyn.ring.position.set(t.x, 1.5, t.y);
      const s = 1 + Math.sin(game.time * 5) * 0.15;
      dyn.ring.scale.set(s, s, s);
    } else if (dyn.beam) {
      dyn.beam.visible = false;
      dyn.ring.visible = false;
    }
  }

  /** Sync every moving mesh from the simulation; create and drop as needed. */
  function syncDynamic(game) {
    syncCars(game);
    syncPeople(game);
    syncHeli(game);
    syncParticles(game);
    syncSkids(game);
    syncPackages(game);
    syncMarker(game);
  }

  /** Chase camera: behind the player, smoothed, wider FOV at speed. */
  function updateCamera(game, dt, screen) {
    const player = game.player;
    if (screen === SCREEN_TITLE) {
      const a = game.time * 0.045;
      tmpV.set(1700 + Math.cos(a) * 1150, 520, 1300 + Math.sin(a) * 1150);
      camPos.lerp(tmpV, 1 - Math.exp(-1.2 * dt));
      tmpV.set(1700, 30, 1300);
      camLook.lerp(tmpV, 1 - Math.exp(-1.2 * dt));
      camera.position.copy(camPos);
      camera.lookAt(camLook);
      if (Math.abs(camera.fov - 55) > 0.1) {
        camera.fov = 55;
        camera.updateProjectionMatrix();
      }
      return;
    }
    const shot = game.shotCam;
    const driving = !player.onFoot && !!player.car;
    // C toggles a high camera; screenshots pin their own framing.
    // The chase camera sits high (buildings run 46-236 tall) so the car is
    // never hidden behind a rooftop, and looks just ahead of the player so
    // the car sits in the lower third of the frame, not off its edge.
    // The angle stays a low chase (~30° down), not a top-down view.
    const high = !shot && game.cameraHigh;
    const dist = shot ? shot.dist : driving ? 280 : 160;
    const height = shot ? shot.height : driving ? 170 : 120;
    const camDist = high ? dist * 1.45 : dist;
    const camHeight = high ? height * 1.7 : height;
    const fx = Math.cos(player.angle);
    const fz = Math.sin(player.angle);
    // A staged shot snaps the camera at once; live play eases into place.
    const snap = game.snapCam;
    if (snap) game.snapCam = false;
    tmpV.set(player.x - fx * camDist, camHeight, player.y - fz * camDist);
    if (snap) camPos.copy(tmpV);
    else camPos.lerp(tmpV, 1 - Math.exp(-3.4 * dt));
    tmpV.set(player.x + fx * 50, 24, player.y + fz * 50);
    if (snap) camLook.copy(tmpV);
    else camLook.lerp(tmpV, 1 - Math.exp(-5 * dt));
    // Crash shake.
    if (game.shake > 0) {
      camPos.x += (Math.random() - 0.5) * game.shake * 14;
      camPos.y += (Math.random() - 0.5) * game.shake * 8;
      camPos.z += (Math.random() - 0.5) * game.shake * 14;
      game.shake = Math.max(0, game.shake - dt * 1.6);
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    const speedRatio = driving && player.car ? Math.abs(player.car.speed) / 560 : 0;
    const wantFov = shot ? shot.fov : 62 + speedRatio * 12;
    if (Math.abs(camera.fov - wantFov) > 0.2) {
      camera.fov += (wantFov - camera.fov) * Math.min(1, dt * 4);
      camera.updateProjectionMatrix();
    }
  }

  /** Golden-hour factor: 0 by day, 1 at sunset (18:00-19:30). */
  function goldenFactor(hour) {
    if (hour >= 16.5 && hour < 18) return (hour - 16.5) / 1.5;
    if (hour >= 18 && hour < 19.5) return 1;
    if (hour >= 19.5 && hour < 20.5) return 1 - (hour - 19.5);
    return 0;
  }

  /** Sun, sky and fog follow the in-game clock. */
  /** Rain, stars and the moon, built once and moved with the player. */
  function ensureSkyFx(game) {
    if (!dyn.rain) {
      const count = 350;
      const geo = new THREE.BufferGeometry();
      dyn.rainPos = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        dyn.rainPos[i * 3] = game.player.x + (Math.random() * 2 - 1) * 700;
        dyn.rainPos[i * 3 + 1] = Math.random() * 700;
        dyn.rainPos[i * 3 + 2] = game.player.y + (Math.random() * 2 - 1) * 700;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(dyn.rainPos, 3));
      dyn.rain = new THREE.Points(geo, new THREE.PointsMaterial({
        color: 0xaec6dd, size: 3, transparent: true, opacity: 0, depthWrite: false, map: glowTex,
      }));
      dyn.rain.frustumCulled = false;
      scene.add(dyn.rain);
    }
    if (!dyn.stars) {
      // Stars sit on a dome over the whole city, placed with the game's
      // seeded generator so the night sky is the same every run.
      const count = 260;
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i += 1) {
        const a = game.random() * Math.PI * 2;
        const r = 1800 + game.random() * 1200;
        pos[i * 3] = WORLD.width / 2 + Math.cos(a) * r;
        pos[i * 3 + 1] = 350 + game.random() * 1600;
        pos[i * 3 + 2] = WORLD.height / 2 + Math.sin(a) * r;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      dyn.stars = new THREE.Points(geo, new THREE.PointsMaterial({
        color: 0xffffff, size: 2.2, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false,
        map: glowTex, blending: THREE.AdditiveBlending,
      }));
      dyn.stars.frustumCulled = false;
      scene.add(dyn.stars);
    }
    if (!dyn.moon) {
      dyn.moon = new THREE.Mesh(
        new THREE.SphereGeometry(60, 20, 14),
        new THREE.MeshBasicMaterial({ color: 0xf4f1de, transparent: true, opacity: 0 }),
      );
      scene.add(dyn.moon);
    }
  }

  function updateLighting(game, dt) {
    const hour = (game.clock / 60) % 24;
    const nightF = game.nightFactor;
    const goldenF = goldenFactor(hour);
    const daySky = new THREE.Color(0x8fc3e8);
    const goldenSky = new THREE.Color(0xff9a4d);
    const nightSky = new THREE.Color(0x0a1230);
    const sky = daySky.clone().lerp(goldenSky, goldenF).lerp(nightSky, nightF);
    scene.background.copy(sky);
    scene.fog.color.copy(sky);
    // Weather closes the fog in and darkens the sky a little further.
    if (game.weather) {
      scene.fog.far = weatherFogFar(game.weather);
      sky.lerp(nightSky, weatherDarkness(game.weather) * 0.6);
      scene.background.copy(sky);
      scene.fog.color.copy(sky);
    }
    hemi.intensity = (0.95 + (0.7 - 0.95) * goldenF) * (1 - nightF) + 0.28 * nightF;
    sun.intensity = (1.6 + (1.2 - 1.6) * goldenF) * (1 - nightF) + 0.3 * nightF;
    sun.color.copy(lerpColor('#fff2d0', '#ffb347', goldenF)).lerp(lerpColor('#93a7ff', '#93a7ff', 0), nightF);
    const sunAngle = ((hour - 6) / 12) * Math.PI;
    const dir = new THREE.Vector3(Math.cos(sunAngle) * 0.7, Math.sin(sunAngle) * 0.8 + 0.25, 0.45).normalize();
    const player = game.player;
    sun.position.set(player.x + dir.x * 1000, dir.y * 1000 + 120, player.y + dir.z * 1000);
    sun.target.position.set(player.x, 0, player.y);
    // Streetlamps: the day/night cycle's glow value drives the points.
    if (dyn.lampGlow) {
      const glow = game.daynight ? game.daynight.lampGlow : nightF;
      dyn.lampGlow.material.opacity = Math.min(1, Math.max(0, glow)) * 0.9;
    }
    // Headlights after dark, from the player's car.
    if (!player.onFoot && player.car) {
      const car = player.car;
      headlight.intensity = nightF * 120;
      headlight.position.set(car.x + Math.cos(car.angle) * 20, 14, car.y + Math.sin(car.angle) * 20);
      headlight.target.position.set(car.x + Math.cos(car.angle) * 260, 0, car.y + Math.sin(car.angle) * 260);
    } else headlight.intensity = 0;
    // Helicopter searchlight after dark.
    if (game.heli) {
      heliLight.intensity = nightF * 90;
      heliLight.position.set(game.heli.x, 185, game.heli.y);
      heliLight.target.position.set(player.x, 0, player.y);
    } else heliLight.intensity = 0;
    // Police light bar glow: the nearest cruiser flashes red/blue.
    if (game.policeCars.length) {
      let nearest = game.policeCars[0];
      let best = Infinity;
      for (const pc of game.policeCars) {
        const d = Math.hypot(pc.x - player.x, pc.y - player.y);
        if (d < best) { best = d; nearest = pc; }
      }
      const phase = Math.floor(game.time * 3) % 2 === 0;
      flashLight.color.setHex(phase ? 0xff3b30 : 0x3d7bfd);
      flashLight.intensity = 26;
      flashLight.position.set(nearest.x, 30, nearest.y);
    } else flashLight.intensity = 0;
    // Rain, stars and the moon ride the sky the cycle and the weather made.
    ensureSkyFx(game);
    const rainStrength = game.weather ? weatherRain(game.weather) : 0;
    if (dyn.rain) {
      dyn.rain.material.opacity = rainStrength * 0.55;
      if (rainStrength > 0 && dyn.rainPos) {
        for (let i = 0; i < dyn.rainPos.length; i += 3) {
          dyn.rainPos[i + 1] -= 620 * dt;
          if (dyn.rainPos[i + 1] < 0) {
            dyn.rainPos[i] = player.x + (Math.random() * 2 - 1) * 700;
            dyn.rainPos[i + 1] = 650 + Math.random() * 50;
            dyn.rainPos[i + 2] = player.y + (Math.random() * 2 - 1) * 700;
          }
        }
        dyn.rain.geometry.attributes.position.needsUpdate = true;
      }
    }
    // Stars fade in with the dark; the moon rides its nightly arc, low
    // ahead of the player so it stays inside the chase camera's frame.
    if (dyn.stars) dyn.stars.material.opacity = nightF * 0.9;
    const moonAngle = moonAngleFor(game.clock);
    if (dyn.moon) {
      if (moonAngle === null) {
        dyn.moon.visible = false;
      } else {
        dyn.moon.visible = true;
        dyn.moon.position.set(
          player.x + Math.cos(player.angle) * 1100,
          160 + Math.sin(moonAngle) * 120,
          player.y + Math.sin(player.angle) * 1100,
        );
        dyn.moon.material.opacity = nightF > 0.05 ? 0.95 : 0;
      }
    }
  }

  /** Screen (CSS px) to world coordinates, for mouse aiming. */
  function screenToWorld(sx, sy, game) {
    const nx = (((sx - viewX) / viewScale) / VIEW.width) * 2 - 1;
    const ny = -((((sy - viewY) / viewScale) / VIEW.height) * 2 - 1);
    raycaster.setFromCamera({ x: nx, y: ny }, camera);
    const o = raycaster.ray.origin;
    const d = raycaster.ray.direction;
    if (Math.abs(d.y) < 1e-6) return { x: game.player.x, y: game.player.y };
    const t = -o.y / d.y;
    return { x: o.x + d.x * t, y: o.z + d.z * t };
  }

  function hudTransform() {
    hudCtx.setTransform(viewScale, 0, 0, viewScale, viewX, viewY);
  }

  function overlay(title, lines, hint) {
    hudTransform();
    hudCtx.fillStyle = 'rgba(10, 16, 24, 0.72)';
    hudCtx.fillRect(0, 0, VIEW.width, VIEW.height);
    hudCtx.textAlign = 'center';
    hudCtx.fillStyle = PALETTE.hudAccent;
    hudCtx.font = `800 64px ${FONT_DISPLAY}`;
    hudCtx.fillText(title, VIEW.width / 2, 250);
    hudCtx.fillStyle = PALETTE.text;
    hudCtx.font = `400 20px ${FONT}`;
    lines.forEach((line, i) => hudCtx.fillText(line, VIEW.width / 2, 310 + i * 32));
    if (hint) {
      hudCtx.fillStyle = PALETTE.muted;
      hudCtx.font = `600 17px ${FONT}`;
      hudCtx.fillText(hint, VIEW.width / 2, 310 + lines.length * 32 + 34);
    }
    hudCtx.textAlign = 'left';
  }

  function drawTitle(game) {
    hudTransform();
    hudCtx.fillStyle = 'rgba(10, 16, 24, 0.45)';
    hudCtx.fillRect(0, 0, VIEW.width, VIEW.height);
    hudCtx.textAlign = 'center';
    hudCtx.fillStyle = '#ffb347';
    hudCtx.beginPath();
    hudCtx.arc(VIEW.width / 2, 168, 52, 0, Math.PI * 2);
    hudCtx.fill();
    hudCtx.fillStyle = '#ff7a3d';
    hudCtx.beginPath();
    hudCtx.arc(VIEW.width / 2, 168, 52, 0, Math.PI);
    hudCtx.fill();
    hudCtx.fillStyle = '#fff3d6';
    hudCtx.font = `800 84px ${FONT_DISPLAY}`;
    hudCtx.fillText('SOLMAR HEAT', VIEW.width / 2, 300);
    hudCtx.fillStyle = PALETTE.text;
    hudCtx.font = `400 22px ${FONT}`;
    hudCtx.fillText('Streets of the Sun — an open-world crime story in 3D', VIEW.width / 2, 342);
    hudCtx.fillStyle = PALETTE.muted;
    hudCtx.font = `400 17px ${FONT}`;
    hudCtx.fillText('Steal cars. Outrun the SCPD and Air One. Run Mara\'s jobs. Own the city.', VIEW.width / 2, 380);
    hudCtx.fillStyle = '#20242c';
    hudCtx.beginPath();
    hudCtx.roundRect(VIEW.width / 2 - 190, 420, 380, 54, 12);
    hudCtx.fill();
    hudCtx.fillStyle = '#ffd94a';
    hudCtx.font = `700 22px ${FONT_DISPLAY}`;
    hudCtx.fillText(game.hasSave ? 'CONTINUE  —  press SPACE' : 'NEW GAME  —  press SPACE', VIEW.width / 2, 455);
    hudCtx.fillStyle = PALETTE.muted;
    hudCtx.font = `400 15px ${FONT}`;
    hudCtx.fillText('WASD drive & walk  ·  E enter / steal car  ·  F punch  ·  mouse aim, click shoot  ·  Q weapon  ·  R radio  ·  N nitro  ·  P pause  ·  M mute', VIEW.width / 2, 520);
    hudCtx.fillText('10 story missions  ·  street races  ·  Air One heli  ·  radio  ·  garage upgrades & nitro  ·  day / night  ·  respect ranks  ·  10 hidden packages', VIEW.width / 2, 546);
    hudCtx.textAlign = 'left';
  }

  return {
    resize,
    screenToWorld,
    draw(game, screen) {
      const now = performance.now();
      const dt = Math.min(0.05, Math.max(0.001, (now - lastNow) / 1000));
      lastNow = now;
      ensureCity(game);
      syncDynamic(game);
      updateLighting(game, dt);
      updateCamera(game, dt, screen);
      renderer.render(scene, camera);
      // HUD on its own canvas, cleared every frame.
      hudCtx.setTransform(1, 0, 0, 1, 0, 0);
      hudCtx.clearRect(0, 0, hudCanvas.width, hudCanvas.height);
      if (screen === SCREEN_TITLE) {
        drawTitle(game);
        return;
      }
      hudTransform();
      drawHud(hudCtx, game);
      // Lightning: a white flash over the HUD when the sky strikes.
      if (game.weather && game.weather.flash > 0) {
        hudCtx.fillStyle = `rgba(255, 255, 255, ${game.weather.flash * 0.3})`;
        hudCtx.fillRect(0, 0, VIEW.width, VIEW.height);
      }
      // Hurt flash over the HUD.
      if (game.player.hurtFlash > 0) {
        hudCtx.fillStyle = `rgba(255, 40, 30, ${game.player.hurtFlash * 0.4})`;
        hudCtx.fillRect(0, 0, VIEW.width, VIEW.height);
      }
      if (screen === SCREEN_PAUSED) {
        // The pause screen is the career's record: every stat the loop
        // tracked, so the player can see how far Leo has come.
        const rows = statsRows(game.stats).map((row) => `${row.label}: ${row.value}`);
        const marks = statsMilestones(game.stats);
        const lines = ['Take a breath, Leo. Solmar waits.', '', ...rows];
        if (marks.length) lines.push('', ...marks.map((m) => `★ ${m}`));
        overlay('PAUSED', lines, 'SPACE to resume · the game saves on mission complete');
      } else if (screen === SCREEN_BUSTED) {
        overlay('BUSTED', ['The SCPD took you in.', `Fine: $${bustedPenalty(game.upgrades)}. The story continues.`], 'SPACE to walk free');
      } else if (screen === SCREEN_WASTED) {
        overlay('WASTED', ['Solmar is unforgiving.', `You wake up at Clinica Sol, $${bustedPenalty(game.upgrades)} lighter.`], 'SPACE to get back up');
      } else if (screen === SCREEN_WIN) {
        overlay('SOLMAR LEGEND', ['Every job done. Every star outrun.', 'The city is yours, Leo.'], 'SPACE to keep playing the city');
      }
    },
  };
}
