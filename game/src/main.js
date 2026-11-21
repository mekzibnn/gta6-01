// Solmar Heat — the game (v6 rewrite).
// main.js boots the world and runs the loop: read input, move the player
// and the cars, run the traffic and the crowd, chase with the cops and the
// heli, tick the missions, the empire, the crew and the races, turn the
// day, and draw it all. It also exposes window.__game — the debug handle
// the playtest and the screenshots drive the game through.

import * as THREE from 'three';
import { ECONOMY, GARAGE, HEAT, RESPECT, WORLD, WEAPONS } from './config.js';
import { makeDice, seedFromClock } from './random.js';
import { readCareer, writeCareer, blankCareer } from './save.js';
import { initLedger, ledgerDrive, ledgerEarn, ledgerSpend, ledgerBust, ledgerRace, ledgerMission, ledgerVenture, ledgerMate, ledgerTopSpeed } from './stats.js';
import { initCity, districtAt, ventureSpot, gateChain, SPOTS } from './city.js';
import { MODELS, spawnCar, spawnTraffic, advanceCar, advanceTrafficCar, carDistance, carsCollide, pushApart, damageCar, kmh, applyEngine } from './vehicles.js';
import { spawnPlayer, spawnWalker, spawnCop, spawnMate, advanceWalker, advanceCop, copBusts, advanceMate, matePunch, playerPunch, playerShoot, hurtPlayer, healPlayer, movePlayer } from './actors.js';
import { initCrowd, tickCrowd, crowdNear, crowdOnRoute, scareCrowd, shopperSpots, tickShoppers } from './peds.js';
import { initClock, tickClock, clockLabel, nightFareBoost } from './daynight.js';
import { initWeather, tickWeather, isRaining, rainBonus } from './weather.js';
import { initAudio, startAudio, dealSound, cashSound, punchSound, shotSound, sirenSound, bustSound, missionSound, radioTick, setRadio } from './audio.js';
import { initEmpire, ventureDef, ventureHourly, empireHourly, buyVenture, upgradeVenture, accrueEmpire, serializeEmpire, restoreEmpire } from './empire.js';
import { initCrew, mateDef, hireMate, crewHandling, crewDecay, crewDamage, crewGarageRate, crewNames, serializeCrew, restoreCrew } from './crew.js';
import { initRaces, raceDef, startRace, raceTick, raceGatePassed, raceFinished, finishRace, abandonRace, serializeRaces, restoreRaces } from './races.js';
import { initGarage, engineCost, buyEngine, armorCost, buyArmor, armorSoak, nitroCost, buyNitro, useNitro, buyPaint, garageSummary } from './upgrades.js';
import { initShops, shopNear, shopPrompt, ventureMenu, crewMenu, raceMenu, gunMenu, foodMenu, garageMenu } from './shops.js';
import { MISSIONS, initMissions, currentMission, currentStep, missionReward, missionName, missionBrief, startMission, stepDone, completeMission, stepMet, tickMission } from './missions.js';
import { initHud, resizeHud, showBanner, showToast, showPrompt, drawHud } from './hud.js';
import { initRenderer, makeGateMeshes, makeVentureMarkers, renderFrame, resizeRenderer, snapCamera } from './render.js';
import { initInput, readKeys } from './input.js';

const SAVE_VERSION = 2;

