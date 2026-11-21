// The screenshot scenes behind ?shot=cover|drive|mission|night. Each one
// plays the real rules forward from a fresh seeded world for a fixed number
// of steps, steered by a simple autopilot (drive along the road, keep clear
// of the car ahead), so the frame is what a short game really looks like.
// The same seed always gives the same streets; the scenes are staged, never
// drawn by hand.
import { STEP, WORLD } from './config.js';
import { stepDrivenCar, stepTrafficCar, stepPoliceCar, createCar, createHelicopter, stepHelicopter } from './vehicles.js';
import { stepPed, createCrewMember } from './actors.js';
import { startMission } from './missions.js';

/** Drive straight along the current road for a while. */
function autopilotDrive(game, seconds) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    const player = game.player;
    if (player.car) {
      stepDrivenCar(player.car, { x: 0, y: -1, handbrake: false }, STEP, game.city, game.cars);
      player.x = player.car.x;
      player.y = player.car.y;
      player.angle = player.car.angle;
    }
    for (const car of game.cars) {
      if (car.traffic) stepTrafficCar(car, STEP, game.city, game.cars, game.random);
    }
    for (const car of game.policeCars) {
      stepPoliceCar(car, player, STEP, game.city, game.cars);
    }
    if (game.heli) stepHelicopter(game.heli, player, STEP);
    for (const ped of game.peds) stepPed(ped, STEP, game.city, null);
    game.time += STEP;
  }
}

/** Put the player in a fresh car of `kind` at a position and heading. */
function putPlayerInCar(game, kind, x, y, angle) {
  const car = createCar(kind, x, y, angle, game.random);
  car.parked = false;
  game.cars.push(car);
  game.player.car = car;
  game.player.onFoot = false;
  game.player.x = x;
  game.player.y = y;
  game.player.angle = angle;
  return car;
}

/** Set the radio station on the game state and the audio engine together. */
function setRadio(game, index) {
  game.radio = index;
  game.audio.setStation(index);
}

/**
 * Park Air One far ahead, over the road the player is driving on: the
 * chase reads better with the helicopter in the frame, not just in the HUD.
 * Far ahead it sits below the centred mission banner (the chase camera
 * looks down, so near things ride high in the frame), and over the road
 * nothing can hide it behind a building. The road is snapped from the
 * player's y (horizontal roads run every 400px from y=150). (v2 parked it
 * at +250/-120, right on the banner; +320/+300 hid it behind Spray & Go;
 * +420/-260 left it cut off at the top edge; +900/-40 showed it, small.)
 */
function parkHeli(game) {
  if (!game.heli) return;
  const roadY = Math.round((game.player.y - 150) / 400) * 400 + 150;
  game.heli.x = game.player.x + 800;
  game.heli.y = roadY;
}

/** `count` police cars in a fan behind the player, turned to face them. */
function addPoliceChase(game, count, baseDist = 260) {
  const player = game.player;
  for (let i = 0; i < count; i += 1) {
    const behind = player.angle + Math.PI + (i - count / 2) * 0.35;
    const dist = baseDist + i * 70;
    const car = createCar('police', player.x + Math.cos(behind) * dist, player.y + Math.sin(behind) * dist, player.angle, game.random);
    car.speed = 320;
    game.policeCars.push(car);
  }
}

/** One interceptor ahead of the player, turned to face them: a roadblock. */
function addPoliceAhead(game, dist = 300, lateral = 120) {
  const player = game.player;
  const a = player.angle;
  const x = player.x + Math.cos(a) * dist - Math.sin(a) * lateral;
  const y = player.y + Math.sin(a) * dist + Math.cos(a) * lateral;
  const car = createCar('police', x, y, a + Math.PI, game.random);
  car.speed = 200;
  game.policeCars.push(car);
}

/**
 * Set `game` to the named scene and return the screen to draw over it.
 * Names: cover (police chase), drive (golden-hour cruise), mission (marina
 * pickup on foot), night (downtown after dark). Any other name is cover.
 */
