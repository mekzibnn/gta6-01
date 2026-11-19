// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps, and the renderer paints what is there. The game moves
// between screens: title, play, paused, busted, wasted and win.
//
// ?seed=N fixes the city. ?shot=cover|drive|mission|night (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { STEP, WANTED, POLICE, TRAFFIC, PED } from './config.js';
import { createRandom, pick, range } from './random.js';
import { buildCity, nearestRoadPoint, groundAt, resolveCircle } from './city.js';
import { createCar, spawnParkedCar, spawnTrafficCar, stepDrivenCar, stepTrafficCar, stepPoliceCar } from './vehicles.js';
import { createPlayer, stepPlayerOnFoot, punch, shoot, spawnPed, stepPed, spawnCop, stepCop } from './actors.js';
import {
  createMissionState, currentMission, currentStep, startMission, failMission,
  stepMission, startTaxi, stepTaxi, finishTaxi, checkPackages, packagesLeft,
} from './missions.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_BUSTED, SCREEN_WASTED, SCREEN_WIN } from './render.js';
import { drawHud } from './hud.js';
import { saveGame, loadSave, clearSave, hasSave } from './save.js';
import { stageShot } from './shots.js';
import {
  ACTION_ENTER, ACTION_PUNCH, ACTION_PAUSE, ACTION_CONFIRM, ACTION_WEAPON, createInput,
} from './input.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 1;

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');

function announce(message) {
  statusEl.textContent = message;
}

function createGame(seedValue) {
  const random = createRandom(seedValue);
  const city = buildCity(random);
  const player = createPlayer(city.places.hideout.x, city.places.hideout.y);
  player.shirt = '#e84a4a';
  const cars = [];
  for (let i = 0; i < 10; i += 1) cars.push(spawnParkedCar(random, city));
  for (let i = 0; i < TRAFFIC.count; i += 1) cars.push(spawnTrafficCar(random));
  const peds = [];
  for (let i = 0; i < PED.count; i += 1) peds.push(spawnPed(random, city));
  const game = {
    seed: seedValue,
    random,
    city,
    player,
    cars,
    policeCars: [],
    cops: [],
    peds,
    particles: [],
    skids: [],
    mission: createMissionState(),
    audio: createAudio(),
    time: 0,
    clock: 10 * 60,
    nightFactor: 0,
    toast: '',
    toastTime: 0,
    toastColor: '',
    objectiveText: '',
    missionTarget: null,
    taxiCustomer: null,
    hasSave: hasSave(),
    missionDelay: 0,
    bustTimer: 0,
    muted: false,
  };
  return game;
}

function setToast(game, text, seconds, color) {
  game.toast = text;
  game.toastTime = seconds || 3;
  game.toastColor = color || '';
}

function spawnParticles(game, x, y, color, count, speed) {
  for (let i = 0; i < count; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const v = (speed || 120) * (0.4 + Math.random() * 0.8);
    game.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6 + Math.random() * 0.4, color, size: 2 + Math.random() * 3 });
  }
}

function raiseWanted(game, amount) {
  const player = game.player;
  if (player.wanted >= WANTED.max) return;
  player.wanted = Math.min(WANTED.max, player.wanted + amount);
  player.wantedTimer = 0;
  game.audio.wantedUp();
  setToast(game, `WANTED — ${'★'.repeat(player.wanted)}`, 2.5, '#ff5a4e');
  announce(`Wanted level ${player.wanted}.`);
}

function nearestCar(game, x, y, maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of game.cars) {
    if (car.police) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { best = car; bestD = d; }
  }
  return best;
}

function enterCar(game, car) {
  const player = game.player;
  if (car.police) return;
  if (Math.abs(car.speed) > 60) {
    setToast(game, 'Too fast to jack!', 1.5);
    return;
  }
  player.car = car;
  player.onFoot = false;
  car.parked = false;
  car.traffic = false;
  player.x = car.x;
  player.y = car.y;
  player.angle = car.angle;
  game.audio.door();
  // Stealing in sight of the law — or a witness — raises heat.
  let seen = false;
  for (const cop of game.cops) if (Math.hypot(cop.x - player.x, cop.y - player.y) < 350) seen = true;
  for (const pc of game.policeCars) if (Math.hypot(pc.x - player.x, pc.y - player.y) < 350) seen = true;
  if (!seen) for (const ped of game.peds) if (ped.health > 0 && Math.hypot(ped.x - player.x, ped.y - player.y) < 200) seen = true;
  if (seen && !car.wasStolen) raiseWanted(game, 1);
  car.wasStolen = true;
  // A mission step that needed a car is done.
  if (game.mission.active) {
    const step = currentStep(game.mission);
    if (step && step.type === 'steal') {
      game.mission.step += 1;
      setToast(game, 'Car stolen — get it to the garage', 2.5);
    }
  }
}

