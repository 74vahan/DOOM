// ============================================================
// ui.js — HUD, игровые сообщения, экран входа и экран конца игры.
// HUD и баннеры рисуются на канвасе, оверлеи — обычный HTML.
// ============================================================

const UI = {
  overlay: null,
  overlayTitle: null,
  overlayScore: null,
  authOverlay: null,
  authError: null,

  init() {
    this.overlay = document.getElementById('overlay');
    this.overlayTitle = document.getElementById('overlay-title');
    this.overlayScore = document.getElementById('overlay-score');
    this.authOverlay = document.getElementById('auth-overlay');
    this.authError = document.getElementById('auth-error');

    document.getElementById('restart').addEventListener('click', () => Game.startRun());

    // --- Переключение вкладок Вход / Регистрация ---
    const tabs = document.querySelectorAll('.auth-tab');
    tabs.forEach((tab) => tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      tab.classList.add('active');
      const isRegister = tab.dataset.mode === 'register';
      document.getElementById('age-row').style.display = isRegister ? 'flex' : 'none';
      document.getElementById('auth-submit').textContent =
        isRegister ? 'Создать бойца' : 'В бой!';
      this.authError.textContent = '';
    }));

    // --- Кнопка входа/регистрации ---
    document.getElementById('auth-submit').addEventListener('click', () => this.submitAuth());
    // Enter в любом поле формы = нажать кнопку
    this.authOverlay.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.submitAuth();
    });
  },

  async submitAuth() {
    const isRegister = document.querySelector('.auth-tab.active').dataset.mode === 'register';
    const name = document.getElementById('auth-name').value.trim();
    const password = document.getElementById('auth-password').value;
    const age = Number(document.getElementById('auth-age').value);

    this.authError.textContent = '';
    if (name.length < 3) { this.authError.textContent = 'Имя: минимум 3 символа'; return; }
    if (password.length < 4) { this.authError.textContent = 'Пароль: минимум 4 символа'; return; }
    if (isRegister && !(age >= 5 && age <= 120)) {
      this.authError.textContent = 'Укажи настоящий возраст'; return;
    }

    const result = isRegister
      ? await AuthAPI.register(name, password, age)
      : await AuthAPI.login(name, password);

    if (result.ok) {
      Game.onAuthSuccess(result.name);
    } else {
      this.authError.textContent = result.error;
    }
  },

  showAuth() { this.authOverlay.classList.remove('hidden'); },
  hideAuth() { this.authOverlay.classList.add('hidden'); },

  // --- Панель HUD внизу канваса ---
  drawHud(ctx) {
    const W = CONFIG.SCREEN_W;
    const top = CONFIG.VIEW_H;
    const H = CONFIG.HUD_H;

    ctx.fillStyle = '#2a2a2e';
    ctx.fillRect(0, top, W, H);
    ctx.fillStyle = '#46464e';
    ctx.fillRect(0, top, W, 2);

    ctx.textBaseline = 'top';

    // Здоровье — крупные красные цифры, как в оригинале
    this.label(ctx, 'HP', 12, top + 5);
    ctx.fillStyle = Player.hp > 33 ? '#d84030' : '#ff2010';
    ctx.font = 'bold 17px monospace';
    ctx.fillText(`${Player.hp}`, 12, top + 14);

    // Патроны
    this.label(ctx, 'AMMO', 62, top + 5);
    ctx.fillStyle = Weapon.ammo > 0 ? '#d8a030' : '#804020';
    ctx.font = 'bold 17px monospace';
    ctx.fillText(String(Weapon.ammo), 62, top + 14);

    // Лицо героя по центру
    this.drawFace(ctx, W / 2 - 10, top + 6);

    // Номер комнаты
    this.label(ctx, 'ROOM', 196, top + 5);
    ctx.fillStyle = '#c0b0a0';
    ctx.font = 'bold 17px monospace';
    ctx.fillText(`${Game.level + 1}/4`, 196, top + 14);

    // Осталось врагов
    this.label(ctx, 'MONST', 240, top + 5);
    ctx.fillStyle = Enemies.aliveCount() > 0 ? '#c0b0a0' : '#40c040';
    ctx.font = 'bold 17px monospace';
    ctx.fillText(String(Enemies.aliveCount()), 240, top + 14);

    // Счёт
    this.label(ctx, 'SCORE', 276, top + 5);
    ctx.fillStyle = '#d8c040';
    ctx.font = 'bold 13px monospace';
    ctx.fillText(String(Game.score), 276, top + 16);
  },

  label(ctx, text, x, y) {
    ctx.fillStyle = '#8a8a92';
    ctx.font = '8px monospace';
    ctx.fillText(text, x, y);
  },

  // Крупные сообщения поверх 3D-вида (название комнаты и т.п.)
  drawMessages(ctx) {
    if (Game.bannerTimer <= 0 || !Game.bannerText) return;
    const W = CONFIG.SCREEN_W;
    const alpha = Math.min(1, Game.bannerTimer);   // плавное исчезновение
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const y = CONFIG.VIEW_H * 0.28;
    // Тень + красный текст в стиле DOOM
    ctx.fillStyle = '#200808';
    ctx.fillText(Game.bannerText, W / 2 + 1, y + 1);
    ctx.fillStyle = '#e05030';
    ctx.fillText(Game.bannerText, W / 2, y);
    ctx.restore();
    ctx.textAlign = 'left'; // вернуть выравнивание для HUD
  },

  // Лицо в стиле DOOM: чем меньше HP, тем более побитое
  drawFace(ctx, x, y) {
    const hp = Player.hp;
    ctx.fillStyle = hp > 66 ? '#c89060' : hp > 33 ? '#b87850' : '#a05038';
    ctx.fillRect(x, y, 20, 24);
    ctx.fillStyle = '#5a3818';
    ctx.fillRect(x, y, 20, 5);
    ctx.fillStyle = Player.alive ? '#fff' : '#802020';
    ctx.fillRect(x + 3, y + 8, 5, Player.alive ? 4 : 1);
    ctx.fillRect(x + 12, y + 8, 5, Player.alive ? 4 : 1);
    if (Player.alive) {
      ctx.fillStyle = '#203040';
      ctx.fillRect(x + 5, y + 9, 2, 3);
      ctx.fillRect(x + 14, y + 9, 2, 3);
    }
    ctx.fillStyle = hp > 33 ? '#503020' : '#801818';
    ctx.fillRect(x + 5, y + 18, 10, 2);
    if (hp <= 66) {
      ctx.fillStyle = '#901810';
      ctx.fillRect(x + 2, y + 13, 3, 6);
      if (hp <= 33) ctx.fillRect(x + 14, y + 5, 4, 9);
    }
  },

  // --- Экран конца игры ---
  showEnd(victory) {
    this.overlayTitle.textContent = victory ? 'ВСЕ КОМНАТЫ ЗАЧИЩЕНЫ!' : 'ТЫ ПОГИБ';
    this.overlayTitle.style.color = victory ? '#c8a050' : '#b8352a';
    this.overlayScore.textContent = `${Game.playerName}, твой счёт: ${Game.score}`;
    document.getElementById('highscores').innerHTML = '';
    this.overlay.classList.remove('hidden');
    document.exitPointerLock();
    // Рекорд сохраняется сам — игрок уже вошёл под своим именем
    ScoreAPI.submit(Game.playerName, Game.score);
  },

  hideOverlay() {
    this.overlay.classList.add('hidden');
  },
};
