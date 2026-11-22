// Solmar Heat v9 — keyboard and mouse.
// Tracks which keys are held and which were just pressed. readKeys()
// returns the driving state plus the edge-triggered presses since the
// last call, then clears them — so a tap is seen exactly once.

const SCROLL_KEYS = ['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

export function initInput(canvas) {
  const input = {
    keys: {},
    pressed: {},
    mouse: { x: 0, y: 0, down: false },
  };
  const down = (e) => {
    if (SCROLL_KEYS.includes(e.code)) e.preventDefault();
    if (!input.keys[e.code]) input.pressed[e.code] = true;
    input.keys[e.code] = true;
  };
  const up = (e) => {
    input.keys[e.code] = false;
  };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => {
    input.keys = {};
  });
  if (canvas) {
    canvas.addEventListener('pointermove', (e) => {
      const rect = canvas.getBoundingClientRect();
      input.mouse.x = e.clientX - rect.left;
      input.mouse.y = e.clientY - rect.top;
    });
    canvas.addEventListener('pointerdown', () => {
      input.mouse.down = true;
    });
    canvas.addEventListener('pointerup', () => {
      input.mouse.down = false;
    });
  }
  return input;
}

export function readKeys(input) {
  const k = input.keys;
  const justPressed = input.pressed;
  input.pressed = {};
  return {
    up: !!(k.KeyW || k.ArrowUp),
    down: !!(k.KeyS || k.ArrowDown),
    left: !!(k.KeyA || k.ArrowLeft),
    right: !!(k.KeyD || k.ArrowRight),
    run: !!(k.ShiftLeft || k.ShiftRight),
    nitro: !!k.Space,
    heldQ: !!k.KeyQ,
    heldTab: !!k.Tab,
    justPressed,
  };
}
