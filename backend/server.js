// ============================================================
// server.js — главный файл бэкенда.
//   1) отдаёт статику игры (папка ../game)
//   2) авторизация: POST /api/register и POST /api/login
//      (возраст < 18 — играть нельзя, но данные пишутся в базу)
//   3) рекорды: POST /api/scores и GET /api/scores/top
// ============================================================

require('dotenv').config();
const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('./db');

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'game')));

// --- Регистрация игрока ---
// Тело: { "name": "...", "password": "...", "age": 25 }
// ВСЯ информация записывается в базу, даже если игроку меньше 18 —
// но играть (войти) он не сможет.
app.post('/api/register', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().slice(0, 16);
    const password = String(req.body.password || '');
    const age = Number(req.body.age);

    if (name.length < 3 || !/^[\wа-яА-ЯёЁ-]+$/u.test(name)) {
      return res.status(400).json({ error: 'Имя: 3-16 букв/цифр без пробелов' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Пароль: минимум 4 символа' });
    }
    if (!Number.isInteger(age) || age < 5 || age > 120) {
      return res.status(400).json({ error: 'Укажи настоящий возраст' });
    }

    // Пароль в базе храним ТОЛЬКО как bcrypt-хеш —
    // даже админ не сможет его прочитать
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (username, password_hash, age) VALUES (?, ?, ?)',
      [name, hash, age]
    );

    if (age < 18) {
      // Запись в базе создана, но вход запрещён
      return res.status(403).json({ error: 'Тебе меньше 18 — в ад пока рано. Приходи позже!' });
    }
    res.status(201).json({ ok: true, name });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Это имя уже занято' });
    }
    console.error('Ошибка регистрации:', err.message);
    res.status(500).json({ error: 'База данных недоступна' });
  }
});

// --- Вход ---
app.post('/api/login', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const password = String(req.body.password || '');

    const [rows] = await pool.query(
      'SELECT username, password_hash, age FROM users WHERE username = ?',
      [name]
    );
    // Один и тот же ответ для "нет такого игрока" и "не тот пароль" —
    // чтобы нельзя было перебором узнать, кто зарегистрирован
    if (rows.length === 0 || !(await bcrypt.compare(password, rows[0].password_hash))) {
      return res.status(401).json({ error: 'Неверное имя или пароль' });
    }
    if (rows[0].age < 18) {
      return res.status(403).json({ error: 'Тебе меньше 18 — в ад пока рано!' });
    }
    res.json({ ok: true, name: rows[0].username });
  } catch (err) {
    console.error('Ошибка входа:', err.message);
    res.status(500).json({ error: 'База данных недоступна' });
  }
});

// --- Сохранить рекорд ---
app.post('/api/scores', async (req, res) => {
  try {
    const name = String(req.body.name || '').trim().slice(0, 16);
    const score = Number(req.body.score);

    if (!name || !Number.isFinite(score) || score < 0 || score > 1000000) {
      return res.status(400).json({ error: 'Некорректные имя или счёт' });
    }

    await pool.query(
      'INSERT INTO scores (player_name, score) VALUES (?, ?)',
      [name, Math.floor(score)]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('Ошибка сохранения рекорда:', err.message);
    res.status(500).json({ error: 'База данных недоступна' });
  }
});

// --- Топ-10 рекордов ---
app.get('/api/scores/top', async (_req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT player_name, score, created_at FROM scores ORDER BY score DESC LIMIT 10'
    );
    res.json(rows);
  } catch (err) {
    console.error('Ошибка чтения рекордов:', err.message);
    res.status(500).json({ error: 'База данных недоступна' });
  }
});

// --- Проверка живости ---
app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Сервер игры запущен: http://localhost:${PORT}`);
});
