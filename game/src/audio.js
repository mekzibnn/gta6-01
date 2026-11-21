// All sound is synthesized with WebAudio: no audio files, nothing fetched.
// A tiny engine hum, a two-tone police siren, gunshots, pickups, a mission
// jingle and a laid-back coastal music loop built from detuned oscillators.
// Created lazily on the first user gesture, so browsers allow it.

// Radio: three stations, each with its own chords, tempo and bass.
// SOL FM is bright pop, PALM 87 is slow coastal chill, HEAT 102 is a
// driving bass riff for night chases. step() schedules a chord ahead.
const STATIONS = [
  { name: 'SOL FM', step: 1.4, bass: 0.09, lead: true, chords: [
    [220.0, 261.6, 329.6], [174.6, 220.0, 261.6], [196.0, 246.9, 293.7], [164.8, 196.0, 246.9],
  ] },
  { name: 'PALM 87', step: 3.0, bass: 0.06, lead: false, chords: [
    [261.6, 329.6, 392.0], [220.0, 261.6, 329.6], [174.6, 220.0, 261.6], [196.0, 246.9, 329.6],
  ] },
  { name: 'HEAT 102', step: 1.0, bass: 0.14, lead: true, chords: [
    [110.0, 130.8, 164.8], [98.0, 116.5, 146.8], [110.0, 130.8, 164.8], [123.5, 146.8, 185.0],
  ] },
];

export function createAudio() {
  let ctx = null;
  let master = null;
  let musicNodes = null;
  let sirenNodes = null;
  let engineNodes = null;
  let enabled = true;
  let musicTimer = 0;
  let station = 0;

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

  /** One oscillator note, sliding down in pitch and fading out. */
  function playTone(freq, dur, type, vol, slideTo) {
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

  /** A burst of filtered noise, fading out. */
  function playNoise(dur, vol, lowpass) {
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

  /** Schedule one note into a gain node (pad, lead or bass). */
  function scheduleNote(freq, at, dur, peak, attack, dest, type) {
    const osc = ctx.createOscillator();
    osc.type = type || 'triangle';
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at);
    g.gain.exponentialRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    osc.connect(g);
    g.connect(dest);
    osc.start();
    osc.stop(at + dur + 0.05);
    return osc;
  }

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

  /** Schedule the next chord of the current station, if it is due. */
  function scheduleChord() {
    const st = STATIONS[station];
    if (!musicNodes || ctx.currentTime < musicNodes.next - 0.05) return;
    const chord = st.chords[musicNodes.chord % st.chords.length];
    musicNodes.chord += 1;
    musicNodes.next = ctx.currentTime + st.step;
    musicNodes.bassGain.gain.value = st.bass;
    const now = ctx.currentTime;
    for (const freq of chord) {
      scheduleNote(freq, now, st.step, 0.5, 0.4, musicNodes.padGain, 'triangle');
    }
    // Lead arpeggio on the bright stations: the top note, doubled.
    if (st.lead) {
      scheduleNote(chord[2] * 2, now, st.step * 0.8, 0.25, 0.1, musicNodes.padGain, 'sine');
    }
    scheduleNote(chord[0] / 2, now, st.step * 0.95, 0.9, 0.1, musicNodes.bassGain, 'sine');
  }

  /** Engine hum follows the speed; silent on foot. */
  function updateEngine(driving, speedRatio) {
    if (driving) {
      if (!engineNodes) startEngine();
      if (engineNodes) {
        engineNodes.osc.frequency.value = 55 + speedRatio * 90;
        engineNodes.gain.gain.value = 0.05 + speedRatio * 0.05;
      }
    } else if (engineNodes) {
      engineNodes.gain.gain.value = 0;
    }
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
      scheduleChord();
      updateEngine(driving, speedRatio);
    },
    setSiren(on) { if (on) startSiren(); else stopSiren(); },
    /** Switch radio station (0 SOL FM, 1 PALM 87, 2 HEAT 102). */
    setStation(index) {
      station = index % STATIONS.length;
      if (musicNodes) {
        musicNodes.chord = 0;
        musicNodes.next = ctx ? ctx.currentTime + 0.1 : 0;
      }
    },
    stationName() { return STATIONS[station].name; },
    blip() { playTone(880, 0.12, 'sine', 0.18, 1320); },
    coin() { playTone(660, 0.1, 'square', 0.12); setTimeout(() => playTone(990, 0.14, 'square', 0.12), 70); },
    punch() { playNoise(0.08, 0.25, 900); },
    shoot() { playNoise(0.14, 0.4, 2400); playTone(180, 0.1, 'square', 0.15, 60); },
    crash() { playNoise(0.3, 0.5, 500); playTone(90, 0.25, 'sine', 0.3, 40); },
    door() { playTone(320, 0.08, 'square', 0.1, 200); },
    wantedUp() { playTone(440, 0.15, 'square', 0.14); setTimeout(() => playTone(440, 0.15, 'square', 0.14), 160); },
    missionDone() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => playTone(f, 0.22, 'triangle', 0.2), i * 110));
    },
    busted() { [392, 330, 262].forEach((f, i) => setTimeout(() => playTone(f, 0.3, 'sawtooth', 0.16), i * 180)); },
  };
}
