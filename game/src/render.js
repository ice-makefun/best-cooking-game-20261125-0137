// Sizzle & Serve — everything the player sees, drawn in plain canvas 2D. Warm
// wood, cream tile and terracotta, with food drawn so it reads at a glance even
// when the screenshot is shrunk to a contact sheet.
import { CANVAS_WIDTH, CANVAS_HEIGHT, HUD_HEIGHT, SHIFT_LENGTH, PLAYER, STATIONS, INGREDIENTS, RECIPES, COLOURS } from './config.js';
import { isPlate } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
}

// One food icon, centred on (x, y) at the given radius. The same drawing is
// used in crates, on plates, in tickets and in the chef's hands, so the game
// reads the same everywhere.
export function drawIngredient(ctx, item, x, y, r) {
  const def = INGREDIENTS[item.kind];
  if (item.kind === 'tomato') {
    if (item.state === 'chopped') {
      ctx.fillStyle = '#e5484d';
      ctx.beginPath();
      ctx.arc(x - r * 0.35, y, r * 0.55, 0, Math.PI * 2);
      ctx.arc(x + r * 0.35, y, r * 0.55, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f27d7d';
      circle(ctx, x - r * 0.35, y - r * 0.15, r * 0.2);
      ctx.fill();
      circle(ctx, x + r * 0.35, y - r * 0.15, r * 0.2);
      ctx.fill();
      return;
    }
    ctx.fillStyle = def.colour;
    circle(ctx, x, y, r);
    ctx.fill();
    ctx.fillStyle = '#f27d7d';
    circle(ctx, x - r * 0.3, y - r * 0.3, r * 0.28);
    ctx.fill();
    ctx.fillStyle = '#3d8f31';
    ctx.beginPath();
    ctx.moveTo(x, y - r);
    ctx.lineTo(x - r * 0.35, y - r * 1.25);
    ctx.lineTo(x + r * 0.35, y - r * 1.25);
    ctx.closePath();
    ctx.fill();
  } else if (item.kind === 'lettuce') {
    if (item.state === 'chopped') {
      ctx.fillStyle = '#7ed957';
      for (let i = -1; i <= 1; i += 1) {
        roundRect(ctx, x - r + i * r * 0.55, y - r * 0.35, r * 0.9, r * 0.7, r * 0.3);
        ctx.fill();
      }
      ctx.fillStyle = '#4a9e35';
      roundRect(ctx, x - r * 0.5, y - r * 0.1, r * 1.4, r * 0.16, r * 0.08);
      ctx.fill();
      return;
    }
    ctx.fillStyle = def.colour;
    circle(ctx, x, y, r);
    ctx.fill();
    ctx.fillStyle = '#7ed957';
    circle(ctx, x - r * 0.35, y - r * 0.25, r * 0.55);
    ctx.fill();
    circle(ctx, x + r * 0.3, y - r * 0.3, r * 0.5);
    ctx.fill();
    ctx.strokeStyle = '#3d8f31';
    ctx.lineWidth = Math.max(1, r * 0.12);
    ctx.beginPath();
    ctx.moveTo(x - r * 0.5, y + r * 0.2);
    ctx.quadraticCurveTo(x, y + r * 0.55, x + r * 0.5, y + r * 0.2);
    ctx.stroke();
  } else if (item.kind === 'bread') {
    ctx.fillStyle = def.dark;
    roundRect(ctx, x - r, y - r * 0.72, r * 2, r * 1.44, r * 0.5);
    ctx.fill();
    ctx.fillStyle = def.colour;
    roundRect(ctx, x - r * 0.86, y - r * 0.6, r * 1.72, r * 1.2, r * 0.42);
    ctx.fill();
    ctx.fillStyle = '#f7d99a';
    circle(ctx, x - r * 0.3, y - r * 0.2, r * 0.14);
    ctx.fill();
    circle(ctx, x + r * 0.25, y + r * 0.15, r * 0.14);
    ctx.fill();
  } else if (item.kind === 'patty') {
    if (item.state === 'burnt') {
      ctx.fillStyle = '#1d1a18';
      roundRect(ctx, x - r, y - r * 0.62, r * 2, r * 1.24, r * 0.4);
      ctx.fill();
      ctx.fillStyle = '#3a3330';
      roundRect(ctx, x - r * 0.8, y - r * 0.45, r * 1.6, r * 0.9, r * 0.3);
      ctx.fill();
      ctx.strokeStyle = '#6b6b6b';
      ctx.lineWidth = Math.max(1, r * 0.1);
      ctx.beginPath();
      ctx.moveTo(x - r * 0.4, y - r * 0.9);
      ctx.quadraticCurveTo(x - r * 0.55, y - r * 1.4, x - r * 0.3, y - r * 1.7);
      ctx.moveTo(x + r * 0.3, y - r * 0.9);
      ctx.quadraticCurveTo(x + r * 0.45, y - r * 1.4, x + r * 0.25, y - r * 1.7);
      ctx.stroke();
      return;
    }
    ctx.fillStyle = item.state === 'cooked' ? '#6e4526' : '#c08a6a';
    roundRect(ctx, x - r, y - r * 0.62, r * 2, r * 1.24, r * 0.4);
    ctx.fill();
    ctx.fillStyle = item.state === 'cooked' ? '#8a5a3b' : '#d9a37f';
    roundRect(ctx, x - r * 0.85, y - r * 0.48, r * 1.7, r * 0.96, r * 0.32);
    ctx.fill();
    if (item.state === 'cooked') {
      ctx.strokeStyle = '#4a2c14';
      ctx.lineWidth = Math.max(1, r * 0.12);
      for (let i = -1; i <= 1; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + i * r * 0.5 - r * 0.2, y - r * 0.4);
        ctx.lineTo(x + i * r * 0.5 + r * 0.2, y + r * 0.4);
        ctx.stroke();
      }
    }
  } else if (item.kind === 'cheese') {
    ctx.fillStyle = def.colour;
    ctx.beginPath();
    ctx.moveTo(x - r, y + r * 0.6);
    ctx.lineTo(x + r, y + r * 0.6);
    ctx.lineTo(x + r, y - r * 0.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = def.dark;
    circle(ctx, x + r * 0.25, y + r * 0.15, r * 0.16);
    ctx.fill();
    circle(ctx, x - r * 0.3, y + r * 0.3, r * 0.12);
    ctx.fill();
    ctx.fillStyle = '#ffe08a';
    ctx.beginPath();
    ctx.moveTo(x - r * 0.85, y + r * 0.45);
    ctx.lineTo(x + r * 0.85, y + r * 0.45);
    ctx.lineTo(x + r * 0.85, y - r * 0.25);
    ctx.closePath();
    ctx.fill();
  }
}

function drawPlate(ctx, plate, x, y, r) {
  ctx.fillStyle = '#d9d9d9';
  ctx.beginPath();
  ctx.ellipse(x, y + r * 0.18, r, r * 0.42, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.ellipse(x, y, r, r * 0.78, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9c9c9';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y, r * 0.72, r * 0.56, 0, 0, Math.PI * 2);
  ctx.stroke();
  const items = plate.items;
  const n = items.length;
  items.forEach((item, i) => {
    const ox = n === 1 ? 0 : (i - (n - 1) / 2) * r * 0.85;
    drawIngredient(ctx, item, x + ox, y - r * 0.08, r * 0.42);
  });
}

function drawThing(ctx, thing, x, y, r) {
  if (thing === null) return;
  if (isPlate(thing)) drawPlate(ctx, thing, x, y, r);
  else drawIngredient(ctx, thing, x, y, r);
}

function progressRing(ctx, x, y, r, frac, colour) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  circle(ctx, x, y, r + 3);
  ctx.fill();
  ctx.strokeStyle = '#fff8e7';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, frac));
  ctx.stroke();
}

