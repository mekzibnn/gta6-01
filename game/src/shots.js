// Solmar Heat v7 — staged screenshots.
// The four dossier shots are not random gameplay: each one sets the world
// to a chosen moment (golden-hour chase, tuned cruise, empire at the
// laundry, night pursuit) and parks the camera, so the screenshot driver
// just waits for __shotReady and captures. main.js calls stageShot() when
// the URL carries ?shot=.

import { spawnCar, applyEngine } from './vehicles.js';
import { spawnCop } from './actors.js';
import { showBanner } from './hud.js';

export function stageShot(world, name) {
  world.shot = name;
  const p = world.player;
  if (name === 'cover') {
    world.clock.hour = 18.0;
    p.wanted = 4;
    p.x = 0;
    p.z = 60;
    const car = spawnCar('sport', 0, 60, 0);
    applyEngine(car, 2);
    car.color = 0xff7a1a;
    world.cars.push(car);
    world.car = car;
    p.inCar = true;
    world.garage.nitro = 2;
    world.heli.active = true;
    world.cops = [spawnCop(-14, 78, 'ram'), spawnCop(14, 40, 'pit'), spawnCop(-30, 30, 'patrol')];
    world.wrecks.push({ x: -18, z: 88, heading: 0.6, model: 'sedan', color: 0x8a94a6, t: 5, cold: false });
    world.mission.index = 0;
    world.mission.step = 0;
    world.camFixed = { pos: [-16, 7, 34], look: [0, 2, 70] };
    showBanner(world.hud, 'Drive to the Garage — do not get busted');
  } else if (name === 'drive') {
    world.clock.hour = 17.8;
    p.x = 0;
    p.z = 100;
    const car = spawnCar('sport', 0, 100, 0);
    applyEngine(car, 2);
    car.color = 0xff7a1a;
    world.cars.push(car);
    world.car = car;
    p.inCar = true;
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
    const car = spawnCar('sport', 0, 0, 0);
    applyEngine(car, 2);
    car.color = 0xff7a1a;
    car.nitroBurn = 2;
    world.cars.push(car);
    world.car = car;
    p.inCar = true;
    world.garage.nitro = 2;
    world.heli.active = true;
    world.cops = [spawnCop(-12, 22, 'ram'), spawnCop(16, -14, 'pit')];
    world.wrecks.push({ x: -10, z: -30, heading: 1.2, model: 'sedan', color: 0x8a94a6, t: 12, cold: false });
    world.camFixed = null;
  }
}

export function shotNames() {
  return ['cover', 'drive', 'mission', 'night'];
}
