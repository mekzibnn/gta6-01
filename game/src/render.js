// Three.js world — sunset sky, sun disc, clouds, city, cars, peds,
// cops, Air One, wrecks. Low-poly, Lambert materials, no shadows
// (SwiftShader stays fast enough for the headless playtest).
import * as THREE from '../vendor/three.module.min.js';
import { sunHeight } from './daynight.js';

const W = 1280, H = 720;

function skyTexture() {
  const cv = document.createElement('canvas');
  cv.width = 4; cv.height = 256;
  const c = cv.getContext('2d');
  const gr = c.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#160a2e');
  gr.addColorStop(0.35, '#7b2d8b');
  gr.addColorStop(0.55, '#ff7e5f');
  gr.addColorStop(0.75, '#feb47b');
  gr.addColorStop(1, '#ff9a5c');
  c.fillStyle = gr; c.fillRect(0, 0, 4, 256);
  return new THREE.CanvasTexture(cv);
}
function windowTexture() {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 256;
  const c = cv.getContext('2d');
  c.fillStyle = '#ffffff'; c.fillRect(0, 0, 128, 256);
  for (let y = 12; y < 236; y += 26) {
    for (let x = 10; x < 116; x += 22) {
      const lit = ((x * 7 + y * 13) % 5) < 2;
      c.fillStyle = lit ? '#ffd166' : '#232833';
      c.fillRect(x, y, 14, 17);
    }
  }
  return new THREE.CanvasTexture(cv);
}
function roadTexture() {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 128;
  const c = cv.getContext('2d');
  c.fillStyle = '#232326'; c.fillRect(0, 0, 128, 128);
  c.fillStyle = '#e8e8e8'; c.fillRect(61, 10, 6, 46);
  c.fillStyle = '#c9a227'; c.fillRect(4, 0, 3, 128); c.fillRect(121, 0, 3, 128);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const carBodyGeo = new THREE.BoxGeometry(2.0, 0.8, 4.2);
const carCabinGeo = new THREE.BoxGeometry(1.7, 0.7, 2.2);
const carAxleGeo = new THREE.BoxGeometry(2.1, 0.5, 0.7);
const pedBodyGeo = new THREE.BoxGeometry(0.62, 1.15, 0.42);
const pedHeadGeo = new THREE.SphereGeometry(0.27, 10, 8);
const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 6, 6);
const crownGeo = new THREE.ConeGeometry(2.1, 2.6, 7);
const lampPoleGeo = new THREE.CylinderGeometry(0.09, 0.12, 5.5, 6);
const lampBulbGeo = new THREE.SphereGeometry(0.32, 8, 6);
const cloudPuffGeo = new THREE.SphereGeometry(1, 10, 8);
const smokeGeo = new THREE.SphereGeometry(1.4, 8, 6);
const boomGeo = new THREE.SphereGeometry(1, 12, 10);

function mesh(geo, mat, x, y, z) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  return m;
}