function exitCar(game) {
  const player = game.player;
  const car = player.car;
  if (!car) return;
  car.speed = 0;
  const side = car.angle + Math.PI / 2;
  player.x = car.x + Math.cos(side) * 42;
  player.y = car.y + Math.sin(side) * 42;
  const fixed = resolveCircle(game.city, player.x, player.y, 13);
  player.x = fixed.x;
  player.y = fixed.y;
  player.angle = car.angle;
  player.car = null;
  player.onFoot = true;
  game.audio.door();
}

function policeTargetCount(wanted) {
  return WANTED.chaseCars[Math.min(WANTED.max, wanted)];
}

function maintainPolice(game, dt) {
  const player = game.player;
  const wanted = player.wanted;
  const wantCars = policeTargetCount(wanted);
  // Spawn police cars on roads near the player, off-screen.
  if (game.policeCars.length < wantCars) {
    const road = nearestRoadPoint(player.x + (Math.random() < 0.5 ? -750 : 750), player.y + (Math.random() < 0.5 ? -550 : 550));
    const car = createCar('police', road.x, road.y, 0, game.random);
    car.speed = 300;
    game.policeCars.push(car);
  }
  // Despawn far ones.
  game.policeCars = game.policeCars.filter((car) => Math.hypot(car.x - player.x, car.y - player.y) < 1400);
  // Foot cops when the player is on foot and wanted.
  const wantCops = player.onFoot ? Math.min(3, wanted) : 0;
  if (game.cops.length < wantCops) {
    const angle = Math.random() * Math.PI * 2;
    game.cops.push(spawnCop(player.x + Math.cos(angle) * 420, player.y + Math.sin(angle) * 420));
  }
  game.cops = game.cops.filter((cop) => cop.health > 0 && Math.hypot(cop.x - player.x, cop.y - player.y) < 900);
  void dt;
}

function updateWanted(game, dt) {
  const player = game.player;
  if (player.wanted <= 0) return;
  let near = false;
  for (const car of game.policeCars) if (Math.hypot(car.x - player.x, car.y - player.y) < 550) near = true;
  for (const cop of game.cops) if (Math.hypot(cop.x - player.x, cop.y - player.y) < 400) near = true;
  if (near) {
    player.wantedTimer = 0;
    return;
  }
  player.wantedTimer += dt;
  if (player.wantedTimer >= WANTED.decaySeconds) {
    player.wanted -= 1;
    player.wantedTimer = 0;
    setToast(game, 'Heat dying down…', 2);
  }
}

function nightFactorFor(clock) {
  const hour = (clock / 60) % 24;
  if (hour >= 20.5 || hour < 6) return 1;
  if (hour >= 7.5 && hour < 17.5) return 0;
  if (hour >= 17.5 && hour < 20.5) return (hour - 17.5) / 3;
  return 1 - (hour - 6) / 1.5;
}

