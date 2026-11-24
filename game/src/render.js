// Solmar Heat v12 — Three.js renderer: city, cars, peds, cops, heli, wrecks, sky.
import * as THREE from 'three';
import { PALETTE } from './config.js';

function makeGroundTexture() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1024;
  const ctx = cv.getContext('2d');
  const k = 1024 / 440;
  const X = (x) => (x + 220) * k;
  ctx.fillStyle = '#43484f';
  ctx.fillRect(0, 0, 1024, 1024);
  // Sand east of the beach road.
  ctx.fillStyle = '#c9b183';
  ctx.fillRect(X(165), 0, 1024 - X(165), 1024);
  // Water far east.
  ctx.fillStyle = '#2e7f9e';
  ctx.fillRect(X(195), 0, 1024 - X(195), 1024);
  // Sidewalk blocks between roads.
  ctx.fillStyle = '#565b64';
  for (let bx = -212; bx <= 212; bx += 75) {
    for (let bz = -212; bz <= 212; bz += 75) {
      ctx.fillRect(X(bx), X(bz), 50 * k, 50 * k);
    }
  }
  // Roads.
  ctx.fillStyle = '#23262c';
  for (const r of [-150, -75, 0, 75, 150]) {
    ctx.fillRect(X(r - 5), 0, 10 * k, 1024);
    ctx.fillRect(0, X(r - 5), 1024, 10 * k);
  }
  // Centre dashes.
  ctx.fillStyle = '#f2b705';
  for (const r of [-150, -75, 0, 75, 150]) {
    for (let d = -210; d < 210; d += 16) {
      ctx.fillRect(X(r - 0.4), X(d), 0.8 * k, 7 * k);
      ctx.fillRect(X(d), X(r - 0.4), 7 * k, 0.8 * k);
    }
  }
  // Crosswalks at intersections.
  ctx.fillStyle = '#e8e8e8';
  for (const rx of [-150, -75, 0, 75, 150]) {
    for (const rz of [-150, -75, 0, 75, 150]) {
      for (let s = -4; s <= 4; s += 2) {
        ctx.fillRect(X(rx + s - 0.7), X(rz - 6), 1.4 * k, 3 * k);
        ctx.fillRect(X(rx + s - 0.7), X(rz + 3), 1.4 * k, 3 * k);
      }
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeWindowTexture() {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 256;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#cfcfcf';
  ctx.fillRect(0, 0, 128, 256);
  for (let y = 12; y < 244; y += 24) {
    for (let x = 10; x < 118; x += 22) {
      ctx.fillStyle = (x + y) % 48 === 0 ? '#ffd98a' : '#3a3f4a';
      ctx.fillRect(x, y, 14, 16);
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const CAR_COLORS = { sedan: 0xd94f3d, taxi: 0xf2b705, sport: 0x3d7bd9, van: 0xe8e8e8, truck: 0x2f6b4f, motorcycle: 0x111111, pickup: 0x7a5c9e };

function makeCarMesh(car) {
  const grp = new THREE.Group();
  const bodyGeo = new THREE.BoxGeometry(car.model === 'motorcycle' ? 0.9 : 2, car.model === 'sport' ? 0.6 : 0.75, car.model === 'motorcycle' ? 2.6 : 4.2);
  const bodyMat = new THREE.MeshLambertMaterial({ color: car.color || CAR_COLORS[car.model] || 0xcccccc });
  const body = new THREE.Mesh(bodyGeo, bodyMat);
  body.position.y = 0.55;
  grp.add(body);
  const cabGeo = new THREE.BoxGeometry(car.model === 'motorcycle' ? 0.7 : 1.7, 0.55, car.model === 'motorcycle' ? 1 : 2.1);
  const cab = new THREE.Mesh(cabGeo, new THREE.MeshLambertMaterial({ color: 0x1c2733 }));
  cab.position.set(0, 1.15, -0.2);
  grp.add(cab);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.22, 4.25), new THREE.MeshLambertMaterial({ color: 0x111111 }));
  skirt.position.y = 0.22;
  grp.add(skirt);
  grp.userData.bodyMat = bodyMat;
  grp.userData.model = car.model;
  return grp;
}

export function buildRender(g) {
  const state = { enabled: false, clouds: [], sunDisc: null };
  g.render = state;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'low-power' });
  } catch {
    return state;
  }
  renderer.setSize(960, 540, false); // backing store; CSS (width/height 100%) upscales to 1280x720.
  // updateStyle=false is REQUIRED: setSize's default inline style (960x540)
  // would override the CSS and leave the right/bottom of the frame black.
  renderer.setPixelRatio(1); // SwiftShader is slow at full res; HUD stays crisp DOM.
  const app = document.getElementById('app');
  app.innerHTML = '';
  app.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x79c7e8);
  scene.fog = new THREE.Fog(0x79c7e8, 120, 420);
  const camera = new THREE.PerspectiveCamera(58, 1280 / 720, 0.1, 1200);
  camera.position.set(0, 10, 80);
  const amb = new THREE.AmbientLight(0xffffff, 0.8);
  scene.add(amb);
  const sun = new THREE.DirectionalLight(0xffe0b3, 1.1);
  sun.position.set(60, 120, 200);
  scene.add(sun);
  // Ground with the painted city map.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(440, 440), new THREE.MeshLambertMaterial({ map: makeGroundTexture() }));
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);
  // Ocean plane east of the beach.
  const ocean = new THREE.Mesh(new THREE.PlaneGeometry(70, 440), new THREE.MeshLambertMaterial({ color: 0x2e7f9e }));
  ocean.rotation.x = -Math.PI / 2;
  ocean.position.set(230, -0.4, 0);
  scene.add(ocean);
  // Buildings.
  const winTex = makeWindowTexture();
  for (const b of g.city.buildings) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), new THREE.MeshLambertMaterial({ map: winTex, color: b.color }));
    m.position.set(b.x, b.h / 2, b.z);
    scene.add(m);
  }
  // Palms: trunk + cone foliage.
  const trunkGeo = new THREE.CylinderGeometry(0.22, 0.3, 5, 6);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const folGeo = new THREE.ConeGeometry(2.2, 3.4, 7);
  const folMat = new THREE.MeshLambertMaterial({ color: 0x2f7d3a });
  for (const p of g.city.palms) {
    const t = new THREE.Mesh(trunkGeo, trunkMat);
    t.position.set(p.x, 2.5, p.z);
    scene.add(t);
    const f = new THREE.Mesh(folGeo, folMat);
    f.position.set(p.x, 5.6, p.z);
    scene.add(f);
  }
  // Beach umbrellas.
  for (const u of g.city.umbrellas) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 2.4, 5), new THREE.MeshLambertMaterial({ color: 0xeeeeee }));
    pole.position.set(u.x, 1.2, u.z);
    scene.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.2, 1, 8), new THREE.MeshLambertMaterial({ color: u.color }));
    top.position.set(u.x, 2.8, u.z);
    scene.add(top);
  }
  // Street lamps.
  const lampHeads = [];
  const poleGeo = new THREE.CylinderGeometry(0.1, 0.12, 5.5, 5);
  const poleMat = new THREE.MeshLambertMaterial({ color: 0x222226 });
  for (let i = 0; i < 12; i += 1) {
    const x = i % 2 === 0 ? -7 : 7;
    const z = -150 + Math.floor(i / 2) * 60;
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 2.75, z);
    scene.add(pole);
    const headMat = new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0xffdf80, emissiveIntensity: 0 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), headMat);
    head.position.set(x, 5.6, z);
    scene.add(head);
    lampHeads.push(headMat);
  }
  // Clouds — exactly 10 (playtest pins this).
  for (let i = 0; i < 10; i += 1) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshLambertMaterial({ color: 0xffffff }));
    c.scale.set(7 + (i % 3) * 2, 1.6, 3.5 + (i % 2));
    c.position.set(-180 + i * 38, 36 + (i % 4) * 4, 180 - (i % 5) * 40);
    scene.add(c);
    state.clouds.push(c);
  }
  // Sun disc + glow (north sky, visible from the cover camera).
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(15, 32), new THREE.MeshBasicMaterial({ color: 0xffd94d, fog: false }));
  sunDisc.position.set(0, 72, 330);
  scene.add(sunDisc);
  const glow = new THREE.Mesh(new THREE.CircleGeometry(24, 32), new THREE.MeshBasicMaterial({ color: 0xffdf80, transparent: true, opacity: 0.35, fog: false }));
  glow.position.set(0, 72, 328);
  scene.add(glow);
  state.sunDisc = sunDisc;
  state.glow = glow;
  // Helicopter (Air One).
  const heli = new THREE.Group();
  const hBody = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 5.4), new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
  hBody.position.y = 0;
  heli.add(hBody);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.4, 5.45), new THREE.MeshLambertMaterial({ color: 0xd92b2b }));
  stripe.position.y = 0.1;
  heli.add(stripe);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.8, 1.2), new THREE.MeshLambertMaterial({ color: 0x101820 }));
  glass.position.set(0, 0.25, 2.2);
  heli.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 3.4), new THREE.MeshLambertMaterial({ color: 0xf2f2f2 }));
  tail.position.set(0, 0.2, -4.2);
  heli.add(tail);
  const rotor = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(9, 0.08, 0.5);
  const bladeMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
  const b1 = new THREE.Mesh(bladeGeo, bladeMat);
  const b2 = new THREE.Mesh(bladeGeo, bladeMat);
  b2.rotation.y = Math.PI / 2;
  rotor.add(b1); rotor.add(b2);
  rotor.position.y = 1.1;
  heli.add(rotor);
  const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 38, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  cone.position.y = -19;
  heli.add(cone);
  heli.visible = false;
  scene.add(heli);
  state.heli = heli;
  state.rotor = rotor;
  state.cone = cone;
  // Dynamic meshes.
  state.carMeshes = new Map();
  state.copMeshes = new Map();
  state.wreckMeshes = new Map();
  state.pedMeshes = [];
  const pedGeo = new THREE.BoxGeometry(0.55, 1.7, 0.55);
  for (const p of g.peds) {
    const m = new THREE.Mesh(pedGeo, new THREE.MeshLambertMaterial({ color: p.color }));
    m.position.set(p.x, 0.85, p.z);
    scene.add(m);
    state.pedMeshes.push(m);
  }
  state.renderer = renderer;
  state.scene = scene;
  state.camera = camera;
  state.amb = amb;
  state.sunLight = sun;
  state.lampHeads = lampHeads;
  state.camPos = new THREE.Vector3(0, 10, 80);
  state.enabled = true;
  return state;
}

