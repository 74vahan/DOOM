// ============================================================
// player.js — игрок: позиция, поворот, движение, здоровье.
// ============================================================

const Player = {
  x: 1.5,
  y: 1.5,
  angle: 0,        // куда смотрим, в радианах (0 = вправо по карте)
  hp: CONFIG.PLAYER_HP,
  alive: true,
  damageFlash: 0,  // таймер красной вспышки при получении урона

  // Полный сброс (новый забег): здоровье восстанавливается
  reset() {
    this.hp = CONFIG.PLAYER_HP;
    this.alive = true;
    this.respawn();
  },

  // Поставить на старт комнаты. HP НЕ трогаем —
  // здоровье переносится из комнаты в комнату
  respawn() {
    const s = GameMap.playerStart;
    this.x = s.x;
    this.y = s.y;
    this.angle = s.angle;
    this.damageFlash = 0;
  },

  // Движение за кадр. dt — время кадра в секундах.
  update(dt) {
    // Затухание вспышки урона (работает даже когда стоим на месте)
    if (this.damageFlash > 0) this.damageFlash = Math.max(0, this.damageFlash - dt * 2);

    if (!this.alive) return;

    // --- Поворот: стрелки + накопленное движение мыши ---
    if (Input.turnLeft)  this.angle -= CONFIG.PLAYER_TURN * dt;
    if (Input.turnRight) this.angle += CONFIG.PLAYER_TURN * dt;
    this.angle += Input.takeMouseDelta() * CONFIG.MOUSE_SENS;

    // --- Направление движения (вперёд/назад + стрейф) ---
    let mx = 0, my = 0;
    const cos = Math.cos(this.angle), sin = Math.sin(this.angle);
    if (Input.forward)  { mx += cos; my += sin; }
    if (Input.back)     { mx -= cos; my -= sin; }
    if (Input.strafeL)  { mx += sin; my -= cos; }   // влево = перпендикуляр взгляду
    if (Input.strafeR)  { mx -= sin; my += cos; }

    if (mx === 0 && my === 0) return;

    // Нормируем, чтобы по диагонали не бегать быстрее
    const len = Math.hypot(mx, my);
    const step = CONFIG.PLAYER_SPEED * dt;
    mx = (mx / len) * step;
    my = (my / len) * step;

    // Скольжение вдоль стен: оси двигаем по отдельности —
    // если по X упёрлись, по Y всё равно едем.
    if (!GameMap.collides(this.x + mx, this.y, CONFIG.PLAYER_RADIUS)) this.x += mx;
    if (!GameMap.collides(this.x, this.y + my, CONFIG.PLAYER_RADIUS)) this.y += my;
  },

  takeDamage(amount) {
    if (!this.alive) return;
    this.hp -= amount;
    this.damageFlash = 0.6; // красная вспышка на экране
    Music.sfx('playerHurt');
    if (this.hp <= 0) {
      this.hp = 0;
      this.alive = false;
    }
  },

  heal(amount) {
    this.hp = Math.min(CONFIG.PLAYER_HP, this.hp + amount);
  },
};