export function initRender(g, canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.setSize(W, H, false);
  renderer.setPixelRatio(1);
  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x2a1a2e, 140, 480);
  const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 1200);
  camera.position.set(0, 8, 88);

  scene.add(new THREE.AmbientLight(0xffe0c0, 0.75));
  const sunLight = new THREE.DirectionalLight(0xffb36b, 1.15);
  sunLight.position.set(60, 140, -80);
  scene.add(sunLight);
  const moonLight = new THREE.DirectionalLight(0x8fb4ff, 0.25);
  moonLight.position.set(-40, 90, 60);
  scene.add(moonLight);

  // Sky dome — a gradient that is never flat orange.
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(760, 24, 16),
    new THREE.MeshBasicMaterial({ map: skyTexture(), side: THREE.BackSide, fog: false }),
  );
  scene.add(sky);

  // Sun disc — bright yellow, drawn on top, camera-relative every frame.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(22, 40),
    new THREE.MeshBasicMaterial({ color: 0xffc21a, depthTest: false, transparent: true, opacity: 0.98, fog: false }),
  );
  sunDisc.renderOrder = 999;
  scene.add(sunDisc);
  const sunGlow = new THREE.Mesh(
    new THREE.CircleGeometry(36, 40),
    new THREE.MeshBasicMaterial({ color: 0xffc21a, depthTest: false, transparent: true, opacity: 0.22, fog: false }),
  );
  sunGlow.renderOrder = 998;
  scene.add(sunGlow);
  // Moon for the night shots.
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(13, 32),
    new THREE.MeshBasicMaterial({ color: 0xf4f6ff, depthTest: false, transparent: true, opacity: 0.95, fog: false }),
  );
  moon.renderOrder = 999;
  moon.visible = false;
  scene.add(moon);

  // Clouds — ten white puffs, Basic material, drifting slowly.
  // They hang low enough (y 36-50) to sit in the sky band of the
  // near-level chase camera instead of above the frame.
  const clouds = [];
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88, fog: false });
  for (let i = 0; i < 10; i += 1) {
    const grp = new THREE.Group();
    const n = 2 + (i % 2);
    for (let k = 0; k < n; k += 1) {
      const puff = mesh(cloudPuffGeo, cloudMat, k * 4 - 3, 0, (k % 2) * 2 - 1);
      puff.scale.set(4.5, 1.5, 3);
      grp.add(puff);
    }
    grp.position.set(g.rng.range(-260, 220), g.rng.range(36, 50), g.rng.range(-190, 190));
    scene.add(grp);
    clouds.push(grp);
  }

  // Ground: concrete base, beach sand to the west, sea beyond it.
  const base = mesh(new THREE.PlaneGeometry(620, 620), new THREE.MeshLambertMaterial({ color: 0x4b4b55 }), 0, -0.1, 0);
  base.rotation.x = -Math.PI / 2;
  scene.add(base);
  const sand = mesh(new THREE.PlaneGeometry(90, 620), new THREE.MeshLambertMaterial({ color: 0xe8d5a3 }), -222, 0.05, 0);
  sand.rotation.x = -Math.PI / 2;
  scene.add(sand);
  const sea = mesh(new THREE.PlaneGeometry(320, 620), new THREE.MeshLambertMaterial({ color: 0x1e6f9e }), -430, 0.1, 0);
  sea.rotation.x = -Math.PI / 2;
  scene.add(sea);

  // Roads with dashed centres, sidewalks, crosswalks.
  const roadTex = roadTexture();
  const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
  const walkMat = new THREE.MeshLambertMaterial({ color: 0x6b6b72 });
  const stripeMat = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 });
  for (const x of g.city.avenues) {
    const r = mesh(new THREE.PlaneGeometry(14, 380), roadMat, x, 0, 0);
    r.rotation.x = -Math.PI / 2;
    r.material = roadMat.clone();
    r.material.map = roadTex.clone();
    r.material.map.repeat.set(1, 12);
    r.material.map.needsUpdate = true;
    scene.add(r);
    for (const s of [-1, 1]) {
      const w = mesh(new THREE.PlaneGeometry(4, 380), walkMat, x + s * 9, 0.02, 0);
      w.rotation.x = -Math.PI / 2;
      scene.add(w);
    }
  }
  for (const z of g.city.streets) {
    const r = mesh(new THREE.PlaneGeometry(380, 14), roadMat, 0, 0, z);
    r.rotation.x = -Math.PI / 2;
    r.material = roadMat.clone();
    r.material.map = roadTex.clone();
    r.material.map.repeat.set(12, 1);
    r.material.map.needsUpdate = true;
    scene.add(r);
    for (const s of [-1, 1]) {
      const w = mesh(new THREE.PlaneGeometry(380, 4), walkMat, 0, 0.02, z + s * 9);
      w.rotation.x = -Math.PI / 2;
      scene.add(w);
    }
  }
  for (const [cx, cz] of [[0, 0], [0, 100], [75, 0], [-75, 75]]) {
    for (let i = -2; i <= 2; i += 1) {
      const s = mesh(new THREE.PlaneGeometry(2.2, 10), stripeMat, cx + i * 3, 0.04, cz);
      s.rotation.x = -Math.PI / 2;
      scene.add(s);
    }
  }

  // Buildings — sunset palette, lit windows, one material per colour.
  const winTex = windowTexture();
  const buildMats = {};
  const roofMat = new THREE.MeshLambertMaterial({ color: 0x2b2b33 });
  for (const b of g.city.buildings) {
    if (!buildMats[b.color]) {
      buildMats[b.color] = new THREE.MeshLambertMaterial({ color: b.color, map: winTex });
    }
    const m = new THREE.Mesh(boxGeo, [buildMats[b.color], buildMats[b.color], roofMat, roofMat, buildMats[b.color], buildMats[b.color]]);
    m.scale.set(b.w, b.h, b.d);
    m.position.set(b.x, b.h / 2, b.z);
    m.rotation.y = b.rot;
    scene.add(m);
  }

  // Palms, umbrellas, lamps.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8b5a2b });
  const crownMat = new THREE.MeshLambertMaterial({ color: 0x2d9d4e });
  for (const p of g.city.palms) {
    const grp = new THREE.Group();
    grp.add(mesh(trunkGeo, trunkMat, 0, 3, 0));
    const crown = mesh(crownGeo, crownMat, 0, 7, 0);
    grp.add(crown);
    grp.position.set(p.x, 0, p.z);
    scene.add(grp);
  }
  for (const u of g.city.umbrellas) {
    const grp = new THREE.Group();
    grp.add(mesh(new THREE.CylinderGeometry(0.08, 0.08, 3.4, 6), new THREE.MeshLambertMaterial({ color: 0xdddddd }), 0, 1.7, 0));
    const top = mesh(new THREE.ConeGeometry(2.6, 1.1, 8), new THREE.MeshLambertMaterial({ color: u.color }), 0, 3.6, 0);
    grp.add(top);
    grp.position.set(u.x, 0, u.z);
    scene.add(grp);
  }
  const lampBulbs = [];
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x3a3a42 });
  for (const l of g.city.lamps) {
    const grp = new THREE.Group();
    grp.add(mesh(lampPoleGeo, poleMat, 0, 2.75, 0));
    const bulb = mesh(lampBulbGeo, new THREE.MeshBasicMaterial({ color: 0x555560 }), 0, 5.6, 0);
    grp.add(bulb);
    grp.position.set(l.x, 0, l.z);
    scene.add(grp);
    lampBulbs.push(bulb);
  }

  const dyn = new THREE.Group();
  scene.add(dyn);

  g.render = {
    renderer, scene, camera, sunLight, moonLight,
    sunDisc, sunGlow, moon, clouds, lampBulbs, dyn,
    carMeshes: new Map(), pedMeshes: new Map(), copMeshes: new Map(),
    wreckMeshes: new Map(), boomMeshes: new Map(), heliMesh: null,
    camPos: new THREE.Vector3(0, 8, 88),
  };
}

