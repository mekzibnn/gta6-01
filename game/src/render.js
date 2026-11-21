// The 3D view — Solmar rendered with three.js (v6 rewrite).
// A low-poly city: coloured block buildings, dark roads, palms on the
// marina, lamps that glow at night, cars and people as simple assembled
// meshes, a helicopter circling a chase, and white rings marking race
// gates. The renderer owns the scene graph; main.js owns the game state
// and hands it over every frame.

import * as THREE from 'three';
import { LOOK, WORLD } from './config.js';

export function initRenderer(canvas, city) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(LOOK.skyGolden);
  scene.fog = new THREE.Fog(LOOK.fogGolden, 180, 620);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(0, 26, -42);

  const sun = new THREE.DirectionalLight(0xffe0b3, 2.2);
  sun.position.set(120, 180, 60);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -260;
  sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260;
  sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 600;
  scene.add(sun);

  const ambient = new THREE.AmbientLight(0xbfd9e8, 0.85);
  scene.add(ambient);

  const hemi = new THREE.HemisphereLight(0xbfd9e8, 0x3a2f28, 0.7);
  scene.add(hemi);

  // Ground: one big slab, sea-blue at the edges, asphalt in the middle.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.halfSize * 2 + 400, WORLD.halfSize * 2 + 400),
    new THREE.MeshLambertMaterial({ color: 0x1d3a4a }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.2;
  ground.receiveShadow = true;
  scene.add(ground);

  const plaza = new THREE.Mesh(
    new THREE.PlaneGeometry(WORLD.halfSize * 2, WORLD.halfSize * 2),
    new THREE.MeshLambertMaterial({ color: LOOK.roadColor }),
  );
  plaza.rotation.x = -Math.PI / 2;
  plaza.position.y = 0;
  plaza.receiveShadow = true;
  scene.add(plaza);

  // Sidewalks: pale strips along every road, so the grid reads from above.
  const walkMat = new THREE.MeshLambertMaterial({ color: LOOK.sidewalkColor });
  for (const a of city.avenues) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, WORLD.halfSize * 2), walkMat);
    strip.position.set(a + 9, 0.15, 0);
    strip.receiveShadow = true;
    scene.add(strip);
    const strip2 = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, WORLD.halfSize * 2), walkMat);
    strip2.position.set(a - 9, 0.15, 0);
    strip2.receiveShadow = true;
    scene.add(strip2);
  }
  for (const s of city.streets) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(WORLD.halfSize * 2, 0.3, 3), walkMat);
    strip.position.set(0, 0.15, s + 9);
    strip.receiveShadow = true;
    scene.add(strip);
    const strip2 = new THREE.Mesh(new THREE.BoxGeometry(WORLD.halfSize * 2, 0.3, 3), walkMat);
    strip2.position.set(0, 0.15, s - 9);
    strip2.receiveShadow = true;
    scene.add(strip2);
  }

  // Buildings: one box per seeded block, with a lighter roof cap.
  const buildingMeshes = [];
  for (const b of city.buildings) {
    const mat = new THREE.MeshLambertMaterial({ color: b.color });
    const box = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
    box.position.set(b.x, b.h / 2, b.z);
    box.castShadow = true;
    box.receiveShadow = true;
    scene.add(box);
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(b.w * 0.7, 1.2, b.d * 0.7),
      new THREE.MeshLambertMaterial({ color: 0x2b2f36 }),
    );
    roof.position.set(b.x, b.h + 0.6, b.z);
    scene.add(roof);
    // Windows: a few lit panes on the tall blocks.
    if (b.h > 26) {
      const winMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
      for (let f = 0; f < Math.floor(b.h / 9); f += 1) {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), winMat);
        win.position.set(b.x + b.w / 2 + 0.05, 6 + f * 9, b.z);
        win.rotation.y = Math.PI / 2;
        scene.add(win);
      }
    }
    buildingMeshes.push(box);
  }

  // Streetlamps: a pole, a head, and a point light that only burns at night.
  const lampHeads = [];
  const lampMat = new THREE.MeshLambertMaterial({ color: 0x2b2f36 });
  for (const lamp of city.lamps) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 7, 6), lampMat);
    pole.position.set(lamp.x, 3.5, lamp.z);
    scene.add(pole);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.55, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0x555555 }),
    );
    head.position.set(lamp.x, 7.2, lamp.z);
    scene.add(head);
    const glow = new THREE.PointLight(0xffd9a0, 0, 26, 1.6);
    glow.position.set(lamp.x, 7, lamp.z);
    scene.add(glow);
    lampHeads.push({ head, glow });
  }

  // Palms on the marina and harbor sidewalks.
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x6b4a2f });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f9e44 });
  for (const palm of city.palms) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 6, 6), trunkMat);
    trunk.position.set(palm.x, 3, palm.z);
    trunk.castShadow = true;
    scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(2.6, 3.2, 7), leafMat);
    crown.position.set(palm.x, 7.2, palm.z);
    crown.castShadow = true;
    scene.add(crown);
  }

  return {
    renderer,
    scene,
    camera,
    sun,
    ambient,
    hemi,
    lampHeads,
    buildingMeshes,
    cars: new Map(),
    peds: new Map(),
    heli: null,
    heliRotor: null,
    gates: [],
    markers: [],
    headlights: [],
  };
}

