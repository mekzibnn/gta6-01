// Solmar Heat v12 — the player: on-foot movement, wanted heat, cash/health.
import { WEAPONS } from './config.js';

export function makePlayer() {
  return {
    x: 0, z: 100, heading: 0, inCar: false,
    wanted: 0, heatLock: false, lastCrime: -100,
    cash: 500, health: 100, armor: 0,
    weapons: [true, true, false, false, false, false, false],
    weapon: 0,
    ammo: { pistol: 60, smg: 60, shotgun: 24, rifle: 90, rpg: 4 },
    districtStanding: { Downtown: 0, 'Old Town': 0, Marina: 0, Beachfront: 0, Hillside: 0 },
    rp: 0, respect: 0, respectTitle: 'NOBODY',
  };
}

export function updatePlayer(g, dt) {
  const p = g.player;
  const keys = g.keys;
  if (!p.inCar && !g.paused && !g.staged) {
    const sp = keys.shift ? 9 : 5.5;
    let mx = 0, mz = 0;
    if (keys.w) mz += 1;
    if (keys.s) mz -= 1;
    if (keys.a) mx -= 1;
    if (keys.d) mx += 1;
    if (mx || mz) {
      const len = Math.hypot(mx, mz);
      const h = p.heading;
      // Move relative to the facing direction.
      const fx = Math.sin(h), fz = Math.cos(h);
      const rx = Math.cos(h), rz = -Math.sin(h);
      p.x += (fx * (mz / len) + rx * (mx / len)) * sp * dt;
      p.z += (fz * (mz / len) + rz * (mx / len)) * sp * dt;
      p.x = Math.max(-215, Math.min(215, p.x));
      p.z = Math.max(-215, Math.min(215, p.z));
    }
  }
  // Wanted cools off slowly when no crime happened lately — unless heat-locked.
  if (!p.heatLock && p.wanted > 0 && g.time - p.lastCrime > 30) {
    p.wantedTimer = (p.wantedTimer || 0) + dt;
    if (p.wantedTimer > 30) { p.wanted -= 1; p.wantedTimer = 0; }
  } else {
    p.wantedTimer = 0;
  }
}

export function addStanding(g, district, n) {
  if (district in g.player.districtStanding) g.player.districtStanding[district] += n;
  else g.player.districtStanding[district] = n;
}

export function addRespect(g, n) {
  g.player.respect += n;
  g.player.rp += n * 4;
}

export function weaponName(g, i) {
  return WEAPONS[i] ? WEAPONS[i].name : 'Fists';
}

export function weaponAmmoText(g, i) {
  if (i < 2) return '∞';
  const owned = !!g.player.weapons[i];
  if (!owned) return 'LOCKED';
  const w = WEAPONS[i];
  const key = w.name.toLowerCase();
  return `${w.ammo}/${g.player.ammo[key] ?? 0}`;
}
