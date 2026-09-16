# Exit Run — Suit sealed. Floor clear. Leave.

A tiny turn-based dungeon jam game. One floor. Find the exit. Don't die.

**v1-A:** facing + Space bolt, Skulks, Needlers (cardinal LOS), Plasma Fang, Airlock. Art from Issac 32px pack.

## Play

- **Local:** open `index.html` in a browser (needs network once for the Phaser CDN).
- **GitHub Pages:** push this folder to a repo and enable Pages on the branch/folder that contains `index.html`.

## Controls

- **WASD** or **arrow keys** — move one tile (orthogonal only). Updates facing.
- **Space** — spend your turn to fire a 1-dmg orthogonal bolt in your facing direction.
- Bump a **Skulk** or **Needler** to melee attack.
- Step on the **Plasma Fang** to pick it up automatically (+1 ATK).
- Step on the green **Airlock / Exit** to win.

## Rules

| You | Skulks | Needlers |
|-----|--------|----------|
| HP 5, ATK 1 | HP 2, ATK 1 | HP 2, ATK 1 |
| Move or Space-fire each turn | Act after every **2nd** player turn | Act after every **2nd** player turn |
| Facing = last move (start N/UP) | Adjacent → 1 damage; else step toward you | Clear cardinal LOS → fire bolt at you; else step toward you |
| Bolt: walls block; stops on first actor | Red | Cyan/teal |

- **Start:** *"Contract live. Suit sealed."*
- **Win:** step on Exit → *"Airlock. Don't look back."*
- **Lose:** HP hits 0.
- Caps: 1 floor, Skulks + few Needlers (2–3), 1 Plasma Fang, 1 Airlock.
- No multi-floor, inventory, free-aim, or quest UI.

Reload the page for a new layout.
