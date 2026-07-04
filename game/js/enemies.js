// ============================================================
// enemies.js — враги четырёх типов и подбираемые предметы.
//   имп (E)      — обычный, ближний бой
//   пинки (F)    — быстрый и толстый, ближний бой
//   какодемон (C)— летает, стреляет огненными шарами
//   барон (B)    — танк: много HP, бьёт и стреляет
// Спрайты рисуются кодом из "пиксельных рисунков".
// ============================================================

// Привести угол к диапазону [-PI, PI]
function normAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

const Enemies = {
  list: [],
  pickups: [],
  projectiles: [],  // летящие шары какодемонов и баронов
  sprites: {},

  // --- Пиксельные рисунки (символ = пиксель, '.' = прозрачно) ---
  ART: {
    imp: [
      'h....' + '..' + '....h',
      '.h...' + '..' + '...h.',
      '..rrr' + 'rr' + 'rrr..',
      '.rrrr' + 'rr' + 'rrrr.',
      '.ree.' + 'rr' + '.eer.',
      '.rrrr' + 'rr' + 'rrrr.',
      '..rww' + 'ww' + 'wwr..',
      '..rrr' + 'rr' + 'rrr..',
      '.dd.r' + 'rr' + 'r.dd.',
      '....r' + 'rr' + 'r....',
      '...rr' + '..' + 'rr...',
      '...r.' + '..' + '.r...',
      '..rr.' + '..' + '..r..',
      '..d..' + '..' + '..d..',
    ],
    pinky: [
      '..pppp....pppp..',
      '.pppppp..pppppp.',
      '.ppppppppppppppp',
      'pp.ee.pppp.ee.pp',
      'pppppppppppppppp',
      'pp.wwwwwwwwww.pp',
      'ppw.w.w.ww.w.wpp',
      '.pppppppppppppp.',
      '..pppppppppppp..',
      '..pp..pppp..pp..',
      '..dd..pppp..dd..',
      '......pp.pp.....',
      '.....dd...dd....',
    ],
    caco: [
      '....rrrrrrrr....',
      '..rrrrrrrrrrrr..',
      '.rrrrr.ee.rrrrr.',
      '.rrrrr.ee.rrrrr.',
      'rrrrrrrrrrrrrrrr',
      'rrrrrrrrrrrrrrrr',
      'rr.w.w.w.w.w.wrr',
      '.rrwwwwwwwwwwrr.',
      '.rrrrrrrrrrrrrr.',
      '..rrrrrrrrrrrr..',
      '....rrrrrrrr....',
    ],
    baron: [
      'h.....' + '..' + '.....h',
      '.hh...' + '..' + '...hh.',
      '..ggg.' + 'gg' + '.ggg..',
      '..gggg' + 'gg' + 'gggg..',
      '..gee.' + 'gg' + '.eeg..',
      '..gggg' + 'gg' + 'gggg..',
      '...gww' + 'ww' + 'wwg...',
      '..gggg' + 'gg' + 'gggg..',
      '.dd.gg' + 'gg' + 'gg.dd.',
      '.d..gg' + 'gg' + 'gg..d.',
      '....gg' + 'gg' + 'gg....',
      '....gg' + '..' + 'gg....',
      '....g.' + '..' + '.g....',
      '...dd.' + '..' + '.dd...',
    ],
    medkit: [
      'wwwwwwww',
      'ww.rr.ww',
      'w..rr..w',
      'wrrrrrrw',
      'wrrrrrrw',
      'w..rr..w',
      'ww.rr.ww',
      'wwwwwwww',
    ],
    ammo: [
      'dddddddd',
      'dyyyyyyd',
      'dyddddyd',
      'dydyyyyd',
      'dyyyydyd',
      'dyddddyd',
      'dyyyyyyd',
      'dddddddd',
    ],
    fireball: [
      '..oo..',
      '.oyyo.',
      'oyywyo',
      'oywyyo',
      '.oyyo.',
      '..oo..',
    ],
  },
  PALETTE: {
    r: '#a83020',  // красная плоть
    p: '#c06878',  // розовая шкура пинки
    g: '#6a7a3a',  // зелёная шкура барона
    d: '#4a2018',  // тёмные детали / копыта
    e: '#ffd020',  // глаза
    h: '#d8d0c0',  // рога
    w: '#e8e0d0',  // зубы / корпус аптечки
    y: '#ffd040',  // латунь / огонь
    o: '#ff6010',  // край огненного шара
  },

  buildSprite(art, palette) {
    const c = document.createElement('canvas');
    c.width = art[0].length;
    c.height = art.length;
    const g = c.getContext('2d');
    art.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = palette[row[x]];
        if (!color) continue;
        g.fillStyle = color;
        g.fillRect(x, y, 1, 1);
      }
    });
    return c;
  },

  init() {
    // Обычный + белый "раненый" вариант каждого спрайта
    const hurt = {};
    for (const k of Object.keys(this.PALETTE)) hurt[k] = '#ffffff';
    for (const name of Object.keys(this.ART)) {
      this.sprites[name] = this.buildSprite(this.ART[name], this.PALETTE);
      this.sprites[name + 'Hurt'] = this.buildSprite(this.ART[name], hurt);
    }
    // Зелёный шар барона
    const greenFire = { ...this.PALETTE, o: '#20a020', y: '#60ff60', w: '#d0ffd0' };
    this.sprites.greenball = this.buildSprite(this.ART.fireball, greenFire);
  },

  // Расставить врагов и предметы текущего уровня
  reset() {
    this.list = GameMap.enemySpawns.map((s) => {
      const t = CONFIG.ENEMY_TYPES[s.type];
      return {
        x: s.x, y: s.y,
        type: s.type,
        hp: t.hp,
        alive: true,
        state: 'idle',
        attackTimer: 0,
        rangedTimer: 1 + Math.random(),  // чтобы не стреляли залпом
        hurtTimer: 0,
        animTime: Math.random() * 10,
      };
    });
    this.pickups = GameMap.pickupSpawns.map((p) => ({ ...p, taken: false }));
    this.projectiles = [];
  },

  aliveCount() {
    return this.list.filter((e) => e.alive).length;
  },

  canSee(e, dist) {
    const angleToPlayer = Math.atan2(Player.y - e.y, Player.x - e.x);
    const ray = Raycaster.castRay(e.x, e.y, angleToPlayer);
    return ray.dist > dist;
  },

  update(dt) {
    // --- Враги ---
    for (const e of this.list) {
      if (!e.alive) continue;
      const t = CONFIG.ENEMY_TYPES[e.type];
      e.animTime += dt;
      if (e.hurtTimer > 0) e.hurtTimer -= dt;
      if (e.attackTimer > 0) e.attackTimer -= dt;
      if (e.rangedTimer > 0) e.rangedTimer -= dt;

      const dx = Player.x - e.x;
      const dy = Player.y - e.y;
      const dist = Math.hypot(dx, dy);

      if (e.state === 'idle') {
        if (dist < t.aggro && this.canSee(e, dist)) e.state = 'chase';
        continue;
      }

      // Погоня (стрелки́ держат дистанцию ~3 клетки)
      const wantClose = t.ranged ? 3.0 : t.attackDist * 0.8;
      if (dist > wantClose) {
        const step = t.speed * dt;
        const mx = (dx / dist) * step;
        const my = (dy / dist) * step;
        if (!GameMap.collides(e.x + mx, e.y, t.radius)) e.x += mx;
        if (!GameMap.collides(e.x, e.y + my, t.radius)) e.y += my;
      }

      // Ближний удар
      if (!t.ranged || e.type === 'baron') {
        if (dist < t.attackDist && e.attackTimer <= 0 && Player.alive) {
          const dmg = t.dmgMin + Math.random() * (t.dmgMax - t.dmgMin);
          Player.takeDamage(Math.round(dmg));
          e.attackTimer = t.cooldown;
        }
      }

      // Выстрел шаром (какодемон, барон)
      if (t.ranged && Player.alive && e.rangedTimer <= 0 &&
          dist < t.aggro && dist > 1.5 && this.canSee(e, dist)) {
        const speed = t.projSpeed;
        this.projectiles.push({
          x: e.x, y: e.y,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          dmg: e.type === 'baron' ? t.rangedDmg : (t.dmgMin + Math.random() * (t.dmgMax - t.dmgMin)),
          img: e.type === 'baron' ? 'greenball' : 'fireball',
        });
        e.rangedTimer = e.type === 'baron' ? t.rangedCooldown : t.cooldown;
        Music.sfx('fireball');
      }
    }

    // --- Летящие шары ---
    for (const p of this.projectiles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (GameMap.isWall(p.x, p.y)) { p.dead = true; continue; }
      if (Player.alive && Math.hypot(Player.x - p.x, Player.y - p.y) < CONFIG.PROJECTILE_RADIUS) {
        Player.takeDamage(Math.round(p.dmg));
        p.dead = true;
      }
    }
    this.projectiles = this.projectiles.filter((p) => !p.dead);

    // --- Предметы ---
    for (const p of this.pickups) {
      if (p.taken) continue;
      if (Math.hypot(Player.x - p.x, Player.y - p.y) < CONFIG.PICKUP_RADIUS) {
        if (p.kind === 'medkit') Player.heal(CONFIG.MEDKIT_HEAL);
        if (p.kind === 'ammo') Weapon.ammo += CONFIG.AMMO_PACK;
        p.taken = true;
        Game.addScore(CONFIG.SCORE_PICKUP);
        Music.sfx('pickup');
      }
    }
  },

  // Попадание по врагу из оружия
  damage(e, amount) {
    const t = CONFIG.ENEMY_TYPES[e.type];
    e.hp -= amount;
    e.hurtTimer = 0.12;
    e.state = 'chase';
    if (e.hp <= 0) {
      e.alive = false;
      Game.addScore(t.score);
      Music.sfx('enemyDie');
    }
  },

  // Всё, что рисуется как спрайт: враги, предметы, шары
  getDrawables() {
    const items = [];
    for (const e of this.list) {
      if (!e.alive) continue;
      const t = CONFIG.ENEMY_TYPES[e.type];
      const frame = Math.floor(e.animTime * 4) % 2;
      const base = this.sprites[e.hurtTimer > 0 ? e.type + 'Hurt' : e.type];
      // Какодемон плавно "покачивается" в воздухе
      const bob = e.type === 'caco' ? Math.sin(e.animTime * 2) * 0.06 : 0;
      items.push({
        x: e.x, y: e.y, img: base,
        worldH: t.worldH * (frame ? 1 : 0.97),  // лёгкая анимация шага
        yOff: t.yOff + bob,
      });
    }
    for (const p of this.pickups) {
      if (p.taken) continue;
      items.push({ x: p.x, y: p.y, img: this.sprites[p.kind], worldH: 0.3, yOff: 0 });
    }
    for (const p of this.projectiles) {
      items.push({ x: p.x, y: p.y, img: this.sprites[p.img], worldH: 0.25, yOff: 0.4 });
    }
    return items;
  },
};