function drawStation(ctx, station, state, highlight) {
  const { x, y, w, h } = station;
  ctx.fillStyle = 'rgba(61,39,22,0.25)';
  roundRect(ctx, x + 4, y + 6, w, h, 10);
  ctx.fill();
  if (station.kind === 'crate') {
    ctx.fillStyle = COLOURS.crateDark;
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = COLOURS.crate;
    roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 6);
    ctx.fill();
    ctx.strokeStyle = COLOURS.crateDark;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 6, y + h / 2);
    ctx.lineTo(x + w - 6, y + h / 2);
    ctx.stroke();
    drawIngredient(ctx, { kind: station.item, state: 'raw' }, x + w / 2, y + h / 2 - 12, 20);
    ctx.fillStyle = '#fff8e7';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(station.label, x + w / 2, y + h - 10);
  } else if (station.kind === 'board') {
    ctx.fillStyle = COLOURS.counterEdge;
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = COLOURS.counterTop;
    roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 6);
    ctx.fill();
    ctx.fillStyle = '#f7e8c8';
    roundRect(ctx, x + 18, y + 16, w - 36, h - 32, 6);
    ctx.fill();
    ctx.fillStyle = '#c9a86a';
    ctx.beginPath();
    ctx.moveTo(x + w - 34, y + 22);
    ctx.lineTo(x + w - 14, y + 22);
    ctx.lineTo(x + w - 14, y + 30);
    ctx.lineTo(x + w - 34, y + 30);
    ctx.closePath();
    ctx.fill();
    if (state.board !== null) {
      drawIngredient(ctx, state.board.item, x + w / 2 - 12, y + h / 2, 20);
      if (!state.board.done) {
        const def = INGREDIENTS[state.board.item.kind];
        progressRing(ctx, x + w - 22, y + 20, 11, state.board.progress / def.processTime, '#5fbf4a');
      }
    }
  } else if (station.kind === 'grill') {
    ctx.fillStyle = '#3a3a3a';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = '#555555';
    roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 6);
    ctx.fill();
    ctx.strokeStyle = '#222222';
    ctx.lineWidth = 3;
    for (let i = 1; i <= 3; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + 10, y + (h / 4) * i);
      ctx.lineTo(x + w - 10, y + (h / 4) * i);
      ctx.stroke();
    }
    if (state.grill !== null) {
      const def = INGREDIENTS.patty;
      drawIngredient(ctx, state.grill.item, x + w / 2, y + h / 2, 20);
      if (!state.grill.burnt) {
        ctx.fillStyle = 'rgba(255,150,50,0.85)';
        ctx.beginPath();
        ctx.moveTo(x + w / 2 - 16, y + h - 12);
        ctx.quadraticCurveTo(x + w / 2 - 8, y + h - 30, x + w / 2, y + h - 12);
        ctx.quadraticCurveTo(x + w / 2 + 8, y + h - 30, x + w / 2 + 16, y + h - 12);
        ctx.closePath();
        ctx.fill();
        progressRing(ctx, x + w - 22, y + 20, 11, state.grill.progress / def.processTime, '#f7c948');
      }
    }
  } else if (station.kind === 'plates') {
    ctx.fillStyle = COLOURS.counterEdge;
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = COLOURS.counterTop;
    roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 6);
    ctx.fill();
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h - 16 - i * 9, 34, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9c9c9';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.fillStyle = '#fff8e7';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Plates', x + w / 2, y + 18);
  } else if (station.kind === 'counter') {
    ctx.fillStyle = COLOURS.counterEdge;
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = COLOURS.counterTop;
    roundRect(ctx, x + 4, y + 4, w - 8, h - 8, 6);
    ctx.fill();
    const held = station.id === 'counter' ? state.counter : state.prep;
    if (held !== null) drawThing(ctx, held, x + w / 2, y + h / 2 + 4, 26);
  } else if (station.kind === 'window') {
    ctx.fillStyle = '#7a4f31';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = '#ffd98a';
    roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 6);
    ctx.fill();
    ctx.fillStyle = '#b57e2e';
    ctx.fillRect(x + 8, y + h - 18, w - 16, 4);
    ctx.fillStyle = '#5b3a24';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SERVE', x + w / 2, y + 26);
    ctx.fillStyle = '#c9a86a';
    circle(ctx, x + w - 26, y + 22, 9);
    ctx.fill();
    ctx.fillStyle = '#f7c948';
    circle(ctx, x + w - 26, y + 22, 5);
    ctx.fill();
  } else if (station.kind === 'trash') {
    ctx.fillStyle = '#4a4a4a';
    roundRect(ctx, x, y, w, h, 8);
    ctx.fill();
    ctx.fillStyle = '#333333';
    roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 6);
    ctx.fill();
    ctx.fillStyle = '#fff8e7';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('TRASH', x + w / 2, y + h / 2 + 5);
  }
  if (highlight) {
    ctx.strokeStyle = '#f7c948';
    ctx.lineWidth = 3;
    roundRect(ctx, x - 3, y - 3, w + 6, h + 6, 11);
    ctx.stroke();
  }
}

