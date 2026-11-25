// Sizzle & Serve — the kitchen itself. The world owns the chef, the stations,
// the orders, the plates and the score, and advances them in fixed steps. It
// knows nothing about drawing or sound: it returns events and the loop answers.
import {
  CANVAS_WIDTH, CANVAS_HEIGHT, HUD_HEIGHT, STEP, SHIFT_LENGTH, MAX_STRIKES,
  MAX_ORDERS, PLAYER, STATIONS, INTERACT_RANGE, INGREDIENTS, RECIPES, RECIPE_POOL,
} from './config.js';

export const EVENT_SERVE = 1;
export const EVENT_MISS = 2;
export const EVENT_OVER = 4;
export const EVENT_CHOP_DONE = 8;
export const EVENT_GRILL_DONE = 16;
export const EVENT_BURN = 32;

// The two things a chef can hold: a single ingredient, or a plate of them.
export function makeIngredient(kind, state) {
  return { type: 'ingredient', kind, state };
}

export function makePlate() {
  return { type: 'plate', items: [] };
}

export function isPlate(thing) {
  return thing !== null && thing.type === 'plate';
}

// A plate is ready when its items match a recipe exactly, in any order.
export function plateMatches(plate, recipe) {
  if (!isPlate(plate) || plate.items.length !== recipe.items.length) return false;
  const wanted = recipe.items.map((item) => `${item.kind}:${item.state}`).sort();
  const held = plate.items.map((item) => `${item.kind}:${item.state}`).sort();
  for (let i = 0; i < wanted.length; i += 1) {
    if (wanted[i] !== held[i]) return false;
  }
  return true;
}

// Only a finished ingredient belongs on a plate: chopped, cooked or ready.
function plateable(item) {
  return item !== null && item.type === 'ingredient'
    && (item.state === 'chopped' || item.state === 'cooked' || item.state === 'ready');
}

function stationList() {
  return Object.values(STATIONS);
}

function solidRects() {
  return stationList().map((station) => ({ x: station.x, y: station.y, w: station.w, h: station.h }));
}

