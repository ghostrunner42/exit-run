          .setVisible(false);
        pool.push(s);
      }
    }

    redraw() {
      const e = this.entityLayer;
      e.clear();

      // Tiles: wall→1, floor→grate 0, exit→airlock 3
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const t = this.map[y][x];
          const s = this.tileSprites[y][x];
          if (t === WALL) s.setFrame(1);
          else if (t === EXIT) s.setFrame(3);
          else s.setFrame(0);
        }
      }

      // Plasma Fang — simple drawn gem (no sheet art)
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

      const aliveSkulks = this.grubs.filter((g) => g.alive);
      this.ensurePool(this.skulkSprites, aliveSkulks.length, "skulk", 4);
      for (let i = 0; i < this.skulkSprites.length; i++) {
        const s = this.skulkSprites[i];
        if (i >= aliveSkulks.length) {
          s.setVisible(false);
          continue;
        }
        const grub = aliveSkulks[i];
        const row = grub.faceDx < 0 ? 1 : 0;
        const frame = row * 4 + (grub.walkFrame | 0);
        s.setPosition(grub.x * TILE + TILE / 2, grub.y * TILE + TILE / 2);
        s.setFrame(frame);
        s.setAlpha(grub.hp < 2 ? 0.75 : 1);
        s.setVisible(true);
      }

      const aliveNeedlers = this.needlers.filter((n) => n.alive);
      this.ensurePool(this.needlerSprites, aliveNeedlers.length, "needler", 4);
      for (let i = 0; i < this.needlerSprites.length; i++) {
        const s = this.needlerSprites[i];
        if (i >= aliveNeedlers.length) {
          s.setVisible(false);
          continue;
        }
        const n = aliveNeedlers[i];
        const row = facingRow(n.faceDx || 0, n.faceDy || 1);
        const col = n.shootFlash > 0 ? 1 : 0;
        s.setPosition(n.x * TILE + TILE / 2, n.y * TILE + TILE / 2);
        s.setFrame(row * 2 + col);
        s.setAlpha(n.hp < 2 ? 0.75 : 1);
        s.setVisible(true);
      }

      this.ensurePool(this.boltSprites, this.bolts.length, "bolt", 7);
      for (let i = 0; i < this.boltSprites.length; i++) {
        const s = this.boltSprites[i];
        if (i >= this.bolts.length) {
          s.setVisible(false);
          continue;
        }
        const b = this.bolts[i];
        const a = Math.min(1, b.life / 6);
        s.setPosition(b.x * TILE + TILE / 2, b.y * TILE + TILE / 2);
        s.setFrame(boltFrame(b.dx, b.dy, b.impact));
        s.setAlpha(a);
        s.setVisible(true);
      }

      const { dx, dy } = this.player.facing;
      const prow = facingRow(dx, dy);
      let pcol = 0;
      if (this.playerShootFlash > 0) pcol = 5;
      else if (this._lastActionWasMove) pcol = (this.playerWalkTick % 4) + 1;

      this.playerSprite.setPosition(
        this.player.x * TILE + TILE / 2,
        this.player.y * TILE + TILE / 2
      );
      this.playerSprite.setFrame(prow * 6 + pcol);
      this.playerSprite.setVisible(true);

      for (const grub of aliveSkulks) {
        const px = grub.x * TILE + TILE / 2;
        const py = grub.y * TILE + TILE / 2;
        e.fillStyle(0xffffff, 0.7);
        for (let i = 0; i < grub.hp; i++) {
          e.fillRect(px - 8 + i * 8, py + TILE / 2 - 6, 5, 3);
        }
      }
      for (const n of aliveNeedlers) {
        const px = n.x * TILE + TILE / 2;
        const py = n.y * TILE + TILE / 2;
        e.fillStyle(0xffffff, 0.75);
        for (let i = 0; i < n.hp; i++) {
          e.fillRect(px - 8 + i * 8, py + TILE / 2 - 6, 5, 3);
        }
      }
    }
  }

  const config = {
    type: Phaser.AUTO,
    width: W,
    height: H + HUD_H,
    parent: "game-container",
    backgroundColor: "#0a0a0f",
    scene: ExitRunScene,
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
