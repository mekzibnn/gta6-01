// Solmar Heat v12 — screenshot staging (window.__stageShot): cover / drive / mission / night.
import { DISPATCH_UNITS } from './config.js';
import { MISSION_DEFS, setObjective } from './missions.js';

function ensureSedan(g) {
  let sedan = g.cars.find((c) => c.model === 'sedan' && !c.exploded);
  if (!sedan) {
    sedan = { id: 9001, model: 'sedan', x: 0, z: 40, heading: 0, speed: 0, health: 100, maxHealth: 100, exploded: false, nitroBurn: 0, top: 28, accel: 13, turn: 1.9, price: 400, label: 'SEDAN', color: 0xd94f3d, traffic: false, lane: 0, dir: 0, ai: null };
    g.cars.unshift(sedan);
  }
  return sedan;
}

function stageCops(g, spots) {
  g.cops = [];
  for (let i = 0; i < 6; i += 1) {
    const u = DISPATCH_UNITS[i];
    const s = spots[i % spots.length];
    g.cops.push({ id: 200 + i, kind: u.kind, name: u.name, role: u.role, x: s.x, z: s.z, heading: s.h || 0, speed: 0, health: 100 });
  }
}

export function stageShot(g, name) {
  g.staged = name;
  g.paused = false;
  g.stageFreeze = true;
  g.weather.kind = 'clear';
  g.weather.timer = 80;
  if (name === 'cover') {
    g.clock.hour = 18.02;
    g.mission.index = 0; g.mission._current = 0; g.mission.step = 0; g.mission.timeLeft = 149;
    g.objectiveText = 'Wheels Up — Drive to the Garage — do not get busted';
    g.hud.banner = 'MISSION 1 · WHEELS UP';
    g.hud.bannerT = 10; g.hud.bannerKind = 'mission';
    g.player.wanted = 3; g.player.lastCrime = g.time;
    const sedan = ensureSedan(g);
    sedan.x = -3; sedan.z = 42; sedan.heading = 0; sedan.speed = 0; sedan.health = 100;
    g.player.inCar = true; g.car = sedan;
    g.player.x = -3; g.player.z = 42; g.player.heading = 0;
    // Burning wreck: blackened car, big flames, open road, flanked by police.
    // Placed between the palm rows (z 56) so no palm foliage blocks it, and
    // turned broadside (heading 1.1) so the long body + cab read as a car,
    // with the two flames spread along the body. Player sedan sits left
    // and never blocks it.
    if (!g.wrecks.some((w) => Math.hypot(w.x - 2, w.z - 56) < 5)) {
      g.wrecks.push({ x: 2, z: 56, heading: 1.1, model: 'sedan', t: 0, flames: 2, scale: 1.6 });
    }
    stageCops(g, [
      { x: -4, z: 54, h: 0 }, { x: 10, z: 58, h: 0 }, { x: -9, z: 68, h: 0 },
      { x: 13, z: 72, h: 0 }, { x: -7, z: 88, h: 0 }, { x: 15, z: 84, h: 0 },
    ]);
    // Parked traffic for a busy street: taxi, sport, van.
    const parked = [
      { model: 'taxi', x: -9, z: 74 }, { model: 'sport', x: 9, z: 80 }, { model: 'van', x: -11, z: 52 },
    ];
    for (const p of parked) {
      const c = g.cars.find((x) => x.model === p.model && x !== sedan && !x.exploded);
      if (c) { c.x = p.x; c.z = p.z; c.heading = 0; c.speed = 0; }
    }
    // Heli low and close (y=20, not the gameplay 38) so it reads big in the
    // upper-right sky, clear of the sun disc, spotlight cone to the road.
    g.heli.active = true; g.heli.locked = true; g.heli.x = 10; g.heli.y = 20; g.heli.z = 55;
    g.stageCam = 'fixed';
    // Camera close to the action: player car big in the lower centre, wreck
    // and cops mid-frame, heli in the upper sky.
    g.stageCamPos = { x: 0, y: 14, z: 18 };
    g.stageCamLook = { x: 0, y: 4, z: 80 };
  } else if (name === 'drive') {
    g.clock.hour = 17.5;
    g.mission.index = 0; g.mission._current = 0; g.mission.step = 0; g.mission.timeLeft = 160;
    g.objectiveText = 'Wheels Up — Drive to the Garage — do not get busted';
    g.hud.banner = 'MISSION 1 · WHEELS UP';
    g.hud.bannerT = 10; g.hud.bannerKind = 'mission';
    g.player.wanted = 1; g.player.lastCrime = g.time;
    const sedan = ensureSedan(g);
    sedan.x = 0; sedan.z = 100; sedan.heading = 0; sedan.speed = 22; sedan.health = 100;
    g.player.inCar = true; g.car = sedan;
    g.player.x = 0; g.player.z = 100; g.player.heading = 0;
    g.heli.active = false; g.heli.locked = false;
    g.stageFreeze = false;
    g.stageCam = 'chase';
  } else if (name === 'mission') {
    g.clock.hour = 18.5;
    g.mission.index = 8; g.mission._current = 8; g.mission.step = 0; g.mission.timeLeft = 135;
    setObjective(g);
    g.hud.banner = "MISSION 9 · SMUGGLER'S RUN";
    g.hud.bannerT = 10; g.hud.bannerKind = 'mission';
    g.player.wanted = 2; g.player.lastCrime = g.time;
    const sedan = ensureSedan(g);
    sedan.x = -160; sedan.z = 190; sedan.heading = 2.4; sedan.speed = 0; sedan.health = 100;
    g.player.inCar = true; g.car = sedan;
    g.player.x = -160; g.player.z = 190; g.player.heading = 2.4;
    g.heli.active = false; g.heli.locked = false;
    g.stageCam = 'fixed';
    g.stageCamPos = { x: -138, y: 14, z: 158 };
    g.stageCamLook = { x: -168, y: 3, z: 198 };
  } else if (name === 'night') {
    g.clock.hour = 22.67;
    g.mission.index = 5; g.mission._current = 5; g.mission.step = 0; g.mission.timeLeft = 120;
    setObjective(g);
    g.hud.banner = 'MISSION 6 · GETAWAY';
    g.hud.bannerT = 10; g.hud.bannerKind = 'mission';
    g.player.wanted = 2; g.player.lastCrime = g.time;
    const sedan = ensureSedan(g);
    sedan.x = 0; sedan.z = 60; sedan.heading = 0; sedan.speed = 18; sedan.health = 100;
    g.player.inCar = true; g.car = sedan;
    g.player.x = 0; g.player.z = 60; g.player.heading = 0;
    g.heli.active = false; g.heli.locked = false;
    g.stageFreeze = false;
    g.stageCam = 'chase';
  }
  return true;
}