function drawChef(ctx, player) {
  const { x, y } = player;
  ctx.fillStyle = 'rgba(61,39,22,0.25)';
  ctx.beginPath();
  ctx.ellipse(x, y + 20, 20, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  // Apron body.
  ctx.fillStyle = '#f4f1ea';
  roundRect(ctx, x - 15, y - 6, 30, 26, 10);
  ctx.fill();
  ctx.fillStyle = '#e5484d';
  ctx.fillRect(x - 15, y + 8, 30, 4);
  // Head and toque.
  ctx.fillStyle = '#f2c89b';
  circle(ctx, x, y - 14, 11);
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x - 13, y - 34, 26, 14, 7);
  ctx.fill();
  circle(ctx, x - 8, y - 30, 7);
  ctx.fill();
  circle(ctx, x + 8, y - 30, 7);
  ctx.fill();
  // Eyes look where the chef walks.
  ctx.fillStyle = '#3d2716';
  circle(ctx, x + player.dir * 4 - 3, y - 14, 1.6);
  ctx.fill();
  circle(ctx, x + player.dir * 4 + 4, y - 14, 1.6);
  ctx.fill();
  // What the chef carries rides above the head.
  if (player.carrying !== null) {
    drawThing(ctx, player.carrying, x, y - 52, 18);
  }
}

