// Screenshot staging — each named shot sets the clock, weather, car,
// wreck, heli, cops and banner so the four dossier shots read like a
// postcard of Solmar at its best.
import { setBanner } from './missions.js';
import { spawnCop } from './actors.js';
import { makeCar } from './vehicles.js';

function putInCar(g, x, z, heading, speed) {
  const car = g.cars[0];
  if (!car) return null;
  car.x = x; car.z = z; car.heading = heading; car.speed = speed || 0;
  car.health = car.maxHealth;
  g.car = car;
  g.player.car = car;
  g.player.inCar = true;
  g.player.x = x; g.player.z = z; g.player.heading = heading;
  return car;
}
function putOnFoot(g, x, z, heading) {
  g.player.inCar = false;
  g.player.car = null;
  g.car = null;
  g.player.x = x; g.player.z = z; g.player.heading = heading || 0;
}

export function stageShot(g, name) {
  const p = g.player;
  g.wrecks = [];
  g.booms = [];
  g.cops = [];
  g.heli = null;
  g.flash = 0;
  p.wanted = 0;
  p.health = 100;
  g.shopOpen = null;
  g.wheel.open = false;
  g.paused = false;

  if (name === 'cover') {
    // Golden hour, sun ahead, wreck in the open road, Air One overhead.
    // The player car sits still (speed 0) so the chase camera settles
    // at (0, 6.5, 27) and the framing is identical on every run — a
    // coasting car used to drag the camera forward and push Air One
    // behind the KPD panel. Air One ORBITS the player (tickActors,
    // radius 35, +0.22 rad per game-second): staged angle 1.22 lands
    // it dead ahead (angle ~1.57) at capture time, about 1.6
    // game-seconds after staging, centre frame below the sun disc.
    g.clock.hour = 18;
    g.weather.kind = 'clear';
    g.weather.timer = 80;
    p.cash = 500;
    p.respect = 140;
    p.health = 100;
    p.wanted = 3;
    g.roster.hired.milo = { active: true };
    g.mission.index = 0; g.mission.step = 0; g.mission.timer = 149;
    putInCar(g, 0, 40, 0, 0);
    // Burning wreck close ahead on the open road, in the clear centre
    // lane so it reads as a car on fire, not a cone. Turned 0.6 rad
    // so the camera sees its 3/4 side (length + cabin) instead of a
    // flat rear rectangle.
    g.wrecks.push({ x: 3, z: 58, heading: 0.6, t: 0.1, color: 0x181818 });
    g.heli = { x: 0, y: 12, z: 75, angle: 1.22, rotor: 0, locked: true };
    spawnCop(g, 'ram'); spawnCop(g, 'pit'); spawnCop(g, 'patrol');
    spawnCop(g, 'ram'); spawnCop(g, 'pit'); spawnCop(g, 'patrol');
    // Cops close in from the sides and the south so none of them
    // drives across the wreck on its way to the player.
    g.cops[0].x = 14; g.cops[0].z = 48;
    g.cops[1].x = -14; g.cops[1].z = 48;
    g.cops[2].x = 18; g.cops[2].z = 72;
    g.cops[3].x = -12; g.cops[3].z = 70;
    g.cops[4].x = 22; g.cops[4].z = 30;
    g.cops[5].x = -20; g.cops[5].z = 32;
    // Parked traffic on the avenue so the street reads alive: a taxi
    // in the near lane, a sport far ahead facing the camera, a van
    // crossing on the cross street. Parked (traffic=false) so they
    // hold still for the shot.
    g.cars.push(makeCar(g.rng, 'taxi', -4, 55, 0));
    g.cars.push(makeCar(g.rng, 'sport', 5, 100, Math.PI));
    g.cars.push(makeCar(g.rng, 'van', 26, 75, Math.PI / 2));
    // Park two clouds in the open sky band, one each side of the sun,
    // so the sky never reads empty (the random spread leaves the
    // centre band bare most seeds). They drift slowly, so this is a
    // nudge, not a freeze.
    if (g.render && g.render.clouds) {
      if (g.render.clouds[0]) g.render.clouds[0].position.set(33, 44, 178);
      if (g.render.clouds[1]) g.render.clouds[1].position.set(-29, 44, 178);
      // Two more were landing behind the HUD panels (grey smudges on
      // the rank + KPD panels) — park them low over the skyline instead.
      if (g.render.clouds[6]) g.render.clouds[6].position.set(61, 42, 237);
      if (g.render.clouds[7]) g.render.clouds[7].position.set(-52, 39, 219);
    }
    setBanner(g, 'MISSION 1 · WHEELS UP', 'mission');
    g.hud.dialog = 'New wheels, same streets. Get to the Garage, kid.';
    g.hud.dialogT = 8;
  } else if (name === 'drive') {
    // Daytime cruise down the Marina front, traffic and palms in frame.
    // The car drives NORTH along avenue x=-75 (a real road) — driving
    // east across the blocks put the chase camera beside a building
    // wall whenever the frame rate ran slow, so the shot was luck.
    g.clock.hour = 11;
    g.weather.kind = 'clear';
    g.weather.timer = 80;
    p.cash = 2400;
    p.respect = 60;
    g.mission.index = 1; g.mission.step = 0; g.mission.timer = 64;
    putInCar(g, -75, -40, 0, 30);
    // Wreck on the avenue ahead, far enough that the chase camera
    // never sits inside its smoke column at capture time.
    g.wrecks.push({ x: -75, z: 5, t: 0.8, color: 0x181818 });
    setBanner(g, 'MISSION 2 · SUNSET STRIP', 'mission');
    g.hud.dialog = 'The strip is yours — just keep it under the limit, kid.';
    g.hud.dialogT = 8;
  } else if (name === 'mission') {
    // Night at the pier — the smuggler's drop, heat on the tail.
    g.clock.hour = 22;
    g.weather.kind = 'clear';
    g.weather.timer = 80;
    p.cash = 1850;
    p.respect = 260;
    p.wanted = 2;
    g.roster.hired.milo = { active: true };
    g.roster.hired.vera = { active: true };
    g.mission.index = 8; g.mission.step = 0; g.mission.timer = 112;
    putOnFoot(g, -160, 120, Math.PI);
    spawnCop(g, 'patrol');
    setBanner(g, "MISSION 9 · SMUGGLER'S RUN", 'mission');
    g.hud.dialog = 'The pier at night. Nobody sees anything — if you pay.';
    g.hud.dialogT = 8;
  } else {
    // Night downtown in the rain, city lights on, Air One circling.
    g.clock.hour = 21;
    g.weather.kind = 'rain';
    g.weather.timer = 80;
    p.cash = 7200;
    p.respect = 520;
    p.wanted = 4;
    g.roster.hired.milo = { active: true };
    g.roster.hired.vera = { active: true };
    g.roster.hired.tank = { active: true };
    g.mission.index = 9; g.mission.step = 0; g.mission.timer = 203;
    putInCar(g, 60, 20, 0, 22);
    g.heli = { x: 55, y: 12, z: 60, angle: 2.2, rotor: 0, locked: true };
    spawnCop(g, 'ram'); spawnCop(g, 'pit'); spawnCop(g, 'patrol'); spawnCop(g, 'patrol');
    setBanner(g, 'MISSION 10 · HEAT WAVE', 'mission');
    g.hud.dialog = 'Four stars and the whole city is awake. Drive, kid.';
    g.hud.dialogT = 8;
  }
}
