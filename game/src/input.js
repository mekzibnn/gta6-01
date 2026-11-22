// Keyboard input. One shared key state the driving, the menus, the
// wheel and the pause all read. Q is special: the weapon wheel only
// opens after the key has been held for 200 ms, and the release is what
// confirms the pick.

// The live key state, read by the game loop. All false at rest.
export function makeKeys() {
  return {
    w: false, a: false, s: false, d: false,
    space: false, q: false,
    qDownAt: 0,
  };
}

// Attach the listeners. `g` carries the keys, the wheel and the hooks
// the loop calls back into (onInteract, onDigit, onPause, onAbandon).
export function attachInput(g) {
  const keys = g.keys;
  const codeOf = (e) => e.code;

  window.addEventListener('keydown', (e) => {
    const c = codeOf(e);
    if (c === 'KeyW' || c === 'ArrowUp') keys.w = true;
    if (c === 'KeyA' || c === 'ArrowLeft') keys.a = true;
    if (c === 'KeyS' || c === 'ArrowDown') keys.s = true;
    if (c === 'KeyD' || c === 'ArrowRight') keys.d = true;
    if (c === 'Space') {
      if (!keys.space) g.onSpaceDown && g.onSpaceDown();
      keys.space = true;
      e.preventDefault();
    }
    if (c === 'KeyQ') {
      if (!keys.q) keys.qDownAt = performance.now();
      keys.q = true;
    }
    if (c === 'KeyE' && !e.repeat) g.onInteract && g.onInteract();
    if (c === 'KeyP' && !e.repeat) g.onPause && g.onPause();
    if (c === 'KeyX' && !e.repeat) g.onAbandon && g.onAbandon();
    if (c === 'Escape' && g.shopOpen) g.shopOpen = null;
    if (c.startsWith('Digit')) {
      const n = parseInt(c.slice(5), 10);
      if (n >= 1 && n <= 4) g.onDigit && g.onDigit(n);
    }
  });

  window.addEventListener('keyup', (e) => {
    const c = codeOf(e);
    if (c === 'KeyW' || c === 'ArrowUp') keys.w = false;
    if (c === 'KeyA' || c === 'ArrowLeft') keys.a = false;
    if (c === 'KeyS' || c === 'ArrowDown') keys.s = false;
    if (c === 'KeyD' || c === 'ArrowRight') keys.d = false;
    if (c === 'Space') keys.space = false;
    if (c === 'KeyQ') {
      keys.q = false;
      g.onQRelease && g.onQRelease();
    }
  });

  window.addEventListener('blur', () => {
    keys.w = keys.a = keys.s = keys.d = keys.space = keys.q = false;
  });
}

// How long Q has been held, in milliseconds. The wheel opens past 200.
export function qHoldMs(g) {
  if (!g.keys.q) return 0;
  return performance.now() - g.keys.qDownAt;
}
