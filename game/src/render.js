// Solmar Heat v7 — the 3D view.
// three.js r187, vendored offline. One renderer, one scene, one chase
// camera. The city is built once; cars, peds, cops, the heli, the gates
// and the fireballs are meshes that follow the world state every frame.
// Lights are kept few on purpose — SwiftShader has to draw this too.

import * as THREE from 'three';

export function initRenderer(canvas, city) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'low-power' });
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87b5d6);
  scene.fog = new THREE.Fog(0x87b5d6, 90, 430);
  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);
  camera.position.set(0, 12, -18);
  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambient);
  const sun = new THREE.DirectionalLight(0xfff2d8, 1.4);
  sun.position.set(80, 120, 40);
  scene.add(sun);
  const state = {
    renderer, scene, camera, sun, ambient,
    city,
    carMeshes: new Map(),
    pedMeshes: new Map(),
    wreckMeshes: new Map(),
    boomMeshes: new Map(),
    gateMeshes: {},
    markers: [],
    rain: null,
    heli: null,
    lampLights: [],
    camPos: new THREE.Vector3(0, 12, -18),
    camLook: new THREE.Vector3(0, 0, 0),
    built: false,
  };
  buildStatic(state);
  return state;
}

function lambert(color, emissive) {
  return new THREE.MeshLambertMaterial({ color, emissive: emissive || 0x000000 });
}

function buildStatic(state) {
  const { scene, city } = state;
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(city.half * 2 + 60, city.half * 2 + 60), lambert(0x3d5a3a));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, 0);
  scene.add(ground);
  // Roads: one dark plane per avenue and per street.
  const roadMat = lambert(0x23282e);
  for (let g = -180; g <= 180; g += 60) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(14, city.half * 2), roadMat);
    v.rotation.x = -Math.PI / 2;
    v.position.set(g, 0, 0);
    scene.add(v);
    const h = new THREE.Mesh(new THREE.PlaneGeometry(city.half * 2, 14), roadMat);
    h.rotation.x = -Math.PI / 2;
    h.position.set(0, 0, g);
    scene.add(h);
  }
  // Buildings: boxes with a roof cap; downtown towers go taller.
  for (const b of city.buildings) {
    const color = new THREE.Color().setHSL(b.hue, 0.25, 0.42 + b.roof * 0.2);
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), lambert(color.getHex()));
    mesh.position.set(b.x, b.h / 2, b.z);
    mesh.userData.building = true;
    scene.add(mesh);
    const roof = new THREE.Mesh(new THREE.BoxGeometry(b.w * 0.7, 0.6, b.d * 0.7), lambert(0x2a2f36));
    roof.position.set(b.x, b.h + 0.3, b.z);
    scene.add(roof);
    b.mesh = mesh;
  }
  // Lamps: small glowing posts at the intersections.
  for (const lamp of city.lamps) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 5, 6), lambert(0x333333));
    post.position.set(lamp.x, 2.5, lamp.z);
    scene.add(post);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
    bulb.position.set(lamp.x, 5.1, lamp.z);
    scene.add(bulb);
    lamp.bulb = bulb;
  }
  // Two roaming point lights follow the player at night (lamps are fake).
  for (let i = 0; i < 2; i += 1) {
    const light = new THREE.PointLight(0xffc46b, 0, 60);
    scene.add(light);
    state.lampLights.push(light);
  }
  // Rain: a curtain of short lines around the camera.
  const count = 240;
  const positions = new Float32Array(count * 6);
  for (let i = 0; i < count; i += 1) {
    const x = (Math.random() - 0.5) * 90;
    const y = Math.random() * 40;
    const z = (Math.random() - 0.5) * 90;
    positions.set([x, y, z, x, y - 1.2, z], i * 6);
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: 0x9fc4e8, transparent: true, opacity: 0 }));
  rain.visible = false;
  scene.add(rain);
  state.rain = rain;
  // Air One: body, tail, rotor, and a spotlight cone underneath.
  const heli = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 1.6, 2), lambert(0x1a1a1a));
  heli.add(body);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.5, 0.5), lambert(0x1a1a1a));
  tail.position.set(-3.6, 0.3, 0);
  heli.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(7.5, 0.08, 0.4), lambert(0x444444));
  rotor.position.set(0, 1.1, 0);
  heli.add(rotor);
  heli.userData.rotor = rotor;
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(7, 26, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.position.set(0, -14, 0);
  cone.rotation.x = Math.PI;
  heli.add(cone);
  const spot = new THREE.PointLight(0xfff2b0, 0, 70);
  spot.position.set(0, -2, 0);
  heli.add(spot);
  heli.userData.spot = spot;
  heli.visible = false;
  scene.add(heli);
  state.heli = heli;
  state.built = true;
}

