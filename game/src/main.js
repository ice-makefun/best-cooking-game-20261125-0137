// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one), and the renderer
// paints what is there. The game moves between four screens: title, play,
// paused and game over. Sounds answer the world's events as they happen.
//
// ?seed=N fixes the order pattern. ?shot=start|play|serve|end (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BURN, EVENT_CHOP_DONE, EVENT_GRILL_DONE, EVENT_MISS, EVENT_OVER, EVENT_SERVE } from './world.js';
import { ACTION_CONFIRM, ACTION_MUTE, ACTION_PAUSE, ACTION_USE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createSound } from './sound.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);
const sound = createSound();

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best, sound.muted, world.nearestStation());
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();
  let lastTickSecond = -1;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each serve.
  function announce(message) {
    status.textContent = message;
  }

  function startGame() {
    world.reset();
    world.state.day = 1;
    accumulator = 0;
    lastTickSecond = -1;
    screen = SCREEN_PLAY;
    sound.unlock();
    announce('Playing. Serve the orders before their timers run out.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.score > best) {
      best = world.state.score;
      saveBest(best);
    }
    sound.dayDone();
    announce(`Shift over. Score ${world.state.score}. Best ${best}.`);
  }

  function answerEvents(events) {
    if (events & EVENT_SERVE) {
      sound.serve(world.state.combo);
      announce(`Served. Score ${world.state.score}.`);
    }
    if (events & EVENT_MISS) {
      sound.fail();
      announce('An order went out cold.');
    }
    if (events & EVENT_CHOP_DONE) sound.chopDone();
    if (events & EVENT_GRILL_DONE) sound.grillDone();
    if (events & EVENT_BURN) {
      sound.fail();
      announce('A patty burned. Throw it away.');
    }
    if (events & EVENT_OVER) endGame();
  }

  function handleActions(actions) {
    if (actions & ACTION_MUTE) {
      const muted = sound.toggleMute();
      announce(muted ? 'Sound off.' : 'Sound on.');
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // Actions are read once a frame: the use key fires on the first step only.
    const actions = input.takeActions();
    handleActions(actions);
    if (screen === SCREEN_PLAY) {
      let use = (actions & ACTION_USE) !== 0;
      let firstStep = true;
      while (accumulator >= STEP) {
        // The click is read on the first step only, so a frame with no step
        // never swallows it.
        const click = firstStep ? input.takeClick() : null;
        firstStep = false;
        const dir = input.direction();
        const events = world.step(STEP, dir, use, click);
        use = false;
        answerEvents(events);
        accumulator -= STEP;
        if (screen !== SCREEN_PLAY) break;
      }
      // A ticket under ten seconds ticks once a second, so the rush is audible.
      const urgent = world.state.orders.some((order) => order.timeLeft <= 10 && order.timeLeft > 0);
      const whole = Math.floor(world.state.time);
      if (urgent && whole !== lastTickSecond) {
        lastTickSecond = whole;
        sound.tick();
      }
      // The grill hisses while a patty cooks.
      sound.setSizzle(world.state.grill !== null && !world.state.grill.burnt);
    } else {
      accumulator = 0;
      input.takeClick();
      sound.setSizzle(false);
    }
    renderer.draw(world.state, screen, best, sound.muted, screen === SCREEN_PLAY ? world.nearestStation() : null);
  }

  // Leaving the tab pauses a running game rather than letting orders run out unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Sizzle and Serve. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
