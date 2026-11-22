// The 3D scene. Three.js builds Solmar: the sunset buildings, the
// palms, the beach and its umbrellas, the roads with their markings,
// the drifting clouds, the sun disc that never hides behind the banner,
// Air One with its spotlight, and every car, cop, ped and burning wreck
// the game state holds. The game state is the truth; this module only
// mirrors it into meshes, one frame at a time.

import * as THREE from 'three';

// The sun disc: a flat circle, unlit, drawn on top of everything, placed
// in front of the camera so it is always a full disc in the sky.
const SUN_COLOR = 0xffc21a;
const SUN_RADIUS = 22;

function makeCarMesh(model, color) {
  const group = new THREE.Group();
  const paint = new THREE.MeshLambertMaterial({ color });
  const glass = new THREE.MeshLambertMaterial({ color: 0x1a2733 });
  const dark = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.75, 4.4), paint);
  body.position.y = 0.55;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.65, 2.2), glass);
  cabin.position.set(0, 1.2, -0.3);
  group.add(cabin);
  const wheelGeo = new THREE.BoxGeometry(0.35, 0.7, 0.7);
  for (const [x, z] of [[-1.05, 1.45], [1.05, 1.45], [-1.05, -1.45], [1.05, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, dark);
    w.position.set(x, 0.35, z);
    group.add(w);
  }
  if (model === 'sport') {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.08, 0.4), dark);
    spoiler.position.set(0, 1.05, -2.1);
    group.add(spoiler);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 4.0), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    stripe.position.set(0, 0.94, 0);
    group.add(stripe);
  }
  if (model === 'cop') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0x2255ff }));
    bar.position.set(0, 1.6, -0.3);
    group.add(bar);
    const bar2 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.18, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar2.position.set(-0.4, 1.6, -0.3);
    group.add(bar2);
  }
  if (model === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0xf0c94a }));
    sign.position.set(0, 1.62, -0.3);
    group.add(sign);
  }
  return group;
}

function makePedMesh(color) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color });
  const skin = new THREE.MeshLambertMaterial({ color: 0xd9a066 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.9, 0.35), shirt);
  body.position.y = 0.85;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), skin);
  head.position.y = 1.55;
  group.add(head);
  const legs = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.3), new THREE.MeshLambertMaterial({ color: 0x2a2a33 }));
  legs.position.y = 0.22;
  group.add(legs);
  return group;
}

function makeHelicopter() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2244aa });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.4, 4.5), bodyMat);
  group.add(body);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.35, 4.0), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  stripe.position.y = 0.2;
  group.add(stripe);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 4.5), bodyMat);
  tail.position.set(0, 0.3, -4.2);
  group.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(9, 0.08, 0.5), new THREE.MeshLambertMaterial({ color: 0x222222 }));
  rotor.position.y = 0.95;
  rotor.name = 'rotor';
  group.add(rotor);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.7, 1.4), new THREE.MeshLambertMaterial({ color: 0x9fd8ef }));
  glass.position.set(0, 0.25, 2.0);
  group.add(glass);
  // The spotlight cone, pointing down at the street.
  const coneGeo = new THREE.ConeGeometry(3.2, 14, 12, 1, true);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.y = -7.5;
  cone.rotation.x = Math.PI;
  cone.name = 'cone';
  group.add(cone);
  group.scale.setScalar(1.6);
  return group;
}

function makeCloud(rng) {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.88 });
  const puffs = 3 + Math.floor(rng.next() * 3);
  for (let i = 0; i < puffs; i += 1) {
    const r = 4 + rng.next() * 5;
    const s = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
    s.position.set((rng.next() - 0.5) * 14, (rng.next() - 0.5) * 2, (rng.next() - 0.5) * 6);
    s.scale.y = 0.42;
    group.add(s);
  }
  return group;
}

