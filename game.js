/**
 * Exit Run — Suit sealed. Floor clear. Leave.
 * Jam vertical slice: room+corridor dungeon, Skulks, Fang Charm, Exit.
 */
(() => {
  const TILE = 48;
  const COLS = 11;
  const ROWS = 11;
  const W = COLS * TILE;
  const H = ROWS * TILE;
  const HUD_H = 56;

  const WALL = 0;
  const FLOOR = 1;
  const EXIT = 2;

  const STR = {
    exit: "Airlock. Don't look back.",
    grub: "It doesn't chase so much as arrive.",
    charmSpawn: "A spent tooth of something bigger. Clip it to the suit.",
    charmPickup: "Plasma Fang. Harder bite. (+1 ATK)",
  };

  const C = {
    wall: 0x1a1a28,
    wallEdge: 0x2a2a3a,
    floor: 0x2e2e3e,
    floorAlt: 0x343448,
    exit: 0x3d8b6e,
    exitGlow: 0x5ecf9a,
    player: 0xe8c547,
    playerEdge: 0xf5e6a0,
    grub: 0xc44b4b,
    grubHurt: 0x8a3030,
    charm: 0xc9a0dc,
    charmGlow: 0xe8d0f0,
    hudBg: 0x0d0d14,
    text: "#e8e6e3",
    mute: "#8a8890",
    win: "#5ecf9a",
    lose: "#e06060",
  };

  class ExitRunScene extends Phaser.Scene {
    constructor() {
      super("ExitRun");
    }

    create() {
      this.gameOver = false;
      this.playerTurns = 0;
      this.message = "";
      this.messageTimer = 0;
      this.flavorShown = { charm: false, grub: false };

      this.map = this.generateMap();
      this.placeExit();
      this.player = this.placePlayer();
      this.grubs = this.spawnSkulks(6 + Math.floor(Math.random() * 5)); // 6–10
      this.charm = this.placeCharm();

      this.drawLayer = this.add.graphics();
      this.entityLayer = this.add.graphics();

      this.hudBg = this.add.rectangle(W / 2, H + HUD_H / 2, W, HUD_H, C.hudBg).setDepth(10);
      this.hudText = this.add
        .text(12, H + 10, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "16px",
          color: C.text,
        })
        .setDepth(11);
      this.msgText = this.add
        .text(W / 2, H + 32, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "13px",
          color: C.mute,
          align: "center",
        })
        .setOrigin(0.5, 0)
        .setDepth(11);

      this.endText = this.add
        .text(W / 2, H / 2, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "28px",
          color: C.text,
          align: "center",
          backgroundColor: "#000000aa",
          padding: { x: 20, y: 14 },
        })
        .setOrigin(0.5)
        .setDepth(20)
        .setVisible(false);

      this.keys = this.input.keyboard.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.W,
        down: Phaser.Input.Keyboard.KeyCodes.S,
        left: Phaser.Input.Keyboard.KeyCodes.A,
        right: Phaser.Input.Keyboard.KeyCodes.D,
        up2: Phaser.Input.Keyboard.KeyCodes.UP,
        down2: Phaser.Input.Keyboard.KeyCodes.DOWN,
        left2: Phaser.Input.Keyboard.KeyCodes.LEFT,
        right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      });

      this._held = {};

      // Keep canvas focused so later keypresses don't drop (QA P1)
      const canvas = this.game.canvas;
      canvas.setAttribute("tabindex", "0");
      canvas.style.outline = "none";
      const focusCanvas = () => {
        try {
          canvas.focus({ preventScroll: true });
        } catch (_) {
          canvas.focus();
        }
      };
      focusCanvas();
      this.input.on("pointerdown", focusCanvas);
      this._onWinFocus = () => focusCanvas();
      window.addEventListener("focus", this._onWinFocus);

      this.redraw();
      this.updateHud();
      this.showMsg("Find the exit. Don't die.");
    }

    // ——— Map generation (rooms + corridors) ———
    generateMap() {
      const map = Array.from({ length: ROWS }, () => Array(COLS).fill(WALL));

      // Carve a few rooms
      const rooms = [];
      const attempts = 12;
      for (let i = 0; i < attempts && rooms.length < 5; i++) {
        const rw = 3 + Math.floor(Math.random() * 3); // 3–5
        const rh = 3 + Math.floor(Math.random() * 3);
        const rx = 1 + Math.floor(Math.random() * (COLS - rw - 1));
        const ry = 1 + Math.floor(Math.random() * (ROWS - rh - 1));
        const room = { x: rx, y: ry, w: rw, h: rh, cx: rx + Math.floor(rw / 2), cy: ry + Math.floor(rh / 2) };
        let overlaps = false;
        for (const other of rooms) {
          if (
            room.x <= other.x + other.w &&
            room.x + room.w >= other.x &&
            room.y <= other.y + other.h &&
            room.y + room.h >= other.y
          ) {
            overlaps = true;
            break;
          }
        }
        if (overlaps) continue;
        for (let y = room.y; y < room.y + room.h; y++) {
          for (let x = room.x; x < room.x + room.w; x++) {
            map[y][x] = FLOOR;
          }
        }
        rooms.push(room);
      }

      // Ensure at least 2 rooms
      if (rooms.length < 2) {
        rooms.length = 0;
        const r1 = { x: 1, y: 1, w: 4, h: 4, cx: 2, cy: 2 };
        const r2 = { x: 6, y: 6, w: 4, h: 4, cx: 7, cy: 7 };
        for (const room of [r1, r2]) {
          for (let y = room.y; y < room.y + room.h; y++) {
            for (let x = room.x; x < room.x + room.w; x++) {
              map[y][x] = FLOOR;
            }
          }
          rooms.push(room);
        }
      }

      // Connect rooms with L-corridors
      for (let i = 1; i < rooms.length; i++) {
        const a = rooms[i - 1];
        const b = rooms[i];
        this.carveCorridor(map, a.cx, a.cy, b.cx, b.cy);
      }
      // Extra connection for loops
      if (rooms.length > 2) {
        this.carveCorridor(map, rooms[0].cx, rooms[0].cy, rooms[rooms.length - 1].cx, rooms[rooms.length - 1].cy);
      }

      this.rooms = rooms;
      return map;
    }

    carveCorridor(map, x0, y0, x1, y1) {
      let x = x0;
      let y = y0;
      // Horizontal then vertical (or reverse randomly)
      if (Math.random() < 0.5) {
        while (x !== x1) {
          map[y][x] = FLOOR;
          x += x1 > x ? 1 : -1;
        }
        while (y !== y1) {
          map[y][x] = FLOOR;
          y += y1 > y ? 1 : -1;
        }
      } else {
        while (y !== y1) {
          map[y][x] = FLOOR;
          y += y1 > y ? 1 : -1;
        }
        while (x !== x1) {
          map[y][x] = FLOOR;
          x += x1 > x ? 1 : -1;
        }
      }
      map[y1][x1] = FLOOR;
    }

    floorTiles() {
      const tiles = [];
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (this.map[y][x] === FLOOR || this.map[y][x] === EXIT) {
            tiles.push({ x, y });
          }
        }
      }
      return tiles;
    }

    isWalkable(x, y) {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
      const t = this.map[y][x];
      return t === FLOOR || t === EXIT;
    }

    occupiedBySkulk(x, y, ignore) {
      return this.grubs.some((g) => g.alive && g !== ignore && g.x === x && g.y === y);
    }

    placeExit() {
      // Put exit in a room far from first room center if possible
      const floors = this.floorTiles();
      const start = this.rooms[0];
      floors.sort((a, b) => {
        const da = Math.abs(a.x - start.cx) + Math.abs(a.y - start.cy);
        const db = Math.abs(b.x - start.cx) + Math.abs(b.y - start.cy);
        return db - da;
      });
      const exit = floors[0];
      this.map[exit.y][exit.x] = EXIT;
      this.exitPos = exit;
    }

    placePlayer() {
      // Near first room center
      const r = this.rooms[0];
      let x = r.cx;
      let y = r.cy;
      if (!this.isWalkable(x, y) || (x === this.exitPos.x && y === this.exitPos.y)) {
        const floors = this.floorTiles().filter(
          (t) => !(t.x === this.exitPos.x && t.y === this.exitPos.y)
        );
        const pick = floors[Math.floor(Math.random() * floors.length)];
        x = pick.x;
        y = pick.y;
      }
      return { x, y, hp: 5, atk: 1, maxHp: 5 };
    }

    spawnSkulks(n) {
      const candidates = this.floorTiles().filter(
        (t) =>
          !(t.x === this.player.x && t.y === this.player.y) &&
          !(t.x === this.exitPos.x && t.y === this.exitPos.y) &&
          Math.abs(t.x - this.player.x) + Math.abs(t.y - this.player.y) > 2
      );
      this.shuffle(candidates);
      const grubs = [];
      const count = Math.min(n, candidates.length);
      for (let i = 0; i < count; i++) {
        const t = candidates[i];
        grubs.push({ x: t.x, y: t.y, hp: 2, atk: 1, alive: true });
      }
      return grubs;
    }

    placeCharm() {
      const taken = new Set([
        `${this.player.x},${this.player.y}`,
        `${this.exitPos.x},${this.exitPos.y}`,
        ...this.grubs.map((g) => `${g.x},${g.y}`),
      ]);
      const candidates = this.floorTiles().filter((t) => !taken.has(`${t.x},${t.y}`));
      if (candidates.length === 0) return null;
      const t = candidates[Math.floor(Math.random() * candidates.length)];
      return { x: t.x, y: t.y, taken: false };
    }

    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    // ——— Input & turns ———
    update() {
      if (this.gameOver) return;

      const dir = this.pollMove();
      if (!dir) return;

      const nx = this.player.x + dir.dx;
      const ny = this.player.y + dir.dy;
      if (!this.isWalkable(nx, ny)) return;

      // Bump enemy = attack
      const grub = this.grubs.find((g) => g.alive && g.x === nx && g.y === ny);
      if (grub) {
        grub.hp -= this.player.atk;
        if (grub.hp <= 0) {
          grub.alive = false;
          this.showMsg("Skulk quiet.");
        } else {
          this.showMsg("You bite. It flinches.");
          if (!this.flavorShown.grub) {
            this.flavorShown.grub = true;
            this.showMsg(STR.grub);
          }
        }
        this.afterPlayerTurn();
        return;
      }

      // Move
      this.player.x = nx;
      this.player.y = ny;

      // Fang Charm pickup
      if (this.charm && !this.charm.taken && this.charm.x === nx && this.charm.y === ny) {
        this.charm.taken = true;
        this.player.atk += 1;
        this.showMsg(STR.charmPickup);
      }

      // Win: step on Exit
      if (this.map[ny][nx] === EXIT) {
        this.win();
        return;
      }

      this.afterPlayerTurn();
    }

    pollMove() {
      const k = this.keys;
      const edge = (key, id) => {
        const down = !!key.isDown;
        const was = !!this._held[id];
        this._held[id] = down;
        return down && !was;
      };
      if (edge(k.up, "W") || edge(k.up2, "UP")) return { dx: 0, dy: -1 };
      if (edge(k.down, "S") || edge(k.down2, "DOWN")) return { dx: 0, dy: 1 };
      if (edge(k.left, "A") || edge(k.left2, "LEFT")) return { dx: -1, dy: 0 };
      if (edge(k.right, "D") || edge(k.right2, "RIGHT")) return { dx: 1, dy: 0 };
      return null;
    }

    afterPlayerTurn() {
      this.playerTurns += 1;
      // After every 2nd player turn, Skulks act
      if (this.playerTurns % 2 === 0) {
        this.grubsAct();
      }
      if (this.player.hp <= 0) {
        this.lose();
        return;
      }
      this.redraw();
      this.updateHud();
    }

    grubsAct() {
      for (const g of this.grubs) {
        if (!g.alive) continue;
        const dx = this.player.x - g.x;
        const dy = this.player.y - g.y;
        const dist = Math.abs(dx) + Math.abs(dy);

        if (dist === 1) {
          // Adjacent: deal 1 dmg
          this.player.hp -= g.atk;
          this.showMsg("Skulk arrives. (−1 HP)");
          if (!this.flavorShown.grub) {
            this.flavorShown.grub = true;
          }
          continue;
        }

        // Move 1 step toward player (prefer the larger axis)
        let stepX = 0;
        let stepY = 0;
        if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
          stepX = dx > 0 ? 1 : -1;
        } else if (dy !== 0) {
          stepY = dy > 0 ? 1 : -1;
        } else if (dx !== 0) {
          stepX = dx > 0 ? 1 : -1;
        }

        const nx = g.x + stepX;
        const ny = g.y + stepY;
        if (
          this.isWalkable(nx, ny) &&
          !(nx === this.player.x && ny === this.player.y) &&
          !this.occupiedBySkulk(nx, ny, g) &&
          !(this.charm && !this.charm.taken && this.charm.x === nx && this.charm.y === ny)
        ) {
          g.x = nx;
          g.y = ny;
        } else {
          // Try alternate axis
          let ax = 0;
          let ay = 0;
          if (stepX !== 0 && dy !== 0) {
            ay = dy > 0 ? 1 : -1;
          } else if (stepY !== 0 && dx !== 0) {
            ax = dx > 0 ? 1 : -1;
          }
          const ax2 = g.x + ax;
          const ay2 = g.y + ay;
          if (
            (ax !== 0 || ay !== 0) &&
            this.isWalkable(ax2, ay2) &&
            !(ax2 === this.player.x && ay2 === this.player.y) &&
            !this.occupiedBySkulk(ax2, ay2, g)
          ) {
            g.x = ax2;
            g.y = ay2;
          }
        }
      }
    }

    win() {
      this.gameOver = true;
      this.redraw();
      this.updateHud();
      this.endText.setText(STR.exit + "\n\nYOU WIN");
      this.endText.setColor(C.win);
      this.endText.setVisible(true);
      this.showMsg(STR.exit);
    }

    lose() {
      this.gameOver = true;
      this.player.hp = 0;
      this.redraw();
      this.updateHud();
      this.endText.setText("HP 0.\nYou stay.\n\nYOU LOSE");
      this.endText.setColor(C.lose);
      this.endText.setVisible(true);
      this.showMsg("You fall. The floor keeps you.");
    }

    showMsg(text) {
      this.message = text;
      this.msgText.setText(text);
    }

    updateHud() {
      const living = this.grubs.filter((g) => g.alive).length;
      this.hudText.setText(
        `HP ${this.player.hp}/${this.player.maxHp}   ATK ${this.player.atk}   Skulks ${living}`
      );
      if (this.charm && !this.charm.taken && !this.flavorShown.charm) {
        // Show spawn flavor once when game starts / charm visible
        this.flavorShown.charm = true;
        this.showMsg(STR.charmSpawn);
      }
    }

    // ——— Draw ———
    redraw() {
      const g = this.drawLayer;
      const e = this.entityLayer;
      g.clear();
      e.clear();

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const px = x * TILE;
          const py = y * TILE;
          const t = this.map[y][x];
          if (t === WALL) {
            g.fillStyle(C.wall, 1);
            g.fillRect(px, py, TILE, TILE);
            g.lineStyle(1, C.wallEdge, 0.4);
            g.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
          } else {
            const alt = (x + y) % 2 === 0;
            g.fillStyle(alt ? C.floor : C.floorAlt, 1);
            g.fillRect(px, py, TILE, TILE);
            if (t === EXIT) {
              g.fillStyle(C.exit, 1);
              g.fillRect(px + 6, py + 6, TILE - 12, TILE - 12);
              g.lineStyle(2, C.exitGlow, 0.9);
              g.strokeRect(px + 8, py + 8, TILE - 16, TILE - 16);
            }
          }
        }
      }

      // Charm
      if (this.charm && !this.charm.taken) {
        const px = this.charm.x * TILE + TILE / 2;
        const py = this.charm.y * TILE + TILE / 2;
        e.fillStyle(C.charmGlow, 0.35);
        e.fillCircle(px, py, 14);
        e.fillStyle(C.charm, 1);
        e.fillCircle(px, py, 8);
        // tooth-ish triangle
        e.fillStyle(0xffffff, 0.85);
        e.fillTriangle(px, py - 6, px - 5, py + 5, px + 5, py + 5);
      }

      // Skulks
      for (const grub of this.grubs) {
        if (!grub.alive) continue;
        const px = grub.x * TILE + TILE / 2;
        const py = grub.y * TILE + TILE / 2;
        const col = grub.hp < 2 ? C.grubHurt : C.grub;
        e.fillStyle(col, 1);
        e.fillRoundedRect(px - 14, py - 12, 28, 24, 8);
        // eyes
        e.fillStyle(0x1a0a0a, 1);
        e.fillCircle(px - 5, py - 2, 3);
        e.fillCircle(px + 5, py - 2, 3);
        // HP pips
        e.fillStyle(0xffffff, 0.7);
        for (let i = 0; i < grub.hp; i++) {
          e.fillRect(px - 8 + i * 8, py + 8, 5, 3);
        }
      }

      // Player
      const ppx = this.player.x * TILE + TILE / 2;
      const ppy = this.player.y * TILE + TILE / 2;
      e.fillStyle(C.playerEdge, 0.5);
      e.fillCircle(ppx, ppy, 18);
      e.fillStyle(C.player, 1);
      e.fillCircle(ppx, ppy, 14);
      e.fillStyle(0x1a1a10, 1);
      e.fillCircle(ppx - 4, ppy - 2, 2.5);
      e.fillCircle(ppx + 4, ppy - 2, 2.5);
    }
  }

  const config = {
    type: Phaser.AUTO,
    width: W,
    height: H + HUD_H,
    parent: "game-container",
    backgroundColor: "#0a0a0f",
    scene: ExitRunScene,
    // Keyboard on window so WASD works without clicking the canvas first (QA P1)
    input: {
      keyboard: {
        target: window,
      },
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    callbacks: {
      postBoot(game) {
        const canvas = game.canvas;
        canvas.setAttribute("tabindex", "0");
        canvas.style.outline = "none";
        try {
          canvas.focus({ preventScroll: true });
        } catch (_) {
          canvas.focus();
        }
      },
    },
  };

  new Phaser.Game(config);
})();
