// The screenshot scenes behind ?shot=start|play|serve|end. The play and serve
// scenes run the real rules forward from a fresh world, steered by a small
// goal-driven autopilot that fetches, chops, grills, plates and serves, so the
// frame is what a short game really looks like and the same seed always gives
// the same frame. The start scene stages a busy kitchen by hand, and the end
// scene lets the orders run out while the chef stands still.
import { STEP, STATIONS, INGREDIENTS, RECIPES, INTERACT_RANGE } from './config.js';
import { EVENT_OVER, EVENT_SERVE, isPlate, makeIngredient, makePlate } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const PLAY_MIN_SECONDS = 8;
const PLAY_MAX_SECONDS = 60;
const SERVE_LIMIT_SECONDS = 120;
const END_LIMIT_SECONDS = 400;
const SAMPLE = STEP;

// A frame worth showing: a ticket on the board, points on the score, and a
// dish well into assembly — a plate with at least two things on it, in the
// chef's hands or on a counter. One item reads as a plate just picked up.
function isRichFrame(state) {
  const carried = state.player.carrying;
  const plateInHand = carried !== null && isPlate(carried) && carried.items.length >= 2;
  const plateOnCounter = (state.counter !== null && isPlate(state.counter) && state.counter.items.length >= 2)
    || (state.prep !== null && isPlate(state.prep) && state.prep.items.length >= 2);
  return state.orders.length > 0 && state.score > 0 && (plateInHand || plateOnCounter);
}

/** The interact point of a station, where the chef stands to use it. */
function pointOf(station) {
  return { x: station.ix, y: station.iy };
}

// The autopilot's plan is a queue of steps. A step walks to a station and uses
// it, or waits for a condition. The plan is rebuilt from the live state
// whenever it runs out or stalls, so a missed interaction never strands it.
// Anything the chef holds that the plan cannot use is thrown away first: a
// fresh start beats a stuck chef.
function buildPlan(state) {
  const player = state.player;
  const carrying = player.carrying;
  const target = state.orders.length > 0
    ? state.orders.reduce((a, b) => (a.timeLeft < b.timeLeft ? a : b))
    : null;
  if (target === null) return [{ wait: (s) => s.orders.length > 0, timeout: 20 }];
  const recipe = RECIPES[target.key];

  // A plate that already fills the ticket goes straight to the window.
  if (isPlate(carrying)) {
    const wanted = recipe.items.map((item) => `${item.kind}:${item.state}`).sort();
    const held = carrying.items.map((item) => `${item.kind}:${item.state}`).sort();
    const complete = wanted.length === held.length && wanted.every((w, i) => w === held[i]);
    if (complete) return [{ station: STATIONS.window }];
  }

  // The first recipe item the plate still needs.
  const heldKinds = isPlate(carrying) ? carrying.items.map((item) => `${item.kind}:${item.state}`) : [];
  const missing = recipe.items.find((item) => {
    const key = `${item.kind}:${item.state}`;
    const at = heldKinds.indexOf(key);
    if (at === -1) return true;
    heldKinds.splice(at, 1);
    return false;
  });
  if (missing === undefined) return [{ station: STATIONS.window }];

  const def = INGREDIENTS[missing.kind];
  const crateId = `crate${missing.kind[0].toUpperCase()}${missing.kind.slice(1)}`;
  const crate = STATIONS[crateId];
  const plateSlot = state.counter !== null && isPlate(state.counter) ? STATIONS.counter
    : state.prep !== null && isPlate(state.prep) ? STATIONS.prep : null;
  const freeSlot = state.counter === null ? STATIONS.counter
    : state.prep === null ? STATIONS.prep : null;

  // A raw item in hand that this ticket needs goes straight to its station.
  if (carrying !== null && carrying.type === 'ingredient' && carrying.state === 'raw'
    && carrying.kind === missing.kind) {
    const station = def.process === 'board' ? STATIONS.board : STATIONS.grill;
    const steps = [{ station }];
    steps.push({
      wait: (s) => {
        const slot = def.process === 'board' ? s.board : s.grill;
        return slot !== null && slot.done && !slot.burnt;
      },
      timeout: 12,
    });
    steps.push({ station });
    if (plateSlot !== null) {
      steps.push({ station: plateSlot });
      steps.push({ station: plateSlot });
    } else if (freeSlot !== null) {
      steps.push({ station: freeSlot });
      steps.push({ station: STATIONS.plates });
      steps.push({ station: freeSlot });
      steps.push({ station: freeSlot });
    }
    return steps;
  }

  // Anything else in hand that this ticket cannot use is thrown away.
  if (carrying !== null && !isPlate(carrying)) return [{ station: STATIONS.trash }];

  // A finished item rides straight onto the plate the chef carries.
  if (def.process === null) {
    if (isPlate(carrying)) return [{ station: crate }];
    if (plateSlot !== null) return [{ station: plateSlot }];
    return [{ station: STATIONS.plates }];
  }

  // A raw item that needs the board or grill: the plate waits on a counter
  // while the chef fetches and processes it, then it goes back on the plate.
  const station = def.process === 'board' ? STATIONS.board : STATIONS.grill;
  const steps = [];
  if (isPlate(carrying)) {
    if (freeSlot === null) return [{ station: STATIONS.trash }];
    steps.push({ station: freeSlot });
  }
  steps.push({ station: crate });
  steps.push({ station });
  steps.push({
    wait: (s) => {
      const slot = def.process === 'board' ? s.board : s.grill;
      return slot !== null && slot.done && !slot.burnt;
    },
    timeout: 12,
  });
  steps.push({ station });
  if (plateSlot !== null) {
    steps.push({ station: plateSlot });
    steps.push({ station: plateSlot });
  } else if (freeSlot !== null) {
    steps.push({ station: freeSlot });
    steps.push({ station: freeSlot });
  } else {
    steps.push({ station: STATIONS.plates });
  }
  return steps;
}