// Build the renderer, the scene and every static mesh. Returns the
// render state the game object carries as g.render.
export function createRender(g) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.domElement.style.position = 'fixed';
  renderer.domElement.style.left = '0';
  renderer.domElement.style.top = '0';
  document.body.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xe8863a);
  scene.fog = new THREE.Fog(0xe8863a, 120, 520);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(0, 10, 120);

  const hemi = new THREE.HemisphereLight(0xffd9a0, 0x3a2a22, 0.9);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffc27a, 1.1);
  sun.position.set(-120, 140, 60);
  scene.add(sun);
  const amb = new THREE.AmbientLight(0x604050, 0.5);
  scene.add(amb);

  // Ground: the city slab, the sand strip and the water beyond it.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(520, 520),
    new THREE.MeshLambertMaterial({ color: 0x4a4640 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  scene.add(ground);
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(36, 520),
    new THREE.MeshLambertMaterial({ color: 0xe0c98f }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-228, 0.01, 0);
  scene.add(sand);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(60, 520),
    new THREE.MeshLambertMaterial({ color: 0x2f7fb8 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(-276, 0.02, 0);
  scene.add(water);

  // Roads along the street grid, with a yellow centre line each.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2e2c2a });
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xf0c94a });
  const streetLines = [-180, -120, -60, 0, 60, 120, 180];
  for (const s of streetLines) {
    for (const horizontal of [true, false]) {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(430, 10), roadMat);
      road.rotation.x = -Math.PI / 2;
      if (horizontal) {
        road.rotation.z = Math.PI / 2;
        road.position.set(s, 0.03, 0);
      } else {
        road.position.set(0, 0.03, s);
      }
      scene.add(road);
    }
  }
  // Centre dashes down the avenue and the cross street.
  for (let i = -200; i <= 200; i += 16) {
    for (const [x, z, rot] of [[0, i, 0], [i, 0, Math.PI / 2]]) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.5), lineMat);
      dash.rotation.x = -Math.PI / 2;
      dash.rotation.z = rot;
      dash.position.set(x, 0.05, z);
      scene.add(dash);
    }
  }
  // Crosswalk stripes at the central intersection.
  const walkMat = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 });
  for (let i = -4; i <= 4; i += 2) {
    const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 9), walkMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(i, 0.05, 8);
    scene.add(stripe);
  }

  // Buildings: a box and a roof slab each, in the sunset palette.
  const buildingMeshes = [];
  for (const b of g.city.buildings) {
    const wall = new THREE.Mesh(
      new THREE.BoxGeometry(b.w, b.h, b.d),
      new THREE.MeshLambertMaterial({ color: b.color }),
    );
    wall.position.set(b.x, b.h / 2, b.z);
    scene.add(wall);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(b.w + 0.6, 0.8, b.d + 0.6),
      new THREE.MeshLambertMaterial({ color: b.roof }),
    );
    roof.position.set(b.x, b.h + 0.4, b.z);
    scene.add(roof);
    buildingMeshes.push(wall);
  }

  // Palms on the sidewalk corners.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f7d3a });
  for (const p of g.city.palms) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, p.h, 6), trunkMat);
    trunk.position.set(p.x, p.h / 2, p.z);
    scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(2.2, 8, 6), leafMat);
    crown.scale.y = 0.45;
    crown.position.set(p.x, p.h + 0.8, p.z);
    scene.add(crown);
  }

  // Beach umbrellas.
  for (const u of g.city.umbrellas) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 3, 6), new THREE.MeshLambertMaterial({ color: 0xeeeeee }));
    pole.position.set(u.x, 1.5, u.z);
    scene.add(pole);
    const canopy = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.2, 10), new THREE.MeshLambertMaterial({ color: u.color }));
    canopy.position.set(u.x, 3.4, u.z);
    scene.add(canopy);
  }

  // Street lamps down the avenue; they glow once the lamps come on.
  const lampPoles = [];
  const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.15 });
  for (const z of [-150, -90, -30, 30, 90, 150]) {
    for (const x of [-7, 7]) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6, 6), new THREE.MeshLambertMaterial({ color: 0x333333 }));
      pole.position.set(x, 3, z);
      scene.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), lampGlowMat);
      lamp.position.set(x, 6.2, z);
      scene.add(lamp);
      lampPoles.push(lamp);
    }
  }

  // Ten clouds, flattened white puffs, high in the sky.
  const clouds = [];
  for (let i = 0; i < 10; i += 1) {
    const c = makeCloud(g.rng);
    c.position.set(-220 + i * 44 + g.rng.jitter(12), 42 + g.rng.next() * 15, -160 + g.rng.next() * 320);
    scene.add(c);
    clouds.push(c);
  }

  // The sun disc: a flat yellow circle that never hides. It is placed
  // in front of the camera every frame, high in the sky.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(SUN_RADIUS, 40),
    new THREE.MeshBasicMaterial({ color: SUN_COLOR, depthTest: false, transparent: true, opacity: 1 }),
  );
  sunDisc.renderOrder = 999;
  scene.add(sunDisc);
  const sunGlow = new THREE.Mesh(
    new THREE.CircleGeometry(SUN_RADIUS * 1.8, 40),
    new THREE.MeshBasicMaterial({ color: 0xffd76a, depthTest: false, transparent: true, opacity: 0.35 }),
  );
  sunGlow.renderOrder = 998;
  scene.add(sunGlow);

  // The moon, for the night shot: a pale disc, same trick.
  const moonDisc = new THREE.Mesh(
    new THREE.CircleGeometry(14, 32),
    new THREE.MeshBasicMaterial({ color: 0xe8ecf5, depthTest: false, transparent: true, opacity: 0.95 }),
  );
  moonDisc.renderOrder = 999;
  moonDisc.visible = false;
  scene.add(moonDisc);

  // Air One, the police helicopter.
  const heli = makeHelicopter();
  heli.visible = false;
  scene.add(heli);

  // The player figure, a simple low-poly walker.
  const playerMesh = makePedMesh(0x2f6fb8);
  playerMesh.scale.setScalar(1.15);
  scene.add(playerMesh);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const render = {
    renderer, scene, camera, hemi, sun, amb, lampGlowMat, lampPoles,
    clouds, sunDisc, sunGlow, moonDisc, heli, playerMesh,
    buildingMeshes,
    carMeshes: new Map(),
    copMeshes: new Map(),
    pedMeshes: [],
    wreckMeshes: new Map(),
    boomMeshes: new Map(),
    camPos: new THREE.Vector3(0, 10, 120),
    camLook: new THREE.Vector3(0, 0, 100),
    heliAngle: 0,
  };

  // One ped mesh per pedestrian, created once.
  for (const p of g.peds) {
    const m = makePedMesh(p.color);
    scene.add(m);
    render.pedMeshes.push(m);
  }

  return render;
}