function syncCarMeshes(g, map, list, isCop) {
  const scene = g.render.scene;
  const seen = new Set();
  for (const c of list) {
    seen.add(c.id);
    let grp = map.get(c.id);
    if (!grp) {
      grp = makeCarMesh(c);
      if (isCop) {
        grp.children[0].material = new THREE.MeshLambertMaterial({ color: 0xf2f2f2 });
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.18, 1.4), new THREE.MeshLambertMaterial({ color: 0xd92b2b }));
        bar.position.set(0, 1.55, -0.2);
        grp.add(bar);
      }
      scene.add(grp);
      map.set(c.id, grp);
    }
    grp.position.set(c.x, 0, c.z);
    grp.rotation.y = c.heading;
  }
  for (const [id, grp] of map) {
    if (!seen.has(id)) { scene.remove(grp); map.delete(id); }
  }
}

function syncWrecks(g) {
  const scene = g.render.scene;
  for (const w of g.wrecks) {
    let grp = g.render.wreckMeshes.get(w);
    if (!grp) {
      grp = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4.2), new THREE.MeshLambertMaterial({ color: 0x262626 }));
      body.position.y = 0.5;
      grp.add(body);
      const cab = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.6, 2), new THREE.MeshLambertMaterial({ color: 0x1e1e1e }));
      cab.position.set(0, 1.1, -0.2);
      grp.add(cab);
      // Wheels so a burnt wreck still reads as a car, not a black slab.
      const wheelGeo = new THREE.BoxGeometry(0.5, 0.5, 0.9);
      const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0a0a0a });
      for (const [wx, wz] of [[-0.95, 1.3], [0.95, 1.3], [-0.95, -1.3], [0.95, -1.3]]) {
        const wh = new THREE.Mesh(wheelGeo, wheelMat);
        wh.position.set(wx, 0.3, wz);
        grp.add(wh);
      }
      const f1 = new THREE.Mesh(new THREE.ConeGeometry(1.3, 3.4, 8), new THREE.MeshBasicMaterial({ color: 0xff7a1a }));
      f1.position.set(-0.4, 2.6, 0.6);
      grp.add(f1);
      const f2 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 2.4, 8), new THREE.MeshBasicMaterial({ color: 0xffd94d }));
      f2.position.set(0.7, 2.3, -1.1);
      grp.add(f2);
      const smoke = new THREE.Mesh(new THREE.SphereGeometry(1.7, 8, 6), new THREE.MeshLambertMaterial({ color: 0x555555, transparent: true, opacity: 0.55 }));
      smoke.position.set(0, 4.2, 0);
      grp.add(smoke);
      grp.userData.f1 = f1; grp.userData.f2 = f2; grp.userData.smoke = smoke;
      // Cover staging may scale the wreck up (w.scale) so it reads big;
      // gameplay wrecks stay at scale 1.
      grp.scale.setScalar(w.scale || 1);
      grp.position.set(w.x, 0, w.z);
      grp.rotation.y = w.heading || 0;
      scene.add(grp);
      g.render.wreckMeshes.set(w, grp);
    }
    const t = g.time;
    grp.userData.f1.scale.y = 1 + Math.sin(t * 9) * 0.25;
    grp.userData.f2.scale.y = 1 + Math.cos(t * 11) * 0.3;
    grp.userData.smoke.position.y = 4.2 + ((t * 0.7 + w.x) % 2);
  }
}

