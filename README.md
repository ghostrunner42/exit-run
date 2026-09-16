# Exit Run — Suit sealed. Floor clear. Leave.

A tiny turn-based dungeon jam game. One floor. Find the exit. Don't die.

## Play

- **Local:** open `index.html` in a browser (needs network once for the Phaser CDN).
- **GitHub Pages:** enable Pages on `main` / root for this repo.
- **Raw play:** open https://ghostrunner42.github.io/exit-run/ after Pages is on (or download the files).

## Controls

- **WASD** or **arrow keys** — move one tile (orthogonal only).
- Bump a **Skulk** to attack (no separate attack key).
- Step on the **Plasma Fang** to pick it up automatically (+1 ATK).
- Step on the green **Airlock / Exit** to win.

## Rules

| You | Skulks |
|-----|--------|
| HP 5, ATK 1 | HP 2, ATK 1 |
| Move every turn | Act after every **2nd** player turn |
| Bump = attack | Adjacent → deal 1 damage; else move 1 toward you |

- **Win:** step on Exit → *"Airlock. Don't look back."*
- **Lose:** HP hits 0.
- Exactly one Plasma Fang on the floor. 6–10 Skulks.

Reload the page for a new layout.
