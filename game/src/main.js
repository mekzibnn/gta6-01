// Solmar Heat v9 — the game.
// Boots the world and runs the loop: read input, move the player and the
// cars, run the traffic and the crowd, chase with the cops and the heli,
// tick the missions, the empire, the crew and the races, turn the day,
// and draw it all. window.__game is the debug handle the playtest and
// the screenshots drive the game through.

import { ECONOMY, GARAGE, HEAT, RESPECT, WORLD, WEAPONS, DISTRICT_TIERS, BOOM } from './config.js';
import { makeDice, seedFromClock, seedFromQuery } from './random.js';
import { readCareer, writeCareer, SAVE_VERSION } from './save.js';
import { initLedger, ledgerDrive, ledgerEarn, ledgerSpend, ledgerBust, ledgerRace, ledgerMission, ledgerVenture, ledgerMate, ledgerTopSpeed } from './stats.js';
import { initCity, districtAt, ventureSpot, gateChain, SPOTS } from './city.js';
import { MODELS, spawnCar, spawnTraffic, advanceCar, advanceTrafficCar, carDistance, carsCollide, pushApart, damageCar, kmh, applyEngine, explodeCar, tickBooms, tickWrecks, collideWrecks } from './vehicles.js';
import { spawnPlayer, spawnWalker, spawnCop, spawnMate, advanceWalker, advanceCop, copBusts, advanceMate, matePunch, playerPunch, playerShoot, hurtPlayer, healPlayer, movePlayer } from './actors.js';
import { initCrowd, tickCrowd, crowdNear, crowdOnRoute, scareCrowd, shopperSpots, tickShoppers } from './peds.js';
import { initClock, tickClock, clockLabel, nightFareBoost } from './daynight.js';
import { initWeather, tickWeather, isRaining, rainBonus } from './weather.js';
import { initAudio, startAudio, dealSound, cashSound, punchSound, shotSound, sirenSound, sirenTick, bustSound, missionSound, radioTick, setRadio, boomSound, wheelSound } from './audio.js';
import { initEmpire, ventureDef, ventureHourly, empireHourly, buyVenture, upgradeVenture, accrueEmpire, serializeEmpire, restoreEmpire } from './empire.js';
import { initCrew, mateDef, hireMate, crewHandling, crewDecay, crewDamage, crewGarageRate, crewNames, serializeCrew, restoreCrew } from './crew.js';
import { initRaces, raceDef, startRace, raceTick, raceGatePassed, raceFinished, finishRace, abandonRace, serializeRaces, restoreRaces } from './races.js';
import { initGarage, engineCost, buyEngine, armorCost, buyArmor, armorSoak, nitroCost, buyNitro, useNitro, buyPaint, garageSummary } from './upgrades.js';
import { initShops, shopNear, shopPrompt, ventureMenu, crewMenu, raceMenu, gunMenu, foodMenu, garageMenu } from './shops.js';
import { MISSIONS, initMissions, currentMission, currentStep, missionReward, missionName, missionBrief, startMission, stepDone, completeMission, stepMet, tickMission } from './missions.js';
import { initHud, resizeHud, showBanner, showToast, showPrompt, drawHud } from './hud.js';
import { initRenderer, makeGateMeshes, makeVentureMarkers, renderFrame, resizeRenderer } from './render.js';
import { initInput, readKeys } from './input.js';
import { shotNames } from './shots.js';

