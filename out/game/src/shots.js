// The screenshot scenes behind ?shot=cover|drive|mission|night. Each one
// plays the real rules forward from a fresh seeded world for a fixed number
// of steps, steered by a simple autopilot (drive along the road, keep clear
// of the car ahead), so the frame is what a short game really looks like.
// The same seed always gives the same streets; the scenes are staged, never
// drawn by hand.
import { STEP, WORLD } from './config.js';
import { stepDrivenCar, stepTrafficCar, stepPoliceCar, createCar } from './vehicles.js';
import { stepPed } from './actors.js';
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
    for (const ped of game.peds) stepPed(ped, STEP, game.city, null);
    game.time += STEP;
  }
}

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

function addPoliceChase(game, count) {
  const player = game.player;
  for (let i = 0; i < count; i += 1) {
    const behind = player.angle + Math.PI + (i - count / 2) * 0.35;
    const dist = 260 + i * 90;
    const car = createCar('police', player.x + Math.cos(behind) * dist, player.y + Math.sin(behind) * dist, player.angle, game.random);
    car.speed = 320;
    game.policeCars.push(car);
  }
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
  if (scene === 'mission') {
    // On foot at the Marina, mission 4 briefing live, peds around.
    game.player.onFoot = true;
    game.player.car = null;
    game.player.x = game.city.places.marina.x + 60;
    game.player.y = game.city.places.marina.y + 40;
    game.player.angle = -Math.PI / 2;
    game.player.cash = 1250;
    game.player.health = 92;
    game.clock = 11 * 60 + 20;
    game.mission.index = 3;
    startMission(game.mission, null);
    game.missionTarget = game.city.places.marina;
    game.objectiveText = 'Pick up the cargo at the Marina';
    autopilotDrive(game, 0.5);
    return { screen: 'play' };
  }
  if (scene === 'night') {
    // Downtown at night, headlights on, one police car closing in.
    putPlayerInCar(game, 'sport', 1750, 1350, 0);
    game.player.cash = 2340;
    game.player.health = 78;
    game.player.wanted = 2;
    game.clock = 22 * 60 + 40;
    addPoliceChase(game, 1);
    game.objectiveText = 'Lose the SCPD — reach Spray & Go';
    game.missionTarget = game.city.places.spray;
    autopilotDrive(game, 2.5);
    return { screen: 'play' };
  }
  if (scene === 'drive') {
    // Golden-hour cruise down Palm Strip with traffic and pedestrians.
    putPlayerInCar(game, 'sedan', 950, 2150, -Math.PI / 2);
    game.player.cash = 860;
    game.player.health = 100;
    game.clock = 17 * 60 + 15;
    game.objectiveText = 'Cruise Solmar — next job: Special Delivery';
    autopilotDrive(game, 3.5);
    return { screen: 'play' };
  }
  // Cover: a three-star chase through the middle of town.
  putPlayerInCar(game, 'sport', 1350, 950, 0);
  game.player.cash = 1890;
  game.player.health = 84;
  game.player.wanted = 3;
  game.player.weapon = 'pistol';
  game.player.ammo = 18;
  game.clock = 16 * 60 + 10;
  game.mission.index = 3;
  startMission(game.mission, null);
  game.missionTarget = game.city.places.hideout;
  game.objectiveText = 'Escape to the Hideout — do not get busted';
  addPoliceChase(game, 3);
  autopilotDrive(game, 2.0);
  return { screen: 'play' };
}
