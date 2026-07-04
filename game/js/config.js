// ============================================================
// config.js — все настройки игры в одном месте.
// Хочешь поэкспериментировать — меняй числа здесь.
// ============================================================

const CONFIG = {
  // Внутреннее разрешение канваса (мало = крупные ретро-пиксели)
  SCREEN_W: 320,
  SCREEN_H: 200,
  HUD_H: 36,          // высота панели HUD внизу экрана
  // Высота 3D-вида (всё, что выше HUD)
  get VIEW_H() { return this.SCREEN_H - this.HUD_H; },

  FOV: (66 * Math.PI) / 180,   // угол обзора, 66° — как в классике

  // Игрок
  PLAYER_SPEED: 3.2,      // клеток в секунду
  PLAYER_TURN: 2.6,       // радиан в секунду (стрелки)
  MOUSE_SENS: 0.0026,     // чувствительность мыши
  PLAYER_RADIUS: 0.25,    // "толщина" игрока для столкновений
  PLAYER_HP: 100,

  // Оружие (дробовик)
  WEAPON_DAMAGE: 45,      // урон в упор
  WEAPON_RANGE: 12,       // дальше урона нет
  WEAPON_COOLDOWN: 0.55,  // секунд между выстрелами
  START_AMMO: 30,

  // Типы врагов. На карте: E=имп, F=пинки, C=какодемон, B=барон
  ENEMY_TYPES: {
    imp: {
      hp: 60,  speed: 1.5, radius: 0.30, worldH: 0.75, yOff: 0,
      aggro: 7,  attackDist: 1.1, dmgMin: 6,  dmgMax: 14, cooldown: 1.0,
      score: 100, ranged: false,
    },
    pinky: {  // быстрый и кусачий, только ближний бой
      hp: 100, speed: 2.7, radius: 0.34, worldH: 0.7,  yOff: 0,
      aggro: 8,  attackDist: 1.1, dmgMin: 10, dmgMax: 20, cooldown: 0.9,
      score: 150, ranged: false,
    },
    caco: {   // летает и плюётся огненными шарами
      hp: 120, speed: 1.0, radius: 0.38, worldH: 0.85, yOff: 0.3,
      aggro: 10, attackDist: 8,   dmgMin: 12, dmgMax: 18, cooldown: 2.2,
      score: 200, ranged: true,  projSpeed: 4.0, projColor: '#ff8020',
    },
    baron: {  // танк: много HP, больно бьёт и стреляет
      hp: 300, speed: 1.3, radius: 0.36, worldH: 0.95, yOff: 0,
      aggro: 10, attackDist: 1.3, dmgMin: 15, dmgMax: 25, cooldown: 1.2,
      score: 400, ranged: true,  projSpeed: 4.5, projColor: '#40ff40',
      rangedCooldown: 2.5, rangedDmg: 20,
    },
  },
  PROJECTILE_RADIUS: 0.3,   // попадание шара по игроку

  // Очки
  SCORE_PICKUP: 25,

  // Подбираемые предметы
  MEDKIT_HEAL: 25,
  AMMO_PACK: 10,
  PICKUP_RADIUS: 0.5,

  // Палитра стен: тип клетки -> [основной цвет, тёмная сторона]
  // 1 — серый металл (техбаза), 2 — зелёный металл (токсичный отсек),
  // 3 — ржавый кирпич (тоннели), 4 — красный кирпич (ад), 9 — дверь
  WALL_COLORS: {
    1: ['#6e6e72', '#4a4a4e'],
    2: ['#4a6a4a', '#324832'],
    3: ['#7a5030', '#523620'],
    4: ['#8a2f20', '#5e1f14'],
    9: ['#9a8a3a', '#6e6228'],  // запертая дверь — жёлтый металл
  },
  CEILING_COLOR: '#1c1c20',
  FLOOR_COLOR: '#33302a',
  FOG_DIST: 14,   // дальше этого расстояния всё уходит в темноту
};
