-- ============================================================
-- migrate_v2.sql — обновление УЖЕ РАБОТАЮЩЕЙ базы до версии 2:
-- добавляет таблицу игроков (авторизация + возраст 18+).
-- Запуск на сервере: sudo mysql < /opt/doomgame/server/migrate_v2.sql
-- (init_db.sql выполняется только при первой установке,
--  поэтому изменения схемы делаются такими миграциями)
-- ============================================================

CREATE TABLE IF NOT EXISTS doomgame.users (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  username      VARCHAR(16)  NOT NULL UNIQUE,
  password_hash VARCHAR(60)  NOT NULL,   -- bcrypt-хеш, не сам пароль!
  age           INT          NOT NULL,   -- для проверки 18+
  created_at    TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);
