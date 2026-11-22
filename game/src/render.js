// The 3D renderer for Solmar Heat (Three.js, vendored under game/vendor).
// One scene: a sunset city of coloured blocks, palms, a beach, clouds, a
// bright sun disc, a police helicopter, traffic, pedestrians and wrecks.
// The camera chases the player, or holds a staged shot for a screenshot.

import * as THREE from '../vendor/three.module.min.js';
import { isGoldenHour } from './daynight.js';

const SKY = {
  golden: { bg: 0xe88a4a, sun: 0xffb060, sunI: 1.25, hemiSky: 0xffd0a0, hemiGround: 0x4a3a2a, hemiI: 0.75 },
  day: { bg: 0x87b5d6, sun: 0xfff2d0, sunI: 1.0, hemiSky: 0xbfd9ff, hemiGround: 0x6a7a5a, hemiI: 0.85 },
  night: { bg: 0x141c33, sun: 0x4a5a8a, sunI: 0.25, hemiSky: 0x2a3a5a, hemiGround: 0x1a1a1a, hemiI: 0.45 },
};

function skyFor(clock) {
  if (clock.isNight) return SKY.night;
  if (isGoldenHour(clock)) return SKY.golden;
  return SKY.day;
}

export function createRender(game, canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(window.innerWidth, window.innerHeight);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(SKY.golden.bg);
  scene.fog = new THREE.Fog(SKY.golden.bg, 120, 520);

  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1200);
  camera.position.set(7, 13, 76);

  const hemi = new THREE.HemisphereLight(SKY.golden.hemiSky, SKY.golden.hemiGround, SKY.golden.hemiI);
  scene.add(hemi);
  const sunLight = new THREE.DirectionalLight(SKY.golden.sun, SKY.golden.sunI);
  sunLight.position.set(-120, 160, 80);
  scene.add(sunLight);

  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const materials = new Map();
  function mat(color) {
    let m = materials.get(color);
    if (!m) {
      m = new THREE.MeshLambertMaterial({ color });
      materials.set(color, m);
    }
    return m;
  }

  // Ground: the city base, the sand strip, the water.
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(560, 560), mat(0x3d4a3a));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  scene.add(ground);
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(70, 560), mat(0xd9c08a));
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(-235, 0.01, 0);
  scene.add(sand);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(70, 560), mat(0x3a7a9a));
  water.rotation.x = -Math.PI / 2;
  water.position.set(-285, 0.02, 0);
  scene.add(water);

  // Roads: dark strips on the avenues and streets, with yellow centre
  // lines and crosswalks at the central intersections.
  const roadMat = mat(0x232323);
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xd8b93c });
  const walkMat = new THREE.MeshBasicMaterial({ color: 0xd8d8d8 });
  for (let i = -4; i <= 4; i += 1) {
    const at = i * 52;
    const avenue = new THREE.Mesh(new THREE.PlaneGeometry(12, 440), roadMat);
    avenue.rotation.x = -Math.PI / 2;
    avenue.position.set(at, 0.02, 0);
    scene.add(avenue);
    const street = new THREE.Mesh(new THREE.PlaneGeometry(440, 12), roadMat);
    street.rotation.x = -Math.PI / 2;
    street.position.set(0, 0.02, at);
    scene.add(street);
    const lineA = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 440), lineMat);
    lineA.rotation.x = -Math.PI / 2;
    lineA.position.set(at, 0.04, 0);
    scene.add(lineA);
    const lineS = new THREE.Mesh(new THREE.PlaneGeometry(440, 0.5), lineMat);
    lineS.rotation.x = -Math.PI / 2;
    lineS.position.set(0, 0.04, at);
    scene.add(lineS);
  }
  for (const [cx, cz] of [[0, 0], [52, 0], [0, 52], [52, 52]]) {
    for (let s = -2; s <= 2; s += 1) {
      const stripe = new THREE.Mesh(new THREE.PlaneGeometry(1, 7), walkMat);
      stripe.rotation.x = -Math.PI / 2;
      stripe.position.set(cx + s * 2.2, 0.05, cz - 8);
      scene.add(stripe);
    }
  }

  // Buildings: one shared box, scaled per building, with a roof cap.
  for (const b of game.city.buildings) {
    const body = new THREE.Mesh(boxGeo, mat(b.color));
    body.scale.set(b.w, b.h, b.d);
    body.position.set(b.x, b.h / 2, b.z);
    scene.add(body);
    const roof = new THREE.Mesh(boxGeo, mat(b.roof));
    roof.scale.set(b.w + 0.6, 0.5, b.d + 0.6);
    roof.position.set(b.x, b.h + 0.25, b.z);
    scene.add(roof);
  }

  // Palms: a trunk and a flat green crown, on the sidewalks.
  const trunkMat = mat(0x7a5a3a);
  const crownMat = mat(0x3f7a3a);
  for (const p of game.city.palms) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 5, 5), trunkMat);
    trunk.position.set(p.x, 2.5, p.z);
    scene.add(trunk);
    const crown = new THREE.Mesh(new THREE.SphereGeometry(2.2, 6, 4), crownMat);
    crown.scale.set(1, 0.45, 1);
    crown.position.set(p.x, 5.6, p.z);
    scene.add(crown);
  }

  // Beach umbrellas: a pole and a striped cone.
  for (const u of game.city.umbrellas) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 5), mat(0x8a8a8a));
    pole.position.set(u.x, 1.3, u.z);
    scene.add(pole);
    const top = new THREE.Mesh(new THREE.ConeGeometry(2.4, 1.2, 8), mat(0xe07856));
    top.position.set(u.x, 3, u.z);
    scene.add(top);
  }

  // Street lamps at the central intersections; their glow follows the clock.
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0 });
  for (const [lx, lz] of [[0, 0], [52, 52], [-52, -52], [104, 104], [-104, -104], [156, 156], [-156, -156], [0, 104], [104, 0]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 7, 5), mat(0x2a2a2a));
    pole.position.set(lx + 6, 3.5, lz + 6);
    scene.add(pole);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.6, 6, 4), lampMat);
    bulb.position.set(lx + 6, 7.2, lz + 6);
    scene.add(bulb);
  }

  // Clouds: ten groups of flat white spheres, drifting east. A basic
  // (unlit) material keeps them white from below as well as above.
  const cloudMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
  const clouds = [];
  for (let i = 0; i < 10; i += 1) {
    const group = new THREE.Group();
    const n = 3 + (i % 3);
    for (let j = 0; j < n; j += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(6 + j * 2, 6, 4), cloudMat);
      puff.scale.set(1, 0.4, 1);
      puff.position.set(j * 7 - 8, (j % 2) * 1.5, (j % 3) * 3 - 3);
      group.add(puff);
    }
    group.position.set(-200 + i * 45, 42 + (i % 4) * 5, -140 + (i % 5) * 70);
    scene.add(group);
    clouds.push(group);
  }

  // The sun disc: a bright yellow ball, camera-relative, always in frame
  // at golden hour, its full circle above the mission banner.
  const sunDisc = new THREE.Mesh(
    new THREE.SphereGeometry(22, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffc21a, fog: false, depthTest: false }),
  );
  sunDisc.renderOrder = 999;
  scene.add(sunDisc);

  // Air One: the police helicopter, body, white stripe, rotor and a
  // spotlight cone that sweeps the street below.
  const heli = new THREE.Group();
  const heliBody = new THREE.Mesh(boxGeo, mat(0x2a2a3a));
  heliBody.scale.set(4.5, 1.6, 2.2);
  heli.add(heliBody);
  const heliStripe = new THREE.Mesh(boxGeo, mat(0xffffff));
  heliStripe.scale.set(4.6, 0.4, 2.3);
  heliStripe.position.set(0, 0.3, 0);
  heli.add(heliStripe);
  const heliTail = new THREE.Mesh(boxGeo, mat(0x2a2a3a));
  heliTail.scale.set(3.5, 0.8, 0.8);
  heliTail.position.set(-3.6, 0.2, 0);
  heli.add(heliTail);
  const rotor = new THREE.Mesh(boxGeo, mat(0x1a1a1a));
  rotor.scale.set(9, 0.12, 0.6);
  rotor.position.set(0, 1.1, 0);
  heli.add(rotor);
  const coneMat = new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false });
  const cone = new THREE.Mesh(new THREE.ConeGeometry(7, 26, 12, 1, true), coneMat);
  cone.position.set(0, -13.5, 0);
  heli.add(cone);
  heli.position.set(20, 30, 200);
  heli.scale.set(1.6, 1.6, 1.6);
  scene.add(heli);

  const render = {
    renderer,
    scene,
    camera,
    hemi,
    sunLight,
    clouds,
    cloudMat,
    sunDisc,
    heli,
    rotor,
    lampMat,
    carMeshes: new Map(),
    copMeshes: new Map(),
    pedMeshes: new Map(),
    wreckMeshes: new Map(),
    camPos: new THREE.Vector3(7, 13, 76),
  };
  game.render = render;
  return render;
}