// The centre island (the board and grill) is the kitchen's one obstacle: a
// straight line from the top wall to the bottom wall runs straight through it,
// so the chef routes around its nearer vertical edge. The island, expanded by
// the chef's radius plus a margin, is x 448..832, y 278..412; the gaps beside
// it are x 420 (left) and x 860 (right), and the open floor above and below it
// is y 200 and y 520.
const ISLAND = { x0: 448, y0: 278, x1: 832, y1: 412 };
const GAP_LEFT_X = 420;
const GAP_RIGHT_X = 860;
const ABOVE_Y = 200;
const BELOW_Y = 520;

/** Whether the segment from (ax,ay) to (bx,by) touches the island rectangle. */
function segmentHitsIsland(ax, ay, bx, by) {
  const inside = (x, y) => x >= ISLAND.x0 && x <= ISLAND.x1 && y >= ISLAND.y0 && y <= ISLAND.y1;
  if (inside(ax, ay) || inside(bx, by)) return true;
  const dx = bx - ax;
  const dy = by - ay;
  if (dx !== 0) {
    for (const edgeX of [ISLAND.x0, ISLAND.x1]) {
      const t = (edgeX - ax) / dx;
      if (t >= 0 && t <= 1) {
        const y = ay + t * dy;
        if (y >= ISLAND.y0 && y <= ISLAND.y1) return true;
      }
    }
  }
  if (dy !== 0) {
    for (const edgeY of [ISLAND.y0, ISLAND.y1]) {
      const t = (edgeY - ay) / dy;
      if (t >= 0 && t <= 1) {
        const x = ax + t * dx;
        if (x >= ISLAND.x0 && x <= ISLAND.x1) return true;
      }
    }
  }
  return false;
}

/**
 * The waypoints from `from` to `to`, the last of which is `to` itself. A
 * straight line that clears the island is one waypoint; one that crosses it
 * goes around the edge nearer the target, down (or up) the gap, then to the
 * target.
 */
function routeTo(from, to) {
  if (!segmentHitsIsland(from.x, from.y, to.x, to.y)) return [to];
  const edgeX = to.x < 640 ? GAP_LEFT_X : GAP_RIGHT_X;
  const sideY = (y) => (y < ISLAND.y0 ? ABOVE_Y : y > ISLAND.y1 ? BELOW_Y : y);
  const waypoints = [{ x: edgeX, y: sideY(from.y) }];
  if (sideY(from.y) !== sideY(to.y)) waypoints.push({ x: edgeX, y: sideY(to.y) });
  waypoints.push(to);
  return waypoints;
}