// The sky colour for the hour: golden at 18:00, blue by day, dark by
// night. Returns [sky, fog, hemiIntensity, sunIntensity].
function skyFor(clock) {
  if (clock.isNight) return [0x0d1526, 0x0d1526, 0.25, 0.12];
  if (clock.golden > 0.05) {
    const t = clock.golden;
    return [
      new THREE.Color(0x2f6fb8).lerp(new THREE.Color(0xe8863a), t).getHex(),
      new THREE.Color(0x2f6fb8).lerp(new THREE.Color(0xe8863a), t).getHex(),
      0.9, 1.1,
    ];
  }
  return [0x7fb2e0, 0x7fb2e0, 0.85, 1.0];
}

// Mirror the game state into the scene and draw the frame.
export function updateRender(g, dt) {
  const r = g.render;
  const clock = g.clock;

  // Sky and lights follow the clock.
  const [sky, , hemiI, sunI] = skyFor(clock);
  r.scene.background.setHex(sky);
  if (r.scene.fog) r.scene.fog.color.setHex(sky);
  r.hemi.intensity = hemiI;
  r.sun.intensity = sunI;
  r.lampGlowMat.opacity = 0.15 + clock.lampGlow * 0.85;

  // Clouds drift and wrap.
  for (const c of r.clouds) {
    c.position.x += dt * 1.2;
    if (c.position.x > 260) c.position.x = -260;
  }

  // Camera: third person behind the player or their car.
  const focus = g.car || null;
  const fx = focus ? focus.x : g.player.x;
  const fz = focus ? focus.z : g.player.z;
  const heading = focus ? focus.heading : g.player.heading;
  const dist = g.shot ? 17 : 13;
  const height = g.shot ? 9 : 7;
  const backX = fx - Math.sin(heading) * dist;
  const backZ = fz - Math.cos(heading) * dist;
  const k = Math.min(1, dt * 4);
  r.camPos.x += (backX - r.camPos.x) * k;
  r.camPos.y += (height - r.camPos.y) * k;
  r.camPos.z += (backZ - r.camPos.z) * k;
  r.camLook.x += (fx + Math.sin(heading) * 10 - r.camLook.x) * k;
  r.camLook.y += (1.5 - r.camLook.y) * k;
  r.camLook.z += (fz + Math.cos(heading) * 10 - r.camLook.z) * k;
  r.camera.position.copy(r.camPos);
  r.camera.lookAt(r.camLook);

  // The sun disc rides in front of the camera, high in the sky; the
  // moon takes its place at night. Both are full discs, never occluded.
  const fwd = new THREE.Vector3();
  r.camera.getWorldDirection(fwd);
  const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const sunPos = r.camera.position.clone().addScaledVector(fwd, 220).addScaledVector(up, 55).addScaledVector(right, 38);
  r.sunDisc.position.copy(sunPos);
  r.sunDisc.lookAt(r.camera.position);
  r.sunGlow.position.copy(sunPos);
  r.sunGlow.lookAt(r.camera.position);
  r.moonDisc.position.copy(r.camera.position.clone().addScaledVector(fwd, 220).addScaledVector(up, 70).addScaledVector(right, -45));
  r.moonDisc.lookAt(r.camera.position);
  const night = clock.isNight;
  r.sunDisc.visible = !night;
  r.sunGlow.visible = !night;
  r.moonDisc.visible = night;

  // Air One circles when the heat is on (or for a staged shot).
  const heliOn = g.player.wanted >= 2 || !!g.shot;
  r.heli.visible = heliOn;
  if (heliOn) {
    r.heliAngle += dt * 0.12;
    r.heli.position.set(
      fx + Math.sin(r.heliAngle) * 42,
      34 + Math.sin(g.time * 0.7) * 2,
      fz + Math.cos(r.heliAngle) * 42,
    );
    // Hold the orbit low enough to stay in the chase camera's frame:
    // at the old altitude the heli drifted above the top edge, and its
    // body hid behind the mission banner.
    r.heli.position.y = 12;
    r.heli.rotation.y = Math.atan2(fx - r.heli.position.x, fz - r.heli.position.z);
    const rotor = r.heli.getObjectByName('rotor');
    if (rotor) rotor.rotation.y += dt * 22;
  }

  // The player figure.
  r.playerMesh.visible = !g.player.inCar;
  r.playerMesh.position.set(g.player.x, 0, g.player.z);
  r.playerMesh.rotation.y = g.player.heading;

  // Cars: one mesh each, synced to the state; gone cars lose theirs.
  const seenCars = new Set();
  for (const car of g.cars) {
    seenCars.add(car.id);
    let m = r.carMeshes.get(car.id);
    if (!m) {
      m = makeCarMesh(car.model, car.color);
      r.scene.add(m);
      r.carMeshes.set(car.id, m);
    }
    m.position.set(car.x, 0, car.z);
    m.rotation.y = car.heading;
  }
  for (const [id, m] of [...r.carMeshes]) {
    if (!seenCars.has(id)) {
      r.scene.remove(m);
      r.carMeshes.delete(id);
    }
  }

  // Cops: same treatment, with the police body.
  const seenCops = new Set();
  for (const cop of g.cops) {
    seenCops.add(cop.id);
    let m = r.copMeshes.get(cop.id);
    if (!m) {
      m = makeCarMesh('cop', 0x1c2733);
      r.scene.add(m);
      r.copMeshes.set(cop.id, m);
    }
    m.position.set(cop.x, 0, cop.z);
    m.rotation.y = cop.heading;
  }
  for (const [id, m] of [...r.copMeshes]) {
    if (!seenCops.has(id)) {
      r.scene.remove(m);
      r.copMeshes.delete(id);
    }
  }

  // Peds walk their routes.
  for (let i = 0; i < g.peds.length && i < r.pedMeshes.length; i += 1) {
    const p = g.peds[i];
    const m = r.pedMeshes[i];
    m.position.set(p.x, 0, p.z);
    m.rotation.y = p.heading;
    // A fleeing ped leans into the run.
    m.rotation.x = p.state === 'flee' ? 0.15 : 0;
  }

  // Wrecks: a charred body and a flickering flame cone each.
  const seenWrecks = new Set();
  g.wrecks.forEach((w, wi) => {
    const key = `w${wi}`;
    seenWrecks.add(key);
    let m = r.wreckMeshes.get(key);
    if (!m) {
      const grp = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 4.2), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
      body.position.y = 0.5;
      body.rotation.y = 0.4;
      grp.add(body);
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(1.1, 3.2, 8),
        new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.92 }),
      );
      flame.position.y = 2.2;
      flame.name = 'flame';
      grp.add(flame);
      const smoke = new THREE.Mesh(
        new THREE.SphereGeometry(1.4, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.5 }),
      );
      smoke.position.y = 4.6;
      smoke.name = 'smoke';
      grp.add(smoke);
      grp.position.set(w.x, 0, w.z);
      r.scene.add(grp);
      r.wreckMeshes.set(key, grp);
      m = grp;
    }
    const flame = m.getObjectByName('flame');
    if (flame) {
      const flick = 1 + Math.sin(g.time * 9 + wi * 2) * 0.18;
      flame.scale.set(flick, 1 + Math.sin(g.time * 12 + wi) * 0.25, flick);
    }
    const smoke = m.getObjectByName('smoke');
    if (smoke) smoke.position.y = 4.6 + Math.sin(g.time * 1.5 + wi) * 0.4;
  });

  // Booms: an expanding, fading shell.
  const seenBooms = new Set();
  g.booms.forEach((b, bi) => {
    const key = `b${bi}`;
    seenBooms.add(key);
    let m = r.boomMeshes.get(key);
    if (!m) {
      m = new THREE.Mesh(
        new THREE.SphereGeometry(1, 12, 10),
        new THREE.MeshBasicMaterial({ color: 0xffb03a, transparent: true, opacity: 0.7 }),
      );
      m.position.set(b.x, 1.5, b.z);
      r.scene.add(m);
      r.boomMeshes.set(key, m);
    }
    const s = 1 + b.t * 4;
    m.scale.setScalar(s);
    m.material.opacity = Math.max(0, 0.7 - b.t * 0.55);
  });
  for (const [key, m] of [...r.boomMeshes]) {
    if (!seenBooms.has(key)) {
      r.scene.remove(m);
      r.boomMeshes.delete(key);
    }
  }

  r.renderer.render(r.scene, r.camera);
}
