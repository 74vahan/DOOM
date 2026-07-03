// ============================================================
// game.js — главный игровой цикл. Связывает все модули:
// каждый кадр обновляет игрока, врагов, оружие и рисует сцену.
// ============================================================

const Game = {
  state: 'playing',   // playing | dead | won
  score: 0,
  endTimer: 0,        // пауза перед показом оверлея (для драматизма)
  lastTime: 0,

  init() {
    const canvas = document.getElementById('screen');

    // Инициализация всех модулей (порядок важен)
    GameMap.init();
    Raycaster.init(CONFIG.SCREEN_W);
    Renderer.init(canvas);
    Input.init(canvas);
    Enemies.init();
    UI.init();

    this.reset();

    // Запуск игрового цикла
    requestAnimationFrame((t) => this.loop(t));
  },

  // Новая игра (и первая, и после смерти)
  reset() {
    Player.reset();
    Enemies.reset();
    Weapon.reset();
    this.score = 0;
    this.endTimer = 0;
    this.state = 'playing';
    UI.hideOverlay();
    document.getElementById('player-name').value = '';
  },

  addScore(points) {
    this.score += points;
  },

  loop(time) {
    // dt — сколько секунд прошло с прошлого кадра.
    // Ограничиваем сверху: если вкладка была свёрнута,
    // игра не должна "прыгнуть" на минуту вперёд.
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    if (this.state === 'playing') {
      Player.update(dt);
      Enemies.update(dt);
      Weapon.update(dt);

      // Проверка конца игры
      if (!Player.alive) {
        this.state = 'dead';
        this.endTimer = 1.0; // секунда до оверлея
      } else if (Enemies.aliveCount() === 0) {
        this.state = 'won';
        this.addScore(Player.hp * 2); // бонус за оставшееся здоровье
        this.endTimer = 1.0;
      }
    } else {
      // Ждём паузу и показываем экран конца игры один раз
      if (this.endTimer > 0) {
        this.endTimer -= dt;
        Player.update(dt); // затухание вспышки урона
        if (this.endTimer <= 0) UI.showEnd(this.state === 'won');
      }
      // Enter — сыграть ещё раз
      if (Input.restart && this.endTimer <= 0) this.reset();
    }

    Renderer.render();
    requestAnimationFrame((t) => this.loop(t));
  },
};

// Стартуем, когда страница загрузилась
window.addEventListener('load', () => Game.init());