function buildWorld(seed) {
  const dice = makeDice(seed);
  const career = readCareer();
  const city = initCity(seed);
  const clock = initClock(17.3);
  const weather = initWeather(dice);
  const player = spawnPlayer(SPOTS.hideout.x, SPOTS.hideout.z);
  player.cash = career.cash;
  player.respect = career.respect;
  player.districtStanding = career.districtStanding || player.districtStanding;
  const car = spawnCar('sedan', SPOTS.hideout.x + 6, SPOTS.hideout.z, 0);
  const parked = [];
  for (let i = 0; i < WORLD.parkedCount; i += 1) {
    const model = dice.pick(['sport', 'taxi', 'sedan']);
    parked.push(spawnCar(model, SPOTS.hideout.x - 8 - i * 7, SPOTS.hideout.z + 6, 0));
  }
  const traffic = spawnTraffic(dice, city, WORLD.trafficCount);
  const crowd = initCrowd(dice, city, WORLD.pedCount);
  const shoppers = shopperSpots(dice, city);
  const empire = restoreEmpire(career.empire || null);
  const roster = restoreCrew(career.roster || null);
  const streetRaces = restoreRaces(career.streetRaces || null);
  const garage = {
    engine: career.garage.engine,
    armor: career.garage.armor,
    nitro: career.garage.nitro,
    paint: career.garage.paint,
  };
  const missions = initMissions();
  missions.done = (career.missionsDone || []).slice();
  missions.index = Math.min(missions.done.length, MISSIONS.length);
  const ledger = initLedger();
  ledger.timePlayed = career.timePlayed || 0;
  ledger.businessesBought = Object.keys(empire.owned).length;
  ledger.crewHired = Object.keys(roster.hired).length;
  ledger.racesWon = streetRaces.won;
  ledger.missionsDone = missions.done.length;
  const audio = initAudio();
  const shops = initShops(city);
  const mates = [];
  for (const id of Object.keys(roster.hired)) {
    if (roster.hired[id].active) mates.push(spawnMate(id, player.x + 4, player.z + 4));
  }
  return {
    seed, dice, career, city, clock, weather, player, car,
    cars: [car, ...parked, ...traffic], traffic, crowd, peds: crowd, shoppers,
    empire, roster, streetRaces, garage, mission: missions, ledger, stats: ledger,
    audio, shops, mates,
    cops: [],
    wrecks: [],
    booms: [],
    sfx: [],
    heli: { active: false, x: 0, z: 0, heading: 0, night: false },
    heat: { locked: false, quiet: 0, stars: 0 },
    wheel: { open: false, sel: 0 },
    sessionEarned: 0,
    empireHour: clock.hour,
    empireHourInt: Math.floor(clock.hour),
    time: 0,
    paused: false,
    over: false,
    busted: false,
    bustedT: 0,
    shopOpen: null,
    shopNear: null,
    shopSel: 0,
    radio: false,
    crimeTimer: 99,
    shootCooldown: 0,
    gatesPassed: 0,
    soldCar: false,
    objectiveText: '',
    missionTarget: null,
    flash: 0,
    shake: 0,
    qDownAt: 0,
    qOpened: false,
    announcedRam: false,
    announcedPit: false,
    sirenOn: false,
    saveT: 0,
    shot: null,
    shotFrames: 0,
    camFixed: null,
  };
}

function respectTier(points) {
  let tier = RESPECT.tiers[0];
  let next = null;
  for (let i = 0; i < RESPECT.tiers.length; i += 1) {
    if (points >= RESPECT.tiers[i].points) tier = RESPECT.tiers[i];
    else { next = RESPECT.tiers[i]; break; }
  }
  return { tier, next };
}

function districtTier(points) {
  let tier = DISTRICT_TIERS[0];
  for (const t of DISTRICT_TIERS) {
    if (points >= t.points) tier = t;
  }
  return tier;
}

function addDistrictStanding(world, amount) {
  const district = districtAt(world.player.x, world.player.z);
  const before = districtTier(world.player.districtStanding[district.id] || 0);
  const now = Math.min(200, (world.player.districtStanding[district.id] || 0) + amount);
  world.player.districtStanding[district.id] = now;
  const after = districtTier(now);
  if (after.name !== before.name) {
    showToast(world.hud, `${district.name} respects you now — ${after.name}`);
  }
}