export function makeGateMeshes(state, city) {
  const out = {};
  for (const raceId of Object.keys(city.gateRoutes)) {
    out[raceId] = city.gateRoutes[raceId].map((gate) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(4.2, 0.35, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.85 }),
      );
      ring.position.set(gate.x, 3.4, gate.z);
      state.scene.add(ring);
      return ring;
    });
  }
  state.gateMeshes = out;
  return out;
}

export function makeVentureMarkers(state, city) {
  const markers = [];
  const keys = { 'solmar-laundry': 'laundry', 'sunset-carwash': 'carWash', 'sunset-taxi': 'taxiCo', 'club-neon': 'nightclub' };
  for (const key of Object.keys(keys)) {
    const spot = city.spots[keys[key]];
    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(1.4),
      new THREE.MeshBasicMaterial({ color: 0x7cfc9a, transparent: true, opacity: 0.9 }),
    );
    gem.position.set(spot.x, 9, spot.z);
    state.scene.add(gem);
    markers.push({ id: key, mesh: gem, baseY: 9 });
  }
  state.markers = markers;
  return markers;
}

function carGroup(car) {
  const group = new THREE.Group();
  const def = { len: car.model === 'truck' ? 6.2 : car.model === 'ram' ? 5.2 : 4.4, wid: car.model === 'truck' ? 2.4 : 2 };
  const body = new THREE.Mesh(new THREE.BoxGeometry(def.len, 0.75, def.wid), lambert(car.color || 0x888888));
  body.position.y = 0.55;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(def.len * 0.45, 0.6, def.wid * 0.85), lambert(0x1c2733));
  cabin.position.set(-def.len * 0.05, 1.2, 0);
  group.add(cabin);
  const wheelGeo = new THREE.BoxGeometry(0.7, 0.7, 0.35);
  const wheelMat = lambert(0x111111);
  for (const [wx, wz] of [[def.len * 0.32, def.wid / 2], [def.len * 0.32, -def.wid / 2], [-def.len * 0.32, def.wid / 2], [-def.len * 0.32, -def.wid / 2]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.position.set(wx, 0.35, wz);
    group.add(wheel);
  }
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const wz of [def.wid / 2 - 0.35, -def.wid / 2 + 0.35]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 0.5), lightMat);
    lamp.position.set(def.len / 2 + 0.02, 0.6, wz);
    group.add(lamp);
  }
  if (car.model === 'cop' || car.model === 'ram' || car.model === 'pit') {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.22, 1.5), new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    bar.position.set(0, 1.62, 0);
    group.add(bar);
    group.userData.bar = bar;
    if (car.model === 'ram') {
      const bull = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, def.wid + 0.3), lambert(0x222222));
      bull.position.set(def.len / 2 + 0.25, 0.55, 0);
      group.add(bull);
    }
    if (car.model === 'pit') {
      const spoiler = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.12, def.wid * 0.9), lambert(0x111111));
      spoiler.position.set(-def.len / 2 - 0.2, 1.05, 0);
      group.add(spoiler);
    }
  }
  return group;
}

function syncCarMesh(state, car, dt, time) {
  let group = state.carMeshes.get(car.id);
  if (!group) {
    group = carGroup(car);
    state.scene.add(group);
    state.carMeshes.set(car.id, group);
  }
  group.position.set(car.x, 0, car.z);
  group.rotation.y = -car.heading;
  if (group.userData.bar) {
    group.userData.bar.material.color.setHex(Math.floor(time * 4) % 2 === 0 ? 0xff2222 : 0x2244ff);
  }
  return group;
}

function syncPedMesh(state, ped, index) {
  let mesh = state.pedMeshes.get(ped);
  if (!mesh) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.55, 1.1, 0.35), lambert(ped.color || 0x888888));
    body.position.y = 0.85;
    group.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), lambert(0xd9a066));
    head.position.y = 1.65;
    group.add(head);
    state.scene.add(group);
    state.pedMeshes.set(ped, group);
    mesh = group;
  }
  mesh.position.set(ped.x, 0, ped.z);
  mesh.rotation.y = -ped.heading;
  return mesh;
}

