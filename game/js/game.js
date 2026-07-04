// ============================================================
// game.js — главный игровой цикл и состояние игры.
// Состояния: auth (вход) -> playing -> transition (между
// комнатами) -> ... -> dead | won.
// Следующая комната открывается, когда убиты ВСЕ враги текущей.
// ============================================================

const Game = {
  state: 'auth',
  level: 0,
  score: 0,
  playerName: null,   // имя вошедшего игрока (для рекордов)
  bannerText: '',     // крупное сообщение на экране
  bannerTimer: 0,
  cleared: false,     // все враги комнаты убиты (дверь открыта)
  endTimer: 0,
  transitionTimer: 0,
  lastTime: 0,

  init() {
    const canvas = document.getElementById('screen');

    GameMap.load(0);
    Raycaster.init(CONFIG.SCREEN_W);
    Renderer.init(canvas);
    Input.init(canvas);
    Enemies.init();
    UI.init();

    // Пока не вошёл — игра не начинается
    UI.showAuth();
    requestAnimationFrame((t) => this.loop(t));
  },

  // Вызывается после успешного входа
  onAuthSuccess(name) {
    this.playerName = name;
    UI.hideAuth();
    Music.start();   // звук можно включать только после клика
    this.startRun();
  },

  // Новый забег: с первой комнаты, полные HP и патроны
  startRun() {
    this.score = 0;
    Player.reset();
    Weapon.reset();
    this.loadLevel(0);
    UI.hideOverlay();
  },

  // Загрузка комнаты. HP и патроны переносятся между комнатами!
  loadLevel(i) {
    this.level = i;
    GameMap.load(i);
    Player.respawn();          // на старт комнаты (HP сохраняется)
    Enemies.reset();
    this.cleared = false;
    this.state = 'playing';
    this.setBanner(GameMap.levelName, 2.5);
  },

  addScore(points) {
    this.score += points;
  },

  setBanner(text, seconds) {
    this.bannerText = text;
    this.bannerTimer = seconds;
  },

  loop(time) {
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    if (this.bannerTimer > 0) this.bannerTimer -= dt;

    if (this.state === 'playing') {
      Player.update(dt);
      Enemies.update(dt);
      Weapon.update(dt);

      // Комната зачищена? Открываем дверь к выходу
      if (!this.cleared && Enemies.aliveCount() === 0) {
        this.cleared = true;
        GameMap.openDoors();
        Music.sfx('door');
        this.setBanner('КОМНАТА ЗАЧИЩЕНА — ИДИ К ВЫХОДУ!', 3.5);
      }

      // Игрок дошёл до выхода
      if (this.cleared && GameMap.isAtExit(Player.x, Player.y)) {
        if (GameMap.hasNextLevel()) {
          Music.sfx('levelClear');
          this.state = 'transition';
          this.transitionTimer = 1.2;
          this.setBanner('ВПЕРЁД, В СЛЕДУЮЩУЮ КОМНАТУ...', 1.2);
        } else {
          // Пройдены все 4 комнаты — победа!
          this.addScore(Player.hp * 2 + Weapon.ammo);
          this.state = 'won';
          Music.sfx('levelClear');
          this.endTimer = 1.0;
        }
      }

      if (!Player.alive) {
        this.state = 'dead';
        Music.sfx('death');
        this.endTimer = 1.0;
      }
    } else if (this.state === 'transition') {
      this.transitionTimer -= dt;
      if (this.transitionTimer <= 0) this.loadLevel(this.level + 1);
    } else if (this.state === 'dead' || this.state === 'won') {
      if (this.endTimer > 0) {
        this.endTimer -= dt;
        Player.update(dt); // затухание вспышки урона
        if (this.endTimer <= 0) UI.showEnd(this.state === 'won');
      }
      if (Input.restart && this.endTimer <= 0) this.startRun();
    }
    // state === 'auth': просто рисуем фон-заставку

    Renderer.render();
    requestAnimationFrame((t) => this.loop(t));
  },
};

window.addEventListener('load', () => Game.init());
