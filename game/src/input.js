// Keyboard and mouse, read once a frame. WASD or arrows walk, E or Space uses
// the station in front of the chef, P pauses, M mutes, Enter confirms on the
// title and results screens. A mouse click on a station uses it when the chef is
// close enough, and otherwise sets a walk target the chef follows.
export const ACTION_CONFIRM = 1;
export const ACTION_USE = 2;
export const ACTION_PAUSE = 4;
export const ACTION_MUTE = 8;

export function createInput(canvas) {
  const keys = new Set();
  let actions = 0;
  let click = null;
  let clickUsed = false;

  function keyDown(event) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) event.preventDefault();
    if (event.repeat) return;
    keys.add(event.key.toLowerCase());
    if (event.key === 'Enter') actions |= ACTION_CONFIRM;
    if (event.key === ' ' || event.key.toLowerCase() === 'e') actions |= ACTION_USE;
    if (event.key.toLowerCase() === 'p' || event.key === 'Escape') actions |= ACTION_PAUSE;
    if (event.key.toLowerCase() === 'm') actions |= ACTION_MUTE;
  }

  function keyUp(event) {
    keys.delete(event.key.toLowerCase());
  }

  function mouseDown(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    click = { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
    clickUsed = false;
  }

  function blur() {
    keys.clear();
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', blur);
  canvas.addEventListener('mousedown', mouseDown);

  return {
    // A unit step in the direction the held keys ask for, or zero when none.
    direction() {
      let x = 0;
      let y = 0;
      if (keys.has('a') || keys.has('arrowleft')) x -= 1;
      if (keys.has('d') || keys.has('arrowright')) x += 1;
      if (keys.has('w') || keys.has('arrowup')) y -= 1;
      if (keys.has('s') || keys.has('arrowdown')) y += 1;
      if (x !== 0 && y !== 0) {
        const inv = 1 / Math.sqrt(2);
        x *= inv;
        y *= inv;
      }
      return { x, y };
    },
    hasKeys() {
      return keys.size > 0;
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    // The latest click the game has not looked at yet, or null.
    takeClick() {
      if (click === null || clickUsed) return null;
      clickUsed = true;
      return click;
    },
    // The click is still the walk target when nothing has consumed it.
    clickTarget() {
      return click;
    },
    clearClick() {
      click = null;
    },
  };
}
