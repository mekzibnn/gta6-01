// All sound is synthesized with WebAudio: no audio files, nothing fetched.
// A tiny engine hum, a two-tone police siren, gunshots, pickups, a mission
// jingle and a laid-back coastal music loop built from detuned oscillators.
// Created lazily on the first user gesture, so browsers allow it.
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicNodes = null;
  let sirenNodes = null;
  let engineNodes = null;
  let enabled = true;
  let musicTimer = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || !enabled) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, lowpass) {
    if (!ensure() || !enabled) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass || 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.3, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
  }

  // A simple coastal groove: Am – F – C – G pads with a soft bass pulse.
  // step() is called once a frame with the frame time; it schedules ahead.
  const CHORDS = [
    [220.0, 261.6, 329.6],
    [174.6, 220.0, 261.6],
    [196.0, 246.9, 293.7],
    [164.8, 196.0, 246.9],
  ];
  function startMusic() {
    if (!ensure() || !enabled || musicNodes) return;
    const padGain = ctx.createGain();
    padGain.gain.value = 0.05;
    padGain.connect(master);
    const bassGain = ctx.createGain();
    bassGain.gain.value = 0.09;
    bassGain.connect(master);
    musicNodes = { padGain, bassGain, chord: 0, next: ctx.currentTime + 0.1 };
  }

  function stopMusic() {
    if (!musicNodes) return;
    try { musicNodes.padGain.disconnect(); musicNodes.bassGain.disconnect(); } catch { /* already gone */ }
    musicNodes = null;
  }

  function startSiren() {
    if (!ensure() || !enabled || sirenNodes) return;
    const osc = ctx.createOscillator();
    osc.type = 'square';
    osc.frequency.value = 720;
    const gain = ctx.createGain();
    gain.gain.value = 0.045;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 1.6;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);
    osc.connect(gain);
    gain.connect(master);
    osc.start();
    lfo.start();
    sirenNodes = { osc, lfo, gain };
  }

  function stopSiren() {
    if (!sirenNodes) return;
    try { sirenNodes.osc.stop(); sirenNodes.lfo.stop(); } catch { /* already gone */ }
    sirenNodes = null;
  }

  function startEngine() {
    if (!ensure() || !enabled || engineNodes) return;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    const gain = ctx.createGain();
    gain.gain.value = 0.0;
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    osc.start();
    engineNodes = { osc, gain };
  }

  return {
    unlock() { ensure(); },
    setEnabled(value) {
      enabled = value;
      if (!enabled) { stopMusic(); stopSiren(); if (engineNodes) engineNodes.gain.gain.value = 0; }
    },
    isEnabled() { return enabled; },
    /** Call every frame: schedules music chords and updates the engine hum. */
    step(now, driving, speedRatio) {
      if (!ensure() || !enabled) return;
      if (!musicNodes) startMusic();
      if (!driving && musicTimer > now) return;
      musicTimer = now + 0.05;
      if (musicNodes && ctx.currentTime >= musicNodes.next - 0.05) {
        const chord = CHORDS[musicNodes.chord % CHORDS.length];
        musicNodes.chord += 1;
        musicNodes.next = ctx.currentTime + 2.0;
        for (const freq of chord) {
          const osc = ctx.createOscillator();
          osc.type = 'triangle';
          osc.frequency.value = freq;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, ctx.currentTime);
          g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + 0.4);
          g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 2.0);
          osc.connect(g);
          g.connect(musicNodes.padGain);
          osc.start();
          osc.stop(ctx.currentTime + 2.05);
        }
        const bass = ctx.createOscillator();
        bass.type = 'sine';
        bass.frequency.value = chord[0] / 2;
        const bg = ctx.createGain();
        bg.gain.setValueAtTime(0.0001, ctx.currentTime);
        bg.gain.exponentialRampToValueAtTime(0.9, ctx.currentTime + 0.1);
        bg.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.9);
        bass.connect(bg);
        bg.connect(musicNodes.bassGain);
        bass.start();
        bass.stop(ctx.currentTime + 2.0);
      }
      if (driving) {
        if (!engineNodes) startEngine();
        if (engineNodes) {
          engineNodes.osc.frequency.value = 55 + speedRatio * 90;
          engineNodes.gain.gain.value = 0.05 + speedRatio * 0.05;
        }
      } else if (engineNodes) {
        engineNodes.gain.gain.value = 0;
      }
    },
    setSiren(on) { if (on) startSiren(); else stopSiren(); },
    blip() { tone(880, 0.12, 'sine', 0.18, 1320); },
    coin() { tone(660, 0.1, 'square', 0.12); setTimeout(() => tone(990, 0.14, 'square', 0.12), 70); },
    punch() { noise(0.08, 0.25, 900); },
    shoot() { noise(0.14, 0.4, 2400); tone(180, 0.1, 'square', 0.15, 60); },
    crash() { noise(0.3, 0.5, 500); tone(90, 0.25, 'sine', 0.3, 40); },
    door() { tone(320, 0.08, 'square', 0.1, 200); },
    wantedUp() { tone(440, 0.15, 'square', 0.14); setTimeout(() => tone(440, 0.15, 'square', 0.14), 160); },
    missionDone() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.2), i * 110));
    },
    busted() { [392, 330, 262].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'sawtooth', 0.16), i * 180)); },
  };
}
