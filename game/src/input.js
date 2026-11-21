// Keyboard and mouse input. Held keys steer and drive; one-shot presses (enter
// a car, punch, pause, confirm) are queued as bit flags and taken once by the
// loop, so a press between two frames is never lost and never counted twice.
// The mouse aims on foot: its world position is computed by the renderer and
// read back through aimWorld.
export const ACTION_ENTER = 1;
export const ACTION_PUNCH = 2;
export const ACTION_PAUSE = 4;
export const ACTION_CONFIRM = 8;
export const ACTION_WEAPON = 16;
export const ACTION_HANDBRAKE = 32;
export const ACTION_RADIO = 64;
export const ACTION_CAMERA = 128;

// One-shot presses: each physical key maps to at most one action flag.
// (Space is CONFIRM here; it doubles as the handbrake while held — see the
// HELD table below. The two roles never clash because press() only queues.)
const PRESS_ACTIONS = [
  [['KeyE'], ACTION_ENTER],
  [['KeyF'], ACTION_PUNCH],
  [['KeyQ'], ACTION_WEAPON],
  [['KeyP', 'Escape'], ACTION_PAUSE],
  [['Space', 'Enter'], ACTION_CONFIRM],
  [['KeyR'], ACTION_RADIO],
  [['KeyC'], ACTION_CAMERA],
  [['KeyM'], 'mute'],
];

// Held keys: steering, driving, running, handbrake.
const HELD_KEYS = {
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  run: ['ShiftLeft', 'ShiftRight'],
  handbrake: ['Space'],
};
const SLOT_KEYS = ['Digit1', 'Digit2', 'Digit3', 'Digit4'];
// Keys the page must not scroll or activate on (arrows, Space, Enter).
const SWALLOW = new Set([...HELD_KEYS.up, ...HELD_KEYS.down, ...HELD_KEYS.left, ...HELD_KEYS.right, 'Space', 'Enter']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let slot = -1;
  let mouseDown = false;
  let mouseX = 0;
  let mouseY = 0;
  let muted = false;

  function press(code) {
    for (const [codes, action] of PRESS_ACTIONS) {
      if (!codes.includes(code)) continue;
      if (action === 'mute') muted = !muted;
      else actions |= action;
      return;
    }
    const slotIndex = SLOT_KEYS.indexOf(code);
    if (slotIndex >= 0) slot = slotIndex;
  }

  const heldOne = (name) => HELD_KEYS[name].some((code) => keys.has(code));

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    press(event.code);
    if (SWALLOW.has(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => keys.clear());
  canvas.addEventListener('pointermove', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
    mouseDown = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => { mouseDown = false; });

  return {
    /** Driving / walking axes: -1..1 each. */
    axes() {
      const x = (heldOne('right') ? 1 : 0) - (heldOne('left') ? 1 : 0);
      const y = (heldOne('down') ? 1 : 0) - (heldOne('up') ? 1 : 0);
      return { x, y };
    },
    running() { return heldOne('run'); },
    handbrake() { return heldOne('handbrake') || (actions & ACTION_HANDBRAKE) !== 0; },
    firing() { return mouseDown; },
    mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    isMuted() { return muted; },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** Consume and return the last weapon/garage slot key (0-3), or -1. */
    takeSlot() {
      const out = slot;
      slot = -1;
      return out;
    },
  };
}
