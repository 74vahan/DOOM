// ============================================================
// db.js — подключение к MySQL.
// Все данные подключения берутся из переменных окружения (.env),
// в коде НЕТ ни одного пароля.
// ============================================================

require('dotenv').config();
const mysql = require('mysql2/promise');

// Пул соединений: держит несколько открытых подключений к БД
// и раздаёт их запросам — быстрее, чем открывать новое каждый раз.
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  connectionLimit: 5,
  // Если MySQL недоступен, запрос упадёт с ошибкой,
  // а не повиснет навсегда:
  connectTimeout: 5000,
});

module.exports = pool;
