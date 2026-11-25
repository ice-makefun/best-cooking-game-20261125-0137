// Sizzle & Serve — a top-down cooking game. One shared config: the canvas, the
// kitchen layout, the ingredients, the recipes and the tuning. Every other file
// reads its numbers from here so the whole game stays in agreement.
export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const HUD_HEIGHT = 76;
export const STEP = 1 / 60;
export const SHIFT_LENGTH = 180;
export const MAX_STRIKES = 3;
export const MAX_ORDERS = 4;
export const BEST_KEY = 'sizzle-and-serve-best';

// The chef's movement.
export const PLAYER = {
  radius: 22,
  speed: 265,
  startX: 640,
  startY: 500,
};

// Every station is a solid rectangle on the floor plus the point the chef stands
// on to use it. Crates line the left wall, the board and grill share the centre
// island, the window and trash sit on the top wall, plates and the staging
// counter sit on the bottom wall.
export const STATIONS = {
  crateTomato: { id: 'crateTomato', kind: 'crate', item: 'tomato', x: 14, y: 150, w: 104, h: 88, ix: 152, iy: 194, label: 'Tomato' },
  crateLettuce: { id: 'crateLettuce', kind: 'crate', item: 'lettuce', x: 14, y: 246, w: 104, h: 88, ix: 152, iy: 290, label: 'Lettuce' },
  crateBread: { id: 'crateBread', kind: 'crate', item: 'bread', x: 14, y: 342, w: 104, h: 88, ix: 152, iy: 386, label: 'Bread' },
  cratePatty: { id: 'cratePatty', kind: 'crate', item: 'patty', x: 14, y: 438, w: 104, h: 88, ix: 152, iy: 482, label: 'Patty' },
  crateCheese: { id: 'crateCheese', kind: 'crate', item: 'cheese', x: 14, y: 534, w: 104, h: 88, ix: 152, iy: 578, label: 'Cheese' },
  board: { id: 'board', kind: 'board', x: 470, y: 300, w: 150, h: 90, ix: 545, iy: 414, label: 'Chopping board' },
  grill: { id: 'grill', kind: 'grill', x: 660, y: 300, w: 150, h: 90, ix: 735, iy: 414, label: 'Grill' },
  plates: { id: 'plates', kind: 'plates', x: 180, y: 620, w: 120, h: 72, ix: 240, iy: 596, label: 'Plates' },
  counter: { id: 'counter', kind: 'counter', x: 480, y: 620, w: 260, h: 72, ix: 610, iy: 596, label: 'Counter' },
  prep: { id: 'prep', kind: 'counter', x: 180, y: 92, w: 220, h: 64, ix: 290, iy: 180, label: 'Prep counter' },
  window: { id: 'window', kind: 'window', x: 760, y: 92, w: 240, h: 64, ix: 880, iy: 180, label: 'Serving window' },
  trash: { id: 'trash', kind: 'trash', x: 1040, y: 92, w: 120, h: 64, ix: 1100, iy: 180, label: 'Trash' },
};

// How far the chef may stand from a station's interact point and still use it.
export const INTERACT_RANGE = 56;

// Ingredients. `process` names the station that turns the raw item into its
// finished form and how long it takes; null means it is served as it comes.
export const INGREDIENTS = {
  tomato: { name: 'Tomato', process: 'board', processTime: 2, finished: 'chopped', colour: '#e5484d', dark: '#b3272e' },
  lettuce: { name: 'Lettuce', process: 'board', processTime: 2, finished: 'chopped', colour: '#5fbf4a', dark: '#3d8f31' },
  bread: { name: 'Bread', process: null, processTime: 0, finished: 'ready', colour: '#e8b25f', dark: '#b57e2e' },
  patty: { name: 'Patty', process: 'grill', processTime: 4, finished: 'cooked', colour: '#8a5a3b', dark: '#5f3a22', burnTime: 8 },
  cheese: { name: 'Cheese', process: null, processTime: 0, finished: 'ready', colour: '#f7c948', dark: '#d9a41f' },
};

// Recipes: the items a plate must hold, in any order, to fill the ticket.
export const RECIPES = {
  melt: {
    name: 'Cheese Melt',
    items: [{ kind: 'bread', state: 'ready' }, { kind: 'cheese', state: 'ready' }],
    base: 30,
    time: 75,
  },
  salad: {
    name: 'Garden Salad',
    items: [{ kind: 'tomato', state: 'chopped' }, { kind: 'lettuce', state: 'chopped' }],
    base: 40,
    time: 75,
  },
  cheeseburger: {
    name: 'Cheeseburger',
    items: [
      { kind: 'bread', state: 'ready' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'cheese', state: 'ready' },
    ],
    base: 60,
    time: 90,
  },
  deluxe: {
    name: 'Deluxe Burger',
    items: [
      { kind: 'bread', state: 'ready' },
      { kind: 'patty', state: 'cooked' },
      { kind: 'cheese', state: 'ready' },
      { kind: 'lettuce', state: 'chopped' },
      { kind: 'tomato', state: 'chopped' },
    ],
    base: 100,
    time: 105,
  },
};

// The order the kitchen offers recipes in, and how often each shows up.
export const RECIPE_POOL = ['melt', 'salad', 'cheeseburger', 'salad', 'cheeseburger', 'melt', 'deluxe'];

// The palette. Warm wood, cream tile and terracotta, so the food reads at a glance.
export const COLOURS = {
  floor: '#f2e3c6',
  floorTile: '#e9d5ae',
  wall: '#8a5a3b',
  wallTop: '#a06a45',
  counter: '#c98f4e',
  counterTop: '#e0aa6a',
  counterEdge: '#9c6b34',
  crate: '#b07a3e',
  crateDark: '#8a5a28',
  hud: '#5b3a24',
  hudLight: '#7a4f31',
  ticket: '#fff8e7',
  ticketEdge: '#d9c49a',
  ink: '#3d2716',
  inkSoft: '#7a5c40',
  cream: '#fff8e7',
  red: '#e5484d',
  green: '#5fbf4a',
  gold: '#f7c948',
};
