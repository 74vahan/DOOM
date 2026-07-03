// ============================================================
// ui.js — HUD (панель внизу) и оверлей конца игры.
// HUD рисуется на канвасе, оверлей — обычный HTML поверх.
// ============================================================

const UI = {
  overlay: null,
  overlayTitle: null,
  overlayScore: null,
  nameForm: null,

  init() {
    this.overlay = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayScore = document.getElementById('overlay-score');
    this.nameForm = document.getElementById('name-form');

    // Кнопка "Играть снова"
    document.getElementById('restart').addEventListener('click', () => Game.reset());
    // Кнопка "Сохранить рекорд"
    document.getElementById('save-score').addEventListener('click', () => {
      const name = document.getElementById('player-name').value.trim() || 'DOOMGUY';
      ScoreAPI.submit(name, Game.score);
    });
  },

  // --- Панель HUD внизу канваса ---
  drawHud(ctx) {
    const W = CONFIG.SCREEN_W;
    const top = CONFIG.VIEW_H;
    const H = CONFIG.HUD_H;

    // Фон панели с "заклёпками" как в DOOM
    ctx.fillStyle = '#2e2620';
    ctx.fillRect(0, top, W, H);
    ctx.fillStyle = '#4a3c30';
    ctx.fillRect(0, top, W, 2);

    ctx.textBaseline = 'top';

    // Здоровье
    this.label(ctx, 'HP', 14, top + 5);
    ctx.fillStyle = Player.hp > 33 ? '#d84030' : '#ff2010';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(`${Player.hp}%`, 14, top + 15);

    // Патроны
    this.label(ctx, 'AMMO', 78, top + 5);
    ctx.fillStyle = Weapon.ammo > 0 ? '#d8a030' : '#804020';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(String(Weapon.ammo), 78, top + 15);

    // Лицо героя по центру
    this.drawFace(ctx, W / 2 - 10, top + 6);

    // Осталось врагов
    this.label(ctx, 'MONSTERS', 196, top + 5);
    ctx.fillStyle = '#c0b0a0';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(String(Enemies.aliveCount()), 196, top + 15);

    // Счёт
    this.label(ctx, 'SCORE', 252, top + 5);
    ctx.fillStyle = '#d8c040';
    ctx.font = 'bold 16px monospace';
    ctx.fillText(String(Game.score), 252, top + 15);
  },

  label(ctx, text, x, y) {
    ctx.fillStyle = '#8a7a6a';
    ctx.font = '8px monospace';
    ctx.fillText(text, x, y);
  },

  // Лицо в стиле DOOM: чем меньше HP, тем более побитое
  drawFace(ctx, x, y) {
    const hp = Player.hp;
    // Кожа: здоровая -> окровавленная
    ctx.fillStyle = hp > 66 ? '#c89060' : hp > 33 ? '#b87850' : '#a05038';
    ctx.fillRect(x, y, 20, 24);
    // Волосы
    ctx.fillStyle = '#5a3818';
    ctx.fillRect(x, y, 20, 5);
    // Глаза (при смерти — закрыты)
    ctx.fillStyle = Player.alive ? '#fff' : '#802020';
    ctx.fillRect(x + 3, y + 8, 5, Player.alive ? 4 : 1);
    ctx.fillRect(x + 12, y + 8, 5, Player.alive ? 4 : 1);
    if (Player.alive) {
      ctx.fillStyle = '#203040';
      ctx.fillRect(x + 5, y + 9, 2, 3);
      ctx.fillRect(x + 14, y + 9, 2, 3);
    }
    // Рот: улыбка/гримаса
    ctx.fillStyle = hp > 33 ? '#503020' : '#801818';
    ctx.fillRect(x + 5, y + 18, 10, 2);
    // Кровь при малом HP
    if (hp <= 66) {
      ctx.fillStyle = '#901810';
      ctx.fillRect(x + 2, y + 13, 3, 6);
      if (hp <= 33) ctx.fillRect(x + 14, y + 5, 4, 9);
    }
  },

  // --- Оверлей конца игры ---
  showEnd(victory) {
    this.overlayTitle.textContent = victory ? 'УРОВЕНЬ ЗАЧИЩЕН!' : 'ТЫ ПОГИБ';
    this.overlayTitle.style.color = victory ? '#c8a050' : '#b8352a';
    this.overlayScore.textContent = `Счёт: ${Game.score}`;
    this.nameForm.style.display = 'flex';
    document.getElementById('highscores').innerHTML = '';
    this.overlay.classList.remove('hidden');
    document.exitPointerLock();     // вернуть курсор игроку
    ScoreAPI.loadTop();             // сразу показать текущий топ
  },

  hideOverlay() {
    this.overlay.classList.add('hidden');
  },

  // Скрыть форму имени после сохранения рекорда
  hideNameForm() {
    this.nameForm.style.display = 'none';
  },
};