function syncBoomMesh(state, boom) {
  let entry = state.boomMeshes.get(boom);
  if (!entry) {
    const group = new THREE.Group();
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(2.2, 12, 10),
      new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.95 }),
    );
    ball.position.y = 2;
    group.add(ball);
    const light = new THREE.PointLight(0xff7a1a, 60, 55);
    light.position.y = 3;
    group.add(light);
    state.scene.add(group);
    entry = { group, ball, light };
    state.boomMeshes.set(boom, entry);
  }
  const f = boom.t / boom.dur;
  const scale = f < 0.3 ? 0.4 + f * 3 : 1.6 - f * 0.9;
  entry.ball.scale.setScalar(Math.max(0.1, scale));
  entry.ball.material.color.setHex(f < 0.4 ? 0xffc21a : 0xff5a1a);
  entry.light.intensity = 60 * (1 - f);
  entry.group.position.set(boom.x, 0, boom.z);
  return entry;
}

function syncWreckMesh(state, wreck, time) {
  let entry = state.wreckMeshes.get(wreck);
  if (!entry) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.7, 2), lambert(0x1e1e1e));
    body.position.y = 0.5;
    group.add(body);
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(2, 0.55, 1.7), lambert(0x141414));
    cabin.position.y = 1.1;
    group.add(cabin);
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(1.1, 2.6, 8),
      new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.9 }),
    );
    flame.position.y = 2.2;
    group.add(flame);
    const light = new THREE.PointLight(0xff7a1a, 18, 26);
    light.position.y = 2.5;
    group.add(light);
    state.scene.add(group);
    entry = { group, flame, light };
    state.wreckMeshes.set(wreck, entry);
  }
  entry.group.position.set(wreck.x, 0, wreck.z);
  entry.group.rotation.y = -wreck.heading;
  const burning = !wreck.cold;
  entry.flame.visible = burning;
  entry.light.visible = burning;
  if (burning) {
    entry.flame.scale.y = 0.8 + Math.sin(time * 9 + wreck.x) * 0.25;
    entry.light.intensity = 14 + Math.sin(time * 11) * 5;
  }
  return entry;
}