export function updateRender(g, dt) {
  const r = g.render;
  if (!r.enabled) return;
  // Sky + lights follow the clock.
  const h = g.clock.hour;
  let sky;
  if (h >= 20 || h < 6) sky = new THREE.Color(0x0d1330);
  else if (h >= 17) sky = new THREE.Color(0xf0a35e);
  else sky = new THREE.Color(0x79c7e8);
  r.scene.background = sky;
  r.scene.fog.color = sky;
  r.amb.intensity = g.clock.isNight ? 0.35 : 0.8;
  r.sunLight.intensity = g.clock.isNight ? 0.2 : 1.1;
  for (const lm of r.lampHeads) lm.emissiveIntensity = g.clock.lampGlow * 2;
  r.sunDisc.visible = !g.clock.isNight;
  r.glow.visible = !g.clock.isNight;
  // Clouds drift.
  for (const c of r.clouds) {
    c.position.x += dt * 0.6;
    if (c.position.x > 260) c.position.x = -260;
  }
  // Cars, cops, peds, wrecks.
  syncCarMeshes(g, r.carMeshes, g.cars, false);
  syncCarMeshes(g, r.copMeshes, g.cops, true);
  for (let i = 0; i < g.peds.length; i += 1) {
    const m = r.pedMeshes[i];
    if (m) m.position.set(g.peds[i].x, 0.85, g.peds[i].z);
  }
  syncWrecks(g);
  // Helicopter.
  const heli = r.heli;
  heli.visible = g.heli.active;
  if (g.heli.active) {
    // g.heli.y is a staging override (cover shot flies the heli low so it
    // reads big in frame); gameplay uses the default 38.
    heli.position.set(g.heli.x, g.heli.y || 38, g.heli.z);
    r.rotor.rotation.y += dt * 14;
    r.cone.visible = g.heli.locked;
  }
  // Camera: staged fixed shot, or chase cam.
  const cam = r.camera;
  if (g.stageCam === 'fixed' && g.stageCamPos) {
    cam.position.set(g.stageCamPos.x, g.stageCamPos.y, g.stageCamPos.z);
    cam.lookAt(g.stageCamLook.x, g.stageCamLook.y, g.stageCamLook.z);
  } else {
    const px = g.player.x, pz = g.player.z;
    const hd = g.player.heading;
    const tx = px - Math.sin(hd) * 13;
    const tz = pz - Math.cos(hd) * 13;
    const k = 1 - Math.exp(-4 * dt);
    r.camPos.x += (tx - r.camPos.x) * k;
    r.camPos.y += (6.5 - r.camPos.y) * k;
    r.camPos.z += (tz - r.camPos.z) * k;
    cam.position.copy(r.camPos);
    cam.lookAt(px + Math.sin(hd) * 12, 2, pz + Math.cos(hd) * 12);
  }
  r.sunDisc.lookAt(cam.position);
  r.glow.lookAt(cam.position);
  r.renderer.render(r.scene, cam);
}