function createAutopilot(world) {
  const state = world.state;
  let plan = [];
  let stepIndex = 0;
  let waiting = null;
  let waitElapsed = 0;
  let route = null;
  let routeIndex = 0;
  let routeTarget = null;
  let lastDist = Infinity;
  let stuckFor = 0;

  function currentStep() {
    return plan[stepIndex] ?? null;
  }

  function replan() {
    plan = buildPlan(state);
    stepIndex = 0;
    waiting = null;
    waitElapsed = 0;
    route = null;
    routeTarget = null;
    stuckFor = 0;
    lastDist = Infinity;
  }

  function moveToward(tx, ty) {
    const player = state.player;
    const dx = tx - player.x;
    const dy = ty - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 6) return { x: 0, y: 0 };
    return { x: dx / dist, y: dy / dist };
  }

  // One fixed step of autopilot input. Returns {move, use} for world.step.
  function act() {
    // The plan is rebuilt when every step in it has run: stepIndex walks past
    // the end of the queue, and the queue itself is never emptied.
    if (stepIndex >= plan.length) replan();
    const step = currentStep();
    if (step === null) return { move: { x: 0, y: 0 }, use: false };

    if (step.wait !== undefined) {
      if (waiting === null) {
        waiting = step;
        waitElapsed = 0;
      }
      waitElapsed += SAMPLE;
      if (step.wait(state) || waitElapsed >= step.timeout) {
        stepIndex += 1;
        waiting = null;
      }
      return { move: { x: 0, y: 0 }, use: false };
    }

    const target = pointOf(step.station);
    const dist = Math.hypot(target.x - state.player.x, target.y - state.player.y);
    // The chef's body keeps it a radius away from a station, so "close enough"
    // is the interact range itself, not the point: the world checks the same
    // range before it lets an interaction through. Neighbouring crates stand
    // 96 px apart with a 56 px reach, so their ranges overlap: the chef only
    // uses a station once it is the nearest one, or the neighbour would answer
    // instead and the interaction would be refused.
    if (dist <= INTERACT_RANGE && world.nearestStation() === step.station) {
      stepIndex += 1;
      route = null;
      routeTarget = null;
      stuckFor = 0;
      lastDist = Infinity;
      return { move: { x: 0, y: 0 }, use: true };
    }
    // Walk the route to this station, recomputing it when the target changes
    // or the chef stops getting closer to the waypoint it is heading for.
    if (route === null || routeTarget !== step.station) {
      route = routeTo(state.player, target);
      routeIndex = 0;
      routeTarget = step.station;
      stuckFor = 0;
      lastDist = Infinity;
    }
    const waypoint = route[routeIndex];
    const wdist = Math.hypot(waypoint.x - state.player.x, waypoint.y - state.player.y);
    if (wdist < 12 && routeIndex < route.length - 1) {
      routeIndex += 1;
      return { move: moveToward(route[routeIndex].x, route[routeIndex].y), use: false };
    }
    if (wdist > lastDist - 0.5) stuckFor += SAMPLE;
    else stuckFor = 0;
    lastDist = wdist;
    if (stuckFor > 1.5) {
      route = routeTo(state.player, target);
      routeIndex = 0;
      stuckFor = 0;
      lastDist = Infinity;
    }
    return { move: moveToward(waypoint.x, waypoint.y), use: false };
  }

  return { act, replan };
}

// A busy kitchen, staged by hand for the title screen: tickets on the board, a
// tomato mid-chop, a patty on the grill, two plates mid-assembly and the chef
// carrying the next piece.
function stageStart(world) {
  const state = world.state;
  world.reset();
  state.time = 45;
  state.score = 120;
  state.combo = 2;
  state.bestCombo = 2;
  state.served = 3;
  state.orders = [
    { id: 0, key: 'salad', name: 'Garden Salad', items: RECIPES.salad.items, base: 40, timeLeft: 42, total: 75 },
    { id: 1, key: 'cheeseburger', name: 'Cheeseburger', items: RECIPES.cheeseburger.items, base: 60, timeLeft: 68, total: 90 },
    { id: 2, key: 'melt', name: 'Cheese Melt', items: RECIPES.melt.items, base: 30, timeLeft: 55, total: 75 },
  ];
  state.orderSeq = 3;
  state.board = { item: makeIngredient('tomato', 'raw'), progress: 1.2, done: false };
  state.grill = { item: makeIngredient('patty', 'raw'), progress: 2.5, done: false, burnt: false };
  const plateA = makePlate();
  plateA.items.push(makeIngredient('bread', 'ready'), makeIngredient('cheese', 'ready'));
  state.counter = plateA;
  const plateB = makePlate();
  plateB.items.push(makeIngredient('tomato', 'chopped'));
  state.prep = plateB;
  state.player.x = 640;
  state.player.y = 500;
  state.player.carrying = makeIngredient('lettuce', 'chopped');
  return { screen: SCREEN_TITLE, best: 0 };
}

export { createAutopilot };

/**
 * Set `world` to the named scene (start, play, serve or end) and return the
 * screen to draw over it and the best score to show.
 */
export function stageShot(name, world) {
  if (name === 'start') return stageStart(world);
  world.reset();
  const pilot = createAutopilot(world);
  if (name === 'serve') {
    for (let t = 0; t < SERVE_LIMIT_SECONDS / SAMPLE; t += 1) {
      const input = pilot.act();
      const events = world.step(SAMPLE, input.move, input.use, null);
      if (events & EVENT_SERVE) {
        // Just after the serve, while the score popup is still up and the chef
        // is still at the window.
        for (let i = 0; i < 0.5 / SAMPLE; i += 1) {
          const follow = pilot.act();
          world.step(SAMPLE, follow.move, follow.use, null);
        }
        return { screen: SCREEN_PLAY, best: world.state.score };
      }
      if (events & EVENT_OVER) break;
    }
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'end') {
    for (let t = 0; t < END_LIMIT_SECONDS / SAMPLE; t += 1) {
      const events = world.step(SAMPLE, { x: 0, y: 0 }, false, null);
      if (events & EVENT_OVER) break;
    }
    return { screen: SCREEN_OVER, best: world.state.score };
  }
  // The play scene runs the autopilot until the frame is rich — a plate with
  // food on it, a ticket on the board and points on the score — or a minute,
  // whichever comes first.
  for (let t = 0; t < PLAY_MAX_SECONDS / SAMPLE; t += 1) {
    const input = pilot.act();
    const events = world.step(SAMPLE, input.move, input.use, null);
    if (events & EVENT_OVER) break;
    if (world.state.time >= PLAY_MIN_SECONDS && isRichFrame(world.state)) break;
  }
  return { screen: SCREEN_PLAY, best: world.state.score };
}
