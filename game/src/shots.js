// Screenshot staging — each named shot sets the clock, weather, car,
// wreck, heli, cops and banner so the four dossier shots read like a
// postcard of Solmar at its best.
import { setBanner } from './missions.js';
import { spawnCop } from './actors.js';

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
    g.clock.hour = 18;
    g.weather.kind = 'clear';
    g.weather.timer = 80;
    p.cash = 500;
    p.respect = 140;
    p.health = 100;
    p.wanted = 3;
    g.roster.hired.milo = { active: true };
    g.mission.index = 0; g.mission.step = 0; g.mission.timer = 149;
    putInCar(g, 0, 40, 0, 28);
    g.wrecks.push({ x: 6, z: 80, t: 0.4, color: 0x181818 });
    g.heli = { x: 12, y: 12, z: 85, angle: 0.3, rotor: 0, locked: true };
    spawnCop(g, 'ram'); spawnCop(g, 'pit'); spawnCop(g, 'patrol');
    spawnCop(g, 'ram'); spawnCop(g, 'pit'); spawnCop(g, 'patrol');
    g.cops[0].x = 8; g.cops[0].z = 70;
    g.cops[1].x = -6; g.cops[1].z = 55;
    g.cops[2].x = 14; g.cops[2].z = 30;
    g.cops[3].x = -10; g.cops[3].z = 75;
    g.cops[4].x = 20; g.cops[4].z = 45;
    g.cops[5].x = 0; g.cops[5].z = 60;
    setBanner(g, 'MISSION 1 · WHEELS UP', 'mission');
    g.hud.dialog = 'New wheels, same streets. Get to the Garage, kid.';
    g.hud.dialogT = 8;
  } else if (name === 'drive') {
    // Daytime cruise down the Marina front, traffic and palms in frame.
    g.clock.hour = 11;
    g.weather.kind = 'clear';
    g.weather.timer = 80;
    p.cash = 2400;
    p.respect = 60;
    g.mission.index = 1; g.mission.step = 0; g.mission.timer = 64;
    putInCar(g, -75, -40, Math.PI / 2, 30);
    g.wrecks.push({ x: -60, z: -40, t: 0.8, color: 0x181818 });
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