function drawOrderTicket(ctx, order, x, y, now) {
  const w = 176;
  const h = 60;
  const frac = Math.max(0, order.timeLeft / order.total);
  const urgent = order.timeLeft <= 10;
  ctx.fillStyle = urgent && Math.floor(now * 4) % 2 === 0 ? '#ffe3e3' : COLOURS.ticket;
  roundRect(ctx, x, y, w, h, 8);
  ctx.fill();
  ctx.strokeStyle = COLOURS.ticketEdge;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = COLOURS.ink;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(order.name, x + 8, y + 17);
  order.items.forEach((item, i) => {
    drawIngredient(ctx, item, x + 20 + i * 30, y + 34, 11);
  });
  ctx.fillStyle = urgent ? '#b3272e' : COLOURS.inkSoft;
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`${Math.ceil(order.timeLeft)}s`, x + w - 8, y + 38);
  ctx.fillStyle = frac > 0.5 ? '#5fbf4a' : frac > 0.25 ? '#f7c948' : '#e5484d';
  roundRect(ctx, x + 8, y + h - 9, (w - 16) * frac, 5, 2.5);
  ctx.fill();
}

function drawHud(ctx, state, best, muted) {
  ctx.fillStyle = COLOURS.hud;
  ctx.fillRect(0, 0, CANVAS_WIDTH, HUD_HEIGHT);
  ctx.fillStyle = COLOURS.hudLight;
  ctx.fillRect(0, HUD_HEIGHT - 4, CANVAS_WIDTH, 4);
  state.orders.forEach((order, i) => {
    drawOrderTicket(ctx, order, 16 + i * 184, 8, state.time);
  });
  const timeLeft = Math.max(0, SHIFT_LENGTH - state.time);
  const mins = Math.floor(timeLeft / 60);
  const secs = Math.floor(timeLeft % 60);
  ctx.textAlign = 'right';
  ctx.fillStyle = timeLeft <= 30 ? '#ff9a9a' : '#fff8e7';
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, CANVAS_WIDTH - 16, 34);
  ctx.fillStyle = '#ffd98a';
  ctx.font = 'bold 15px sans-serif';
  ctx.fillText(`SCORE ${state.score}`, CANVAS_WIDTH - 16, 56);
  ctx.textAlign = 'left';
  ctx.fillStyle = '#fff8e7';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`DAY ${state.day}`, 760, 30);
  if (state.combo >= 2) {
    ctx.fillStyle = '#f7c948';
    roundRect(ctx, 760, 40, 92, 22, 8);
    ctx.fill();
    ctx.fillStyle = '#5b3a24';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText(`COMBO x${state.combo}`, 768, 56);
  }
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < state.strikes ? '#e5484d' : 'rgba(255,248,231,0.35)';
    circle(ctx, 880 + i * 22, 24, 8);
    ctx.fill();
    if (i < state.strikes) {
      ctx.strokeStyle = '#fff8e7';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(880 + i * 22 - 4, 20);
      ctx.lineTo(880 + i * 22 + 4, 28);
      ctx.moveTo(880 + i * 22 + 4, 20);
      ctx.lineTo(880 + i * 22 - 4, 28);
      ctx.stroke();
    }
  }
  ctx.fillStyle = 'rgba(255,248,231,0.6)';
  ctx.font = '12px sans-serif';
  ctx.fillText(`BEST ${best}`, 880, 56);
  if (muted) {
    ctx.fillStyle = '#fff8e7';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('MUTED', 760, 56);
  }
}