function updateObjective(game) {
  const player = game.player;
  const mission = game.mission;
  // Contextual interaction hints win over the mission line.
  if (player.onFoot) {
    const car = nearestCar(game, player.x, player.y, 55);
    if (car) { game.objectiveText = 'Press E to steal the car'; game.missionTarget = null; return; }
    if (Math.hypot(player.x - game.city.places.gunshop.x, player.y - game.city.places.gunshop.y) < 90) {
      game.objectiveText = 'Press E — buy ammo $40 (El Gato Guns)';
      return;
    }
    if (Math.hypot(player.x - game.city.places.clinic.x, player.y - game.city.places.clinic.y) < 90) {
      game.objectiveText = 'Press E — heal up $80 (Clinica Sol)';
      return;
    }
    const taxiPed = game.peds.find((p) => p.taxi && p.health > 0 && Math.hypot(p.x - player.x, p.y - player.y) < 60);
    if (taxiPed) { game.objectiveText = 'A fare is waiting — get in a car'; return; }
  } else {
    if (player.wanted > 0 && Math.hypot(player.x - game.city.places.spray.x, player.y - game.city.places.spray.y) < 110) {
      game.objectiveText = 'Press E — respray $150, lose the heat';
      return;
    }
    const taxiPed = game.peds.find((p) => p.taxi && p.health > 0 && Math.hypot(p.x - player.x, p.y - player.y) < 60);
    if (taxiPed) {
      game.objectiveText = 'TAXI! Press E to pick up the fare';
      game.taxiCustomer = taxiPed;
      return;
    }
  }
  game.taxiCustomer = null;
  if (mission.taxi) {
    game.objectiveText = `Taxi fare — take them to ${mission.taxi.dest.label}`;
    game.missionTarget = mission.taxi.dest;
    return;
  }
  if (mission.active) {
    const current = currentMission(mission);
    const step = currentStep(mission);
    if (current && step) {
      game.objectiveText = `${current.title} — ${step.text}`;
      game.missionTarget = step.place ? game.city.places[step.place] : null;
      return;
    }
  }
  if (mission.done) {
    game.objectiveText = `Solmar Legend — free roam · ${packagesLeft(mission)} packages left`;
    game.missionTarget = null;
    return;
  }
  const next = currentMission(mission);
  game.objectiveText = next ? `Next job: ${next.title} — press ENTER to start` : 'Free roam — find work, Leo';
  game.missionTarget = null;
}

function handleEnter(game) {
  const player = game.player;
  const city = game.city;
  if (!player.onFoot) {
    exitCar(game);
    return;
  }
  // Shops first.
  if (Math.hypot(player.x - city.places.gunshop.x, player.y - city.places.gunshop.y) < 90) {
    if (player.cash >= WANTED.ammoCost) {
      player.cash -= WANTED.ammoCost;
      player.ammo += 24;
      player.weapon = 'pistol';
      game.audio.coin();
      setToast(game, 'Ammo +24 — stay safe out there', 2);
    } else setToast(game, 'Not enough cash for ammo', 2);
    return;
  }
  if (Math.hypot(player.x - city.places.clinic.x, player.y - city.places.clinic.y) < 90) {
    if (player.cash >= WANTED.healCost) {
      player.cash -= WANTED.healCost;
      player.health = 100;
      game.audio.coin();
      setToast(game, 'Patched up — full health', 2);
    } else setToast(game, 'Not enough cash to heal', 2);
    return;
  }
  const car = nearestCar(game, player.x, player.y, 55);
  if (car) enterCar(game, car);
}

function handleEnterInCar(game) {
  const player = game.player;
  const city = game.city;
  // Spray shop clears the heat.
  if (player.wanted > 0 && Math.hypot(player.x - city.places.spray.x, player.y - city.places.spray.y) < 110) {
    if (player.cash >= WANTED.sprayCost) {
      player.cash -= WANTED.sprayCost;
      player.wanted = 0;
      player.wantedTimer = 0;
      game.policeCars = [];
      game.cops = [];
      game.audio.coin();
      setToast(game, 'Clean! Fresh paint, no heat', 2.5);
      spawnParticles(game, player.x, player.y, '#2fa36b', 14, 90);
    } else setToast(game, 'Respray costs $150', 2);
    return;
  }
  const taxiPed = game.peds.find((p) => p.taxi && p.health > 0 && Math.hypot(p.x - player.x, p.y - player.y) < 60);
  if (taxiPed) {
    taxiPed.health = 0;
    const dest = startTaxi(game.mission, player, city, game.random);
    setToast(game, `Fare to ${dest.label} — 90 seconds`, 2.5);
    game.audio.blip();
    return;
  }
  exitCar(game);
}

