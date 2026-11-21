// Keyboard and mouse input (v6 rewrite).
// Held keys steer and drive; one-shot presses (enter a car, open a shop,
// buy an item) fire once per press. The loop reads the state through
// readKeys every frame, so a key held across frames keeps working and a
// key tapped once never double-fires.

export function initInput() {
  const input = {
    held: new Set(),
    pressed: new Set(),
    choice: -1,
    mouse: { x: 0, y: 0, down: false },
  };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    input.held.add(e.key.toLowerCase());
    input.pressed.add(e.key.toLowerCase());
    const num = Number(e.key);
    if (num >= 1 && num <= 9) input.choice = num - 1;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
      e.preventDefault();
    }
  });
  window.addEventListener('keyup', (e) => {
    input.held.delete(e.key.toLowerCase());
  });
  window.addEventListener('blur', () => {
    input.held.clear();
    input.pressed.clear();
  });
  window.addEventListener('mousemove', (e) => {
    input.mouse.x = e.clientX;
    input.mouse.y = e.clientY;
  });
  window.addEventListener('mousedown', () => { input.mouse.down = true; });
  window.addEventListener('mouseup', () => { input.mouse.down = false; });
  return input;
}

export function readKeys(input) {
  const held = input.held;
  const pressed = input.pressed;
  const out = {
    up: held.has('w') || held.has('arrowup'),
    down: held.has('s') || held.has('arrowdown'),
    left: held.has('a') || held.has('arrowleft'),
    right: held.has('d') || held.has('arrowright'),
    run: held.has('shift'),
    nitro: held.has(' '),
    punch: pressed.has('f'),
    shoot: pressed.has('g') || input.mouse.down,
    enter: pressed.has('e'),
    exit: pressed.has('q'),
    interact: pressed.has('e'),
    escape: pressed.has('escape'),
    abandon: pressed.has('x'),
    radio: pressed.has('r'),
    choice: input.choice,
    any: held.size > 0 || pressed.size > 0,
  };
  pressed.clear();
  input.choice = -1;
  return out;
}

export function isDown(input, key) {
  return input.held.has(key.toLowerCase());
}

export function wasPressed(input, key) {
  return input.pressed.has(key.toLowerCase());
}
