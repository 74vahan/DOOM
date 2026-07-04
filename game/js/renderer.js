// ============================================================
// renderer.js — сборка кадра: потолок/пол, стены с "панелями"
// (как на техбазе классического DOOM), спрайты, минимапа.
// ============================================================

const Renderer = {
  ctx: null,
  W: 0,
  H: 0,
  palette: {},

  init(canvas) {
    this.ctx = canvas.getContext('2d');
    this.W = CONFIG.SCREEN_W;
    this.H = CONFIG.VIEW_H;
    for (const [tile, [main, dark]] of Object.entries(CONFIG.WALL_COLORS)) {
      this.palette[tile] = [this.hexToRgb(main), this.hexToRgb(dark)];
    }
  },

  hexToRgb(hex) {
    return [
      parseInt(hex.slice(1, 3), 16),
      parseInt(hex.slice(3, 5), 16),
      parseInt(hex.slice(5, 7), 16),
    ];
  },

  render() {
    const ctx = this.ctx;

    // --- 1. Потолок и пол: тёмные полосы дают глубину ---
    ctx.fillStyle = CONFIG.CEILING_COLOR;
    ctx.fillRect(0, 0, this.W, this.H / 2);
    ctx.fillStyle = CONFIG.FLOOR_COLOR;
    ctx.fillRect(0, this.H / 2, this.W, this.H / 2);
    // Лёгкое затемнение к горизонту (дальше = темнее)
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, this.H * 0.38, this.W, this.H * 0.24);

    // --- 2. Стены ---
    const rays = Raycaster.castAll(Player, this.W);
    const zbuffer = new Array(this.W);

    for (let x = 0; x < this.W; x++) {
      const r = rays[x];
      zbuffer[x] = r.perpDist;

      const lineH = Raycaster.projDist / r.perpDist;
      const y0 = (this.H - lineH) / 2;

      const [main, dark] = this.palette[r.tile] || this.palette[1];
      const base = r.side === 1 ? dark : main;
      let fog = Math.max(0.12, 1 - r.perpDist / CONFIG.FOG_DIST);

      // Вертикальный шов между панелями (2 панели на клетку)
      if ((r.wallX * 2) % 1 < 0.07) fog *= 0.65;

      ctx.fillStyle = `rgb(${(base[0] * fog) | 0},${(base[1] * fog) | 0},${(base[2] * fog) | 0})`;
      ctx.fillRect(x, y0, 1, lineH);

      // Горизонтальные линии панелей (только на близких стенах,
      // на дальних они всё равно не видны)
      if (lineH > 24) {
        ctx.fillStyle = `rgba(0,0,0,0.25)`;
        ctx.fillRect(x, y0 + lineH * 0.32, 1, Math.max(1, lineH * 0.02));
        ctx.fillRect(x, y0 + lineH * 0.66, 1, Math.max(1, lineH * 0.02));
        // Тёмная кромка сверху и снизу
        ctx.fillRect(x, y0, 1, Math.max(1, lineH * 0.04));
        ctx.fillRect(x, y0 + lineH * 0.96, 1, Math.max(1, lineH * 0.04));
      }
    }

    // --- 3. Спрайты (враги, предметы, летящие шары) ---
    this.drawSprites(zbuffer);

    // --- 4. Оружие ---
    Weapon.draw(ctx);

    // --- 5. Прицел ---
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillRect(this.W / 2 - 1, this.H / 2 - 4, 2, 8);
    ctx.fillRect(this.W / 2 - 4, this.H / 2 - 1, 8, 2);

    // --- 6. Красная вспышка при уроне ---
    if (Player.damageFlash > 0) {
      ctx.fillStyle = `rgba(200, 20, 10, ${Player.damageFlash * 0.5})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }

    // --- 7. Минимапа, HUD и игровые сообщения ---
    this.drawMinimap();
    UI.drawHud(ctx);
    UI.drawMessages(ctx);
  },

  drawSprites(zbuffer) {
    const ctx = this.ctx;
    const halfTan = Math.tan(CONFIG.FOV / 2);

    const items = Enemies.getDrawables()
      .map((s) => {
        const dx = s.x - Player.x;
        const dy = s.y - Player.y;
        return { ...s, dist: Math.hypot(dx, dy), rel: normAngle(Math.atan2(dy, dx) - Player.angle) };
      })
      .sort((a, b) => b.dist - a.dist);

    for (const s of items) {
      if (Math.abs(s.rel) > CONFIG.FOV / 2 + 0.4) continue;
      const perp = s.dist * Math.cos(s.rel);
      if (perp < 0.2) continue;

      const unit = Raycaster.projDist / perp;
      const h = unit * s.worldH;
      const w = h * (s.img.width / s.img.height);
      const centerX = (Math.tan(s.rel) / halfTan + 1) * 0.5 * this.W;
      const x0 = centerX - w / 2;
      // yOff поднимает спрайт над полом (какодемоны и шары летают)
      const yBottom = this.H / 2 + unit / 2 - unit * (s.yOff || 0);
      const y0 = yBottom - h;

      ctx.globalAlpha = Math.max(0.25, Math.min(1, 1.2 - perp / CONFIG.FOG_DIST));

      const startX = Math.max(0, Math.floor(x0));
      const endX = Math.min(this.W, Math.ceil(x0 + w));
      for (let sx = startX; sx < endX; sx++) {
        if (zbuffer[sx] <= perp) continue;
        const srcX = Math.floor(((sx - x0) / w) * s.img.width);
        ctx.drawImage(s.img, srcX, 0, 1, s.img.height, sx, y0, 1, h);
      }
      ctx.globalAlpha = 1;
    }
  },

  drawMinimap() {
    const ctx = this.ctx;
    const scale = 3;
    const mx = 6, my = 6;

    ctx.globalAlpha = 0.75;
    ctx.fillStyle = '#000';
    ctx.fillRect(mx - 2, my - 2, GameMap.W * scale + 4, GameMap.H * scale + 4);

    for (let y = 0; y < GameMap.H; y++) {
      for (let x = 0; x < GameMap.W; x++) {
        const t = GameMap.grid[y][x];
        if (t === 0) continue;
        ctx.fillStyle = CONFIG.WALL_COLORS[t] ? CONFIG.WALL_COLORS[t][0] : '#888';
        ctx.fillRect(mx + x * scale, my + y * scale, scale, scale);
      }
    }

    // Выход: мигает зелёным, когда дверь открыта
    if (GameMap.exitCell && GameMap.doorsOpen) {
      const blink = Math.floor(performance.now() / 300) % 2;
      ctx.fillStyle = blink ? '#40ff40' : '#208020';
      ctx.fillRect(mx + GameMap.exitCell.x * scale, my + GameMap.exitCell.y * scale, scale, scale);
    }

    ctx.fillStyle = '#ff4030';
    for (const e of Enemies.list) {
      if (e.alive) ctx.fillRect(mx + e.x * scale - 1, my + e.y * scale - 1, 2, 2);
    }

    const px = mx + Player.x * scale;
    const py = my + Player.y * scale;
    ctx.fillStyle = '#fff';
    ctx.fillRect(px - 1, py - 1, 3, 3);
    ctx.strokeStyle = '#fff';
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + Math.cos(Player.angle) * 5, py + Math.sin(Player.angle) * 5);
    ctx.stroke();

    ctx.globalAlpha = 1;
  },
};
