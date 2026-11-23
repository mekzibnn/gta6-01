// Audio — tiny WebAudio bleeps, fully guarded so a headless run or a
// missing AudioContext can never throw.
let ctx = null;
function audio() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    return ctx;
  } catch { return null; }
}
function tone(freq, dur, type, gain) {
  try {
    const ac = audio();
    if (!ac || ac.state === 'suspended') return;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type || 'square';
    o.frequency.value = freq;
    g.gain.value = gain || 0.04;
    o.connect(g); g.connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + dur);
  } catch { /* silent */ }
}
export const sfx = {
  click() { tone(660, 0.06, 'square', 0.03); },
  buy() { tone(880, 0.08, 'sine', 0.05); tone(1320, 0.1, 'sine', 0.04); },
  boom() { tone(70, 0.5, 'sawtooth', 0.09); },
  siren() { tone(740, 0.18, 'sine', 0.02); tone(520, 0.18, 'sine', 0.02); },
  honk() { tone(370, 0.12, 'square', 0.03); },
};