function saveWorld(world) {
  const career = {
    v: SAVE_VERSION,
    cash: world.player.cash,
    respect: world.player.respect,
    districtStanding: world.player.districtStanding,
    empire: serializeEmpire(world.empire),
    roster: serializeCrew(world.roster),
    streetRaces: serializeRaces(world.streetRaces),
    garage: { engine: world.garage.engine, armor: world.garage.armor, nitro: world.garage.nitro, paint: world.garage.paint },
    missionsDone: world.mission.done.slice(),
    timePlayed: world.ledger.timePlayed,
  };
  writeCareer(career);
}

function nearestCar(world, x, z, radius) {
  let best = null;
  let bestD = radius;
  for (const car of world.cars) {
    if (car.exploded) continue;
    const dx = car.x - x;
    const dz = car.z - z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < bestD) {
      bestD = d;
      best = car;
    }
  }
  return best;
}

function enterCar(world, car) {
  world.car = car;
  world.player.inCar = true;
  world.player.x = car.x;
  world.player.z = car.z;
  applyEngine(car, world.garage.engine);
  const paint = GARAGE.paints.find((p) => p.name === world.garage.paint);
  if (paint) car.color = paint.color;
  world.crimeTimer = 0;
  world.player.wanted = Math.min(5, world.player.wanted + 1);
  showToast(world.hud, `Stolen — ${car.model}`);
}

function exitCar(world) {
  if (!world.car) return;
  world.player.x = world.car.x + 3;
  world.player.z = world.car.z;
  world.player.heading = world.car.heading;
  world.player.inCar = false;
  world.car = null;
}

function syncMates(world) {
  const wanted = new Set(Object.keys(world.roster.hired).filter((id) => world.roster.hired[id].active));
  world.mates = world.mates.filter((m) => wanted.has(m.id));
  for (const id of wanted) {
    if (!world.mates.some((m) => m.id === id)) {
      world.mates.push(spawnMate(id, world.player.x + 4, world.player.z + 4));
    }
  }
}

function ensureCops(world) {
  const wanted = world.player.wanted;
  const target = Math.min(WORLD.maxCops, wanted * 2);
  while (world.cops.length < target) {
    const angle = world.dice.next() * Math.PI * 2;
    const dist = 45 + world.dice.next() * 35;
    const x = world.player.x + Math.cos(angle) * dist;
    const z = world.player.z + Math.sin(angle) * dist;
    let kind = 'patrol';
    const hasRam = world.cops.some((c) => c.kind === 'ram');
    const hasPit = world.cops.some((c) => c.kind === 'pit');
    if (wanted >= HEAT.ramAt && !hasRam) kind = 'ram';
    else if (wanted >= HEAT.pitAt && !hasPit) kind = 'pit';
    const cop = spawnCop(x, z, kind);
    world.cops.push(cop);
    if (kind === 'ram' && !world.announcedRam) {
      world.announcedRam = true;
      showToast(world.hud, 'RAM UNIT INBOUND');
    }
    if (kind === 'pit' && !world.announcedPit) {
      world.announcedPit = true;
      showToast(world.hud, 'PIT UNIT INBOUND');
    }
  }
  while (world.cops.length > target) {
    let far = 0;
    let farD = -1;
    for (let i = 0; i < world.cops.length; i += 1) {
      const d = carDistance(world.cops[i], world.player);
      if (d > farD) {
        farD = d;
        far = i;
      }
    }
    world.cops.splice(far, 1);
  }
  if (wanted < HEAT.ramAt) {
    world.announcedRam = false;
    world.announcedPit = false;
  }
}

function doBust(world) {
  const lost = Math.floor(world.player.cash * ECONOMY.bustLoss);
  world.player.cash = world.player.cash - lost;
  world.player.wanted = 0;
  world.cops = [];
  world.player.x = SPOTS.hideout.x;
  world.player.z = SPOTS.hideout.z;
  world.player.inCar = false;
  world.car = null;
  world.busted = true;
  world.bustedT = 3;
  ledgerBust(world.ledger);
  (world.sfx || (world.sfx = [])).push('bust');
  showBanner(world.hud, `BUSTED — lost $${lost}`);
}