// --- Vehicles, people, helicopter, gates, markers ---

export function makeCarMesh(view, car) {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: car.color });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 4.4), bodyMat);
  body.position.y = 0.55;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(1.8, 0.7, 2.2),
    new THREE.MeshLambertMaterial({ color: 0x1c2733 }),
  );
  cabin.position.set(0, 1.25, -0.2);
  cabin.castShadow = true;
  group.add(cabin);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x0d0d0d });
  const wheelGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.3, 10);
  for (const [wx, wz] of [[-1.05, 1.4], [1.05, 1.4], [-1.05, -1.4], [1.05, -1.4]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.42, wz);
    group.add(wheel);
  }
  // Headlights: two small emissive discs at the front.
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff6c9 });
  for (const wx of [-0.7, 0.7]) {
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(0.22, 8), lightMat);
    lamp.position.set(wx, 0.6, 2.21);
    group.add(lamp);
  }
  group.position.set(car.x, 0, car.z);
  group.rotation.y = car.heading;
  view.scene.add(group);
  view.cars.set(car.id, group);
  return group;
}

export function syncCarMesh(view, car) {
  let mesh = view.cars.get(car.id);
  if (!mesh) mesh = makeCarMesh(view, car);
  mesh.position.set(car.x, 0, car.z);
  mesh.rotation.y = car.heading;
  // Smoke when the car is badly damaged.
  mesh.visible = !car.wrecked;
  return mesh;
}

export function pruneCarMeshes(view, liveIds) {
  for (const [id, mesh] of view.cars) {
    if (!liveIds.has(id)) {
      view.scene.remove(mesh);
      view.cars.delete(id);
    }
  }
}

export function makePedMesh(view, ped) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.42, 1.5, 8),
    new THREE.MeshLambertMaterial({ color: ped.color }),
  );
  body.position.y = 0.95;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 10, 8),
    new THREE.MeshLambertMaterial({ color: 0xe8b98a }),
  );
  head.position.y = 2.0;
  head.castShadow = true;
  group.add(head);
  group.position.set(ped.x, 0, ped.z);
  view.scene.add(group);
  view.peds.set(ped.id, group);
  return group;
}

export function syncPedMesh(view, ped) {
  let mesh = view.peds.get(ped.id);
  if (!mesh) mesh = makePedMesh(view, ped);
  mesh.position.set(ped.x, 0, ped.z);
  mesh.rotation.y = ped.heading || 0;
  // Fleeing peds lean forward a touch.
  mesh.rotation.x = ped.state === 'flee' ? 0.18 : 0;
  return mesh;
}