export function renderFrame(state, world, dt) {
  const { scene, camera } = state;
  const time = world.time;
  const clock = world.clock;
  const hour = clock.hour;
  // Sun and sky follow the clock: golden hour dips low and orange.
  const dayF = clock.isNight ? 0 : clock.golden ? 0.45 : 1;
  const sunAngle = ((hour - 6) / 12) * Math.PI;
  state.sun.position.set(Math.cos(sunAngle) * 120, Math.max(12, Math.sin(sunAngle) * 130), 50);
  state.sun.intensity = clock.isNight ? 0.25 : clock.golden ? 1.0 : 1.4;
  state.sun.color.setHex(clock.golden ? 0xff9a3c : clock.isNight ? 0x8fa8ff : 0xfff2d8);
  state.ambient.intensity = clock.isNight ? 0.32 : 0.75;
  scene.background.setHex(clock.isNight ? 0x0d1b26 : clock.golden ? 0xe8965a : 0x87b5d6);
  scene.fog.color.copy(scene.background);
  for (const b of state.city.buildings) {
    if (b.mesh) b.mesh.material.emissive.setHex(clock.isNight ? 0x2a1f0a : 0x000000);
  }
  for (const lamp of state.city.lamps) {
    if (lamp.bulb) lamp.bulb.material.color.setHex(clock.isNight ? 0xffe9a8 : 0x555555);
  }
  const night = clock.isNight;
  state.lampLights[0].position.set(world.player.x + 6, 6, world.player.z);
  state.lampLights[0].intensity = night ? 22 : 0;
  state.lampLights[1].position.set(world.player.x - 6, 6, world.player.z);
  state.lampLights[1].intensity = night ? 22 : 0;

  // Prune meshes for cars that left the world.
  const liveCars = new Set((world.cars || []).map((c) => c.id));
  for (const cop of world.cops || []) liveCars.add(cop.id);
  for (const [id, mesh] of state.carMeshes) {
    if (!liveCars.has(id)) {
      state.scene.remove(mesh);
      state.carMeshes.delete(id);
    }
  }
  for (const car of world.cars || []) syncCarMesh(state, car, dt, time);
  for (const cop of world.cops || []) syncCarMesh(state, cop, dt, time);
  // Peds (prune meshes for mates who left the crew).
  const livePeds = new Set(world.peds || []);
  for (const mate of world.mates || []) livePeds.add(mate);
  livePeds.add(world.player);
  for (const [ped, mesh] of state.pedMeshes) {
    if (!livePeds.has(ped)) {
      state.scene.remove(mesh);
      state.pedMeshes.delete(ped);
    }
  }
  for (const ped of world.peds || []) syncPedMesh(state, ped);
  for (const mate of world.mates || []) {
    const mesh = syncPedMesh(state, mate);
    mesh.scale.setScalar(1.15);
  }
  // Player on foot — hidden while driving.
  const playerMesh = syncPedMesh(state, world.player);
  playerMesh.scale.setScalar(1.2);
  playerMesh.visible = !world.player.inCar;
  // Gates: the next gate of the active race pulses, the rest sit dim.
  for (const raceId of Object.keys(state.gateMeshes)) {
    state.gateMeshes[raceId].forEach((ring, i) => {
      const active = world.streetRaces.active && world.streetRaces.active.id === raceId;
      const isNext = active && world.streetRaces.active.gate === i;
      ring.material.opacity = isNext ? 0.95 : 0.35;
      ring.material.color.setHex(isNext ? 0xffd23f : 0x7a8a99);
      const s = isNext ? 1 + Math.sin(time * 5) * 0.08 : 1;
      ring.scale.setScalar(s);
    });
  }
  // Venture markers bob; owned ones turn gold.
  for (const marker of state.markers) {
    marker.mesh.position.y = marker.baseY + Math.sin(time * 2 + marker.baseY) * 0.6;
    marker.mesh.material.color.setHex(world.empire.owned[marker.id] ? 0xffd23f : 0x7cfc9a);
    marker.mesh.rotation.y += dt * 0.8;
  }
  // Explosions and wrecks.
  for (const boom of world.booms || []) syncBoomMesh(state, boom);
  for (const [boom, entry] of state.boomMeshes) {
    if (!world.booms.includes(boom)) {
      state.scene.remove(entry.group);
      state.boomMeshes.delete(boom);
    }
  }
  for (const wreck of world.wrecks || []) syncWreckMesh(state, wreck, time);
  // Rain.
  if (state.rain) {
    const raining = world.weather.rain > 0.25;
    state.rain.visible = raining;
    if (raining) {
      state.rain.material.opacity = Math.min(0.7, world.weather.rain);
      state.rain.position.set(world.player.x, 0, world.player.z);
      const pos = state.rain.geometry.attributes.position;
      for (let i = 0; i < pos.count; i += 1) {
        let y = pos.getY(i) - dt * 28;
        if (y < 0) y = 40;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }
  }
  // Air One.
  const heli = state.heli;
  if (world.heli.active) {
    heli.visible = true;
    const hx = world.player.x + Math.sin(time * 0.4) * 26;
    const hz = world.player.z + Math.cos(time * 0.4) * 26;
    heli.position.set(hx, 42, hz);
    heli.rotation.y = -Math.atan2(world.player.x - hx, world.player.z - hz);
    heli.userData.rotor.rotation.y += dt * 22;
    heli.userData.spot.intensity = 30;
  } else {
    heli.visible = false;
  }
  // Chase camera (or a fixed shot camera when staging a screenshot).
  if (world.camFixed) {
    camera.position.set(world.camFixed.pos[0], world.camFixed.pos[1], world.camFixed.pos[2]);
    camera.lookAt(world.camFixed.look[0], world.camFixed.look[1], world.camFixed.look[2]);
  } else {
    const focus = world.car || world.player;
    const fx = Math.sin(focus.heading || 0);
    const fz = Math.cos(focus.heading || 0);
    const wantX = focus.x - fx * 15;
    const wantZ = focus.z - fz * 15;
    const wantY = 8.5;
    state.camPos.x += (wantX - state.camPos.x) * Math.min(1, dt * 4);
    state.camPos.y += (wantY - state.camPos.y) * Math.min(1, dt * 4);
    state.camPos.z += (wantZ - state.camPos.z) * Math.min(1, dt * 4);
    const shake = world.shake || 0;
    const sx = shake > 0 ? (Math.random() - 0.5) * shake : 0;
    const sy = shake > 0 ? (Math.random() - 0.5) * shake * 0.6 : 0;
    camera.position.set(state.camPos.x + sx, state.camPos.y + sy, state.camPos.z);
    state.camLook.set(focus.x + fx * 7, 1.5, focus.z + fz * 7);
    camera.lookAt(state.camLook);
  }
  state.renderer.render(scene, camera);
}

export function resizeRenderer(state) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  state.renderer.setSize(w, h, false);
  state.camera.aspect = w / h;
  state.camera.updateProjectionMatrix();
}