function sellCarAtChop(world) {
  const car = world.car;
  if (!car) return;
  const spot = world.city.spots.chopShop;
  const dx = car.x - spot.x;
  const dz = car.z - spot.z;
  if (dx * dx + dz * dz > 100) return;
  const values = { sedan: 800, sport: 2000, taxi: 600, truck: 1200, cop: 0, ram: 0, pit: 0 };
  const value = Math.round((values[car.model] || 500) * ECONOMY.chopRate);
  world.player.cash = world.player.cash + value;
  world.soldCar = true;
  const idx = world.cars.indexOf(car);
  if (idx >= 0) world.cars.splice(idx, 1);
  world.car = null;
  world.player.inCar = false;
  world.player.x = spot.x + 3;
  world.player.z = spot.z;
  ledgerEarn(world.ledger, value);
  (world.sfx || (world.sfx = [])).push('cash');
  showToast(world.hud, `Sold for $${value}`);
}

function drainSfx(world) {
  const audio = world.audio;
  const sounds = { deal: dealSound, cash: cashSound, punch: punchSound, shot: shotSound, bust: bustSound, mission: missionSound, boom: boomSound, wheel: wheelSound };
  for (const name of world.sfx) {
    const fn = sounds[name];
    if (fn) fn(audio);
  }
  world.sfx.length = 0;
}

function stageShotCar(world, model, x, z, engineTier) {
  const car = spawnCar(model, x, z, 0);
  if (engineTier) applyEngine(car, engineTier);
  car.color = 0xff7a1a;
  world.cars.push(car);
  world.car = car;
  world.player.inCar = true;
  return car;
}

function applyShot(world, name) {
  world.shot = name;
  const p = world.player;
  if (name === 'cover') {
    world.clock.hour = 18.0;
    p.wanted = 4;
    p.x = 0;
    p.z = 60;
    stageShotCar(world, 'sport', 0, 60, 2);
    world.garage.nitro = 2;
    world.heli.active = true;
    world.cops = [spawnCop(-14, 78, 'ram'), spawnCop(14, 40, 'pit'), spawnCop(-30, 30, 'patrol')];
    world.wrecks.push({ x: 0, z: 95, heading: 0.6, model: 'sedan', color: 0x8a94a6, t: 5, cold: false });
    world.mission.index = 0;
    world.mission.step = 0;
    world.camFixed = { pos: [-16, 7, 34], look: [0, 2, 70] };
    // A hired mate (crew card), the radio on, light armour, a pistol in
    // the wheel, traffic ahead and walkers on the sidewalk — the cover
    // should read as a finished game, not a prototype.
    world.roster.hired.milo = { active: true };
    world.mates.push(spawnMate('milo', p.x + 4, p.z + 4));
    world.radio = true;
    setRadio(world.audio, true);
    world.garage.armor = 1;
    world.player.weapons[1] = true;
    world.player.weapon = 1;
    world.cars.push(spawnCar('sedan', 8, 118, 0));
    world.cars.push(spawnCar('taxi', -10, 118, 0));
    for (const [wx, wz] of [[10, 74], [-12, 84], [12, 104], [-9, 126]]) {
      const w = spawnWalker(wx, wz);
      w.route = [{ x: wx, z: wz + 20 }, { x: wx, z: wz - 20 }];
      world.peds.push(w);
    }
    showBanner(world.hud, 'Drive to the Garage — do not get busted', 'mission');
  } else if (name === 'drive') {
    world.clock.hour = 17.8;
    p.x = 0;
    p.z = 100;
    stageShotCar(world, 'sport', 0, 100, 2);
    world.garage.engine = 2;
    world.garage.nitro = 2;
    world.garage.paint = 'Sunset Orange';
    world.wrecks.push({ x: 12, z: 130, heading: 0.3, model: 'taxi', color: 0xf2c200, t: 8, cold: false });
    world.camFixed = null;
  } else if (name === 'mission') {
    world.clock.hour = 17.5;
    world.empire.owned['solmar-laundry'] = { level: 1 };
    world.mission.index = 10;
    world.mission.step = 0;
    const spot = world.city.spots.laundry;
    p.x = spot.x;
    p.z = spot.z + 6;
    world.camFixed = { pos: [spot.x - 18, 9, spot.z - 14], look: [spot.x, 2, spot.z] };
  } else if (name === 'night') {
    world.clock.hour = 22.5;
    p.wanted = 3;
    p.x = 0;
    p.z = 0;
    const car = stageShotCar(world, 'sport', 0, 0, 2);
    car.nitroBurn = 2;
    world.garage.nitro = 2;
    world.heli.active = true;
    world.cops = [spawnCop(-12, 22, 'ram'), spawnCop(16, -14, 'pit')];
    world.wrecks.push({ x: -10, z: -30, heading: 1.2, model: 'sedan', color: 0x8a94a6, t: 12, cold: false });
    world.camFixed = null;
  }
}