export function prunePedMeshes(view, liveIds) {
  for (const [id, mesh] of view.peds) {
    if (!liveIds.has(id)) {
      view.scene.remove(mesh);
      view.peds.delete(id);
    }
  }
}

export function makeHeliMesh(view) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 1.4, 5.2),
    new THREE.MeshLambertMaterial({ color: 0x1f2a37 }),
  );
  body.castShadow = true;
  group.add(body);
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 3.4),
    new THREE.MeshLambertMaterial({ color: 0x1f2a37 }),
  );
  tail.position.set(0, 0.2, -4);
  group.add(tail);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.9, 1.4),
    new THREE.MeshLambertMaterial({ color: 0x9fd8ef }),
  );
  glass.position.set(0, 0.3, 2.0);
  group.add(glass);
  const rotor = new THREE.Mesh(
    new THREE.BoxGeometry(9, 0.08, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x111111 }),
  );
  rotor.position.y = 1.1;
  group.add(rotor);
  // The searchlight cone under the heli.
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(4, 18, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff6c9, transparent: true, opacity: 0.14, side: THREE.DoubleSide }),
  );
  cone.position.y = -9;
  cone.rotation.x = Math.PI;
  group.add(cone);
  const spot = new THREE.SpotLight(0xfff2b0, 0, 90, 0.5, 0.4);
  spot.position.set(0, -1, 0);
  group.add(spot);
  group.add(spot.target);
  view.scene.add(group);
  view.heli = group;
  view.heliRotor = rotor;
  view.heliSpot = spot;
  return group;
}

export function syncHeli(view, heli, dt, time) {
  if (!heli || !heli.active) {
    if (view.heli) view.heli.visible = false;
    return;
  }
  if (!view.heli) makeHeliMesh(view);
  view.heli.visible = true;
  view.heli.position.set(heli.x, 42 + Math.sin(time * 0.8) * 2, heli.z);
  view.heli.rotation.y = heli.heading;
  if (view.heliRotor) view.heliRotor.rotation.y += dt * 28;
  if (view.heliSpot) view.heliSpot.intensity = heli.night ? 60 : 0;
}

export function makeGateMeshes(view, gates) {
  // Clear old rings first.
  for (const g of view.gates) view.scene.remove(g);
  view.gates = [];
  for (const gate of gates) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(6, 0.5, 10, 28),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
    );
    ring.position.set(gate.x, 3, gate.z);
    ring.rotation.y = Math.PI / 2;
    view.scene.add(ring);
    view.gates.push(ring);
  }
  return view.gates;
}

export function pulseGates(view, time) {
  view.gates.forEach((ring, i) => {
    const s = 1 + Math.sin(time * 3 + i) * 0.08;
    ring.scale.set(s, s, s);
  });
}

export function makeVentureMarkers(view, spots) {
  for (const m of view.markers) view.scene.remove(m);
  view.markers = [];
  for (const spot of spots) {
    const marker = new THREE.Mesh(
      new THREE.ConeGeometry(1.6, 3.4, 8),
      new THREE.MeshBasicMaterial({ color: 0xffd23f }),
    );
    marker.position.set(spot.x, 5.5, spot.z);
    view.scene.add(marker);
    view.markers.push(marker);
  }
  return view.markers;
}

export function bobMarkers(view, time) {
  view.markers.forEach((m, i) => {
    m.position.y = 5.5 + Math.sin(time * 2 + i * 1.3) * 0.5;
    m.rotation.y += 0.01;
  });
}

// --- Camera, light, and the frame ---

export function followCamera(view, focus, dt) {
  // Third-person chase cam: behind and above the focus, easing toward it.
  const behind = 14;
  const height = 7.5;
  const tx = focus.x - Math.sin(focus.heading) * behind;
  const tz = focus.z - Math.cos(focus.heading) * behind;
  const ty = height;
  const ease = 1 - Math.pow(0.001, dt);
  view.camera.position.x += (tx - view.camera.position.x) * ease;
  view.camera.position.y += (ty - view.camera.position.y) * ease;
  view.camera.position.z += (tz - view.camera.position.z) * ease;
  view.camera.lookAt(focus.x, 2, focus.z);
}