function carMesh(g, car) {
  const grp = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: car.color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x14142a });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  grp.add(mesh(carBodyGeo, bodyMat, 0, 0.55, 0));
  grp.add(mesh(carCabinGeo, glassMat, 0, 1.2, -0.2));
  grp.add(mesh(carAxleGeo, darkMat, 0, 0.25, 1.4));
  grp.add(mesh(carAxleGeo, darkMat, 0, 0.25, -1.4));
  return grp;
}
function copMesh(g, cop) {
  const grp = carMesh(g, { color: 0xf8f9fa });
  const red = mesh(new THREE.BoxGeometry(0.5, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2222 }), -0.4, 1.7, -0.2);
  const blue = mesh(new THREE.BoxGeometry(0.5, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0x2244ff }), 0.4, 1.7, -0.2);
  grp.add(red); grp.add(blue);
  return grp;
}
function pedMesh(g, ped) {
  const grp = new THREE.Group();
  grp.add(mesh(pedBodyGeo, new THREE.MeshLambertMaterial({ color: ped.color }), 0, 0.85, 0));
  grp.add(mesh(pedHeadGeo, new THREE.MeshLambertMaterial({ color: 0xf2c89b }), 0, 1.7, 0));
  return grp;
}
function heliMesh(g) {
  const grp = new THREE.Group();
  const bodyMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const body = mesh(new THREE.BoxGeometry(3.4, 1.6, 5.4), bodyMat, 0, 0, 0);
  grp.add(body);
  const stripe = mesh(new THREE.BoxGeometry(3.5, 0.35, 2.2), new THREE.MeshBasicMaterial({ color: 0xd90429 }), 0, 0.2, 0.4);
  grp.add(stripe);
  const tail = mesh(new THREE.BoxGeometry(0.7, 0.7, 4.4), bodyMat, 0, 0.3, -4.4);
  grp.add(tail);
  const rotor = new THREE.Group();
  rotor.name = 'rotor';
  rotor.add(mesh(new THREE.BoxGeometry(11, 0.12, 0.5), darkMat, 0, 0, 0));
  rotor.add(mesh(new THREE.BoxGeometry(0.5, 0.12, 11), darkMat, 0, 0, 0));
  rotor.position.set(0, 1.1, 0);
  grp.add(rotor);
  // Nose details so the heli reads from the front too: dark
  // windshield band above a red nose band (the side stripe is
  // edge-on from dead ahead).
  const shield = mesh(new THREE.BoxGeometry(2.6, 0.6, 0.15), new THREE.MeshLambertMaterial({ color: 0x14142a }), 0, 0.45, 2.75);
  grp.add(shield);
  const noseBand = mesh(new THREE.BoxGeometry(3.0, 0.35, 0.15), new THREE.MeshBasicMaterial({ color: 0xd90429 }), 0, -0.15, 2.75);
  grp.add(noseBand);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 15, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff6c9, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
  );
  cone.position.set(0, -7.5, 2);
  grp.add(cone);
  grp.scale.setScalar(1.6);
  return grp;
}
function wreckMesh(g, wreck) {
  // A burning car, not a black box with a cone: charred body + cabin
  // + axles so the silhouette reads as a car, and flames sized to
  // the car (about 1.5x its height) spread along its length so the
  // body stays visible instead of drowning under one giant cone.
  const grp = new THREE.Group();
  const charMat = new THREE.MeshLambertMaterial({ color: 0x181818 });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x0a0a12 });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const body = mesh(new THREE.BoxGeometry(2.0, 0.8, 4.2), charMat, 0, 0.5, 0);
  body.rotation.z = 0.22;
  grp.add(body);
  const cabin = mesh(new THREE.BoxGeometry(1.7, 0.7, 2.2), glassMat, 0, 1.15, -0.2);
  cabin.rotation.z = 0.22;
  grp.add(cabin);
  grp.add(mesh(carAxleGeo, darkMat, 0, 0.25, 1.4));
  grp.add(mesh(carAxleGeo, darkMat, 0, 0.25, -1.4));
  const flame = mesh(new THREE.ConeGeometry(1.0, 2.2, 8), new THREE.MeshBasicMaterial({ color: 0xff6d00, transparent: true, opacity: 0.95 }), 0, 1.9, 1.2);
  flame.name = 'flame';
  grp.add(flame);
  const flame2 = mesh(new THREE.ConeGeometry(0.6, 1.4, 8), new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.9 }), 0, 1.6, 1.2);
  flame2.name = 'flame2';
  grp.add(flame2);
  const flame3 = mesh(new THREE.ConeGeometry(0.65, 1.5, 8), new THREE.MeshBasicMaterial({ color: 0xff6d00, transparent: true, opacity: 0.9 }), 0, 1.4, -1.3);
  flame3.name = 'flame3';
  grp.add(flame3);
  const smoke = mesh(smokeGeo, new THREE.MeshBasicMaterial({ color: 0x555555, transparent: true, opacity: 0.4 }), 0, 4, 0);
  smoke.name = 'smoke';
  grp.add(smoke);
  const smoke2 = mesh(new THREE.SphereGeometry(1.6, 8, 6), new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.45 }), 0, 7.0, -0.5);
  smoke2.name = 'smoke2';
  grp.add(smoke2);
  return grp;
}

