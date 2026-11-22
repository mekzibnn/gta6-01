// Sound for Solmar Heat, as a tiny WebAudio synth.
// Everything is guarded: in a headless browser, or with no audio device,
// every call is a silent no-op and the game plays on.

let ctx = null;

function audio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, seconds, type = 'sine', gain = 0.08) {
  const ac = audio();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const g = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, ac.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + seconds);
    osc.connect(g);
    g.connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + seconds);
  } catch {
    // Silence is fine.
  }
}

export const sfx = {
  click() {
    tone(660, 0.08, 'square', 0.05);
  },
  buy() {
    tone(880, 0.12, 'sine', 0.09);
    setTimeout(() => tone(1320, 0.15, 'sine', 0.09), 90);
  },
  mission() {
    tone(523, 0.15, 'triangle', 0.1);
    setTimeout(() => tone(784, 0.2, 'triangle', 0.1), 120);
  },
  boom() {
    tone(70, 0.5, 'sawtooth', 0.16);
  },
  siren() {
    tone(740, 0.4, 'sine', 0.04);
    setTimeout(() => tone(560, 0.4, 'sine', 0.04), 400);
  },
};