function carGroup(color, isSport) {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const darkMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.9, 4.2), bodyMat);
  body.position.y = 0.75;
  g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.7, 2), new THREE.MeshLambertMaterial({ color: 0x2a3a4a }));
  cabin.position.set(0, 1.5, -0.2);
  g.add(cabin);
  for (const [wx, wz] of [[-1, 1.4], [1, 1.4], [-1, -1.4], [1, -1.4]]) {
    const wheel = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.7, 0.7), darkMat);
    wheel.position.set(wx, 0.35, wz);
    g.add(wheel);
  }
  if (isSport) {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.5), darkMat);
    spoiler.position.set(0, 1.35, -2);
    g.add(spoiler);
    const roofLine = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 2.2), darkMat);
    roofLine.position.set(0, 1.9, -0.2);
    g.add(roofLine);
  }
  return g;
}

function syncVehicles(game, render) {
  const seen = new Set();
  for (const car of game.cars) {
    if (car.exploded) {
      const old = render.carMeshes.get(car.id);
      if (old) {
        render.scene.remove(old);
        render.carMeshes.delete(car.id);
      }
      continue;
    }
    seen.add(car.id);
    let mesh = render.carMeshes.get(car.id);
    if (!mesh) {
      mesh = carGroup(car.color, car.model === 'sport');
      render.scene.add(mesh);
      render.carMeshes.set(car.id, mesh);
    }
    mesh.position.set(car.x, 0, car.z);
    mesh.rotation.y = car.heading;
  }
  for (const [id, mesh] of render.carMeshes) {
    if (!seen.has(id)) {
      render.scene.remove(mesh);
      render.carMeshes.delete(id);
    }
  }
  const seenCops = new Set();
  for (const cop of game.cops) {
    seenCops.add(cop.id);
    let mesh = render.copMeshes.get(cop.id);
    if (!mesh) {
      mesh = carGroup(0x1a1a2e, false);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.25, 0.5), new THREE.MeshBasicMaterial({ color: 0xff2a2a }));
      bar.position.set(0, 1.95, -0.2);
      mesh.add(bar);
      render.scene.add(mesh);
      render.copMeshes.set(cop.id, mesh);
    }
    mesh.position.set(cop.x, 0, cop.z);
    mesh.rotation.y = cop.heading;
  }
  for (const [id, mesh] of render.copMeshes) {
    if (!seenCops.has(id)) {
      render.scene.remove(mesh);
      render.copMeshes.delete(id);
    }
  }
}