function buildWorld(seed) {
  const dice = makeDice(seed);
  const career = readCareer();
  const city = initCity(seed);
  const clock = initClock(17.3);
  const weather = initWeather(dice);
  const player = spawnPlayer(SPOTS.hideout.x, SPOTS.hideout.z);
  player.cash = career.cash;
  player.respect = career.respect;
  const car = spawnCar('sedan', SPOTS.hideout.x + 6, SPOTS.hideout.z, 0);
  const traffic = spawnTraffic(dice, city, 26);
  const crowd = initCrowd(dice, city, WORLD.pedCount);
  const shoppers = shopperSpots(dice, city);
  const empire = restoreEmpire(career.empire || null);
  const roster = restoreCrew(career.roster || null);
  const streetRaces = restoreRaces(career.streetRaces || null);
  const garage = { engine: career.garage.engine, armor: career.garage.armor, nitro: career.garage.nitro, paint: career.garage.paint };
  const missions = initMissions();
  missions.index = 0;
  missions.done = (career.missionsDone || []).slice();
  // Resume after the missions already done (12 means every job is done).
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
    seed, dice, career, city, clock, weather, player, car, traffic, crowd, shoppers,
    empire, roster, streetRaces, garage, missions, ledger, audio, shops, mates,
    cops: [],
    heli: { active: false, x: 0, z: 0, heading: 0, night: false },
    heat: { locked: false, quiet: 0, stars: 0 },
    sessionEarned: 0,
    empireHour: clock.hour,
    time: 0,
    paused: false,
    over: false,
    busted: false,
    shopOpen: null,
    shopNear: null,
    shopSel: 0,
    radio: false,
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

function saveWorld(world) {
  const career = {
    v: SAVE_VERSION,
    cash: world.player.cash,
    respect: world.player.respect,
    empire: { owned: world.empire.owned, totalEarned: world.empire.totalEarned },
    roster: { hired: world.roster.hired },
    streetRaces: { won: world.streetRaces.won, best: world.streetRaces.best },
    missionsDone: world.missions.done,
    garage: world.garage,
    timePlayed: Math.floor(world.ledger.timePlayed),
  };
  writeCareer(career);
  world.career = career;
  return career;
}

// --- Heat, cops, and the helicopter ---

function raiseHeat(world, stars) {
  world.player.wanted = Math.min(HEAT.maxStars, world.player.wanted + stars);
  world.heat.quiet = 0;
  if (world.player.wanted >= 3 && !world.heli.active) {
    world.heli.active = true;
    world.heli.x = world.player.x + 40;
    world.heli.z = world.player.z + 40;
    sirenSound(world.audio);
  }
  return world.player.wanted;
}

function tickHeat(world, dt) {
  const decay = HEAT.decaySeconds / crewDecay(world.roster);
  if (world.heat.locked) {
    // Heat Lock (M10): the heat holds at 5 no matter what.
    world.player.wanted = HEAT.maxStars;
    return;
  }
  if (world.player.wanted === 0) return;
  world.heat.quiet += dt;
  if (world.heat.quiet >= decay) {
    world.heat.quiet = 0;
    world.player.wanted -= 1;
    if (world.player.wanted < 3) world.heli.active = false;
  }
}

function spawnCops(world) {
  const want = HEAT.copBase + world.player.wanted * HEAT.copPerStar;
  while (world.cops.length < want) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 46 + Math.random() * 24;
    world.cops.push(spawnCop(
      world.player.x + Math.cos(angle) * dist,
      world.player.z + Math.sin(angle) * dist,
      world.player.wanted,
    ));
  }
  while (world.cops.length > want) world.cops.pop();
}

function tickCops(world, dt) {
  spawnCops(world);
  for (const cop of world.cops) {
    advanceCop(cop, world.player, dt);
    if (copBusts(cop, world.player)) {
      bustPlayer(world);
      return;
    }
  }
}

function bustPlayer(world) {
  if (world.busted) return;
  world.busted = true;
  const fine = Math.floor(world.player.cash * ECONOMY.bustFine);
  world.player.cash -= fine;
  world.player.wanted = 0;
  world.heli.active = false;
  world.cops = [];
  ledgerBust(world.ledger);
  bustSound(world.audio);
  // Wake up at the hospital, on foot, with the car impounded nearby.
  world.player.x = SPOTS.hospital.x;
  world.player.z = SPOTS.hospital.z;
  world.player.inCar = false;
  world.player.health = 100;
  world.car.x = SPOTS.hospital.x + 8;
  world.car.z = SPOTS.hospital.z;
  showBanner(world.hud, 'BUSTED', `The cops took $${fine}. You wake up at the hospital.`, 5);
  saveWorld(world);
  setTimeout(() => { world.busted = false; }, 1200);
}

