// ============================================================
// enemies.js — враги (демоны) и подбираемые предметы.
// Спрайты рисуются кодом из "пиксельных рисунков" — никаких
// внешних картинок. ИИ простой: стоит -> заметил -> догоняет ->
// бьёт вблизи.
// ============================================================

// Привести угол к диапазону [-PI, PI] (иначе сравнения углов ломаются)
function normAngle(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

const Enemies = {
  list: [],     // живые и мёртвые враги
  pickups: [],  // аптечки и патроны на полу
  sprites: {},  // готовые канвасы со спрайтами

  // --- Пиксельные рисунки (каждый символ = 1 пиксель) ---
  // Точка = прозрачно. Буквы = цвета из PALETTE ниже.
  DEMON_FRAMES: [
    [ // кадр 1 — шаг левой
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
    [ // кадр 2 — шаг правой
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
      '..r..' + '..' + '.rr..',
      '..d..' + '..' + '..d..',
    ],
  ],
  MEDKIT_ART: [
    'wwwwwwww',
    'ww.rr.ww',
    'w..rr..w',
    'wrrrrrrw',
    'wrrrrrrw',
    'w..rr..w',
    'ww.rr.ww',
    'wwwwwwww',
  ],
  AMMO_ART: [
    'dddddddd',
    'dyyyyyyd',
    'dyddddyd',
    'dydyyyyd',
    'dyyyydyd',
    'dyddddyd',
    'dyyyyyyd',
    'dddddddd',
  ],
  PALETTE: {
    r: '#a83020',  // красная плоть демона
    d: '#5a1c10',  // тёмные детали / копыта
    e: '#ffd020',  // жёлтые глаза
    h: '#d8d0c0',  // рога
    w: '#e8e0d0',  // зубы / белый корпус аптечки
    y: '#d8a020',  // латунь патронов
  },

  // Превратить "рисунок" в canvas (вызывается один раз)
  buildSprite(art, palette) {
    const c = document.createElement('canvas');
    c.width = art[0].length;
    c.height = art.length;
    const g = c.getContext('2d');
    art.forEach((row, y) => {
      for (let x = 0; x < row.length; x++) {
        const color = palette[row[x]];
        if (!color) continue; // '.' — прозрачный пиксель
        g.fillStyle = color;
        g.fillRect(x, y, 1, 1);
      }
    });
    return c;
  },

  init() {
    // Обычные спрайты
    this.sprites.demon = this.DEMON_FRAMES.map((f) => this.buildSprite(f, this.PALETTE));
    // "Раненый" вариант — та же форма, но белая вспышка
    const hurtPalette = {};
    for (const k of Object.keys(this.PALETTE)) hurtPalette[k] = '#ffffff';
    this.sprites.demonHurt = this.DEMON_FRAMES.map((f) => this.buildSprite(f, hurtPalette));
    this.sprites.medkit = this.buildSprite(this.MEDKIT_ART, this.PALETTE);
    this.sprites.ammo = this.buildSprite(this.AMMO_ART, this.PALETTE);
  },

  // Расставить врагов и предметы по карте (при старте/рестарте)
  reset() {
    this.list = GameMap.enemySpawns.map((s) => ({
      x: s.x, y: s.y,
      hp: CONFIG.ENEMY_HP,
      alive: true,
      state: 'idle',        // idle -> chase
      attackTimer: 0,
      hurtTimer: 0,         // белая вспышка при попадании
      animTime: Math.random() * 10, // чтобы враги не шагали синхронно
    }));
    this.pickups = GameMap.pickupSpawns.map((p) => ({ ...p, taken: false }));
  },

  aliveCount() {
    return this.list.filter((e) => e.alive).length;
  },

  // Видит ли враг игрока (нет ли стены между ними)
  canSee(e, dist) {
    const angleToPlayer = Math.atan2(Player.y - e.y, Player.x - e.x);
    const ray = Raycaster.castRay(e.x, e.y, angleToPlayer);
    return ray.dist > dist; // стена дальше игрока => игрок виден
  },

  update(dt) {
    // --- Враги ---
    for (const e of this.list) {
      if (!e.alive) continue;
      e.animTime += dt;
      if (e.hurtTimer > 0) e.hurtTimer -= dt;
      if (e.attackTimer > 0) e.attackTimer -= dt;

      const dx = Player.x - e.x;
      const dy = Player.y - e.y;
      const dist = Math.hypot(dx, dy);

      if (e.state === 'idle') {
        // Заметил игрока — начинает охоту
        if (dist < CONFIG.ENEMY_AGGRO_DIST && this.canSee(e, dist)) e.state = 'chase';
        continue;
      }

      // state === 'chase': идём к игроку
      if (dist > CONFIG.ENEMY_ATTACK_DIST * 0.8) {
        const step = CONFIG.ENEMY_SPEED * dt;
        const mx = (dx / dist) * step;
        const my = (dy / dist) * step;
        // То же скольжение вдоль стен, что и у игрока
        if (!GameMap.collides(e.x + mx, e.y, CONFIG.ENEMY_RADIUS)) e.x += mx;
        if (!GameMap.collides(e.x, e.y + my, CONFIG.ENEMY_RADIUS)) e.y += my;
      }

      // Достаточно близко — удар когтями
      if (dist < CONFIG.ENEMY_ATTACK_DIST && e.attackTimer <= 0 && Player.alive) {
        const dmg = CONFIG.ENEMY_DAMAGE_MIN +
          Math.random() * (CONFIG.ENEMY_DAMAGE_MAX - CONFIG.ENEMY_DAMAGE_MIN);
        Player.takeDamage(Math.round(dmg));
        e.attackTimer = CONFIG.ENEMY_ATTACK_COOLDOWN;
      }
    }

    // --- Предметы: подобрать, если игрок рядом ---
    for (const p of this.pickups) {
      if (p.taken) continue;
      if (Math.hypot(Player.x - p.x, Player.y - p.y) < CONFIG.PICKUP_RADIUS) {
        if (p.kind === 'medkit') Player.heal(CONFIG.MEDKIT_HEAL);
        if (p.kind === 'ammo') Weapon.ammo += CONFIG.AMMO_PACK;
        p.taken = true;
        Game.addScore(CONFIG.SCORE_PICKUP);
      }
    }
  },

  // Попадание по врагу из оружия
  damage(e, amount) {
    e.hp -= amount;
    e.hurtTimer = 0.12;   // короткая белая вспышка
    e.state = 'chase';    // разбудить, даже если не видел игрока
    if (e.hp <= 0) {
      e.alive = false;
      Game.addScore(CONFIG.SCORE_KILL);
    }
  },

  // Собрать всё, что нужно нарисовать как спрайты
  getDrawables() {
    const items = [];
    for (const e of this.list) {
      if (!e.alive) continue;
      const frame = Math.floor(e.animTime * 4) % 2; // анимация шага
      const img = e.hurtTimer > 0
        ? this.sprites.demonHurt[frame]
        : this.sprites.demon[frame];
      items.push({ x: e.x, y: e.y, img, worldH: 0.75 });
    }
    for (const p of this.pickups) {
      if (p.taken) continue;
      items.push({ x: p.x, y: p.y, img: this.sprites[p.kind], worldH: 0.3 });
    }
    return items;
  },
};
