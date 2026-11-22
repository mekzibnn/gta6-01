// Keyboard input for Solmar Heat.
// Held keys live in a Set the game loop polls (W to drive, Space for
// nitro, Q held for the weapon wheel). Discrete actions fire from the
// keydown event itself, so a quick tap can never fall between frames:
// E interacts, digits buy or pick a weapon, X abandons a race, P pauses
// and saves, F steps out of a car.

export function bindInput(game, actions) {
  const onDown = (e) => {
    if (e.code === 'Space') e.preventDefault();
    if (e.repeat) return;
    game.keys.add(e.code);
    actions.onKeyDown(e.code);
  };
  const onUp = (e) => {
    game.keys.delete(e.code);
    actions.onKeyUp(e.code);
  };
  const onBlur = () => {
    game.keys.clear();
    actions.onKeyUp('KeyQ');
  };
  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', onBlur);
  return () => {
    window.removeEventListener('keydown', onDown);
    window.removeEventListener('keyup', onUp);
    window.removeEventListener('blur', onBlur);
  };
}