function tickHeli(world, dt) {
  const heli = world.heli;
  if (!heli.active) return;
  heli.night = world.clock.isNight;
  const dx = world.player.x - heli.x;
  const dz = world.player.z - heli.z;
  const d = Math.sqrt(dx * dx + dz * dz) || 1;
  heli.heading = Math.atan2(dx, dz);
  const speed = 26;
  heli.x += (dx / d) * speed * dt;
  heli.z += (dz / d) * speed * dt;
  // The heli's spotlight pins the player: heat decays slower under it.
  if (d < 60) world.heat.quiet = Math.max(0, world.heat.quiet - dt * 0.5);
}

// --- Player and car ---

function nearestCar(world, x, z, maxD) {
  let best = null;
  let bestD = maxD || 6;
  const cars = [world.car, ...world.traffic];
  for (const c of cars) {
    if (c.wrecked) continue;
    const dx = c.x - x;
    const dz = c.z - z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

function enterCar(world, car) {
  world.player.inCar = true;
  world.player.carId = car.id;
  world.playerCar = car;
  if (car.model === 'police') raiseHeat(world, 2);
  return car;
}

function exitCar(world) {
  if (!world.player.inCar || !world.playerCar) return;
  const car = world.playerCar;
  world.player.x = car.x + Math.sin(car.heading + Math.PI / 2) * 3;
  world.player.z = car.z + Math.cos(car.heading + Math.PI / 2) * 3;
  world.player.heading = car.heading;
  world.player.inCar = false;
  world.player.carId = null;
  world.playerCar = null;
}

function tickPlayer(world, keys, dt) {
  const p = world.player;
  if (p.inCar && world.playerCar) {
    const car = world.playerCar;
    const drive = {
      throttle: keys.up ? 1 : 0,
      brake: keys.down ? 1 : 0,
      steer: (keys.left ? -1 : 0) + (keys.right ? 1 : 0),
      nitro: false,
    };
    // Nitro: one charge lights one burn (4s). Holding Space during a burn
    // spends nothing more; a fresh press after the burn lights the next.
    if (car.nitroBurn > 0) {
      car.nitroBurn -= dt;
      drive.nitro = true;
    } else if (keys.nitro && world.garage.nitro > 0) {
      if (useNitro(world.garage)) {
        car.nitroBurn = 4;
        drive.nitro = true;
      }
    }
    const handling = crewHandling(world.roster);
    advanceCar(car, drive, dt, handling);
    p.x = car.x;
    p.z = car.z;
    p.heading = car.heading;
    ledgerDrive(world.ledger, car.speed * dt, dt);
    ledgerTopSpeed(world.ledger, kmh(car));
    // Collisions with traffic.
    for (const other of world.traffic) {
      if (other === car || other.wrecked) continue;
      if (carsCollide(car, other, 5)) {
        pushApart(car, other);
        damageCar(car, 4);
        damageCar(other, 6);
        if (car.speed > 12) raiseHeat(world, 0);
      }
    }
    // Off the road and into a building: stop, do not pass through.
    for (const b of world.city.buildings) {
      const dx = car.x - b.x;
      const dz = car.z - b.z;
      if (Math.abs(dx) < b.w / 2 + 1.5 && Math.abs(dz) < b.d / 2 + 1.5) {
        car.speed *= 0.3;
        car.x = b.x + Math.sign(dx) * (b.w / 2 + 1.6);
        car.z = b.z + Math.sign(dz) * (b.d / 2 + 1.6);
      }
    }
  } else {
    const move = {
      x: (keys.right ? 1 : 0) - (keys.left ? 1 : 0),
      z: (keys.down ? 1 : 0) - (keys.up ? 1 : 0),
      run: keys.run,
    };
    movePlayer(p, move, dt);
    ledgerDrive(world.ledger, p.speed * dt, dt);
  }
  // Punch and shoot.
  if (keys.punch) {
    for (const cop of world.cops) {
      playerPunch(p, cop, crewDamage(world.roster));
      if (cop.health <= 0) {
        world.cops.splice(world.cops.indexOf(cop), 1);
        raiseHeat(world, 1);
      }
    }
    punchSound(world.audio);
  }
  if (keys.shoot && p.weapon > 0) {
    for (const cop of world.cops) {
      playerShoot(p, cop, p.weapon, crewDamage(world.roster));
      if (cop.health <= 0) {
        world.cops.splice(world.cops.indexOf(cop), 1);
        raiseHeat(world, 1);
      }
    }
    shotSound(world.audio);
  }
}

function tickTraffic(world, dt) {
  for (const car of world.traffic) {
    advanceTrafficCar(car, world.city, dt, world.dice);
  }
  // Keep the streets full: replace wrecked traffic cars.
  for (let i = 0; i < world.traffic.length; i += 1) {
    if (world.traffic[i].wrecked) {
      const fresh = spawnTraffic(world.dice, world.city, 1)[0];
      world.traffic[i] = fresh;
    }
  }
}

function tickMates(world, dt) {
  for (const mate of world.mates) {
    advanceMate(mate, world.player, dt);
    for (const cop of world.cops) {
      matePunch(mate, cop, 12 * crewDamage(world.roster));
      if (cop.health <= 0) world.cops.splice(world.cops.indexOf(cop), 1);
    }
  }
}

// --- Shops, missions, and the economy ---

function tickShop(world, keys) {
  const shop = shopNear(world.shops, world.player.x, world.player.z);
  world.shopNear = shop;
  if (!shop) {
    if (world.shopOpen) { world.shopOpen = null; showPrompt(world.hud, null); }
    return;
  }
  if (keys.interact && !world.shopOpen) {
    world.shopOpen = shop;
    world.shopSel = 0;
    startAudio(world.audio);
  }
  if (!world.shopOpen) return;
  const menu = shopPrompt(shop, {
    empire: world.empire,
    roster: world.roster,
    streetRaces: world.streetRaces,
    player: world.player,
    garage: world.garage,
  });
  showPrompt(world.hud, menu);
  if (keys.escape) {
    world.shopOpen = null;
    showPrompt(world.hud, null);
    return;
  }
  if (keys.choice >= 0 && keys.choice < menu.length) {
    const picked = menu[keys.choice];
    buyFromShop(world, shop, picked);
    world.shopOpen = null;
    showPrompt(world.hud, null);
  }
}

function buyFromShop(world, shop, picked) {
  if (!picked || picked.key === 'leave') return;
  const p = world.player;
  if (shop.kind === 'venture') {
    if (picked.key === 'buy') {
      const res = buyVenture(world.empire, shop.venture, p.cash);
      if (res.ok) {
        p.cash -= res.cost;
        ledgerSpend(world.ledger, res.cost);
        ledgerVenture(world.ledger);
        p.respect += 150;
        dealSound(world.audio);
        showToast(world.hud, `${res.venture.label} is yours — $${res.venture.hourly}/hr`);
        saveWorld(world);
      } else showToast(world.hud, res.reason);
    }
    if (picked.key === 'upgrade') {
      const res = upgradeVenture(world.empire, shop.venture, p.cash);
      if (res.ok) {
        p.cash -= res.cost;
        ledgerSpend(world.ledger, res.cost);
        dealSound(world.audio);
        showToast(world.hud, `Upgraded to level ${res.level}`);
        saveWorld(world);
      } else showToast(world.hud, res.reason);
    }
    return;
  }
  if (shop.kind === 'crew' && picked.key.startsWith('hire-')) {
    const mateId = picked.key.slice(5);
    const res = hireMate(world.roster, mateId, p.cash, world.clock.hour);
    if (res.ok) {
      p.cash -= res.cost;
      ledgerSpend(world.ledger, res.cost);
      ledgerMate(world.ledger);
      world.mates.push(spawnMate(mateId, p.x + 4, p.z + 4));
      dealSound(world.audio);
      showToast(world.hud, `${res.mate.label} joined the crew`);
      saveWorld(world);
    } else showToast(world.hud, res.reason);
    return;
  }
  if (shop.kind === 'races' && picked.key.startsWith('race-')) {
    const raceId = picked.key.slice(5);
    const res = startRace(world.streetRaces, raceId, p.cash, world.city);
    if (res.ok) {
      p.cash -= res.cost;
      ledgerSpend(world.ledger, res.cost);
      const def = raceDef(raceId);
      const gates = gateChain(world.city, raceId);
      makeGateMeshes(world.view, gates);
      showBanner(world.hud, `${def.label} — GO!`, `Pass ${def.gates} gates. Par ${def.par}s.`, 3);
      saveWorld(world);
    } else showToast(world.hud, res.reason);
    return;
  }
  if (shop.kind === 'guns') {
    if (picked.key.startsWith('gun-')) {
      const idx = Number(picked.key.slice(4));
      const w = WEAPONS.slots[idx];
      if (w && p.cash >= w.price) {
        p.cash -= w.price;
        p.weapon = idx;
        p.ammo[idx] = w.ammo;
        ledgerSpend(world.ledger, w.price);
        dealSound(world.audio);
        showToast(world.hud, `${w.name} bought`);
        saveWorld(world);
      } else showToast(world.hud, 'not enough cash');
    }
    if (picked.key === 'ammo' && p.cash >= 120) {
      p.cash -= 120;
      for (const k of Object.keys(p.ammo)) p.ammo[k] = WEAPONS.slots[Number(k)].ammo;
      dealSound(world.audio);
      saveWorld(world);
    }
    return;
  }
  if (shop.kind === 'food' && picked.key === 'meal' && p.cash >= 25) {
    p.cash -= 25;
    healPlayer(p, 100);
    dealSound(world.audio);
    saveWorld(world);
    return;
  }
  if (shop.kind === 'garage') {
    if (picked.key === 'engine') {
      const res = buyEngine(world.garage, p.cash, world.roster, world.playerCar);
      if (res.ok) { p.cash -= res.cost; ledgerSpend(world.ledger, res.cost); dealSound(world.audio); saveWorld(world); }
      else showToast(world.hud, res.reason);
    }
    if (picked.key === 'armor') {
      const res = buyArmor(world.garage, p.cash, world.roster);
      if (res.ok) { p.cash -= res.cost; ledgerSpend(world.ledger, res.cost); dealSound(world.audio); saveWorld(world); }
      else showToast(world.hud, res.reason);
    }
    if (picked.key === 'nitro') {
      const res = buyNitro(world.garage, p.cash, world.roster);
      if (res.ok) { p.cash -= res.cost; ledgerSpend(world.ledger, res.cost); dealSound(world.audio); saveWorld(world); }
      else showToast(world.hud, res.reason);
    }
    if (picked.key.startsWith('paint-')) {
      const res = buyPaint(world.garage, p.cash, world.roster, Number(picked.key.slice(6)));
      if (res.ok) { p.cash -= res.cost; ledgerSpend(world.ledger, res.cost); dealSound(world.audio); saveWorld(world); }
      else showToast(world.hud, res.reason);
    }
  }
}

function tickChopShop(world) {
  // Selling a stolen sport car at the Chop Shop pays the fence cut.
  if (!world.player.inCar || !world.playerCar) return;
  const shop = SPOTS.chopShop;
  const car = world.playerCar;
  const dx = car.x - shop.x;
  const dz = car.z - shop.z;
  if (dx * dx + dz * dz > 12 * 12) return;
  if (car.model === 'police') return;
  if (world.chopCooldown > 0) return;
  const payout = Math.round(car.value * ECONOMY.fenceCut);
  world.player.cash += payout;
  world.sessionEarned += payout;
  ledgerEarn(world.ledger, payout);
  cashSound(world.audio);
  showToast(world.hud, `Chop Shop paid $${payout}`);
  exitCar(world);
  // The sold car is gone; a fresh sedan waits at the Hideout.
  world.car = spawnCar('sedan', SPOTS.hideout.x + 6, SPOTS.hideout.z, 0);
  world.chopCooldown = 5;
  saveWorld(world);
}

function tickMissions(world, dt) {
  const game = {
    player: world.player,
    car: world.playerCar,
    empire: world.empire,
    roster: world.roster,
    streetRaces: world.streetRaces,
    clock: world.clock,
    city: world.city,
    sessionEarned: world.sessionEarned,
    ledger: world.ledger,
    mission: world.missions,
  };
  // M10 Heat Lock: while mission 10 is active and the player is at 5 stars,
  // the heat holds.
  const cur = currentMission(world.missions);
  if (cur && cur.id === 'm10' && world.player.wanted >= 5) world.heat.locked = true;
  else world.heat.locked = false;
  const before = world.missions.index;
  tickMission(world.missions, game, dt);
  world.sessionEarned = game.sessionEarned;
  if (world.missions.index !== before) {
    const done = MISSIONS[before];
    missionSound(world.audio);
    showBanner(world.hud, `${done.name} — DONE`, `+$${ECONOMY.missionPayout[before]}`, 4);
    const next = currentMission(world.missions);
    if (next) {
      showToast(world.hud, `Next: ${next.name} — ${next.brief}`);
      startMission(world.missions);
    } else {
      showBanner(world.hud, 'SOLMAR IS YOURS', 'Every mission done. The city is yours, Leo.', 6);
    }
    saveWorld(world);
  }
}

function tickEmpire(world, dt) {
  const empireHours = (world.clock.hour - world.empireHour + 24) % 24;
  // A clock jump banks the hours it skipped. The clock only ever moves
  // forward in normal play, so any positive forward delta is real income.
  if (empireHours > 0) {
    const paid = accrueEmpire(world.empire, world.clock, empireHours);
    if (paid > 0) {
      world.player.cash += paid;
      world.sessionEarned += paid;
      ledgerEarn(world.ledger, paid);
    }
  }
  world.empireHour = world.clock.hour;
}

function tickRaces(world, dt) {
  if (!world.streetRaces.active) return;
  raceTick(world.streetRaces, dt);
  const car = world.playerCar;
  if (!car) return;
  if (raceGatePassed(world.streetRaces, car.x, car.z)) {
    cashSound(world.audio);
    const active = world.streetRaces.active;
    if (active) showToast(world.hud, `Gate ${active.gate}/${active.gates.length}`);
  }
  if (raceFinished(world.streetRaces)) {
    const wonBefore = world.streetRaces.won;
    const res = finishRace(world.streetRaces, world.weather);
    if (res.ok) {
      world.player.cash += res.prize;
      world.sessionEarned += res.prize;
      ledgerEarn(world.ledger, res.prize);
      ledgerRace(world.ledger, true);
      world.player.respect += 90;
      missionSound(world.audio);
      showBanner(world.hud, 'RACE WON', `+$${res.prize} in ${res.seconds}s`, 4);
      makeGateMeshes(world.view, []);
      saveWorld(world);
    }
  }
}

// --- The loop, the HUD data, and boot ---

function hudData(world) {
  const { tier, next } = respectTier(world.player.respect);
  const cur = currentMission(world.missions);
  const step = currentStep(world.missions);
  const district = districtAt(world.player.x, world.player.z);
  const ventureDefs = {};
  for (const v of [{ id: 'solmar-laundry', label: 'Solmar Laundry' }, { id: 'palm-wash', label: 'Palm Wash' }, { id: 'sunset-taxi', label: 'Sunset Taxi Co.' }, { id: 'neon-palms', label: 'Neon Palms Club' }]) {
    ventureDefs[v.id] = v;
  }
  const weaponSlots = WEAPONS.slots.map((w, i) => {
    if (i === 0) return 'FISTS';
    const ammo = world.player.ammo[i] || 0;
    return `${w.name.toUpperCase()} ${ammo}`;
  });
  const active = world.streetRaces.active;
  const raceDefNow = active ? raceDef(active.id) : null;
  return {
    player: world.player,
    mission: cur ? { name: cur.name, stepText: step ? step.text : '', index: world.missions.index } : { name: '', stepText: '', index: world.missions.index },
    district: district.label,
    respectTier: tier,
    respectNext: next,
    empire: world.empire,
    empireHourly: empireHourly(world.empire, world.clock),
    ventureDefs,
    crewNames: crewNames(world.roster),
    streetRaces: {
      active: active ? { id: active.id, label: raceDefNow ? raceDefNow.label : active.id, gate: active.gate, gates: active.gates, elapsed: active.elapsed, par: raceDefNow ? raceDefNow.par : 0 } : null,
    },
    garageSummary: garageSummary(world.garage),
    weaponSlots,
    clock: world.clock,
    clockLabel: clockLabel(world.clock),
    speedKmh: world.playerCar ? kmh(world.playerCar) : 0,
    heli: world.heli,
    ventureDots: Object.keys(world.empire.owned).map((id) => ventureSpot(world.city, id)),
    gateDots: active ? active.gates.slice(active.gate) : [],
    radio: world.radio,
  };
}

function exposeGame(world) {
  // The debug handle the playtest and the screenshots use.
  const game = {
    time: world.time,
    player: world.player,
    mission: world.missions,
    missions: world.missions,
    objectiveText: world.missionObjective,
    daynight: world.clock,
    clock: world.clock,
    nightFactor: world.clock.isNight ? 1 : 0,
    peds: world.crowd,
    shoppers: world.shoppers,
    stats: world.ledger,
    ledger: world.ledger,
    empire: world.empire,
    roster: world.roster,
    crew: world.roster,
    streetRaces: world.streetRaces,
    races: world.streetRaces,
    garage: world.garage,
    upgrades: world.garage,
    city: world.city,
    weather: world.weather,
    car: world.playerCar,
    cars: [world.car, ...world.traffic],
    cops: world.cops,
    policeCars: world.cops,
    heli: world.heli,
    heat: world.heat,
    sessionEarned: world.sessionEarned,
    shopOpen: world.shopOpen,
    shopNear: world.shopNear,
    garageOpen: world.shopOpen && world.shopOpen.kind === 'garage',
    paused: world.paused,
    saved: world.saved,
    saveAt: world.saveAt,
  };
  window.__game = game;
  return game;
}

function tick(world, dt) {
  if (world.paused || world.over) return;
  world.time += dt;
  const keys = readKeys(world.input);
  // First gesture starts the audio (browsers demand it).
  if (keys.any) startAudio(world.audio);
  if (keys.radio) {
    world.radio = !world.radio;
    setRadio(world.audio, world.radio);
  }
  if (keys.enter && !world.player.inCar) {
    const near = nearestCar(world, world.player.x, world.player.z, 6);
    if (near) enterCar(world, near);
  }
  if (keys.exit && world.player.inCar) exitCar(world);
  if (keys.abandon && world.streetRaces.active) {
    abandonRace(world.streetRaces);
    makeGateMeshes(world.view, []);
    showToast(world.hud, 'Race abandoned');
  }
  tickPlayer(world, keys, dt);
  tickTraffic(world, dt);
  tickCrowd(world.crowd, world.player, dt);
  tickShoppers(world.shoppers, dt);
  if (world.player.wanted > 0) tickCops(world, dt);
  else world.cops = [];
  tickHeli(world, dt);
  tickHeat(world, dt);
  tickClock(world.clock, dt);
  tickWeather(world.weather, world.dice, dt);
  tickEmpire(world, dt);
  tickRaces(world, dt);
  tickMissions(world, dt);
  // The objective line the HUD and the playtest read.
  const curMission = currentMission(world.missions);
  const curStep = currentStep(world.missions);
  world.missionObjective = curMission
    ? `${curMission.name} — ${curStep ? curStep.text : 'Done'}`
    : 'Free roam';
  tickShop(world, keys);
  tickChopShop(world);
  tickMates(world, dt);
  if (world.chopCooldown > 0) world.chopCooldown -= dt;
  if (world.radio) radioTick(world.audio);
  // Scare the crowd when a chase screams past.
  if (world.player.wanted >= 2 && world.player.inCar && world.playerCar && world.playerCar.speed > 18) {
    scareCrowd(world.crowd, world.player.x, world.player.z, 26);
  }
  drawHud(world.hud, hudData(world));
  renderFrame(world.view, {
    cars: [world.car, ...world.traffic],
    playerCar: world.playerCar,
    peds: world.crowd,
    shoppers: world.shoppers,
    heli: world.heli,
    player: world.player,
    clock: world.clock,
  }, dt, world.time);
  exposeGame(world);
}

function stageShot(world, shot) {
  // A ?shot= URL stages one fixed scene for the screenshots, instead of
  // running the loop. The cover keeps the heli and the mission banner.
  const game = exposeGame(world);
  if (shot === 'cover') {
    world.player.wanted = 4;
    world.heli.active = true;
    world.heli.x = world.player.x + 30;
    world.heli.z = world.player.z - 60;
    world.clock.hour = 17.3;
    world.clock.golden = true;
    startMission(world.missions);
    showBanner(world.hud, 'Drive to the Garage — do not get busted', 'Mission 1 · Wheels Up', 30);
  }
  if (shot === 'drive') {
    world.player.inCar = true;
    world.playerCar = world.car;
    world.car.model = 'sport';
    world.car.color = 0xff5a3c;
    applyEngine(world.car, 2);
    world.garage.nitro = 2;
    world.clock.hour = 17.6;
    world.clock.golden = true;
  }
  if (shot === 'mission') {
    world.missions.index = 10;
    startMission(world.missions);
    buyVenture(world.empire, 'sunset-taxi', 99999);
    world.player.x = SPOTS.taxiOffice.x;
    world.player.z = SPOTS.taxiOffice.z;
    world.clock.hour = 17.3;
    world.clock.golden = true;
    showBanner(world.hud, 'Empire Rising — your taxi office pays $90 an hour', 'Mission 11 · Empire Rising', 30);
  }
  if (shot === 'night') {
    world.clock.hour = 22;
    world.clock.isNight = true;
    world.clock.lampGlow = 1;
    world.player.inCar = true;
    world.playerCar = world.car;
    world.heli.active = true;
    world.heli.night = true;
    world.garage.nitro = 2;
  }
  drawHud(world.hud, hudData(world));
  // Snap the chase cam onto the car for the driving shots (the live loop
  // eases there over many frames; a still has only two). On foot, keep the
  // wide establishing camera — a close chase cam behind a pedestrian is
  // blocked by the nearest building and loses the helicopter.
  if (world.player.inCar && world.playerCar) {
    snapCamera(world.view, { x: world.playerCar.x, z: world.playerCar.z, heading: world.playerCar.heading });
  }
  renderFrame(world.view, {
    cars: [world.car, ...world.traffic],
    playerCar: world.playerCar,
    peds: world.crowd,
    shoppers: world.shoppers,
    heli: world.heli,
    player: world.player,
    clock: world.clock,
  }, 0.016, 1);
  exposeGame(world);
  // Paint twice so the first frame is never blank.
  renderFrame(world.view, {
    cars: [world.car, ...world.traffic],
    playerCar: world.playerCar,
    peds: world.crowd,
    shoppers: world.shoppers,
    heli: world.heli,
    player: world.player,
    clock: world.clock,
  }, 0.016, 1.1);
  return game;
}

function boot() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  const seed = Number(params.get('seed') || 1);
  const world = buildWorld(seed);
  const gameCanvas = document.getElementById('game');
  const hudCanvas = document.getElementById('hud');
  world.view = initRenderer(gameCanvas, world.city);
  world.hud = initHud(hudCanvas);
  resizeHud(world.hud, window.innerWidth, window.innerHeight);
  world.input = initInput();
  // Venture markers and race gates on the map from the start.
  makeVentureMarkers(world.view, Object.keys(world.empire.owned).map((id) => ventureSpot(world.city, id)));
  makeGateMeshes(world.view, []);
  startMission(world.missions);
  window.addEventListener('resize', () => {
    resizeRenderer(world.view);
    resizeHud(world.hud, window.innerWidth, window.innerHeight);
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (world.shopOpen) { world.shopOpen = null; showPrompt(world.hud, null); }
      else {
        world.paused = !world.paused;
        if (world.paused) saveWorld(world);
      }
    }
  });
  if (shot) {
    stageShot(world, shot);
    window.__shotReady = true;
    return world;
  }
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    tick(world, dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return world;
}

boot();
