# best-cooking-game-20261125-0137

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/ice-makefun/best-cooking-game-20261125-0137/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/ice-makefun/best-cooking-game-20261125-0137/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

**Sizzle & Serve** is a fast little kitchen game. Orders land on the board with
a timer; you run the kitchen alone — grab ingredients from the crates, chop
tomatoes and lettuce on the board, grill patties (and pull them off before they
burn), stack the dish on a plate and serve it at the window before the ticket
runs out. Serve fast for combo and time bonuses; three cold orders end the
shift. One shift is three minutes, the pace rises as you serve, and the best
score is kept between visits.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. No build step, no network: plain canvas,
ES modules and WebAudio sounds, all drawn and played in code.

Move with WASD or the arrow keys (or click where to walk), E or Space to use a
station, P to pause, M to mute, Enter to start again.

## How it plays

- Four dishes: Cheese Melt, Garden Salad, Cheeseburger and the five-piece
  Deluxe — each with its own time on the ticket.
- Chopping takes 2 seconds, grilling 4; a patty left 8 seconds burns and has
  to be thrown away.
- A served dish pays its base price plus a combo bonus and a time bonus; a
  ticket that runs out costs a strike.
- Grades run from D to S on the shift's score.

This entry was built for the make.fun competition
`best-cooking-game-20261125-0137`.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