export function createWorld(random) {
  const state = {
    time: 0,
    day: 1,
    score: 0,
    combo: 0,
    bestCombo: 0,
    strikes: 0,
    served: 0,
    missed: 0,
    orders: [],
    nextOrderIn: 2,
    orderSeq: 0,
    player: { x: PLAYER.startX, y: PLAYER.startY, dir: 1, carrying: null },
    moveTarget: null,
    board: null,
    grill: null,
    counter: null,
    prep: null,
    floats: [],
    over: false,
    grade: '',
  };

  function orderInterval() {
    return Math.max(10, 16 - (state.day - 1));
  }

  function spawnOrder() {
    const key = random.pick(RECIPE_POOL);
    const recipe = RECIPES[key];
    const time = Math.max(45, recipe.time - (state.day - 1) * 5);
    state.orders.push({
      id: state.orderSeq,
      key,
      name: recipe.name,
      items: recipe.items,
      base: recipe.base,
      timeLeft: time,
      total: time,
    });
    state.orderSeq += 1;
  }

  function gradeFor(score) {
    if (score >= 600) return 'S';
    if (score >= 450) return 'A';
    if (score >= 300) return 'B';
    if (score >= 150) return 'C';
    return 'D';
  }

  function endShift() {
    if (state.over) return;
    state.over = true;
    state.grade = gradeFor(state.score);
  }

  function addFloat(x, y, text, colour) {
    state.floats.push({ x, y, text, colour, life: 1.4 });
  }

  function servePlate() {
    const plate = state.player.carrying;
    for (let i = 0; i < state.orders.length; i += 1) {
      const order = state.orders[i];
      if (plateMatches(plate, RECIPES[order.key])) {
        const timeBonus = Math.round((order.timeLeft / order.total) * 20);
        const comboBonus = state.combo * 5;
        const gained = order.base + timeBonus + comboBonus;
        state.score += gained;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        state.served += 1;
        state.orders.splice(i, 1);
        state.player.carrying = null;
        addFloat(STATIONS.window.ix, STATIONS.window.iy - 30, `+${gained}`, '#2f7a1e');
        if (state.combo >= 2) addFloat(STATIONS.window.ix, STATIONS.window.iy - 58, `COMBO x${state.combo}`, '#d9a41f');
        return EVENT_SERVE;
      }
    }
    return 0;
  }

  // The one context-sensitive action: use the station the chef stands by.
  // Returns 'pickup' | 'putdown' | 'plate-add' | 'place' | 'serve' | 'trash' | 'deny' | null.
  function interact() {
    const player = state.player;
    let nearest = null;
    let nearestDist = Infinity;
    for (const station of stationList()) {
      const dx = player.x - station.ix;
      const dy = player.y - station.iy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = station;
      }
    }
    if (nearest === null || nearestDist > INTERACT_RANGE) return null;
    const carrying = player.carrying;

    if (nearest.kind === 'crate') {
      const kind = nearest.item;
      const needsProcess = INGREDIENTS[kind].process !== null;
      if (isPlate(carrying) && !needsProcess) {
        if (carrying.items.length >= 5) return 'deny';
        carrying.items.push(makeIngredient(kind, 'ready'));
        return 'plate-add';
      }
      if (carrying === null) {
        player.carrying = makeIngredient(kind, 'raw');
        return 'pickup';
      }
      return 'deny';
    }

    if (nearest.kind === 'board') {
      if (state.board === null && carrying !== null && carrying.type === 'ingredient'
        && (carrying.kind === 'tomato' || carrying.kind === 'lettuce') && carrying.state === 'raw') {
        state.board = { item: carrying, progress: 0, done: false };
        player.carrying = null;
        return 'place';
      }
      if (state.board !== null && state.board.done) {
        if (carrying === null) {
          player.carrying = state.board.item;
          state.board = null;
          return 'pickup';
        }
        if (isPlate(carrying) && carrying.items.length < 5) {
          carrying.items.push(state.board.item);
          state.board = null;
          return 'plate-add';
        }
      }
      return 'deny';
    }

    if (nearest.kind === 'grill') {
      if (state.grill === null && carrying !== null && carrying.type === 'ingredient'
        && carrying.kind === 'patty' && carrying.state === 'raw') {
        state.grill = { item: carrying, progress: 0, done: false, burnt: false };
        player.carrying = null;
        return 'place';
      }
      if (state.grill !== null && (state.grill.done || state.grill.burnt)) {
        if (carrying === null) {
          player.carrying = state.grill.item;
          state.grill = null;
          return 'pickup';
        }
        if (isPlate(carrying) && !state.grill.burnt && carrying.items.length < 5) {
          carrying.items.push(state.grill.item);
          state.grill = null;
          return 'plate-add';
        }
      }
      return 'deny';
    }

    if (nearest.kind === 'plates') {
      if (carrying === null) {
        player.carrying = makePlate();
        return 'pickup';
      }
      return 'deny';
    }

    if (nearest.kind === 'window') {
      if (isPlate(carrying)) {
        const served = servePlate();
        return served ? 'serve' : 'deny';
      }
      return 'deny';
    }

    if (nearest.kind === 'trash') {
      if (carrying !== null) {
        player.carrying = null;
        return 'trash';
      }
      return 'deny';
    }

    if (nearest.kind === 'counter') {
      const slot = nearest.id === 'counter' ? 'counter' : 'prep';
      const held = state[slot];
      if (held === null && carrying !== null) {
        state[slot] = carrying;
        player.carrying = null;
        return 'putdown';
      }
      if (held !== null && carrying === null) {
        player.carrying = held;
        state[slot] = null;
        return 'pickup';
      }
      if (isPlate(held) && plateable(carrying)) {
        if (held.items.length >= 5) return 'deny';
        held.items.push(carrying);
        player.carrying = null;
        return 'plate-add';
      }
      if (plateable(held) && isPlate(carrying)) {
        if (carrying.items.length >= 5) return 'deny';
        carrying.items.push(held);
        state[slot] = null;
        return 'plate-add';
      }
      return 'deny';
    }

    return null;
  }

  function nearestStation() {
    const player = state.player;
    let nearest = null;
    let nearestDist = Infinity;
    for (const station of stationList()) {
      const dx = player.x - station.ix;
      const dy = player.y - station.iy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = station;
      }
    }
    return nearestDist <= INTERACT_RANGE ? nearest : null;
  }

  function movePlayer(dt, move) {
    const player = state.player;
    const solids = solidRects();
    const minX = 8 + PLAYER.radius;
    const maxX = CANVAS_WIDTH - 8 - PLAYER.radius;
    const minY = HUD_HEIGHT + 8 + PLAYER.radius;
    const maxY = CANVAS_HEIGHT - 8 - PLAYER.radius;

    function blocked(x, y) {
      for (const rect of solids) {
        const cx = Math.max(rect.x, Math.min(x, rect.x + rect.w));
        const cy = Math.max(rect.y, Math.min(y, rect.y + rect.h));
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy < PLAYER.radius * PLAYER.radius) return true;
      }
      return false;
    }

    const speed = PLAYER.speed * dt;
    let nx = player.x + move.x * speed;
    let ny = player.y + move.y * speed;
    nx = Math.max(minX, Math.min(maxX, nx));
    ny = Math.max(minY, Math.min(maxY, ny));
    // Slide along one axis when the other is blocked, so corners never trap the chef.
    if (!blocked(nx, player.y)) player.x = nx;
    if (!blocked(player.x, ny)) player.y = ny;
    if (move.x !== 0) player.dir = move.x > 0 ? 1 : -1;
  }

  function reset() {
    state.time = 0;
    state.score = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.strikes = 0;
    state.served = 0;
    state.missed = 0;
    state.orders = [];
    state.nextOrderIn = 2;
    state.orderSeq = 0;
    state.player.x = PLAYER.startX;
    state.player.y = PLAYER.startY;
    state.player.dir = 1;
    state.player.carrying = null;
    state.moveTarget = null;
    state.board = null;
    state.grill = null;
    state.counter = null;
    state.prep = null;
    state.floats = [];
    state.over = false;
    state.grade = '';
  }

  return {
    state,
    reset,
    nearestStation,
    interact,
    // Advance the world one fixed step. `move` is a unit direction (or zero),
    // `use` fires the interact action, `click` is a fresh mouse click in
    // canvas space (or null). Returns an events bitmask for sounds.
    step(dt, move, use, click) {
      let events = 0;
      if (state.over) return events;
      state.time += dt;

      // A fresh click on a station uses it at once; anywhere else it is a walk target.
      if (click !== null) {
        let hit = null;
        let hitDist = Infinity;
        for (const station of stationList()) {
          const dx = click.x - station.ix;
          const dy = click.y - station.iy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < hitDist) {
            hitDist = dist;
            hit = station;
          }
        }
        if (hit !== null && hitDist <= INTERACT_RANGE + 30) {
          const pdx = state.player.x - hit.ix;
          const pdy = state.player.y - hit.iy;
          if (Math.sqrt(pdx * pdx + pdy * pdy) <= INTERACT_RANGE) {
            const result = interact();
            if (result === 'serve') events |= EVENT_SERVE;
          } else {
            state.moveTarget = { x: hit.ix, y: hit.iy, useOnArrive: true };
          }
        } else {
          state.moveTarget = { x: click.x, y: click.y, useOnArrive: false };
        }
      }

      // Orders arrive on a timer and expire on their own clock.
      state.nextOrderIn -= dt;
      if (state.nextOrderIn <= 0 && state.orders.length < MAX_ORDERS) {
        spawnOrder();
        state.nextOrderIn = orderInterval();
      }
      for (let i = state.orders.length - 1; i >= 0; i -= 1) {
        const order = state.orders[i];
        order.timeLeft -= dt;
        if (order.timeLeft <= 0) {
          state.orders.splice(i, 1);
          state.strikes += 1;
          state.missed += 1;
          state.combo = 0;
          addFloat(CANVAS_WIDTH / 2, 130, 'Order missed!', '#b3272e');
          events |= EVENT_MISS;
          if (state.strikes >= MAX_STRIKES) endShift();
        }
      }

      // The board chops, the grill cooks — and a patty left too long burns.
      if (state.board !== null && !state.board.done) {
        const def = INGREDIENTS[state.board.item.kind];
        state.board.progress += dt;
        if (state.board.progress >= def.processTime) {
          state.board.done = true;
          state.board.item.state = def.finished;
          events |= EVENT_CHOP_DONE;
        }
      }
      if (state.grill !== null && !state.grill.burnt) {
        const def = INGREDIENTS.patty;
        state.grill.progress += dt;
        if (!state.grill.done && state.grill.progress >= def.processTime) {
          state.grill.done = true;
          state.grill.item.state = def.finished;
          events |= EVENT_GRILL_DONE;
        }
        if (state.grill.progress >= def.burnTime) {
          state.grill.burnt = true;
          state.grill.item.state = 'burnt';
          events |= EVENT_BURN;
        }
      }

      // Floating score popups drift up and fade.
      for (let i = state.floats.length - 1; i >= 0; i -= 1) {
        const float = state.floats[i];
        float.y -= 28 * dt;
        float.life -= dt;
        if (float.life <= 0) state.floats.splice(i, 1);
      }

      // Walk: keys win over a click target, and arriving at a target that asked
      // for it uses the station there.
      let dir = move;
      if ((dir.x === 0 && dir.y === 0) && state.moveTarget !== null) {
        const dx = state.moveTarget.x - state.player.x;
        const dy = state.moveTarget.y - state.player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 6) {
          if (state.moveTarget.useOnArrive) {
            const result = interact();
            if (result === 'serve') events |= EVENT_SERVE;
          }
          state.moveTarget = null;
        } else {
          dir = { x: dx / dist, y: dy / dist };
        }
      }
      if (dir.x !== 0 || dir.y !== 0) movePlayer(dt, dir);

      if (use) {
        const result = interact();
        if (result === 'serve') events |= EVENT_SERVE;
      }

      if (state.time >= SHIFT_LENGTH) endShift();
      if (state.over) events |= EVENT_OVER;
      return events;
    },
  };
}
