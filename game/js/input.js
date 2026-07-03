// ============================================================
// input.js — клавиатура и мышь.
// WASD / стрелки — движение и поворот, мышь — поворот
// (после клика по канвасу включается pointer lock — захват мыши),
// ПРОБЕЛ или клик — выстрел.
// ============================================================

const Input = {
  forward: false,
  back: false,
  strafeL: false,
  strafeR: false,
  turnLeft: false,
  turnRight: false,
  shoot: false,        // держит ли игрок кнопку выстрела
  restart: false,      // Enter — начать заново
  _mouseDelta: 0,      // накопленное движение мыши за кадр

  init(canvas) {
    // --- Клавиатура ---
    const setKey = (code, pressed) => {
      switch (code) {
        case 'KeyW': case 'ArrowUp':    this.forward = pressed; break;
        case 'KeyS': case 'ArrowDown':  this.back = pressed; break;
        case 'KeyA':                    this.strafeL = pressed; break;
        case 'KeyD':                    this.strafeR = pressed; break;
        case 'ArrowLeft':               this.turnLeft = pressed; break;
        case 'ArrowRight':              this.turnRight = pressed; break;
        case 'Space':                   this.shoot = pressed; break;
        case 'Enter':                   this.restart = pressed; break;
      }
    };

    document.addEventListener('keydown', (e) => {
      // Не мешаем печатать имя в поле рекорда
      if (e.target.tagName === 'INPUT') return;
      // Пробел и стрелки не должны скроллить страницу
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
        e.preventDefault();
      }
      setKey(e.code, true);
    });
    document.addEventListener('keyup', (e) => setKey(e.code, false));

    // --- Мышь: pointer lock ---
    // После клика по канвасу браузер "отдаёт" нам курсор,
    // и мы получаем чистое движение мыши (movementX).
    canvas.addEventListener('click', () => {
      if (document.pointerLockElement !== canvas) {
        canvas.requestPointerLock();
      }
    });

    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement === canvas) {
        this._mouseDelta += e.movementX;
      }
    });

    // Выстрел кнопкой мыши (когда курсор захвачен)
    document.addEventListener('mousedown', (e) => {
      if (document.pointerLockElement === canvas && e.button === 0) this.shoot = true;
    });
    document.addEventListener('mouseup', (e) => {
      if (e.button === 0) this.shoot = false;
    });
  },

  // Забрать накопленное движение мыши (и обнулить счётчик)
  takeMouseDelta() {
    const d = this._mouseDelta;
    this._mouseDelta = 0;
    return d;
  },
};