function menuFor(world) {
  const open = world.shopOpen;
  if (!open) return [];
  if (open.kind === 'garage') return garageMenu(world);
  if (open.kind === 'venture') return ventureMenu(world, open.shop.id);
  if (open.kind === 'crew') return crewMenu(world);
  if (open.kind === 'races') return raceMenu(world);
  if (open.kind === 'gun') return gunMenu(world);
  if (open.kind === 'food') return foodMenu(world);
  return [];
}

function tickWheel(world, keys, justPressed) {
  const wheel = world.wheel;
  const holding = keys.heldQ || keys.heldTab;
  if (justPressed.KeyQ || justPressed.Tab) {
    world.qDownAt = Date.now();
    world.qOpened = false;
  }
  if (holding && !wheel.open && world.qDownAt && Date.now() - world.qDownAt > 200) {
    wheel.open = true;
    wheel.sel = world.player.weapon;
    world.qOpened = true;
    (world.sfx || (world.sfx = [])).push('wheel');
  }
  if (wheel.open) {
    if (justPressed.Digit1) wheel.sel = 0;
    if (justPressed.Digit2) wheel.sel = 1;
    if (justPressed.Digit3) wheel.sel = 2;
    if (justPressed.Digit4) wheel.sel = 3;
    if (justPressed.ArrowRight) wheel.sel = (wheel.sel + 1) % 4;
    if (justPressed.ArrowLeft) wheel.sel = (wheel.sel + 3) % 4;
    if (!world.player.weapons[wheel.sel]) {
      // Skipping a locked slot lands on the next owned one.
      for (let i = 0; i < 4; i += 1) {
        const cand = (wheel.sel + i) % 4;
        if (world.player.weapons[cand]) {
          wheel.sel = cand;
          break;
        }
      }
    }
  }
  const releasedQ = !holding && world.qDownAt;
  if (releasedQ) {
    if (wheel.open) {
      world.player.weapon = wheel.sel;
      wheel.open = false;
      showToast(world.hud, `${WEAPONS[wheel.sel].name} ready`);
      (world.sfx || (world.sfx = [])).push('wheel');
    } else if (!world.qOpened && world.player.inCar) {
      exitCar(world);
    }
    world.qDownAt = 0;
  }
}

