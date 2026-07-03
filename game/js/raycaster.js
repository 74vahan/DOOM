// ============================================================
// raycaster.js — сердце псевдо-3D.
//
// Идея raycasting (как в Wolfenstein 3D):
// для КАЖДОГО вертикального столбца пикселей экрана пускаем луч
// из глаз игрока. Чем дальше луч долетел до стены, тем НИЖЕ
// рисуем этот столбец стены. Получается эффект 3D без 3D.
//
// Луч шагает по сетке карты алгоритмом DDA: перепрыгивает
// от границы клетки к границе клетки — быстро и точно.
// ============================================================

const Raycaster = {
  // Расстояние до "экранной плоскости" в пикселях.
  // Нужно, чтобы переводить дистанцию до стены в высоту столба.
  projDist: 0,

  init(screenW) {
    this.projDist = (screenW / 2) / Math.tan(CONFIG.FOV / 2);
  },

  // Пустить ОДИН луч из точки (px, py) под углом angle.
  // Возвращает: dist — длина луча до стены,
  //             side — 0/1, какой стороной клетки стоит стена (для тени),
  //             tile — тип стены (цвет).
  castRay(px, py, angle) {
    const dirX = Math.cos(angle);
    const dirY = Math.sin(angle);

    // Текущая клетка карты
    let mapX = Math.floor(px);
    let mapY = Math.floor(py);

    // Сколько пути проходит луч между вертикальными/горизонтальными линиями сетки
    const deltaX = Math.abs(1 / (dirX === 0 ? 1e-9 : dirX));
    const deltaY = Math.abs(1 / (dirY === 0 ? 1e-9 : dirY));

    // Направление шага по сетке и расстояние до ПЕРВОЙ границы клетки
    let stepX, stepY, distX, distY;
    if (dirX < 0) { stepX = -1; distX = (px - mapX) * deltaX; }
    else          { stepX = 1;  distX = (mapX + 1 - px) * deltaX; }
    if (dirY < 0) { stepY = -1; distY = (py - mapY) * deltaY; }
    else          { stepY = 1;  distY = (mapY + 1 - py) * deltaY; }

    // Шагаем по клеткам, пока не упрёмся в стену
    let side = 0;
    let tile = 1;
    for (let i = 0; i < 128; i++) {          // 128 — предохранитель от вечного цикла
      if (distX < distY) { distX += deltaX; mapX += stepX; side = 0; }
      else               { distY += deltaY; mapY += stepY; side = 1; }
      tile = GameMap.tile(mapX, mapY);
      if (tile > 0) break;                    // стена найдена
    }

    // Длина луча = расстояние до границы, на которой стоит стена
    const dist = (side === 0 ? distX - deltaX : distY - deltaY);
    return { dist: Math.max(dist, 0.0001), side, tile };
  },

  // Пустить лучи для ВСЕХ столбцов экрана.
  // Возвращает массив длиной w — по объекту на каждый столбец.
  // perpDist — дистанция, спроецированная на направление взгляда:
  // без этой поправки края экрана "выгибались" бы (эффект рыбьего глаза).
  castAll(player, w) {
    const result = new Array(w);
    const halfTan = Math.tan(CONFIG.FOV / 2);
    for (let x = 0; x < w; x++) {
      // Смещение луча так, чтобы столбцы ложились на плоский экран равномерно
      const camX = (2 * (x + 0.5)) / w - 1;        // от -1 (лево) до +1 (право)
      const rel = Math.atan(camX * halfTan);        // угол луча относительно взгляда
      const ray = this.castRay(player.x, player.y, player.angle + rel);
      result[x] = {
        perpDist: ray.dist * Math.cos(rel),
        side: ray.side,
        tile: ray.tile,
      };
    }
    return result;
  },
};
