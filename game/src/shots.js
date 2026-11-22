// Screenshot setups for Solmar Heat.
// A ?shot=<name> URL stages the game for one of the four screenshots:
// the right mission, the right hour, the right wanted level, the right
// camera. The screenshots are real renders of the game's own code.

export const SHOTS = [
  {
    id: 'cover',
    file: '1-cover.jpg',
    title: 'Cover',
    desc: 'Golden hour on the avenue: mission 1, three stars, the KPD response panel, Milo on the crew card and a burning wreck ahead.',
  },
  {
    id: 'drive',
    file: '2-drive.jpg',
    title: 'Drive',
    desc: 'The Solmar GT on the avenue at golden hour, traffic and palms, the minimap and the wanted stars.',
  },
  {
    id: 'mission',
    file: '3-mission.jpg',
    title: 'Mission',
    desc: 'Empire Rising complete at the Laundry: the reward banner, the empire widget and the district standing.',
  },
  {
    id: 'night',
    file: '4-night.jpg',
    title: 'Night',
    desc: 'Night in Downtown: the lamps glow, the helicopter spotlight sweeps the street and the KPD panel lists the units.',
  },
];

function putPlayerInSport(game, x, z, heading) {
  let sport = game.cars.find((c) => c.model === 'sport' && !c.exploded);
  if (!sport) return;
  sport.x = x;
  sport.z = z;
  sport.heading = heading;
  sport.speed = 0;
  sport.health = sport.maxHealth;
  game.car = sport;
  game.player.inCar = true;
  game.player.x = x;
  game.player.z = z;
  game.player.heading = heading;
}

// Stage one of the four screenshots. Called once at load, from the URL.
export function applyShot(game, name) {
  game.shot = name;
  if (name === 'cover') {
    game.clock.hour = 18;
    game.player.cash = 400;
    game.player.wanted = 3;
    game.player.weapons = [true, true, false, false];
    game.player.weapon = 1;
    game.garage.armor = 1;
    game.roster.hired.milo = { active: true };
    game.mission.index = 0;
    game.mission.step = 0;
    putPlayerInSport(game, 0, 100, 0);
    // A burning wreck in the open road ahead, where the camera sees it.
    game.wrecks.push({ x: 8, z: 132, model: 'sedan', t: 0 });
    game.hud.banner = 'Drive to the Garage — do not get busted';
    game.hud.bannerT = 3.5;
    game.hud.bannerKind = 'mission';
    game.hud.dialog = { name: 'LEO', text: 'Leo starts with a stolen car and a fixer on the phone.' };
    game.shotCam = { x: 7, y: 13, z: 76, lookX: -2, lookY: 5, lookZ: 140 };
  } else if (name === 'drive') {
    game.clock.hour = 17.5;
    game.player.wanted = 1;
    game.player.weapons = [true, false, false, false];
    game.mission.index = 1;
    game.mission.step = 0;
    putPlayerInSport(game, 0, 60, 0);
    game.car.speed = 24;
    game.hud.banner = 'Steal a sport car';
    game.hud.bannerT = 3.5;
    game.hud.bannerKind = 'mission';
    game.shotCam = { x: -9, y: 11, z: 34, lookX: 2, lookY: 4, lookZ: 110 };
  } else if (name === 'mission') {
    game.clock.hour = 18;
    game.player.wanted = 2;
    game.empire.owned['solmar-laundry'] = { level: 1 };
    game.empire.totalEarned = 350;
    game.mission.done = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9', 'm10', 'm11'];
    game.mission.index = 11;
    game.mission.step = 0;
    game.player.districtStanding.downtown = 40;
    putPlayerInSport(game, -52, -40, Math.PI / 2);
    game.hud.banner = 'Empire Rising — COMPLETE $6000';
    game.hud.bannerT = 3.5;
    game.hud.bannerKind = 'done';
    game.hud.dialog = { name: 'LEO', text: 'The Laundry is ours. Solmar is starting to pay.' };
    game.shotCam = { x: -30, y: 12, z: -78, lookX: -52, lookY: 3, lookZ: -40 };
  } else if (name === 'night') {
    game.clock.hour = 22.67;
    game.player.wanted = 3;
    game.player.weapons = [true, true, false, false];
    game.player.weapon = 1;
    game.garage.armor = 2;
    game.roster.hired.milo = { active: true };
    game.roster.hired.vera = { active: true };
    game.mission.index = 9;
    game.mission.step = 0;
    putPlayerInSport(game, 0, 100, 0);
    game.hud.banner = 'Survive the 5-star heat';
    game.hud.bannerT = 3.5;
    game.hud.bannerKind = 'mission';
    game.shotCam = { x: 8, y: 12, z: 74, lookX: -2, lookY: 5, lookZ: 140 };
  }
}
