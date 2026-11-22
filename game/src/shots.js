// Solmar Heat v9 — staged screenshots.
// The four dossier shots are not random gameplay: each one sets the world
// to a chosen moment (golden-hour chase, tuned cruise, empire at the
// laundry, night pursuit) and parks the camera, so the screenshot driver
// just waits for __shotReady and captures. main.js calls stageShot() when
// the URL carries ?shot=.

import { spawnCar, applyEngine } from './vehicles.js';
import { spawnCop, spawnWalker, spawnMate } from './actors.js';
import { setRadio } from './audio.js';
import { showBanner } from './hud.js';

function giveCar(world, model, x, z, engineTier) {
  const car = spawnCar(model, x, z, 0);
  if (engineTier) applyEngine(car, engineTier);
  car.color = 0xff7a1a;
  world.cars.push(car);
  world.car = car;
  world.player.inCar = true;
  return car;
}

function stageCover(world) {
  const p = world.player;
  world.clock.hour = 18.0;
  p.wanted = 4;
  p.x = 0;
  p.z = 60;
  giveCar(world, 'sport', 0, 60, 2);
  world.garage.nitro = 2;
  world.heli.active = true;
  world.cops = [spawnCop(-14, 78, 'ram'), spawnCop(14, 40, 'pit'), spawnCop(-30, 30, 'patrol')];
  // The wreck sits on the open road ahead of the player (in the camera's
  // view, not behind a building): its body and its fire cone both read.
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
}

function stageDrive(world) {
  const p = world.player;
  world.clock.hour = 17.8;
  p.x = 0;
  p.z = 100;
  giveCar(world, 'sport', 0, 100, 2);
  world.garage.engine = 2;
  world.garage.nitro = 2;
  world.garage.paint = 'Sunset Orange';
  world.wrecks.push({ x: 12, z: 130, heading: 0.3, model: 'taxi', color: 0xf2c200, t: 8, cold: false });
  world.camFixed = null;
}

function stageMission(world) {
  const p = world.player;
  world.clock.hour = 17.5;
  world.empire.owned['solmar-laundry'] = { level: 1 };
  world.mission.index = 10;
  world.mission.step = 0;
  const spot = world.city.spots.laundry;
  p.x = spot.x;
  p.z = spot.z + 6;
  world.camFixed = { pos: [spot.x - 18, 9, spot.z - 14], look: [spot.x, 2, spot.z] };
}

function stageNight(world) {
  const p = world.player;
  world.clock.hour = 22.5;
  p.wanted = 3;
  p.x = 0;
  p.z = 0;
  const car = giveCar(world, 'sport', 0, 0, 2);
  car.nitroBurn = 2;
  world.garage.nitro = 2;
  world.heli.active = true;
  world.cops = [spawnCop(-12, 22, 'ram'), spawnCop(16, -14, 'pit')];
  world.wrecks.push({ x: -10, z: -30, heading: 1.2, model: 'sedan', color: 0x8a94a6, t: 12, cold: false });
  world.camFixed = null;
}

export function stageShot(world, name) {
  world.shot = name;
  if (name === 'cover') stageCover(world);
  else if (name === 'drive') stageDrive(world);
  else if (name === 'mission') stageMission(world);
  else if (name === 'night') stageNight(world);
}

export function shotNames() {
  return ['cover', 'drive', 'mission', 'night'];
}