function stepGame(game, input, dt) {
  const player = game.player;
  const city = game.city;
  game.time += dt;
  game.clock += dt * 0.5;
  game.nightFactor = nightFactorFor(game.clock);
  if (game.toastTime > 0) game.toastTime -= dt;

  // Delayed start of the next story mission.
  if (game.missionDelay > 0) {
    game.missionDelay -= dt;
    if (game.missionDelay <= 0 && !game.mission.done) {
      const next = currentMission(game.mission);
      if (next) {
        startMission(game.mission, game.audio);
        if (next.wanted) player.wanted = Math.max(player.wanted, next.wanted);
        setToast(game, `MISSION: ${next.title}`, 4, '#ffd94a');
        announce(`${next.title}. ${next.brief}`);
      }
    }
  }

  const actions = input.takeActions();
  const axes = input.axes();
  player.run = input.running();
  if (input.isMuted() !== game.muted) {
    game.muted = input.isMuted();
    game.audio.setEnabled(!game.muted);
  }

  // Aiming on foot with the pistol.
  let aimAngle = player.angle;
  if (!player.onFoot || player.weapon === 'pistol') {
    const mouse = input.mouse();
    const renderer = game.renderer;
    if (renderer) {
      const world = renderer.screenToWorld(mouse.x, mouse.y, game);
      aimAngle = Math.atan2(world.y - player.y, world.x - player.x);
    }
  }

  if (player.onFoot) {
    stepPlayerOnFoot(player, axes, dt, city, aimAngle, input.firing(), game.peds, game.cops);
    if (actions & ACTION_ENTER) handleEnter(game);
    if (actions & ACTION_PUNCH) {
      const hits = punch(player, game.peds, game.cops, game.audio);
      if (hits > 0) {
        spawnParticles(game, player.x + Math.cos(player.angle) * 30, player.y + Math.sin(player.angle) * 30, '#ffd94a', 6, 80);
        const copNear = game.cops.some((c) => Math.hypot(c.x - player.x, c.y - player.y) < 300);
        if (copNear) raiseWanted(game, 1);
      }
    }
    if (actions & ACTION_WEAPON) {
      player.weapon = player.weapon === 'fists' ? 'pistol' : 'fists';
      setToast(game, player.weapon === 'pistol' ? 'Pistol ready' : 'Fists', 1.2);
    }
    if (input.firing() && player.weapon === 'pistol') {
      const hit = shoot(player, aimAngle, game.peds, game.cops, game.cars, game.audio);
      if (hit) {
        spawnParticles(game, player.x + Math.cos(aimAngle) * 60, player.y + Math.sin(aimAngle) * 60, '#ff5a4e', 8, 100);
        if (hit.kind === 'ped') raiseWanted(game, 1);
        if (hit.kind === 'cop') raiseWanted(game, 2);
      }
    }
  } else if (player.car) {
    const car = player.car;
    const result = stepDrivenCar(car, { x: axes.x, y: axes.y, handbrake: input.handbrake() }, dt, city, game.cars);
    player.x = car.x;
    player.y = car.y;
    player.angle = car.angle;
    if (result === 'crash') {
      game.audio.crash();
      spawnParticles(game, car.x, car.y, '#9a9a9a', 12, 140);
    }
    // Skid marks when handbraking at speed.
    if (input.handbrake() && Math.abs(car.speed) > 150) {
      game.skids.push({ x: car.x, y: car.y, angle: car.angle, life: 1 });
      if (game.skids.length > 80) game.skids.shift();
    }
    // Running over pedestrians is a crime, and it is visible.
    for (const ped of game.peds) {
      if (ped.health <= 0 || ped.hitCooldown > 0) continue;
      const d = Math.hypot(ped.x - car.x, ped.y - car.y);
      if (d < 26 && Math.abs(car.speed) > 80) {
        ped.health -= 60;
        ped.flee = 3;
        ped.hitCooldown = 2;
        spawnParticles(game, ped.x, ped.y, '#ff5a4e', 10, 120);
        game.audio.crash();
        raiseWanted(game, 1);
      }
    }
    if (actions & ACTION_ENTER) handleEnterInCar(game);
  }

  for (const skid of game.skids) skid.life -= dt * 0.25;
  game.skids = game.skids.filter((s) => s.life > 0);
  for (const ped of game.peds) {
    if (ped.hitCooldown > 0) ped.hitCooldown -= dt;
  }

  // Traffic and pedestrians keep the city alive.
  for (const car of game.cars) {
    if (car.traffic) stepTrafficCar(car, dt, city, game.cars, game.random);
  }
  const danger = player.wanted > 0 ? player : null;
  for (const ped of game.peds) stepPed(ped, dt, city, danger);

  // Police.
  if (player.wanted > 0) maintainPolice(game, dt);
  for (const car of game.policeCars) {
    stepPoliceCar(car, player, dt, city, game.cars);
    // A police ram hurts.
    if (!player.onFoot && player.car) {
      const d = Math.hypot(car.x - player.x, car.y - player.y);
      if (d < 56 && Math.abs(car.speed) > 200) {
        player.car.speed *= 0.6;
        game.audio.crash();
        spawnParticles(game, player.x, player.y, '#9a9a9a', 8, 120);
      }
    }
  }
  // Foot cops chase and punch; at 3+ stars they shoot.
  for (const cop of game.cops) {
    const result = stepCop(cop, player, dt, city, game.audio);
    if (result === 'wasted') return 'wasted';
    if (player.wanted >= POLICE.shootAtStars && player.onFoot) {
      cop.shootCooldown -= dt;
      const d = Math.hypot(cop.x - player.x, cop.y - player.y);
      if (d < 320 && d > 60 && cop.shootCooldown <= 0) {
        cop.shootCooldown = 1.7;
        player.health -= 6;
        player.hurtFlash = 0.25;
        spawnParticles(game, cop.x, cop.y, '#ffd94a', 5, 90);
        game.audio.shoot();
        if (player.health <= 0) return 'wasted';
      }
    }
  }
  updateWanted(game, dt);

  // Busted: boxed in by the law while slow.
  let bust = false;
  if (!player.onFoot && player.car && Math.abs(player.car.speed) < 25) {
    for (const car of game.policeCars) {
      if (Math.hypot(car.x - player.x, car.y - player.y) < 70) bust = true;
    }
  }
  if (player.onFoot) {
    for (const cop of game.cops) {
      if (Math.hypot(cop.x - player.x, cop.y - player.y) < 26) bust = true;
    }
  }
  if (bust) {
    game.bustTimer += dt;
    if (game.bustTimer > 1.6) return 'busted';
  } else game.bustTimer = 0;

  // Missions, taxi, packages.
  const missionEvent = stepMission(game.mission, player, city, dt, game.audio);
  if (missionEvent && missionEvent.startsWith('mission-done:')) {
    const reward = Number(missionEvent.split(':')[1]);
    setToast(game, `MISSION COMPLETE — +$${reward}`, 4, '#7dff8a');
    announce(`Mission complete. Earned $${reward}.`);
    saveGame(game);
    spawnParticles(game, player.x, player.y, '#7dff8a', 18, 130);
    if (game.mission.done) return 'win';
    game.missionDelay = 4;
  } else if (missionEvent === 'mission-failed') {
    setToast(game, 'MISSION FAILED — press ENTER to retry', 5, '#ff5a4e');
    announce('Mission failed. Press Enter to retry.');
  }
  if (game.mission.taxi) {
    const taxiEvent = stepTaxi(game.mission, player, dt, game.audio);
    if (taxiEvent === 'taxi-late') setToast(game, 'The fare walked away…', 2.5);
    else {
      const dest = game.mission.taxi.dest;
      if (Math.hypot(player.x - dest.x, player.y - dest.y) < 90) {
        const fare = finishTaxi(game.mission, player, game.audio);
        setToast(game, `Fare complete — +$${fare}`, 3, '#7dff8a');
      }
    }
  }
  if (checkPackages(game.mission, player, city, game.audio) > 0) {
    setToast(game, `Hidden package found! +$100 (${packagesLeft(game.mission)} left)`, 3, '#ffd94a');
  }

  // Particles fade.
  for (const p of game.particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);

  // Audio follows the action.
  game.audio.step(game.time, !player.onFoot && !!player.car, player.car ? Math.abs(player.car.speed) / 560 : 0);
  game.audio.setSiren(game.policeCars.length > 0);

  updateObjective(game);
  return null;
}