function syncPeds(game, render) {
  const seen = new Set();
  for (let i = 0; i < game.peds.length; i += 1) {
    const ped = game.peds[i];
    seen.add(i);
    let mesh = render.pedMeshes.get(i);
    if (!mesh) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 1.1, 0.4), new THREE.MeshLambertMaterial({ color: ped.color }));
      body.position.y = 0.85;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 6, 4), new THREE.MeshLambertMaterial({ color: 0xd9a066 }));
      head.position.y = 1.65;
      g.add(head);
      render.scene.add(g);
      render.pedMeshes.set(i, g);
      mesh = g;
    }
    mesh.position.set(ped.x, 0, ped.z);
  }
  for (const [i, mesh] of render.pedMeshes) {
    if (!seen.has(i)) {
      render.scene.remove(mesh);
      render.pedMeshes.delete(i);
    }
  }
}

function syncWrecks(game, render) {
  const seen = new Set();
  for (let i = 0; i < game.wrecks.length; i += 1) {
    const wreck = game.wrecks[i];
    seen.add(i);
    let mesh = render.wreckMeshes.get(i);
    if (!mesh) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.BoxGeometry(2, 0.8, 4.2), new THREE.MeshLambertMaterial({ color: 0x141414 }));
      body.position.y = 0.6;
      g.add(body);
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(1.3, 3.2, 8),
        new THREE.MeshBasicMaterial({ color: 0xff6a00, transparent: true, opacity: 0.9 }),
      );
      flame.position.y = 2.4;
      flame.name = 'flame';
      g.add(flame);
      render.scene.add(g);
      render.wreckMeshes.set(i, g);
      mesh = g;
    }
    mesh.position.set(wreck.x, 0, wreck.z);
    const flame = mesh.getObjectByName('flame');
    if (flame) {
      const flicker = 1 + Math.sin(game.time * 9 + i * 2) * 0.25;
      flame.scale.set(flicker, 1 + Math.sin(game.time * 7 + i) * 0.3, flicker);
    }
  }
  for (const [i, mesh] of render.wreckMeshes) {
    if (!seen.has(i)) {
      render.scene.remove(mesh);
      render.wreckMeshes.delete(i);
    }
  }
}