function syncMeshes(g, map, items, factory) {
  const seen = new Set();
  for (const it of items) {
    const key = it.id !== undefined ? it.id : `${it.x}:${it.z}`;
    seen.add(key);
    let m = map.get(key);
    if (!m) {
      m = factory(g, it);
      map.set(key, m);
      g.render.dyn.add(m);
    }
    m.position.set(it.x, 0, it.z);
    m.rotation.y = it.heading || 0;
    if (it === g.car) m.position.y = 0;
  }
  for (const [key, m] of [...map.entries()]) {
    if (!seen.has(key)) {
      g.render.dyn.remove(m);
      map.delete(key);
    }
  }
}

export function drawFrame(g, dt) {
  const r = g.render;
  const p = g.player;
  const focus = g.car || null;
  const tx = focus ? focus.x : p.x;
  const tz = focus ? focus.z : p.z;
  const heading = focus ? focus.heading : p.heading;
  const fx = Math.sin(heading), fz = Math.cos(heading);

  // Chase camera — behind the car, looking down the avenue.
  const wantX = tx - fx * 13, wantZ = tz - fz * 13;
  r.camPos.x += (wantX - r.camPos.x) * 0.12;
  r.camPos.z += (wantZ - r.camPos.z) * 0.12;
  r.camPos.y += (6.5 - r.camPos.y) * 0.12;
  r.camera.position.copy(r.camPos);
  // Look almost level (y=6) so the golden-hour sun (y=120, dead ahead)
  // lands in open sky below the banner and the clock plate, not behind them.
  r.camera.lookAt(tx + fx * 10, 6, tz + fz * 10);

  // Sun — golden hour hangs at 120, midday at 170, night hides it.
  const sy = sunHeight(g.clock.hour);
  const sunOn = sy > 0;
  const fwd = new THREE.Vector3();
  r.camera.getWorldDirection(fwd);
  const sunPos = r.camera.position.clone().addScaledVector(fwd, 420);
  sunPos.y = sy;
  r.sunDisc.position.copy(sunPos);
  r.sunDisc.lookAt(r.camera.position);
  r.sunDisc.visible = sunOn;
  r.sunGlow.position.copy(sunPos);
  r.sunGlow.lookAt(r.camera.position);
  r.sunGlow.visible = sunOn;
  r.moon.visible = !sunOn;
  if (!sunOn) {
    const moonPos = r.camera.position.clone().addScaledVector(fwd, 420);
    moonPos.y = 130;
    r.moon.position.copy(moonPos);
    r.moon.lookAt(r.camera.position);
  }
  r.sunLight.intensity = sunOn ? 1.15 : 0.35;
  r.moonLight.intensity = sunOn ? 0.25 : 0.7;

  // Clouds drift with the wind.
  for (const c of r.clouds) {
    c.position.x += dt * 0.9;
    if (c.position.x > 300) c.position.x = -300;
  }
  // Lamps glow after dark.
  const lampColor = g.clock.lampGlow > 0.5 ? 0xffd166 : 0x555560;
  for (const b of r.lampBulbs) b.material.color.setHex(lampColor);

  // Dynamic meshes — cars, peds, cops, heli, wrecks, booms.
  syncMeshes(g, r.carMeshes, g.cars, carMesh);
  syncMeshes(g, r.pedMeshes, g.peds, pedMesh);
  syncMeshes(g, r.copMeshes, g.cops, copMesh);
  if (g.heli) {
    if (!r.heliMesh) { r.heliMesh = heliMesh(g); r.dyn.add(r.heliMesh); }
    r.heliMesh.position.set(g.heli.x, g.heli.y, g.heli.z);
    r.heliMesh.rotation.y = g.heli.angle + Math.PI / 2;
    const rotor = r.heliMesh.getObjectByName('rotor');
    if (rotor) rotor.rotation.y = g.heli.rotor;
    r.heliMesh.visible = true;
  } else if (r.heliMesh) {
    r.heliMesh.visible = false;
  }
  syncMeshes(g, r.wreckMeshes, g.wrecks, wreckMesh);
  for (const [key, m] of r.wreckMeshes.entries()) {
    const w = g.wrecks.find((x) => `${x.x}:${x.z}` === key);
    if (!w) continue;
    const flame = m.getObjectByName('flame');
    const flame2 = m.getObjectByName('flame2');
    const flame3 = m.getObjectByName('flame3');
    const smoke = m.getObjectByName('smoke');
    const pulse = 1 + Math.sin(w.t * 9 + key.length) * 0.25;
    if (flame) flame.scale.set(pulse, pulse * (1 + Math.sin(w.t * 7) * 0.2), pulse);
    if (flame2) flame2.scale.setScalar(pulse);
    if (flame3) flame3.scale.setScalar(pulse * 0.9);
    // The animated puff fades gently (never to zero) so the fire
    // keeps a smoke column at any age; smoke2 is static.
    if (smoke) { smoke.position.y = 4 + (w.t % 3); smoke.material.opacity = 0.45 * (1 - (w.t % 3) / 6); }
  }
  syncMeshes(g, r.boomMeshes, g.booms, (gg, b) => {
    const m = new THREE.Mesh(boomGeo, new THREE.MeshBasicMaterial({ color: 0xff7b00, transparent: true, opacity: 0.9 }));
    m.position.y = 1;
    return m;
  });
  for (const [key, m] of r.boomMeshes.entries()) {
    const b = g.booms.find((x) => `${x.x}:${x.z}` === key);
    if (!b) continue;
    m.scale.setScalar(2 + b.t * 9);
    m.material.opacity = Math.max(0, 0.9 - b.t * 0.55);
    m.position.y = 1 + b.t * 2;
  }

  r.renderer.render(r.scene, r.camera);
}
