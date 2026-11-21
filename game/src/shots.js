// The screenshot scenes behind ?shot=cover|drive|mission|night (v6 rewrite).
// Each shot stages one fixed moment for the entry's screenshots: a four-star
// chase at golden hour with Air One parked ahead below the mission banner
// (cover), a golden-hour cruise in a garage-tuned sport car (drive), the
// Empire Rising mission at the taxi office with the empire widget showing
// (mission), and downtown after dark with the lamps lit (night). main.js
// calls stageShot for the shot named in the URL; this module only names the
// shots and what each one needs, so the dossier and the playtest can list
// them without booting the game.

export const SHOTS = [
  {
    id: 'cover',
    name: '1-cover.jpg',
    query: '?shot=cover&seed=1',
    description: 'Cover: a four-star chase at golden hour, Air One parked ahead below the mission banner',
    wanted: 4,
    heli: true,
    hour: 17.3,
  },
  {
    id: 'drive',
    name: '2-drive.jpg',
    query: '?shot=drive&seed=1',
    description: 'Drive: golden-hour cruise in a garage-tuned sport car — Race engine, sunset-orange paint, two nitro charges',
    wanted: 0,
    heli: false,
    hour: 17.6,
  },
  {
    id: 'mission',
    name: '3-mission.jpg',
    query: '?shot=mission&seed=1',
    description: 'Mission: Empire Rising (mission 11) at Sunset Taxi Co. — the first business is Leo\'s, the empire widget shows in the HUD',
    wanted: 0,
    heli: false,
    hour: 17.3,
  },
  {
    id: 'night',
    name: '4-night.jpg',
    query: '?shot=night&seed=1',
    description: 'Night: downtown after dark — streetlamps lit, headlights on, nitro burning, Air One circling',
    wanted: 0,
    heli: true,
    hour: 22,
  },
];

export function shotById(id) {
  return SHOTS.find((s) => s.id === id) || null;
}

export function shotByName(name) {
  return SHOTS.find((s) => s.name === name) || null;
}

export function shotQuery(id) {
  const shot = shotById(id);
  return shot ? shot.query : '?shot=cover&seed=1';
}

export function shotList() {
  return SHOTS.map((s) => ({ name: s.name, query: s.query, description: s.description }));
}