function loop(world, hud, render, input, last) {
  const now = performance.now();
  const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
  requestAnimationFrame((t) => loop(world, hud, render, input, t));
  const keys = readKeys(input);
  const justPressed = keys.justPressed;
  if (justPressed.KeyP) {
    if (world.paused) {
      world.paused = false;
    } else {
      world.paused = true;
      saveWorld(world);
    }
  }
  if (world.paused) {
    drawHud(hud, world, dt);
    renderFrame(render, world, dt);
    return;
  }
  world.time = world.time + dt;
  world.player.carSpeed = world.car ? world.car.speed : 0;
  startAudio(world.audio);
  tickClock(world.clock, dt, WORLD.clockRate);
  tickWeather(world.weather, dt, world.dice);
  radioTick(world.audio, dt);
  sirenTick(world.audio, dt);

  // Empire: bank every whole game hour that passes.
  const hourInt = Math.floor(world.clock.hour);
  if (hourInt !== world.empireHourInt) {
    const crossed = (hourInt - world.empireHourInt + 24) % 24;
    if (crossed > 0 && crossed < 12) {
      const take = accrueEmpire(world.empire, crossed, world.player, world.clock.hour);
      if (take > 0) showToast(world.hud, `Empire paid $${take}`);
    }
    world.empireHourInt = hourInt;
  }

  // Heat: the current mission can lock it; otherwise it cools off.
  const mission = currentMission(world.mission);
  world.heat.locked = !!mission && mission.id === 'm10' && !world.mission.done.includes('m10');
  world.crimeTimer = world.crimeTimer + dt;
  if (!world.heat.locked && world.player.wanted > 0 && world.crimeTimer > HEAT.decaySeconds / crewDecay(world.roster)) {
    world.player.wanted = world.player.wanted - 1;
    world.crimeTimer = 0;
  }
  const wantSiren = world.player.wanted > 0;
  if (wantSiren !== world.sirenOn) {
    world.sirenOn = wantSiren;
    sirenSound(world.audio, wantSiren);
  }
  world.heli.active = world.player.wanted >= HEAT.heliAt;

  // Shops and menus.
  world.shopNear = shopNear(world);
  if (justPressed.KeyE) {
    if (world.shopOpen) {
      world.shopOpen = null;
    } else if (world.shopNear) {
      const shop = world.shopNear;
      if (shop.kind === 'chop') {
        showToast(world.hud, 'Drive a car in to sell it');
      } else {
        world.shopOpen = { kind: shop.kind, shop };
        startAudio(world.audio);
      }
    } else if (!world.player.inCar) {
      const car = nearestCar(world, world.player.x, world.player.z, 4.5);
      if (car) enterCar(world, car);
    }
  }
  if (world.shopOpen) {
    const items = menuFor(world);
    for (let d = 1; d <= 9; d += 1) {
      if (justPressed[`Digit${d}`]) {
        const found = items.find((it) => it.slot === d);
        if (found) {
          const ok = found.run();
          if (ok) {
            world.shopOpen = null;
            (world.sfx || (world.sfx = [])).push('cash');
            if (found.name.startsWith('Hire')) {
              ledgerMate(world.ledger);
              syncMates(world);
              addDistrictStanding(world, 10);
            }
            if (found.name.startsWith('Buy Solmar') || found.name.startsWith('Buy Sunset') || found.name.startsWith('Buy Club')) {
              ledgerVenture(world.ledger);
              addDistrictStanding(world, 10);
            }
          } else {
            showToast(world.hud, 'Not enough cash');
          }
        }
      }
    }
  }

  // Weapon wheel (hold Q or Tab) — Q tap while driving steps out.
  tickWheel(world, keys, justPressed);

  // Nitro, punch, shoot (G fires on press and keeps firing while held).
  if (justPressed.Space && world.player.inCar && world.car) {
    if (useNitro(world.garage, world.car)) {
      showToast(world.hud, 'NITRO');
    }
  }
  if (justPressed.KeyF && !world.player.inCar) playerPunch(world.player, world);
  world.shootCooldown = world.shootCooldown - dt;
  if (input.keys.KeyG && world.shootCooldown <= 0 && !world.player.inCar && world.player.weapon > 0) {
    playerShoot(world.player, world);
    const def = WEAPONS[world.player.weapon] || WEAPONS[0];
    world.shootCooldown = def.rate;
    world.crimeTimer = 0;
  }

  // Move: drive or walk.
  let moved = 0;
  if (world.player.inCar && world.car) {
    const carInput = { up: keys.up, down: keys.down, left: keys.left, right: keys.right };
    moved = advanceCar(world.car, carInput, dt, world);
    world.player.x = world.car.x;
    world.player.z = world.car.z;
    world.player.heading = world.car.heading;
    ledgerDrive(world.ledger, moved, kmh(world.car.speed), dt);
    if (world.car.nitroBurn > 0) ledgerTopSpeed(world.ledger, kmh(world.car.speed));
  } else {
    moved = movePlayer(world.player, { up: keys.up, down: keys.down, left: keys.left, right: keys.right, run: keys.run }, dt, world);
    ledgerDrive(world.ledger, moved, world.player.speed * 3.6, dt);
  }

  // Traffic and cops.
  for (const car of world.traffic) advanceTrafficCar(car, dt, world);
  ensureCops(world);
  for (const cop of world.cops) {
    advanceCop(cop, world, dt);
    if (!world.shopOpen && !world.streetRaces.active) {
      if (copBusts(cop, world.player)) {
        cop.bustMeter = cop.bustMeter + dt;
        if (cop.bustMeter >= HEAT.bustSeconds) {
          doBust(world);
          break;
        }
      } else {
        cop.bustMeter = Math.max(0, cop.bustMeter - dt);
      }
    }
  }
  if (world.busted) {
    world.bustedT = world.bustedT - dt;
    if (world.bustedT <= 0) world.busted = false;
  }

  // Mates and the crowd.
  for (const mate of world.mates) advanceMate(mate, world, dt);
  tickCrowd(world.crowd, world, dt);
  tickShoppers(world.shoppers, world, dt);

  // Collisions: the player's car against traffic and wrecks.
  if (world.car) {
    for (const other of world.cars) {
      if (!world.car) break; // the player's car may have blown up mid-loop
      if (other === world.car || other.exploded) continue;
      if (carsCollide(world.car, other)) {
        const impact = pushApart(world.car, other);
        if (impact > 10) {
          damageCar(world.car, (impact - 10) * 1.2, world);
          damageCar(other, (impact - 10) * 0.8, world);
        }
      }
    }
    if (world.car) {
      const wreckHit = collideWrecks(world, world.car);
      if (wreckHit > 12) damageCar(world.car, (wreckHit - 12) * 1.2, world);
    }
  }
  tickBooms(world, dt);
  tickWrecks(world, dt);
  // Wrecks replace the cars that blew up; drop the husks from the lists.
  if (world.cars.some((c) => c.exploded)) {
    world.cars = world.cars.filter((c) => !c.exploded);
    world.traffic = world.traffic.filter((c) => !c.exploded);
  }
  if (world.cops.some((c) => c.exploded)) world.cops = world.cops.filter((c) => !c.exploded);
  world.flash = Math.max(0, world.flash - dt * 1.6);
  world.shake = Math.max(0, world.shake - dt * 2.2);

  // Missions.
  const missionEvent = tickMission(world.mission, world, dt);
  if (missionEvent) {
    if (missionEvent.type === 'done') {
      showBanner(world.hud, `${missionEvent.mission.name} — $${missionEvent.reward}`, 'done', { mission: missionEvent.mission, reward: missionEvent.reward });
      (world.sfx || (world.sfx = [])).push('mission');
      ledgerMission(world.ledger);
      ledgerEarn(world.ledger, missionEvent.reward);
      addDistrictStanding(world, 10);
      saveWorld(world);
    } else {
      showToast(world.hud, missionEvent.stepText);
      addDistrictStanding(world, 5);
    }
  }

  // Races.
  if (world.streetRaces.active) {
    const raceEvent = raceTick(world.streetRaces, world.player, world.city, dt, world.weather);
    if (raceEvent && raceEvent.finished) {
      showBanner(world.hud, `Race won — $${raceEvent.prize}`);
      (world.sfx || (world.sfx = [])).push('mission');
      ledgerRace(world.ledger, true);
      ledgerEarn(world.ledger, raceEvent.prize);
      addDistrictStanding(world, 5);
      saveWorld(world);
    } else if (raceEvent && raceEvent.gate) {
      showToast(world.hud, `Gate ${raceEvent.gate}`);
    }
  }
  if (justPressed.KeyX && world.streetRaces.active) {
    abandonRace(world.streetRaces);
    showToast(world.hud, 'Race abandoned');
  }

  // Chop shop and free gates (gates count once each, no teleport).
  sellCarAtChop(world);
  if (!world.streetRaces.active) {
    for (const raceId of Object.keys(world.city.gateRoutes)) {
      world.city.gateRoutes[raceId].forEach((gate, gi) => {
        const key = `${raceId}:${gi}`;
        const dx = gate.x - world.player.x;
        const dz = gate.z - world.player.z;
        const nearGate = dx * dx + dz * dz < 100;
        if (nearGate && world.lastFreeGate !== key) {
          world.gatesPassed = world.gatesPassed + 1;
          world.lastFreeGate = key;
        } else if (!nearGate && world.lastFreeGate === key) {
          world.lastFreeGate = null;
        }
      });
    }
  }

  // Radio toggle.
  if (justPressed.KeyR) {
    world.radio = !world.radio;
    setRadio(world.audio, world.radio);
    showToast(world.hud, world.radio ? 'SOL FM on' : 'Radio off');
  }

  // Objective line and minimap target.
  const m = currentMission(world.mission);
  const step = currentStep(world.mission);
  if (m && step) {
    world.objectiveText = `${m.name} — ${step.text}`;
    const spot = step.spot ? world.city.spots[step.spot] : null;
    world.missionTarget = spot || null;
  } else if (m) {
    world.objectiveText = `${m.name} — ${m.brief}`;
    world.missionTarget = null;
  } else {
    world.objectiveText = 'Solmar is yours — free roam';
    world.missionTarget = null;
  }

  // Prompt line.
  if (world.shopOpen) {
    const items = menuFor(world);
    showPrompt(world.hud, items.map((it) => `[${it.slot}] ${it.name} — $${it.price}`).join('   '));
  } else if (world.shopNear) {
    showPrompt(world.hud, shopPrompt(world.shopNear));
  } else if (!world.player.inCar && nearestCar(world, world.player.x, world.player.z, 4.5)) {
    showPrompt(world.hud, 'E — Steal car');
  } else {
    showPrompt(world.hud, '');
  }

  // Autosave.
  world.saveT = world.saveT + dt;
  if (world.saveT > 20) {
    world.saveT = 0;
    saveWorld(world);
  }

  drainSfx(world);
  drawHud(hud, world, dt);
  renderFrame(render, world, dt);
  if (world.shot) {
    world.shotFrames = world.shotFrames + 1;
    if (world.shotFrames >= 3) window.__shotReady = true;
  }
}

function boot() {
  const seed = seedFromQuery();
  const world = buildWorld(seed);
  const gameCanvas = document.getElementById('game');
  const hudCanvas = document.getElementById('hud');
  const hud = initHud(hudCanvas);
  const render = initRenderer(gameCanvas, world.city);
  makeGateMeshes(render, world.city);
  makeVentureMarkers(render, world.city);
  const input = initInput(gameCanvas);
  world.hud = hud;
  world.render = render;
  world.input = input;
  resizeHud(hud);
  window.addEventListener('resize', () => {
    resizeHud(hud);
    resizeRenderer(render);
  });
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (shot && shotNames().includes(shot)) applyShot(world, shot);
  window.__game = world;
  window.__shotReady = false;
  requestAnimationFrame((t) => loop(world, hud, render, input, t));
}

boot();
