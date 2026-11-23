// Keyboard — raw key state plus Q-hold timing for the weapon wheel.
export function makeInput() {
  const input = {
    keys: new Set(),
    forward: false, back: false, left: false, right: false,
    qDownAt: 0, qHeldMs: 0,
  };
  const map = (code) => {
    if (code === 'KeyW' || code === 'ArrowUp') input.forward = true;
    if (code === 'KeyS' || code === 'ArrowDown') input.back = true;
    if (code === 'KeyA' || code === 'ArrowLeft') input.left = true;
    if (code === 'KeyD' || code === 'ArrowRight') input.right = true;
  };
  const unmap = (code) => {
    if (code === 'KeyW' || code === 'ArrowUp') input.forward = false;
    if (code === 'KeyS' || code === 'ArrowDown') input.back = false;
    if (code === 'KeyA' || code === 'ArrowLeft') input.left = false;
    if (code === 'KeyD' || code === 'ArrowRight') input.right = false;
  };
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    input.keys.add(e.code);
    map(e.code);
    if (e.code === 'KeyQ' && !input.qDownAt) input.qDownAt = performance.now();
  });
  window.addEventListener('keyup', (e) => {
    input.keys.delete(e.code);
    unmap(e.code);
    if (e.code === 'KeyQ') { input.qHeldMs = performance.now() - input.qDownAt; input.qDownAt = 0; }
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.forward = input.back = input.left = input.right = false;
    input.qDownAt = 0;
  });
  input.qHeldNow = () => (input.qDownAt ? performance.now() - input.qDownAt : 0);
  return input;
}
