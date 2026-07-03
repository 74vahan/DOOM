// ============================================================
// weapon.js — дробовик: стрельба, урон, отрисовка.
// Выстрел — "hitscan": мгновенный луч вперёд. Если враг в узком
// конусе прицела ближе, чем стена, — попадание.
// ============================================================

const Weapon = {
  ammo: CONFIG.START_AMMO,
  cooldown: 0,   // время до следующего выстрела
  flash: 0,      // таймер вспышки выстрела
  bobTime: 0,    // покачивание оружия при ходьбе

  reset() {
    this.ammo = CONFIG.START_AMMO;
    this.cooldown = 0;
    this.flash = 0;
    this.bobTime = 0;
  },

  update(dt) {
    if (this.cooldown > 0) this.cooldown -= dt;
    if (this.flash > 0) this.flash -= dt;

    // Покачивание только когда идём
    const moving = Input.forward || Input.back || Input.strafeL || Input.strafeR;
    if (moving) this.bobTime += dt;

    if (Input.shoot && this.cooldown <= 0 && Player.alive) this.fire();
  },

  fire() {
    if (this.ammo <= 0) return;   // щёлк — патронов нет
    this.ammo--;
    this.cooldown = CONFIG.WEAPON_COOLDOWN;
    this.flash = 0.09;

    // Куда долетит луч, если врагов нет — до этой стены
    const wall = Raycaster.castRay(Player.x, Player.y, Player.angle);

    // Ищем ближайшего врага в конусе прицела
    let target = null;
    let targetDist = Infinity;
    for (const e of Enemies.list) {
      if (!e.alive) continue;
      const dx = e.x - Player.x;
      const dy = e.y - Player.y;
      const dist = Math.hypot(dx, dy);
      if (dist > CONFIG.WEAPON_RANGE || dist > wall.dist) continue; // далеко или за стеной

      // Угол между взглядом и направлением на врага.
      // Чем ближе враг, тем шире он "виден" — atan(радиус/дистанция).
      const rel = Math.abs(normAngle(Math.atan2(dy, dx) - Player.angle));
      const hitCone = Math.atan((CONFIG.ENEMY_RADIUS + 0.12) / dist);
      if (rel < hitCone && dist < targetDist) {
        target = e;
        targetDist = dist;
      }
    }

    if (target) {
      // Дробовик слабеет с расстоянием: в упор 100%, на пределе 50%
      const falloff = 1 - (targetDist / CONFIG.WEAPON_RANGE) * 0.5;
      Enemies.damage(target, Math.round(CONFIG.WEAPON_DAMAGE * falloff));
    }
  },

  // Рисуем дробовик внизу экрана (простыми прямоугольниками)
  draw(ctx) {
    const W = CONFIG.SCREEN_W;
    const baseY = CONFIG.VIEW_H;   // низ 3D-вида (над HUD)

    // Покачивание при ходьбе + отдача после выстрела
    const bobX = Math.sin(this.bobTime * 7) * 4;
    const bobY = Math.abs(Math.cos(this.bobTime * 7)) * 3;
    const recoil = this.cooldown > CONFIG.WEAPON_COOLDOWN - 0.15 ? 6 : 0;
    const cx = W / 2 + bobX;
    const gy = baseY - 34 + bobY + recoil;

    // Вспышка выстрела
    if (this.flash > 0) {
      ctx.fillStyle = 'rgba(255, 220, 120, 0.9)';
      ctx.beginPath();
      ctx.arc(cx, gy + 2, 10 + Math.random() * 4, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ствол
    ctx.fillStyle = '#3a3a3a';
    ctx.fillRect(cx - 5, gy, 10, 16);
    ctx.fillStyle = '#242424';
    ctx.fillRect(cx - 5, gy, 3, 16);      // тень на стволе
    // Дуло
    ctx.fillStyle = '#141414';
    ctx.fillRect(cx - 4, gy - 2, 8, 3);
    // Цевьё (деревянное)
    ctx.fillStyle = '#6a4020';
    ctx.fillRect(cx - 7, gy + 16, 14, 10);
    ctx.fillStyle = '#4a2c14';
    ctx.fillRect(cx - 7, gy + 22, 14, 4);
    // Руки по бокам
    ctx.fillStyle = '#c89060';
    ctx.fillRect(cx - 13, gy + 20, 6, 14);
    ctx.fillRect(cx + 7, gy + 20, 6, 14);
  },
};
