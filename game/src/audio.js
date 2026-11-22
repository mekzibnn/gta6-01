// Solmar Heat v9 — synthesized sound.
// No audio files: every sound is a WebAudio oscillator or a burst of
// filtered noise, built on the first user gesture. Everything is guarded
// — if the browser has no audio, the game plays silent and never throws.

export function initAudio() {
  return {
    ctx: null,
    radio: false,
    station: 0,
    siren: null,
    started: false,
  };
}

function ctxOf(audio) {
  if (!audio.ctx) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      audio.ctx = new AC();
    } catch {
      return null;
    }
  }
  if (audio.ctx && audio.ctx.state === 'suspended') {
    audio.ctx.resume().catch(() => {});
  }
  return audio.ctx;
}

function tone(audio, freq, dur, type, gain, slideTo) {
  const ctx = ctxOf(audio);
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    amp.gain.setValueAtTime(gain || 0.12, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  } catch { /* silent */ }
}

function noise(audio, dur, gain, low) {
  const ctx = ctxOf(audio);
  if (!ctx) return;
  try {
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = low || 900;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain || 0.2, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(ctx.destination);
    src.start();
  } catch { /* silent */ }
}

export function startAudio(audio) {
  if (audio.started) return;
  audio.started = true;
  ctxOf(audio);
}

export function dealSound(audio) {
  tone(audio, 520, 0.12, 'square', 0.1);
  setTimeout(() => tone(audio, 780, 0.15, 'square', 0.1), 90);
}

export function cashSound(audio) {
  tone(audio, 880, 0.08, 'sine', 0.12);
  setTimeout(() => tone(audio, 1320, 0.12, 'sine', 0.12), 70);
}

export function punchSound(audio) {
  noise(audio, 0.12, 0.25, 500);
}

export function shotSound(audio) {
  noise(audio, 0.18, 0.3, 1400);
  tone(audio, 180, 0.12, 'square', 0.12, 60);
}

export function sirenSound(audio, on) {
  const ctx = ctxOf(audio);
  if (!ctx) return;
  try {
    if (on && !audio.siren) {
      const osc = ctx.createOscillator();
      const amp = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 700;
      amp.gain.value = 0.03;
      osc.connect(amp);
      amp.connect(ctx.destination);
      osc.start();
      audio.siren = { osc, amp, t: 0 };
    } else if (!on && audio.siren) {
      audio.siren.osc.stop();
      audio.siren = null;
    }
  } catch { /* silent */ }
}

export function sirenTick(audio, dt) {
  if (!audio.siren) return;
  audio.siren.t = audio.siren.t + dt;
  try {
    audio.siren.osc.frequency.value = 650 + Math.sin(audio.siren.t * 4) * 250;
  } catch { /* silent */ }
}

export function bustSound(audio) {
  tone(audio, 220, 0.4, 'sawtooth', 0.14, 110);
}

export function missionSound(audio) {
  tone(audio, 523, 0.15, 'triangle', 0.14);
  setTimeout(() => tone(audio, 659, 0.15, 'triangle', 0.14), 120);
  setTimeout(() => tone(audio, 784, 0.25, 'triangle', 0.14), 240);
}

export function radioTick(audio, dt) {
  if (!audio.radio) return;
  audio.station = audio.station + dt;
  if (audio.station > 0.5) {
    audio.station = 0;
    tone(audio, 440 + Math.random() * 220, 0.2, 'triangle', 0.03);
  }
}

export function setRadio(audio, on) {
  audio.radio = on;
  if (on) startAudio(audio);
}

// A car bomb is a noise burst with a low sine dropping away.
export function boomSound(audio) {
  noise(audio, 0.9, 0.5, 400);
  tone(audio, 120, 0.9, 'sine', 0.3, 30);
}

export function wheelSound(audio) {
  tone(audio, 660, 0.06, 'square', 0.08);
}
