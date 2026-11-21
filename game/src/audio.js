// All sound is synthesized with WebAudio (v6 rewrite).
// No audio files, nothing fetched: every beep, siren, engine hum and radio
// jingle is an oscillator shaped in code. The audio engine starts on the
// first user gesture (browsers demand it) and stays quiet until then.

export function initAudio() {
  return {
    ctx: null,
    master: null,
    started: false,
    muted: false,
    radio: { station: 'SOL FM', playing: false, note: 0 },
    engineOsc: null,
    engineGain: null,
  };
}

export function startAudio(audio) {
  if (audio.started) return audio;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    audio.ctx = new Ctx();
    audio.master = audio.ctx.createGain();
    audio.master.gain.value = 0.5;
    audio.master.connect(audio.ctx.destination);
    audio.started = true;
  } catch (err) {
    audio.started = false;
  }
  return audio;
}

function tone(audio, freq, dur, type, vol, slideTo) {
  if (!audio.started || audio.muted || !audio.ctx) return;
  try {
    const osc = audio.ctx.createOscillator();
    const gain = audio.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, audio.ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, audio.ctx.currentTime + dur);
    gain.gain.setValueAtTime(vol || 0.2, audio.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start();
    osc.stop(audio.ctx.currentTime + dur);
  } catch (err) {
    // Sound is garnish; a failed beep never breaks the game.
  }
}

export function blip(audio, freq) {
  tone(audio, freq || 660, 0.08, 'square', 0.12);
}

export function dealSound(audio) {
  // The cha-ching of a purchase: two rising notes.
  tone(audio, 880, 0.09, 'triangle', 0.25);
  setTimeout(() => tone(audio, 1318, 0.14, 'triangle', 0.25), 90);
}

export function cashSound(audio) {
  tone(audio, 1046, 0.07, 'sine', 0.2);
  setTimeout(() => tone(audio, 1568, 0.1, 'sine', 0.2), 70);
}

export function punchSound(audio) {
  tone(audio, 160, 0.12, 'sawtooth', 0.3, 60);
}

export function shotSound(audio) {
  tone(audio, 900, 0.1, 'square', 0.3, 120);
}

export function sirenSound(audio) {
  // A two-tone wail, one cycle.
  tone(audio, 700, 0.35, 'sine', 0.12, 950);
  setTimeout(() => tone(audio, 950, 0.35, 'sine', 0.12, 700), 350);
}

export function bustSound(audio) {
  tone(audio, 220, 0.4, 'sawtooth', 0.25, 110);
}

export function missionSound(audio) {
  // Mission complete: a little fanfare.
  tone(audio, 523, 0.12, 'triangle', 0.25);
  setTimeout(() => tone(audio, 659, 0.12, 'triangle', 0.25), 120);
  setTimeout(() => tone(audio, 784, 0.2, 'triangle', 0.25), 240);
}

export function radioTick(audio) {
  // SOL FM: a lazy bassline note every beat while the radio plays.
  if (!audio.radio.playing) return;
  const scale = [110, 130.8, 164.8, 196, 220];
  const note = scale[audio.radio.note % scale.length];
  audio.radio.note += 1;
  tone(audio, note, 0.5, 'triangle', 0.08);
}

export function setRadio(audio, on) {
  audio.radio.playing = !!on;
  return audio;
}

export function setMuted(audio, muted) {
  audio.muted = !!muted;
  if (audio.master) audio.master.gain.value = muted ? 0 : 0.5;
  return audio;
}
