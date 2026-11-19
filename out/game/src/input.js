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

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const RUN = new Set(['ShiftLeft', 'ShiftRight']);
const ENTER = new Set(['KeyE']);
const PUNCH = new Set(['KeyF']);
const WEAPON = new Set(['KeyQ']);
const PAUSE = new Set(['KeyP', 'Escape']);
const CONFIRM = new Set(['Space', 'Enter']);
const HANDBRAKE = new Set(['Space']);
const MUTE = new Set(['KeyM']);

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let mouseDown = false;
  let mouseX = 0;
  let mouseY = 0;
  let muted = false;

  function press(code) {
    if (ENTER.has(code)) actions |= ACTION_ENTER;
    else if (PUNCH.has(code)) actions |= ACTION_PUNCH;
    else if (WEAPON.has(code)) actions |= ACTION_WEAPON;
    else if (PAUSE.has(code)) actions |= ACTION_PAUSE;
    else if (CONFIRM.has(code)) actions |= ACTION_CONFIRM;
    else if (MUTE.has(code)) muted = !muted;
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    keys.add(event.code);
    press(event.code);
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || CONFIRM.has(event.code)) {
      event.preventDefault();
    }
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

  const held = (set) => {
    for (const code of set) if (keys.has(code)) return true;
    return false;
  };

  return {
    /** Driving / walking axes: -1..1 each. */
    axes() {
      const x = (held(RIGHT) ? 1 : 0) - (held(LEFT) ? 1 : 0);
      const y = (held(DOWN) ? 1 : 0) - (held(UP) ? 1 : 0);
      return { x, y };
    },
    running() { return held(RUN); },
    handbrake() { return held(HANDBRAKE) || (actions & ACTION_HANDBRAKE) !== 0; },
    firing() { return mouseDown; },
    mouse() { return { x: mouseX, y: mouseY, down: mouseDown }; },
    isMuted() { return muted; },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
