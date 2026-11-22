// Sound, synthesized. No audio files: a tiny WebAudio rig makes the
// engine hum, the siren wail, the cash register and the radio's soft
// pad. Everything is guarded — headless Chrome and a missing gesture
// must never throw, and the game plays fine with the sound off.

let ctx = null;
let master = null;
let engineOsc = null;
let engineGain = null;
let radioTimer = 0;

function ensure() {
  if (ctx) return true;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.16;
    master.connect(ctx.destination);
    return true;
  } catch {
    return false;
  }
}

// Call on the first user gesture. The game also calls it on E.
export function unlockAudio() {
  if (!ensure()) return;
  try {
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { /* sound stays off */ }
}

function blip(freq, dur, type, vol) {
  if (!ensure() || !ctx || ctx.state !== 'running') return;
  try {
    const o = ctx.createOscillator();
    const gn = ctx.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    gn.gain.setValueAtTime(vol || 0.5, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(gn);
    gn.connect(master);
    o.start();
    o.stop(ctx.currentTime + dur);
  } catch { /* ignore */ }
}

export function sfxCash() {
  blip(880, 0.12, 'sine', 0.6);
  setTimeout(() => blip(1318, 0.18, 'sine', 0.5), 90);
}

export function sfxBoom() {
  if (!ensure() || !ctx || ctx.state !== 'running') return;
  try {
    const o = ctx.createOscillator();
    const gn = ctx.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(160, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.5);
    gn.gain.setValueAtTime(0.9, ctx.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.connect(gn);
    gn.connect(master);
    o.start();
    o.stop(ctx.currentTime + 0.6);
  } catch { /* ignore */ }
}

export function sfxClick() {
  blip(660, 0.06, 'square', 0.3);
}

// The engine hum follows the player's car speed. Called every frame;
// silent when on foot or when there is no audio context.
export function updateEngineSound(g) {
  if (!ensure() || !ctx || ctx.state !== 'running') return;
  try {
    if (!g.car) {
      if (engineOsc) {
        engineOsc.stop();
        engineOsc = null;
        engineGain = null;
      }
      return;
    }
    if (!engineOsc) {
      engineOsc = ctx.createOscillator();
      engineGain = ctx.createGain();
      engineOsc.type = 'sawtooth';
      engineGain.gain.value = 0.05;
      engineOsc.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    }
    const def = g.car;
    engineOsc.frequency.value = 55 + Math.abs(def.speed) * 4;
    engineGain.gain.value = 0.03 + Math.min(0.08, Math.abs(def.speed) * 0.002);
  } catch { /* ignore */ }
}

// The radio: a soft two-note pad every few bars, "SOL FM 98.4".
export function updateRadio(g, dt) {
  radioTimer -= dt;
  if (radioTimer > 0) return;
  radioTimer = 3.2;
  if (!g.car) return;
  blip(392, 1.4, 'sine', 0.10);
  blip(523, 1.4, 'sine', 0.07);
}