export function stageShot(name, game) {
  const scene = name || 'cover';
  game.mission.active = false;
  game.mission.index = 0;
  game.policeCars = [];
  game.cops = [];
  if (scene === 'cover') {
    // A four-star chase through the middle of town, at golden hour, with Air
    // One overhead. The road ahead is clear now (landmarks sit inside
    // blocks), so the car actually accelerates; the police start close and
    // one cuts in ahead, and the autopilot is short so the whole pack stays
    // in the frame. Leo's car is painted bright red so it reads as the hero.
    const coverCar = putPlayerInCar(game, 'sport', 1350, 950, 0);
    coverCar.paint = '#e74c3c';
    game.player.cash = 1890;
    game.player.health = 84;
    game.player.wanted = 4;
    game.player.weapon = 'pistol';
    game.player.ammo = { pistol: 18, smg: 60, shotgun: 8 };
    game.weaponsOwned = ['fists', 'pistol', 'smg'];
    game.respect = 1600;
    setRadio(game, 0);
    game.shotCam = { dist: 230, height: 130, fov: 66 };
    game.heli = createHelicopter(game.player.x, game.player.y);
    game.clock = 17 * 60 + 20;
    game.mission.index = 3;
    startMission(game.mission, null);
    game.missionTarget = game.city.places.hideout;
    game.objectiveText = 'Escape to the Hideout — do not get busted';
    addPoliceChase(game, 3, 150);
    addPoliceAhead(game, 300, 120);
    autopilotDrive(game, 1.2);
    parkHeli(game);
    return { screen: 'play' };
  }
  if (scene === 'drive') {
    // Golden-hour cruise down Palm Strip with traffic and pedestrians.
    putPlayerInCar(game, 'sedan', 950, 2150, -Math.PI / 2);
    game.player.cash = 860;
    game.player.health = 100;
    game.clock = 17 * 60 + 15;
    game.respect = 100;
    setRadio(game, 1);
    game.shotCam = { dist: 280, height: 150, fov: 62 };
    game.objectiveText = 'Cruise Solmar — next job: Special Delivery';
    autopilotDrive(game, 3.5);
    return { screen: 'play' };
  }
  if (scene === 'mission') {
    // On foot at the Marina, mission 4 briefing live, crew beside Leo.
    game.player.onFoot = true;
    game.player.car = null;
    game.player.x = game.city.places.marina.x + 60;
    game.player.y = game.city.places.marina.y + 40;
    // Face west toward the Marina and the sea: the backdrop is water and
    // the marina, not a blank building facade.
    game.player.angle = Math.PI;
    game.player.cash = 1250;
    game.player.health = 92;
    game.clock = 11 * 60 + 20;
    game.respect = 800;
    setRadio(game, 0);
    game.shotCam = { dist: 160, height: 130, fov: 60 };
    game.crew = [
      createCrewMember('Dante', game.player.x - 50, game.player.y + 40, '#e8b98a', '#e74c3c'),
      createCrewMember('Rosa', game.player.x + 40, game.player.y - 60, '#f1c27d', '#2ecc71'),
    ];
    game.mission.index = 3;
    startMission(game.mission, null);
    game.missionTarget = game.city.places.marina;
    game.objectiveText = 'Pick up the cargo at the Marina';
    autopilotDrive(game, 0.5);
    return { screen: 'play' };
  }
  if (scene === 'night') {
    // Downtown at night, headlights on, Air One circling overhead.
    putPlayerInCar(game, 'sport', 1750, 1350, 0);
    game.player.cash = 2340;
    game.player.health = 78;
    game.player.wanted = 4;
    game.clock = 22 * 60 + 40;
    game.respect = 1600;
    setRadio(game, 2);
    game.shotCam = { dist: 300, height: 170, fov: 62 };
    game.heli = createHelicopter(game.player.x, game.player.y);
    addPoliceChase(game, 1, 200);
    game.objectiveText = 'Lose the SCPD — reach Spray & Go';
    game.missionTarget = game.city.places.spray;
    autopilotDrive(game, 1.5);
    parkHeli(game);
    return { screen: 'play' };
  }
  // Unknown scene name: fall back to cover.
  return stageShot('cover', game);
}
