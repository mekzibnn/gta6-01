// Solmar Heat v12 — radio: a tiny lazy synth pad (SOL FM 98.4). Silent unless it works.
export function initAudio(g) {
  g.audio = { ctx: null, started: false };
  const start = () => {
    if (g.audio.started) return;
    g.audio.started = true;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      g.audio.ctx = ctx;
      const gain = ctx.createGain();
      gain.gain.value = 0.04;
      gain.connect(ctx.destination);
      const freqs = [220, 277.18, 329.63];
      const oscs = freqs.map((f) => {
        const o = ctx.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        o.connect(gain);
        o.start();
        return o;
      });
      g.audio.oscs = oscs;
      setInterval(() => {
        if (!g.audio.ctx) return;
        const roots = [220, 196, 174.61, 246.94];
        const root = roots[Math.floor(g.time / 16) % roots.length];
        oscs[0].frequency.setTargetAtTime(root, ctx.currentTime, 0.5);
        oscs[1].frequency.setTargetAtTime(root * 1.26, ctx.currentTime, 0.5);
        oscs[2].frequency.setTargetAtTime(root * 1.5, ctx.currentTime, 0.5);
      }, 4000);
    } catch { /* audio is decoration; never break the game */ }
  };
  window.addEventListener('keydown', start, { once: true });
  window.addEventListener('pointerdown', start, { once: true });
}