// One frame: sky, lights, camera, the sun, the clouds, the helicopter,
// every vehicle and pedestrian, then the render.
export function drawFrame(game, dt) {
  const render = game.render;
  if (!render) return;
  const sky = skyFor(game.clock);
  render.scene.background.setHex(sky.bg);
  render.scene.fog.color.setHex(sky.bg);
  render.hemi.color.setHex(sky.hemiSky);
  render.hemi.groundColor.setHex(sky.hemiGround);
  render.hemi.intensity = sky.hemiI;
  render.sunLight.color.setHex(sky.sun);
  render.sunLight.intensity = sky.sunI;
  render.lampMat.opacity = game.clock.lampGlow;
  render.cloudMat.opacity = game.clock.isNight ? 0.35 : 0.9;

  // Camera: a staged shot holds still, otherwise chase the player.
  const cam = render.camera;
  if (game.shotCam) {
    cam.position.set(game.shotCam.x, game.shotCam.y, game.shotCam.z);
    cam.lookAt(game.shotCam.lookX, game.shotCam.lookY, game.shotCam.lookZ);
  } else {
    const px = game.car ? game.car.x : game.player.x;
    const pz = game.car ? game.car.z : game.player.z;
    const heading = game.car ? game.car.heading : game.player.heading;
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    const tx = px - fx * (game.car ? 16 : 9);
    const tz = pz - fz * (game.car ? 16 : 9);
    const ty = game.car ? 8 : 5;
    render.camPos.x += (tx - render.camPos.x) * 0.12;
    render.camPos.y += (ty - render.camPos.y) * 0.12;
    render.camPos.z += (tz - render.camPos.z) * 0.12;
    cam.position.copy(render.camPos);
    cam.lookAt(px + fx * 12, 2, pz + fz * 12);
  }

  // The sun disc hangs camera-relative, its full circle above the banner.
  const forward = new THREE.Vector3();
  cam.getWorldDirection(forward);
  const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
  const sunY = isGoldenHour(game.clock) ? 120 : 170;
  render.sunDisc.position
    .copy(cam.position)
    .addScaledVector(forward, 380)
    .addScaledVector(right, -120);
  render.sunDisc.position.y = sunY;
  render.sunDisc.visible = !game.clock.isNight;

  // Clouds drift east and wrap.
  for (const cloud of render.clouds) {
    cloud.position.x += dt * 1.5;
    if (cloud.position.x > 260) cloud.position.x = -260;
  }

  // Air One follows the player when the heat is on, its rotor spinning.
  const tx = game.car ? game.car.x : game.player.x;
  const tz = game.car ? game.car.z : game.player.z;
  if (game.player.wanted >= 1) {
    render.heli.position.x += (tx + 12 - render.heli.position.x) * 0.02;
    render.heli.position.z += (tz + 20 - render.heli.position.z) * 0.02;
    render.heli.position.y = 30;
    render.heli.visible = true;
  } else {
    render.heli.position.x += 2 * dt;
    if (render.heli.position.x > 260) render.heli.position.x = -260;
    render.heli.position.y = 42;
    render.heli.visible = true;
  }
  render.rotor.rotation.y += dt * 18;

  syncVehicles(game, render);
  syncPeds(game, render);
  syncWrecks(game, render);

  // The player on foot is a small figure; the car is the mesh already.
  render.renderer.render(render.scene, cam);
}
