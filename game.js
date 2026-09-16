/**
 * Exit Run v1-A — Suit sealed. Floor clear. Leave.
 * Facing + Space bolt, Skulks, Needlers (LOS), Plasma Fang, Airlock.
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

  const DIR = {
    UP: { dx: 0, dy: -1, label: "N" },
    DOWN: { dx: 0, dy: 1, label: "S" },
    LEFT: { dx: -1, dy: 0, label: "W" },
    RIGHT: { dx: 1, dy: 0, label: "E" },
  };

  const STR = {
    start: "Contract live. Suit sealed.",
    exit: "Airlock. Don't look back.",
    grub: "It doesn't chase so much as arrive.",
    needler: "It waits. Then it writes a hole.",
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
    needler: 0x2ec4b6,
    needlerHurt: 0x1a8a80,
    needlerEye: 0x0a2a28,
    charm: 0xc9a0dc,
    charmGlow: 0xe8d0f0,
    bolt: 0xf0e080,
    boltEnemy: 0x7ef0e8,
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
      this.flavorShown = { charm: false, grub: false, needler: false };
      this.bolts = []; // tiny visual projectiles {x,y,px,py,life,color}

      this.map = this.generateMap();
      this.placeExit();
      this.player = this.placePlayer();
      this.grubs = this.spawnSkulks(4 + Math.floor(Math.random() * 3)); // 4–6
      this.needlers = this.spawnNeedlers(2 + Math.floor(Math.random() * 2)); // 2–3
      this.charm = this.placeCharm();

      this.drawLayer = this.add.graphics();
      this.entityLayer = this.add.graphics();

      this.hudBg = this.add.rectangle(W / 2, H + HUD_H / 2, W, HUD_H, C.hudBg).setDepth(10);
      this.hudText = this.add
        .text(12, H + 8, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "14px",
          color: C.text,
        })
        .setDepth(11);
      this.msgText = this.add
        .text(W / 2, H + 30, "", {
          fontFamily: "system-ui, sans-serif",
          fontSize: "12px",
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
        fire: Phaser.Input.Keyboard.KeyCodes.SPACE,
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

      // Prevent Space from scrolling the page
      this._onKeyDown = (ev) => {
        if (ev.code === "Space" || ev.key === " ") {
          ev.preventDefault();
        }
      };
      window.addEventListener("keydown", this._onKeyDown, { passive: false });

      this.redraw();
      this.updateHud();
      this.showMsg(STR.start);
    }

    // ——— Map generation (rooms + corridors) ———
    generateMap() {
      const map = Array.from({ length: ROWS }, () => Array(COLS).fill(WALL));

      const rooms = [];
      const attempts = 12;
      for (let i = 0; i < attempts && rooms.length < 5; i++) {
        const rw = 3 + Math.floor(Math.random() * 3); // 3–5
        const rh = 3 + Math.floor(Math.random() * 3);
        const rx = 1 + Math.floor(Math.random() * (COLS - rw - 1));
        const ry = 1 + Math.floor(Math.random() * (ROWS - rh - 1));
        const room = {
          x: rx,
          y: ry,
          w: rw,
          h: rh,
          cx: rx + Math.floor(rw / 2),
          cy: ry + Math.floor(rh / 2),
        };
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

      for (let i = 1; i < rooms.length; i++) {
        const a = rooms[i - 1];
        const b = rooms[i];
        this.carveCorridor(map, a.cx, a.cy, b.cx, b.cy);
      }
      if (rooms.length > 2) {
        this.carveCorridor(
          map,
          rooms[0].cx,
          rooms[0].cy,
          rooms[rooms.length - 1].cx,
          rooms[rooms.length - 1].cy
        );
      }

      this.rooms = rooms;
      return map;
    }

    carveCorridor(map, x0, y0, x1, y1) {
      let x = x0;
      let y = y0;
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

    isWall(x, y) {
      if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
      return this.map[y][x] === WALL;
    }

    occupiedByEnemy(x, y, ignore) {
      const hitSkulk = this.grubs.some(
        (g) => g.alive && g !== ignore && g.x === x && g.y === y
      );
      if (hitSkulk) return true;
      return this.needlers.some(
        (n) => n.alive && n !== ignore && n.x === x && n.y === y
      );
    }

    enemyAt(x, y) {
      const grub = this.grubs.find((g) => g.alive && g.x === x && g.y === y);
      if (grub) return { kind: "skulk", ent: grub };
      const needler = this.needlers.find((n) => n.alive && n.x === x && n.y === y);
      if (needler) return { kind: "needler", ent: needler };
      return null;
    }

    placeExit() {
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
      // Facing = last move dir; start UP
      return {
        x,
        y,
        hp: 5,
        atk: 1,
        maxHp: 5,
        facing: { dx: DIR.UP.dx, dy: DIR.UP.dy },
      };
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

    spawnNeedlers(n) {
      const taken = new Set([
        `${this.player.x},${this.player.y}`,
        `${this.exitPos.x},${this.exitPos.y}`,
        ...this.grubs.map((g) => `${g.x},${g.y}`),
      ]);
      const candidates = this.floorTiles().filter(
        (t) =>
          !taken.has(`${t.x},${t.y}`) &&
          Math.abs(t.x - this.player.x) + Math.abs(t.y - this.player.y) > 2
      );
      this.shuffle(candidates);
      const needlers = [];
      const count = Math.min(n, candidates.length);
      for (let i = 0; i < count; i++) {
        const t = candidates[i];
        needlers.push({ x: t.x, y: t.y, hp: 2, atk: 1, alive: true });
      }
      return needlers;
    }

    placeCharm() {
      const taken = new Set([
        `${this.player.x},${this.player.y}`,
        `${this.exitPos.x},${this.exitPos.y}`,
        ...this.grubs.map((g) => `${g.x},${g.y}`),
        ...this.needlers.map((n) => `${n.x},${n.y}`),
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

    facingLabel() {
      const { dx, dy } = this.player.facing;
      if (dy < 0) return "N";
      if (dy > 0) return "S";
      if (dx < 0) return "W";
      if (dx > 0) return "E";
      return "N";
    }

    setFacing(dx, dy) {
      this.player.facing = { dx, dy };
    }

    /** Cardinal LOS: same row or col, no wall tiles between (exclusive). */
    hasCardinalLOS(x0, y0, x1, y1) {
      if (x0 !== x1 && y0 !== y1) return false;
      if (x0 === x1 && y0 === y1) return false;
      if (x0 === x1) {
        const step = y1 > y0 ? 1 : -1;
        for (let y = y0 + step; y !== y1; y += step) {
          if (this.isWall(x0, y)) return false;
        }
        return true;
      }
      const step = x1 > x0 ? 1 : -1;
      for (let x = x0 + step; x !== x1; x += step) {
        if (this.isWall(x, y0)) return false;
      }
      return true;
    }

    /**
     * Fire 1-dmg orthogonal bolt from (ox,oy) in dir.
     * Never originates on origin tile; first check is ox+dx, oy+dy.
     * Walls block. Stops on first actor (damages enemy / player).
     * Returns {hit: 'wall'|'enemy'|'player'|'miss', x, y}.
     */
    fireBolt(ox, oy, dx, dy, opts = {}) {
      const dmg = opts.dmg != null ? opts.dmg : 1;
      const fromPlayer = !!opts.fromPlayer;
      const color = opts.color != null ? opts.color : fromPlayer ? C.bolt : C.boltEnemy;

      let x = ox + dx;
      let y = oy + dy;
      const path = [];

      while (true) {
        if (this.isWall(x, y)) {
          this.spawnBoltVfx(path.length ? path : [{ x: ox + dx, y: oy + dy }], color, true);
          return { hit: "wall", x, y };
        }

        path.push({ x, y });

        // Player hit (enemy bolts)
        if (!fromPlayer && x === this.player.x && y === this.player.y) {
          this.player.hp -= dmg;
          this.spawnBoltVfx(path, color, false);
          return { hit: "player", x, y };
        }

        // Enemy hit (player bolts — never damage self; bolt never on player tile)
        if (fromPlayer) {
          const target = this.enemyAt(x, y);
          if (target) {
            target.ent.hp -= dmg;
            if (target.ent.hp <= 0) {
              target.ent.alive = false;
              this.showMsg(target.kind === "needler" ? "Needler quiet." : "Skulk quiet.");
            } else {
              this.showMsg(
                target.kind === "needler" ? "Bolt finds Needler." : "Bolt finds Skulk."
              );
            }
            this.spawnBoltVfx(path, color, false);
            return { hit: "enemy", x, y, kind: target.kind };
          }
        } else {
          // Enemy bolt can also stop on other actors (block)
          const other = this.enemyAt(x, y);
          if (other) {
            this.spawnBoltVfx(path, color, false);
            return { hit: "enemy", x, y };
          }
        }

        x += dx;
        y += dy;
      }
    }

    spawnBoltVfx(path, color, blocked) {
      if (!path || path.length === 0) return;
      // Tiny step animation: one short-lived spark per tile in path (keep tiny)
      for (let i = 0; i < path.length; i++) {
        const p = path[i];
        this.bolts.push({
          x: p.x,
          y: p.y,
          life: 6 + i, // stagger slightly
          color,
          blocked: blocked && i === path.length - 1,
        });
      }
    }

    // ——— Input & turns ———
    update() {
      // Animate bolts even briefly after game over
      if (this.bolts.length) {
        for (const b of this.bolts) b.life -= 1;
        this.bolts = this.bolts.filter((b) => b.life > 0);
        this.redraw();
      }

      if (this.gameOver) return;

      if (this.pollFire()) {
        this.doFire();
        return;
      }

      const dir = this.pollMove();
      if (!dir) return;

      // Facing updates on move attempt direction
      this.setFacing(dir.dx, dir.dy);

      const nx = this.player.x + dir.dx;
      const ny = this.player.y + dir.dy;
      if (!this.isWalkable(nx, ny)) {
        this.updateHud();
        this.redraw();
        return;
      }

      // Bump enemy = attack
      const target = this.enemyAt(nx, ny);
      if (target) {
        target.ent.hp -= this.player.atk;
        if (target.ent.hp <= 0) {
          target.ent.alive = false;
          this.showMsg(target.kind === "needler" ? "Needler quiet." : "Skulk quiet.");
        } else {
          this.showMsg("You bite. It flinches.");
          if (target.kind === "skulk" && !this.flavorShown.grub) {
            this.flavorShown.grub = true;
            this.showMsg(STR.grub);
          } else if (target.kind === "needler" && !this.flavorShown.needler) {
            this.flavorShown.needler = true;
            this.showMsg(STR.needler);
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

    pollFire() {
      const key = this.keys.fire;
      const down = !!key.isDown;
      const was = !!this._held.SPACE;
      this._held.SPACE = down;
      return down && !was;
    }

    doFire() {
      const { dx, dy } = this.player.facing;
      this.fireBolt(this.player.x, this.player.y, dx, dy, {
        fromPlayer: true,
        dmg: 1,
        color: C.bolt,
      });
      this.afterPlayerTurn();
    }

    afterPlayerTurn() {
      this.playerTurns += 1;
      // After every 2nd player turn, enemies act
      if (this.playerTurns % 2 === 0) {
        this.grubsAct();
        this.needlersAct();
      }
      if (this.player.hp <= 0) {
        this.lose();
        return;
      }
      this.redraw();
      this.updateHud();
    }

    tryStepEnemy(ent, stepX, stepY) {
      const nx = ent.x + stepX;
      const ny = ent.y + stepY;
      if (
        this.isWalkable(nx, ny) &&
        !(nx === this.player.x && ny === this.player.y) &&
        !this.occupiedByEnemy(nx, ny, ent) &&
        !(this.charm && !this.charm.taken && this.charm.x === nx && this.charm.y === ny)
      ) {
        ent.x = nx;
        ent.y = ny;
        return true;
      }
      return false;
    }

    stepTowardPlayer(ent) {
      const dx = this.player.x - ent.x;
      const dy = this.player.y - ent.y;

      let stepX = 0;
      let stepY = 0;
      if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
        stepX = dx > 0 ? 1 : -1;
      } else if (dy !== 0) {
        stepY = dy > 0 ? 1 : -1;
      } else if (dx !== 0) {
        stepX = dx > 0 ? 1 : -1;
      }

      if (this.tryStepEnemy(ent, stepX, stepY)) return;

      let ax = 0;
      let ay = 0;
      if (stepX !== 0 && dy !== 0) {
        ay = dy > 0 ? 1 : -1;
      } else if (stepY !== 0 && dx !== 0) {
        ax = dx > 0 ? 1 : -1;
      }
      if (ax !== 0 || ay !== 0) {
        this.tryStepEnemy(ent, ax, ay);
      }
    }

    grubsAct() {
      for (const g of this.grubs) {
        if (!g.alive) continue;
        const dx = this.player.x - g.x;
        const dy = this.player.y - g.y;
        const dist = Math.abs(dx) + Math.abs(dy);

        if (dist === 1) {
          this.player.hp -= g.atk;
          this.showMsg("Skulk arrives. (−1 HP)");
          if (!this.flavorShown.grub) {
            this.flavorShown.grub = true;
          }
          continue;
        }

        this.stepTowardPlayer(g);
      }
    }

    needlersAct() {
      for (const n of this.needlers) {
        if (!n.alive) continue;

        // If cardinal LOS clear to player (no wall between), fire bolt; else step toward
        if (this.hasCardinalLOS(n.x, n.y, this.player.x, this.player.y)) {
          const dx = Math.sign(this.player.x - n.x);
          const dy = Math.sign(this.player.y - n.y);
          // Orthogonal only (LOS already ensures cardinal)
          this.fireBolt(n.x, n.y, dx, dy, {
            fromPlayer: false,
            dmg: 1,
            color: C.boltEnemy,
          });
          this.showMsg("Needler writes. (−1 HP)");
          if (!this.flavorShown.needler) {
            this.flavorShown.needler = true;
            this.showMsg(STR.needler);
          }
          continue;
        }

        // Adjacent melee fallback if somehow next to player without LOS (shouldn't happen)
        const dist =
          Math.abs(this.player.x - n.x) + Math.abs(this.player.y - n.y);
        if (dist === 1) {
          this.player.hp -= n.atk;
          this.showMsg("Needler close. (−1 HP)");
          continue;
        }

        this.stepTowardPlayer(n);
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
      const skulks = this.grubs.filter((g) => g.alive).length;
      const needlers = this.needlers.filter((n) => n.alive).length;
      this.hudText.setText(
        `HP ${this.player.hp}/${this.player.maxHp}  ATK ${this.player.atk}  Skulks ${skulks}  Needlers ${needlers}  Face ${this.facingLabel()}`
      );
      if (this.charm && !this.charm.taken && !this.flavorShown.charm) {
        this.flavorShown.charm = true;
        // Start string already shown; charm spawn can wait until next quiet moment — show once
        // Prefer start on boot; if charm flavor not yet needed, leave start. Show charm on first HUD after start.
        // Keep charm spawn flavor available via delayed overwrite only if message still start:
        if (this.message === STR.start) {
          // keep start for a beat; charm flavor on next updateHud after a move is fine
        }
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
        e.fillStyle(0x1a0a0a, 1);
        e.fillCircle(px - 5, py - 2, 3);
        e.fillCircle(px + 5, py - 2, 3);
        e.fillStyle(0xffffff, 0.7);
        for (let i = 0; i < grub.hp; i++) {
          e.fillRect(px - 8 + i * 8, py + 8, 5, 3);
        }
      }

      // Needlers (cyan/teal, distinct from Skulk)
      for (const n of this.needlers) {
        if (!n.alive) continue;
        const px = n.x * TILE + TILE / 2;
        const py = n.y * TILE + TILE / 2;
        const col = n.hp < 2 ? C.needlerHurt : C.needler;
        e.fillStyle(col, 1);
        // diamond / needle silhouette
        e.fillTriangle(px, py - 16, px + 12, py, px, py + 16);
        e.fillTriangle(px, py - 16, px - 12, py, px, py + 16);
        e.fillStyle(C.needlerEye, 1);
        e.fillCircle(px, py - 2, 3);
        e.fillStyle(0xffffff, 0.75);
        for (let i = 0; i < n.hp; i++) {
          e.fillRect(px - 8 + i * 8, py + 10, 5, 3);
        }
      }

      // Bolts (tiny VFX)
      for (const b of this.bolts) {
        const px = b.x * TILE + TILE / 2;
        const py = b.y * TILE + TILE / 2;
        const a = Math.min(1, b.life / 6);
        e.fillStyle(b.color, a);
        e.fillCircle(px, py, 5);
        e.fillStyle(0xffffff, a * 0.8);
        e.fillCircle(px, py, 2);
      }

      // Player + facing notch
      const ppx = this.player.x * TILE + TILE / 2;
      const ppy = this.player.y * TILE + TILE / 2;
      e.fillStyle(C.playerEdge, 0.5);
      e.fillCircle(ppx, ppy, 18);
      e.fillStyle(C.player, 1);
      e.fillCircle(ppx, ppy, 14);
      e.fillStyle(0x1a1a10, 1);
      e.fillCircle(ppx - 4, ppy - 2, 2.5);
      e.fillCircle(ppx + 4, ppy - 2, 2.5);
      // Facing indicator (small wedge)
      const fdx = this.player.facing.dx;
      const fdy = this.player.facing.dy;
      const tipX = ppx + fdx * 16;
      const tipY = ppy + fdy * 16;
      const bx = ppx + fdx * 8;
      const by = ppy + fdy * 8;
      const ox = -fdy * 5;
      const oy = fdx * 5;
      e.fillStyle(0xf5e6a0, 0.95);
      e.fillTriangle(tipX, tipY, bx + ox, by + oy, bx - ox, by - oy);
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
