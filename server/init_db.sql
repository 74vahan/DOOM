-- ============================================================
-- init_db.sql — создание базы, таблицы рекордов и пользователя.
-- Запускается ОДИН раз на сервере (setup.sh делает это сам):
--   sudo mysql < init_db.sql
-- ВАЖНО: пароль подставляется через переменную @db_password,
-- setup.sh спросит его у тебя и подставит — в файле пароля нет.
-- ============================================================

-- База данных игры
CREATE DATABASE IF NOT EXISTS doomgame
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

-- Таблица рекордов
CREATE TABLE IF NOT EXISTS doomgame.scores (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  player_name VARCHAR(16)  NOT NULL,           -- имя игрока (до 16 символов)
  score       INT          NOT NULL,           -- набранные очки
  created_at  TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_score (score DESC)                 -- индекс для быстрого топ-10
);

-- Отдельный пользователь ТОЛЬКО для этой базы.
-- Приложение не должно ходить в MySQL под root!
-- Плейсхолдер __DB_PASSWORD__ заменяет setup.sh.
CREATE USER IF NOT EXISTS 'doomgame_user'@'localhost'
  IDENTIFIED BY '__DB_PASSWORD__';

-- Права только на базу doomgame и только чтение/запись
GRANT SELECT, INSERT ON doomgame.* TO 'doomgame_user'@'localhost';
FLUSH PRIVILEGES;