export function snapCamera(view, focus) {
  // Put the chase cam exactly on its target (for staged screenshots, where
  // there are no frames to ease across).
  const behind = 14;
  const height = 7.5;
  view.camera.position.set(
    focus.x - Math.sin(focus.heading) * behind,
    height,
    focus.z - Math.cos(focus.heading) * behind,
  );
  view.camera.lookAt(focus.x, 2, focus.z);
}

export function applySky(view, clock) {
  // Blend the sky, fog and sun by the hour: noon, golden hour, night.
  const { sun, ambient, hemi, scene } = view;
  if (clock.isNight) {
    scene.background.setHex(LOOK.skyNight);
    scene.fog.color.setHex(LOOK.fogNight);
    sun.intensity = 0.25;
    sun.color.setHex(0x9fb6ff);
    ambient.intensity = 0.35;
    hemi.intensity = 0.25;
  } else if (clock.golden) {
    scene.background.setHex(LOOK.skyGolden);
    scene.fog.color.setHex(LOOK.fogGolden);
    sun.intensity = 1.6;
    sun.color.setHex(0xffc98a);
    ambient.intensity = 0.7;
    hemi.intensity = 0.55;
  } else {
    scene.background.setHex(LOOK.skyNoon);
    scene.fog.color.setHex(0x8ec9e8);
    sun.intensity = 2.2;
    sun.color.setHex(0xffe0b3);
    ambient.intensity = 0.85;
    hemi.intensity = 0.7;
  }
  // Lamps burn only once it is dark.
  const glow = clock.lampGlow || 0;
  for (const lamp of view.lampHeads) {
    lamp.glow.intensity = glow * 14;
    lamp.head.material.color.setHex(glow > 0.4 ? 0xffe9a8 : 0x555555);
  }
}

export function applyHeadlights(view, on) {
  // Headlights are the car's own lamps; the renderer keeps them as a flag
  // the car meshes read when they are built. Night driving without them is
  // dark, so main.js turns them on at dusk.
  view.headlightsOn = !!on;
}

export function renderFrame(view, game, dt, time) {
  // Sync every live car and ped mesh to the game state, then draw.
  const liveCars = new Set();
  for (const car of game.cars || []) {
    liveCars.add(car.id);
    syncCarMesh(view, car);
  }
  if (game.playerCar) {
    liveCars.add(game.playerCar.id);
    syncCarMesh(view, game.playerCar);
  }
  pruneCarMeshes(view, liveCars);

  const livePeds = new Set();
  for (const ped of game.peds || []) {
    livePeds.add(ped.id);
    syncPedMesh(view, ped);
  }
  for (const shopper of game.shoppers || []) {
    const id = shopper.id || `shop-${shopper.x}-${shopper.z}`;
    if (!livePeds.has(id)) {
      livePeds.add(id);
      syncPedMesh(view, { ...shopper, id });
    }
  }
  prunePedMeshes(view, livePeds);

  syncHeli(view, game.heli, dt, time);
  pulseGates(view, time);
  bobMarkers(view, time);

  // The camera follows the player — in the car, or on foot.
  const focus = game.player.inCar && game.playerCar
    ? { x: game.playerCar.x, z: game.playerCar.z, heading: game.playerCar.heading }
    : { x: game.player.x, z: game.player.z, heading: game.player.heading };
  followCamera(view, focus, dt);
  applySky(view, game.clock);
  view.renderer.render(view.scene, view.camera);
}

export function resizeRenderer(view) {
  const w = window.innerWidth;
  const h = window.innerHeight;
  view.camera.aspect = w / h;
  view.camera.updateProjectionMatrix();
  view.renderer.setSize(w, h);
}

export function disposeView(view) {
  view.renderer.dispose();
}