function respawn(game, kind) {
  const player = game.player;
  player.health = 100;
  player.cash = Math.max(0, player.cash - 200);
  player.wanted = 0;
  player.wantedTimer = 0;
  player.bustTimer = 0;
  game.policeCars = [];
  game.cops = [];
  if (player.car) {
    player.car.speed = 0;
    player.car = null;
  }
  player.onFoot = true;
  const spot = kind === 'wasted' ? game.city.places.clinic : game.city.places.hideout;
  player.x = spot.x;
  player.y = spot.y;
  player.angle = -Math.PI / 2;
  failMission(game.mission);
  game.audio.busted();
}

function runShot(name) {
  const game = createGame(seed);
  const renderer = createRenderer(canvas);
  game.renderer = renderer;
  const scene = stageShot(name, game);
  game.nightFactor = nightFactorFor(game.clock);
  let painted = 0;
  function paint() {
    renderer.draw(game, scene.screen);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const game = createGame(seed);
  const renderer = createRenderer(canvas);
  game.renderer = renderer;
  const input = createInput(canvas);
  window.__game = game;
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();

  function startNewGame() {
    clearSave();
    const fresh = createGame(seed);
    Object.assign(game, fresh);
    game.renderer = renderer;
    game.hasSave = false;
    startMission(game.mission, game.audio);
    setToast(game, 'MISSION: Wheels Up', 4, '#ffd94a');
    announce('Solmar Heat. Mission: Wheels Up. Steal a car and bring it to Mara\'s garage.');
    screen = SCREEN_PLAY;
  }

  function continueGame() {
    const save = loadSave();
    if (!save) { startNewGame(); return; }
    game.player.cash = save.cash;
    game.player.health = save.health;
    game.player.x = save.x;
    game.player.y = save.y;
    game.mission.index = save.missions;
    game.mission.completed = save.completed || [];
    game.mission.packagesFound = save.packages || 0;
    for (let i = 0; i < game.mission.packagesFound; i += 1) {
      game.city.hiddenPackages[i].found = true;
    }
    startMission(game.mission, game.audio);
    screen = SCREEN_PLAY;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = input.takeActions();
    if (screen === SCREEN_TITLE) {
      // The city idles behind the title: traffic cruises, peds wander.
      while (accumulator >= STEP) {
        for (const car of game.cars) if (car.traffic) stepTrafficCar(car, STEP, game.city, game.cars, game.random);
        for (const ped of game.peds) stepPed(ped, STEP, game.city, null);
        game.time += STEP;
        accumulator -= STEP;
      }
      renderer.draw(game, SCREEN_TITLE);
      if (actions & ACTION_CONFIRM) {
        game.audio.unlock();
        if (game.hasSave) continueGame();
        else startNewGame();
      }
      return;
    }
    if (screen === SCREEN_PAUSED) {
      renderer.draw(game, SCREEN_PAUSED);
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
      return;
    }
    if (screen === SCREEN_BUSTED || screen === SCREEN_WASTED || screen === SCREEN_WIN) {
      renderer.draw(game, screen);
      if (actions & ACTION_CONFIRM) {
        if (screen === SCREEN_WIN) {
          screen = SCREEN_PLAY;
          announce('Free roam. The city is yours.');
        } else {
          const kind = screen === SCREEN_WASTED ? 'wasted' : 'busted';
          respawn(game, kind);
          screen = SCREEN_PLAY;
          announce('Back on the streets.');
        }
      }
      return;
    }
    // Playing.
    if (actions & ACTION_PAUSE) {
      screen = SCREEN_PAUSED;
      saveGame(game);
      announce('Paused.');
      renderer.draw(game, SCREEN_PAUSED);
      return;
    }
    if (actions & ACTION_CONFIRM && !game.mission.active && !game.mission.done) {
      const next = currentMission(game.mission);
      if (next) {
        startMission(game.mission, game.audio);
        if (next.wanted) game.player.wanted = Math.max(game.player.wanted, next.wanted);
        setToast(game, `MISSION: ${next.title}`, 4, '#ffd94a');
        announce(`${next.title}. ${next.brief}`);
      }
    }
    let end = null;
    // One-shot presses are spent by the first step of this frame, never twice.
    let pendingActions = actions;
    const stepInput = {
      takeActions: () => {
        const taken = pendingActions;
        pendingActions = 0;
        return taken;
      },
      axes: () => input.axes(),
      running: () => input.running(),
      handbrake: () => input.handbrake(),
      firing: () => input.firing(),
      mouse: () => input.mouse(),
      isMuted: () => input.isMuted(),
    };
    while (accumulator >= STEP && !end) {
      end = stepGame(game, stepInput, STEP);
      accumulator -= STEP;
    }
    if (end === 'busted' || end === 'wasted' || end === 'win') {
      screen = end === 'busted' ? SCREEN_BUSTED : end === 'wasted' ? SCREEN_WASTED : SCREEN_WIN;
      announce(screen === SCREEN_WIN ? 'Solmar Legend. Every job done.' : end === 'busted' ? 'Busted by the SCPD.' : 'Wasted.');
    }
    renderer.draw(game, screen);
    accumulator = 0;
  }

  announce('Solmar Heat. Press Space to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
