// ============================================================
// map.js — карта уровня.
// Уровень задаётся "рисунком" из символов:
//   0     — пустой пол
//   1..4  — стены разных цветов (см. CONFIG.WALL_COLORS)
//   P     — старт игрока
//   E     — враг
//   A     — коробка патронов
//   M     — аптечка
// Одна клетка = 1 единица игрового мира.
// ============================================================

const GameMap = {
  // Уровень 24 x 20 клеток
  LAYOUT: [
    '111111111111111111111111',
    '1P0000000000000000000001',
    '100000000000000000000E01',
    '100033300002200033300001',
    '100030000002200000030001',
    '1000300E0002200E00030M01',
    '100000000000000000000001',
    '100000000000000000000001',
    '122200004444440000222001',
    '100000000000000000000001',
    '10A00000E000000000E00001',
    '100000000000000000000001',
    '100444000033000044400001',
    '100400000033000000400M01',
    '100400000033000E00400001',
    '100000000000000000000001',
    '10000000E0000000000A0001',
    '1000000000E0000000000A01',
    '1000000000000000E0000001',
    '111111111111111111111111',
  ],

  W: 0,
  H: 0,
  grid: [],          // числовая сетка: 0 пусто, 1-4 стены
  playerStart: { x: 1.5, y: 1.5, angle: 0 },
  enemySpawns: [],   // [{x, y}]
  pickupSpawns: [],  // [{x, y, kind: 'ammo'|'medkit'}]

  // Разбор "рисунка" в данные. Вызывается один раз при старте.
  init() {
    this.H = this.LAYOUT.length;
    this.W = this.LAYOUT[0].length;
    this.grid = [];
    this.enemySpawns = [];
    this.pickupSpawns = [];

    for (let y = 0; y < this.H; y++) {
      const row = this.LAYOUT[y];
      if (row.length !== this.W) {
        throw new Error(`Карта: строка ${y} имеет длину ${row.length}, ожидалось ${this.W}`);
      }
      const line = [];
      for (let x = 0; x < this.W; x++) {
        const ch = row[x];
        const cx = x + 0.5, cy = y + 0.5; // центр клетки
        if (ch >= '1' && ch <= '4') {
          line.push(Number(ch));
          continue;
        }
        line.push(0); // всё остальное — проходимый пол
        if (ch === 'P') this.playerStart = { x: cx, y: cy, angle: 0 };
        if (ch === 'E') this.enemySpawns.push({ x: cx, y: cy });
        if (ch === 'A') this.pickupSpawns.push({ x: cx, y: cy, kind: 'ammo' });
        if (ch === 'M') this.pickupSpawns.push({ x: cx, y: cy, kind: 'medkit' });
      }
      this.grid.push(line);
    }
  },

  // Тип клетки по ЦЕЛЫМ координатам. За границей карты — стена.
  tile(mx, my) {
    if (mx < 0 || my < 0 || mx >= this.W || my >= this.H) return 1;
    return this.grid[my][mx];
  },

  // Занята ли точка мира (дробные координаты) стеной
  isWall(x, y) {
    return this.tile(Math.floor(x), Math.floor(y)) > 0;
  },

  // Столкновение круга радиуса r со стенами.
  // Проверяем все клетки, которых касается круг.
  collides(x, y, r) {
    const x0 = Math.floor(x - r), x1 = Math.floor(x + r);
    const y0 = Math.floor(y - r), y1 = Math.floor(y + r);
    for (let my = y0; my <= y1; my++) {
      for (let mx = x0; mx <= x1; mx++) {
        if (this.tile(mx, my) > 0) return true;
      }
    }
    return false;
  },
};
