// The screenshot shots. A ?shot=cover|drive|mission|night URL stages
// the scene for the four dossier images: the time of day, the wanted
// level, the mission banner, a burning wreck on the road and the car the
// camera rides in. Normal play (no ?shot=) is untouched.

import { makeCar } from './vehicles.js';

// Read the ?shot= parameter, or '' for normal play.
export function shotFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get('shot') || '';
  } catch {
    return '';
  }
}

// Stage the scene for a shot. Called once after the world is built.
// The banner is pinned up (a long bannerT) so it is still there when
// the screenshot lands.
export function applyShot(g, shot) {
  if (!shot) return;
  g.shot = shot;
  const sport = g.cars.find((c) => c.model === 'sport') || g.cars[0];
  if (shot === 'cover') {
    g.clock.hour = 18.0;
    g.weather.kind = 'clear';
    g.weather.timer = 90;
    g.player.wanted = 3;
    // A burning wreck in the open road, ahead of the camera. The shot
    // camera sits 17 units behind the car and looks forward, so the
    // wreck must be PAST the car (z > 100), not behind it.
    g.wrecks.push({ x: 6, z: 140, model: 'sedan', color: 0x2a2a2a, burnT: 0 });
    // The player rides the sport car up the avenue, cops closing in.
    if (sport) {
      sport.x = 0;
      sport.z = 100;
      sport.heading = 0;
      sport.speed = 0;
      g.player.inCar = true;
      g.car = sport;
      g.player.x = 0;
      g.player.z = 100;
    }
    g.mission.index = 0;
    g.mission.step = 0;
    g.mission.started = -1;
    g.hud.bannerT = 60;
  } else if (shot === 'drive') {
    g.clock.hour = 17.5;
    g.weather.kind = 'clear';
    g.weather.timer = 90;
    g.player.wanted = 1;
    if (sport) {
      sport.x = 0;
      sport.z = 120;
      sport.heading = 0;
      sport.speed = 16;
      g.player.inCar = true;
      g.car = sport;
      g.player.x = 0;
      g.player.z = 120;
    }
    g.mission.index = 1;
    g.mission.step = 0;
    g.mission.started = -1;
    g.hud.bannerT = 60;
  } else if (shot === 'mission') {
    g.clock.hour = 18.0;
    g.weather.kind = 'clear';
    g.weather.timer = 90;
    g.player.wanted = 2;
    if (sport) {
      sport.x = -30;
      sport.z = 150;
      sport.heading = 0.4;
      sport.speed = 0;
      g.player.inCar = true;
      g.car = sport;
      g.player.x = -30;
      g.player.z = 150;
    }
    g.mission.index = 8;
    g.mission.step = 0;
    g.mission.started = -1;
    g.hud.bannerT = 60;
  } else if (shot === 'night') {
    g.clock.hour = 22.0;
    g.clock.isNight = true;
    g.clock.lampGlow = 1;
    g.weather.kind = 'clear';
    g.weather.timer = 90;
    g.player.wanted = 2;
    if (sport) {
      sport.x = 0;
      sport.z = 100;
      sport.heading = 0;
      sport.speed = 0;
      g.player.inCar = true;
      g.car = sport;
      g.player.x = 0;
      g.player.z = 100;
    }
    g.mission.index = 0;
    g.mission.step = 0;
    g.mission.started = -1;
    g.hud.bannerT = 60;
  }
  // Let the mission system open the banner for the staged mission.
  g.mission.started = -1;
}

// Keep a staged shot staged: the banner never times out while the
// screenshot is being taken.
export function holdShot(g) {
  if (!g.shot) return;
  if (g.hud.bannerT < 30) g.hud.bannerT = 30;
}