function drawKitchen(ctx, state, highlight) {
  ctx.fillStyle = COLOURS.floor;
  ctx.fillRect(0, HUD_HEIGHT, CANVAS_WIDTH, CANVAS_HEIGHT - HUD_HEIGHT);
  ctx.fillStyle = COLOURS.floorTile;
  for (let ty = HUD_HEIGHT; ty < CANVAS_HEIGHT; ty += 44) {
    for (let tx = ((ty / 44) % 2) * 22; tx < CANVAS_WIDTH; tx += 44) {
      ctx.fillRect(tx, ty, 42, 42);
    }
  }
  ctx.fillStyle = COLOURS.wall;
  ctx.fillRect(0, HUD_HEIGHT, CANVAS_WIDTH, 8);
  ctx.fillRect(0, HUD_HEIGHT, 8, CANVAS_HEIGHT - HUD_HEIGHT);
  ctx.fillRect(CANVAS_WIDTH - 8, HUD_HEIGHT, 8, CANVAS_HEIGHT - HUD_HEIGHT);
  ctx.fillRect(0, CANVAS_HEIGHT - 8, CANVAS_WIDTH, 8);
  for (const station of Object.values(STATIONS)) {
    drawStation(ctx, station, state, highlight !== null && highlight.id === station.id);
  }
  for (const float of state.floats) {
    ctx.globalAlpha = Math.max(0, Math.min(1, float.life));
    ctx.fillStyle = float.colour;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(float.text, float.x, float.y);
    ctx.globalAlpha = 1;
  }
  drawChef(ctx, state.player);
}

function drawTitle(ctx, state, best) {
  ctx.fillStyle = 'rgba(43,26,14,0.62)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f7c948';
  ctx.font = 'bold 74px sans-serif';
  ctx.fillText('SIZZLE & SERVE', CANVAS_WIDTH / 2, 250);
  ctx.fillStyle = '#fff8e7';
  ctx.font = 'bold 24px sans-serif';
  ctx.fillText('A fast little kitchen — chop, grill, plate, serve!', CANVAS_WIDTH / 2, 292);
  ctx.font = '16px sans-serif';
  ctx.fillStyle = '#ffd98a';
  ctx.fillText('WASD / arrows to walk  ·  E or click to use a station  ·  P pause  ·  M mute', CANVAS_WIDTH / 2, 336);
  ctx.fillStyle = '#fff8e7';
  ctx.font = '15px sans-serif';
  ctx.fillText('Garden Salad  ·  Cheese Melt  ·  Cheeseburger  ·  Deluxe Burger', CANVAS_WIDTH / 2, 372);
  ctx.fillText('Serve orders before their timers run out. Three missed orders end the shift.', CANVAS_WIDTH / 2, 398);
  ctx.fillStyle = '#f7c948';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Press Enter or click to start', CANVAS_WIDTH / 2, 452);
  if (best > 0) {
    ctx.fillStyle = '#fff8e7';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`Best score: ${best}`, CANVAS_WIDTH / 2, 486);
  }
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(43,26,14,0.6)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff8e7';
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText('PAUSED', CANVAS_WIDTH / 2, 350);
  ctx.font = '18px sans-serif';
  ctx.fillText('Press P or Enter to keep cooking', CANVAS_WIDTH / 2, 392);
}

function drawOver(ctx, state) {
  ctx.fillStyle = 'rgba(43,26,14,0.72)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f7c948';
  ctx.font = 'bold 56px sans-serif';
  ctx.fillText('SHIFT OVER', CANVAS_WIDTH / 2, 240);
  ctx.fillStyle = '#fff8e7';
  ctx.font = 'bold 34px sans-serif';
  ctx.fillText(`Score ${state.score}   ·   Grade ${state.grade}`, CANVAS_WIDTH / 2, 300);
  ctx.font = '20px sans-serif';
  ctx.fillText(`Dishes served: ${state.served}    Best combo: x${state.bestCombo}    Missed orders: ${state.strikes}`, CANVAS_WIDTH / 2, 344);
  ctx.fillStyle = '#ffd98a';
  ctx.font = '18px sans-serif';
  ctx.fillText(state.strikes >= 3 ? 'Three orders went out cold — the rush got the better of you.' : 'The shift is done — the kitchen is yours again tomorrow.', CANVAS_WIDTH / 2, 380);
  ctx.fillStyle = '#f7c948';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Press Enter or click to cook again', CANVAS_WIDTH / 2, 440);
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  return {
    draw(worldState, screen, best, muted, highlight) {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawKitchen(ctx, worldState, screen === SCREEN_PLAY ? highlight : null);
      drawHud(ctx, worldState, best, muted);
      if (screen === SCREEN_TITLE) drawTitle(ctx, worldState, best);
      else if (screen === SCREEN_PAUSED) drawPaused(ctx);
      else if (screen === SCREEN_OVER) drawOver(ctx, worldState);
    },
  };
}
